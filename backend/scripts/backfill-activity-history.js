/**
 * Import past submissions into UserActivityLog (one-time).
 * Usage: node scripts/backfill-activity-history.js
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  let count = 0;

  const submissions = await prisma.submission.findMany({
    include: { question: { select: { title: true, level: true } } },
    orderBy: { createdAt: "asc" },
  });

  for (const s of submissions) {
    const outcome =
      s.verdict === "accepted"
        ? "correct"
        : s.verdict === "partial"
          ? "partial"
          : "incorrect";
    const award = await prisma.userXpAward.findUnique({
      where: {
        userId_awardKey: {
          userId: s.userId,
          awardKey: `dsa:${s.questionId}`,
        },
      },
    });
    await prisma.userActivityLog.create({
      data: {
        userId: s.userId,
        activityType: "dsa",
        resourceId: s.questionId,
        resourceTitle: s.question?.title ?? "DSA",
        outcome,
        xpEarned: award?.xpAmount ?? 0,
        score: s.passedCount,
        maxScore: s.totalCount,
        detail: `${s.verdict} (${s.passedCount}/${s.totalCount})`,
        createdAt: s.createdAt,
      },
    });
    count += 1;
  }

  const sdSubs = await prisma.systemDesignSubmission.findMany({
    include: { simulation: { select: { title: true } } },
    orderBy: { createdAt: "asc" },
  });

  for (const s of sdSubs) {
    const pct = s.maxScore > 0 ? (s.score / s.maxScore) * 100 : 0;
    const outcome = pct >= 100 ? "correct" : pct > 0 ? "partial" : "incorrect";
    const award = await prisma.userXpAward.findUnique({
      where: {
        userId_awardKey: {
          userId: s.userId,
          awardKey: `sd:${s.simulationId}`,
        },
      },
    });
    await prisma.userActivityLog.create({
      data: {
        userId: s.userId,
        activityType: "system_design",
        resourceId: s.simulationId,
        resourceTitle: s.simulation?.title ?? "System design",
        outcome,
        xpEarned: award?.xpAmount ?? 0,
        score: s.score,
        maxScore: s.maxScore,
        detail: `${s.score}/${s.maxScore}`,
        createdAt: s.createdAt,
      },
    });
    count += 1;
  }

  console.log(`Backfilled ${count} activity log entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
