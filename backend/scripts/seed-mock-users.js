import prisma from "../src/db/index.js";

const mockIndianUsers = [
  { name: "Aarav Sharma", username: "aaravsharma", email: "aarav.sharma01@gmail.com", xp: 2200 },
  { name: "Riya Kapoor", username: "riyakapoor", email: "riya.kapoor02@gmail.com", xp: 2120 },
  { name: "Vivaan Patel", username: "vivaanpatel", email: "vivaan.patel03@gmail.com", xp: 2050 },
  { name: "Anaya Gupta", username: "anayagupta", email: "anaya.gupta04@gmail.com", xp: 1980 },
  { name: "Krish Mehta", username: "krishmehta", email: "krish.mehta05@gmail.com", xp: 1900 },
  { name: "Ishita Verma", username: "ishitaverma", email: "ishita.verma06@gmail.com", xp: 1820 },
  { name: "Aditya Singh", username: "adityasingh", email: "aditya.singh07@gmail.com", xp: 1750 },
  { name: "Saanvi Jain", username: "saanvijain", email: "saanvi.jain08@gmail.com", xp: 1680 },
  { name: "Arjun Nair", username: "arjunnair", email: "arjun.nair09@gmail.com", xp: 1610 },
  { name: "Meera Iyer", username: "meeraiyer", email: "meera.iyer10@gmail.com", xp: 1540 },
  { name: "Rohan Malhotra", username: "rohanmalhotra", email: "rohan.malhotra11@gmail.com", xp: 1470 },
  { name: "Kavya Reddy", username: "kavyareddy", email: "kavya.reddy12@gmail.com", xp: 1400 },
  { name: "Siddharth Roy", username: "siddharthroy", email: "siddharth.roy13@gmail.com", xp: 1340 },
  { name: "Diya Chopra", username: "diyachopra", email: "diya.chopra14@gmail.com", xp: 1280 },
  { name: "Yash Kulkarni", username: "yashkulkarni", email: "yash.kulkarni15@gmail.com", xp: 1220 },
  { name: "Pragya Joshi", username: "pragyajoshi", email: "pragya.joshi16@gmail.com", xp: 1160 },
  { name: "Devansh Saxena", username: "devanshsaxena", email: "devansh.saxena17@gmail.com", xp: 1100 },
  { name: "Anjali Mishra", username: "anjalimishra", email: "anjali.mishra18@gmail.com", xp: 1040 },
  { name: "Tushar Choudhury", username: "tusharchoudhury", email: "tushar.choudhury19@gmail.com", xp: 980 },
  { name: "Tanvi Bhatia", username: "tanvibhatia", email: "tanvi.bhatia20@gmail.com", xp: 930 },
  { name: "Nehal Trivedi", username: "nehaltrivedi", email: "nehal.trivedi21@gmail.com", xp: 880 },
  { name: "Kabir Bansal", username: "kabirbansal", email: "kabir.bansal22@gmail.com", xp: 830 },
  { name: "Shruti Rao", username: "shrutirao", email: "shruti.rao23@gmail.com", xp: 780 },
  { name: "Reyansh Joshi", username: "reyanshjoshi", email: "reyansh.joshi24@gmail.com", xp: 730 },
  { name: "Kiara Sen", username: "kiarasen", email: "kiara.sen25@gmail.com", xp: 680 },
  { name: "Advait Deshmukh", username: "advaitdeshmukh", email: "advait.deshmukh26@gmail.com", xp: 630 },
  { name: "Avani Shah", username: "avanishah", email: "avani.shah27@gmail.com", xp: 580 },
  { name: "Madhav Verma", username: "madhavverma", email: "madhav.verma28@gmail.com", xp: 540 },
  { name: "Ishaan Dutta", username: "ishaandutta", email: "ishaan.dutta29@gmail.com", xp: 500 },
  { name: "Alisha Goel", username: "alishagoel", email: "alisha.goel30@gmail.com", xp: 460 },
  { name: "Ranveer Kapoor", username: "ranveerkapoor", email: "ranveer.kapoor31@gmail.com", xp: 420 },
  { name: "Myra Pandey", username: "myrapandey", email: "myra.pandey32@gmail.com", xp: 380 },
  { name: "Veer Khanna", username: "veerkhanna", email: "veer.khanna33@gmail.com", xp: 350 },
  { name: "Nikita Sarin", username: "nikitasarin", email: "nikita.sarin34@gmail.com", xp: 320 },
  { name: "Aryan Varma", username: "aryanvarma", email: "aryan.varma35@gmail.com", xp: 290 },
  { name: "Ridhima Sen", username: "ridhimasen", email: "ridhima.sen36@gmail.com", xp: 260 },
  { name: "Samar Singhal", username: "samarsinghal", email: "samar.singhal37@gmail.com", xp: 230 },
  { name: "Tara Nair", username: "taranair", email: "tara.nair38@gmail.com", xp: 200 },
  { name: "Neil Bhat", username: "neilbhat", email: "neil.bhat39@gmail.com", xp: 180 },
  { name: "Anya Shenoy", username: "anyashenoy", email: "anya.shenoy40@gmail.com", xp: 160 },
  { name: "Vivaan Dixit", username: "vivaandixit", email: "vivaan.dixit41@gmail.com", xp: 140 },
  { name: "Prisha Chawla", username: "prishachawla", email: "prisha.chawla42@gmail.com", xp: 120 },
  { name: "Aarush Seth", username: "aarushseth", email: "aarush.seth43@gmail.com", xp: 100 },
  { name: "Siya Wadhwa", username: "siyawadhwa", email: "siya.wadhwa44@gmail.com", xp: 80 },
  { name: "Hrithik Sobti", username: "hrithiksobti", email: "hrithik.sobti45@gmail.com", xp: 50 }
];

