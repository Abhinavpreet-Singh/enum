import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getAuthCookieOptions } from "../utils/cookieOptions.js";

const router = Router();

const signToken = (payload, secret, expiry) =>
  jwt.sign(payload, secret, { expiresIn: expiry });

const makeUserTokens = async (user) => {
  const access = signToken(
    { _id: user.id, email: user.email, username: user.username },
    process.env.ACCESS_TOKEN_SECRET,
    process.env.ACCESS_TOKEN_EXPIRY,
  );
  const refresh = signToken(
    { _id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    process.env.REFRESH_TOKEN_EXPIRY,
  );
  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refresh } });
  return { access, refresh };
};

const makeCompanyTokens = async (company) => {
  const access = signToken(
    { _id: company.id, email: company.email, name: company.name, accountType: "company" },
    process.env.ACCESS_TOKEN_SECRET,
    process.env.ACCESS_TOKEN_EXPIRY,
  );
  const refresh = signToken(
    { _id: company.id, accountType: "company" },
    process.env.REFRESH_TOKEN_SECRET,
    process.env.REFRESH_TOKEN_EXPIRY,
  );
  await prisma.company.update({ where: { id: company.id }, data: { refreshToken: refresh } });
  return { access, refresh };
};

const makeCollegeTokens = async (college) => {
  const access = signToken(
    { _id: college.id, email: college.email, name: college.name, accountType: "college" },
    process.env.ACCESS_TOKEN_SECRET,
    process.env.ACCESS_TOKEN_EXPIRY,
  );
  const refresh = signToken(
    { _id: college.id, accountType: "college" },
    process.env.REFRESH_TOKEN_SECRET,
    process.env.REFRESH_TOKEN_EXPIRY,
  );
  await prisma.college.update({ where: { id: college.id }, data: { refreshToken: refresh } });
  return { access, refresh };
};

// ─── Unified login ────────────────────────────────────────────────────────────
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, username, password } = req.body;

    if (!email && !username) throw new ApiError(400, "Email or username is required.");
    if (!password) throw new ApiError(400, "Password is required.");

    const options = getAuthCookieOptions();

    // ── Username → users only ───────────────────────────────────────────────
    if (username && !email) {
      const user = await prisma.user.findFirst({
        where: { username: username.toLowerCase() },
      });
      if (!user) throw new ApiError(404, "No account found with that username.");
      if (!user.password) throw new ApiError(401, "Please log in with Google or GitHub.");
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) throw new ApiError(401, "Invalid password.");

      const { access, refresh } = await makeUserTokens(user);
      const safe = await prisma.user.findUnique({
        where: { id: user.id },
        omit: { password: true, refreshToken: true },
      });
      return res
        .status(200)
        .cookie("accessToken", access, options)
        .cookie("refreshToken", refresh, options)
        .json({ message: "Logged in.", data: safe, accessToken: access, accountType: "user" });
    }

    // ── Email → try User → Company → College ────────────────────────────────
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      if (!user.password) throw new ApiError(401, "Please log in with Google or GitHub.");
      const ok = await bcrypt.compare(password, user.password);
      if (!ok) throw new ApiError(401, "Invalid password.");
      const { access, refresh } = await makeUserTokens(user);
      const safe = await prisma.user.findUnique({
        where: { id: user.id },
        omit: { password: true, refreshToken: true },
      });
      return res
        .status(200)
        .cookie("accessToken", access, options)
        .cookie("refreshToken", refresh, options)
        .json({ message: "Logged in.", data: safe, accessToken: access, accountType: "user" });
    }

    const company = await prisma.company.findUnique({ where: { email } });
    if (company) {
      const ok = await bcrypt.compare(password, company.password);
      if (!ok) throw new ApiError(401, "Invalid password.");
      const { access, refresh } = await makeCompanyTokens(company);
      const safe = await prisma.company.findUnique({
        where: { id: company.id },
        omit: { password: true, refreshToken: true },
      });
      return res
        .status(200)
        .cookie("accessToken", access, options)
        .cookie("refreshToken", refresh, options)
        .json({ message: "Logged in.", data: safe, accessToken: access, accountType: "company" });
    }

    const college = await prisma.college.findUnique({ where: { email } });
    if (college) {
      const ok = await bcrypt.compare(password, college.password);
      if (!ok) throw new ApiError(401, "Invalid password.");
      const { access, refresh } = await makeCollegeTokens(college);
      const safe = await prisma.college.findUnique({
        where: { id: college.id },
        omit: { password: true, refreshToken: true },
      });
      return res
        .status(200)
        .cookie("accessToken", access, options)
        .cookie("refreshToken", refresh, options)
        .json({ message: "Logged in.", data: safe, accessToken: access, accountType: "college" });
    }

    throw new ApiError(404, "No account found. Please check your credentials or register first.");
  }),
);

export default router;
