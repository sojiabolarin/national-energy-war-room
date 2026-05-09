import { Router } from "express";
import { requireAuth, requireRole } from "../../../middlewares/auth.js";
import { requireStaff } from "../../../middlewares/auth.js";
import complaintsAdminRouter from "./complaints.js";
import registryRouter from "./registry.js";
import usersRouter from "./users.js";
import dataQualityRouter from "./data-quality.js";
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
router.use("/data-quality", dataQualityRouter);

router.get("/audit-log", requireRole("ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(q["page"] ?? "1", 10));
    const pageSize = Math.min(100, parseInt(q["pageSize"] ?? "20", 10));
    const where: Record<string, unknown> = {};
    if (q["action"]) where["action"] = { contains: q["action"], mode: "insensitive" };
    if (q["userId"]) where["userId"] = q["userId"];
    const entityFilter = q["entityType"] ?? q["entity"];
    if (entityFilter) where["entity"] = { contains: entityFilter, mode: "insensitive" };
    if (q["dateFrom"] || q["dateTo"]) {
      const createdAt: Record<string, Date> = {};
      if (q["dateFrom"]) createdAt["gte"] = new Date(q["dateFrom"]);
      if (q["dateTo"]) {
        const to = new Date(q["dateTo"]);
        to.setHours(23, 59, 59, 999);
        createdAt["lte"] = to;
      }
      where["createdAt"] = createdAt;
    }

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

    const shaped = logs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entity,
      entityId: l.entityId,
      userId: l.userId,
      userEmail: l.user?.email ?? null,
      userFullName: l.user?.fullName ?? null,
      ipAddress: l.ip,
      userAgent: l.userAgent,
      changes: (l.before || l.after) ? { before: l.before, after: l.after } : null,
      createdAt: l.createdAt,
    }));

    res.json({ data: shaped, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/settings", requireRole("ADMIN"), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const rows = await prisma.systemSetting.findMany();
    const settings: Record<string, string> = {};
    for (const row of rows) { settings[row.key] = row.value; }
    res.json({ data: settings });
  } catch (err) {
    logger.error({ err }, "settings GET failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.put("/settings", requireRole("ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    await Promise.all(
      Object.entries(body).map(([key, value]) =>
        prisma.systemSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        }),
      ),
    );
    await prisma.auditLog.create({
      data: { userId: req.user!.sub, action: "SETTINGS_CHANGED", entity: "SystemSetting", entityId: "global", after: body as unknown as Record<string, string> },
    });
    res.json({ data: { message: "Settings saved" } });
  } catch (err) {
    logger.error({ err }, "settings PUT failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

function parseImportData(data: string): Record<string, string>[] {
  const trimmed = data.trimStart();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) return parsed as Record<string, string>[];
    return [parsed as Record<string, string>];
  }
  return parse(data, { columns: true, skip_empty_lines: true, trim: true }) as Record<string, string>[];
}

async function validateRows(
  records: Record<string, string>[],
  period: string,
): Promise<{ total: number; wouldAccept: number; wouldReject: { row: number; reason: string }[] }> {
  let wouldAccept = 0;
  const wouldReject: { row: number; reason: string }[] = [];
  for (let i = 0; i < records.length; i++) {
    const row = records[i]!;
    const discoName = row["disco"] ?? row["DisCo"] ?? row["name"];
    if (!discoName) { wouldReject.push({ row: i + 1, reason: "Missing disco column value" }); continue; }
    const remittancePct = row["remittancePct"] ?? row["remittance_pct"];
    if (remittancePct && isNaN(parseFloat(remittancePct))) {
      wouldReject.push({ row: i + 1, reason: `Invalid remittancePct: "${remittancePct}"` }); continue;
    }
    const disco = await prisma.disCo.findFirst({ where: { name: { contains: discoName, mode: "insensitive" } } });
    if (!disco) { wouldReject.push({ row: i + 1, reason: `DisCo not found in registry: "${discoName}"` }); continue; }
    wouldAccept++;
  }
  return { total: records.length, wouldAccept, wouldReject };
}

router.get("/imports/history", requireRole("MINISTRY_STAFF","ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const limit = Math.min(50, Math.max(1, parseInt(q["limit"] ?? "10", 10)));
    const logs = await prisma.auditLog.findMany({
      where: { action: "IMPORT" },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, entityId: true, after: true, createdAt: true, userId: true },
    });
    const formatted = logs.map((l) => {
      const after = l.after as Record<string, unknown> | null;
      return {
        id: l.id,
        period: l.entityId,
        accepted: after?.["accepted"] ?? 0,
        rejected: (after?.["rejected"] as number | undefined) ?? 0,
        createdAt: l.createdAt,
        importedBy: l.userId,
      };
    });
    res.json({ data: formatted });
  } catch (err) {
    logger.error({ err }, "imports/history failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.post("/imports/nerc-quarterly/validate", requireRole("MINISTRY_STAFF","ADMIN"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as { data?: string; period?: string };
    if (!body.data || !body.period) {
      res.status(400).json({ error: { code: "MISSING_FIELDS", message: "data and period required" } }); return;
    }
    let records: Record<string, string>[];
    try { records = parseImportData(body.data); }
    catch { res.status(400).json({ error: { code: "INVALID_DATA", message: "Could not parse file data" } }); return; }
    const result = await validateRows(records, body.period);
    res.json({ data: result });
  } catch (err) {
    logger.error({ err }, "Import validate failed");
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
      records = parseImportData(body.data);
    } catch {
      res.status(400).json({ error: { code: "INVALID_DATA", message: "Could not parse file data (CSV or JSON)" } });
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
