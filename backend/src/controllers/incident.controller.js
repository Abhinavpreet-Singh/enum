import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  tryAwardXp,
  AWARD_TYPES,
  buildAwardKey,
  isIncidentFullSuccess,
  normalizeResourceId,
  getIncidentAwardKeys,
} from "../services/xpService.js";
import {
  logUserActivity,
  outcomeFromIncident,
} from "../services/activityLogService.js";
import {
  incidentInclude,
  incidentSessionInclude,
  incidentSessionStateInclude,
  replaceSessionActions,
  replaceSessionStateServices,
  serializeIncident,
  serializeIncidentSession,
  serializeIncidentSessionState,
} from "../utils/prismaNormalizers.js";

async function loadIncidentRecord(id, { withTimeline = false } = {}) {
  return prisma.incidentSimulation.findUnique({
    where: { id },
    include: {
      ...incidentInclude,
      ...(withTimeline
        ? { timelineEvents: { orderBy: { timeSecond: "asc" } } }
        : {}),
    },
  });
}

async function loadSerializedIncident(id, { withTimeline = false } = {}) {
  const incident = await loadIncidentRecord(id, { withTimeline });
  if (!incident) return null;
  const serialized = serializeIncident(incident);
  if (withTimeline) {
    return { ...serialized, timelineEvents: incident.timelineEvents };
  }
  return serialized;
}

async function createInitialSessionState(sessionId, incident) {
  const serialized = serializeIncident(incident);
  const state = await prisma.incidentSessionState.create({
    data: {
      sessionId,
      currentTime: 0,
      metrics: serialized.initialMetrics,
      logs: serialized.initialLogs || [],
      activeAlerts: [],
      services: {
        create: (serialized.initialServices || []).map((service, index) => ({
          sortOrder: index,
          serviceKey: service.id,
          name: service.name || "",
          status: service.status || "healthy",
          color: service.color || "green",
        })),
      },
    },
    include: incidentSessionStateInclude,
  });
  return serializeIncidentSessionState(state);
}

