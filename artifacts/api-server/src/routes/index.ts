import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import roomsRouter from "./rooms.js";
import searchRouter from "./search.js";
import adminRouter from "./admin.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/rooms", roomsRouter);
router.use("/search", searchRouter);
router.use("/admin", adminRouter);

export default router;
