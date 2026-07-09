import { asyncHandler } from "../utils/asyncHandler.js";
import prisma from "../db/index.js";
import { ApiError } from "../utils/apiError.js";
import bcrypt from "bcrypt";
import { uploadAvatarToCloudinary } from "../utils/cloudinary.js";
import { sendOtpEmail } from "../utils/resendEmail.js";
import { getAuthCookieOptions } from "../utils/cookieOptions.js";
import { setRefreshCookie, clearRefreshCookie } from "../auth/utils/cookies.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getAccessTokenExpiryDate,
  hashAccessToken,
} from "../auth/utils/tokens.js";
import { createSession, storeAccessToken } from "../auth/services/session.service.js";
import { tryAwardXp, AWARD_TYPES, buildAwardKey } from "../services/xpService.js";
import { logUserActivity } from "../services/activityLogService.js";
import { confirmPasswordReset } from "../services/passwordReset.service.js";
import { getUserAccessSummary } from "../services/entitlement.service.js";
import {
  buildUserCertReplace,
  parseUserLinksUpdate,
  serializeUserProfile,
  userProfileInclude,
} from "../utils/prismaNormalizers.js";

const buildStreakUpdate = (user, now) => {
  const lastActivity = user?.lastActivityDate;

  if (!lastActivity) {
    return { currentStreak: 1, lastActivityDate: now };
  }

  const daysSinceLastActivity = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (daysSinceLastActivity === 0) {
    return { lastActivityDate: now };
  }

  if (daysSinceLastActivity === 1) {
    return {
      currentStreak: (user?.currentStreak ?? 0) + 1,
      lastActivityDate: now,
    };
  }

  return { currentStreak: 1, lastActivityDate: now };
};

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));

const generateAccessAndRefreshToken = async (userId, req) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const refreshToken = generateRefreshToken();
    const session = await createSession({
      userId: user.id,
      accountType: String(user.role || "Student").toLowerCase() === "admin" ? "admin" : "student",
      refreshToken,
      userAgent: req.get("User-Agent") || "",
      ipAddress: (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "")
        .toString()
        .split(",")[0]
        .trim(),
    });
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      username: user.username,
      role: user.role || "Student",
      accountType: session.accountType,
      sessionId: session.id,
    });
    await storeAccessToken(session.id, {
      accessTokenHash: hashAccessToken(accessToken),
      accessTokenExpiresAt: getAccessTokenExpiryDate(),
    });

    return { refreshToken, accessToken };
  } catch (error) {
    throw new ApiError(
      500,
      `Something went wrong while generating the tokens!! ${error}`,
    );
  }
};

const sendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    throw new ApiError(400, "Email is required.");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists.");
  }

  // Delete any existing OTP for this email
  await prisma.otpVerification.deleteMany({ where: { email } });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpVerification.create({
    data: { email, otp, expiresAt },
  });

  await sendOtpEmail(email, otp);

  return res.status(200).json({ message: "OTP sent successfully." });
});

const registerUser = asyncHandler(async (req, res) => {
  const { email, username, password, otp } = req.body;

  if ([username, email, password, otp].some((f) => !f || f.trim() === "")) {
    throw new ApiError(400, "All fields are required.");
  }

  // Verify OTP
  const otpRecord = await prisma.otpVerification.findFirst({
    where: { email },
    orderBy: { expiresAt: "desc" },
  });

  if (!otpRecord) {
    throw new ApiError(400, "No OTP found for this email. Please request a new one.");
  }

  if (new Date() > otpRecord.expiresAt) {
    await prisma.otpVerification.deleteMany({ where: { email } });
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  if (otpRecord.otp !== otp.trim()) {
    throw new ApiError(400, "Invalid OTP. Please try again.");
  }

  // OTP verified — clean it up
  await prisma.otpVerification.deleteMany({ where: { email } });

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username: username.toLowerCase() }, { email }],
    },
  });

  if (existingUser) {
    throw new ApiError(409, "User already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const createdUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      username: username.toLowerCase(),
    },
    omit: { password: true, refreshToken: true },
  });

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user!!");
  }

  return res.status(201).json({
    message: "Registration Successfull",
    data: createdUser,
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!email && !username) {
    throw new ApiError(400, "Email or username is required");
  }

  if (!password) {
    throw new ApiError(400, "password required");
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        ...(username ? [{ username: username.toLowerCase() }] : []),
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found please register first!!");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Password!!");
  }

  const { refreshToken, accessToken } = await generateAccessAndRefreshToken(
    user.id,
    req,
  );

  const loggedInUser = await prisma.user.findUnique({
    where: { id: user.id },
    omit: { password: true, refreshToken: true },
  });

  if (!loggedInUser) {
    throw new ApiError(500, "Something went wrong while logging the user!!");
  }

  clearRefreshCookie(res);
  setRefreshCookie(res, refreshToken);
  return res
    .status(200)
    .json({
      message: "Logged In",
      data: loggedInUser,
      accessToken: accessToken,
    });
});

const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new ApiError(400, "Valid user id is required");
  }

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json({
    message: "data fetched",
    data: user,
  });
});

