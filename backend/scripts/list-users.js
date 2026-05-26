import prisma from "../src/db/index.js";

const users = await prisma.user.findMany({
  select: {
    id: true,
    username: true,
    email: true,
    displayName: true,
    xp: true
  }
});

console.log("Total users in database:", users.length);
console.log("Users:", JSON.stringify(users.slice(0, 50), null, 2));

await prisma.$disconnect();
