import { Router } from "express";
import { verifyJWT, requireRole } from "../middlewares/auth.middleware.js";
import {
  getDashboardMetrics,
  getRecentActivity,
  getCompanyProfile,
} from "../controllers/company-dashboard.controller.js";

const router = Router();

const guard = [verifyJWT, requireRole("company")];

router.get("/metrics", ...guard, getDashboardMetrics);
router.get("/recent-activity", ...guard, getRecentActivity);
router.get("/profile", ...guard, getCompanyProfile);

export default router;
