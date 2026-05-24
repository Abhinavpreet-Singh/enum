import Router from "express";
import { getQuestion } from "../controllers/questions.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/getQuestion").get(optionalAuth, getQuestion);

export default router;
