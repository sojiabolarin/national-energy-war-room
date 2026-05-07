import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireAuth, requireStaff } from "../../middlewares/auth.js";
import { logger } from "../../lib/logger.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";
import type { Response } from "express";
import type { PlantStatus, ProjectCategory } from "@prisma/client";

const router = Router();

router.use(requireAuth, requireStaff);

function paginateQuery(query: Record<string, string>) {
  const page = Math.max(1, parseInt(query["page"] ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(query["pageSize"] ?? "20", 10)));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

router.get("/kpis", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const [plants, discos, complaints] = await Promise.all([
      prisma.plant.findMany({ select: { installedMw: true, availableMw: true, actualMw: true, paf: true } }),
      prisma.disCo.findMany({ select: { atccLossPct: true, meteringRatePct: true } }),
      prisma.complaint.aggregate({ _count: { id: true }, where: { status: { not: "RESOLVED" } } }),
    ]);

    const totalInstalled = plants.reduce((a, p) => a + Number(p.installedMw), 0);
    const totalAvailable = plants.reduce((a, p) => a + Number(p.availableMw), 0);
    const totalActual = plants.reduce((a, p) => a + Number(p.actualMw), 0);
    const avgPaf = plants.length ? plants.reduce((a, p) => a + Number(p.paf ?? 0), 0) / plants.length : 0;
    const avgAtcc = discos.length ? discos.reduce((a, d) => a + Number(d.atccLossPct ?? 0), 0) / discos.length : 0;
    const avgMetering = discos.length ? discos.reduce((a, d) => a + Number(d.meteringRatePct ?? 0), 0) / discos.length : 0;

    const latestMetric = await prisma.gridMetric.findFirst({ orderBy: { timestamp: "desc" } });

    res.json({
      data: {
        availableGenerationMw: totalAvailable,
        installedCapacityMw: totalInstalled,
        hourlyGenerationMwh: totalActual,
        atccLossPct: parseFloat(avgAtcc.toFixed(2)),
        meteringRatePct: parseFloat(avgMetering.toFixed(2)),
        plantAvailabilityFactor: parseFloat(avgPaf.toFixed(2)),
        openComplaints: complaints._count.id,
        frequencyHz: latestMetric ? Number(latestMetric.frequencyHz) : 50.0,
        source: "NERC Q1 2025",
      },
    });
  } catch (err) {
    logger.error({ err }, "KPIs failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "Failed to fetch KPIs" } });
  }
});

router.get("/grid/live", async (req: AuthenticatedRequest, res: Response) => {
  const acceptsSse = req.headers.accept?.includes("text/event-stream");
  if (acceptsSse) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const send = async () => {
      try {
        const metric = await prisma.gridMetric.findFirst({ orderBy: { timestamp: "desc" } });
        res.write(`data: ${JSON.stringify(metric)}\n\n`);
      } catch { /* ignore */ }
    };
    await send();
    const interval = setInterval(send, 5000);
    req.on("close", () => clearInterval(interval));
  } else {
    const metric = await prisma.gridMetric.findFirst({ orderBy: { timestamp: "desc" } });
    res.json({ data: metric });
  }
});

router.get("/grid/stream", async (req: AuthenticatedRequest, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = async () => {
    try {
      const metric = await prisma.gridMetric.findFirst({ orderBy: { timestamp: "desc" } });
      res.write(`data: ${JSON.stringify(metric)}\n\n`);
    } catch { /* ignore */ }
  };

  await send();
  const interval = setInterval(send, 5000);
  req.on("close", () => clearInterval(interval));
});

