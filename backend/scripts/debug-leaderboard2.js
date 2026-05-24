import prisma from "../src/db/index.js";

// Check accepted submissions WITH a userId
const acceptedWithUser = await prisma.submission.aggregateRaw({
  pipeline: [
    { $match: { verdict: "accepted", userId: { $ne: null } } },
    { $limit: 5 },
    { $project: { userId: 1, questionId: 1, verdict: 1 } },
  ],
});
console.log(
  "Accepted subs WITH userId:",
  JSON.stringify(acceptedWithUser, null, 2),
);

// Count all subs with/without userId
const userIdStats = await prisma.submission.aggregateRaw({
  pipeline: [
    {
      $group: {
        _id: {
          hasUserId: { $cond: [{ $eq: ["$userId", null] }, "null", "present"] },
          verdict: "$verdict",
        },
        count: { $sum: 1 },
      },
    },
  ],
});
console.log(
  "\nSubmission stats (userId null vs present):",
  JSON.stringify(userIdStats, null, 2),
);

// Check sim progress
const simProgress = await prisma.userSimulationProgress.aggregateRaw({
  pipeline: [{ $group: { _id: "$solved", count: { $sum: 1 } } }],
});
console.log(
  "\nSim progress solved stats:",
  JSON.stringify(simProgress, null, 2),
);

await prisma.$disconnect();
