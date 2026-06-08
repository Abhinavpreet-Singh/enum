import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

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
    recentUsers, recentOrganizations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.assessment.count(),
    prisma.candidateAttempt.count(),
    prisma.questionBank.count(),
    prisma.organization.count({ where: { approvalStatus: "pending" } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, username: true, email: true, createdAt: true } }),
    prisma.organization.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true, approvalStatus: true } }),
  ]);

  return res.status(200).json({
    message: "Stats fetched.",
    data: {
      totalUsers, totalOrganizations,
      totalAssessments, totalAttempts, totalQuestionBanks,
      pendingOrganizations,
      recentUsers, recentOrganizations,
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
      { fullName: { contains: search, mode: "insensitive" } },
    ];
  }
  if (role && role !== "all") where.accountRole = role;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, email: true, fullName: true,
        accountRole: true, isVerified: true, createdAt: true, updatedAt: true,
        bio: true, avatarUrl: true, githubId: true, googleId: true,
        _count: { select: { candidateAttempts: true, incidentSessions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return res.status(200).json({ message: "Users fetched.", data: users, total, page: parseInt(page), limit: parseInt(limit) });
});

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, username: true, email: true, fullName: true,
      accountRole: true, isVerified: true, createdAt: true, updatedAt: true,
      bio: true, avatarUrl: true, githubId: true, googleId: true,
      candidateAttempts: {
        orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, score: true, status: true, createdAt: true },
      },
      incidentSessions: {
        orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, totalScore: true, isCompleted: true, createdAt: true },
      },
      _count: { select: { candidateAttempts: true, incidentSessions: true } },
    },
  });
  if (!user) throw new ApiError(404, "User not found.");
  return res.status(200).json({ message: "User fetched.", data: user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
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
        contactName: true, contactEmail: true, logoUrl: true, createdAt: true, updatedAt: true,
        _count: { select: { assessments: true, questionBanks: true } },
      },
    }),
    prisma.organization.count({ where }),
  ]);

  return res.status(200).json({ message: "Organizations fetched.", data: organizations, total, page: parseInt(page), limit: parseInt(limit) });\n});

export const getOrganizationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, website: true, industry: true,
      size: true, location: true, description: true, approvalStatus: true,
      contactName: true, contactEmail: true, logoUrl: true, createdAt: true, updatedAt: true,
      assessments: {
        orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, title: true, status: true, testCode: true, createdAt: true, _count: { select: { attempts: true, invites: true } } },
      },
      questionBanks: {
        orderBy: { createdAt: "desc" }, take: 10,
        select: { id: true, name: true, category: true, _count: { select: { questions: true } } },
      },
      _count: { select: { assessments: true, questionBanks: true } },
    },
  });
  if (!organization) throw new ApiError(404, "Organization not found.");
  return res.status(200).json({ message: "Organization fetched.", data: organization });
});

export const updateOrganizationApproval = asyncHandler(async (req, res) => {
  const { id } = req.params;
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

export const deleteOrganization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organization = await prisma.organization.findUnique({ where: { id } });
  if (!organization) throw new ApiError(404, "Organization not found.");
  await prisma.organization.delete({ where: { id } });
  return res.status(200).json({ message: "Organization deleted." });
});
