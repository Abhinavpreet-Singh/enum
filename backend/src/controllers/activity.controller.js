import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import prisma from "../db/index.js";

const getMyActivity = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Authentication required");

  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
  const skip = Math.max(Number(req.query.skip) || 0, 0);

  const [logs, total] = await Promise.all([
    prisma.userActivityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.userActivityLog.count({ where: { userId } }),
  ]);

  return res.status(200).json({
    message: "Activity fetched",
    data: {
      logs,
      total,
      skip,
      limit,
      hasMore: skip + logs.length < total,
    },
  });
});

export { getMyActivity };
