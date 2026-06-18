import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getAuthCookieOptions } from "../utils/cookieOptions.js";
import { assertOrganizationApproved } from "../utils/organizationApproval.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "../services/passwordReset.service.js";

const router = Router();

const signToken = (payload, secret, expiry) =>
  jwt.sign(payload, secret, { expiresIn: expiry });

const getUserAccountType = (user) => {
  const role = String(user?.role || "Student").toLowerCase();
  return role === "admin" ? "admin" : "student";
};

const makeUserTokens = async (user) => {
  const accountType = getUserAccountType(user);
  const access = signToken(
    {
      _id: user.id,
      email: user.email,
      username: user.username,
      accountType,
      accountRole: user.role || "Student",
    },
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

const makeOrganizationTokens = async (organization) => {
  const access = signToken(
    { _id: organization.id, email: organization.email, name: organization.name, accountType: "organization" },
    process.env.ACCESS_TOKEN_SECRET,
    process.env.ACCESS_TOKEN_EXPIRY,
  );
  const refresh = signToken(
    { _id: organization.id, accountType: "organization" },
    process.env.REFRESH_TOKEN_SECRET,
    process.env.REFRESH_TOKEN_EXPIRY,
  );
  await prisma.organization.update({ where: { id: organization.id }, data: { refreshToken: refresh } });
  return { access, refresh };
};

// ─── Session (authoritative account type from verified JWT) ───────────────────
router.get(
  "/session",
  verifyJWT,
  asyncHandler(async (req, res) => {
    if (req.accountType === "admin") {
      return res.status(200).json({
        message: "Session fetched.",
        data: {
          accountType: "admin",
          admin: req.admin,
          user: req.user,
          role: req.user?.role || "Admin",
        },
      });
    }

    if (req.accountType === "organization") {
      return res.status(200).json({
        message: "Session fetched.",
        data: {
          accountType: "organization",
          organization: req.organization,
        },
      });
    }

    return res.status(200).json({
      message: "Session fetched.",
      data: {
        accountType: "student",
        user: req.user,
        role: req.user?.role || "Student",
      },
    });
  }),
);

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
      const accountType = getUserAccountType(user);
      return res
        .status(200)
        .cookie("accessToken", access, options)
        .cookie("refreshToken", refresh, options)
        .json({
          message: accountType === "admin" ? "Admin logged in." : "Logged in.",
          data: safe,
          accessToken: access,
          accountType,
        });
    }

    // ── Email → try User → Company ──────────────────────────────────────────
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
      const accountType = getUserAccountType(user);
      return res
        .status(200)
        .cookie("accessToken", access, options)
        .cookie("refreshToken", refresh, options)
        .json({
          message: accountType === "admin" ? "Admin logged in." : "Logged in.",
          data: safe,
          accessToken: access,
          accountType,
        });
    }

    const organization = await prisma.organization.findUnique({ where: { email } });
    if (organization) {
      const ok = await bcrypt.compare(password, organization.password);
      if (!ok) throw new ApiError(401, "Invalid password.");
      assertOrganizationApproved(organization);
      const { access, refresh } = await makeOrganizationTokens(organization);
      const safe = await prisma.organization.findUnique({
        where: { id: organization.id },
        omit: { password: true, refreshToken: true },
      });
      return res
        .status(200)
        .cookie("accessToken", access, options)
        .cookie("refreshToken", refresh, options)
        .json({ message: "Logged in.", data: safe, accessToken: access, accountType: "organization" });
    }

    throw new ApiError(404, "No account found. Please check your credentials or register first.");
  }),
);

// ─── Password reset ───────────────────────────────────────────────────────────
router.post(
  "/password-reset/request",
  asyncHandler(async (req, res) => {
    const frontendBaseUrl =
      req.get("origin") || process.env.FRONTEND_URL || "http://localhost:3000";
    const result = await requestPasswordReset({
      email: req.body.email,
      accountType: req.body.accountType,
      frontendBaseUrl,
    });

    return res.status(200).json(result);
  }),
);

router.post(
  "/password-reset/confirm",
  asyncHandler(async (req, res) => {
    const result = await confirmPasswordReset({
      token: req.body.token,
      newPassword: req.body.newPassword || req.body.password,
    });

    return res.status(200).json(result);
  }),
);

export default router;
