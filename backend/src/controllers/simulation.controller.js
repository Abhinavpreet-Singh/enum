import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import {
  uploadFileToCloudinary,
  deleteSimulationFolder,
  fetchFileFromCloudinary,
} from "../utils/cloudinary.js";

const getSimulations = asyncHandler(async (req, res) => {
  const allSimulations = await prisma.simulation.findMany({
    orderBy: { createdAt: "desc" },
  });

  const userId = req.user?.id;
  let userProgress = {};

  // Fetch user's progress if authenticated
  if (userId) {
    const progress = await prisma.userSimulationProgress.findMany({
      where: { userId },
      select: {
        simulationId: true,
        solved: true,
        attempts: true,
      },
    });

    progress.forEach((p) => {
      userProgress[p.simulationId] = {
        attempted: p.attempts > 0,
        solved: p.solved,
        attempts: p.attempts,
      };
    });
  }

  // Enrich simulations with user progress
  const enrichedSimulations = allSimulations.map((sim) => ({
    ...sim,
    status:
      userId && userProgress[sim.id]
        ? userProgress[sim.id]
        : { attempted: false, solved: false, attempts: 0 },
  }));

  return res.status(200).json({
    message: "Simulations fetched!",
    data: enrichedSimulations,
  });
});

const getSimulationById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Simulation ID is required");
  }

  const simulation = await prisma.simulation.findUnique({ where: { id } });

  if (!simulation) {
    throw new ApiError(404, "Simulation not found");
  }

  return res.status(200).json({
    message: "Simulation fetched!",
    data: simulation,
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
      steps: steps || [],
      initialFiles: initialFiles || [],
      solution: solution || {},
      hints: hints || [],
      estimatedTime: estimatedTime || 15,
      tags: tags || [],
      xpReward: xpReward || 50,
    },
  });

  return res.status(201).json({
    message: "Simulation created!",
    data: simulation,
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

  const simulation = await prisma.simulation.findUnique({ where: { id } });

  if (!simulation) {
    throw new ApiError(404, "Simulation not found");
  }

  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (category !== undefined) updateData.category = category;
  if (difficulty !== undefined) updateData.difficulty = difficulty;
  if (description !== undefined) updateData.description = description;
  if (incident !== undefined) updateData.incident = incident;
  if (steps !== undefined) updateData.steps = steps;
  if (initialFiles !== undefined) updateData.initialFiles = initialFiles;
  if (solution !== undefined) updateData.solution = solution;
  if (hints !== undefined) updateData.hints = hints;
  if (estimatedTime !== undefined) updateData.estimatedTime = estimatedTime;
  if (tags !== undefined) updateData.tags = tags;
  if (xpReward !== undefined) updateData.xpReward = xpReward;

  const updatedSimulation = await prisma.simulation.update({
    where: { id },
    data: updateData,
  });

  return res.status(200).json({
    message: "Simulation updated successfully!",
    data: updatedSimulation,
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

  const simulation = await prisma.simulation.findUnique({ where: { id } });
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

  const updated = await prisma.simulation.update({
    where: { id },
    data: { initialFiles: uploadedFiles },
  });

  return res.status(200).json({
    message: "Files uploaded to Cloudinary!",
    data: updated,
  });
});

const getSimulationFileContents = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) throw new ApiError(400, "Simulation ID is required");

  const simulation = await prisma.simulation.findUnique({ where: { id } });
  if (!simulation) throw new ApiError(404, "Simulation not found");

  const fileMap = {};

  await Promise.all(
    simulation.initialFiles.map(async (file) => {
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
