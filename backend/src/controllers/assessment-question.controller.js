import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

async function assertAssessmentAccess(assessmentId, organizationId) {
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (assessment.organizationId !== organizationId) throw new ApiError(403, "Access denied.");
  return assessment;
}

async function syncQuestionCount(assessmentId) {
  const count = await prisma.assessmentQuestion.count({ where: { assessmentId } });
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { totalQuestions: count },
  });
}

export const listAssessmentQuestions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await assertAssessmentAccess(id, req.organization.id);

  const questions = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: id },
    orderBy: { order: "asc" },
  });

  const hydrated = await Promise.all(
    questions.map(async (aq) => {
      if (aq.bankQuestionId) {
        const bq = await prisma.bankQuestion.findUnique({ where: { id: aq.bankQuestionId } });
        return { ...aq, bankQuestion: bq };
      }
      return aq;
    }),
  );

  return res.status(200).json({ message: "Assessment questions fetched.", data: hydrated });
});

export const addAssessmentQuestions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { bankQuestionIds } = req.body;

  if (!Array.isArray(bankQuestionIds) || bankQuestionIds.length === 0) {
    throw new ApiError(400, "bankQuestionIds array is required.");
  }

  await assertAssessmentAccess(id, req.organization.id);

  const bankQuestions = await prisma.bankQuestion.findMany({
    where: { id: { in: bankQuestionIds } },
    include: { bank: { select: { organizationId: true } } },
  });

  if (bankQuestions.length !== bankQuestionIds.length) {
    throw new ApiError(404, "One or more bank questions were not found.");
  }

  for (const bq of bankQuestions) {
    if (bq.bank.organizationId !== req.organization.id) {
      throw new ApiError(403, "Access denied to one or more questions.");
    }
  }

  const existing = await prisma.assessmentQuestion.findMany({
    where: { assessmentId: id, bankQuestionId: { in: bankQuestionIds } },
    select: { bankQuestionId: true },
  });
  const existingIds = new Set(existing.map((q) => q.bankQuestionId));
  const toAdd = bankQuestions.filter((bq) => !existingIds.has(bq.id));

  const maxOrder = await prisma.assessmentQuestion.aggregate({
    where: { assessmentId: id },
    _max: { order: true },
  });
  let order = (maxOrder._max.order ?? -1) + 1;

  const created = [];
  for (const bq of toAdd) {
    const row = await prisma.assessmentQuestion.create({
      data: {
        assessmentId: id,
        questionType: "bank",
        bankQuestionId: bq.id,
        order: order++,
        points: bq.points || 10,
        required: true,
      },
    });
    created.push(row);
  }

  await syncQuestionCount(id);

  return res.status(201).json({
    message: `${created.length} question(s) added to assessment.`,
    data: created,
  });
});

export const removeAssessmentQuestion = asyncHandler(async (req, res) => {
  const { id, questionId } = req.params;
  await assertAssessmentAccess(id, req.organization.id);

  const existing = await prisma.assessmentQuestion.findUnique({ where: { id: questionId } });
  if (!existing || existing.assessmentId !== id) {
    throw new ApiError(404, "Assessment question not found.");
  }

  await prisma.assessmentQuestion.delete({ where: { id: questionId } });
  await syncQuestionCount(id);

  return res.status(200).json({ message: "Question removed from assessment." });
});
