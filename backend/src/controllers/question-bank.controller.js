import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

export const createQuestionBank = asyncHandler(async (req, res) => {
  const companyId = req.company.id;
  const { name, category, description, tags } = req.body;

  if (!name?.trim()) throw new ApiError(400, "Question bank name is required.");
  if (!category?.trim()) throw new ApiError(400, "Category is required.");

  const bank = await prisma.questionBank.create({
    data: {
      companyId,
      name: name.trim(),
      category,
      description: description || "",
      tags: tags || [],
    },
    include: { _count: { select: { questions: true } } },
  });

  return res.status(201).json({ message: "Question bank created.", data: bank });
});

export const getQuestionBanks = asyncHandler(async (req, res) => {
  const companyId = req.company.id;
  const { category } = req.query;

  const where = { companyId };
  if (category && category !== "all") where.category = category;

  const banks = await prisma.questionBank.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return res.status(200).json({ message: "Question banks fetched.", data: banks });
});

export const getQuestionBankById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.company.id;

  const bank = await prisma.questionBank.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { createdAt: "desc" } },
      _count: { select: { questions: true } },
    },
  });

  if (!bank) throw new ApiError(404, "Question bank not found.");
  if (bank.companyId !== companyId) throw new ApiError(403, "Access denied.");

  return res.status(200).json({ message: "Question bank fetched.", data: bank });
});

export const updateQuestionBank = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.company.id;
  const { name, category, description, tags } = req.body;

  const existing = await prisma.questionBank.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Question bank not found.");
  if (existing.companyId !== companyId) throw new ApiError(403, "Access denied.");

  const updateData = {};
  if (name !== undefined) updateData.name = name.trim();
  if (category !== undefined) updateData.category = category;
  if (description !== undefined) updateData.description = description;
  if (tags !== undefined) updateData.tags = tags;

  const bank = await prisma.questionBank.update({
    where: { id },
    data: updateData,
    include: { _count: { select: { questions: true } } },
  });

  return res.status(200).json({ message: "Question bank updated.", data: bank });
});

export const deleteQuestionBank = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const companyId = req.company.id;

  const existing = await prisma.questionBank.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Question bank not found.");
  if (existing.companyId !== companyId) throw new ApiError(403, "Access denied.");

  await prisma.questionBank.delete({ where: { id } });
  return res.status(200).json({ message: "Question bank deleted." });
});
