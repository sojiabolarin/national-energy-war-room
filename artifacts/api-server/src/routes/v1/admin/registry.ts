import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { requireRole } from "../../../middlewares/auth.js";
import { writeAuditLog } from "../../../middlewares/audit.js";
import { logger } from "../../../lib/logger.js";
import type { AuthenticatedRequest } from "../../../middlewares/auth.js";
import type { Response } from "express";

const router = Router();

router.use(requireRole("MINISTER", "MINISTRY_STAFF", "ADMIN"));

function paginateQuery(query: Record<string, string>) {
  const page = Math.max(1, parseInt(query["page"] ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(query["pageSize"] ?? "20", 10)));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

function makeEntityRouter<T extends { id: string }>(
  entityName: string,
  model: {
    findMany: (args: unknown) => Promise<T[]>;
    count: (args?: unknown) => Promise<number>;
    findUnique: (args: unknown) => Promise<T | null>;
    create: (args: unknown) => Promise<T>;
    update: (args: unknown) => Promise<T>;
    delete: (args: unknown) => Promise<T>;
  },
  defaultOrderBy: Record<string, string> = { createdAt: "desc" }
) {
  const r = Router();

  r.get("/", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const q = req.query as Record<string, string>;
      const { skip, take, page, pageSize } = paginateQuery(q);
      const [items, total] = await Promise.all([
        model.findMany({ skip, take, orderBy: defaultOrderBy }),
        model.count(),
      ]);
      res.json({ data: items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
    } catch (err) {
      logger.error({ err }, `${entityName} list failed`);
      res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
  });

  r.get("/:id", async (req, res) => {
    try {
      const item = await model.findUnique({ where: { id: req.params["id"] } });
      if (!item) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
      res.json({ data: item });
    } catch (err) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
  });

  r.post("/", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = { ...req.body, createdBy: req.user!.sub };
      const item = await model.create({ data });
      await writeAuditLog(req.user!.sub, "CREATE", entityName, item.id, null, item, req);
      res.status(201).json({ data: item });
    } catch (err: unknown) {
      logger.error({ err }, `${entityName} create failed`);
      const msg = err instanceof Error ? err.message : "Create failed";
      res.status(400).json({ error: { code: "CREATE_FAILED", message: msg } });
    }
  });

  r.patch("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params["id"]!;
      const before = await model.findUnique({ where: { id } });
      if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
      const data = { ...req.body, updatedBy: req.user!.sub };
      const updated = await model.update({ where: { id }, data });
      await writeAuditLog(req.user!.sub, "UPDATE", entityName, id, before, updated, req);
      res.json({ data: updated });
    } catch (err: unknown) {
      logger.error({ err }, `${entityName} update failed`);
      res.status(400).json({ error: { code: "UPDATE_FAILED", message: err instanceof Error ? err.message : "Update failed" } });
    }
  });

  r.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params["id"]!;
      const before = await model.findUnique({ where: { id } });
      if (!before) { res.status(404).json({ error: { code: "NOT_FOUND" } }); return; }
      await model.delete({ where: { id } });
      await writeAuditLog(req.user!.sub, "DELETE", entityName, id, before, null, req);
      res.json({ data: { message: "Deleted" } });
    } catch (err) {
      res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
  });

  return r;
}

router.use("/plants", makeEntityRouter("Plant", prisma.plant as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/plant-units", makeEntityRouter("PlantUnit", prisma.plantUnit as Parameters<typeof makeEntityRouter>[1]));
router.use("/substations", makeEntityRouter("Substation", prisma.substation as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/transmission-lines", makeEntityRouter("TransmissionLine", prisma.transmissionLine as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/discos", makeEntityRouter("DisCo", prisma.disCo as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/feeders", makeEntityRouter("Feeder", prisma.feeder as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/gas-pipelines", makeEntityRouter("GasPipeline", prisma.gasPipeline as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/diversion-opportunities", makeEntityRouter("DiversionOpportunity", prisma.diversionOpportunity as Parameters<typeof makeEntityRouter>[1], { priority: "asc" }));
router.use("/capital-projects", makeEntityRouter("CapitalProject", prisma.capitalProject as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/minigrids", makeEntityRouter("MiniGrid", prisma.miniGrid as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/settlement-invoices", makeEntityRouter("SettlementInvoice", prisma.settlementInvoice as Parameters<typeof makeEntityRouter>[1], { period: "desc" }));
router.use("/genco-allocations", makeEntityRouter("GencoAllocation", prisma.gencoAllocation as Parameters<typeof makeEntityRouter>[1]));
router.use("/grid-metrics", makeEntityRouter("GridMetric", prisma.gridMetric as Parameters<typeof makeEntityRouter>[1], { timestamp: "desc" }));
router.use("/escalation-rules", makeEntityRouter("EscalationRule", prisma.escalationRule as Parameters<typeof makeEntityRouter>[1], { priority: "asc" }));
router.use("/value-chain-links", makeEntityRouter("ValueChainLink", prisma.valueChainLink as Parameters<typeof makeEntityRouter>[1], { order: "asc" }));
router.use("/stakeholders", makeEntityRouter("Stakeholder", prisma.stakeholder as Parameters<typeof makeEntityRouter>[1], { escalationOrder: "asc" }));
router.use("/authority-instruments", makeEntityRouter("AuthorityInstrument", prisma.authorityInstrument as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));
router.use("/escalation-steps", makeEntityRouter("EscalationStep", prisma.escalationStep as Parameters<typeof makeEntityRouter>[1], { stepOrder: "asc" }));
router.use("/organisations", makeEntityRouter("Organisation", prisma.organisation as Parameters<typeof makeEntityRouter>[1], { name: "asc" }));

export default router;
