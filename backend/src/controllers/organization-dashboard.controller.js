import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import {
  bankQuestionInclude,
  candidateAttemptInclude,
  serializeBankQuestion,
  serializeCandidateAttempt,
} from "../utils/prismaNormalizers.js";

// ─── helpers ────────────────────────────────────────────────────────────────

function durationSeconds(startedAt, submittedAt) {
  if (!submittedAt) return null;
  return Math.round((new Date(submittedAt) - new Date(startedAt)) / 1000);
}

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
  const { password, refreshToken, ...safe } = req.organization;
  return res.status(200).json({
    message: "Organization profile fetched.",
    data: safe,
  });
});

export const updateOrganizationProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "name",
    "website",
    "industry",
    "size",
    "location",
    "description",
    "contactName",
    "contactEmail",
  ];
  const updateFields = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateFields[field] = req.body[field];
    }
  }

  if (Object.keys(updateFields).length === 0) {
    return res.status(200).json({
      message: "No changes to save.",
      data: req.organization,
    });
  }

  const org = await prisma.organization.update({
    where: { id: req.organization.id },
    data: updateFields,
  });

  const { password, refreshToken, ...safe } = org;

  return res.status(200).json({
    message: "Organization profile updated.",
    data: safe,
  });
});

export const getOrganizationPrivacy = asyncHandler(async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.organization.id },
    select: {
      companyPagePublic: true,
      showContactEmail: true,
    },
  });

  return res.status(200).json({
    message: "Organization privacy settings fetched.",
    data: org,
  });
});

export const updateOrganizationPrivacy = asyncHandler(async (req, res) => {
  const allowedFields = ["companyPagePublic", "showContactEmail"];
  const updateFields = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateFields[field] = Boolean(req.body[field]);
    }
  }

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "No privacy settings to update.");
  }

  const org = await prisma.organization.update({
    where: { id: req.organization.id },
    data: updateFields,
    select: {
      companyPagePublic: true,
      showContactEmail: true,
    },
  });

  return res.status(200).json({
    message: "Organization privacy settings updated.",
    data: org,
  });
});

// ─── Candidate attempts list for one assessment ──────────────────────────────

export const getAssessmentAttempts = asyncHandler(async (req, res) => {
  const organizationId = req.organization.id;
  const { assessmentId } = req.params;

  const assessment = await prisma.assessment.findFirst({
    where: { id: assessmentId, organizationId },
    select: { id: true, title: true, passingScore: true, duration: true, status: true },
  });
  if (!assessment) return res.status(404).json({ message: "Assessment not found." });

  const attempts = await prisma.candidateAttempt.findMany({
    where: { assessmentId },
    include: {
      violations: { select: { id: true, severity: true, type: true } },
    },
    orderBy: { startedAt: "desc" },
  });

  const rows = attempts.map((a) => ({
    id: a.id,
    email: a.email,
    rollNumber: a.rollNumber ?? null,
    status: a.status,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt ?? null,
    totalScore: a.totalScore,
    maxScore: a.maxScore,
    suspicionLevel: a.suspicionLevel,
    violationCount: a.violations.length,
    highViolations: a.violations.filter((v) => v.severity === "high").length,
    passed:
      a.maxScore > 0
        ? (a.totalScore / a.maxScore) * 100 >= assessment.passingScore
        : false,
    durationSeconds: durationSeconds(a.startedAt, a.submittedAt),
  }));

  const submitted = rows.filter((r) =>
    ["submitted", "auto_submitted"].includes(r.status),
  );
  const avgScore =
    submitted.length > 0 && submitted[0].maxScore > 0
      ? Math.round(
          submitted.reduce(
            (acc, r) =>
              acc + (r.maxScore > 0 ? (r.totalScore / r.maxScore) * 100 : 0),
            0,
          ) / submitted.length,
        )
      : 0;

  return res.status(200).json({
    message: "Attempts fetched.",
    data: {
      assessment,
      attempts: rows,
      stats: {
        total: rows.length,
        submitted: submitted.length,
        inProgress: rows.filter((r) => r.status === "in_progress").length,
        passed: submitted.filter((r) => r.passed).length,
        failed: submitted.filter((r) => !r.passed).length,
        highRisk: rows.filter((r) => r.suspicionLevel === "high").length,
        averageScore: avgScore,
      },
    },
  });
});

