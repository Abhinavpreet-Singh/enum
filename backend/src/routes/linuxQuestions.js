import express from "express";
import {
  getLinuxQuestionById,
  getLinuxQuestions,
  submitLinuxQuestion,
} from "../controllers/linuxController.js";

const router = express.Router();

router.get("/simulations/linux", getLinuxQuestions);
router.get("/simulations/linux/:id", getLinuxQuestionById);
router.post("/simulations/linux/submit", submitLinuxQuestion);

export default router;