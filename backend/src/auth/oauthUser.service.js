import prisma from "../db/index.js";

const sanitizeUsernameBase = (value) => {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
};

const randomSuffix = () => Math.random().toString(36).slice(2, 8);

const generateUniqueUsername = async (email, displayName) => {
  const baseCandidate = sanitizeUsernameBase(email?.split("@")[0]) || sanitizeUsernameBase(displayName) || "user";

  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? baseCandidate : `${baseCandidate}_${i}`;
    const existing = await prisma.user.findUnique({ where: { username: candidate } });
    if (!existing) return candidate;
  }

  return `${baseCandidate}_${randomSuffix()}`;
};

export const findOrCreateOAuthUser = async ({
  email,
  displayName,
  provider,
  avatar,
}) => {
  if (!email) {
    const error = new Error("OAuth provider did not return an email address");
    error.statusCode = 400;
    throw error;
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return existingUser;
  }

  const username = await generateUniqueUsername(email, displayName);

  const createdUser = await prisma.user.create({
    data: {
      email,
      username,
      password: null,
      provider,
      displayName: displayName || null,
      avatar: avatar || "",
    },
  });

  return createdUser;
};
