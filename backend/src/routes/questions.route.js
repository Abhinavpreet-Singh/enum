import Router from "express";
import { getQuestion } from "../controllers/questions.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { featureGate } from "../middlewares/feature-gate.middleware.js";

const router = Router();

router.route("/getQuestion").get(featureGate("dsa_arena_enabled"), optionalAuth, getQuestion);

export default router;
