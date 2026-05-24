/**
 * Backfill simulation XP for all users.
 * Awards xpReward for each solved simulation (increments on top of existing user.xp).
 * Run once: node scripts/backfill-sim-xp.js
 */
import prisma from "../src/db/index.js";

const simAgg = await prisma.userSimulationProgress.aggregateRaw({
  pipeline: [
    { $match: { solved: true, userId: { $ne: null } } },
    {
      $lookup: {
        from: "simulations",
        localField: "simulationId",
        foreignField: "_id",
        as: "sim",
      },
    },
    { $unwind: { path: "$sim", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: 1,
        xpReward: "$sim.xpReward",
        difficulty: "$sim.difficulty",
      },
    },
  ],
});

const userSimXpMap = {};
for (const row of simAgg) {
  const uid = row.userId?.$oid ?? row.userId;
  if (!uid) continue;
  let xp = row.xpReward || 0;
  if (xp === 0) {
    xp =
      row.difficulty === "hard" ? 150 : row.difficulty === "medium" ? 100 : 50;
  }
  userSimXpMap[uid] = (userSimXpMap[uid] ?? 0) + xp;
}

console.log("Simulation XP to add per user:", userSimXpMap);

let updated = 0;
for (const [userId, xpToAdd] of Object.entries(userSimXpMap)) {
  if (xpToAdd > 0) {
    const result = await prisma.user.update({
      where: { id: userId },
      data: { xp: { increment: xpToAdd } },
      select: { username: true, xp: true },
    });
    console.log(
      `  ${result.username}: +${xpToAdd} sim XP → total ${result.xp}`,
    );
    updated++;
  }
}

console.log(`\nDone. Updated ${updated} users.`);
await prisma.$disconnect();
