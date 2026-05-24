import express from "express";
import {
    getProgress,
    getAllProgress,
    updateProgress,
} from "../controllers/simulationProgress.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All progress routes require authentication
router.use(verifyJWT);

// GET all progress entries for current user
router.get("/all", getAllProgress);

// GET progress for a specific simulation
router.get("/:simulationId", getProgress);

// POST update progress for a simulation
router.post("/:simulationId", updateProgress);

export default router;
