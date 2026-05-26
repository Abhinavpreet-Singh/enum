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

const router = express.Router();

// Public routes
router.get("/", optionalAuth, listIncidents);
router.get("/:id", getIncident);

// Session routes (requires authentication)
router.post("/:id/session", verifyJWT, startIncidentSession);
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
