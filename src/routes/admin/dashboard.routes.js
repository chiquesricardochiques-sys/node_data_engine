/**
 * ====================================================
 * ROTAS DE DASHBOARD (ADMIN)
 * ====================================================
 */

import express from "express";
import dashboardController from "../../controllers/admin/dashboard.controller.js";

const router = express.Router();

// Rotas públicas
router.get("/login", dashboardController.loginPage);
router.post("/login", dashboardController.login);

// Rotas protegidas
router.get(
  "/dashboard",
  dashboardController.authMiddleware,
  dashboardController.dashboard
);

router.get(
  "/logout",
  dashboardController.authMiddleware,
  dashboardController.logout
);

export default router;
