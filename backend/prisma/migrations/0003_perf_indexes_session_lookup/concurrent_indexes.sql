-- Zero-downtime alternative to migration.sql for large tables.
--
-- CREATE INDEX CONCURRENTLY does not block writes, but it cannot run inside a
-- transaction — which is why Prisma cannot execute it and this file must be run
-- manually with psql:
--
--   psql "$DATABASE_URL" -f concurrent_indexes.sql
--   npx prisma migrate resolve --applied 0003_perf_indexes_session_lookup
--
-- Run the ALTER TABLE first; adding a nullable column with no default is a
-- metadata-only change and does not rewrite the table.
--
-- If a CONCURRENTLY build fails it leaves an INVALID index behind. Find them with:
--   SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;
-- then DROP INDEX and re-run that statement.

ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "refreshTokenLookup" TEXT;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "sessions_refreshTokenLookup_key"
  ON "sessions" ("refreshTokenLookup");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "sessions_userId_revoked_expiresAt_idx"
  ON "sessions" ("userId", "revoked", "expiresAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "sessions_organizationId_revoked_expiresAt_idx"
  ON "sessions" ("organizationId", "revoked", "expiresAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "submissions_userId_questionId_createdAt_idx"
  ON "submissions" ("userId", "questionId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "submissions_userId_createdAt_idx"
  ON "submissions" ("userId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "submissions_questionId_idx"
  ON "submissions" ("questionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "submissions_verdict_userId_questionId_idx"
  ON "submissions" ("verdict", "userId", "questionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "solutions_questionId_createdAt_idx"
  ON "solutions" ("questionId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "solutions_userId_createdAt_idx"
  ON "solutions" ("userId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "systemdesignsubmissions_userId_simulationId_idx"
  ON "systemdesignsubmissions" ("userId", "simulationId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "systemdesignsubmissions_userId_createdAt_idx"
  ON "systemdesignsubmissions" ("userId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "systemdesignsubmissions_simulationId_idx"
  ON "systemdesignsubmissions" ("simulationId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "otp_verifications_email_idx"
  ON "otp_verifications" ("email");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "otp_verifications_expiresAt_idx"
  ON "otp_verifications" ("expiresAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_otp_verifications_email_idx"
  ON "organization_otp_verifications" ("email");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "organization_otp_verifications_expiresAt_idx"
  ON "organization_otp_verifications" ("expiresAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_show_on_leaderboard_xp_idx"
  ON "users" ("show_on_leaderboard", "xp");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "usersimulationprogresses_solved_userId_idx"
  ON "usersimulationprogresses" ("solved", "userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "useractivitylogs_createdAt_idx"
  ON "useractivitylogs" ("createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "useractivitylogs_activityType_createdAt_idx"
  ON "useractivitylogs" ("activityType", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessments_organizationId_status_idx"
  ON "assessments" ("organizationId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessmentquestions_assessmentId_order_idx"
  ON "assessmentquestions" ("assessmentId", "order");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessmentquestions_bankQuestionId_idx"
  ON "assessmentquestions" ("bankQuestionId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "candidateattempts_assessmentId_status_idx"
  ON "candidateattempts" ("assessmentId", "status");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "candidateattempts_assessmentId_email_idx"
  ON "candidateattempts" ("assessmentId", "email");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessmentinvites_assessmentId_email_idx"
  ON "assessmentinvites" ("assessmentId", "email");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "assessmentinvites_email_idx"
  ON "assessmentinvites" ("email");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "violations_attemptId_severity_idx"
  ON "violations" ("attemptId", "severity");
