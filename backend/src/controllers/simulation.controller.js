import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  uploadFileToCloudinary,
  deleteSimulationFolder,
  fetchFileFromCloudinary,
} from "../utils/cloudinary.js";
import {
  getTrackProductMap,
  getUserAccessSummary,
  hasTrackAccessFromSummary,
  simulationCategoryToTrackKey,
} from "../services/entitlement.service.js";
import {
  buildSimulationNestedCreate,
  replaceSimulationFiles,
  replaceSimulationSteps,
  serializeSimulation,
  serializeSimulationFile,
  simulationInclude,
} from "../utils/prismaNormalizers.js";

const enrichSimulationAccess = async (simulations, userId) => {
  const [productsByTrack, accessSummary] = await Promise.all([
    getTrackProductMap(),
    getUserAccessSummary(userId),
  ]);
  const counters = {};

  return simulations.map((sim) => {
    const trackKey = simulationCategoryToTrackKey(sim.category);
    counters[trackKey] = (counters[trackKey] || 0) + 1;
    const product = productsByTrack[trackKey];
    const freeItemQuota = product?.freeItemQuota ?? 0;
    const hasAccess = !product || hasTrackAccessFromSummary(accessSummary, trackKey);
    const isFree = counters[trackKey] <= freeItemQuota;
    const locked = !hasAccess && !isFree;

    return {
      ...sim,
      access: {
        locked,
        isFree,
        freeIndex: counters[trackKey],
        freeItemQuota,
        trackKey,
        productSlug: product?.slug || "",
        reason: locked ? "Upgrade to unlock this premium simulation." : "",
      },
    };
  });
};

const canAccessSimulation = async (simulationId, userId) => {
  const simulations = await prisma.simulation.findMany({
    orderBy: { createdAt: "desc" },
  });
  const enriched = await enrichSimulationAccess(simulations, userId);
  const simulation = enriched.find((sim) => sim.id === simulationId);
  return { allowed: Boolean(simulation && !simulation.access?.locked), simulation };
};

const getSimulations = asyncHandler(async (req, res) => {
  const allSimulations = await prisma.simulation.findMany({
    orderBy: { createdAt: "desc" },
    include: simulationInclude,
  });

  const userId = req.user?.id;
  let userProgress = {};

  // Fetch user's progress if authenticated
  let browserXpClaims = [];

  if (userId) {
    const [progress, user] = await Promise.all([
      prisma.userSimulationProgress.findMany({
        where: { userId },
        select: {
          simulationId: true,
          solved: true,
          attempts: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { browserXpClaims: true },
      }),
    ]);

    browserXpClaims = user?.browserXpClaims ?? [];

    progress.forEach((p) => {
      userProgress[p.simulationId] = {
        attempted: p.attempts > 0 || p.solved,
        solved: p.solved,
        attempts: p.attempts,
      };
    });

    for (const simId of browserXpClaims) {
      if (!userProgress[simId]) {
        userProgress[simId] = {
          attempted: true,
          solved: true,
          attempts: 1,
        };
      } else {
        userProgress[simId].solved = true;
        userProgress[simId].attempted = true;
      }
    }
  }

  // Enrich simulations with user progress
  const enrichedSimulations = await enrichSimulationAccess(allSimulations.map((sim) => ({
    ...serializeSimulation(sim),
    status:
      userId && userProgress[sim.id]
        ? userProgress[sim.id]
        : { attempted: false, solved: false, attempts: 0 },
  })), userId);

  return res.status(200).json({
    message: "Simulations fetched!",
    data: enrichedSimulations,
    browserXpClaims,
  });
});

const getSimulationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Simulation ID is required");
  }

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: simulationInclude,
  });

  if (!simulation) {
    throw new ApiError(404, "Simulation not found");
  }

  const { allowed } = await canAccessSimulation(id, req.user?.id);
  if (!allowed) {
    throw new ApiError(403, "Upgrade to unlock this premium simulation.");
  }

  return res.status(200).json({
    message: "Simulation fetched!",
    data: serializeSimulation(simulation),
  });
});

const adminPostSimulation = asyncHandler(async (req, res) => {
  const {
    title,
    category,
    difficulty,
    description,
    incident,
    steps,
    initialFiles,
    solution,
    hints,
    estimatedTime,
    tags,
    xpReward,
  } = req.body;

  if (
    !title?.trim() ||
    !category?.trim() ||
    !description?.trim() ||
    !incident?.trim()
  ) {
    throw new ApiError(
      400,
      "Title, category, description, and incident are required",
    );
  }

  const existingSimulation = await prisma.simulation.findFirst({
    where: { title },
  });

  if (existingSimulation) {
    throw new ApiError(409, "Simulation with this title already exists!");
  }

  const simulation = await prisma.simulation.create({
    data: {
      title,
      category,
      difficulty: difficulty || "easy",
      description,
      incident,
      solution: solution || {},
      hints: hints || [],
      estimatedTime: estimatedTime || 15,
      tags: tags || [],
      xpReward: xpReward || 50,
      ...buildSimulationNestedCreate({ steps, initialFiles }),
    },
    include: simulationInclude,
  });

  return res.status(201).json({
    message: "Simulation created!",
    data: serializeSimulation(simulation),
  });
});

