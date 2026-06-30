import express from "express";
import {
  getLinuxQuestionById,
  getLinuxQuestions,
  submitLinuxQuestion,
} from "../controllers/linuxController.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/simulations/linux", optionalAuth, getLinuxQuestions);
router.get("/simulations/linux/:id", optionalAuth, getLinuxQuestionById);
router.post("/simulations/linux/submit", optionalAuth, submitLinuxQuestion);

export default router;