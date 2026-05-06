import { Router } from "express";
import { z } from "zod";
import prisma from "../../../lib/prisma.js";
import { requireRole } from "../../../middlewares/auth.js";
import { validate } from "../../../middlewares/validate.js";
import { writeAuditLog } from "../../../middlewares/audit.js";
import { logger } from "../../../lib/logger.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.js";
import type { Response } from "express";

const router = Router();

router.use(requireRole("MINISTER", "MINISTRY_STAFF", "NERC_VIEWER", "DISCO_AGENT", "ADMIN"));

function paginateQuery(query: Record<string, string>) {
  const page = Math.max(1, parseInt(query["page"] ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(query["pageSize"] ?? "20", 10)));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const { skip, take, page, pageSize } = paginateQuery(q);

    const where: Record<string, unknown> = {};
    if (q["status"]) where["status"] = q["status"];
    if (q["category"]) where["category"] = q["category"];
    if (q["severity"]) where["severity"] = q["severity"];
    if (q["escalationLevel"]) where["escalationLevel"] = parseInt(q["escalationLevel"], 10);
    if (q["slaBreached"] === "true") where["slaBreached"] = true;

    if (q["dateFrom"] || q["dateTo"]) {
      where["createdAt"] = {
        ...(q["dateFrom"] ? { gte: new Date(q["dateFrom"]) } : {}),
        ...(q["dateTo"] ? { lte: new Date(q["dateTo"]) } : {}),
      };
    }

    if (req.user?.role === "DISCO_AGENT" && req.user.organisationId) {
      const disco = await prisma.disCo.findFirst({ where: { operatorOrgId: req.user.organisationId } });
      if (disco) where["discoId"] = disco.id;
    }
    if (q["discoId"]) where["discoId"] = q["discoId"];

    const [complaints, total] = await Promise.all([
      prisma.complaint.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          disco: { select: { id: true, name: true } },
          feeder: { select: { id: true, name: true } },
          events: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
      prisma.complaint.count({ where }),
    ]);

    res.json({
      data: complaints,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    logger.error({ err }, "Admin complaints list failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/stats", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [
      openByCategory,
      escalationCounts,
      slaBreachCount,
      avgResolutionTime,
      avgSatisfaction,
      totalOpen,
    ] = await Promise.all([
      prisma.complaint.groupBy({ by: ["category"], where: { status: { not: "RESOLVED" } }, _count: { id: true } }),
      prisma.complaint.groupBy({ by: ["escalationLevel"], _count: { id: true }, orderBy: { escalationLevel: "asc" } }),
      prisma.complaint.count({ where: { slaBreached: true } }),
      prisma.complaint.aggregate({
        _avg: { satisfactionScore: true },
        where: { status: "RESOLVED", satisfactionScore: { not: null }, resolvedAt: { not: null } },
      }),
      prisma.complaint.aggregate({
        _avg: { satisfactionScore: true },
        where: { satisfactionScore: { not: null }, resolvedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
      prisma.complaint.count({ where: { status: { in: ["FILED", "IN_REVIEW", "IN_PROGRESS", "ESCALATED"] } } }),
    ]);

    res.json({
      data: {
        openByCategory,
        escalationPyramid: escalationCounts,
        slaBreachCount,
        avgSatisfactionScore: avgSatisfaction._avg.satisfactionScore,
        satisfactionLastMonth: avgResolutionTime._avg.satisfactionScore,
        totalOpen,
      },
    });
  } catch (err) {
    logger.error({ err }, "Complaint stats failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const where: Record<string, unknown> = { id: req.params["id"] };
    if (req.user?.role === "DISCO_AGENT" && req.user.organisationId) {
      const disco = await prisma.disCo.findFirst({ where: { operatorOrgId: req.user.organisationId } });
      if (disco) where["discoId"] = disco.id;
    }

    const complaint = await prisma.complaint.findFirst({
      where,
      include: {
        disco: true,
        feeder: true,
        events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { id: true, fullName: true, role: true } } } },
        assignments: { include: { assignedTo: { select: { id: true, fullName: true, role: true } } }, orderBy: { assignedAt: "desc" } },
      },
    });

    if (!complaint) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "Complaint not found" } });
      return;
    }
    res.json({ data: complaint });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

const updateSchema = z.object({
  status: z.enum(["FILED","IN_REVIEW","IN_PROGRESS","ESCALATED","RESOLVED","CLOSED","REJECTED"]).optional(),
  severity: z.enum(["CRITICAL","HIGH","MEDIUM","LOW"]).optional(),
  category: z.enum(["METERING","BILLING","ESTIMATED_BILLING","SUPPLY_INTERRUPTION","VOLTAGE","ELECTROCUTION","INFRASTRUCTURE_DAMAGE","CONNECTION_DELAY","DISCONNECTION","REFUND","ENERGY_THEFT_REPORT","OTHER"]).optional(),
  notes: z.string().optional(),
  assignedToUserId: z.string().uuid().optional(),
}).refine(d => Object.keys(d).length > 0, { message: "At least one field required" });

router.patch("/:id", requireRole("MINISTER","MINISTRY_STAFF","DISCO_AGENT","ADMIN"), validate(updateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    const body = req.body as z.infer<typeof updateSchema>;
    const before = await prisma.complaint.findUnique({ where: { id } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }

    if (body.status && body.status !== before.status) {
      await prisma.complaintEvent.create({
        data: { complaintId: id, eventType: "STATUS_CHANGE", fromValue: before.status, toValue: body.status, actorUserId: req.user!.sub, notes: body.notes },
      });
    }

    const updated = await prisma.complaint.update({ where: { id }, data: { ...body, updatedBy: req.user!.sub } });
    await writeAuditLog(req.user!.sub, "UPDATE", "Complaint", id, before, updated, req);
    res.json({ data: updated });
  } catch (err) {
    logger.error({ err }, "Update complaint failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/:id/assign", requireRole("MINISTER","MINISTRY_STAFF","DISCO_AGENT","ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    const { assignedToUserId, notes, dueAt } = req.body as { assignedToUserId?: string; notes?: string; dueAt?: string };
    if (!assignedToUserId) { res.status(400).json({ error: { code: "MISSING_FIELDS" } }); return; }

    const before = await prisma.complaint.findUnique({ where: { id } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }

    await prisma.$transaction([
      prisma.complaintAssignment.create({ data: { complaintId: id, assignedToUserId, assignedFromUserId: req.user!.sub, notes, dueAt: dueAt ? new Date(dueAt) : undefined } }),
      prisma.complaintEvent.create({ data: { complaintId: id, eventType: "ASSIGNED", toValue: assignedToUserId, actorUserId: req.user!.sub, notes } }),
      prisma.complaint.update({ where: { id }, data: { assignedToUserId, status: "IN_REVIEW", updatedBy: req.user!.sub } }),
    ]);

    await writeAuditLog(req.user!.sub, "ASSIGN", "Complaint", id, before, { assignedToUserId }, req);
    res.json({ data: { message: "Assigned" } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/:id/escalate", requireRole("MINISTER","MINISTRY_STAFF","NERC_VIEWER","DISCO_AGENT","ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    const { reason } = req.body as { reason?: string };
    const before = await prisma.complaint.findUnique({ where: { id } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }

    const newLevel = Math.min(5, before.escalationLevel + 1);
    await prisma.$transaction([
      prisma.complaint.update({ where: { id }, data: { escalationLevel: newLevel, status: "ESCALATED", updatedBy: req.user!.sub } }),
      prisma.complaintEvent.create({ data: { complaintId: id, eventType: "ESCALATED", fromValue: String(before.escalationLevel), toValue: String(newLevel), actorUserId: req.user!.sub, notes: reason } }),
    ]);

    await writeAuditLog(req.user!.sub, "ESCALATE", "Complaint", id, before, { escalationLevel: newLevel }, req);
    res.json({ data: { escalationLevel: newLevel } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/:id/resolve", requireRole("MINISTER","MINISTRY_STAFF","DISCO_AGENT","ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    const { resolutionText } = req.body as { resolutionText?: string };
    if (!resolutionText) { res.status(400).json({ error: { code: "MISSING_FIELDS", message: "resolutionText required" } }); return; }

    const before = await prisma.complaint.findUnique({ where: { id } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }

    await prisma.$transaction([
      prisma.complaint.update({ where: { id }, data: { status: "RESOLVED", resolutionText, resolvedAt: new Date(), updatedBy: req.user!.sub } }),
      prisma.complaintEvent.create({ data: { complaintId: id, eventType: "RESOLVED", actorUserId: req.user!.sub, notes: resolutionText } }),
    ]);

    logger.info({ id }, "[STUB] Satisfaction survey SMS/WhatsApp would be sent here");
    await writeAuditLog(req.user!.sub, "RESOLVE", "Complaint", id, before, { status: "RESOLVED", resolutionText }, req);
    res.json({ data: { message: "Complaint resolved" } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/:id/reopen", requireRole("MINISTER","MINISTRY_STAFF","ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    const { reason } = req.body as { reason?: string };
    const before = await prisma.complaint.findUnique({ where: { id } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }

    await prisma.$transaction([
      prisma.complaint.update({ where: { id }, data: { status: "IN_REVIEW", resolvedAt: null, updatedBy: req.user!.sub } }),
      prisma.complaintEvent.create({ data: { complaintId: id, eventType: "REOPENED", actorUserId: req.user!.sub, notes: reason } }),
    ]);

    await writeAuditLog(req.user!.sub, "REOPEN", "Complaint", id, before, { status: "IN_REVIEW" }, req);
    res.json({ data: { message: "Complaint reopened" } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

export default router;
