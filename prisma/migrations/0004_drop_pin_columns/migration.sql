-- Drop PIN auth columns (Phase 25: PIN removal after Supabase cutover)
ALTER TABLE "Associate" DROP COLUMN IF EXISTS "pinHash";
ALTER TABLE "Associate" DROP COLUMN IF EXISTS "pinGeneratedAt";
