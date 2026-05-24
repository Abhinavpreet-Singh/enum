import express from "express";
import {
    saveSubmission,
    getMySubmissions,
    getRecentSubmissions,
} from "../controllers/submission.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Save a submission (only when all test cases passed)
router.post("/save", verifyJWT, saveSubmission);

// Get current user's submissions for a question
router.get("/my/:questionId", verifyJWT, getMySubmissions);

// Get last 3 distinct-question submissions for the current user (for dashboard)
router.get("/recent", verifyJWT, getRecentSubmissions);

export default router;
