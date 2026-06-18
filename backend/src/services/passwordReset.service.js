import crypto from "crypto";
import bcrypt from "bcrypt";

import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import { sendPasswordResetEmail } from "../utils/resendEmail.js";

const RESET_TOKEN_BYTES = 32;
const RESET_TOKEN_TTL_MINUTES = 30;

const genericResetMessage =
  "If an account exists for this email, a password reset link has been sent.";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const normalizeAccountType = (accountType) => {
  const value = String(accountType || "").trim().toLowerCase();
  if (["organization", "company", "org"].includes(value)) return "organization";
  if (["student", "user"].includes(value)) return "user";
  return "";
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const findAccountByEmail = async (email, preferredType = "") => {
  if (preferredType === "organization") {
    const organization = await prisma.organization.findUnique({ where: { email } });
    return organization ? { account: organization, accountType: "organization" } : null;
  }

  if (preferredType === "user") {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? { account: user, accountType: "user" } : null;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) return { account: user, accountType: "user" };

  const organization = await prisma.organization.findUnique({ where: { email } });
  if (organization) return { account: organization, accountType: "organization" };

  return null;
};

const buildResetUrl = (frontendBaseUrl, token) => {
  const baseUrl = frontendBaseUrl || process.env.FRONTEND_URL || "http://localhost:3000";
  const resetUrl = new URL("/reset-password", baseUrl);
  resetUrl.searchParams.set("token", token);
  return resetUrl.toString();
};

export const requestPasswordReset = async ({
  email,
  accountType,
  frontendBaseUrl,
}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new ApiError(400, "Email is required.");
  }

  const preferredType = normalizeAccountType(accountType);
  const resetAccount = await findAccountByEmail(normalizedEmail, preferredType);

  if (!resetAccount) {
    return { message: genericResetMessage };
  }

  const token = crypto.randomBytes(RESET_TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: {
      accountId: resetAccount.account.id,
      accountType: resetAccount.accountType,
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      accountId: resetAccount.account.id,
      accountType: resetAccount.accountType,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    },
  });

  await sendPasswordResetEmail(
    normalizedEmail,
    buildResetUrl(frontendBaseUrl, token),
    expiresAt,
  );

  return { message: genericResetMessage };
};

export const confirmPasswordReset = async ({ token, newPassword }) => {
  const rawToken = String(token || "").trim();
  if (!rawToken) {
    throw new ApiError(400, "Reset token is required.");
  }

  if (!newPassword || String(newPassword).length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters.");
  }

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new ApiError(400, "Reset link is invalid or has expired.");
  }

  const hashedPassword = await bcrypt.hash(String(newPassword), 10);

  if (resetToken.accountType === "organization") {
    await prisma.organization.update({
      where: { id: resetToken.accountId },
      data: { password: hashedPassword, refreshToken: null },
    });
  } else {
    await prisma.user.update({
      where: { id: resetToken.accountId },
      data: { password: hashedPassword, refreshToken: null },
    });
  }

  await prisma.passwordResetToken.deleteMany({
    where: {
      accountId: resetToken.accountId,
      accountType: resetToken.accountType,
    },
  });

  return { message: "Password reset successfully. Please log in with your new password." };
};
