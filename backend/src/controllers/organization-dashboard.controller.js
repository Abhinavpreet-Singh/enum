import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";

export const getDashboardMetrics = asyncHandler(async (req, res) => {
  const organizationId = req.organization.id;

  const [
    totalAssessments,
    activeAssessments,
    draftAssessments,
    archivedAssessments,
    totalQuestionBanks,
    allAttempts,
    completedAttempts,
    suspiciousAttempts,
  ] = await Promise.all([
    prisma.assessment.count({ where: { organizationId } }),
    prisma.assessment.count({ where: { organizationId, status: "published" } }),
    prisma.assessment.count({ where: { organizationId, status: "draft" } }),
    prisma.assessment.count({ where: { organizationId, status: "archived" } }),
    prisma.questionBank.count({ where: { organizationId } }),
    prisma.candidateAttempt.count({
      where: { assessment: { organizationId } },
    }),
    prisma.candidateAttempt.count({
      where: { assessment: { organizationId }, status: { in: ["submitted", "auto_submitted"] } },
    }),
    prisma.candidateAttempt.count({
      where: { assessment: { organizationId }, suspicionLevel: { in: ["medium", "high"] } },
    }),
  ]);

  // Invites count
  const candidatesInvited = await prisma.assessmentInvite.count({
    where: { assessment: { organizationId } },
  });

  // Average score
  const scoreAgg = await prisma.candidateAttempt.aggregate({
    where: { assessment: { organizationId }, status: { in: ["submitted", "auto_submitted"] } },
    _avg: { totalScore: true },
  });

  return res.status(200).json({
    message: "Dashboard metrics fetched.",
    data: {
      totalAssessments,
      activeAssessments,
      draftAssessments,
      archivedAssessments,
      candidatesInvited,
      candidatesCompleted: completedAttempts,
      averageScore: Math.round(scoreAgg._avg?.totalScore || 0),
      suspiciousAttempts,
      totalQuestionBanks,
      totalCertificatesIssued: 0,
    },
  });
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const organizationId = req.organization.id;

  const [recentTests, recentAttempts, recentViolations] = await Promise.all([
    prisma.assessment.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, title: true, status: true, createdAt: true, testCode: true },
    }),
    prisma.candidateAttempt.findMany({
      where: { assessment: { organizationId } },
      orderBy: { startedAt: "desc" },
      take: 10,
      select: {
        id: true, email: true, status: true, totalScore: true, startedAt: true, suspicionLevel: true,
        assessment: { select: { title: true } },
      },
    }),
    prisma.violation.findMany({
      where: { attempt: { assessment: { organizationId } } },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: {
        id: true, type: true, severity: true, timestamp: true, description: true,
        attempt: { select: { email: true, assessment: { select: { title: true } } } },
      },
    }),
  ]);

  return res.status(200).json({
    message: "Recent activity fetched.",
    data: { recentTests, recentAttempts, recentViolations },
  });
});

export const getOrganizationProfile = asyncHandler(async (req, res) => {
  return res.status(200).json({
    message: "Organization profile fetched.",
    data: req.organization,
  });
});
