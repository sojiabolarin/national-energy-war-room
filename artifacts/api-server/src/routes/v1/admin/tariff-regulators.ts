import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requireAuth, requireStaff } from "../../../middlewares/auth.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.js";
import type { Response } from "express";

const router = Router();
router.use(requireAuth, requireStaff);

// ── TARIFF ORDERS ──────────────────────────────────────────────────────────

router.get("/tariff-orders", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const scope = q["scope"];
    const where: Record<string, unknown> = {};
    if (scope) where["scope"] = scope;
    if (q["issuingBody"]) where["issuingBody"] = { contains: q["issuingBody"], mode: "insensitive" };

    const orders = await prisma.tariffOrder.findMany({
      where,
      orderBy: { effectiveDate: "desc" },
    });
    res.json({ data: orders });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/tariff-orders/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await prisma.tariffOrder.findUnique({ where: { id: String(req.params["id"]) } });
    if (!order) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    res.json({ data: order });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

// ── STATE REGULATORS ───────────────────────────────────────────────────────

router.get("/state-regulators", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (q["state"]) where["state"] = { contains: q["state"], mode: "insensitive" };
    if (q["lowConfidence"] === "true") where["lowConfidence"] = true;

    const regulators = await prisma.stateRegulator.findMany({
      where,
      orderBy: { state: "asc" },
    });
    res.json({ data: regulators });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/state-regulators/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const reg = await prisma.stateRegulator.findUnique({ where: { id: String(req.params["id"]) } });
    if (!reg) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    res.json({ data: reg });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

// ── DISPATCH HISTORY ───────────────────────────────────────────────────────

router.get("/dispatch-history", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (q["plantId"]) where["plantId"] = q["plantId"];
    if (q["plantName"]) where["plantName"] = { contains: q["plantName"], mode: "insensitive" };
    if (q["dateFrom"] || q["dateTo"]) {
      const dateFilter: Record<string, Date> = {};
      if (q["dateFrom"]) dateFilter["gte"] = new Date(q["dateFrom"]);
      if (q["dateTo"]) dateFilter["lte"] = new Date(q["dateTo"]);
      where["date"] = dateFilter;
    }
    if (q["outageOnly"] === "true") where["outageReason"] = { not: null };

    const page = Math.max(1, parseInt(q["page"] ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(q["pageSize"] ?? "100", 10)));

    const [rows, total] = await Promise.all([
      prisma.dispatchHistory.findMany({
        where,
        orderBy: [{ date: "desc" }, { plantName: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { plant: { select: { id: true, name: true, state: true, type: true } } },
      }),
      prisma.dispatchHistory.count({ where }),
    ]);

    res.json({ data: rows, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/dispatch-history/plant/:plantId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const dateFilter: Record<string, Date> = {};
    if (q["dateFrom"]) dateFilter["gte"] = new Date(q["dateFrom"]);
    if (q["dateTo"]) dateFilter["lte"] = new Date(q["dateTo"]);

    const rows = await prisma.dispatchHistory.findMany({
      where: {
        plantId: String(req.params["plantId"]),
        ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
      },
      orderBy: { date: "asc" },
    });

    if (!rows.length) {
      const plant = await prisma.plant.findUnique({ where: { id: String(req.params["plantId"]) }, select: { id: true, name: true } });
      if (!plant) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    }

    const summary = rows.length ? {
      avgActualMw: rows.reduce((a, r) => a + Number(r.actualMw), 0) / rows.length,
      avgCapacityFactor: rows.reduce((a, r) => a + Number(r.capacityFactor), 0) / rows.length,
      daysWithOutage: rows.filter(r => r.outageReason).length,
      totalDays: rows.length,
    } : null;

    res.json({ data: rows, summary });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

// ── COMBINED SUMMARY ───────────────────────────────────────────────────────

router.get("/regulatory-summary", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [tariffOrders, stateRegulators, dispatch] = await Promise.all([
      prisma.tariffOrder.findMany({ orderBy: { effectiveDate: "desc" }, take: 3 }),
      prisma.stateRegulator.findMany({ orderBy: { state: "asc" } }),
      prisma.dispatchHistory.groupBy({
        by: ["plantName"],
        _avg: { actualMw: true, capacityFactor: true },
        _count: { id: true },
        orderBy: { _avg: { actualMw: "desc" } },
        take: 10,
      }),
    ]);
    res.json({ data: { tariffOrders, stateRegulators, recentDispatch: dispatch } });
  } catch {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

export default router;