const logoutUser = asyncHandler(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { refreshToken: null },
  });

  const options = getAuthCookieOptions();

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({
      message: "Logged out successfully",
    });
});

const userForgetPassword = asyncHandler(async (req, res) => {
  const result = await confirmPasswordReset({
    token: req.body.token,
    newPassword: req.body.newPassword,
  });

  return res.status(200).json(result);
});

const getProfile = asyncHandler(async (req, res) => {
  if (req.admin) {
    return res.status(200).json({
      message: "Profile fetched",
      data: {
        name: req.admin?.name || "Admin",
        email: req.admin?.email || "",
        accountType: "admin",
      },
    });
  }

  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: userProfileInclude,
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const hasPassword = Boolean(user.password);
  const { password: _password, refreshToken: _refreshToken, ...safeUser } = user;

  let accessSummary = { isPro: false, tracks: [], entitlements: [] };
  try {
    accessSummary = await getUserAccessSummary(req.user.id);
  } catch {
    // Billing tables may be unavailable until Prisma client is regenerated.
  }

  return res.status(200).json({
    message: "Profile fetched",
    data: {
      ...serializeUserProfile(safeUser),
      hasPassword,
      premium: {
        isPro: accessSummary.isPro,
        tracks: accessSummary.tracks,
        entitlements: accessSummary.entitlements.map((entry) => ({
          id: entry.id,
          scope: entry.scope,
          trackKey: entry.trackKey,
          source: entry.source,
          startsAt: entry.startsAt,
          expiresAt: entry.expiresAt,
          product: entry.product
            ? {
                slug: entry.product.slug,
                title: entry.product.title,
                kind: entry.product.kind,
                trackKey: entry.product.trackKey,
              }
            : null,
        })),
      },
    },
  });
});

const updateProfile = asyncHandler(async (req, res) => {
  const allowedFields = [
    "displayName",
    "bio",
    "role",
    "location",
    "resume",
    "skills",
    "links",
    "certs",
  ];
  const updateFields = {};

  for (const field of allowedFields) {
    if (field === "links" && req.body.links !== undefined) {
      Object.assign(updateFields, parseUserLinksUpdate(req.body.links));
    } else if (field !== "certs" && req.body[field] !== undefined) {
      updateFields[field] = req.body[field];
    }
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...updateFields,
      ...(req.body.certs !== undefined
        ? { certs: buildUserCertReplace(req.body.certs) }
        : {}),
    },
    include: userProfileInclude,
    omit: { password: true, refreshToken: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json({
    message: "Profile updated",
    data: serializeUserProfile(user),
  });
});

const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!newPassword || String(newPassword).length < 8) {
    throw new ApiError(400, "New password must be at least 8 characters.");
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "New password and confirmation do not match.");
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const hasPassword = Boolean(user.password);

  if (hasPassword) {
    if (!currentPassword) {
      throw new ApiError(400, "Current password is required.");
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      String(currentPassword),
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new ApiError(401, "Current password is incorrect.");
    }
  }

  const hashedPassword = await bcrypt.hash(String(newPassword), 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return res.status(200).json({
    message: hasPassword
      ? "Password changed successfully."
      : "Password set successfully.",
  });
});

const getPrivacy = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      username: true,
      provider: true,
      profilePublic: true,
      showOnLeaderboard: true,
      showActivityStats: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res.status(200).json({
    message: "Privacy settings fetched",
    data: user,
  });
});

const updatePrivacy = asyncHandler(async (req, res) => {
  if (!req.user?.id) {
    throw new ApiError(401, "Unauthorized request");
  }

  const allowedFields = ["profilePublic", "showOnLeaderboard", "showActivityStats"];
  const updateFields = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateFields[field] = Boolean(req.body[field]);
    }
  }

  if (Object.keys(updateFields).length === 0) {
    throw new ApiError(400, "No privacy settings to update.");
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: updateFields,
    select: {
      username: true,
      provider: true,
      profilePublic: true,
      showOnLeaderboard: true,
      showActivityStats: true,
    },
  });

  return res.status(200).json({
    message: "Privacy settings updated",
    data: user,
  });
});

const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No image file provided");
  }

  const { url } = await uploadAvatarToCloudinary(req.file.buffer, req.user.id);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { avatar: url },
    omit: { password: true, refreshToken: true },
  });

  return res.status(200).json({
    message: "Avatar updated",
    data: { avatar: user.avatar },
  });
});

