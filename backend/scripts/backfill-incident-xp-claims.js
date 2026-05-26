/**
 * One-time: add incident IDs to user.incidentXpClaims for sessions that
 * already earned XP (xpAwarded) so repeat completes cannot award again.
 *
 * Usage (from backend/): node scripts/backfill-incident-xp-claims.js
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.incidentSession.findMany({
    where: { xpAwarded: true },
    select: { userId: true, incidentId: true },
  });

  const byUser = new Map();
  for (const s of sessions) {
    if (!byUser.has(s.userId)) byUser.set(s.userId, new Set());
    byUser.get(s.userId).add(s.incidentId);
  }

  let updated = 0;
  for (const [userId, incidentIds] of byUser) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { incidentXpClaims: true },
    });
    const existing = new Set(user?.incidentXpClaims ?? []);
    const toAdd = [...incidentIds].filter((id) => !existing.has(id));
    if (toAdd.length === 0) continue;

    await prisma.user.update({
      where: { id: userId },
      data: {
        incidentXpClaims: [...existing, ...toAdd],
      },
    });
    updated += 1;
    console.log(`User ${userId}: added ${toAdd.length} incident claim(s)`);
  }

  console.log(`Done. Updated ${updated} user(s) from ${sessions.length} session(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
