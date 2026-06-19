import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import { sendOtpEmail } from "../utils/resendEmail.js";
import { setRefreshCookie } from "../auth/utils/cookies.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiryDate,
  hashAccessToken,
} from "../auth/utils/tokens.js";
import { createSession, storeAccessToken } from "../auth/services/session.service.js";
import { assertOrganizationApproved } from "../utils/organizationApproval.js";

// ─── Token helpers ────────────────────────────────────────────────────────────

const generateOrganizationTokens = async (organizationId, req) => {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new ApiError(500, "Organization not found while generating tokens");

  const refreshToken = generateRefreshToken();
  const session = await createSession({
    organizationId: organization.id,
    accountType: "organization",
    refreshToken,
    userAgent: req.get("User-Agent") || "",
    ipAddress: (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
      .toString()
      .split(",")[0]
      .trim(),
  });
  const accessToken = generateAccessToken({
    userId: organization.id,
    email: organization.email,
    username: organization.name,
    role: "Organization",
    accountType: "organization",
    sessionId: session.id,
  });
  await storeAccessToken(session.id, {
    accessTokenHash: hashAccessToken(accessToken),
    accessTokenExpiresAt: getAccessTokenExpiryDate(),
  });

  return { accessToken, refreshToken };
};

// ─── Send OTP ─────────────────────────────────────────────────────────────────

const sendOrganizationOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Email is required.");
  }

  const existing = await prisma.organization.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  await prisma.organizationOtpVerification.deleteMany({ where: { email } });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.organizationOtpVerification.create({
    data: { email, otp, expiresAt },
  });

  await sendOtpEmail(email, otp);

  return res.status(200).json({ message: "OTP sent successfully." });
});

// ─── Register ─────────────────────────────────────────────────────────────────

const registerOrganization = asyncHandler(async (req, res) => {
  const {
    email,
    name,
    password,
    otp,
    website = "",
    industry = "",
    size = "",
    location = "",
    description = "",
  } = req.body;

  if ([name, email, password, otp].some((f) => !f || f.trim() === "")) {
    throw new ApiError(400, "Name, email, password, and OTP are required.");
  }

  // Verify OTP
  const otpRecord = await prisma.organizationOtpVerification.findFirst({
    where: { email },
    orderBy: { expiresAt: "desc" },
  });

  if (!otpRecord) {
    throw new ApiError(400, "No OTP found for this email. Please request a new one.");
  }

  if (new Date() > otpRecord.expiresAt) {
    await prisma.organizationOtpVerification.deleteMany({ where: { email } });
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  if (otpRecord.otp !== otp.trim()) {
    throw new ApiError(400, "Invalid OTP. Please try again.");
  }

  await prisma.organizationOtpVerification.deleteMany({ where: { email } });

  const existingOrganization = await prisma.organization.findUnique({ where: { email } });
  if (existingOrganization) {
    throw new ApiError(409, "Organization already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const createdOrganization = await prisma.organization.create({
    data: {
      name: name.trim(),
      email,
      password: hashedPassword,
      website,
      industry,
      size,
      location,
      description,
      approvalStatus: "pending",
    },
    omit: { password: true, refreshToken: true },
  });

  if (!createdOrganization) {
    throw new ApiError(500, "Something went wrong while registering organization.");
  }

  return res.status(201).json({
    message:
      "Organization registered successfully. Your account is pending admin approval.",
    data: createdOrganization,
    approvalStatus: "pending",
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────

const loginOrganization = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Email is required.");
  }
  if (!password) {
    throw new ApiError(400, "Password is required.");
  }

  const organization = await prisma.organization.findUnique({ where: { email } });

  if (!organization) {
    throw new ApiError(404, "Organization not found. Please register first.");
  }

  const isPasswordValid = await bcrypt.compare(password, organization.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password.");
  }

  assertOrganizationApproved(organization);

  const { accessToken, refreshToken } = await generateOrganizationTokens(organization.id, req);

  const loggedInOrganization = await prisma.organization.findUnique({
    where: { id: organization.id },
    omit: { password: true, refreshToken: true },
  });

  setRefreshCookie(res, refreshToken);

  return res.status(200).json({
    message: "Logged in successfully.",
    data: loggedInOrganization,
    accessToken,
  });
});

export { sendOrganizationOtp, registerOrganization, loginOrganization };
