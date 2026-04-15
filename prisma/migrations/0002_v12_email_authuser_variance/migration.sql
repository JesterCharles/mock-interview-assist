-- Migration: v1.2 Email + AuthUserId + AiTrainerVariance
-- Additive only. Adds four nullable columns. Idempotent (safe to rerun).
-- Prepares schema for Supabase auth (Phase 18) and analytics variance (Phase 22).

-- AlterTable: Associate — add nullable email, authUserId, lastInvitedAt
ALTER TABLE "Associate" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Associate" ADD COLUMN IF NOT EXISTS "authUserId" TEXT;
ALTER TABLE "Associate" ADD COLUMN IF NOT EXISTS "lastInvitedAt" TIMESTAMP(3);

-- Unique indexes — IF NOT EXISTS for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS "Associate_email_key" ON "Associate"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "Associate_authUserId_key" ON "Associate"("authUserId");

-- AlterTable: Session — add nullable aiTrainerVariance
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "aiTrainerVariance" DOUBLE PRECISION;
