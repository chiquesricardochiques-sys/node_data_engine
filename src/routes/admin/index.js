import { Router } from "express";
import dashboardRoutes from "./dashboard.routes.js";
import tablesRoutes from "./tables.routes.js";
import projectsRoutes from "./projects.routes.js";

const router = Router();

router.use("/", dashboardRoutes);
router.use("/projects", projectsRoutes);
router.use("/tables", tablesRoutes);

export default router;
