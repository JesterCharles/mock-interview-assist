-- Phase 36 — v1.4 Coding Challenges data model (CODING-MODEL-05).
--
-- Idempotent migration: `CREATE ... IF NOT EXISTS` + DO-block FK guards so
-- `prisma migrate deploy` is safe to re-run on production databases. Mirrors
-- the 0000_baseline pattern exactly.
--
-- Do NOT regenerate this file with `prisma migrate dev` — that command emits
-- non-idempotent DDL and will break container rebuilds.

-- ─────────────────────────────────────────────────────────────────────
-- CreateTable: CodingChallenge
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CodingChallenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "cohortId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingChallenge_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────
-- CreateTable: CodingAttempt
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CodingAttempt" (
    "id" TEXT NOT NULL,
    "associateId" INTEGER NOT NULL,
    "challengeId" TEXT NOT NULL,
    "submittedCode" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "verdict" TEXT NOT NULL DEFAULT 'pending',
    "visibleTestResults" JSONB NOT NULL DEFAULT '[]',
    "hiddenTestResults" JSONB NOT NULL DEFAULT '[]',
    "score" DOUBLE PRECISION,
    "judge0Token" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "CodingAttempt_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────
-- CreateTable: CodingTestCase
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CodingTestCase" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "stdin" TEXT NOT NULL,
    "expectedStdout" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CodingTestCase_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────
-- CreateTable: CodingSkillSignal
-- ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "CodingSkillSignal" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "mappedScore" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CodingSkillSignal_pkey" PRIMARY KEY ("id")
);

-- ─────────────────────────────────────────────────────────────────────
-- CreateIndex: CodingChallenge
-- ─────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "CodingChallenge_slug_key" ON "CodingChallenge"("slug");
CREATE INDEX IF NOT EXISTS "CodingChallenge_cohortId_idx" ON "CodingChallenge"("cohortId");
CREATE INDEX IF NOT EXISTS "CodingChallenge_skillSlug_idx" ON "CodingChallenge"("skillSlug");
CREATE INDEX IF NOT EXISTS "CodingChallenge_language_idx" ON "CodingChallenge"("language");

-- ─────────────────────────────────────────────────────────────────────
-- CreateIndex: CodingAttempt
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "CodingAttempt_associateId_idx" ON "CodingAttempt"("associateId");
CREATE INDEX IF NOT EXISTS "CodingAttempt_challengeId_idx" ON "CodingAttempt"("challengeId");
CREATE INDEX IF NOT EXISTS "CodingAttempt_verdict_idx" ON "CodingAttempt"("verdict");
CREATE INDEX IF NOT EXISTS "CodingAttempt_submittedAt_idx" ON "CodingAttempt"("submittedAt");

-- ─────────────────────────────────────────────────────────────────────
-- CreateIndex: CodingTestCase
-- ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "CodingTestCase_challengeId_idx" ON "CodingTestCase"("challengeId");
CREATE INDEX IF NOT EXISTS "CodingTestCase_isHidden_idx" ON "CodingTestCase"("isHidden");

-- ─────────────────────────────────────────────────────────────────────
-- CreateIndex: CodingSkillSignal
-- ─────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "CodingSkillSignal_attemptId_key" ON "CodingSkillSignal"("attemptId");
CREATE INDEX IF NOT EXISTS "CodingSkillSignal_skillSlug_idx" ON "CodingSkillSignal"("skillSlug");

-- ─────────────────────────────────────────────────────────────────────
-- AddForeignKey — DO-block guarded (Postgres has no ADD CONSTRAINT IF NOT EXISTS)
-- ─────────────────────────────────────────────────────────────────────

-- CodingChallenge.cohortId → Cohort.id  (onDelete: SET NULL)
DO $$ BEGIN
  ALTER TABLE "CodingChallenge" ADD CONSTRAINT "CodingChallenge_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CodingAttempt.associateId → Associate.id  (onDelete: CASCADE)
DO $$ BEGIN
  ALTER TABLE "CodingAttempt" ADD CONSTRAINT "CodingAttempt_associateId_fkey"
    FOREIGN KEY ("associateId") REFERENCES "Associate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CodingAttempt.challengeId → CodingChallenge.id  (onDelete: RESTRICT)
DO $$ BEGIN
  ALTER TABLE "CodingAttempt" ADD CONSTRAINT "CodingAttempt_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "CodingChallenge"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CodingTestCase.challengeId → CodingChallenge.id  (onDelete: CASCADE)
DO $$ BEGIN
  ALTER TABLE "CodingTestCase" ADD CONSTRAINT "CodingTestCase_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "CodingChallenge"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CodingSkillSignal.attemptId → CodingAttempt.id  (onDelete: CASCADE, @unique)
DO $$ BEGIN
  ALTER TABLE "CodingSkillSignal" ADD CONSTRAINT "CodingSkillSignal_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "CodingAttempt"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
