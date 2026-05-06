import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "../../../lib/prisma.js";
import { requireRole } from "../../../middlewares/auth.js";
import { validate } from "../../../middlewares/validate.js";
import { writeAuditLog } from "../../../middlewares/audit.js";
import { logger } from "../../../lib/logger.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.js";
import type { Response } from "express";

const router = Router();
router.use(requireRole("ADMIN"));

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(["MINISTER","MINISTRY_STAFF","NERC_VIEWER","DISCO_AGENT","CITIZEN","ADMIN"]),
  organisationId: z.string().uuid().optional(),
  phone: z.string().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.enum(["MINISTER","MINISTRY_STAFF","NERC_VIEWER","DISCO_AGENT","CITIZEN","ADMIN"]).optional(),
  organisationId: z.string().uuid().nullable().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(q["page"] ?? "1", 10));
    const pageSize = Math.min(100, parseInt(q["pageSize"] ?? "20", 10));
    const where = q["role"] ? { role: q["role"] as string } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, role: true, fullName: true, phone: true, organisationId: true, isActive: true, lastLoginAt: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ data: users, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/", validate(createUserSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as z.infer<typeof createUserSchema>;
    const exists = await prisma.user.findUnique({ where: { email: body.email } });
    if (exists) { res.status(409).json({ error: { code: "EMAIL_TAKEN" } }); return; }
    const passwordHash = await bcrypt.hash(body.password, 12);
    const user = await prisma.user.create({
      data: { ...body, passwordHash, password: undefined },
      select: { id: true, email: true, role: true, fullName: true, phone: true, organisationId: true, isActive: true },
    });
    await writeAuditLog(req.user!.sub, "CREATE", "User", user.id, null, user, req);
    res.status(201).json({ data: user });
  } catch (err) {
    logger.error({ err }, "Create user failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.patch("/:id", validate(updateUserSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    const body = req.body as z.infer<typeof updateUserSchema>;
    const before = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, fullName: true, isActive: true } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }

    const data: Record<string, unknown> = { ...body };
    if (body.password) {
      data["passwordHash"] = await bcrypt.hash(body.password, 12);
      delete data["password"];
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, fullName: true, phone: true, organisationId: true, isActive: true },
    });
    await writeAuditLog(req.user!.sub, "UPDATE", "User", id, before, updated, req);
    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params["id"]!;
    if (id === req.user!.sub) { res.status(400).json({ error: { code: "CANNOT_DELETE_SELF" } }); return; }
    const before = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    await writeAuditLog(req.user!.sub, "DEACTIVATE", "User", id, before, { isActive: false }, req);
    res.json({ data: { message: "User deactivated" } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

export default router;
