import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

/**
 * Utility: Process timeline events for a given elapsed time
 * Also applies effects from user actions
 * Returns services and metrics that should be at this point in time
 */
function processTimelineEvents(incident, elapsedTime, actionsTaken = []) {
  const services = JSON.parse(JSON.stringify(incident.initialServices || []));
  const metrics = JSON.parse(JSON.stringify(incident.initialMetrics || {}));
  let logs = [...(incident.initialLogs || [])];

  // Find all events that should have triggered by now
  const triggeredEvents = incident.timelineEvents.filter(
    (e) => e.timeSecond <= elapsedTime,
  );

  for (const event of triggeredEvents) {
    // Update affected services
    for (const serviceId of event.affectedServices || []) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        service.status = "degraded"; // Simple: mark as degraded if event affects it
      }
    }

    // Apply metric changes
    if (event.metricChanges && typeof event.metricChanges === "object") {
      for (const [metricName, value] of Object.entries(
        event.metricChanges,
      )) {
        if (!metrics[metricName]) {
          metrics[metricName] = [];
        }
        metrics[metricName].push({
          timestamp: event.timeSecond,
          value: value,
        });
      }
    }

    // Add log message
    if (event.logMessage) {
      const timeStr = String(event.timeSecond).padStart(2, "0");
      logs.push(`[${timeStr}:00] ${event.logMessage}`);
    }
  }

  // Apply action effects
  for (const action of actionsTaken) {
    const actionOption = incident.actionOptions?.find(
      (a) => a.id === action.actionId,
    );
    if (!actionOption) continue;

    // If enough time has passed since action, apply recovery
    if (elapsedTime >= action.timestamp + actionOption.recoveryTime) {
      // Reset affected metrics to initial values
      for (const metricName of actionOption.fixesMetrics || []) {
        if (incident.initialMetrics && incident.initialMetrics[metricName]) {
          const initialValue =
            incident.initialMetrics[metricName][0]?.value || 0;
          metrics[metricName] = [
            {
              timestamp: action.timestamp + actionOption.recoveryTime,
              value: initialValue,
            },
          ];
        }
      }
      logs.push(
        `[${Math.floor(action.timestamp / 60)}:00] ACTION: ${actionOption.title} - metrics recovering`,
      );
    }
  }

  // Convert metrics to current values (last value for each metric)
  const currentMetrics = {};
  for (const [metricName, snapshots] of Object.entries(metrics)) {
    currentMetrics[metricName] =
      snapshots[snapshots.length - 1]?.value || 0;
  }

  return { services, metrics: currentMetrics, logs };
}

/**
 * GET /api/v1/incidents
 * List all incident simulations
 */
const listIncidents = asyncHandler(async (req, res) => {
  const incidents = await prisma.incidentSimulation.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      estimatedTime: true,
      xpReward: true,
      tags: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const userId = req.user?.id;
  let userProgress = {};

  // Fetch user's incident progress if authenticated
  if (userId) {
    const sessions = await prisma.incidentSession.findMany({
      where: { userId },
      select: {
        incidentId: true,
        isCompleted: true,
      },
    });

    sessions.forEach((s) => {
      userProgress[s.incidentId] = {
        attempted: true,
        completed: s.isCompleted,
      };
    });
  }

  // Enrich incidents with user progress
  const enriched = incidents.map((incident) => ({
    ...incident,
    status: userProgress[incident.id] || {
      attempted: false,
      completed: false,
    },
  }));

  return res.status(200).json({
    message: "Incidents fetched successfully",
    data: enriched,
  });
});

/**
 * GET /api/v1/incidents/:id
 * Get a single incident simulation
 */
const getIncident = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Incident ID is required");
  }

  const incident = await prisma.incidentSimulation.findUnique({
    where: { id },
    include: {
      timelineEvents: {
        orderBy: { timeSecond: "asc" },
      },
    },
  });

  if (!incident) {
    throw new ApiError(404, "Incident simulation not found");
  }

  return res.status(200).json({
    message: "Incident fetched successfully",
    data: incident,
  });
});

/**
 * POST /api/v1/incidents/:id/session
 * Start a new incident session for the user
 */
const startIncidentSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User must be authenticated");
  }

  if (!id) {
    throw new ApiError(400, "Incident ID is required");
  }

  // Verify incident exists
  const incident = await prisma.incidentSimulation.findUnique({
    where: { id },
    include: {
      timelineEvents: true,
    },
  });

  if (!incident) {
    throw new ApiError(404, "Incident simulation not found");
  }

  // Check if user already has an active session
  const existingSession = await prisma.incidentSession.findUnique({
    where: {
      userId_incidentId: { userId, incidentId: id },
    },
  });

  if (existingSession && existingSession.isActive) {
    return res.status(200).json({
      message: "Existing session found",
      data: existingSession,
    });
  }

  // Create new session
  const session = await prisma.incidentSession.create({
    data: {
      userId,
      incidentId: id,
      elapsedTime: 0,
      isActive: true,
      isCompleted: false,
    },
  });

  // Create initial state for the session
  const initialState = await prisma.incidentSessionState.create({
    data: {
      sessionId: session.id,
      currentTime: 0,
      services: incident.initialServices || [],
      metrics: incident.initialMetrics || {},
      logs: incident.initialLogs || [],
      activeAlerts: [],
    },
  });

  return res.status(201).json({
    message: "Incident session started",
    data: {
      session,
      state: initialState,
    },
  });
});

/**
 * GET /api/v1/incidents/:id/session/:sessionId
 * Get current state of an incident session
 */
const getIncidentSessionState = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User must be authenticated");
  }

  // Verify ownership
  const session = await prisma.incidentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new ApiError(404, "Session not found");
  }

  if (session.userId !== userId) {
    throw new ApiError(403, "Unauthorized: not your session");
  }

  if (session.incidentId !== id) {
    throw new ApiError(400, "Session does not match incident");
  }

  const state = await prisma.incidentSessionState.findUnique({
    where: { sessionId },
  });

  if (!state) {
    throw new ApiError(404, "Session state not found");
  }

  return res.status(200).json({
    message: "Session state fetched",
    data: {
      session,
      state,
    },
  });
});

/**
 * POST /api/v1/incidents/:id/session/:sessionId/tick
 * Advance the simulation time by one second
 * Also processes any timeline events that should trigger
 */
const tickIncidentSimulation = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User must be authenticated");
  }

  // Verify session
  const session = await prisma.incidentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Get incident and its timeline
  const incident = await prisma.incidentSimulation.findUnique({
    where: { id },
    include: {
      timelineEvents: true,
    },
  });

  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  // Calculate new time
  const newTime = Math.min(
    session.elapsedTime + 1,
    incident.durationSeconds,
  );

  // Check if simulation should end
  const isComplete =
    newTime >= incident.durationSeconds || session.isCompleted;

  // Parse actions taken
  const actionsTaken = (session.actionsTaken || []).map((a) =>
    typeof a === "string" ? JSON.parse(a) : a,
  );

  // Process timeline up to new time with action effects
  const { services, metrics, logs } = processTimelineEvents(
    incident,
    newTime,
    actionsTaken,
  );

  // Update state
  const updatedState = await prisma.incidentSessionState.update({
    where: { sessionId },
    data: {
      currentTime: newTime,
      services,
      metrics,
      logs,
    },
  });

  // Update session time
  const updatedSession = await prisma.incidentSession.update({
    where: { id: sessionId },
    data: {
      elapsedTime: newTime,
      isActive: !isComplete,
      isCompleted: isComplete ? true : session.isCompleted,
    },
  });

  return res.status(200).json({
    message: "Simulation advanced",
    data: {
      session: updatedSession,
      state: updatedState,
      isComplete,
    },
  });
});

/**
 * POST /api/v1/incidents/:id/session/:sessionId/diagnose
 * User submits their root cause diagnosis
 */
const diagnoseIncident = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const { rootCauseId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User must be authenticated");
  }

  if (!rootCauseId) {
    throw new ApiError(400, "rootCauseId is required");
  }

  // Verify session
  const session = await prisma.incidentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Get incident to verify root cause
  const incident = await prisma.incidentSimulation.findUnique({
    where: { id },
  });

  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  // Find the root cause option
  const rootCauseOption = incident.rootCauseOptions?.find(
    (r) => r.id === rootCauseId,
  );

  if (!rootCauseOption) {
    throw new ApiError(400, "Invalid rootCauseId");
  }

  // Calculate diagnostic score
  const correctDiagnosis = rootCauseOption.isCorrect;
  const diagnosticScore = correctDiagnosis ? 100 : 0;

  // Update session with diagnosis
  const updatedSession = await prisma.incidentSession.update({
    where: { id: sessionId },
    data: {
      selectedRootCauseId: rootCauseId,
      diagnosedAt: new Date(),
      correctDiagnosis,
      diagnosticScore,
    },
  });

  return res.status(200).json({
    message: "Diagnosis submitted",
    data: {
      session: updatedSession,
      correct: correctDiagnosis,
      hint: !correctDiagnosis ? rootCauseOption.hint : null,
    },
  });
});

