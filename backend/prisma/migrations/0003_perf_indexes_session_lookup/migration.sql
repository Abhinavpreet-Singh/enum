-- Performance migration: indexed refresh-token lookup + missing hot-path indexes.
--
-- Every statement is additive and guarded with IF NOT EXISTS. Nothing is dropped
-- and no existing row is rewritten, so this migration is idempotent and safe to
-- replay. It is written this way deliberately: the recorded migration history for
-- this project is incomplete (the users privacy columns were applied with
-- `prisma db push`), so this file must not assume any particular prior state.
--
-- LOCKING: plain CREATE INDEX holds a ShareLock that blocks writes to the table
-- while the index builds. At current data volumes each build is sub-second. If a
-- table has grown past a few million rows, run `concurrent_indexes.sql` in this
-- directory during low traffic instead, then mark this migration applied with
--   npx prisma migrate resolve --applied 0003_perf_indexes_session_lookup

-- ─── Session: O(1) refresh-token lookup ──────────────────────────────────────
-- Nullable on purpose: sessions that predate this column keep working via a
-- bounded legacy scan and backfill themselves on next rotation.
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "refreshTokenLookup" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "sessions_refreshTokenLookup_key"
  ON "sessions" ("refreshTokenLookup");

CREATE INDEX IF NOT EXISTS "sessions_userId_revoked_expiresAt_idx"
  ON "sessions" ("userId", "revoked", "expiresAt");

CREATE INDEX IF NOT EXISTS "sessions_organizationId_revoked_expiresAt_idx"
  ON "sessions" ("organizationId", "revoked", "expiresAt");

-- ─── Submission: per-user history + leaderboard aggregation ──────────────────
CREATE INDEX IF NOT EXISTS "submissions_userId_questionId_createdAt_idx"
  ON "submissions" ("userId", "questionId", "createdAt");

CREATE INDEX IF NOT EXISTS "submissions_userId_createdAt_idx"
  ON "submissions" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "submissions_questionId_idx"
  ON "submissions" ("questionId");

CREATE INDEX IF NOT EXISTS "submissions_verdict_userId_questionId_idx"
  ON "submissions" ("verdict", "userId", "questionId");

-- ─── Solution ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "solutions_questionId_createdAt_idx"
  ON "solutions" ("questionId", "createdAt");

CREATE INDEX IF NOT EXISTS "solutions_userId_createdAt_idx"
  ON "solutions" ("userId", "createdAt");

-- ─── System design submissions ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "systemdesignsubmissions_userId_simulationId_idx"
  ON "systemdesignsubmissions" ("userId", "simulationId");

CREATE INDEX IF NOT EXISTS "systemdesignsubmissions_userId_createdAt_idx"
  ON "systemdesignsubmissions" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "systemdesignsubmissions_simulationId_idx"
  ON "systemdesignsubmissions" ("simulationId");

-- ─── OTP verification (previously a full scan on every signup / reset) ───────
CREATE INDEX IF NOT EXISTS "otp_verifications_email_idx"
  ON "otp_verifications" ("email");

CREATE INDEX IF NOT EXISTS "otp_verifications_expiresAt_idx"
  ON "otp_verifications" ("expiresAt");

CREATE INDEX IF NOT EXISTS "organization_otp_verifications_email_idx"
  ON "organization_otp_verifications" ("email");

CREATE INDEX IF NOT EXISTS "organization_otp_verifications_expiresAt_idx"
  ON "organization_otp_verifications" ("expiresAt");

-- ─── Leaderboard ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "users_show_on_leaderboard_xp_idx"
  ON "users" ("show_on_leaderboard", "xp");

CREATE INDEX IF NOT EXISTS "usersimulationprogresses_solved_userId_idx"
  ON "usersimulationprogresses" ("solved", "userId");

-- ─── Activity log: admin analytics range + type aggregation ──────────────────
CREATE INDEX IF NOT EXISTS "useractivitylogs_createdAt_idx"
  ON "useractivitylogs" ("createdAt");

CREATE INDEX IF NOT EXISTS "useractivitylogs_activityType_createdAt_idx"
  ON "useractivitylogs" ("activityType", "createdAt");

-- ─── Assessment / candidate flows ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "assessments_organizationId_status_idx"
  ON "assessments" ("organizationId", "status");

CREATE INDEX IF NOT EXISTS "assessmentquestions_assessmentId_order_idx"
  ON "assessmentquestions" ("assessmentId", "order");

CREATE INDEX IF NOT EXISTS "assessmentquestions_bankQuestionId_idx"
  ON "assessmentquestions" ("bankQuestionId");

CREATE INDEX IF NOT EXISTS "candidateattempts_assessmentId_status_idx"
  ON "candidateattempts" ("assessmentId", "status");

CREATE INDEX IF NOT EXISTS "candidateattempts_assessmentId_email_idx"
  ON "candidateattempts" ("assessmentId", "email");

CREATE INDEX IF NOT EXISTS "assessmentinvites_assessmentId_email_idx"
  ON "assessmentinvites" ("assessmentId", "email");

CREATE INDEX IF NOT EXISTS "assessmentinvites_email_idx"
  ON "assessmentinvites" ("email");

CREATE INDEX IF NOT EXISTS "violations_attemptId_severity_idx"
  ON "violations" ("attemptId", "severity");
