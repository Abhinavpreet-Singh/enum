-- CreateTable
CREATE TABLE "question_competitions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "maxParticipants" INTEGER NOT NULL DEFAULT 10,
    "status" TEXT NOT NULL DEFAULT 'active',
    "winnerId" TEXT,
    "winnerUsername" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_competition_participants" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_competition_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "question_competitions_questionId_status_idx" ON "question_competitions"("questionId", "status");

-- CreateIndex
CREATE INDEX "question_competition_participants_competitionId_idx" ON "question_competition_participants"("competitionId");

-- CreateIndex
CREATE INDEX "question_competition_participants_userId_idx" ON "question_competition_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "question_competition_participants_competitionId_userId_key" ON "question_competition_participants"("competitionId", "userId");

-- AddForeignKey
ALTER TABLE "question_competitions" ADD CONSTRAINT "question_competitions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_competition_participants" ADD CONSTRAINT "question_competition_participants_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "question_competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_competition_participants" ADD CONSTRAINT "question_competition_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
