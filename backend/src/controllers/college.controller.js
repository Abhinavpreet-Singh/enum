import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";
import bcrypt from "bcrypt";
import { sendOtpEmail } from "../utils/resendEmail.js";

export const sendCollegeOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) throw new ApiError(400, "Email is required.");

  const exists = await prisma.college.findUnique({ where: { email } });
  if (exists) throw new ApiError(409, "A college with this email already exists.");

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.collegeOtpVerification.deleteMany({ where: { email } });
  await prisma.collegeOtpVerification.create({ data: { email, otp, expiresAt } });
  await sendOtpEmail(email, otp);

  return res.status(200).json({ message: "OTP sent successfully.", data: { email } });
});

export const registerCollege = asyncHandler(async (req, res) => {
  const { email, otp, password, name, website, coordinatorName, coordinatorEmail } = req.body;

  if (!email || !otp || !password || !name) {
    throw new ApiError(400, "Email, OTP, password, and college name are required.");
  }

  const record = await prisma.collegeOtpVerification.findFirst({
    where: { email, otp },
    orderBy: { expiresAt: "desc" },
  });

  if (!record) throw new ApiError(400, "Invalid OTP.");
  if (record.expiresAt < new Date()) throw new ApiError(400, "OTP has expired.");

  const hashed = await bcrypt.hash(password, 10);

  const college = await prisma.college.create({
    data: {
      name,
      email,
      password: hashed,
      website: website || "",
      coordinatorName: coordinatorName || "",
      coordinatorEmail: coordinatorEmail || "",
    },
  });

  await prisma.collegeOtpVerification.deleteMany({ where: { email } });

  const { password: _, refreshToken: __, ...safe } = college;
  return res.status(201).json({ message: "College registered. Pending approval.", data: safe });
});
