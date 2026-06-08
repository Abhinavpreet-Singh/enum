import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../utils/resendEmail.js";
import { getAuthCookieOptions } from "../utils/cookieOptions.js";

// ─── Token helpers ────────────────────────────────────────────────────────────

const generateCompanyAccessToken = (company) => {
  return jwt.sign(
    {
      _id: company.id,
      email: company.email,
      name: company.name,
      accountType: "company",
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );
};

const generateCompanyRefreshToken = (company) => {
  return jwt.sign(
    { _id: company.id, accountType: "company" },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );
};

const generateCompanyTokens = async (companyId) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new ApiError(500, "Company not found while generating tokens");

  const accessToken = generateCompanyAccessToken(company);
  const refreshToken = generateCompanyRefreshToken(company);

  await prisma.company.update({
    where: { id: companyId },
    data: { refreshToken },
  });

  return { accessToken, refreshToken };
};

// ─── Send OTP ─────────────────────────────────────────────────────────────────

const sendCompanyOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Email is required.");
  }

  const existing = await prisma.company.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  await prisma.companyOtpVerification.deleteMany({ where: { email } });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.companyOtpVerification.create({
    data: { email, otp, expiresAt },
  });

  await sendOtpEmail(email, otp);

  return res.status(200).json({ message: "OTP sent successfully." });
});

// ─── Register ─────────────────────────────────────────────────────────────────

const registerCompany = asyncHandler(async (req, res) => {
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
  const otpRecord = await prisma.companyOtpVerification.findFirst({
    where: { email },
    orderBy: { expiresAt: "desc" },
  });

  if (!otpRecord) {
    throw new ApiError(400, "No OTP found for this email. Please request a new one.");
  }

  if (new Date() > otpRecord.expiresAt) {
    await prisma.companyOtpVerification.deleteMany({ where: { email } });
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  if (otpRecord.otp !== otp.trim()) {
    throw new ApiError(400, "Invalid OTP. Please try again.");
  }

  await prisma.companyOtpVerification.deleteMany({ where: { email } });

  const existingCompany = await prisma.company.findUnique({ where: { email } });
  if (existingCompany) {
    throw new ApiError(409, "Company already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const createdCompany = await prisma.company.create({
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

  if (!createdCompany) {
    throw new ApiError(500, "Something went wrong while registering company.");
  }

  const { accessToken } = await generateCompanyTokens(createdCompany.id);
  const options = getAuthCookieOptions();

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .json({
      message: "Company registered successfully.",
      data: createdCompany,
      accessToken,
    });
});

// ─── Login ────────────────────────────────────────────────────────────────────

const loginCompany = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Email is required.");
  }
  if (!password) {
    throw new ApiError(400, "Password is required.");
  }

  const company = await prisma.company.findUnique({ where: { email } });

  if (!company) {
    throw new ApiError(404, "Company not found. Please register first.");
  }

  const isPasswordValid = await bcrypt.compare(password, company.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password.");
  }

  const { accessToken, refreshToken } = await generateCompanyTokens(company.id);

  const loggedInCompany = await prisma.company.findUnique({
    where: { id: company.id },
    omit: { password: true, refreshToken: true },
  });

  const options = getAuthCookieOptions();

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json({
      message: "Logged in successfully.",
      data: loggedInCompany,
      accessToken,
    });
});

export { sendCompanyOtp, registerCompany, loginCompany };
