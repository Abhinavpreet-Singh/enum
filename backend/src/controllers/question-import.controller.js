import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import { linuxQuestionModel } from "../models/LinuxQuestion.js";
import {
  mapDsaQuestionToBankPayload,
  mapLinuxQuestionToBankPayload,
  mapSystemDesignToBankPayload,
  mapMcqToBankPayload,
  SAMPLE_BANK_DEFINITIONS,
  SAMPLE_MCQ_PACKS,
  PLATFORM_SOURCE_LABELS,
} from "../utils/platformQuestionImport.js";

async function assertBankAccess(bankId, organizationId) {
  const bank = await prisma.questionBank.findUnique({ where: { id: bankId } });
  if (!bank) throw new ApiError(404, "Question bank not found.");
  if (bank.organizationId !== organizationId) throw new ApiError(403, "Access denied.");
  return bank;
}

async function createBankQuestions(bankId, payloads) {
  const created = [];
  for (const payload of payloads) {
    const question = await prisma.bankQuestion.create({
      data: { bankId, ...payload },
    });
    created.push(question);
  }
  return created;
}

/** GET /api/v1/question-banks/catalog/platform */
export const getPlatformCatalog = asyncHandler(async (req, res) => {
  const [dsaQuestions, linuxQuestions, systemDesignSims] = await Promise.all([
    prisma.question.findMany({
      orderBy: [{ level: "asc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        desc: true,
        level: true,
        topic: true,
        functionName: true,
      },
    }),
    linuxQuestionModel.findMany({
      orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        difficulty: true,
      },
    }),
    prisma.systemDesignSimulation.findMany({
      orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        maxScore: true,
        tags: true,
      },
    }),
  ]);

  return res.status(200).json({
    message: "Platform catalog fetched.",
    data: {
      sources: PLATFORM_SOURCE_LABELS,
      counts: {
        dsa: dsaQuestions.length,
        linux: linuxQuestions.length,
        system_design: systemDesignSims.length,
      },
      dsa: dsaQuestions.map((q) => ({
        id: q.id,
        source: "dsa",
        sourceLabel: PLATFORM_SOURCE_LABELS.dsa,
        title: q.title || "Untitled",
        description: q.desc || "",
        difficulty: String(q.level || "medium").toLowerCase(),
        topic: q.topic || "Algorithms",
      })),
      linux: linuxQuestions.map((q) => ({
        id: q.id,
        source: "linux",
        sourceLabel: PLATFORM_SOURCE_LABELS.linux,
        title: q.title,
        description: q.description || "",
        difficulty: String(q.difficulty || "easy").toLowerCase(),
        topic: "Shell",
        slug: q.slug,
      })),
      system_design: systemDesignSims.map((sim) => ({
        id: sim.id,
        source: "system_design",
        sourceLabel: PLATFORM_SOURCE_LABELS.system_design,
        title: sim.title,
        description: sim.description || "",
        difficulty: String(sim.difficulty || "medium").toLowerCase(),
        topic: "Architecture",
        maxScore: sim.maxScore,
        tags: sim.tags || [],
      })),
    },
  });
});

/** POST /api/v1/question-banks/:bankId/import */
export const importPlatformQuestions = asyncHandler(async (req, res) => {
  const { bankId } = req.params;
  const organizationId = req.organization.id;
  const { source, questionIds } = req.body;

  await assertBankAccess(bankId, organizationId);

  if (!source || !["dsa", "linux", "system_design"].includes(source)) {
    throw new ApiError(400, "source must be 'dsa', 'linux', or 'system_design'.");
  }
  if (!Array.isArray(questionIds) || questionIds.length === 0) {
    throw new ApiError(400, "questionIds array is required.");
  }

  let payloads = [];

  if (source === "dsa") {
    const rows = await prisma.question.findMany({
      where: { id: { in: questionIds } },
    });
    if (rows.length === 0) throw new ApiError(404, "No matching DSA questions found.");
    payloads = rows.map(mapDsaQuestionToBankPayload);
  } else if (source === "linux") {
    const rows = await linuxQuestionModel.findMany({
      where: { id: { in: questionIds } },
    });
    if (rows.length === 0) throw new ApiError(404, "No matching Linux questions found.");
    payloads = rows.map(mapLinuxQuestionToBankPayload);
  } else {
    const rows = await prisma.systemDesignSimulation.findMany({
      where: { id: { in: questionIds } },
    });
    if (rows.length === 0) throw new ApiError(404, "No matching system design scenarios found.");
    payloads = rows.map(mapSystemDesignToBankPayload);
  }

  const created = await createBankQuestions(bankId, payloads);

  return res.status(201).json({
    message: `${created.length} question(s) imported.`,
    data: created,
  });
});

/** POST /api/v1/question-banks/seed-samples */
export const seedSampleBanks = asyncHandler(async (req, res) => {
  const organizationId = req.organization.id;
  const createdBanks = [];

  for (const def of SAMPLE_BANK_DEFINITIONS) {
    let bank = await prisma.questionBank.findFirst({
      where: { organizationId, name: def.name },
    });

    if (!bank) {
      bank = await prisma.questionBank.create({
        data: {
          organizationId,
          name: def.name,
          category: def.category,
          description: def.description,
          tags: def.tags,
        },
      });
    }

    const existingCount = await prisma.bankQuestion.count({ where: { bankId: bank.id } });
    if (existingCount > 0) {
      createdBanks.push({ ...bank, skipped: true, questionCount: existingCount });
      continue;
    }

    const mcqPack = SAMPLE_MCQ_PACKS[def.mcqPack] || [];
    const mcqPayloads = mcqPack.map(mapMcqToBankPayload);
    await createBankQuestions(bank.id, mcqPayloads);

    let codingPayloads = [];
    if (def.codingSource === "dsa") {
      const dsaRows = await prisma.question.findMany({
        orderBy: [{ level: "asc" }, { title: "asc" }],
        take: def.codingLimit,
      });
      codingPayloads = dsaRows.map(mapDsaQuestionToBankPayload);
    } else if (def.codingSource === "linux") {
      const linuxRows = await linuxQuestionModel.findMany({
        orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
        take: def.codingLimit,
      });
      codingPayloads = linuxRows.map(mapLinuxQuestionToBankPayload);
    } else if (def.codingSource === "system_design") {
      const sdRows = await prisma.systemDesignSimulation.findMany({
        orderBy: [{ difficulty: "asc" }, { createdAt: "asc" }],
        take: def.codingLimit,
      });
      codingPayloads = sdRows.map(mapSystemDesignToBankPayload);
    }

    if (codingPayloads.length > 0) {
      await createBankQuestions(bank.id, codingPayloads);
    }

    const questionCount = await prisma.bankQuestion.count({ where: { bankId: bank.id } });
    createdBanks.push({ ...bank, skipped: false, questionCount });
  }

  return res.status(201).json({
    message: "Sample question banks ready.",
    data: createdBanks,
  });
});
