import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import { summarizeEntitlements } from "../services/entitlement.service.js";

import { isValidId } from "../utils/isValidId.js";

// ── requireAdmin middleware ────────────────────────────────────────────────────
export const requireAdmin = asyncHandler(async (req, res, next) => {
  if (req.accountType !== "admin") throw new ApiError(403, "Admin access required.");
  next();
});

// ── Platform overview stats ───────────────────────────────────────────────────
export const getStats = asyncHandler(async (req, res) => {
  const [
    totalUsers, totalOrganizations,
    totalAssessments, totalAttempts, totalQuestionBanks,
    pendingOrganizations,
    totalSimulations, totalIncidents, totalDsaQuestions,
    totalLinuxQuestions, totalSystemDesign, totalIncidentSessions,
    activeMaintenancePages,
    recentUsers, recentOrganizations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.assessment.count(),
    prisma.candidateAttempt.count(),
    prisma.questionBank.count(),
    prisma.organization.count({ where: { approvalStatus: "pending" } }),
    prisma.simulation.count(),
    prisma.incidentSimulation.count(),
    prisma.question.count(),
    prisma.linuxQuestion.count(),
    prisma.systemDesignSimulation.count(),
    prisma.incidentSession.count(),
    prisma.maintenancePage.count({ where: { enabled: true } }),
    prisma.user.findMany({ orderBy: { id: "desc" }, take: 5, select: { id: true, username: true, email: true, displayName: true, role: true, avatar: true } }),
    prisma.organization.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true, approvalStatus: true } }),
  ]);

  const normalizedRecentUsers = recentUsers.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: null,
    accountRole: user.role || "user",
    avatar: user.avatar || "",
    displayName: user.displayName || user.username,
  }));

  return res.status(200).json({
    message: "Stats fetched.",
    data: {
      totalUsers, totalOrganizations,
      totalAssessments, totalAttempts, totalQuestionBanks,
      pendingOrganizations,
      totalSimulations, totalIncidents, totalDsaQuestions,
      totalLinuxQuestions, totalSystemDesign, totalIncidentSessions,
      activeMaintenancePages,
      recentUsers: normalizedRecentUsers,
      recentOrganizations: recentOrganizations.map((org) => ({
        ...org,
        approvalStatus: org.approvalStatus || "pending",
      })),
      // Backward-compatible keys still used by older frontend builds.
      totalCompanies: totalOrganizations,
      pendingCompanies: pendingOrganizations,
      recentCompanies: recentOrganizations.map((org) => ({
        ...org,
        approvalStatus: org.approvalStatus || "pending",
      })),
    },
  });
});

export const getAdminPrev = asyncHandler(async (req, res) => {
  return res.status(200).json({
    message: "Admin privilege fetched.",
    data: {
      email: req.adminEmail || req.user?.email || "",
    },
  });
});

