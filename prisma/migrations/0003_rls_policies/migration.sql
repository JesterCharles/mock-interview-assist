-- Migration: RLS Policies (Phase 20 — defense-in-depth)
-- Idempotent: ALTER TABLE ENABLE RLS is safe to re-run;
--   CREATE OR REPLACE FUNCTION handles the helper;
--   DROP IF EXISTS + CREATE pairs handle all 10 RLS policies (idempotent).
-- Prisma uses the service-role (BYPASSRLS via Transaction Pooler).
-- These policies guard direct supabase-js reads only.

-- ============================================================
-- STEP 1: Enable RLS on all five tables
-- ============================================================
ALTER TABLE "Associate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GapScore" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Cohort" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CurriculumWeek" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: is_trainer() helper — SECURITY DEFINER, idempotent
-- Reads user_metadata.role from JWT claim (no DB roundtrip).
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_trainer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'role') IN ('trainer', 'admin'),
    false
  )
$$;

-- ============================================================
-- STEP 3: Associate policies
--   SELECT: self (authUserId match) OR trainer
--   WRITE:  trainer only
-- ============================================================
DROP POLICY IF EXISTS "associate_select" ON "Associate";
CREATE POLICY "associate_select"
  ON "Associate"
  FOR SELECT
  USING (
    "authUserId" = auth.uid()::text
    OR public.is_trainer()
  );

DROP POLICY IF EXISTS "associate_write" ON "Associate";
CREATE POLICY "associate_write"
  ON "Associate"
  FOR ALL
  USING (public.is_trainer())
  WITH CHECK (public.is_trainer());

-- ============================================================
-- STEP 4: Session policies
--   SELECT: trainer OR owner (via Associate FK)
--   WRITE:  trainer only
-- ============================================================
DROP POLICY IF EXISTS "session_select" ON "Session";
CREATE POLICY "session_select"
  ON "Session"
  FOR SELECT
  USING (
    public.is_trainer()
    OR EXISTS (
      SELECT 1 FROM "Associate" a
      WHERE a.id = "Session"."associateId"
        AND a."authUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "session_write" ON "Session";
CREATE POLICY "session_write"
  ON "Session"
  FOR ALL
  USING (public.is_trainer())
  WITH CHECK (public.is_trainer());

-- ============================================================
-- STEP 5: GapScore policies
--   SELECT: trainer OR owner (via Associate FK)
--   WRITE:  trainer only
-- ============================================================
DROP POLICY IF EXISTS "gapscore_select" ON "GapScore";
CREATE POLICY "gapscore_select"
  ON "GapScore"
  FOR SELECT
  USING (
    public.is_trainer()
    OR EXISTS (
      SELECT 1 FROM "Associate" a
      WHERE a.id = "GapScore"."associateId"
        AND a."authUserId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "gapscore_write" ON "GapScore";
CREATE POLICY "gapscore_write"
  ON "GapScore"
  FOR ALL
  USING (public.is_trainer())
  WITH CHECK (public.is_trainer());

-- ============================================================
-- STEP 6: Cohort policies — trainer only (all operations)
-- ============================================================
DROP POLICY IF EXISTS "cohort_select" ON "Cohort";
CREATE POLICY "cohort_select"
  ON "Cohort"
  FOR SELECT
  USING (public.is_trainer());

DROP POLICY IF EXISTS "cohort_write" ON "Cohort";
CREATE POLICY "cohort_write"
  ON "Cohort"
  FOR ALL
  USING (public.is_trainer())
  WITH CHECK (public.is_trainer());

-- ============================================================
-- STEP 7: CurriculumWeek policies — trainer only (all operations)
-- ============================================================
DROP POLICY IF EXISTS "curriculumweek_select" ON "CurriculumWeek";
CREATE POLICY "curriculumweek_select"
  ON "CurriculumWeek"
  FOR SELECT
  USING (public.is_trainer());

DROP POLICY IF EXISTS "curriculumweek_write" ON "CurriculumWeek";
CREATE POLICY "curriculumweek_write"
  ON "CurriculumWeek"
  FOR ALL
  USING (public.is_trainer())
  WITH CHECK (public.is_trainer());
