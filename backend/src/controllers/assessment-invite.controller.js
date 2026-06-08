import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

export const sendInvites = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const organizationId = req.organization.id;
  const { emails, rollNumbers } = req.body;

  if (!Array.isArray(emails) || emails.length === 0) {
    throw new ApiError(400, "At least one email is required.");
  }

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (assessment.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const inviteData = emails.map((email, i) => ({
    assessmentId,
    email: email.trim().toLowerCase(),
    rollNumber: rollNumbers?.[i] || null,
  }));

  const result = await prisma.assessmentInvite.createMany({
    data: inviteData,
    skipDuplicates: true,
  });

  return res.status(201).json({ message: `${result.count} invite(s) sent.`, data: { count: result.count } });
});

export const getInvites = asyncHandler(async (req, res) => {
  const { assessmentId } = req.params;
  const organizationId = req.organization.id;

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (assessment.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  const invites = await prisma.assessmentInvite.findMany({
    where: { assessmentId },
    orderBy: { sentAt: "desc" },
  });

  return res.status(200).json({ message: "Invites fetched.", data: invites });
});

export const revokeInvite = asyncHandler(async (req, res) => {
  const { assessmentId, inviteId } = req.params;
  const organizationId = req.organization.id;

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (assessment.organizationId !== organizationId) throw new ApiError(403, "Access denied.");

  await prisma.assessmentInvite.delete({ where: { id: inviteId } }).catch(() => {
    throw new ApiError(404, "Invite not found.");
  });

  return res.status(200).json({ message: "Invite revoked." });
});
