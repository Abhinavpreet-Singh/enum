import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import { linuxQuestionModel } from "../models/LinuxQuestion.js";
import {
  adminPostQuestion,
  adminEditQuestion,
  adminDeleteQuestion,
} from "./admin.controllers.js";
import { adminPostSimulation } from "./simulation.controller.js";
import { createSystemDesignSimulation } from "./systemDesign.controller.js";
import {
  buildIncidentNestedCreate,
  buildLinuxExamplesCreate,
  incidentInclude,
  linuxQuestionInclude,
  serializeIncident,
  serializeLinuxQuestion,
} from "../utils/prismaNormalizers.js";

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureUniqueLinuxSlug(baseSlug) {
  let slug = baseSlug || "linux-question";
  let suffix = 1;
  while (await linuxQuestionModel.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

export const createLinuxQuestion = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    difficulty,
    starterCode,
    expectedOutput,
    constraints,
    hints,
    language,
    examples,
    isFree,
  } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  if (!Array.isArray(examples) || examples.length === 0) {
    throw new ApiError(400, "At least one example is required");
  }

  const baseSlug = slugify(title);
  const slug = await ensureUniqueLinuxSlug(baseSlug);

  const question = await linuxQuestionModel.create({
    data: {
      slug,
      title: title.trim(),
      description: description.trim(),
      difficulty: difficulty || "easy",
      starterCode:
        starterCode ||
        "#!/usr/bin/env bash\n# Write your command here\n",
      expectedOutput: expectedOutput || "",
      constraints: Array.isArray(constraints)
        ? constraints.filter(Boolean)
        : String(constraints || "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
      hints: Array.isArray(hints)
        ? hints.filter(Boolean)
        : String(hints || "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
      language: language || "bash",
      isFree: typeof isFree === "boolean" ? isFree : null,
      ...buildLinuxExamplesCreate(examples),
    },
    include: linuxQuestionInclude,
  });

  return res.status(201).json({
    message: "Linux question created",
    data: serializeLinuxQuestion(question),
  });
});

export const createIncidentSimulation = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    difficulty,
    category,
    simulationType,
    durationSeconds,
    estimatedTime,
    xpReward,
    tags,
    initialLogs,
    rootCauseOptions,
    actionOptions,
    services,
    isFree,
  } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  if (!Array.isArray(rootCauseOptions) || rootCauseOptions.length === 0) {
    throw new ApiError(400, "At least one root cause option is required");
  }

  if (!Array.isArray(actionOptions) || actionOptions.length === 0) {
    throw new ApiError(400, "At least one action option is required");
  }

  const incident = await prisma.incidentSimulation.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      difficulty: difficulty || "medium",
      category: category || "incident",
      simulationType: simulationType || "production",
      durationSeconds: durationSeconds || 300,
      estimatedTime: estimatedTime || 15,
      xpReward: xpReward || 100,
      tags: Array.isArray(tags)
        ? tags.filter(Boolean)
        : String(tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
      initialLogs: Array.isArray(initialLogs)
        ? initialLogs.filter(Boolean)
        : String(initialLogs || "")
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
      isFree: typeof isFree === "boolean" ? isFree : null,
      ...buildIncidentNestedCreate({
        services: services || [],
        rootCauseOptions,
        actionOptions,
      }),
    },
    include: incidentInclude,
  });

  return res.status(201).json({
    message: "Incident scenario created",
    data: serializeIncident(incident),
  });
});

export {
  adminPostQuestion as createDsaQuestion,
  adminEditQuestion as updateDsaQuestion,
  adminDeleteQuestion as deleteDsaQuestion,
  adminPostSimulation as createSimulation,
  createSystemDesignSimulation as createSystemDesign,
};
