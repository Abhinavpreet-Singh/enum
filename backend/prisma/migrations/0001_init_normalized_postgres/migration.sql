-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "refreshToken" TEXT,
    "displayName" TEXT,
    "bio" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT 'Student',
    "location" TEXT NOT NULL DEFAULT '',
    "resume" TEXT NOT NULL DEFAULT '',
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "github" TEXT NOT NULL DEFAULT '',
    "linkedin" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "provider" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "browserXpClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "systemDesignXpClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "incidentXpClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "questionXpClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "simulationXpClaims" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_certs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_certs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userxpawards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "awardKey" TEXT NOT NULL,
    "xpAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "userxpawards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "useractivitylogs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceTitle" TEXT NOT NULL DEFAULT '',
    "outcome" TEXT NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "maxScore" INTEGER,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "useractivitylogs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "refreshToken" TEXT,
    "website" TEXT NOT NULL DEFAULT '',
    "industry" TEXT NOT NULL DEFAULT '',
    "size" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "logo" TEXT NOT NULL DEFAULT '',
    "approvalStatus" TEXT NOT NULL DEFAULT 'pending',
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "accountType" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "accessTokenHash" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "userAgent" TEXT NOT NULL DEFAULT '',
    "ipAddress" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_otp_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "duration" INTEGER NOT NULL DEFAULT 60,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "maxAttempts" INTEGER NOT NULL DEFAULT 1,
    "passingScore" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "accessType" TEXT NOT NULL DEFAULT 'public',
    "accessPassword" TEXT,
    "testCode" TEXT NOT NULL,
    "totalQuestions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessmentsettings" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "lockScreen" BOOLEAN NOT NULL DEFAULT false,
    "disableAltTab" BOOLEAN NOT NULL DEFAULT false,
    "disableWinKey" BOOLEAN NOT NULL DEFAULT false,
    "disableTaskSwitch" BOOLEAN NOT NULL DEFAULT false,
    "disableMultiMonitor" BOOLEAN NOT NULL DEFAULT false,
    "forceFullscreen" BOOLEAN NOT NULL DEFAULT false,
    "requireDesktopApp" BOOLEAN NOT NULL DEFAULT false,
    "requireScreenShare" BOOLEAN NOT NULL DEFAULT false,
    "recordScreen" BOOLEAN NOT NULL DEFAULT false,
    "periodicScreenshots" BOOLEAN NOT NULL DEFAULT false,
    "liveMonitoring" BOOLEAN NOT NULL DEFAULT false,
    "requireWebcam" BOOLEAN NOT NULL DEFAULT false,
    "recordWebcam" BOOLEAN NOT NULL DEFAULT false,
    "faceDetection" BOOLEAN NOT NULL DEFAULT false,
    "multipleFaceDetection" BOOLEAN NOT NULL DEFAULT false,
    "phoneDetection" BOOLEAN NOT NULL DEFAULT false,
    "eyeTracking" BOOLEAN NOT NULL DEFAULT false,
    "requireMicrophone" BOOLEAN NOT NULL DEFAULT false,
    "recordAudio" BOOLEAN NOT NULL DEFAULT false,
    "voiceDetection" BOOLEAN NOT NULL DEFAULT false,
    "copyPasteDetection" BOOLEAN NOT NULL DEFAULT true,
    "typingPatternAnalysis" BOOLEAN NOT NULL DEFAULT false,
    "aiDetection" BOOLEAN NOT NULL DEFAULT false,
    "devToolsDetection" BOOLEAN NOT NULL DEFAULT true,
    "vmDetection" BOOLEAN NOT NULL DEFAULT false,
    "remoteDesktopDetection" BOOLEAN NOT NULL DEFAULT false,
    "allowInternet" BOOLEAN NOT NULL DEFAULT false,
    "allowExternalSites" BOOLEAN NOT NULL DEFAULT false,
    "whitelistDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "assessmentsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionbanks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionbanks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bankquestions" (
    "id" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "correctAnswer" JSONB,
    "codeTemplate" TEXT,
    "functionName" TEXT,
    "parameterTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "returnType" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "technology" TEXT NOT NULL DEFAULT '',
    "topic" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bankquestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_question_options" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bank_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_question_test_cases" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB,
    "expectedOutput" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "bank_question_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessmentquestions" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "bankQuestionId" TEXT,
    "simulationId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 10,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "assessmentquestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessmentinvites" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rollNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessmentinvites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidateattempts" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "rollNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "suspicionLevel" TEXT NOT NULL DEFAULT 'low',

    CONSTRAINT "candidateattempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_attempt_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,

    CONSTRAINT "candidate_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_attempt_code_submissions" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,

    CONSTRAINT "candidate_attempt_code_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "violations" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL DEFAULT 'low',
    "metadata" JSONB,

    CONSTRAINT "violations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "desc" TEXT,
    "level" TEXT NOT NULL DEFAULT 'Easy',
    "constraints" TEXT,
    "topic" TEXT,
    "functionName" TEXT NOT NULL,
    "parameterNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "parameterTypes" TEXT[],
    "returnType" TEXT NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_test_cases" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB NOT NULL,
    "expectedOutput" TEXT NOT NULL,

    CONSTRAINT "question_test_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_initial_codes" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "question_initial_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linuxquestions" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'easy',
    "starterCode" TEXT NOT NULL DEFAULT '#!/usr/bin/env bash
