import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../utils/resendEmail.js";
import { getAuthCookieOptions } from "../utils/cookieOptions.js";

// ─── Token helpers ────────────────────────────────────────────────────────────

const generateOrganizationAccessToken = (organization) => {
  return jwt.sign(
    {
      _id: organization.id,
      email: organization.email,
      name: organization.name,
      accountType: "organization",
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};

const generateOrganizationRefreshToken = (organization) => {
  return jwt.sign(
    { _id: organization.id, accountType: "organization" },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
};

const generateOrganizationTokens = async (organizationId) => {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) throw new ApiError(500, "Organization not found while generating tokens");

  const accessToken = generateOrganizationAccessToken(organization);
  const refreshToken = generateOrganizationRefreshToken(organization);

  await prisma.organization.update({
    where: { id: organizationId },
    data: { refreshToken },
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
    },
    omit: { password: true, refreshToken: true },
  });

  if (!createdOrganization) {
    throw new ApiError(500, "Something went wrong while registering organization.");
  }

  const { accessToken } = await generateOrganizationTokens(createdOrganization.id);
  const options = getAuthCookieOptions();

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json({
      message: "Organization registered successfully.",
      data: createdOrganization,
      accessToken,
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

  const { accessToken, refreshToken } = await generateOrganizationTokens(organization.id);

  const loggedInOrganization = await prisma.organization.findUnique({
    where: { id: organization.id },
    omit: { password: true, refreshToken: true },
  });

  const options = getAuthCookieOptions();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      message: "Logged in successfully.",
      data: loggedInOrganization,
      accessToken,
    });
});

export { sendOrganizationOtp, registerOrganization, loginOrganization };
