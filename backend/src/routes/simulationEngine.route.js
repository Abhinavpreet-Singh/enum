import express from "express";
import { runSimulationEngine } from "../controllers/simulationEngine.controller.js";

const router = express.Router();

router.post("/run", runSimulationEngine);

export default router;
