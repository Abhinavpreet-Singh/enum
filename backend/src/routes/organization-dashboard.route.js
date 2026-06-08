import { Router } from "express";
import { verifyJWT, requireRole } from "../middlewares/auth.middleware.js";
import {
  getDashboardMetrics,
  getRecentActivity,
  getOrganizationProfile,
} from "../controllers/organization-dashboard.controller.js";

const router = Router();

const guard = [verifyJWT, requireRole("organization")];

router.get("/metrics", ...guard, getDashboardMetrics);
router.get("/recent-activity", ...guard, getRecentActivity);
router.get("/profile", ...guard, getOrganizationProfile);

export default router;
