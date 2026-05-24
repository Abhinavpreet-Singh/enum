import prisma from "../src/db/index.js";

const migrate = async () => {
  try {
    // First, check what types of values are in browserXpClaims
    const browserXpClaimsSamples = await prisma.user.aggregateRaw({
      pipeline: [
        {
          $group: {
            _id: { $type: "$browserXpClaims" },
            count: { $sum: 1 },
            samples: { $push: "$browserXpClaims" },
          },
        },
      ],
    });

    console.log("browserXpClaims types found:", browserXpClaimsSamples);

    // Update all non-array browserXpClaims to empty arrays
    const updateResult = await prisma.$runCommandRaw({
      update: "users",
      updates: [
        {
          q: {
            $expr: {
              $not: [{ $isArray: "$browserXpClaims" }],
            },
          },
          u: [
            {
              $set: {
                browserXpClaims: [],
              },
            },
          ],
          multi: true,
        },
      ],
    });

    console.log("Update result:", updateResult);
    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

migrate();