const adminEditSimulation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    title,
    category,
    difficulty,
    description,
    incident,
    steps,
    initialFiles,
    solution,
    hints,
    estimatedTime,
    tags,
    xpReward,
  } = req.body;

  if (!id) {
    throw new ApiError(400, "Simulation ID is required");
  }

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: simulationInclude,
  });

  if (!simulation) {
    throw new ApiError(404, "Simulation not found");
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (category !== undefined) updateData.category = category;
  if (difficulty !== undefined) updateData.difficulty = difficulty;
  if (description !== undefined) updateData.description = description;
  if (incident !== undefined) updateData.incident = incident;
  if (solution !== undefined) updateData.solution = solution;
  if (hints !== undefined) updateData.hints = hints;
  if (estimatedTime !== undefined) updateData.estimatedTime = estimatedTime;
  if (tags !== undefined) updateData.tags = tags;
  if (xpReward !== undefined) updateData.xpReward = xpReward;

  const updatedSimulation = await prisma.$transaction(async (tx) => {
    if (steps !== undefined) {
      await replaceSimulationSteps(tx, id, steps);
    }
    if (initialFiles !== undefined) {
      await replaceSimulationFiles(tx, id, initialFiles);
    }

    return tx.simulation.update({
      where: { id },
      data: updateData,
      include: simulationInclude,
    });
  });

  return res.status(200).json({
    message: "Simulation updated successfully!",
    data: serializeSimulation(updatedSimulation),
  });
});

const adminDeleteSimulation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Simulation ID is required");
  }

  const deletedSimulation = await prisma.simulation
    .delete({
      where: { id },
    })
    .catch(() => null);

  if (!deletedSimulation) {
    throw new ApiError(404, "Simulation not found");
  }

  try {
    await deleteSimulationFolder(id);
  } catch (err) {
    console.warn("Cloudinary cleanup failed:", err.message);
  }

  return res.status(200).json({
    message: "Simulation deleted successfully!",
    data: deletedSimulation,
  });
});

const uploadSimulationFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { files } = req.body;

  if (!id) throw new ApiError(400, "Simulation ID is required");
  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new ApiError(400, "files array is required");
  }

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: simulationInclude,
  });
  if (!simulation) throw new ApiError(404, "Simulation not found");

  const uploadedFiles = [];

  for (const file of files) {
    if (!file.path || typeof file.content !== "string") {
      throw new ApiError(400, `Invalid file entry: ${JSON.stringify(file)}`);
    }

    const { url, publicId } = await uploadFileToCloudinary(
      file.content,
      file.path,
      id,
    );

    const fileName = file.path.split("/").pop() || file.path;

    uploadedFiles.push({
      name: fileName,
      path: file.path,
      content: "",
      language: file.language || "javascript",
      cloudinaryUrl: url,
      cloudinaryPublicId: publicId,
    });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.simulationFile.findMany({ where: { simulationId: id } });
    await replaceSimulationFiles(tx, id, [
      ...existing.map(serializeSimulationFile),
      ...uploadedFiles,
    ]);
    return tx.simulation.findUnique({
      where: { id },
      include: simulationInclude,
    });
  });

  return res.status(200).json({
    message: "Files uploaded to Cloudinary!",
    data: serializeSimulation(updated),
  });
});

const getSimulationFileContents = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) throw new ApiError(400, "Simulation ID is required");

  const simulation = await prisma.simulation.findUnique({
    where: { id },
    include: simulationInclude,
  });
  if (!simulation) throw new ApiError(404, "Simulation not found");

  const { allowed } = await canAccessSimulation(id, req.user?.id);
  if (!allowed) {
    throw new ApiError(403, "Upgrade to unlock this premium simulation.");
  }

  const fileMap = {};

  await Promise.all(
    (serializeSimulation(simulation).initialFiles || []).map(async (file) => {
      if (file.cloudinaryUrl) {
        try {
          const content = await fetchFileFromCloudinary(file.cloudinaryUrl);
          fileMap[file.path] = content;
        } catch (err) {
          console.error(
            `Error fetching ${file.path} from Cloudinary:`,
            err.message,
          );
          fileMap[file.path] = file.content || "";
        }
      } else {
        fileMap[file.path] = file.content || "";
      }
    }),
  );

  return res.status(200).json({
    message: "File contents fetched!",
    data: {
      simulationId: id,
      entryFile: simulation.entryFile || "index.js",
      files: fileMap,
    },
  });
});

export {
  getSimulations,
  getSimulationById,
  adminPostSimulation,
  adminEditSimulation,
  adminDeleteSimulation,
  uploadSimulationFiles,
  getSimulationFileContents,
};