/**
 * POST /api/v1/incidents/:id/session/:sessionId/action
 * User takes an action to fix the incident
 */
const performIncidentAction = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const { actionId } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User must be authenticated");
  }

  if (!actionId) {
    throw new ApiError(400, "actionId is required");
  }

  // Verify session
  const session = await prisma.incidentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Get incident to verify action
  const incident = await prisma.incidentSimulation.findUnique({
    where: { id },
  });

  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  // Find the action option
  const actionOption = incident.actionOptions?.find((a) => a.id === actionId);

  if (!actionOption) {
    throw new ApiError(400, "Invalid actionId");
  }

  // Create action record
  const action = {
    actionId,
    timestamp: session.elapsedTime,
    effective: false, // Will be determined during tick
  };

  // Add to actionsTaken
  const updatedSession = await prisma.incidentSession.update({
    where: { id: sessionId },
    data: {
      actionsTaken: {
        push: action,
      },
    },
  });

  return res.status(200).json({
    message: "Action taken",
    data: {
      session: updatedSession,
      action,
    },
  });
});

/**
 * POST /api/v1/incidents/:id/session/:sessionId/complete
 * Mark session as completed and calculate final score
 */
const completeIncidentSession = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User must be authenticated");
  }

  // Verify session
  const session = await prisma.incidentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Get incident
  const incident = await prisma.incidentSimulation.findUnique({
    where: { id },
  });

  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  // Calculate final score
  const diagnosticScore = session.correctDiagnosis ? 100 : 0;

  // Count effective actions
  let actionScore = 0;
  const actionsTaken = (session.actionsTaken || []).map((a) =>
    typeof a === "string" ? JSON.parse(a) : a,
  );

  for (const action of actionsTaken) {
    const actionOption = incident.actionOptions?.find(
      (a) => a.id === action.actionId,
    );
    if (actionOption && session.correctDiagnosis) {
      // Only award action points if diagnosis was correct
      actionScore += actionOption.pointsIfCorrect;
    }
  }

  // Calculate time bonus (faster = more points)
  const maxTime = incident.durationSeconds;
  const elapsedTime = Math.min(session.elapsedTime, maxTime);
  const timeRatio = 1 - elapsedTime / maxTime;
  const timeBonusScore = Math.max(0, Math.floor(timeRatio * 100));

  const totalScore = diagnosticScore + actionScore + timeBonusScore;

  // Mark as completed
  const completedSession = await prisma.incidentSession.update({
    where: { id: sessionId },
    data: {
      isCompleted: true,
      isActive: false,
      diagnosticScore,
      actionScore,
      timeBonusScore,
      totalScore,
    },
  });

  // Award XP to user
  if (session.correctDiagnosis) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        xp: {
          increment: incident.xpReward,
        },
      },
    });
  }

  return res.status(200).json({
    message: "Session completed with score",
    data: {
      session: completedSession,
      scoreBreakdown: {
        diagnostic: diagnosticScore,
        actions: actionScore,
        timeBonus: timeBonusScore,
        total: totalScore,
      },
    },
  });
});

/**
 * POST /api/v1/incidents/:id/session/:sessionId/stop
 * Stop/deactivate an active session (e.g., when user closes tab)
 */
const stopIncidentSession = asyncHandler(async (req, res) => {
  const { id, sessionId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, "User must be authenticated");
  }

  // Verify session
  const session = await prisma.incidentSession.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Mark session as inactive
  const stoppedSession = await prisma.incidentSession.update({
    where: { id: sessionId },
    data: {
      isActive: false,
    },
  });

  return res.status(200).json({
    message: "Session stopped",
    data: {
      session: stoppedSession,
    },
  });
});

export {
  listIncidents,
  getIncident,
  startIncidentSession,
  getIncidentSessionState,
  tickIncidentSimulation,
  diagnoseIncident,
  performIncidentAction,
  completeIncidentSession,
  stopIncidentSession,
};
