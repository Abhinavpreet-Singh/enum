import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

import { isValidId } from "../utils/isValidId.js";

// ── Audit log helper ──────────────────────────────────────────────────────────
export const audit = async (action, { targetType = "", targetId = "", targetName = "", detail = "", adminEmail = "" } = {}) => {
  try {
    await prisma.auditLog.create({ data: { action, targetType, targetId, targetName, detail, adminEmail } });
  } catch { /* non-blocking */ }
};

// ── Violations / Proctoring ───────────────────────────────────────────────────
export const getViolations = asyncHandler(async (req, res) => {
  const { search, severity, type, page = "1", limit = "20" } = req.query;
  const take = Math.min(parseInt(limit) || 20, 50);
  const skip = (parseInt(page) - 1) * take;

  const where = {};
  if (severity && severity !== "all") where.severity = severity;
  if (type && type !== "all") where.type = type;

  const [violations, total, bySeverity, byType] = await Promise.all([
    prisma.violation.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip,
      take,
      select: {
        id: true, type: true, severity: true, description: true, timestamp: true,
        attempt: {
          select: {
            id: true, email: true, suspicionLevel: true, status: true,
            assessment: { select: { title: true, testCode: true } },
            user: { select: { username: true, displayName: true } },
          },
        },
      },
    }),
    prisma.violation.count({ where }),
    prisma.violation.groupBy({ by: ["severity"], _count: { _all: true } }),
    prisma.violation.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);

  return res.status(200).json({
    message: "Violations fetched.",
    data: {
      violations: violations.map((v) => ({
        id: v.id,
        type: v.type,
        severity: v.severity,
        description: v.description,
        timestamp: v.timestamp,
        attemptId: v.attempt?.id,
        candidateEmail: v.attempt?.email,
        candidateName: v.attempt?.user?.displayName || v.attempt?.user?.username || null,
        assessmentTitle: v.attempt?.assessment?.title || "Unknown",
        testCode: v.attempt?.assessment?.testCode || "",
        suspicionLevel: v.attempt?.suspicionLevel || "low",
        attemptStatus: v.attempt?.status || "",
      })),
      total,
      page: parseInt(page),
      limit: take,
      bySeverity: Object.fromEntries(bySeverity.map((b) => [b.severity, b._count._all])),
      byType: Object.fromEntries(byType.map((b) => [b.type, b._count._all])),
    },
  });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getAnalytics = asyncHandler(async (req, res) => {
  const { range = "30" } = req.query;
  const days = Math.min(parseInt(range) || 30, 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    recentActivity,
    totalUsers, totalOrgs, totalAttempts, totalSessions,
    submissionCount, violationCount,
  ] = await Promise.all([
    prisma.userActivityLog.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
      select: { activityType: true, createdAt: true, outcome: true, xpEarned: true },
    }),
    prisma.user.count(),
    prisma.organization.count(),
    prisma.candidateAttempt.count({ where: { startedAt: { gte: since } } }),
    prisma.incidentSession.count({ where: { createdAt: { gte: since } } }),
    prisma.submission.count({ where: { createdAt: { gte: since } } }),
    prisma.violation.count({ where: { timestamp: { gte: since } } }),
  ]);

  // Group activity by day
  const byDay = {};
  for (const log of recentActivity) {
    const day = log.createdAt.toISOString().split("T")[0];
    if (!byDay[day]) byDay[day] = { dsa: 0, simulation: 0, incident: 0, system_design: 0, browser: 0, total: 0 };
    byDay[day][log.activityType] = (byDay[day][log.activityType] || 0) + 1;
    byDay[day].total += 1;
  }

  // Fill missing days
  const dailyData = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().split("T")[0];
    dailyData.push({ date: key, ...(byDay[key] || { dsa: 0, simulation: 0, incident: 0, system_design: 0, browser: 0, total: 0 }) });
  }

  // Engagement: activities by type
  const byType = {};
  for (const log of recentActivity) {
    byType[log.activityType] = (byType[log.activityType] || 0) + 1;
  }

  const totalXp = recentActivity.reduce((sum, l) => sum + l.xpEarned, 0);
  const successRate = recentActivity.length > 0
    ? Math.round((recentActivity.filter((l) => l.outcome === "correct").length / recentActivity.length) * 100)
    : 0;

  return res.status(200).json({
    message: "Analytics fetched.",
    data: {
      summary: {
        totalUsers, totalOrgs, totalAttempts, totalSessions,
        submissionCount, violationCount, totalXp, successRate,
        activityCount: recentActivity.length,
      },
      dailyData,
      byType,
    },
  });
});

// ── User advanced operations ──────────────────────────────────────────────────
export const getUserActivity = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, "Valid user id required.");

  const [logs, xpAwards] = await Promise.all([
    prisma.userActivityLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.userXpAward.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  return res.status(200).json({ message: "User activity fetched.", data: { logs, xpAwards } });
});

