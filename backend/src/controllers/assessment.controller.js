import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { getPublishWindow } from "../utils/assessmentAccess.js";
import { sanitizeAssessmentSettings } from "../utils/assessmentSettings.js";
import prisma from "../db/index.js";
import crypto from "crypto";

const generateTestCode = () => crypto.randomBytes(4).toString("hex"); // 8-char hex

export const createAssessment = asyncHandler(async (req, res) => {
  const organizationId = req.organization.id;
  const { title, description, duration, startDate, endDate, maxAttempts, passingScore, accessType, accessPassword, settings } = req.body;

  if (!title?.trim()) throw new ApiError(400, "Assessment title is required.");

  let testCode = generateTestCode();
  // Ensure uniqueness
  while (await prisma.assessment.findUnique({ where: { testCode } })) {
    testCode = generateTestCode();
  }

  const assessment = await prisma.assessment.create({
    data: {
      organizationId,
      title: title.trim(),
      description: description || "",
      duration: duration || 60,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      maxAttempts: maxAttempts || 1,
      passingScore: passingScore || 60,
      accessType: accessType || "public",
      accessPassword: accessPassword || null,
      testCode,
      settings: {
        create: sanitizeAssessmentSettings(settings),
      },
    },
    include: { settings: true },
  });

  return res.status(201).json({ message: "Assessment created.", data: assessment });
});

export const getAssessments = asyncHandler(async (req, res) => {
  const organizationId = req.organization.id;
  const { status, search } = req.query;

  const where = { organizationId };
  if (status && status !== "all") where.status = status;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const assessments = await prisma.assessment.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      settings: true,
      _count: { select: { attempts: true, invites: true, questions: true } },
    },
  });

  return res.status(200).json({ message: "Assessments fetched.", data: assessments });
});

export const getAssessmentById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.organization.id;

  const assessment = await prisma.assessment.findUnique({
    where: { id },
    include: {
      settings: true,
      questions: { orderBy: { order: "asc" } },
      _count: { select: { attempts: true, invites: true, questions: true } },
    },
  });

  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (assessment.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  return res.status(200).json({ message: "Assessment fetched.", data: assessment });
});

export const updateAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.organization.id;
  const { title, description, duration, startDate, endDate, maxAttempts, passingScore, accessType, accessPassword, settings } = req.body;

  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Assessment not found.");
  if (existing.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const updateData = {};
  if (title !== undefined) updateData.title = title.trim();
  if (description !== undefined) updateData.description = description;
  if (duration !== undefined) updateData.duration = duration;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
  if (maxAttempts !== undefined) updateData.maxAttempts = maxAttempts;
  if (passingScore !== undefined) updateData.passingScore = passingScore;
  if (accessType !== undefined) updateData.accessType = accessType;
  if (accessPassword !== undefined) updateData.accessPassword = accessPassword;

  const assessment = await prisma.assessment.update({
    where: { id },
    data: updateData,
    include: { settings: true },
  });

  // Update settings if provided
  const settingsData = sanitizeAssessmentSettings(settings);
  if (Object.keys(settingsData).length > 0 && assessment.settings) {
    await prisma.assessmentSetting.update({
      where: { id: assessment.settings.id },
      data: settingsData,
    });
  } else if (Object.keys(settingsData).length > 0 && !assessment.settings) {
    await prisma.assessmentSetting.create({
      data: { assessmentId: id, ...settingsData },
    });
  }

  const updated = await prisma.assessment.findUnique({
    where: { id },
    include: { settings: true, _count: { select: { attempts: true, invites: true, questions: true } } },
  });

  return res.status(200).json({ message: "Assessment updated.", data: updated });
});

export const deleteAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.organization.id;

  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Assessment not found.");
  if (existing.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  await prisma.assessment.delete({ where: { id } });
  return res.status(200).json({ message: "Assessment deleted." });
});

export const publishAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.organization.id;

  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Assessment not found.");
  if (existing.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const { startDate, endDate } = getPublishWindow(existing.duration);

  const assessment = await prisma.assessment.update({
    where: { id },
    data: { status: "published", startDate, endDate },
    include: { settings: true },
  });

  return res.status(200).json({ message: "Assessment published.", data: assessment });
});

export const unpublishAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.organization.id;

  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Assessment not found.");
  if (existing.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const assessment = await prisma.assessment.update({
    where: { id },
    data: { status: "draft" },
    include: { settings: true },
  });

  return res.status(200).json({ message: "Assessment unpublished.", data: assessment });
});

export const duplicateAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.organization.id;

  const source = await prisma.assessment.findUnique({
    where: { id },
    include: { settings: true, questions: true },
  });
  if (!source) throw new ApiError(404, "Assessment not found.");
  if (source.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  let testCode = generateTestCode();
  while (await prisma.assessment.findUnique({ where: { testCode } })) {
    testCode = generateTestCode();
  }

  const { id: _, createdAt, updatedAt, settings, questions, ...rest } = source;

  const clone = await prisma.assessment.create({
    data: {
      ...rest,
      title: `${source.title} (Copy)`,
      testCode,
      status: "draft",
      settings: settings ? { create: (() => { const { id: _sid, assessmentId, ...s } = settings; return s; })() } : undefined,
      questions: questions.length > 0 ? {
        create: questions.map(({ id: _qid, assessmentId, ...q }) => q),
      } : undefined,
    },
    include: { settings: true, _count: { select: { attempts: true, invites: true, questions: true } } },
  });

  return res.status(201).json({ message: "Assessment duplicated.", data: clone });
});

export const archiveAssessment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const organizationId = req.organization.id;

  const existing = await prisma.assessment.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Assessment not found.");
  if (existing.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const assessment = await prisma.assessment.update({
    where: { id },
    data: { status: "archived" },
  });

  return res.status(200).json({ message: "Assessment archived.", data: assessment });
});