async function resetSessionState(sessionId, incident) {
  const serialized = serializeIncident(incident);
  const state = await prisma.incidentSessionState.upsert({
    where: { sessionId },
    create: {
      sessionId,
      currentTime: 0,
      metrics: serialized.initialMetrics,
      logs: serialized.initialLogs || [],
      activeAlerts: [],
      services: {
        create: (serialized.initialServices || []).map((service, index) => ({
          sortOrder: index,
          serviceKey: service.id,
          name: service.name || "",
          status: service.status || "healthy",
          color: service.color || "green",
        })),
      },
    },
    update: {
      currentTime: 0,
      metrics: serialized.initialMetrics,
      logs: serialized.initialLogs || [],
      activeAlerts: [],
    },
    include: incidentSessionStateInclude,
  });

  await replaceSessionStateServices(
    prisma,
    state.id,
    serialized.initialServices || [],
  );

  const refreshed = await prisma.incidentSessionState.findUnique({
    where: { id: state.id },
    include: incidentSessionStateInclude,
  });
  return serializeIncidentSessionState(refreshed);
}

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

  // Normalize legacy scalar metrics and append a point at the current tick
  for (const [metricName, snapshots] of Object.entries(metrics)) {
    let series = snapshots;
    if (!Array.isArray(series)) {
      series = [{ timestamp: 0, value: typeof series === "number" ? series : 0 }];
      metrics[metricName] = series;
    }
    const last = series[series.length - 1];
    if (!last || last.timestamp < elapsedTime) {
      series.push({
        timestamp: elapsedTime,
        value: last?.value ?? series[0]?.value ?? 0,
      });
    }
  }

  return { services, metrics, logs };
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
    const [sessions, xpAwardedIds] = await Promise.all([
      prisma.incidentSession.findMany({
        where: { userId },
        select: {
          incidentId: true,
          isCompleted: true,
          xpAwarded: true,
          attempts: true,
        },
      }),
      getIncidentAwardKeys(prisma, userId),
    ]);
    const activityByIncident = await prisma.userActivityLog.groupBy({
      by: ["resourceId"],
      where: { userId, activityType: "incident" },
      _count: { id: true },
    });
    const attemptFromLogs = Object.fromEntries(
      activityByIncident.map((row) => [
        normalizeResourceId(row.resourceId),
        row._count.id,
      ]),
    );

    sessions.forEach((s) => {
      const incId = normalizeResourceId(s.incidentId);
      userProgress[incId] = {
        attempted: true,
        completed: s.isCompleted,
        solved: xpAwardedIds.has(incId) || Boolean(s.xpAwarded),
        attempts: Math.max(s.attempts ?? 0, attemptFromLogs[incId] ?? 0),
      };
    });

    for (const [incId, count] of Object.entries(attemptFromLogs)) {
      if (!userProgress[incId]) {
        userProgress[incId] = {
          attempted: true,
          completed: false,
          solved: xpAwardedIds.has(incId),
          attempts: count,
        };
      }
    }
  }

  // Enrich incidents with user progress
  const enriched = incidents.map((incident) => ({
    ...incident,
    status: userProgress[normalizeResourceId(incident.id)] || {
      attempted: false,
      completed: false,
      solved: false,
      attempts: 0,
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

  const incident = await loadIncidentRecord(id, { withTimeline: true });

  if (!incident) {
    throw new ApiError(404, "Incident simulation not found");
  }

  return res.status(200).json({
    message: "Incident fetched successfully",
    data: {
      ...serializeIncident(incident),
      timelineEvents: incident.timelineEvents,
    },
  });
});

/**
 * POST /api/v1/incidents/:id/session
 * Start a new incident session for the user
 */
const startIncidentSession = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const restart = req.body?.restart === true;

  if (!userId) {
    throw new ApiError(401, "User must be authenticated");
  }

  if (!id) {
    throw new ApiError(400, "Incident ID is required");
  }

  const incident = await loadIncidentRecord(id, { withTimeline: true });

  if (!incident) {
    throw new ApiError(404, "Incident simulation not found");
  }

  const existingSession = await prisma.incidentSession.findFirst({
    where: { userId, incidentId: id },
    orderBy: { updatedAt: "desc" },
    include: incidentSessionInclude,
  });

  const loadState = async (sessionId) => {
    const state = await prisma.incidentSessionState.findUnique({
      where: { sessionId },
      include: incidentSessionStateInclude,
    });
    return state ? serializeIncidentSessionState(state) : null;
  };

  // Resume in-progress or review last completed run — no reset unless restart=true
  if (existingSession && !restart) {
    const state =
      (await loadState(existingSession.id)) ??
      (await createInitialSessionState(existingSession.id, incident));

    return res.status(200).json({
      message: existingSession.isCompleted
        ? "Existing completed session"
        : "Existing session resumed",
      data: {
        session: serializeIncidentSession(existingSession),
        state,
      },
    });
  }

  if (existingSession && restart) {
    const session = await prisma.$transaction(async (tx) => {
      await replaceSessionActions(tx, existingSession.id, []);
      return tx.incidentSession.update({
        where: { id: existingSession.id },
        data: {
          elapsedTime: 0,
          isActive: true,
          isCompleted: false,
          selectedRootCauseId: "",
          diagnosedAt: null,
          correctDiagnosis: false,
          diagnosticScore: 0,
          actionScore: 0,
          timeBonusScore: 0,
          totalScore: 0,
        },
        include: incidentSessionInclude,
      });
    });

    const state = await resetSessionState(existingSession.id, incident);

    return res.status(200).json({
      message: "Incident session reset for new attempt",
      data: {
        session: serializeIncidentSession(session),
        state,
        restarted: true,
      },
    });
  }

  const session = await prisma.incidentSession.create({
    data: {
      userId,
      incidentId: id,
      elapsedTime: 0,
      isActive: true,
      isCompleted: false,
    },
    include: incidentSessionInclude,
  });

  const initialState = await createInitialSessionState(session.id, incident);

  return res.status(201).json({
    message: "Incident session started",
    data: {
      session: serializeIncidentSession(session),
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
    include: incidentSessionInclude,
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
    include: incidentSessionStateInclude,
  });

  if (!state) {
    throw new ApiError(404, "Session state not found");
  }

  return res.status(200).json({
    message: "Session state fetched",
    data: {
      session: serializeIncidentSession(session),
      state: serializeIncidentSessionState(state),
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
    include: incidentSessionInclude,
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Get incident and its timeline
  const incident = await loadSerializedIncident(id, { withTimeline: true });

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

  const actionsTaken = serializeIncidentSession(session).actionsTaken;

  // Process timeline up to new time with action effects
  const { services, metrics, logs } = processTimelineEvents(
    incident,
    newTime,
    actionsTaken,
  );

  const updatedSession = await prisma.$transaction(async (tx) => {
    const existingState = await tx.incidentSessionState.findUnique({
      where: { sessionId },
    });

    if (!existingState) {
      throw new ApiError(404, "Session state not found");
    }

    await tx.incidentSessionState.update({
      where: { sessionId },
      data: {
        currentTime: newTime,
        metrics,
        logs,
      },
    });

    await replaceSessionStateServices(tx, existingState.id, services);

    return tx.incidentSession.update({
      where: { id: sessionId },
      data: {
        elapsedTime: newTime,
        isActive: !isComplete,
        isCompleted: isComplete ? true : session.isCompleted,
      },
      include: incidentSessionInclude,
    });
  });

  const updatedState = await prisma.incidentSessionState.findUnique({
    where: { sessionId },
    include: incidentSessionStateInclude,
  });

  return res.status(200).json({
    message: "Simulation advanced",
    data: {
      session: serializeIncidentSession(updatedSession),
      state: serializeIncidentSessionState(updatedState),
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
    include: incidentSessionInclude,
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Get incident to verify root cause
  const incident = await loadSerializedIncident(id);

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
    include: incidentSessionInclude,
  });

  return res.status(200).json({
    message: "Diagnosis submitted",
    data: {
      session: serializeIncidentSession(updatedSession),
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
    include: incidentSessionInclude,
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Get incident to verify action
  const incident = await loadSerializedIncident(id);

  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  // Find the action option
  const actionOption = incident.actionOptions?.find((a) => a.id === actionId);

  if (!actionOption) {
    throw new ApiError(400, "Invalid actionId");
  }

  const priorActions = serializeIncidentSession(session).actionsTaken;
  if (priorActions.length >= 1) {
    throw new ApiError(
      400,
      "Only one remediation action allowed per run. Submit your report when ready.",
    );
  }

  const action = {
    actionId,
    timestamp: session.elapsedTime,
    effective: false,
  };

  await prisma.incidentSessionAction.create({
    data: {
      sessionId,
      actionKey: actionId,
      timestamp: session.elapsedTime,
      effective: false,
    },
  });

  const updatedSession = await prisma.incidentSession.findUnique({
    where: { id: sessionId },
    include: incidentSessionInclude,
  });

  return res.status(200).json({
    message: "Action taken",
    data: {
      session: serializeIncidentSession(updatedSession),
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
    include: incidentSessionInclude,
  });

  if (!session || session.userId !== userId || session.incidentId !== id) {
    throw new ApiError(403, "Unauthorized");
  }

  // Get incident
  const incident = await loadIncidentRecord(id);

  if (!incident) {
    throw new ApiError(404, "Incident not found");
  }

  const serializedIncident = serializeIncident(incident);

  // Calculate final score
  const diagnosticScore = session.correctDiagnosis ? 100 : 0;

  let actionScore = 0;
  const actionsTaken = serializeIncidentSession(session).actionsTaken;

  if (session.correctDiagnosis && actionsTaken.length > 0) {
    for (const action of actionsTaken) {
      const actionOption = serializedIncident.actionOptions?.find(
        (a) => a.id === action.actionId,
      );
      if (actionOption) {
        actionScore = Math.max(actionScore, actionOption.pointsIfCorrect || 0);
      }
    }
  }

  // Calculate time bonus (faster = more points)
  const maxTime = incident.durationSeconds;
  const elapsedTime = Math.min(session.elapsedTime, maxTime);
  const timeRatio = 1 - elapsedTime / maxTime;
  const timeBonusScore = Math.max(0, Math.floor(timeRatio * 100));

  const totalScore = diagnosticScore + actionScore + timeBonusScore;
  const incidentAwardKey = buildAwardKey(AWARD_TYPES.incident, id);

  const { completedSession, xpEarned, xpAlreadyAwarded, totalXp } =
    await prisma.$transaction(async (tx) => {
      const freshSession = await tx.incidentSession.findUnique({
        where: { id: sessionId },
      });

      if (!freshSession) {
        throw new ApiError(404, "Session not found");
      }

      const fullSuccess = isIncidentFullSuccess(freshSession, actionsTaken);
      const outcome = outcomeFromIncident(freshSession, actionsTaken);

      const xpResult = await tryAwardXp(tx, {
        userId,
        awardKey: incidentAwardKey,
        amount: incident.xpReward,
        fullSuccess,
      });

      const updated = await tx.incidentSession.update({
        where: { id: sessionId },
        data: {
          isCompleted: true,
          isActive: false,
          diagnosticScore,
          actionScore,
          timeBonusScore,
          totalScore,
          attempts: { increment: 1 },
          xpAwarded: xpResult.awarded || xpResult.alreadyClaimed,
        },
        include: incidentSessionInclude,
      });

      await logUserActivity(tx, {
        userId,
        activityType: "incident",
        resourceId: id,
        resourceTitle: incident.title,
        outcome,
        xpEarned: xpResult.xpEarned,
        score: totalScore,
        maxScore: 200,
        detail: fullSuccess
          ? "Correct diagnosis and remediation"
          : outcome === "partial"
            ? "Partial — need correct root cause and one action"
            : "Incorrect report",
      });

      return {
        completedSession: updated,
        xpEarned: xpResult.xpEarned,
        xpAlreadyAwarded: xpResult.alreadyClaimed,
        totalXp: xpResult.totalXp,
      };
    });

  return res.status(200).json({
    message: "Session completed with score",
    data: {
      session: serializeIncidentSession(completedSession),
      xpEarned,
      xpAlreadyAwarded,
      totalXp,
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
    include: incidentSessionInclude,
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
    include: incidentSessionInclude,
  });

  return res.status(200).json({
    message: "Session stopped",
    data: {
      session: serializeIncidentSession(stoppedSession),
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
