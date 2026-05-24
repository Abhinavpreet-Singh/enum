import prisma from "../src/db/index.js";

// Use raw to bypass null userId issue
const subAgg = await prisma.submission.aggregateRaw({
  pipeline: [{ $group: { _id: "$verdict", count: { $sum: 1 } } }],
});
console.log("Submission counts by verdict:", JSON.stringify(subAgg, null, 2));

const acceptedSample = await prisma.submission.aggregateRaw({
  pipeline: [
    { $match: { verdict: "accepted" } },
    { $limit: 3 },
    { $project: { userId: 1, questionId: 1, verdict: 1 } },
  ],
});
console.log("\nSample accepted subs:", JSON.stringify(acceptedSample, null, 2));

// Check collection names via listCollections
const collections = await prisma.$runCommandRaw({
  listCollections: 1,
  nameOnly: true,
});
console.log("\nCollections:", JSON.stringify(collections, null, 2));

await prisma.$disconnect();
