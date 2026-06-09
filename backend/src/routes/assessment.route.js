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
import {
  listAssessmentQuestions,
  addAssessmentQuestions,
  removeAssessmentQuestion,
} from "../controllers/assessment-question.controller.js";

const router = Router();

const organizationGuard = [verifyJWT, requireRole("organization"), requireApproved];

router.post("/", ...organizationGuard, createAssessment);
router.get("/", ...organizationGuard, getAssessments);
router.get("/:id", ...organizationGuard, getAssessmentById);
router.put("/:id", ...organizationGuard, updateAssessment);
router.delete("/:id", ...organizationGuard, deleteAssessment);
router.put("/:id/publish", ...organizationGuard, publishAssessment);
router.put("/:id/unpublish", ...organizationGuard, unpublishAssessment);
router.post("/:id/duplicate", ...organizationGuard, duplicateAssessment);
router.put("/:id/archive", ...organizationGuard, archiveAssessment);
router.get("/:id/questions", ...organizationGuard, listAssessmentQuestions);
router.post("/:id/questions", ...organizationGuard, addAssessmentQuestions);
router.delete("/:id/questions/:questionId", ...organizationGuard, removeAssessmentQuestion);

export default router;
