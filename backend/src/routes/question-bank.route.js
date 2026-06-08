import { Router } from "express";
import { verifyJWT, requireRole, requireApproved } from "../middlewares/auth.middleware.js";
import {
  createQuestionBank,
  getQuestionBanks,
  getQuestionBankById,
  updateQuestionBank,
  deleteQuestionBank,
} from "../controllers/question-bank.controller.js";

const router = Router();

const guard = [verifyJWT, requireRole("company"), requireApproved];

router.post("/", ...guard, createQuestionBank);
router.get("/", ...guard, getQuestionBanks);
router.get("/:id", ...guard, getQuestionBankById);
router.put("/:id", ...guard, updateQuestionBank);
router.delete("/:id", ...guard, deleteQuestionBank);

export default router;
