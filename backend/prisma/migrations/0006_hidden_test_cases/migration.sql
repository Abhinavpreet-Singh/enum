-- Hidden (LeetCode-style) test cases: not shown on Run / examples, evaluated on Submit.

ALTER TABLE "question_test_cases" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bank_question_test_cases" ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false;

-- Match the previous judge behavior (Run used the first 3 cases; the rest were submit-only).
UPDATE "question_test_cases" SET "isHidden" = true WHERE "sortOrder" >= 3;
