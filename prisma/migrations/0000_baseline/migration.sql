-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "HealthCheck" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Associate" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "readinessStatus" TEXT,
    "recommendedArea" TEXT,
    "lastComputedAt" TIMESTAMP(3),

    CONSTRAINT "Associate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "candidateName" TEXT,
    "interviewerName" TEXT,
    "date" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "selectedWeeks" JSONB NOT NULL,
    "overallTechnicalScore" DOUBLE PRECISION,
    "overallSoftSkillScore" DOUBLE PRECISION,
    "technicalFeedback" TEXT,
    "softSkillFeedback" TEXT,
    "questions" JSONB NOT NULL,
    "starterQuestions" JSONB NOT NULL,
    "assessments" JSONB NOT NULL,
    "techMap" JSONB,
    "associateId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GapScore" (
    "id" TEXT NOT NULL,
    "associateId" INTEGER NOT NULL,
    "skill" TEXT NOT NULL,
    "topic" TEXT NOT NULL DEFAULT '',
    "weightedScore" DOUBLE PRECISION NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GapScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "readinessThreshold" DOUBLE PRECISION NOT NULL DEFAULT 75,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Associate_slug_key" ON "Associate"("slug");

-- CreateIndex
CREATE INDEX "GapScore_associateId_idx" ON "GapScore"("associateId");

-- CreateIndex
CREATE UNIQUE INDEX "GapScore_associateId_skill_topic_key" ON "GapScore"("associateId", "skill", "topic");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GapScore" ADD CONSTRAINT "GapScore_associateId_fkey" FOREIGN KEY ("associateId") REFERENCES "Associate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