const awardBrowserXp = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Authentication required");

  const { simulationId, xpAmount, simulationTitle } = req.body;
  if (!simulationId || typeof simulationId !== "string") {
    throw new ApiError(400, "simulationId is required");
  }

  const parsedXp = Number(xpAmount);
  if (!Number.isFinite(parsedXp) || parsedXp <= 0 || parsedXp > 1000) {
    throw new ApiError(
      400,
      "xpAmount must be a valid number between 1 and 1000",
    );
  }

  const now = new Date();
  const xpResult = await prisma.$transaction(async (tx) => {
    const result = await tryAwardXp(tx, {
      userId,
      awardKey: buildAwardKey(AWARD_TYPES.browser, simulationId),
      amount: Math.round(parsedXp),
      fullSuccess: true,
    });

    if (result.awarded) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, lastActivityDate: true },
      });
      const streakUpdate = buildStreakUpdate(user, now);
      await tx.user.update({ where: { id: userId }, data: streakUpdate });
    }

    await logUserActivity(tx, {
      userId,
      activityType: "browser",
      resourceId: simulationId,
      resourceTitle: simulationTitle || "Browser simulation",
      outcome: result.awarded ? "correct" : "incorrect",
      xpEarned: result.xpEarned,
      detail: result.alreadyClaimed
        ? "XP already claimed"
        : "Simulation solved",
    });

    const stats = await tx.user.findUnique({
      where: { id: userId },
      select: { xp: true, currentStreak: true },
    });

    return { ...result, currentStreak: stats?.currentStreak ?? 0 };
  });

  return res.status(200).json({
    message: xpResult.alreadyClaimed
      ? "XP already awarded for this browser simulation"
      : "Browser simulation XP awarded",
    data: {
      alreadyAwarded: xpResult.alreadyClaimed,
      xpAwarded: xpResult.xpEarned,
      totalXp: xpResult.totalXp,
      currentStreak: xpResult.currentStreak,
    },
  });
});

const getLeaderboard = asyncHandler(async (req, res) => {
  // 1. Accepted submissions — deduplicated per (userId, questionId), joined with question level
  const subGroups = await prisma.submission.groupBy({
    by: ["userId", "questionId"],
    where: { verdict: "accepted" },
  });

  const questionIds = [...new Set(subGroups.map((row) => row.questionId))];
  const questions = questionIds.length
    ? await prisma.question.findMany({
        where: { id: { in: questionIds } },
        select: { id: true, level: true },
      })
    : [];
  const levelByQuestionId = Object.fromEntries(
    questions.map((question) => [question.id, question.level]),
  );

  const userProblemMap = {};
  for (const row of subGroups) {
    const uid = row.userId;
    if (!uid) continue;
    if (!userProblemMap[uid])
      userProblemMap[uid] = { problemXP: 0, problemsSolved: 0 };
    const level = levelByQuestionId[row.questionId] ?? "Easy";
    const xp = level === "Medium" ? 25 : level === "Hard" ? 50 : 10;
    userProblemMap[uid].problemXP += xp;
    userProblemMap[uid].problemsSolved += 1;
  }

  // 2. Solved simulations joined with xpReward/difficulty
  const simProgress = await prisma.userSimulationProgress.findMany({
    where: { solved: true },
    select: {
      userId: true,
      simulation: { select: { xpReward: true, difficulty: true } },
    },
  });

  const userSimMap = {};
  for (const row of simProgress) {
    const uid = row.userId;
    if (!uid) continue;
    if (!userSimMap[uid])
      userSimMap[uid] = { simulationsSolved: 0, simulationXP: 0 };
    let simXP = row.simulation?.xpReward || 0;
    if (simXP === 0) {
      simXP =
        row.simulation?.difficulty === "medium"
          ? 100
          : row.simulation?.difficulty === "hard"
            ? 150
            : 50;
    }
    userSimMap[uid].simulationsSolved += 1;
    userSimMap[uid].simulationXP += simXP;
  }

  // 3. Count unique system design simulations attempted per user
  const sdSubmissions = await prisma.systemDesignSubmission.groupBy({
    by: ["userId", "simulationId"],
    _count: { id: true },
  });

  const userSDMap = {};
  for (const row of sdSubmissions) {
    userSDMap[row.userId] = (userSDMap[row.userId] ?? 0) + 1;
  }

  // 4. Users who opted into the leaderboard
  const users = await prisma.user.findMany({
    where: { showOnLeaderboard: true },
    select: {
      id: true,
      username: true,
      displayName: true,
      avatar: true,
      xp: true,
      browserXpClaims: true,
      currentStreak: true,
    },
  });

  const leaderboard = users
    .map((user) => {
      const sq = userProblemMap[user.id];
      const ss = userSimMap[user.id];
      const sdCount = userSDMap[user.id] ?? 0;
      const browserSolved = user.browserXpClaims?.length ?? 0;
      return {
        _id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar || "",
        xp: user.xp ?? 0,
        problemsSolved: sq?.problemsSolved ?? 0,
        simulationsSolved:
          (ss?.simulationsSolved ?? 0) + sdCount + browserSolved,
        currentStreak: user.currentStreak ?? 0,
      };
    })
    .sort((a, b) => b.xp - a.xp);

  return res
    .status(200)
    .json({ message: "Leaderboard fetched", data: leaderboard });
});

export {
  sendOtp,
  registerUser,
  loginUser,
  logoutUser,
  userForgetPassword,
  getUserById,
  getProfile,
  updateProfile,
  updatePassword,
  getPrivacy,
  updatePrivacy,
  uploadAvatar,
  awardBrowserXp,
  getLeaderboard,
};