# Write your command here',
    "expectedOutput" TEXT NOT NULL DEFAULT '',
    "constraints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT NOT NULL DEFAULT 'bash',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "linuxquestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "linux_question_examples" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "input" TEXT NOT NULL DEFAULT '',
    "output" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "linux_question_examples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solutions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'javascript',
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'python',
    "verdict" TEXT NOT NULL DEFAULT 'wrong_answer',
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "runtime" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "editorials" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "intuition" TEXT,
    "approach" TEXT,
    "algorithm" TEXT,
    "code" TEXT,
    "timeComplexity" TEXT,
    "spaceComplexity" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "editorials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'easy',
    "description" TEXT NOT NULL,
    "incident" TEXT NOT NULL,
    "solution" JSONB NOT NULL DEFAULT '{}',
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedTime" INTEGER NOT NULL DEFAULT 15,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "xpReward" INTEGER NOT NULL DEFAULT 50,
    "entryFile" TEXT NOT NULL DEFAULT 'index.js',
    "expectedOutput" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_steps" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "simulation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulation_files" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "path" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'javascript',
    "cloudinaryUrl" TEXT NOT NULL DEFAULT '',
    "cloudinaryPublicId" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "simulation_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usersimulationprogresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "modifiedFiles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usersimulationprogresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemdesignsimulations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "maxScore" INTEGER NOT NULL DEFAULT 10,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "templateUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systemdesignsimulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_design_evaluation_rules" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL,
    "requiredComponent" TEXT NOT NULL DEFAULT '',
    "requiredEdge" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "system_design_evaluation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "systemdesignsubmissions" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nodes" JSONB NOT NULL,
    "edges" JSONB NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    "replayEvents" JSONB,
    "score" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "systemdesignsubmissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_design_feedback_items" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "rule" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "system_design_feedback_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidenttimelineevents" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "timeSecond" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "affectedServices" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metricChanges" JSONB NOT NULL DEFAULT '{}',
    "logMessage" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT 'info',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidenttimelineevents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidentsimulations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT NOT NULL DEFAULT 'incident',
    "simulationType" TEXT NOT NULL DEFAULT 'production',
    "durationSeconds" INTEGER NOT NULL DEFAULT 300,
    "estimatedTime" INTEGER NOT NULL DEFAULT 15,
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "initialLogs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "realIncidentName" TEXT NOT NULL DEFAULT '',
    "realIncidentDate" TEXT NOT NULL DEFAULT '',
    "realIncidentLink" TEXT NOT NULL DEFAULT '',
    "realIncidentDesc" TEXT NOT NULL DEFAULT '',
    "revealTitle" TEXT NOT NULL DEFAULT 'Based on...',
    "revealText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidentsimulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_services" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "serviceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "color" TEXT NOT NULL DEFAULT 'green',

    CONSTRAINT "incident_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_root_cause_options" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "optionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "hint" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "incident_root_cause_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_action_options" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "actionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "fixesMetrics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recoveryTime" INTEGER NOT NULL DEFAULT 30,
    "pointsIfCorrect" INTEGER NOT NULL DEFAULT 50,
    "pointsIfWrong" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "incident_action_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_metric_series" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,

    CONSTRAINT "incident_metric_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_metric_snapshots" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL DEFAULT 0,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "incident_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidentsessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "elapsedTime" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "xpAwarded" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "selectedRootCauseId" TEXT NOT NULL DEFAULT '',
    "diagnosedAt" TIMESTAMP(3),
    "correctDiagnosis" BOOLEAN NOT NULL DEFAULT false,
    "diagnosticScore" INTEGER NOT NULL DEFAULT 0,
    "actionScore" INTEGER NOT NULL DEFAULT 0,
    "timeBonusScore" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidentsessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_session_actions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "actionKey" TEXT NOT NULL,
    "timestamp" INTEGER NOT NULL DEFAULT 0,
    "effective" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "incident_session_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidentsessionstates" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "currentTime" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "logs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activeAlerts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidentsessionstates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_session_services" (
    "id" TEXT NOT NULL,
    "sessionStateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "serviceKey" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "color" TEXT NOT NULL DEFAULT 'green',

    CONSTRAINT "incident_session_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenancepages" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT 'This page is currently under maintenance. Please check back later.',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenancepages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platformsettings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT '',
    "group" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platformsettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premiumproducts" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'track',
    "trackKey" TEXT NOT NULL DEFAULT '',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priceInrPaise" INTEGER NOT NULL DEFAULT 0,
    "priceUsdCents" INTEGER NOT NULL DEFAULT 0,
    "freeItemQuota" INTEGER NOT NULL DEFAULT 0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premiumproducts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "userentitlements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'track',
    "trackKey" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'purchase',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "paymentOrderId" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "userentitlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymentorders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "razorpayPaymentId" TEXT NOT NULL DEFAULT '',
    "razorpaySignature" TEXT NOT NULL DEFAULT '',
    "receipt" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paymentorders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymentevents" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "paymentOrderId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'razorpay',
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paymentevents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "audience" TEXT NOT NULL DEFAULT 'all',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditlogs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "targetName" TEXT NOT NULL DEFAULT '',
    "detail" TEXT NOT NULL DEFAULT '',
    "adminEmail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditlogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "user_certs_userId_idx" ON "user_certs"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "userxpawards_userId_awardKey_key" ON "userxpawards"("userId", "awardKey");

-- CreateIndex
CREATE INDEX "useractivitylogs_userId_createdAt_idx" ON "useractivitylogs"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_accountType_idx" ON "password_reset_tokens"("email", "accountType");

-- CreateIndex
CREATE INDEX "password_reset_tokens_accountType_accountId_idx" ON "password_reset_tokens"("accountType", "accountId");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_email_key" ON "organizations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_organizationId_idx" ON "sessions"("organizationId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_accessTokenExpiresAt_idx" ON "sessions"("accessTokenExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "assessments_testCode_key" ON "assessments"("testCode");

-- CreateIndex
CREATE INDEX "assessments_organizationId_idx" ON "assessments"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "assessmentsettings_assessmentId_key" ON "assessmentsettings"("assessmentId");

-- CreateIndex
CREATE INDEX "questionbanks_organizationId_idx" ON "questionbanks"("organizationId");

-- CreateIndex
CREATE INDEX "bankquestions_bankId_idx" ON "bankquestions"("bankId");

-- CreateIndex
CREATE INDEX "bank_question_options_questionId_idx" ON "bank_question_options"("questionId");

-- CreateIndex
CREATE INDEX "bank_question_test_cases_questionId_idx" ON "bank_question_test_cases"("questionId");

-- CreateIndex
CREATE INDEX "assessmentquestions_assessmentId_idx" ON "assessmentquestions"("assessmentId");

-- CreateIndex
CREATE INDEX "assessmentinvites_assessmentId_idx" ON "assessmentinvites"("assessmentId");

-- CreateIndex
CREATE INDEX "candidateattempts_assessmentId_idx" ON "candidateattempts"("assessmentId");

-- CreateIndex
CREATE INDEX "candidateattempts_userId_idx" ON "candidateattempts"("userId");

-- CreateIndex
CREATE INDEX "candidate_attempt_answers_attemptId_idx" ON "candidate_attempt_answers"("attemptId");

-- CreateIndex
CREATE INDEX "candidate_attempt_code_submissions_attemptId_idx" ON "candidate_attempt_code_submissions"("attemptId");

-- CreateIndex
CREATE INDEX "violations_attemptId_idx" ON "violations"("attemptId");

-- CreateIndex
CREATE INDEX "question_test_cases_questionId_idx" ON "question_test_cases"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "question_initial_codes_questionId_language_key" ON "question_initial_codes"("questionId", "language");

-- CreateIndex
CREATE UNIQUE INDEX "linuxquestions_slug_key" ON "linuxquestions"("slug");

-- CreateIndex
CREATE INDEX "linux_question_examples_questionId_idx" ON "linux_question_examples"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "editorials_questionId_key" ON "editorials"("questionId");

-- CreateIndex
CREATE INDEX "simulation_steps_simulationId_idx" ON "simulation_steps"("simulationId");

-- CreateIndex
CREATE INDEX "simulation_files_simulationId_idx" ON "simulation_files"("simulationId");

-- CreateIndex
CREATE UNIQUE INDEX "usersimulationprogresses_userId_simulationId_key" ON "usersimulationprogresses"("userId", "simulationId");

-- CreateIndex
CREATE INDEX "system_design_evaluation_rules_simulationId_idx" ON "system_design_evaluation_rules"("simulationId");

-- CreateIndex
CREATE INDEX "system_design_feedback_items_submissionId_idx" ON "system_design_feedback_items"("submissionId");

-- CreateIndex
CREATE INDEX "incidenttimelineevents_incidentId_idx" ON "incidenttimelineevents"("incidentId");

-- CreateIndex
CREATE INDEX "incident_services_incidentId_idx" ON "incident_services"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_services_incidentId_serviceKey_key" ON "incident_services"("incidentId", "serviceKey");

-- CreateIndex
CREATE INDEX "incident_root_cause_options_incidentId_idx" ON "incident_root_cause_options"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_root_cause_options_incidentId_optionKey_key" ON "incident_root_cause_options"("incidentId", "optionKey");

-- CreateIndex
CREATE INDEX "incident_action_options_incidentId_idx" ON "incident_action_options"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_action_options_incidentId_actionKey_key" ON "incident_action_options"("incidentId", "actionKey");

-- CreateIndex
CREATE INDEX "incident_metric_series_incidentId_idx" ON "incident_metric_series"("incidentId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_metric_series_incidentId_metricName_key" ON "incident_metric_series"("incidentId", "metricName");

-- CreateIndex
CREATE INDEX "incident_metric_snapshots_seriesId_timestamp_idx" ON "incident_metric_snapshots"("seriesId", "timestamp");

-- CreateIndex
CREATE INDEX "incidentsessions_userId_incidentId_idx" ON "incidentsessions"("userId", "incidentId");

-- CreateIndex
CREATE INDEX "incident_session_actions_sessionId_idx" ON "incident_session_actions"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "incidentsessionstates_sessionId_key" ON "incidentsessionstates"("sessionId");

-- CreateIndex
CREATE INDEX "incident_session_services_sessionStateId_idx" ON "incident_session_services"("sessionStateId");

-- CreateIndex
CREATE UNIQUE INDEX "incident_session_services_sessionStateId_serviceKey_key" ON "incident_session_services"("sessionStateId", "serviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "maintenancepages_path_key" ON "maintenancepages"("path");

-- CreateIndex
CREATE INDEX "maintenancepages_enabled_idx" ON "maintenancepages"("enabled");

-- CreateIndex
CREATE UNIQUE INDEX "platformsettings_key_key" ON "platformsettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "premiumproducts_slug_key" ON "premiumproducts"("slug");

-- CreateIndex
CREATE INDEX "premiumproducts_active_displayOrder_idx" ON "premiumproducts"("active", "displayOrder");

-- CreateIndex
CREATE INDEX "premiumproducts_kind_idx" ON "premiumproducts"("kind");

-- CreateIndex
CREATE INDEX "premiumproducts_trackKey_idx" ON "premiumproducts"("trackKey");

-- CreateIndex
CREATE INDEX "userentitlements_userId_active_idx" ON "userentitlements"("userId", "active");

-- CreateIndex
CREATE INDEX "userentitlements_trackKey_active_idx" ON "userentitlements"("trackKey", "active");

-- CreateIndex
CREATE UNIQUE INDEX "userentitlements_userId_scope_trackKey_key" ON "userentitlements"("userId", "scope", "trackKey");

-- CreateIndex
CREATE UNIQUE INDEX "paymentorders_razorpayOrderId_key" ON "paymentorders"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "paymentorders_receipt_key" ON "paymentorders"("receipt");

-- CreateIndex
CREATE INDEX "paymentorders_userId_status_idx" ON "paymentorders"("userId", "status");

-- CreateIndex
CREATE INDEX "paymentorders_productId_idx" ON "paymentorders"("productId");

-- CreateIndex
CREATE INDEX "paymentorders_createdAt_idx" ON "paymentorders"("createdAt");

-- CreateIndex
CREATE INDEX "paymentevents_eventType_createdAt_idx" ON "paymentevents"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "paymentevents_paymentOrderId_idx" ON "paymentevents"("paymentOrderId");

-- CreateIndex
CREATE INDEX "announcements_active_idx" ON "announcements"("active");

-- CreateIndex
CREATE INDEX "auditlogs_createdAt_idx" ON "auditlogs"("createdAt");

-- AddForeignKey
ALTER TABLE "user_certs" ADD CONSTRAINT "user_certs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userxpawards" ADD CONSTRAINT "userxpawards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "useractivitylogs" ADD CONSTRAINT "useractivitylogs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessmentsettings" ADD CONSTRAINT "assessmentsettings_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionbanks" ADD CONSTRAINT "questionbanks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bankquestions" ADD CONSTRAINT "bankquestions_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "questionbanks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_question_options" ADD CONSTRAINT "bank_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "bankquestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_question_test_cases" ADD CONSTRAINT "bank_question_test_cases_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "bankquestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessmentquestions" ADD CONSTRAINT "assessmentquestions_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessmentquestions" ADD CONSTRAINT "assessmentquestions_bankQuestionId_fkey" FOREIGN KEY ("bankQuestionId") REFERENCES "bankquestions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessmentquestions" ADD CONSTRAINT "assessmentquestions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessmentinvites" ADD CONSTRAINT "assessmentinvites_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidateattempts" ADD CONSTRAINT "candidateattempts_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidateattempts" ADD CONSTRAINT "candidateattempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_attempt_answers" ADD CONSTRAINT "candidate_attempt_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "candidateattempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_attempt_code_submissions" ADD CONSTRAINT "candidate_attempt_code_submissions_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "candidateattempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "violations" ADD CONSTRAINT "violations_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "candidateattempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_test_cases" ADD CONSTRAINT "question_test_cases_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_initial_codes" ADD CONSTRAINT "question_initial_codes_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "linux_question_examples" ADD CONSTRAINT "linux_question_examples_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "linuxquestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "editorials" ADD CONSTRAINT "editorials_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_steps" ADD CONSTRAINT "simulation_steps_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulation_files" ADD CONSTRAINT "simulation_files_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usersimulationprogresses" ADD CONSTRAINT "usersimulationprogresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usersimulationprogresses" ADD CONSTRAINT "usersimulationprogresses_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_design_evaluation_rules" ADD CONSTRAINT "system_design_evaluation_rules_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "systemdesignsimulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systemdesignsubmissions" ADD CONSTRAINT "systemdesignsubmissions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "systemdesignsimulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "systemdesignsubmissions" ADD CONSTRAINT "systemdesignsubmissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_design_feedback_items" ADD CONSTRAINT "system_design_feedback_items_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "systemdesignsubmissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidenttimelineevents" ADD CONSTRAINT "incidenttimelineevents_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidentsimulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_services" ADD CONSTRAINT "incident_services_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidentsimulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_root_cause_options" ADD CONSTRAINT "incident_root_cause_options_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidentsimulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_action_options" ADD CONSTRAINT "incident_action_options_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidentsimulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_metric_series" ADD CONSTRAINT "incident_metric_series_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidentsimulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_metric_snapshots" ADD CONSTRAINT "incident_metric_snapshots_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "incident_metric_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidentsessions" ADD CONSTRAINT "incidentsessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidentsessions" ADD CONSTRAINT "incidentsessions_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidentsimulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_session_actions" ADD CONSTRAINT "incident_session_actions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "incidentsessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidentsessionstates" ADD CONSTRAINT "incidentsessionstates_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "incidentsessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_session_services" ADD CONSTRAINT "incident_session_services_sessionStateId_fkey" FOREIGN KEY ("sessionStateId") REFERENCES "incidentsessionstates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userentitlements" ADD CONSTRAINT "userentitlements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userentitlements" ADD CONSTRAINT "userentitlements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "premiumproducts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "userentitlements" ADD CONSTRAINT "userentitlements_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "paymentorders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paymentorders" ADD CONSTRAINT "paymentorders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paymentorders" ADD CONSTRAINT "paymentorders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "premiumproducts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paymentevents" ADD CONSTRAINT "paymentevents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paymentevents" ADD CONSTRAINT "paymentevents_paymentOrderId_fkey" FOREIGN KEY ("paymentOrderId") REFERENCES "paymentorders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