router.get("/sankey", async (_req, res) => {
  try {
    const [plants, discos] = await Promise.all([
      prisma.plant.findMany({ select: { name: true, actualMw: true, type: true } }),
      prisma.disCo.findMany({
        select: {
          name: true,
          atccLossPct: true,
          settlements: { orderBy: { period: "desc" }, take: 1 },
        },
      }),
    ]);

    const totalGen = plants.reduce((a, p) => a + Number(p.actualMw), 0);
    const nodes = [
      { id: "GenCos", label: "GenCos", value: totalGen, layer: 0 },
      { id: "TCN", label: "TCN (Transmission)", value: totalGen * 0.95, layer: 1 },
      ...discos.map((d) => ({ id: d.name, label: d.name, value: totalGen * 0.95 / discos.length, layer: 2 })),
      { id: "Customers", label: "Customers", value: totalGen * 0.6, layer: 3 },
    ];

    const totalSettlement = discos.reduce((a, d) => {
      const s = d.settlements[0];
      return a + (s ? Number(s.remittedNgn ?? 0) : 0);
    }, 0);

    const financialNodes = [
      { id: "CustomerPayments", label: "Customer Payments", value: totalSettlement, layer: 0, direction: "financial" },
      { id: "DiscoCollections", label: "DisCo Collections", value: totalSettlement * 0.95, layer: 1, direction: "financial" },
      { id: "NBET", label: "NBET", value: totalSettlement * 0.9, layer: 2, direction: "financial" },
      { id: "GenCoPayments", label: "GenCo Payments", value: totalSettlement * 0.85, layer: 3, direction: "financial" },
    ];

    res.json({ data: { physicalFlow: nodes, financialFlow: financialNodes } });
  } catch (err) {
    logger.error({ err }, "Sankey failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/plants", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const { skip, take, page, pageSize } = paginateQuery(q);
    const where = q["status"] ? { status: q["status"] as PlantStatus } : {};
    const [plants, total] = await Promise.all([
      prisma.plant.findMany({ where, skip, take, orderBy: { name: "asc" }, include: { genco: { select: { id: true, name: true } } } }),
      prisma.plant.count({ where }),
    ]);
    res.json({ data: plants, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    logger.error({ err }, "Plants list failed");
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/plants/:id", async (req, res) => {
  try {
    const plant = await prisma.plant.findUnique({
      where: { id: req.params["id"] },
      include: { units: true, genco: { select: { id: true, name: true } }, diversionOpps: true },
    });
    if (!plant) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    res.json({ data: plant });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/plants/:id/units", async (req, res) => {
  const units = await prisma.plantUnit.findMany({ where: { plantId: req.params["id"] } });
  res.json({ data: units });
});

router.get("/transmission/lines", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const { skip, take, page, pageSize } = paginateQuery(q);
    const [lines, total] = await Promise.all([
      prisma.transmissionLine.findMany({ skip, take, orderBy: { name: "asc" }, include: { fromSubstation: true, toSubstation: true } }),
      prisma.transmissionLine.count(),
    ]);
    res.json({ data: lines, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/transmission/substations", async (req: AuthenticatedRequest, res: Response) => {
  const substations = await prisma.substation.findMany({ orderBy: { name: "asc" } });
  res.json({ data: substations });
});

router.get("/discos", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const { skip, take, page, pageSize } = paginateQuery(q);
    const sort = q["sort"] ?? "name";
    const [discos, total] = await Promise.all([
      prisma.disCo.findMany({ skip, take, orderBy: { [sort]: "asc" }, include: { operatorOrg: { select: { id: true, name: true } } } }),
      prisma.disCo.count(),
    ]);
    res.json({ data: discos, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/discos/:id", async (req, res) => {
  try {
    const disco = await prisma.disCo.findUnique({
      where: { id: req.params["id"] },
      include: { operatorOrg: { select: { id: true, name: true } }, feeders: { take: 10 } },
    });
    if (!disco) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    res.json({ data: disco });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/discos/:id/feeders", async (req, res) => {
  const feeders = await prisma.feeder.findMany({ where: { discoId: req.params["id"] }, orderBy: { atccLossPct: "desc" } });
  res.json({ data: feeders });
});

router.get("/gas/pipelines", async (_req, res) => {
  const pipelines = await prisma.gasPipeline.findMany({ orderBy: { name: "asc" } });
  res.json({ data: pipelines });
});

router.get("/gas/diversions", async (_req, res) => {
  const diversions = await prisma.diversionOpportunity.findMany({ orderBy: { priority: "asc" }, include: { plant: { select: { id: true, name: true } } } });
  res.json({ data: diversions });
});

router.get("/projects", async (req: AuthenticatedRequest, res: Response) => {
  const q = req.query as Record<string, string>;
  const { skip, take, page, pageSize } = paginateQuery(q);
  const where = q["category"] ? { category: q["category"] as ProjectCategory } : {};
  const [projects, total] = await Promise.all([
    prisma.capitalProject.findMany({ where, skip, take, orderBy: { name: "asc" } }),
    prisma.capitalProject.count({ where }),
  ]);
  res.json({ data: projects, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
});

router.get("/minigrids", async (_req, res) => {
  const minigrids = await prisma.miniGrid.findMany({ orderBy: { name: "asc" } });
  res.json({ data: minigrids });
});

router.get("/settlement/invoices", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const { skip, take, page, pageSize } = paginateQuery(q);
    const where = q["period"] ? { period: q["period"] } : {};
    const [invoices, total] = await Promise.all([
      prisma.settlementInvoice.findMany({
        where, skip, take, orderBy: { period: "desc" },
        include: { disco: { select: { id: true, name: true } }, gencoAllocs: { include: { genco: { select: { id: true, name: true } } } } },
      }),
      prisma.settlementInvoice.count({ where }),
    ]);
    res.json({ data: invoices, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/value-chain", async (_req, res) => {
  try {
    const links = await prisma.valueChainLink.findMany({
      orderBy: { order: "asc" },
      include: {
        stakeholders: { include: { organisation: { select: { id: true, name: true } } } },
        authorityInstruments: true,
        escalationSteps: { orderBy: { stepOrder: "asc" } },
      },
    });
    res.json({ data: links });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/value-chain/:key", async (req, res) => {
  try {
    const link = await prisma.valueChainLink.findUnique({
      where: { key: req.params["key"] },
      include: {
        stakeholders: { include: { organisation: { select: { id: true, name: true } } } },
        authorityInstruments: true,
        escalationSteps: { orderBy: { stepOrder: "asc" } },
      },
    });
    if (!link) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
    res.json({ data: link });
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  }
});

router.get("/alerts/active", async (req: AuthenticatedRequest, res: Response) => {
  const acceptsSse = req.headers.accept?.includes("text/event-stream");
  if (acceptsSse) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    const send = async () => {
      try {
        const alerts = await prisma.alert.findMany({
          where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
          orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
          take: 20,
        });
        res.write(`data: ${JSON.stringify(alerts)}\n\n`);
      } catch { /* ignore */ }
    };
    await send();
    const interval = setInterval(send, 10000);
    req.on("close", () => clearInterval(interval));
  } else {
    try {
      const alerts = await prisma.alert.findMany({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 50,
      });
      res.json({ data: alerts });
    } catch (err) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
  }
});

router.get("/alerts/stream", async (req: AuthenticatedRequest, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const send = async () => {
    try {
      const alerts = await prisma.alert.findMany({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 20,
      });
      res.write(`data: ${JSON.stringify(alerts)}\n\n`);
    } catch { /* ignore */ }
  };

  await send();
  const interval = setInterval(send, 10000);
  req.on("close", () => clearInterval(interval));
});

export default router;
