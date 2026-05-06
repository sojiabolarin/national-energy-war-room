import { Router, type IRouter } from "express";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      db: "connected",
      workers: ["sla-tracker", "escalation-worker", "stats-refresher"],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Health check DB failed");
    res.status(503).json({ status: "degraded", db: "disconnected", error: "Database connection failed" });
  }
});

export default router;
