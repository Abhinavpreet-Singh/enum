import { Router } from "express";
import { verifyJWT, requireRole, requireApproved } from "../middlewares/auth.middleware.js";
import {
  getDashboardMetrics,
  getRecentActivity,
  getOrganizationProfile,
  updateOrganizationProfile,
  getAssessmentAttempts,
  getAttemptDetail,
} from "../controllers/organization-dashboard.controller.js";

const router = Router();

const guard = [verifyJWT, requireRole("organization"), requireApproved];

router.get("/metrics", ...guard, getDashboardMetrics);
router.get("/recent-activity", ...guard, getRecentActivity);
router.get("/profile", ...guard, getOrganizationProfile);
router.patch("/profile", ...guard, updateOrganizationProfile);
router.get("/assessments/:assessmentId/attempts", ...guard, getAssessmentAttempts);
router.get("/attempts/:attemptId", ...guard, getAttemptDetail);

export default router;
