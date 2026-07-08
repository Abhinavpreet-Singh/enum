import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  bankQuestionInclude,
  buildBankQuestionNestedCreate,
  replaceBankQuestionOptions,
  replaceBankQuestionTestCases,
  serializeBankQuestion,
} from "../utils/prismaNormalizers.js";

export const createBankQuestion = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const organizationId = req.organization.id;

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw new ApiError(404, "Question bank not found.");
  if (bank.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const { type, title, description, difficulty, options, correctAnswer, codeTemplate, testCases, points, tags, technology, topic, functionName, parameterTypes, returnType } = req.body;

  if (!type?.trim()) throw new ApiError(400, "Question type is required.");
  if (!title?.trim()) throw new ApiError(400, "Question title is required.");

  const question = await prisma.bankQuestion.create({
    data: {
      bankId,
      type,
      title: title.trim(),
      description: description || "",
      difficulty: difficulty || "medium",
      correctAnswer: correctAnswer || null,
      codeTemplate: codeTemplate || null,
      points: points || 10,
      tags: tags || [],
      technology: technology || "",
      topic: topic || "",
      functionName: functionName || null,
      parameterTypes: parameterTypes || [],
      returnType: returnType || null,
      ...buildBankQuestionNestedCreate({ options, testCases }),
    },
    include: bankQuestionInclude,
  });

  return res.status(201).json({ message: "Question created.", data: serializeBankQuestion(question) });
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
<<<<<<< HEAD
    orderBy: { createdAt: "desc" },
    include: bankQuestionInclude,
=======
    orderBy: { createdAt: "asc" },
>>>>>>> ee1bfa44d7b8a28128e2ef821bca487cf82c3216
  });

  return res.status(200).json({
    message: "Questions fetched.",
    data: questions.map(serializeBankQuestion),
  });
});

export const updateBankQuestion = asyncHandler(async (req, res) => {
  const { bankId, questionId } = req.params;
  const organizationId = req.organization.id;

  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw new ApiError(404, "Question bank not found.");
  if (bank.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const existing = await prisma.bankQuestion.findUnique({ where: { id: questionId } });
  if (!existing || existing.bankId !== bankId) throw new ApiError(404, "Question not found.");

  const { type, title, description, difficulty, options, correctAnswer, codeTemplate, testCases, points, tags, technology, topic, functionName, parameterTypes, returnType } = req.body;

  const updateData = {};
  if (type !== undefined) updateData.type = type;
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description;
  if (difficulty !== undefined) updateData.difficulty = difficulty;
  if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer;
  if (codeTemplate !== undefined) updateData.codeTemplate = codeTemplate;
  if (points !== undefined) updateData.points = points;
  if (tags !== undefined) updateData.tags = tags;
  if (technology !== undefined) updateData.technology = technology;
  if (topic !== undefined) updateData.topic = topic;
  if (functionName !== undefined) updateData.functionName = functionName;
  if (parameterTypes !== undefined) updateData.parameterTypes = parameterTypes;
  if (returnType !== undefined) updateData.returnType = returnType;

  const question = await prisma.$transaction(async (tx) => {
    if (options !== undefined) {
      await replaceBankQuestionOptions(tx, questionId, options);
    }
    if (testCases !== undefined) {
      await replaceBankQuestionTestCases(tx, questionId, testCases);
    }

    return tx.bankQuestion.update({
      where: { id: questionId },
      data: updateData,
      include: bankQuestionInclude,
    });
  });

  return res.status(200).json({ message: "Question updated.", data: serializeBankQuestion(question) });
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
