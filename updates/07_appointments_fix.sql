-- ════════════════════════════════════════════════════════════════════════════
-- 07_appointments_fix.sql
-- Fixes the appointments table creation that failed in 06_launch_schema_reconciliation.sql
-- because clinician_profiles and triage_sessions did not exist yet.
--
-- Run this in Supabase SQL Editor AFTER 06_launch_schema_reconciliation.sql
-- ════════════════════════════════════════════════════════════════════════════


-- ── STEP 1: Stub tables that appointments will reference ──────────────────

-- clinician_profiles — SmartQure internal; minimal stub for now
CREATE TABLE IF NOT EXISTS clinician_profiles (
  id              UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name       TEXT  NOT NULL,
  specialty       TEXT,
  bio             TEXT,
  avatar_url      TEXT,
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- triage_sessions — used by AI triage flow; stub so FK is valid
CREATE TABLE IF NOT EXISTS triage_sessions (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID  REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);


-- ── STEP 2: Drop leftover broken appointments table (if it exists) ────────
-- The CREATE TABLE in migration 06 may have partially failed.
-- Drop cleanly so we can recreate.
DROP TABLE IF EXISTS appointments CASCADE;


-- ── STEP 3: Recreate appointments with all FK references now valid ────────
CREATE TABLE appointments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Patient identity (auth user, no separate patients table needed)
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Service and location (FKs added below, after confirming tables exist)
  service_id          UUID,
  location_id         UUID,

  -- Assigned clinician (nullable — SmartQure team assigns after booking)
  clinician_id        UUID        REFERENCES clinician_profiles(id) ON DELETE SET NULL,

  -- Triage context
  triage_session_id   UUID        REFERENCES triage_sessions(id) ON DELETE SET NULL,

  -- Appointment details
  appointment_type    TEXT        NOT NULL DEFAULT 'video'
                      CHECK (appointment_type IN ('video','audio','in_person','chat')),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration_minutes    INTEGER     DEFAULT 30,
  status              TEXT        NOT NULL DEFAULT 'pending'
                      CHECK (status IN (
                        'pending','confirmed','in_progress',
                        'completed','cancelled','no_show','rescheduled'
                      )),
  chief_complaint     TEXT,
  notes               TEXT,
  cancellation_reason TEXT,
  cancelled_by        TEXT        CHECK (cancelled_by IN ('patient','clinician','system')),

  -- Payment
  fee_usd             NUMERIC(8,2) DEFAULT 0,
  paid                BOOLEAN      DEFAULT FALSE,
  payment_method      TEXT,
  payment_reference   TEXT,

  -- Video consult
  video_room_url      TEXT,

  -- Reminder
  reminder_sent       BOOLEAN      DEFAULT FALSE,

  created_at          TIMESTAMPTZ  DEFAULT now(),
  updated_at          TIMESTAMPTZ  DEFAULT now()
);


-- ── STEP 4: Add FK constraints to services_catalogue and service_locations ─
-- These tables were created in migration 06 so they should exist now.

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_service
  FOREIGN KEY (service_id) REFERENCES services_catalogue(id) ON DELETE SET NULL;

ALTER TABLE appointments
  ADD CONSTRAINT fk_appointments_location
  FOREIGN KEY (location_id) REFERENCES service_locations(id) ON DELETE SET NULL;


-- ── STEP 5: Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_user       ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinician  ON appointments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled  ON appointments(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status     ON appointments(status);


-- ── STEP 6: Enable RLS ────────────────────────────────────────────────────
ALTER TABLE appointments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_sessions    ENABLE ROW LEVEL SECURITY;


-- ── STEP 7: RLS Policies ─────────────────────────────────────────────────

-- appointments: patients can only see/edit their own
DO $$ BEGIN
  DROP POLICY IF EXISTS "appointments_select_own"  ON appointments;
  DROP POLICY IF EXISTS "appointments_insert_own"  ON appointments;
  DROP POLICY IF EXISTS "appointments_update_own"  ON appointments;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY "appointments_select_own" ON appointments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "appointments_insert_own" ON appointments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "appointments_update_own" ON appointments
  FOR UPDATE USING (auth.uid() = user_id);

-- clinician_profiles: readable by all authenticated users
DO $$ BEGIN
  DROP POLICY IF EXISTS "clinician_profiles_select_all" ON clinician_profiles;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY "clinician_profiles_select_all" ON clinician_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- triage_sessions: own rows only
DO $$ BEGIN
  DROP POLICY IF EXISTS "triage_sessions_select_own"  ON triage_sessions;
  DROP POLICY IF EXISTS "triage_sessions_insert_own"  ON triage_sessions;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE POLICY "triage_sessions_select_own" ON triage_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "triage_sessions_insert_own" ON triage_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ── STEP 8: updated_at trigger for appointments ───────────────────────────
DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ════════════════════════════════════════════════════════════════════════════
-- Done. appointments table is now properly created with all FKs in place.
-- ════════════════════════════════════════════════════════════════════════════
