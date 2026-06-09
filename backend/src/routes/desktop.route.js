import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { verifyExamJWT } from "../middlewares/examAuth.middleware.js";
import prisma from "../db/index.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getAuthCookieOptions } from "../utils/cookieOptions.js";
import { assertAssessmentAccessible } from "../utils/assessmentAccess.js";
import { hydrateAssessmentQuestions } from "../utils/hydrateAssessmentQuestions.js";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const signToken = (payload, secret, expiry) =>
  jwt.sign(payload, secret, { expiresIn: expiry });

// ─── Public: Validate assessment by test code or link ────────────────────────
// GET /api/v1/desktop/assessment/:testCode
router.get(
  "/assessment/:testCode",
  asyncHandler(async (req, res) => {
    const { testCode } = req.params;
    const code = testCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, "") || testCode.trim();

    // Accept both the raw 8-char hex code and extract from a URL like
    // https://enum.live/test/abc123
    const normalised = testCode.trim().split("/").pop();

    const assessment = await prisma.assessment.findUnique({
      where: { testCode: normalised },
      include: {
        settings: true,
        organization: { select: { name: true, logo: true } },
        _count: { select: { questions: true } },
      },
    });

    assertAssessmentAccessible(assessment);

    // Return safe public info (no correct answers)
    return res.status(200).json({
      message: "Assessment found.",
      data: {
        id: assessment.id,
        title: assessment.title,
        description: assessment.description,
        duration: assessment.duration,
        maxAttempts: assessment.maxAttempts,
        passingScore: assessment.passingScore,
        totalQuestions: assessment._count.questions,
        accessType: assessment.accessType,
        requireDesktopApp: assessment.settings?.requireDesktopApp ?? false,
        organization: assessment.organization,
        settings: assessment.settings,
      },
    });
  }),
);

// ─── Public: Candidate login for desktop exam ─────────────────────────────────
// POST /api/v1/desktop/login
// Body: { email, rollNumber, password, testCode }
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, rollNumber, password, testCode } = req.body;

    if (!testCode?.trim()) throw new ApiError(400, "Test code is required.");
    if (!password?.trim()) throw new ApiError(400, "Password is required.");
    if (!email?.trim() && !rollNumber?.trim())
      throw new ApiError(400, "Email or roll number is required.");

    // 1) Validate assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { testCode: testCode.trim() },
      include: { settings: true },
    });
    if (!assessment) throw new ApiError(404, "Invalid test code.");
    assertAssessmentAccessible(assessment);

    // 2) Find user by email or match invite by rollNumber
    let user = null;
    if (email) {
      user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    }
    if (!user && rollNumber) {
      // Check invite list first
      const invite = await prisma.assessmentInvite.findFirst({
        where: { assessmentId: assessment.id, rollNumber },
      });
      if (invite && invite.email) {
        user = await prisma.user.findUnique({ where: { email: invite.email } });
      }
    }
    if (!user) throw new ApiError(404, "No candidate account found.");
    if (!user.password) throw new ApiError(401, "Please set a password for your account.");

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new ApiError(401, "Invalid password.");

    // 3) Check attempt limits
    const existingAttempts = await prisma.candidateAttempt.count({
      where: {
        assessmentId: assessment.id,
        userId: user.id,
        status: { in: ["submitted", "auto_submitted"] },
      },
    });
    if (existingAttempts >= assessment.maxAttempts)
      throw new ApiError(403, "You have exceeded the maximum number of attempts.");

    // 4) Issue a short-lived JWT scoped to this exam
    const payload = {
      _id: user.id,
      email: user.email,
      username: user.username,
      examSession: true,
      assessmentId: assessment.id,
    };
    const access = signToken(payload, process.env.ACCESS_TOKEN_SECRET, "8h");
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken: access },
    });

    const hydratedQuestions = await hydrateAssessmentQuestions(assessment.id);

    const options = getAuthCookieOptions();
    return res
      .status(200)
      .cookie("examToken", access, { ...options, maxAge: 8 * 60 * 60 * 1000 })
      .json({
        message: "Authenticated for exam.",
        accessToken: access,
        data: {
          candidate: {
            id: user.id,
            email: user.email,
            displayName: user.displayName || user.username,
          },
          assessment: {
            id: assessment.id,
            title: assessment.title,
            description: assessment.description,
            duration: assessment.duration,
            passingScore: assessment.passingScore,
            settings: assessment.settings,
          },
          questions: hydratedQuestions,
        },
      });
  }),
);

