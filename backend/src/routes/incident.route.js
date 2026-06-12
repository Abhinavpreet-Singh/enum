import express from "express";
import {
  listIncidents,
  getIncident,
  startIncidentSession,
  getIncidentSessionState,
  tickIncidentSimulation,
  diagnoseIncident,
  performIncidentAction,
  completeIncidentSession,
  stopIncidentSession,
} from "../controllers/incident.controller.js";
import { optionalAuth, verifyJWT } from "../middlewares/auth.middleware.js";
import { featureGate } from "../middlewares/feature-gate.middleware.js";

const router = express.Router();

const incidentGate = featureGate("incidents_enabled");

// Public routes
router.get("/", incidentGate, optionalAuth, listIncidents);
router.get("/:id", incidentGate, getIncident);

// Session routes (requires authentication)
router.post("/:id/session", incidentGate, verifyJWT, startIncidentSession);
router.get("/:id/session/:sessionId", verifyJWT, getIncidentSessionState);
router.post("/:id/session/:sessionId/tick", verifyJWT, tickIncidentSimulation);
router.post(
  "/:id/session/:sessionId/diagnose",
  verifyJWT,
  diagnoseIncident,
);
router.post(
  "/:id/session/:sessionId/action",
  verifyJWT,
  performIncidentAction,
);
router.post(
  "/:id/session/:sessionId/complete",
  verifyJWT,
  completeIncidentSession,
);
router.post(
  "/:id/session/:sessionId/stop",
  verifyJWT,
  stopIncidentSession,
);

export default router;
