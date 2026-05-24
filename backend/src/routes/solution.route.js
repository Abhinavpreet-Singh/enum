import express from "express";
import { publishSolution, getSolutionsByQuestion, getMySolutions, upvoteSolution } from "../controllers/solution.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/publish", verifyJWT, publishSolution);
router.get("/question/:questionId", getSolutionsByQuestion);
router.get("/my", verifyJWT, getMySolutions);
router.patch("/upvote/:solutionId", verifyJWT, upvoteSolution);

export default router;