// ─── Authenticated routes below ───────────────────────────────────────────────

// GET /api/v1/desktop/questions — refresh questions for active exam session
router.get(
  "/questions",
  verifyExamJWT,
  asyncHandler(async (req, res) => {
    const assessmentId = req.examAssessmentId;
    if (!assessmentId) throw new ApiError(400, "No assessment in session.");

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { settings: true },
    });
    if (!assessment) throw new ApiError(404, "Assessment not found.");
    assertAssessmentAccessible(assessment);

    const questions = await hydrateAssessmentQuestions(assessmentId);
    return res.status(200).json({
      message: "Questions fetched.",
      data: {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          description: assessment.description,
          duration: assessment.duration,
          passingScore: assessment.passingScore,
          totalQuestions: questions.length,
          settings: assessment.settings,
        },
        questions,
      },
    });
  }),
);

// POST /api/v1/desktop/attempt/start
// Creates or resumes a CandidateAttempt
router.post(
  "/attempt/start",
  verifyExamJWT,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { assessmentId, deviceInfo } = req.body;

    if (!assessmentId) throw new ApiError(400, "assessmentId is required.");

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: { settings: true },
    });
    if (!assessment) throw new ApiError(404, "Assessment not found.");

    // Check if there is an existing in-progress attempt to resume
    const existing = await prisma.candidateAttempt.findFirst({
      where: { assessmentId, userId, status: "in_progress" },
    });
    if (existing) {
      return res.status(200).json({ message: "Attempt resumed.", data: existing });
    }

    const attempt = await prisma.candidateAttempt.create({
      data: {
        assessmentId,
        userId,
        email: req.user.email,
        rollNumber: req.body.rollNumber || null,
        status: "in_progress",
        answers: [],
        codeSubmissions: [],
      },
    });

    return res.status(201).json({ message: "Attempt started.", data: attempt });
  }),
);

// PUT /api/v1/desktop/attempt/:attemptId/heartbeat
router.put(
  "/attempt/:attemptId/heartbeat",
  verifyExamJWT,
  asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const { timeRemaining, currentQuestionIndex, deviceInfo } = req.body;

    const attempt = await prisma.candidateAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new ApiError(404, "Attempt not found.");
    if (attempt.userId !== req.user?.id) throw new ApiError(403, "Access denied.");
    if (attempt.status !== "in_progress") throw new ApiError(400, "Attempt is already submitted.");

    // Store heartbeat metadata in a flexible way
    await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data: {
        // We piggyback on the answers array's metadata – store heartbeat as a
        // synthetic entry that the proctor dashboard can read.
        answers: attempt.answers,
      },
    });

    return res.status(200).json({ message: "Heartbeat received.", data: { timeRemaining } });
  }),
);

// PUT /api/v1/desktop/attempt/:attemptId/autosave
router.put(
  "/attempt/:attemptId/autosave",
  verifyExamJWT,
  asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const { answers, codeSubmissions } = req.body;

    const attempt = await prisma.candidateAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new ApiError(404, "Attempt not found.");
    if (attempt.userId !== req.user?.id) throw new ApiError(403, "Access denied.");
    if (attempt.status !== "in_progress") throw new ApiError(400, "Attempt already submitted.");

    const updated = await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data: {
        answers: answers ?? attempt.answers,
        codeSubmissions: codeSubmissions ?? attempt.codeSubmissions,
      },
    });

    return res.status(200).json({ message: "Progress saved.", data: { savedAt: new Date() } });
  }),
);

