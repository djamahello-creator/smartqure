-- ============================================================
-- SmartQure — Fix Reports Table RLS (row-level security error)
-- Run in Supabase > SQL Editor
-- ============================================================

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
  CREATE POLICY "Users can insert own reports"
    ON reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  RAISE NOTICE 'Policy OK: reports INSERT';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (reports INSERT): %', SQLERRM;
END $$;

-- Users can view their own reports
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own reports" ON reports;
  CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    USING (auth.uid() = user_id);
  RAISE NOTICE 'Policy OK: reports SELECT';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (reports SELECT): %', SQLERRM;
END $$;