// ─── Full detail for one candidate attempt ───────────────────────────────────

export const getAttemptDetail = asyncHandler(async (req, res) => {
  const organizationId = req.organization.id;
  const { attemptId } = req.params;

  const attempt = await prisma.candidateAttempt.findFirst({
    where: { id: attemptId },
    include: {
      ...candidateAttemptInclude,
      assessment: {
        select: {
          id: true,
          title: true,
          passingScore: true,
          duration: true,
          organizationId: true,
          settings: true,
        },
      },
      violations: { orderBy: { timestamp: "asc" } },
    },
  });

  if (!attempt) return res.status(404).json({ message: "Attempt not found." });
  if (attempt.assessment.organizationId !== organizationId)
    return res.status(403).json({ message: "Forbidden." });

  // Load assessment questions with bank question details (including correct answers)
  const aqRows = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: attempt.assessmentId },
    orderBy: { order: "asc" },
  });

  const bankIds = aqRows
    .filter((r) => r.questionType === "bank" && r.bankQuestionId)
    .map((r) => r.bankQuestionId);

  const bankQuestions =
    bankIds.length > 0
      ? await prisma.bankQuestion.findMany({
          where: { id: { in: bankIds } },
          include: bankQuestionInclude,
        })
      : [];
  const bqMap = Object.fromEntries(
    bankQuestions.map((b) => [b.id, serializeBankQuestion(b)]),
  );

  const questions = aqRows.map((aq) => {
    if (aq.questionType === "bank" && aq.bankQuestionId && bqMap[aq.bankQuestionId]) {
      const bq = bqMap[aq.bankQuestionId];
      return {
        aqId: aq.id,
        order: aq.order,
        points: aq.points,
        type: bq.type,
        title: bq.title,
        description: bq.description,
        difficulty: bq.difficulty,
        options: bq.options,
        correctAnswer: bq.correctAnswer,
        codeTemplate: bq.codeTemplate,
        testCases: bq.testCases,
        tags: bq.tags,
      };
    }
    return {
      aqId: aq.id,
      order: aq.order,
      points: aq.points,
      type: aq.questionType,
      simulationId: aq.simulationId ?? null,
    };
  });

  const serializedAttempt = serializeCandidateAttempt(attempt);

  return res.status(200).json({
    message: "Attempt detail fetched.",
    data: {
      attempt: {
        id: serializedAttempt.id,
        email: serializedAttempt.email,
        rollNumber: serializedAttempt.rollNumber ?? null,
        status: serializedAttempt.status,
        startedAt: serializedAttempt.startedAt,
        submittedAt: serializedAttempt.submittedAt ?? null,
        totalScore: serializedAttempt.totalScore,
        maxScore: serializedAttempt.maxScore,
        suspicionLevel: serializedAttempt.suspicionLevel,
        answers: serializedAttempt.answers ?? [],
        codeSubmissions: serializedAttempt.codeSubmissions ?? [],
        durationSeconds: durationSeconds(attempt.startedAt, attempt.submittedAt),
        passed:
          attempt.maxScore > 0
            ? (attempt.totalScore / attempt.maxScore) * 100 >=
              attempt.assessment.passingScore
            : false,
      },
      assessment: {
        id: attempt.assessment.id,
        title: attempt.assessment.title,
        passingScore: attempt.assessment.passingScore,
        duration: attempt.assessment.duration,
        settings: attempt.assessment.settings,
      },
      questions,
      violations: attempt.violations,
    },
  });
});
