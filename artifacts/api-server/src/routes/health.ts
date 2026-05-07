import { Router, type IRouter } from "express";
import prisma from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { getWorkerStatus, allWorkersHealthy } from "../lib/workerHeartbeat.js";

const router: IRouter = Router();

router.get("/healthz", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const workers = getWorkerStatus();
    const workersOk = allWorkersHealthy();
    const status = workersOk ? "ok" : "degraded";
    res.status(workersOk ? 200 : 207).json({
      status,
      db: "connected",
      workers,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Health check DB failed");
    res.status(503).json({
      status: "degraded",
      db: "disconnected",
      workers: getWorkerStatus(),
      error: "Database connection failed",
    });
  }
});

export default router;
