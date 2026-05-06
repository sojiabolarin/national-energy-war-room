import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./v1/auth.js";
import complaintsRouter from "./v1/complaints.js";
import sectorRouter from "./v1/sector.js";
import adminRouter from "./v1/admin/index.js";
import alertsAdminRouter from "./v1/admin/alerts.js";

const router: IRouter = Router();

router.use(healthRouter);

const v1 = Router();
v1.use("/auth", authRouter);
v1.use("/complaints", complaintsRouter);
v1.use("/sector", sectorRouter);
v1.use("/admin/alerts", alertsAdminRouter);
v1.use("/admin", adminRouter);

router.use("/api/v1", v1);

export default router;
