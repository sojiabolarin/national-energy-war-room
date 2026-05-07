import { Router } from "express";
import { requireAuth, requireRole } from "../../../middlewares/auth.js";
import { requireStaff } from "../../../middlewares/auth.js";
import complaintsAdminRouter from "./complaints.js";
import registryRouter from "./registry.js";
import usersRouter from "./users.js";
import prisma from "../../../lib/prisma.js";
import { parse } from "csv-parse/sync";
import { logger } from "../../../lib/logger.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.js";
import type { Response } from "express";

const router = Router();

router.use(requireAuth, requireStaff);

router.use("/complaints", complaintsAdminRouter);
router.use("/registry", registryRouter);
router.use("/users", usersRouter);

router.get("/audit-log", requireRole("ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(q["page"] ?? "1", 10));
    const pageSize = Math.min(100, parseInt(q["pageSize"] ?? "20", 10));
    const where: Record<string, unknown> = {};
    if (q["entity"]) where["entity"] = q["entity"];
    if (q["userId"]) where["userId"] = q["userId"];
    if (q["action"]) where["action"] = { contains: q["action"], mode: "insensitive" };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, email: true, fullName: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ data: logs, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/imports/nerc-quarterly", requireRole("MINISTRY_STAFF","ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as { data?: string; period?: string };
    if (!body.data || !body.period) {
      res.status(400).json({ error: { code: "MISSING_FIELDS", message: "data (CSV string) and period required" } });
      return;
    }

    let records: Record<string, string>[];
    try {
      records = parse(body.data, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
    } catch {
      res.status(400).json({ error: { code: "INVALID_CSV", message: "Could not parse CSV" } });
      return;
    }

    let accepted = 0;
    const rejected: { row: number; reason: string }[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i]!;
      try {
        const discoName = row["disco"] ?? row["DisCo"] ?? row["name"];
        const remittancePct = row["remittancePct"] ?? row["remittance_pct"];
        if (!discoName) { rejected.push({ row: i + 1, reason: "Missing disco name" }); continue; }
        const disco = await prisma.disCo.findFirst({ where: { name: { contains: discoName, mode: "insensitive" } } });
        if (!disco) { rejected.push({ row: i + 1, reason: `DisCo not found: ${discoName}` }); continue; }

        const existing = await prisma.settlementInvoice.findFirst({
          where: { period: body.period, discoId: disco.id },
        });
        if (existing) {
          await prisma.settlementInvoice.update({
            where: { id: existing.id },
            data: {
              remittancePct: remittancePct ? parseFloat(remittancePct) : undefined,
              updatedBy: req.user!.sub,
            },
          });
        } else {
          await prisma.settlementInvoice.create({
            data: {
              period: body.period,
              discoId: disco.id,
              remittancePct: remittancePct ? parseFloat(remittancePct) : undefined,
              notes: `Imported from NERC quarterly report`,
              createdBy: req.user!.sub,
            },
          });
        }
        accepted++;
      } catch (err) {
        rejected.push({ row: i + 1, reason: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "IMPORT", entity: "NERCQuarterly", entityId: body.period, after: { accepted, rejected: rejected.length } },
    });

    res.json({ data: { total: records.length, accepted, rejected } });
  } catch (err) {
    logger.error({ err }, "Import failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

export default router;
