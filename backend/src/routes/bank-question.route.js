import { Router } from "express";
import { verifyJWT, requireRole, requireApproved } from "../middlewares/auth.middleware.js";
import {
  createBankQuestion,
  getBankQuestions,
  updateBankQuestion,
  deleteBankQuestion,
} from "../controllers/bank-question.controller.js";

const router = Router();

const guard = [verifyJWT, requireRole("company"), requireApproved];

router.post("/:bankId/questions", ...guard, createBankQuestion);
router.get("/:bankId/questions", ...guard, getBankQuestions);
router.put("/:bankId/questions/:questionId", ...guard, updateBankQuestion);
router.delete("/:bankId/questions/:questionId", ...guard, deleteBankQuestion);

export default router;
