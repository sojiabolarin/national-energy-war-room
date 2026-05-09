import { Router } from "express";
import { z } from "zod";
import prisma from "../../../lib/prisma.js";
import { requireAuth, requireRole } from "../../../middlewares/auth.js";
import { validate } from "../../../middlewares/validate.js";
import { writeAuditLog } from "../../../middlewares/audit.js";
import { logger } from "../../../lib/logger.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.js";
import type { Response } from "express";
import type { DataQualityFlagStatus } from "@prisma/client";

const router = Router();
router.use(requireAuth);
router.use(requireRole("MINISTER", "MINISTRY_STAFF", "ADMIN", "NERC_VIEWER"));

const patchSchema = z.object({
  status: z.enum(["PENDING", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"]).optional(),
  notes: z.string().max(1000).optional(),
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(q["page"] ?? "1", 10));
    const pageSize = Math.min(100, parseInt(q["pageSize"] ?? "50", 10));

    const where: Record<string, unknown> = {};
    if (q["status"]) where["status"] = q["status"] as DataQualityFlagStatus;
    if (q["severity"]) where["severity"] = q["severity"];
    if (q["reason"]) where["reason"] = q["reason"];

    const [flags, total] = await Promise.all([
      prisma.dataQualityFlag.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
      }),
      prisma.dataQualityFlag.count({ where }),
    ]);

    const summary = await prisma.dataQualityFlag.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    res.json({
      data: flags,
      summary: Object.fromEntries(summary.map((s) => [s.status, s._count.id])),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    logger.error({ err }, "data-quality GET failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.patch("/:id", requireRole("MINISTRY_STAFF", "ADMIN"), validate(patchSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"] as string;
    const before = await prisma.dataQualityFlag.findUnique({ where: { id } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }

    const body = req.body as { status?: DataQualityFlagStatus; notes?: string };
    const data: Record<string, unknown> = { ...body };

    if (body.status && ["RESOLVED", "DISMISSED"].includes(body.status)) {
      if (!before.resolvedAt) {
        data["resolvedAt"] = new Date();
        data["resolvedById"] = req.user!.sub;
      }
    } else if (body.status === "PENDING" || body.status === "ACKNOWLEDGED") {
      data["resolvedAt"] = null;
      data["resolvedById"] = null;
    }

    const updated = await prisma.dataQualityFlag.update({ where: { id }, data });
    await writeAuditLog(req.user!.sub, "UPDATE", "DataQualityFlag", id, before, updated, req);
    res.json({ data: updated });
  } catch (err) {
    logger.error({ err }, "data-quality PATCH failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/bulk", requireRole("MINISTRY_STAFF", "ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as { ids: string[]; status: DataQualityFlagStatus; notes?: string };
    if (!body.ids?.length || !body.status) {
      res.status(400).json({ error: { code: "MISSING_FIELDS" } }); return;
    }
    const resolveData =
      ["RESOLVED", "DISMISSED"].includes(body.status)
        ? { resolvedAt: new Date(), resolvedById: req.user!.sub }
        : { resolvedAt: null, resolvedById: null };

    await prisma.dataQualityFlag.updateMany({
      where: { id: { in: body.ids } },
      data: { status: body.status, notes: body.notes, ...resolveData },
    });
    res.json({ data: { updated: body.ids.length } });
  } catch (err) {
    logger.error({ err }, "data-quality bulk failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

export default router;
