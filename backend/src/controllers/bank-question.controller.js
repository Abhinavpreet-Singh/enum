import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

export const createBankQuestion = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const organizationId = req.organization.id;

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw new ApiError(404, "Question bank not found.");
  if (bank.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const { type, title, description, difficulty, options, correctAnswer, codeTemplate, testCases, points, tags, technology, topic } = req.body;

  if (!type?.trim()) throw new ApiError(400, "Question type is required.");
  if (!title?.trim()) throw new ApiError(400, "Question title is required.");

  const question = await prisma.bankQuestion.create({
    data: {
      bankId,
      type,
      title: title.trim(),
      description: description || "",
      difficulty: difficulty || "medium",
      options: options || null,
      correctAnswer: correctAnswer || null,
      codeTemplate: codeTemplate || null,
      testCases: testCases || [],
      points: points || 10,
      tags: tags || [],
      technology: technology || "",
      topic: topic || "",
    },
  });

  return res.status(201).json({ message: "Question created.", data: question });
});

export const getBankQuestions = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const organizationId = req.organization.id;
  const { type, difficulty } = req.query;

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw new ApiError(404, "Question bank not found.");
  if (bank.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const where = { bankId };
  if (type) where.type = type;
  if (difficulty) where.difficulty = difficulty;

  const questions = await prisma.bankQuestion.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({ message: "Questions fetched.", data: questions });
});

export const updateBankQuestion = asyncHandler(async (req, res) => {
  const { bankId, questionId } = req.params;
  const organizationId = req.organization.id;

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw new ApiError(404, "Question bank not found.");
  if (bank.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const existing = await prisma.bankQuestion.findUnique({ where: { id: questionId } });
  if (!existing || existing.bankId !== bankId) throw new ApiError(404, "Question not found.");

  const { type, title, description, difficulty, options, correctAnswer, codeTemplate, testCases, points, tags, technology, topic } = req.body;

  const updateData = {};
  if (type !== undefined) updateData.type = type;
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description;
  if (difficulty !== undefined) updateData.difficulty = difficulty;
  if (options !== undefined) updateData.options = options;
  if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer;
  if (codeTemplate !== undefined) updateData.codeTemplate = codeTemplate;
  if (testCases !== undefined) updateData.testCases = testCases;
  if (points !== undefined) updateData.points = points;
  if (tags !== undefined) updateData.tags = tags;
  if (technology !== undefined) updateData.technology = technology;
  if (topic !== undefined) updateData.topic = topic;

  const question = await prisma.bankQuestion.update({
    where: { id: questionId },
    data: updateData,
  });

  return res.status(200).json({ message: "Question updated.", data: question });
});

export const deleteBankQuestion = asyncHandler(async (req, res) => {
  const { bankId, questionId } = req.params;
  const organizationId = req.organization.id;

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw new ApiError(404, "Question bank not found.");
  if (bank.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const existing = await prisma.bankQuestion.findUnique({ where: { id: questionId } });
  if (!existing || existing.bankId !== bankId) throw new ApiError(404, "Question not found.");

  await prisma.bankQuestion.delete({ where: { id: questionId } });
  return res.status(200).json({ message: "Question deleted." });
});
