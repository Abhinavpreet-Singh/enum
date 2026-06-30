import express from "express";
import { verifyJWT, optionalAuth } from "../middlewares/auth.middleware.js";
import { submitSystemDesign, getSubmissions, getMySubmissions, getSubmissionById, getSystemDesignSimulations, getSystemDesignSimulationById, createSystemDesignSimulation,
} from "../controllers/systemDesign.controller.js";

const router = express.Router();

// Public
router.get("/simulations", optionalAuth, getSystemDesignSimulations);
router.get("/simulations/:id", optionalAuth, getSystemDesignSimulationById);

// Authenticated
router.post("/submit", verifyJWT, submitSystemDesign);
router.get("/my-submissions", verifyJWT, getMySubmissions);
router.get("/submissions/:simulationId", verifyJWT, getSubmissions);
router.get("/submission/:id", verifyJWT, getSubmissionById);

// Admin
router.post("/simulations", verifyJWT, createSystemDesignSimulation);

export default router;
