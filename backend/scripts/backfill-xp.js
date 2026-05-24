/**
 * Backfill XP for all users based on their accepted DSA submissions.
 * Awards XP only for the FIRST accepted submission per (userId, questionId) pair.
 * Run once: node scripts/backfill-xp.js
 */
import prisma from "../src/db/index.js";

// Fetch all accepted submissions with userId and questionId
const accepted = await prisma.submission.aggregateRaw({
  pipeline: [
    {
      $match: {
        verdict: "accepted",
        userId: { $ne: null },
        questionId: { $ne: null },
      },
    },
    // Deduplicate: first accepted per (userId, questionId)
    {
      $group: {
        _id: { userId: "$userId", questionId: "$questionId" },
      },
    },
    {
      $lookup: {
        from: "questions",
        localField: "_id.questionId",
        foreignField: "_id",
        as: "q",
      },
    },
    { $unwind: { path: "$q", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: "$_id.userId",
        level: "$q.level",
      },
    },
  ],
});

// Aggregate XP per user
const userXpMap = {};
for (const row of accepted) {
  const uid = row.userId?.$oid ?? row.userId;
  if (!uid) continue;
  const level = row.level ?? "Easy";
  const xp = level === "Hard" ? 50 : level === "Medium" ? 25 : 10;
  userXpMap[uid] = (userXpMap[uid] ?? 0) + xp;
}

console.log("XP to backfill per user:", userXpMap);

// Reset xp to 0 then set correctly (to avoid double-applying)
const users = await prisma.user.findMany({
  select: { id: true, username: true, xp: true },
});

let updated = 0;
for (const user of users) {
  const earnedXp = userXpMap[user.id] ?? 0;
  if (earnedXp !== user.xp) {
    // Set xp = earnedXp (replacing whatever is currently stored since it was always 0)
    await prisma.user.update({
      where: { id: user.id },
      data: { xp: earnedXp },
    });
    console.log(`  ${user.username}: xp ${user.xp} → ${earnedXp}`);
    updated++;
  }
}

console.log(`\nDone. Updated ${updated} users.`);
await prisma.$disconnect();
