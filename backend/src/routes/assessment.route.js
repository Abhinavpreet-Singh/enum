import { Router } from "express";
import { verifyJWT, requireRole, requireApproved } from "../middlewares/auth.middleware.js";
import {
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  publishAssessment,
  unpublishAssessment,
  duplicateAssessment,
  archiveAssessment,
} from "../controllers/assessment.controller.js";

const router = Router();

const companyGuard = [verifyJWT, requireRole("company"), requireApproved];

router.post("/", ...companyGuard, createAssessment);
router.get("/", ...companyGuard, getAssessments);
router.get("/:id", ...companyGuard, getAssessmentById);
router.put("/:id", ...companyGuard, updateAssessment);
router.delete("/:id", ...companyGuard, deleteAssessment);
router.put("/:id/publish", ...companyGuard, publishAssessment);
router.put("/:id/unpublish", ...companyGuard, unpublishAssessment);
router.post("/:id/duplicate", ...companyGuard, duplicateAssessment);
router.put("/:id/archive", ...companyGuard, archiveAssessment);

export default router;
