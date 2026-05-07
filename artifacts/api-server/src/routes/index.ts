import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./v1/auth.js";
import complaintsRouter from "./v1/complaints.js";
import sectorRouter from "./v1/sector.js";
import alertsRouter from "./v1/alerts.js";
import adminRouter from "./v1/admin/index.js";
import alertsAdminRouter from "./v1/admin/alerts.js";
import { complaintSubmitLimiter } from "../middlewares/rateLimiter.js";

const router: IRouter = Router();

// Health — no rate limit
router.use(healthRouter);

const v1 = Router();

// smartLimiter applied globally in app.ts handles the 100/600 tier split.
// Per-route limiters below are additive for specific overrides only.

// Auth
v1.use("/auth", authRouter);

// Complaints — complaint submission gets a stricter per-route cap
v1.post("/complaints", complaintSubmitLimiter);
v1.use("/complaints", complaintsRouter);

// Top-level alerts/active (SSE + JSON) — required contract endpoint
v1.use("/alerts", alertsRouter);

// Sector intelligence
v1.use("/sector", sectorRouter);

// Admin
v1.use("/admin/alerts", alertsAdminRouter);
v1.use("/admin", adminRouter);

router.use("/api/v1", v1);

export default router;