// ── Users ─────────────────────────────────────────────────────────────────────
export const getAllUsers = asyncHandler(async (req, res) => {
  const { search, role, page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { displayName: { contains: search, mode: "insensitive" } },
      { role: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role && role !== "all") where.role = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { id: "desc" },
      select: {
        id: true, username: true, email: true, displayName: true,
        role: true, bio: true, avatar: true,
        entitlements: {
          where: { active: true },
          include: { product: true },
        },
        _count: { select: { candidateAttempts: true, incidentSessions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const normalizedUsers = users.map((user) => ({
    ...(() => {
      const access = summarizeEntitlements(user.entitlements || []);
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.displayName || "",
        accountRole: user.role || "user",
        isVerified: true,
        isPro: access.isPro,
        premiumTracks: access.tracks,
        createdAt: null,
        updatedAt: null,
        bio: user.bio || "",
        avatarUrl: user.avatar || "",
        githubId: null,
        googleId: null,
        _count: user._count,
      };
    })(),
  }));

  return res.status(200).json({ message: "Users fetched.", data: normalizedUsers, total, page: parseInt(page), limit: parseInt(limit) });
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !isValidId(id)) {
    throw new ApiError(400, "Valid user id is required.");
  }
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, email: true, displayName: true,
      role: true, bio: true, avatar: true,
      candidateAttempts: {
        orderBy: { startedAt: "desc" }, take: 10,
        select: { id: true, totalScore: true, status: true, startedAt: true },
      },
      incidentSessions: {
        orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, totalScore: true, isCompleted: true, createdAt: true },
      },
      entitlements: {
        where: { active: true },
        include: { product: true },
      },
      _count: { select: { candidateAttempts: true, incidentSessions: true } },
    },
  });
  if (!user) throw new ApiError(404, "User not found.");

  const access = summarizeEntitlements(user.entitlements || []);
  const normalizedUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.displayName || "",
    accountRole: user.role || "user",
    isVerified: true,
    isPro: access.isPro,
    premiumTracks: access.tracks,
    entitlements: access.entitlements.map((entry) => ({
      id: entry.id,
      scope: entry.scope,
      trackKey: entry.trackKey,
      source: entry.source,
      product: entry.product
        ? { id: entry.product.id, slug: entry.product.slug, title: entry.product.title }
        : null,
    })),
    createdAt: null,
    updatedAt: null,
    bio: user.bio || "",
    avatarUrl: user.avatar || "",
    githubId: null,
    googleId: null,
    candidateAttempts: user.candidateAttempts.map((attempt) => ({
      id: attempt.id,
      score: attempt.totalScore,
      status: attempt.status,
      createdAt: attempt.startedAt,
    })),
    incidentSessions: user.incidentSessions,
    _count: user._count,
  };

  return res.status(200).json({ message: "User fetched.", data: normalizedUser });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !isValidId(id)) {
    throw new ApiError(400, "Valid user id is required.");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, "User not found.");
  await prisma.user.delete({ where: { id } });
  return res.status(200).json({ message: "User deleted." });
});

// ── Organizations ─────────────────────────────────────────────────────────────────
export const getAllOrganizations = asyncHandler(async (req, res) => {
  const { search, status, page = "1", limit = "20" } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status && status !== "all") where.approvalStatus = status;

  const [organizations, total] = await Promise.all([
    prisma.organization.findMany({
      where, skip, take: parseInt(limit), orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, website: true, industry: true,
        size: true, location: true, description: true, approvalStatus: true,
        contactName: true, contactEmail: true, logo: true, createdAt: true, updatedAt: true,
        _count: { select: { assessments: true, questionBanks: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  const normalizedOrganizations = organizations.map((org) => ({
    ...org,
    logoUrl: org.logo || "",
    approvalStatus: org.approvalStatus || "pending",
  }));

  return res.status(200).json({ message: "Organizations fetched.", data: normalizedOrganizations, total, page: parseInt(page), limit: parseInt(limit) });
});

export const getOrganizationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !isValidId(id)) {
    throw new ApiError(400, "Valid organization id is required.");
  }
  const organization = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, website: true, industry: true,
      size: true, location: true, description: true, approvalStatus: true,
      contactName: true, contactEmail: true, logo: true, createdAt: true, updatedAt: true,
      assessments: {
        orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, title: true, status: true, testCode: true, createdAt: true, _count: { select: { attempts: true } } },
      },
      questionBanks: {
        orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, name: true, category: true, _count: { select: { questions: true } } },
      },
      _count: { select: { assessments: true, questionBanks: true } },
    },
  });
  if (!organization) throw new ApiError(404, "Organization not found.");

  return res.status(200).json({
    message: "Organization fetched.",
    data: {
      ...organization,
      logoUrl: organization.logo || "",
      approvalStatus: organization.approvalStatus || "pending",
    },
  });
});

export const updateOrganizationApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !isValidId(id)) {
    throw new ApiError(400, "Valid organization id is required.");
  }
  const { status } = req.body; // "approved" | "rejected" | "pending"
  if (!["approved", "rejected", "pending"].includes(status)) throw new ApiError(400, "Invalid status.");
  const organization = await prisma.organization.findUnique({ where: { id } });
  if (!organization) throw new ApiError(404, "Organization not found.");
  const updated = await prisma.organization.update({
    where: { id }, data: { approvalStatus: status },
    select: { id: true, name: true, approvalStatus: true },
  });
  return res.status(200).json({ message: `Organization ${status}.`, data: updated });
});