export const suspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, "Valid user id required.");
  const { suspended, reason = "" } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found.");

  // We store suspension as a special role prefix — no schema change needed.
  const newRole = suspended
    ? `__suspended__${user.role || "Student"}__${reason}`
    : (user.role || "Student").replace(/^__suspended__[^_]*__(?:[^_]|_(?!_))*__/, "").replace(/^__suspended__[^__]*__/, "");

  await prisma.user.update({ where: { id }, data: { role: newRole } });

  await audit(suspended ? "user.suspend" : "user.unsuspend", {
    targetType: "user", targetId: id, targetName: user.username,
    detail: reason, adminEmail: req.adminEmail || "",
  });

  return res.status(200).json({ message: suspended ? "User suspended." : "User unsuspended." });
});

// ── Settings ──────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = [
  { key: "signup_enabled", value: "true", label: "Allow new student signups", group: "features" },
  { key: "org_self_register", value: "true", label: "Allow org self-registration", group: "features" },
  { key: "leaderboard_public", value: "true", label: "Public leaderboard visible", group: "features" },
  { key: "collab_enabled", value: "true", label: "Collaboration rooms enabled", group: "features" },
  { key: "incidents_enabled", value: "true", label: "Incident simulations enabled", group: "features" },
  { key: "dsa_arena_enabled", value: "true", label: "DSA Arena enabled", group: "features" },
  { key: "max_attempts_per_assessment", value: "5", label: "Max attempts per assessment", group: "limits" },
  { key: "max_test_duration_minutes", value: "180", label: "Max test duration (minutes)", group: "limits" },
  { key: "platform_name", value: "Enum", label: "Platform display name", group: "general" },
  { key: "support_email", value: "support@enum.live", label: "Support email address", group: "general" },
];

export const getSettings = asyncHandler(async (req, res) => {
  const stored = await prisma.platformSetting.findMany();
  const storedMap = Object.fromEntries(stored.map((s) => [s.key, s]));

  const settings = DEFAULT_SETTINGS.map((def) => ({
    key: def.key,
    value: storedMap[def.key]?.value ?? def.value,
    label: def.label,
    group: def.group,
  }));

  return res.status(200).json({ message: "Settings fetched.", data: settings });
});

export const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (!key || value === undefined) throw new ApiError(400, "Key and value required.");

  const setting = await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: String(value), label: key, group: "general" },
    update: { value: String(value) },
  });

  await audit("setting.update", {
    targetType: "setting", targetId: key, targetName: key,
    detail: `Set to: ${value}`, adminEmail: req.adminEmail || "",
  });

  return res.status(200).json({ message: "Setting updated.", data: setting });
});

// ── Announcements ─────────────────────────────────────────────────────────────
export const getAnnouncements = asyncHandler(async (req, res) => {
  const announcements = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
  });
  return res.status(200).json({ message: "Announcements fetched.", data: announcements });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const { title, body, type = "info", audience = "all" } = req.body;
  if (!title || !body) throw new ApiError(400, "Title and body required.");
  if (!["info", "warning", "critical"].includes(type)) throw new ApiError(400, "Invalid type.");
  if (!["all", "students", "organizations"].includes(audience)) throw new ApiError(400, "Invalid audience.");

  const announcement = await prisma.announcement.create({
    data: { title, body, type, audience, active: true },
  });

  await audit("announcement.create", {
    targetType: "announcement", targetId: announcement.id, targetName: title,
    adminEmail: req.adminEmail || "",
  });

  return res.status(201).json({ message: "Announcement created.", data: announcement });
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, "Valid id required.");
  const { title, body, type, audience, active } = req.body;

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Announcement not found.");

  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(body !== undefined && { body }),
      ...(type !== undefined && { type }),
      ...(audience !== undefined && { audience }),
      ...(active !== undefined && { active }),
    },
  });

  return res.status(200).json({ message: "Announcement updated.", data: updated });
});

export const deleteAnnouncement = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, "Valid id required.");

  await prisma.announcement.delete({ where: { id } });

  await audit("announcement.delete", {
    targetType: "announcement", targetId: id, adminEmail: req.adminEmail || "",
  });

  return res.status(200).json({ message: "Announcement deleted." });
});

// ── Audit log ─────────────────────────────────────────────────────────────────
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page = "1", limit = "20", action, targetType } = req.query;
  const take = Math.min(parseInt(limit) || 20, 50);
  const skip = (parseInt(page) - 1) * take;

  const where = {};
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (targetType && targetType !== "all") where.targetType = targetType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where, orderBy: { createdAt: "desc" }, skip, take,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.status(200).json({ message: "Audit logs fetched.", data: logs, total, page: parseInt(page), limit: take });
});