async function main() {
  console.log("Starting leaderboard seeding and backfilling...");

  // 1. Fetch questions and simulations to link attempts
  const questions = await prisma.question.findMany({ select: { id: true } });
  const simulations = await prisma.simulation.findMany({ select: { id: true } });

  console.log(`Found ${questions.length} questions and ${simulations.length} simulations in DB.`);

  // 2. Delete Western mock users (redundant ones)
  const usersToDelete = await prisma.user.findMany({
    where: { email: { endsWith: "@mockenum.com" } },
    select: { id: true }
  });
  const uids = usersToDelete.map(u => u.id);
  if (uids.length > 0) {
    console.log(`Deleting ${uids.length} Western mock users and their associated records...`);
    await prisma.submission.deleteMany({ where: { userId: { in: uids } } });
    await prisma.solution.deleteMany({ where: { userId: { in: uids } } });
    await prisma.userSimulationProgress.deleteMany({ where: { userId: { in: uids } } });
    await prisma.systemDesignSubmission.deleteMany({ where: { userId: { in: uids } } });
    await prisma.userActivityLog.deleteMany({ where: { userId: { in: uids } } });
    await prisma.userXpAward.deleteMany({ where: { userId: { in: uids } } });
    const deleteRes = await prisma.user.deleteMany({ where: { id: { in: uids } } });
    console.log(`Deleted ${deleteRes.count} user documents.`);
  }

  // 3. Populate Indian mock users
  console.log("Upserting Indian mock users...");
  const mockUsersInDb = [];

  for (const m of mockIndianUsers) {
    const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(m.name)}`;
    
    // Upsert user
    const user = await prisma.user.upsert({
      where: { email: m.email },
      update: {
        displayName: m.name,
        avatar: avatarUrl,
        xp: m.xp
      },
      create: {
        username: m.username,
        email: m.email,
        displayName: m.name,
        avatar: avatarUrl,
        xp: m.xp,
        role: "Student"
      }
    });

    mockUsersInDb.push(user);
  }
  console.log(`Seeded/Updated ${mockUsersInDb.length} Indian mock users.`);

  // 4. Backfill solved questions & simulations to match their XP
  console.log("Backfilling solved tasks to match XP...");
  
  const allUsers = await prisma.user.findMany();
  const realEmails = [
    "aroraabhinavpreetsingh@gmail.com",
    "triundphotos.02@gmail.com",
    "diveintoinfinity@gmail.com",
    "damanpreetk5162@gmail.com",
    "sakshamdhruvaggarwal123@gmail.com",
    "pratham1481.becse24@chitkara.edu.in"
  ];
  const usersToBackfill = allUsers.filter(u => !realEmails.includes(u.email));

  for (const user of usersToBackfill) {
    const targetXp = user.xp;

    // A user with higher XP should have solved more questions and simulations
    // We map: questions solved = min(totalQuestions, max(1, targetXp / 200))
    // We map: simulations solved = min(totalSimulations, max(1, targetXp / 250))
    const numQ = Math.min(questions.length, Math.max(1, Math.floor(targetXp / 200)));
    const numSim = Math.min(simulations.length, Math.max(1, Math.floor(targetXp / 250)));

    // Create accepted Submissions for this user if they don't already exist
    for (let i = 0; i < numQ; i++) {
      const q = questions[i];
      if (!q) continue;

      const existingSub = await prisma.submission.findFirst({
        where: { userId: user.id, questionId: q.id, verdict: "accepted" }
      });

      if (!existingSub) {
        await prisma.submission.create({
          data: {
            userId: user.id,
            questionId: q.id,
            code: "def solve():\n    pass # Seeding",
            language: "python",
            verdict: "accepted",
            passedCount: 10,
            totalCount: 10
          }
        });
      }
    }

    // Create solved SimulationProgress for this user if they don't already exist
    for (let i = 0; i < numSim; i++) {
      const sim = simulations[i];
      if (!sim) continue;

      const existingProgress = await prisma.userSimulationProgress.findUnique({
        where: {
          userId_simulationId: {
            userId: user.id,
            simulationId: sim.id
          }
        }
      });

      if (!existingProgress) {
        await prisma.userSimulationProgress.create({
          data: {
            userId: user.id,
            simulationId: sim.id,
            solved: true,
            attempts: 1,
            lastAttemptAt: new Date()
          }
        });
      } else if (!existingProgress.solved) {
        await prisma.userSimulationProgress.update({
          where: { id: existingProgress.id },
          data: { solved: true }
        });
      }
    }
  }

  console.log("Seeding and backfilling completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error running seed script:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