// POST /api/v1/desktop/attempt/:attemptId/violation
router.post(
  "/attempt/:attemptId/violation",
  verifyExamJWT,
  asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const { type, description, severity, metadata } = req.body;

    if (!type) throw new ApiError(400, "Violation type is required.");

    const attempt = await prisma.candidateAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new ApiError(404, "Attempt not found.");
    if (attempt.userId !== req.user?.id) throw new ApiError(403, "Access denied.");

    const violation = await prisma.violation.create({
      data: {
        attemptId,
        type,
        description: description || "",
        severity: severity || "low",
        metadata: metadata || null,
      },
    });

    // Auto-escalate suspicion level
    const violationCount = await prisma.violation.count({ where: { attemptId } });
    const newLevel =
      violationCount >= 10 ? "high" : violationCount >= 5 ? "medium" : "low";

    if (newLevel !== attempt.suspicionLevel) {
      await prisma.candidateAttempt.update({
        where: { id: attemptId },
        data: { suspicionLevel: newLevel },
      });
    }

    return res.status(201).json({ message: "Violation logged.", data: violation });
  }),
);

// POST /api/v1/desktop/attempt/:attemptId/submit
router.post(
  "/attempt/:attemptId/submit",
  verifyExamJWT,
  asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const { answers, codeSubmissions, reason } = req.body;

    const attempt = await prisma.candidateAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: { include: { questions: true, settings: true } } },
    });
    if (!attempt) throw new ApiError(404, "Attempt not found.");
    if (attempt.userId !== req.user?.id) throw new ApiError(403, "Access denied.");
    if (attempt.status !== "in_progress") throw new ApiError(400, "Attempt already submitted.");

    // Simple auto-scoring for MCQ/MSQ/numerical
    let totalScore = 0;
    let maxScore = 0;

    const finalAnswers = answers ?? attempt.answers;

    for (const aq of attempt.assessment.questions) {
      maxScore += aq.points;

      if (aq.questionType === "bank" && aq.bankQuestionId) {
        const bq = await prisma.bankQuestion.findUnique({ where: { id: aq.bankQuestionId } });
        if (!bq) continue;

        const candidateAnswer = finalAnswers.find((a) => a.aqId === aq.id);
        if (!candidateAnswer) continue;

        if (bq.type === "mcq") {
          // candidateAnswer.value = index of chosen option
          const opts = bq.options || [];
          const chosen = opts[candidateAnswer.value];
          if (chosen?.isCorrect) totalScore += aq.points;
        } else if (bq.type === "msq") {
          // candidateAnswer.value = array of indices
          const opts = bq.options || [];
          const correctIndices = opts
            .map((o, i) => (o.isCorrect ? i : -1))
            .filter((i) => i !== -1);
          const selectedIndices = Array.isArray(candidateAnswer.value)
            ? candidateAnswer.value
            : [];
          const allCorrect =
            correctIndices.length === selectedIndices.length &&
            correctIndices.every((i) => selectedIndices.includes(i));
          if (allCorrect) totalScore += aq.points;
        } else if (bq.type === "numerical") {
          const expected = bq.correctAnswer;
          if (
            expected !== null &&
            expected !== undefined &&
            String(candidateAnswer.value).trim() === String(expected).trim()
          ) {
            totalScore += aq.points;
          }
        }
        // Coding / SQL / Linux scored separately by judge service
      }
    }

    const submitted = await prisma.candidateAttempt.update({
      where: { id: attemptId },
      data: {
        status: reason === "auto" ? "auto_submitted" : "submitted",
        submittedAt: new Date(),
        answers: finalAnswers,
        codeSubmissions: codeSubmissions ?? attempt.codeSubmissions,
        totalScore,
        maxScore,
      },
    });

    return res.status(200).json({
      message: "Exam submitted successfully.",
      data: {
        id: submitted.id,
        totalScore,
        maxScore,
        passingScore: attempt.assessment.passingScore,
        passed: maxScore > 0 && (totalScore / maxScore) * 100 >= attempt.assessment.passingScore,
        submittedAt: submitted.submittedAt,
      },
    });
  }),
);

// GET /api/v1/desktop/attempt/:attemptId
router.get(
  "/attempt/:attemptId",
  verifyExamJWT,
  asyncHandler(async (req, res) => {
    const { attemptId } = req.params;
    const attempt = await prisma.candidateAttempt.findUnique({
      where: { id: attemptId },
      include: { violations: { orderBy: { timestamp: "desc" } } },
    });
    if (!attempt) throw new ApiError(404, "Attempt not found.");
    if (attempt.userId !== req.user?.id) throw new ApiError(403, "Access denied.");

    return res.status(200).json({ message: "Attempt fetched.", data: attempt });
  }),
);

export default router;
