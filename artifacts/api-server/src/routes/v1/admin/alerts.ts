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
router.use(requireRole("MINISTER","MINISTRY_STAFF","ADMIN"));

const alertSchema = z.object({
  severity: z.enum(["CRITICAL","HIGH","MEDIUM","INFO"]).default("MEDIUM"),
  category: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  sourceEntity: z.string().optional(),
  sourceEntityId: z.string().optional(),
  actionRequired: z.string().optional(),
  assignedToUserId: z.string().uuid().optional(),
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(q["page"] ?? "1", 10));
    const pageSize = Math.min(100, parseInt(q["pageSize"] ?? "20", 10));
    const where = q["status"] ? { status: q["status"] as string } : {};
    const [alerts, total] = await Promise.all([
      prisma.alert.findMany({ where, skip: (page-1)*pageSize, take: pageSize, orderBy: [{ severity: "asc" }, { createdAt: "desc" }] }),
      prisma.alert.count({ where }),
    ]);
    res.json({ data: alerts, pagination: { page, pageSize, total, totalPages: Math.ceil(total/pageSize) } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/", validate(alertSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const alert = await prisma.alert.create({ data: req.body });
    await writeAuditLog(req.user!.sub, "CREATE", "Alert", alert.id, null, alert, req);
    res.status(201).json({ data: alert });
  } catch (err) {
    logger.error({ err }, "Create alert failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    const before = await prisma.alert.findUnique({ where: { id } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    const data: Record<string, unknown> = { ...req.body };
    if (data["status"] === "RESOLVED" && !before.resolvedAt) data["resolvedAt"] = new Date();
    const updated = await prisma.alert.update({ where: { id }, data });
    await writeAuditLog(req.user!.sub, "UPDATE", "Alert", id, before, updated, req);
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    const before = await prisma.alert.findUnique({ where: { id } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    await prisma.alert.delete({ where: { id } });
    await writeAuditLog(req.user!.sub, "DELETE", "Alert", id, before, null, req);
    res.json({ data: { message: "Deleted" } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

export default router;
