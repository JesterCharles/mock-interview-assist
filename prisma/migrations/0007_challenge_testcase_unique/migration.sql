-- Phase 37 Plan 01 schema delta: composite unique key on CodingTestCase
-- Required by coding-challenge-service.syncChallengeToDb for (challengeId, id) upsert reconciliation.
-- Idempotent: uses DO-block guard so `prisma migrate deploy` is safe over pre-migration DBs.

DO $$ BEGIN
  ALTER TABLE "CodingTestCase"
    ADD CONSTRAINT "CodingTestCase_challengeId_id_key"
    UNIQUE ("challengeId", "id");
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN duplicate_table THEN NULL;
END $$;
