import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "../services/passwordReset.service.js";

const router = Router();

// ─── Session (authoritative account type from verified JWT) ───────────────────
// Kept as a legacy alias; new code should use GET /api/v1/auth/me instead.
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
// NOTE: /login is now handled by the new auth router (newAuthRouter).
// This file retains the /session alias and password-reset routes.

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
