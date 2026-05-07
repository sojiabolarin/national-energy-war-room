import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { requireAuth, requireStaff } from "../../middlewares/auth.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";
import type { Response } from "express";

const router = Router();

/**
 * GET /api/v1/alerts/active
 * Public contract endpoint for active alerts.
 * - Accept: text/event-stream → SSE stream (push every 10s)
 * - Accept: application/json  → JSON snapshot
 * Requires authentication.
 */
router.get("/active", requireAuth, requireStaff, async (req: AuthenticatedRequest, res: Response) => {
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
      } catch { /* ignore on stream */ }
    };

    await send();
    const interval = setInterval(send, 10_000);
    req.on("close", () => clearInterval(interval));
  } else {
    try {
      const alerts = await prisma.alert.findMany({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
        take: 50,
      });
      res.json({ data: alerts });
    } catch {
      res.status(500).json({ error: { code: "INTERNAL_ERROR" } });
    }
  }
});

export default router;
