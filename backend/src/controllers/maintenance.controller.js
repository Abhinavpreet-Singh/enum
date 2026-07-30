import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import { normalizePagePath } from "../utils/normalizePath.js";

import { isValidId } from "../utils/isValidId.js";

const DEFAULT_MESSAGE =
  "This page is currently under maintenance. Please check back later.";

/** Public: list enabled maintenance pages (for frontend gate). */
export const getEnabledMaintenancePages = asyncHandler(async (_req, res) => {
  const pages = await prisma.maintenancePage.findMany({
    where: { enabled: true },
    select: { path: true, message: true },
    orderBy: { path: "asc" },
  });

  return res.status(200).json({
    message: "Maintenance pages fetched.",
    data: { pages },
  });
});

/** Admin: list all maintenance pages. */
export const getAllMaintenancePages = asyncHandler(async (_req, res) => {
  const pages = await prisma.maintenancePage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return res.status(200).json({
    message: "Maintenance pages fetched.",
    data: { pages },
  });
});

/** Admin: add a page to maintenance. */
export const createMaintenancePage = asyncHandler(async (req, res) => {
  const { path, url, message } = req.body ?? {};
  const normalized = normalizePagePath(path || url);

  if (!normalized || normalized === "/") {
    throw new ApiError(400, "A valid page path or URL is required.");
  }

  const existing = await prisma.maintenancePage.findUnique({
    where: { path: normalized },
  });
  if (existing) {
    throw new ApiError(409, "This page is already marked for maintenance.");
  }

  const page = await prisma.maintenancePage.create({
    data: {
      path: normalized,
      message: String(message || "").trim() || DEFAULT_MESSAGE,
    },
  });

  return res.status(201).json({
    message: "Page marked as under maintenance.",
    data: { page },
  });
});

/** Admin: update message or enabled state. */
export const updateMaintenancePage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, "Invalid maintenance page id.");

  const existing = await prisma.maintenancePage.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Maintenance page not found.");

  const { message, enabled } = req.body ?? {};
  const data = {};

  if (message !== undefined) {
    const trimmed = String(message).trim();
    if (!trimmed) throw new ApiError(400, "Message cannot be empty.");
    data.message = trimmed;
  }
  if (enabled !== undefined) data.enabled = Boolean(enabled);

  if (!Object.keys(data).length) {
    throw new ApiError(400, "No valid fields to update.");
  }

  const page = await prisma.maintenancePage.update({ where: { id }, data });

  return res.status(200).json({
    message: "Maintenance page updated.",
    data: { page },
  });
});

/** Admin: remove a page from maintenance. */
export const deleteMaintenancePage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) throw new ApiError(400, "Invalid maintenance page id.");

  const existing = await prisma.maintenancePage.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Maintenance page not found.");

  await prisma.maintenancePage.delete({ where: { id } });

  return res.status(200).json({
    message: "Page removed from maintenance.",
    data: { id },
  });
});
