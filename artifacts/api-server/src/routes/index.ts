import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./v1/auth.js";
import complaintsRouter from "./v1/complaints.js";
import sectorRouter from "./v1/sector.js";
import adminRouter from "./v1/admin/index.js";
import alertsAdminRouter from "./v1/admin/alerts.js";
import { publicLimiter, authLimiter, complaintSubmitLimiter } from "../middlewares/rateLimiter.js";

const router: IRouter = Router();

// Health — no rate limit
router.use(healthRouter);

const v1 = Router();

// Auth — public limiter (100/min per IP)
v1.use("/auth", publicLimiter, authRouter);

// Complaints public filing — submit limiter (60/min), tracking is publicLimiter
v1.use("/complaints/whatsapp", publicLimiter);
v1.post("/complaints", complaintSubmitLimiter);
v1.use("/complaints", publicLimiter, complaintsRouter);

// Sector intelligence — authenticated staff limiter (600/min)
v1.use("/sector", authLimiter, sectorRouter);

// Admin — authenticated staff limiter (600/min)
v1.use("/admin/alerts", authLimiter, alertsAdminRouter);
v1.use("/admin", authLimiter, adminRouter);

router.use("/api/v1", v1);

export default router;
