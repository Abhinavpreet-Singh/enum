-- Race lobby settings + multi-question progress tracking
ALTER TABLE "question_competitions"
  ADD COLUMN IF NOT EXISTS "excludeTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "questionCount" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "includedQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "questionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "mode" TEXT NOT NULL DEFAULT 'first_solve',
  ADD COLUMN IF NOT EXISTS "durationSeconds" INTEGER,
  ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP(3);

-- Backfill questionIds from the primary question for existing races
UPDATE "question_competitions"
SET "questionIds" = ARRAY["questionId"]
WHERE "questionIds" IS NULL OR cardinality("questionIds") = 0;

CREATE TABLE IF NOT EXISTS "question_competition_solves" (
  "id" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_competition_solves_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "question_competition_solves_competitionId_userId_questionId_key"
  ON "question_competition_solves"("competitionId", "userId", "questionId");

CREATE INDEX IF NOT EXISTS "question_competition_solves_competitionId_userId_idx"
  ON "question_competition_solves"("competitionId", "userId");

CREATE INDEX IF NOT EXISTS "question_competition_solves_competitionId_questionId_idx"
  ON "question_competition_solves"("competitionId", "questionId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'question_competition_solves_competitionId_fkey'
  ) THEN
    ALTER TABLE "question_competition_solves"
      ADD CONSTRAINT "question_competition_solves_competitionId_fkey"
      FOREIGN KEY ("competitionId") REFERENCES "question_competitions"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
