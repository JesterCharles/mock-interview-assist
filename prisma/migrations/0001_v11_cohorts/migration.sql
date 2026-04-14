-- Migration: v1.1 Cohorts
-- Additive only. Creates Cohort + CurriculumWeek, adds nullable FK/columns to Associate + Session.
-- Codex patches: Session.readinessRecomputeStatus (#5), CurriculumWeek.skillSlug + UNIQUE(cohortId, weekNumber) (#9).

-- CreateTable: Cohort
CREATE TABLE "Cohort" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable: CurriculumWeek
CREATE TABLE "CurriculumWeek" (
    "id" SERIAL NOT NULL,
    "cohortId" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "skillName" TEXT NOT NULL,
    "skillSlug" TEXT NOT NULL,
    "topicTags" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumWeek_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: CurriculumWeek
CREATE INDEX "CurriculumWeek_cohortId_idx" ON "CurriculumWeek"("cohortId");
CREATE UNIQUE INDEX "CurriculumWeek_cohortId_weekNumber_key" ON "CurriculumWeek"("cohortId", "weekNumber");

-- AlterTable: Associate — add nullable cohortId FK
ALTER TABLE "Associate" ADD COLUMN "cohortId" INTEGER;
CREATE INDEX "Associate_cohortId_idx" ON "Associate"("cohortId");

-- AlterTable: Session — add nullable cohortId, mode, readinessRecomputeStatus
ALTER TABLE "Session" ADD COLUMN "cohortId" INTEGER;
ALTER TABLE "Session" ADD COLUMN "mode" TEXT NOT NULL DEFAULT 'trainer-led';
ALTER TABLE "Session" ADD COLUMN "readinessRecomputeStatus" TEXT NOT NULL DEFAULT 'not_applicable';
CREATE INDEX "Session_cohortId_idx" ON "Session"("cohortId");
CREATE INDEX "Session_readinessRecomputeStatus_idx" ON "Session"("readinessRecomputeStatus");

-- AddForeignKey
ALTER TABLE "Associate" ADD CONSTRAINT "Associate_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Session" ADD CONSTRAINT "Session_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CurriculumWeek" ADD CONSTRAINT "CurriculumWeek_cohortId_fkey"
    FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Explicit backfill (belt-and-suspenders — ADD COLUMN ... DEFAULT already applies, but guard against NULLs)
UPDATE "Session" SET "mode" = 'trainer-led' WHERE "mode" IS NULL;
UPDATE "Session" SET "readinessRecomputeStatus" = 'not_applicable' WHERE "readinessRecomputeStatus" IS NULL;
