import express from "express";
import {
  getLinuxQuestionById,
  getLinuxQuestions,
  submitLinuxQuestion,
} from "../controllers/linuxController.js";

const router = express.Router();

router.get("/questions/linux", getLinuxQuestions);
router.get("/questions/linux/:id", getLinuxQuestionById);
router.post("/submit/linux", submitLinuxQuestion);

export default router;