export const getContentStats = asyncHandler(async (req, res) => {
  const [
    simulations, incidents, dsaQuestions, linuxQuestions, systemDesign,
    publishedAssessments, draftAssessments, archivedAssessments,
    incidentSessions, simulationProgress, submissions, violations,
    recentSimulations, recentIncidents,
  ] = await Promise.all([
    prisma.simulation.count(),
    prisma.incidentSimulation.count(),
    prisma.question.count(),
    prisma.linuxQuestion.count(),
    prisma.systemDesignSimulation.count(),
    prisma.assessment.count({ where: { status: "published" } }),
    prisma.assessment.count({ where: { status: "draft" } }),
    prisma.assessment.count({ where: { status: "archived" } }),
    prisma.incidentSession.count(),
    prisma.userSimulationProgress.count(),
    prisma.submission.count(),
    prisma.violation.count(),
    prisma.simulation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, category: true, difficulty: true, updatedAt: true },
    }),
    prisma.incidentSimulation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, title: true, difficulty: true, category: true, updatedAt: true },
    }),
  ]);

  return res.status(200).json({
    message: "Content stats fetched.",
    data: {
      counts: {
        simulations,
        incidents,
        dsaQuestions,
        linuxQuestions,
        systemDesign,
        publishedAssessments,
        draftAssessments,
        archivedAssessments,
        incidentSessions,
        simulationProgress,
        submissions,
        violations,
      },
      recentSimulations,
      recentIncidents,
    },
  });
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const { page = "1", limit = "15" } = req.query;
  const take = Math.min(parseInt(limit) || 15, 50);
  const skip = (parseInt(page) - 1) * take;

  const [attempts, totalAttempts, incidentSessions, totalSessions] = await Promise.all([
    prisma.candidateAttempt.findMany({
      orderBy: { startedAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        email: true,
        status: true,
        totalScore: true,
        maxScore: true,
        startedAt: true,
        submittedAt: true,
        suspicionLevel: true,
        assessment: { select: { title: true, testCode: true } },
        user: { select: { username: true, displayName: true } },
      },
    }),
    prisma.candidateAttempt.count(),
    prisma.incidentSession.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        totalScore: true,
        isCompleted: true,
        isActive: true,
        createdAt: true,
        user: { select: { username: true, displayName: true, email: true } },
        incident: { select: { title: true, difficulty: true } },
      },
    }),
    prisma.incidentSession.count(),
  ]);

  return res.status(200).json({
    message: "Recent activity fetched.",
    data: {
      attempts: attempts.map((a) => ({
        id: a.id,
        type: "assessment",
        email: a.email,
        username: a.user?.displayName || a.user?.username || null,
        title: a.assessment?.title || "Unknown assessment",
        testCode: a.assessment?.testCode || "",
        status: a.status,
        score: a.totalScore,
        maxScore: a.maxScore,
        suspicionLevel: a.suspicionLevel,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
      })),
      incidentSessions: incidentSessions.map((s) => ({
        id: s.id,
        type: "incident",
        username: s.user?.displayName || s.user?.username || "Unknown",
        email: s.user?.email || "",
        title: s.incident?.title || "Unknown incident",
        difficulty: s.incident?.difficulty || "",
        totalScore: s.totalScore,
        isCompleted: s.isCompleted,
        isActive: s.isActive,
        createdAt: s.createdAt,
      })),
      totalAttempts,
      totalSessions,
      page: parseInt(page),
      limit: take,
    },
  });
});

export const deleteOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!id || !isValidId(id)) {
    throw new ApiError(400, "Valid organization id is required.");
  }
  const organization = await prisma.organization.findUnique({ where: { id } });
  if (!organization) throw new ApiError(404, "Organization not found.");
  await prisma.organization.delete({ where: { id } });
  return res.status(200).json({ message: "Organization deleted." });
});
