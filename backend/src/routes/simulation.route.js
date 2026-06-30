import express from "express";
import {
  getSimulations,
  getSimulationById,
  adminPostSimulation,
  adminEditSimulation,
  adminDeleteSimulation,
  uploadSimulationFiles,
  getSimulationFileContents,
} from "../controllers/simulation.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { featureGate } from "../middlewares/feature-gate.middleware.js";

const router = express.Router();

const simGate = featureGate("simulations_enabled");

// Public routes
router.get("/getSimulations", simGate, optionalAuth, getSimulations);
router.get("/getSimulation/:id", optionalAuth, getSimulationById);
router.get("/getSimulationFiles/:id", optionalAuth, getSimulationFileContents);

// Admin routes
router.post("/adminPostSimulation", adminPostSimulation);
router.put("/editSimulation/:id", adminEditSimulation);
router.delete("/deleteSimulation/:id", adminDeleteSimulation);
router.post("/uploadFiles/:id", uploadSimulationFiles);

export default router;
