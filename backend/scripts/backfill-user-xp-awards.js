/**
 * Lock incident (and other) XP retroactively so repeat completes cannot award again.
 * Run after prisma generate. Usage: node scripts/backfill-user-xp-awards.js
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.incidentSession.findMany({
    where: { OR: [{ xpAwarded: true }, { correctDiagnosis: true, isCompleted: true }] },
    select: { userId: true, incidentId: true, xpAwarded: true },
  });

  let created = 0;
  for (const s of sessions) {
    if (!s.xpAwarded) continue;
    const awardKey = `incident:${String(s.incidentId)}`;
    try {
      await prisma.userXpAward.create({
        data: {
          userId: s.userId,
          awardKey,
          xpAmount: 0,
        },
      });
      created += 1;
    } catch (e) {
      if (e?.code !== "P2002") throw e;
    }
  }

  const fromLogs = await prisma.userActivityLog.findMany({
    where: { xpEarned: { gt: 0 } },
    select: { userId: true, activityType: true, resourceId: true, xpEarned: true },
  });

  for (const log of fromLogs) {
    const prefix =
      log.activityType === "system_design"
        ? "sd"
        : log.activityType === "simulation"
          ? "sim"
          : log.activityType;
    const awardKey = `${prefix}:${String(log.resourceId)}`;
    try {
      await prisma.userXpAward.create({
        data: {
          userId: log.userId,
          awardKey,
          xpAmount: log.xpEarned,
        },
      });
      created += 1;
    } catch (e) {
      if (e?.code !== "P2002") throw e;
    }
  }

  console.log(`Backfill done. Created ${created} UserXpAward row(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
