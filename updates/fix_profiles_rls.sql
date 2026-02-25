-- ============================================================
-- SmartQure — Fix Profiles Table RLS (403 Error)
-- Run this in Supabase > SQL Editor
-- Safe to re-run at any time.
-- ============================================================

-- Step 1: Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Allow users to read their own profile row
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);
  RAISE NOTICE 'Policy OK: profiles SELECT';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (profiles SELECT): %', SQLERRM;
END $$;

-- Step 3: Allow users to update their own profile
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  RAISE NOTICE 'Policy OK: profiles UPDATE';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (profiles UPDATE): %', SQLERRM;
END $$;

-- Step 4: Allow new profile rows to be inserted (needed for sign-up trigger)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);
  RAISE NOTICE 'Policy OK: profiles INSERT';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (profiles INSERT): %', SQLERRM;
END $$;

-- Step 5: Check what columns your profiles table actually has
-- (useful for debugging — view output in Results tab)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'profiles'
ORDER BY ordinal_position;
