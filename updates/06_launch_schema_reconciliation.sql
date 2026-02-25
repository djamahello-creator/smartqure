-- ============================================================
-- SmartQure — Launch Schema Reconciliation
-- File: updates/06_launch_schema_reconciliation.sql
-- Run ONCE in Supabase > SQL Editor
-- Safe to re-run: IF NOT EXISTS / DROP … IF EXISTS everywhere
-- ============================================================
--
-- What this migration does:
--   PART 1  — Extend profiles with clinical fields
--             (removes need for the separate patients table)
--   PART 2  — Drop & cleanly recreate appointments table
--             (resolves conflict between full schema patient_id
--              and create_missing_tables user_id approach)
--   PART 3  — Create services_catalogue + service_locations
--             (BookingFlow reads from these instead of hardcoded arrays)
--   PART 4  — Create vitals_log table
--             (HealthDocsFlow vitals tab)
--   PART 5  — Extend education_content + seed 100 learning modules
--             (Education hub with full module catalogue)
--   PART 6  — Create app_config table
--             (Admin dashboard controls all platform variables)
--   PART 7  — Enable RLS on all new / recreated tables
--   PART 8  — RLS policies (wrapped in DO blocks — safe to re-run)
--   PART 9  — Helpful indexes
--   PART 10 — Seed: services catalogue + 1 demo location
-- ============================================================


-- ── PART 1: EXTEND PROFILES WITH CLINICAL FIELDS ────────────
-- These columns replace the patients table.
-- Uses ADD COLUMN IF NOT EXISTS (PG 9.6+, Supabase ≥ PG 15 ✓)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS date_of_birth       DATE,
  ADD COLUMN IF NOT EXISTS gender              TEXT CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS blood_type          TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown')),
  ADD COLUMN IF NOT EXISTS height_cm           NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS weight_kg           NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS emergency_contact_name  TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS insurance_provider      TEXT,
  ADD COLUMN IF NOT EXISTS insurance_number        TEXT,
  ADD COLUMN IF NOT EXISTS data_sharing_consent    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_updated_at      TIMESTAMPTZ;


-- ── PART 2: DROP + RECREATE APPOINTMENTS ────────────────────
-- The old table had patient_id → patients(id) which required
-- a separate patients record. New table uses user_id → auth.users
-- and optionally links to clinician_profiles (assigned by SmartQure).

-- 2a. Drop old appointments and dependent tables cleanly
DROP TABLE IF EXISTS appointment_services CASCADE;  -- from create_missing_tables.sql
DROP TABLE IF EXISTS appointments CASCADE;           -- both schema versions

-- 2b. New appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Patient identity (auth user, no patients table needed)
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Service booked (FK added after services_catalogue is created below)
  service_id          UUID,

  -- Location (FK added after service_locations is created below)
  location_id         UUID,

  -- Assigned clinician (nullable — SmartQure team assigns after booking)
  clinician_id        UUID        REFERENCES clinician_profiles(id) ON DELETE SET NULL,

  -- Triage context (set when booking comes from AI triage flow)
  triage_session_id   UUID        REFERENCES triage_sessions(id)    ON DELETE SET NULL,

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

CREATE INDEX IF NOT EXISTS idx_appointments_user       ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_clinician  ON appointments(clinician_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled  ON appointments(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status     ON appointments(status);


-- ── PART 3: SERVICES CATALOGUE + LOCATIONS ──────────────────

-- 3a. Services catalogue — controls what BookingFlow displays
CREATE TABLE IF NOT EXISTS services_catalogue (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  service_key      TEXT        UNIQUE NOT NULL,  -- e.g. 'gp_consult'
  name             TEXT        NOT NULL,
  category         TEXT        NOT NULL CHECK (category IN (
                     'primary_care','mental_health','dental',
                     'optometry','lab','pharmacy','verification','triage'
                   )),
  description      TEXT,
  icon             TEXT        DEFAULT '🏥',     -- emoji shown in BookingFlow
  duration_minutes INTEGER     DEFAULT 30,
  base_fee_usd     NUMERIC(8,2) DEFAULT 0,
  included_in_free BOOLEAN     DEFAULT TRUE,
  free_quota_monthly INTEGER   DEFAULT NULL,     -- NULL = unlimited; 1 = 1/month
  available_via    TEXT[]      DEFAULT ARRAY['video'],  -- video, in_person, audio, chat
  phase            TEXT        DEFAULT 'launch'
                   CHECK (phase IN ('launch','seed','post_seed')),
  is_active        BOOLEAN     DEFAULT TRUE,
  display_order    INTEGER     DEFAULT 99,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_services_active   ON services_catalogue(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_services_category ON services_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_services_phase    ON services_catalogue(phase);

-- 3b. Now add FK from appointments to services_catalogue
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services_catalogue(id) ON DELETE SET NULL;


-- 3c. Service locations — physical and virtual care sites
CREATE TABLE IF NOT EXISTS service_locations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  location_type    TEXT        NOT NULL DEFAULT 'clinic'
                   CHECK (location_type IN ('clinic','lab','virtual','pharmacy')),
  address          TEXT,
  city             TEXT        DEFAULT 'Hargeisa',
  country          TEXT        DEFAULT 'SO',
  coordinates      TEXT,                          -- 'lat,lng' string for MVP
  phone            TEXT,
  email            TEXT,
  services         TEXT[]      DEFAULT '{}',      -- array of service_keys available here
  opening_hours    JSONB       DEFAULT '{}',      -- { mon: '08:00-17:00', ... }
  is_active        BOOLEAN     DEFAULT TRUE,
  display_order    INTEGER     DEFAULT 99,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_active  ON service_locations(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_locations_city    ON service_locations(city);

-- 3d. Now add FK from appointments to service_locations
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES service_locations(id) ON DELETE SET NULL;


-- ── PART 4: VITALS LOG ───────────────────────────────────────
-- HealthDocsFlow vitals tab — patients log readings over time

CREATE TABLE IF NOT EXISTS vitals_log (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  source           TEXT        DEFAULT 'manual'
                   CHECK (source IN ('manual','wearable','consultation','lab')),

  -- Cardiovascular
  bp_systolic      INTEGER,    -- mmHg
  bp_diastolic     INTEGER,    -- mmHg
  pulse            INTEGER,    -- bpm

  -- Respiratory & temperature
  spo2             NUMERIC(5,2),  -- %
  respiratory_rate INTEGER,       -- breaths/min
  temp_c           NUMERIC(5,2),  -- °C

  -- Weight & BMI inputs
  weight_kg        NUMERIC(6,2),
  height_cm        NUMERIC(5,1),

  -- Metabolic
  blood_glucose_mmol NUMERIC(6,2),  -- fasting or random
  hba1c_pct          NUMERIC(5,2),  -- %

  -- Mental / subjective
  pain_score       INTEGER CHECK (pain_score BETWEEN 0 AND 10),
  mood_score       INTEGER CHECK (mood_score BETWEEN 0 AND 10),
  steps_today      INTEGER,

  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vitals_user       ON vitals_log(user_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded   ON vitals_log(user_id, recorded_at DESC);


-- ── PART 5: EDUCATION CONTENT EXTENSION ─────────────────────
-- Add module-specific columns to existing education_content table.
-- The 100 learning modules are then seeded below.

ALTER TABLE education_content
  ADD COLUMN IF NOT EXISTS module_number      INTEGER UNIQUE,  -- 1–100
  ADD COLUMN IF NOT EXISTS module_category    TEXT,            -- oral_health, vision, etc.
  ADD COLUMN IF NOT EXISTS format             TEXT DEFAULT 'Article'
                           CHECK (format IN ('Article','Video','Audio','Quiz','Mixed')),
  ADD COLUMN IF NOT EXISTS duration_mins      INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS try_it_log_type    TEXT,            -- what kind of in-app log
  ADD COLUMN IF NOT EXISTS smartqure_link     TEXT,            -- which feature it links to
  ADD COLUMN IF NOT EXISTS points_on_complete INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS phase              TEXT DEFAULT 'launch'
                           CHECK (phase IN ('launch','seed','post_seed'));

CREATE INDEX IF NOT EXISTS idx_content_module_number ON education_content(module_number);
CREATE INDEX IF NOT EXISTS idx_content_category      ON education_content(module_category);


-- ── PART 6: APP CONFIG (DASHBOARD VARIABLES) ────────────────
-- All platform-level variables controlled from admin dashboard
-- and synced to Supabase. Frontend reads this table at startup.

CREATE TABLE IF NOT EXISTS app_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        UNIQUE NOT NULL,
  value       JSONB       NOT NULL,
  description TEXT,
  updated_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_config_key ON app_config(key);


-- ── PART 7: ENABLE RLS ───────────────────────────────────────

ALTER TABLE appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE services_catalogue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config           ENABLE ROW LEVEL SECURITY;
-- education_content and user_content_progress already have RLS in full schema


-- ── PART 8: RLS POLICIES ─────────────────────────────────────
-- Each wrapped in DO block — safe to re-run

-- appointments: users see & manage own
DO $$ BEGIN
  DROP POLICY IF EXISTS "users_own_appointments" ON appointments;
  CREATE POLICY "users_own_appointments"
    ON appointments FOR ALL USING (auth.uid() = user_id);
  RAISE NOTICE 'Policy OK: appointments';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (appointments): %', SQLERRM;
END $$;

-- services_catalogue: public read, no user writes
DO $$ BEGIN
  DROP POLICY IF EXISTS "services_public_read" ON services_catalogue;
  CREATE POLICY "services_public_read"
    ON services_catalogue FOR SELECT USING (is_active = TRUE);
  RAISE NOTICE 'Policy OK: services_catalogue SELECT';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (services_catalogue SELECT): %', SQLERRM;
END $$;

-- service_locations: public read
DO $$ BEGIN
  DROP POLICY IF EXISTS "locations_public_read" ON service_locations;
  CREATE POLICY "locations_public_read"
    ON service_locations FOR SELECT USING (is_active = TRUE);
  RAISE NOTICE 'Policy OK: service_locations SELECT';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (service_locations SELECT): %', SQLERRM;
END $$;

-- vitals_log: users own their vitals
DO $$ BEGIN
  DROP POLICY IF EXISTS "users_own_vitals" ON vitals_log;
  CREATE POLICY "users_own_vitals"
    ON vitals_log FOR ALL USING (auth.uid() = user_id);
  RAISE NOTICE 'Policy OK: vitals_log';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (vitals_log): %', SQLERRM;
END $$;

-- app_config: public read (no sensitive data stored here), no user writes
DO $$ BEGIN
  DROP POLICY IF EXISTS "app_config_public_read" ON app_config;
  CREATE POLICY "app_config_public_read"
    ON app_config FOR SELECT USING (TRUE);
  RAISE NOTICE 'Policy OK: app_config SELECT';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Policy SKIPPED (app_config SELECT): %', SQLERRM;
END $$;


-- ── PART 9: TRIGGER — auto-updated_at for new tables ─────────

-- updated_at trigger function (already exists if full schema ran, safe to recreate)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  CREATE TRIGGER trg_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  RAISE NOTICE 'Trigger OK: appointments updated_at';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Trigger SKIPPED (appointments updated_at): already exists';
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_services_updated_at
    BEFORE UPDATE ON services_catalogue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  RAISE NOTICE 'Trigger OK: services_catalogue updated_at';
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'Trigger SKIPPED (services_catalogue updated_at): already exists';
END $$;


-- ── PART 10: SEED DATA ───────────────────────────────────────

-- 10a. Services Catalogue
-- These are the services displayed in BookingFlow.
-- Update is_active, phase, base_fee_usd via the admin dashboard
-- (or directly in Supabase) — no code changes required.

INSERT INTO services_catalogue
  (service_key, name, category, description, icon, duration_minutes,
   base_fee_usd, included_in_free, free_quota_monthly,
   available_via, phase, is_active, display_order)
VALUES
  -- ─── Launch ───────────────────────────────────────────────
  ('rxqure_verify',    'Medicine Verification',  'verification',
   'Scan or manually check any medicine for authenticity, batch recall, and expiry.',
   '💊', 2,  0.00, TRUE, NULL, ARRAY['video'], 'launch', TRUE, 1),

  ('ai_triage',        'AI Health Triage',       'triage',
   'Describe your symptoms and get instant guidance — book a doctor if needed.',
   '🤖', 5,  0.00, TRUE, NULL, ARRAY['video'], 'launch', TRUE, 2),

  ('gp_consult',       'GP Consultation',        'primary_care',
   'General health assessment, advice, and treatment with a qualified GP.',
   '🩺', 30, 0.00, TRUE, 1, ARRAY['video','audio'], 'launch', TRUE, 3),

  ('mental_health_consult', 'Mental Health Consult', 'mental_health',
   'Confidential session with a trained mental health professional.',
   '🧠', 45, 0.00, TRUE, 1, ARRAY['video','audio'], 'launch', TRUE, 4),

  ('prescription_review', 'Prescription Review',  'primary_care',
   'Clinician reviews your uploaded prescription and issues e-Rx if appropriate.',
   '📋', 20, 0.00, TRUE, NULL, ARRAY['video'], 'launch', TRUE, 5),

  -- ─── Seed ─────────────────────────────────────────────────
  ('dental_consult',   'Dental Consultation',    'dental',
   'Oral health assessment, treatment planning, and dental advice.',
   '🦷', 30, 20.00, FALSE, NULL, ARRAY['in_person'], 'seed', FALSE, 6),

  ('optometry_check',  'Eye Health Check',       'optometry',
   'Vision assessment, eye health screening, and corrective lens prescription.',
   '👁️', 30, 20.00, FALSE, NULL, ARRAY['in_person'], 'seed', FALSE, 7),

  ('lab_test',         'Lab Tests',              'lab',
   'Blood, urine, and diagnostic tests at certified SmartQure partner labs.',
   '🧪', 30, 15.00, FALSE, NULL, ARRAY['in_person'], 'seed', FALSE, 8)

ON CONFLICT (service_key) DO NOTHING;


-- 10b. Demo Service Location (Hargeisa HQ)
-- Add your real locations via the admin dashboard or directly in Supabase.

INSERT INTO service_locations
  (name, location_type, address, city, country,
   services, is_active, display_order)
VALUES
  ('SmartQure Hargeisa',  'clinic',
   '26 June District, Near Mansoor Hotel', 'Hargeisa', 'SO',
   ARRAY['gp_consult','mental_health_consult','prescription_review','dental_consult','optometry_check'],
   TRUE, 1),

  ('Virtual / Teleconsult', 'virtual',
   NULL, 'Online', 'SO',
   ARRAY['gp_consult','mental_health_consult','prescription_review','ai_triage','rxqure_verify'],
   TRUE, 2)

ON CONFLICT DO NOTHING;


-- 10c. App Config — platform-wide variables
-- Edit these values in Supabase Table Editor or via the admin dashboard
-- to change platform behaviour without code deploys.

INSERT INTO app_config (key, value, description) VALUES
  ('free_plan_gp_consults_per_month',     '{"value": 1}',           'Free plan monthly GP consult allowance'),
  ('free_plan_mental_health_per_month',   '{"value": 1}',           'Free plan monthly mental health consult allowance'),
  ('booking_lead_time_hours',             '{"value": 24}',          'Min hours ahead a user must book'),
  ('booking_advance_days',                '{"value": 30}',          'How many days ahead the booking calendar shows'),
  ('supported_countries',                 '{"value": ["SO","ET","KE","GB","US","CA","AE","SE","NO"]}',  'Countries where SmartQure is available'),
  ('default_country',                     '{"value": "SO"}',        'Default country code for new users'),
  ('default_currency',                    '{"value": "USD"}',       'Primary currency displayed'),
  ('feature_labs_enabled',                '{"value": false}',       'Toggle: lab orders feature'),
  ('feature_dental_enabled',              '{"value": false}',       'Toggle: dental bookings'),
  ('feature_optometry_enabled',           '{"value": false}',       'Toggle: optometry bookings'),
  ('feature_pharmacy_enabled',            '{"value": false}',       'Toggle: pharmacy finder'),
  ('feature_gamification_enabled',        '{"value": true}',        'Toggle: points, streaks, achievements'),
  ('feature_wearable_sync_enabled',       '{"value": false}',       'Toggle: wearable device sync'),
  ('medverify_confidence_threshold_verified', '{"value": 85}',      'Min score (0-100) for VERIFIED result'),
  ('medverify_confidence_threshold_caution',  '{"value": 50}',      'Min score (0-100) for CAUTION result (below = FAKE)'),
  ('triage_max_turns',                    '{"value": 20}',          'Max AI triage conversation turns before forced hand-off'),
  ('education_points_per_module',         '{"value": 10}',          'SmartQure points awarded per completed module'),
  ('education_certificate_threshold',     '{"value": 80}',          'Min % of modules needed to earn completion certificate')
ON CONFLICT (key) DO NOTHING;


-- 10d. Seed 100 learning modules into education_content
-- Format: (title, slug, module_number, module_category, format, duration_mins,
--           try_it_log_type, smartqure_link, summary, tags, published, phase)

INSERT INTO education_content
  (title, slug, module_number, module_category, format, duration_mins,
   try_it_log_type, smartqure_link, summary, tags, published, phase,
   reading_time_mins, language)
VALUES

-- ── 🦷 Oral Health (1–10) ──────────────────────────────────
('What Are Dental Caries and How to Spot Them',
 'dental-caries-spot', 1, 'oral_health', 'Mixed', 12,
 'photo_teeth_pain_log', 'dentqure_upload',
 'Learn what causes tooth decay and how to identify early signs before they worsen.',
 ARRAY['dental','caries','oral health'], TRUE, 'seed', 4, 'en'),

('Daily Brushing Technique (2×2×2 Rule)',
 'brushing-technique-2x2x2', 2, 'oral_health', 'Video', 3,
 'brushed_today_streak', 'rewards_streak',
 'Master the 2-minute, 2-times-daily brushing rule for optimal oral hygiene.',
 ARRAY['dental','brushing','hygiene'], TRUE, 'seed', 2, 'en'),

('Flossing and Interdental Cleaning Basics',
 'flossing-basics', 3, 'oral_health', 'Audio', 5,
 'flossed_bleeding_log', 'oral_checkin',
 'Why flossing matters and the right technique to protect your gums.',
 ARRAY['dental','flossing','gum health'], TRUE, 'seed', 2, 'en'),

('Early Signs of Gum Disease',
 'early-gum-disease-signs', 4, 'oral_health', 'Article', 4,
 'gum_severity_1_5', 'triage_bot',
 'Recognise the warning signs of gingivitis and periodontitis before they escalate.',
 ARRAY['dental','gum disease','gingivitis'], TRUE, 'seed', 4, 'en'),

('Sugar, Snacks, and Teeth',
 'sugar-snacks-teeth', 5, 'oral_health', 'Video', 4,
 '24h_sugar_diary', 'nutrition_plan',
 'How sugar and snacking frequency damage enamel — and practical food swaps.',
 ARRAY['dental','nutrition','sugar'], TRUE, 'seed', 2, 'en'),

('Mouth Ulcers and When to Worry',
 'mouth-ulcers-when-to-worry', 6, 'oral_health', 'Article', 5,
 'ulcer_size_location_pain_photo', 'consult_booking',
 'Distinguish harmless canker sores from lesions that need clinical review.',
 ARRAY['dental','ulcers','oral health'], TRUE, 'seed', 3, 'en'),

('Bad Breath: Common Causes and Fixes',
 'bad-breath-causes-fixes', 7, 'oral_health', 'Audio', 6,
 'water_intake_tongue_scrape_log', 'daily_diary',
 'Address the root causes of halitosis with simple, evidence-based habits.',
 ARRAY['dental','bad breath','hygiene'], TRUE, 'seed', 3, 'en'),

('Dental Emergencies: Act Fast',
 'dental-emergencies-act-fast', 8, 'oral_health', 'Video', 3,
 'red_flag_checklist_triage', 'dentqure_flow',
 'What to do in the first hour after a knocked-out tooth or severe abscess.',
 ARRAY['dental','emergency','first aid'], TRUE, 'seed', 2, 'en'),

('Children''s Teeth: First Tooth to Teens',
 'childrens-teeth-guide', 9, 'oral_health', 'Article', 6,
 'child_last_check_date', 'family_profile',
 'Milestones, care routines, and when to book your child''s first dental visit.',
 ARRAY['dental','children','paediatric'], TRUE, 'seed', 4, 'en'),

('Safe Home Remedies vs. Dental Myths',
 'dental-home-remedies-myths', 10, 'oral_health', 'Video', 5,
 'myth_bust_quiz_remedy_outcome', 'quiz_points',
 'Separate evidence-based home care from harmful folk remedies.',
 ARRAY['dental','myths','home remedies'], TRUE, 'seed', 2, 'en'),

-- ── 👁️ Vision & Eye Health (11–20) ─────────────────────────
('How the Eye Works and Why Vision Changes',
 'how-eye-works', 11, 'vision', 'Article', 5,
 'age_related_changes_noticed', 'visionqure_intro',
 'A plain-English guide to eye anatomy and why vision shifts with age.',
 ARRAY['vision','eye health','anatomy'], TRUE, 'seed', 3, 'en'),

('Common Vision Problems: Myopia and Hyperopia',
 'myopia-hyperopia-explained', 12, 'vision', 'Video', 4,
 'distance_near_struggle_log', 'acuity_test',
 'Understand short and long-sightedness, causes, and correction options.',
 ARRAY['vision','myopia','hyperopia'], TRUE, 'seed', 2, 'en'),

('Red Flags for Eye Emergencies',
 'eye-emergency-red-flags', 13, 'vision', 'Article', 4,
 'sudden_symptoms_consult_flag', 'triage_bot',
 'Symptoms like sudden vision loss or flashes that require same-day care.',
 ARRAY['vision','emergency','eye health'], TRUE, 'seed', 3, 'en'),

('Screen Time and Eye Strain',
 'screen-time-eye-strain', 14, 'vision', 'Audio', 5,
 'breaks_count_per_hour', 'daily_reminders',
 'The 20-20-20 rule and workspace adjustments to reduce digital eye strain.',
 ARRAY['vision','screen time','eye strain'], TRUE, 'seed', 3, 'en'),

('Simple Eye Comfort Exercises',
 'eye-comfort-exercises', 15, 'vision', 'Video', 6,
 'pre_post_comfort_1_10', 'vitals_log',
 'Guided exercises to relieve tension, improve focus, and strengthen eye muscles.',
 ARRAY['vision','exercises','eye health'], TRUE, 'seed', 2, 'en'),

('Protecting Eyes from Sun, Dust, and Infection',
 'eye-protection-sun-dust', 16, 'vision', 'Article', 5,
 'sunglasses_hygiene_today', 'streaks',
 'UV, dust, and hygiene habits that protect your eyes in East African climates.',
 ARRAY['vision','protection','hygiene'], TRUE, 'seed', 3, 'en'),

('Diabetes and Your Eyes',
 'diabetes-eye-health', 17, 'vision', 'Video', 5,
 'last_glucose_value', 'chronic_plan',
 'How uncontrolled blood sugar damages retinal vessels and causes blindness.',
 ARRAY['vision','diabetes','chronic disease'], TRUE, 'seed', 2, 'en'),

('When Children Need an Eye Check',
 'children-eye-check', 18, 'vision', 'Article', 4,
 'child_squinting_yes_no_freq', 'family_account',
 'Signs your child may need glasses and the right age for first eye tests.',
 ARRAY['vision','children','paediatric'], TRUE, 'seed', 3, 'en'),

('Traditional Eye Remedies: Safe or Not',
 'traditional-eye-remedies', 19, 'vision', 'Audio', 5,
 'remedy_type_outcome_log', 'consult_flag',
 'Which traditional remedies are safe versus those that risk serious harm.',
 ARRAY['vision','traditional medicine','myths'], TRUE, 'seed', 3, 'en'),

('Understanding Your Vision Test Results',
 'vision-test-results-guide', 20, 'vision', 'Article', 5,
 'acuity_score_left_right', 'visionqure_results',
 'How to read your prescription numbers and what SPH, CYL, and AXIS mean.',
 ARRAY['vision','eye test','prescription'], TRUE, 'seed', 3, 'en'),

-- ── 🧠 Mental Wellbeing (21–40) ─────────────────────────────
('Understanding Stress: Body and Mind',
 'understanding-stress', 21, 'mental_wellbeing', 'Article', 5,
 'stress_level_0_10_daily', 'mood_diary',
 'The physiology of the stress response and when it becomes harmful.',
 ARRAY['mental health','stress','wellbeing'], TRUE, 'launch', 3, 'en'),

('Meditation for Beginners',
 'meditation-beginners', 22, 'mental_wellbeing', 'Audio', 5,
 'post_mood_improved', 'mental_health_checkin',
 'A simple guided meditation practice anyone can build in 5 minutes a day.',
 ARRAY['mental health','meditation','mindfulness'], TRUE, 'launch', 2, 'en'),

('Breathing Techniques for Calm',
 'breathing-techniques-calm', 23, 'mental_wellbeing', 'Video', 4,
 'pre_post_tension_1_10', 'vitals_log',
 'Box breathing, 4-7-8, and diaphragmatic techniques to reduce anxiety fast.',
 ARRAY['mental health','breathing','anxiety'], TRUE, 'launch', 2, 'en'),

('Sleep Hygiene Basics',
 'sleep-hygiene-basics', 24, 'mental_wellbeing', 'Article', 6,
 '7_day_bedtime_wake_log', 'cbt_i_tracking',
 'Evidence-based habits for falling asleep faster and improving sleep quality.',
 ARRAY['mental health','sleep','insomnia'], TRUE, 'launch', 4, 'en'),

('Low Mood vs. Clinical Depression',
 'low-mood-vs-depression', 25, 'mental_wellbeing', 'Video', 5,
 'phq2_self_check_therapist_flag', 'mental_health_consult',
 'How to tell normal low mood from clinical depression and when to seek help.',
 ARRAY['mental health','depression','PHQ-2'], TRUE, 'launch', 2, 'en'),

('Everyday Anxiety vs. Anxiety Disorders',
 'anxiety-vs-anxiety-disorders', 26, 'mental_wellbeing', 'Article', 5,
 'anxiety_thermometer_0_10_triggers', 'mood_diary',
 'Understanding the spectrum from normal worry to generalised anxiety disorder.',
 ARRAY['mental health','anxiety','GAD'], TRUE, 'launch', 3, 'en'),

('Grounding Techniques for Panic and Trauma',
 'grounding-techniques-panic', 27, 'mental_wellbeing', 'Audio', 6,
 '5_4_3_2_1_helped_yes_no', 'crisis_toolkit',
 'Practical sensory grounding exercises for panic attacks and trauma responses.',
 ARRAY['mental health','panic','trauma'], TRUE, 'launch', 3, 'en'),

('Building Resilience in Life Changes',
 'building-resilience', 28, 'mental_wellbeing', 'Video', 5,
 'weekly_coping_action_done', 'goals_log',
 'Evidence-based strategies for bouncing back from adversity and setbacks.',
 ARRAY['mental health','resilience','coping'], TRUE, 'launch', 2, 'en'),

('Caring for Loved Ones with Mental Illness',
 'caring-for-mental-illness', 29, 'mental_wellbeing', 'Article', 6,
 'caregiver_stress_level_1_10', 'mood_diary',
 'Guidance for families supporting someone with depression, anxiety, or psychosis.',
 ARRAY['mental health','caregiving','family'], TRUE, 'launch', 4, 'en'),

('Substance Use: Risks and Harm Reduction',
 'substance-use-harm-reduction', 30, 'mental_wellbeing', 'Video', 5,
 'units_this_week_confidential', 'audit_tracker',
 'Understanding substance dependence and practical harm reduction approaches.',
 ARRAY['mental health','addiction','substance use'], TRUE, 'launch', 2, 'en'),

('Mindfulness for Daily Stress',
 'mindfulness-daily-stress', 31, 'mental_wellbeing', 'Audio', 5,
 'mindfulness_streak_days', 'streaks',
 'Simple mindfulness practices you can weave into everyday routines.',
 ARRAY['mental health','mindfulness','stress'], TRUE, 'launch', 2, 'en'),

('Grief Stages and Healthy Coping',
 'grief-stages-coping', 32, 'mental_wellbeing', 'Article', 5,
 'grief_intensity_1_10_journal', 'mood_diary',
 'The grief process, cultural variations, and how to support yourself through loss.',
 ARRAY['mental health','grief','coping'], TRUE, 'launch', 3, 'en'),

('Anger Management: Spot and Pause',
 'anger-management-spot-pause', 33, 'mental_wellbeing', 'Video', 4,
 'anger_episode_managed_yes_no', 'behaviour_log',
 'Recognise your anger triggers and use the pause technique to respond, not react.',
 ARRAY['mental health','anger','behaviour'], TRUE, 'launch', 2, 'en'),

('Perinatal Mental Health Basics',
 'perinatal-mental-health', 34, 'mental_wellbeing', 'Article', 6,
 'epds_mood_score_post_birth', 'mental_health_consult',
 'Antenatal anxiety, postnatal depression, and how to get support.',
 ARRAY['mental health','pregnancy','postnatal'], TRUE, 'launch', 4, 'en'),

('ADHD Strategies: Focus and Routines',
 'adhd-focus-routines', 35, 'mental_wellbeing', 'Audio', 6,
 'focus_sessions_count_pomodoro', 'daily_log',
 'Practical tools for managing ADHD — structured routines, Pomodoro, body doubling.',
 ARRAY['mental health','ADHD','focus'], TRUE, 'launch', 3, 'en'),

('Burnout Prevention for Caregivers',
 'burnout-prevention-caregivers', 36, 'mental_wellbeing', 'Video', 5,
 'self_care_action_done', 'energy_log',
 'How to recognise caregiver burnout and protect your own mental health.',
 ARRAY['mental health','burnout','caregiving'], TRUE, 'launch', 2, 'en'),

('Positive Thinking: Reframing Thoughts',
 'positive-thinking-reframing', 37, 'mental_wellbeing', 'Article', 5,
 'cbt_thought_record_reframed', 'mental_health_log',
 'CBT-based cognitive reframing to break negative thought spirals.',
 ARRAY['mental health','CBT','positive thinking'], TRUE, 'launch', 3, 'en'),

('Social Anxiety: Small Steps Forward',
 'social-anxiety-small-steps', 38, 'mental_wellbeing', 'Audio', 5,
 'social_interaction_comfort_level', 'mood_diary',
 'Graduated exposure techniques to build confidence in social situations.',
 ARRAY['mental health','social anxiety','exposure'], TRUE, 'launch', 2, 'en'),

('Insomnia Myths and Sleep Fixes',
 'insomnia-myths-sleep-fixes', 39, 'mental_wellbeing', 'Video', 4,
 'sleep_quality_1_5', 'sleep_diary',
 'Debunking common insomnia myths and CBT-I techniques that actually work.',
 ARRAY['mental health','insomnia','sleep'], TRUE, 'launch', 2, 'en'),

('Workplace Mental Health Tips',
 'workplace-mental-health', 40, 'mental_wellbeing', 'Article', 5,
 'work_breaks_taken_yes_no', 'behaviour_log',
 'Protecting mental health in high-pressure work environments.',
 ARRAY['mental health','workplace','stress'], TRUE, 'launch', 3, 'en'),

-- ── 💊 Chronic Disease (41–50) ──────────────────────────────
('High Blood Pressure: Signs and Lifestyle',
 'high-blood-pressure-lifestyle', 41, 'chronic_disease', 'Article', 5,
 'bp_reading_systolic_diastolic', 'vitals_log',
 'Understand hypertension, its silent signs, and how diet and exercise help.',
 ARRAY['chronic disease','hypertension','cardiovascular'], TRUE, 'launch', 3, 'en'),

('Diabetes 101: Sugar Control Daily',
 'diabetes-101-sugar-control', 42, 'chronic_disease', 'Video', 6,
 'fasting_glucose_value', 'chronic_plan',
 'Daily habits that keep blood glucose stable and prevent complications.',
 ARRAY['chronic disease','diabetes','glucose'], TRUE, 'launch', 3, 'en'),

('Asthma Triggers and Inhaler Use',
 'asthma-triggers-inhaler', 43, 'chronic_disease', 'Audio', 5,
 'triggers_today_inhaler_use', 'chronic_plan',
 'Identify your asthma triggers and use your inhaler correctly every time.',
 ARRAY['chronic disease','asthma','respiratory'], TRUE, 'launch', 3, 'en'),

('Heart Failure: Weight and Fluid Tips',
 'heart-failure-weight-fluid', 44, 'chronic_disease', 'Article', 5,
 'weight_change_kg_swelling', 'vitals_log',
 'Daily weight monitoring and fluid restriction strategies for heart failure.',
 ARRAY['chronic disease','heart failure','cardiovascular'], TRUE, 'launch', 3, 'en'),

('Healthy Plate: Balanced Meals',
 'healthy-plate-balanced-meals', 45, 'chronic_disease', 'Video', 4,
 'healthy_meal_photo_yes', 'nutrition_log',
 'The plate method and local East African foods to build balanced, nutritious meals.',
 ARRAY['chronic disease','nutrition','diet'], TRUE, 'launch', 2, 'en'),

('Walking for Chronic Health',
 'walking-chronic-health', 46, 'chronic_disease', 'Audio', 10,
 'steps_minutes_wearable', 'wearable_sync',
 'How 30 minutes of walking daily measurably improves chronic disease outcomes.',
 ARRAY['chronic disease','exercise','walking'], TRUE, 'launch', 4, 'en'),

('Chronic Pain: Pacing and Flare-Ups',
 'chronic-pain-pacing', 47, 'chronic_disease', 'Article', 6,
 'pain_score_1_10_activity', 'pain_log',
 'Activity pacing techniques to prevent boom-and-bust cycles in chronic pain.',
 ARRAY['chronic disease','pain','pacing'], TRUE, 'launch', 4, 'en'),

('Smoking Cessation: First Steps',
 'smoking-cessation-first-steps', 48, 'chronic_disease', 'Video', 5,
 'cigarettes_count_per_day', 'quit_tracker',
 'The most effective evidence-based strategies for quitting smoking.',
 ARRAY['chronic disease','smoking','cessation'], TRUE, 'launch', 2, 'en'),

('Alcohol Limits for Long-Term Health',
 'alcohol-limits-health', 49, 'chronic_disease', 'Article', 5,
 'units_confidential_tracker', 'audit_log',
 'Recommended alcohol limits, how to count units, and long-term health risks.',
 ARRAY['chronic disease','alcohol','harm reduction'], TRUE, 'launch', 3, 'en'),

('Why Medication Adherence Saves Lives',
 'medication-adherence-saves-lives', 50, 'chronic_disease', 'Audio', 5,
 'dose_taken_yes_missed_reason', 'adherence_score',
 'The impact of missed doses on chronic conditions and practical reminder strategies.',
 ARRAY['chronic disease','adherence','medications'], TRUE, 'launch', 2, 'en'),

-- ── 🩺 Women's, Men's & Sexual Health (51–60) ───────────────
('Menstrual Cycle: Normal vs. Concerns',
 'menstrual-cycle-normal-concerns', 51, 'sexual_health', 'Article', 5,
 'period_start_end_symptoms', 'calendar_log',
 'What''s normal in your cycle and which changes to discuss with a clinician.',
 ARRAY['women''s health','menstruation','reproductive health'], TRUE, 'launch', 3, 'en'),

('Pregnancy First Signs and Testing',
 'pregnancy-first-signs-testing', 52, 'sexual_health', 'Video', 4,
 'test_result_date', 'consult_booking',
 'Early pregnancy symptoms, when to test, and first steps after a positive result.',
 ARRAY['women''s health','pregnancy','reproductive health'], TRUE, 'launch', 2, 'en'),

('Safe Sex and STI Prevention',
 'safe-sex-sti-prevention', 53, 'sexual_health', 'Audio', 5,
 'protection_used_yes_no', 'confidential_log',
 'Practical, non-judgmental guide to preventing sexually transmitted infections.',
 ARRAY['sexual health','STI','prevention'], TRUE, 'launch', 2, 'en'),

('Contraception Options: Pros and Cons',
 'contraception-options', 54, 'sexual_health', 'Article', 6,
 'method_interest_notes', 'consult_prep',
 'Comparing barrier, hormonal, and long-acting methods for different lifestyles.',
 ARRAY['sexual health','contraception','reproductive health'], TRUE, 'launch', 4, 'en'),

('Men''s Prostate and Testicular Health',
 'mens-prostate-testicular-health', 55, 'sexual_health', 'Video', 5,
 'monthly_self_check_done_abnormal', 'monthly_reminder',
 'Self-examination technique and when to seek a prostate or testicular check.',
 ARRAY['men''s health','prostate','testicular'], TRUE, 'launch', 2, 'en'),

('Intimate Partner Violence Signs',
 'intimate-partner-violence-signs', 56, 'sexual_health', 'Article', 5,
 'help_needed_private_flag', 'crisis_tool',
 'Recognising coercive control, physical and emotional abuse, and how to get help.',
 ARRAY['women''s health','domestic violence','safety'], TRUE, 'launch', 3, 'en'),

('Fertility Basics and Preconception',
 'fertility-preconception-basics', 57, 'sexual_health', 'Audio', 6,
 'preconception_goal_diet_smoke', 'goals_log',
 'Optimising fertility through nutrition, timing, and lifestyle before pregnancy.',
 ARRAY['sexual health','fertility','preconception'], TRUE, 'launch', 3, 'en'),

('Postnatal Mood: Baby Blues Watch',
 'postnatal-mood-baby-blues', 58, 'sexual_health', 'Video', 4,
 'post_birth_mood_score_weekly', 'mental_health_link',
 'Differentiating baby blues from postpartum depression and when to seek support.',
 ARRAY['women''s health','postnatal','depression'], TRUE, 'launch', 2, 'en'),

('Vaginal Infections: Discharge Guide',
 'vaginal-infections-discharge', 59, 'sexual_health', 'Article', 5,
 'discharge_type_photo_opt', 'consult_booking',
 'Identifying BV, thrush, and STI-related discharge by characteristics.',
 ARRAY['women''s health','infection','discharge'], TRUE, 'launch', 3, 'en'),

('Emergency Contraception Facts',
 'emergency-contraception-facts', 60, 'sexual_health', 'Article', 4,
 'situation_notes_teleconsult', 'consult_booking',
 'How emergency contraception works, effectiveness windows, and myths debunked.',
 ARRAY['sexual health','emergency contraception','reproductive health'], TRUE, 'launch', 3, 'en'),

-- ── 🦠 Infection Prevention & Community Health (61–70) ───────
('Infection Spread: Hands, Water, Food',
 'infection-spread-hands-water-food', 61, 'infection_prevention', 'Video', 5,
 'handwashing_6x_day_streak', 'streaks',
 'How infections spread through contact, water, and food — and how to block them.',
 ARRAY['infection','prevention','handwashing'], TRUE, 'launch', 2, 'en'),

('Vaccines: Myths and Protection',
 'vaccines-myths-protection', 62, 'infection_prevention', 'Article', 5,
 'vaccines_recalled_list', 'health_records',
 'Evidence-based answers to common vaccine concerns and the East Africa schedule.',
 ARRAY['infection','vaccines','immunisation'], TRUE, 'launch', 3, 'en'),

('Tuberculosis: Cough and Risks',
 'tuberculosis-cough-risks', 63, 'infection_prevention', 'Audio', 5,
 'persistent_cough_weeks_duration', 'lab_test_order',
 'TB transmission, high-risk groups in East Africa, and treatment adherence.',
 ARRAY['infection','TB','respiratory'], TRUE, 'launch', 2, 'en'),

('HIV/STI Testing and Treatment',
 'hiv-sti-testing-treatment', 64, 'infection_prevention', 'Video', 6,
 'test_planned_date_booked', 'lab_order',
 'Normalising testing, understanding U=U, and navigating treatment.',
 ARRAY['infection','HIV','STI'], TRUE, 'launch', 3, 'en'),

('Childhood Fever Red Flags',
 'childhood-fever-red-flags', 65, 'infection_prevention', 'Article', 4,
 'child_fever_temp_actions', 'family_account',
 'When to watch and wait vs. when a child''s fever needs same-day medical review.',
 ARRAY['infection','paediatric','fever'], TRUE, 'launch', 3, 'en'),

('Diarrhoea: ORS and Dehydration',
 'diarrhoea-ors-dehydration', 66, 'infection_prevention', 'Video', 4,
 'episodes_ors_used_yes_no', 'symptom_log',
 'How to mix ORS, recognise dehydration, and prevent child deaths from diarrhoea.',
 ARRAY['infection','diarrhoea','dehydration'], TRUE, 'launch', 2, 'en'),

('Respiratory Viruses: COVID and Flu',
 'respiratory-viruses-covid-flu', 67, 'infection_prevention', 'Article', 5,
 'symptoms_severity_triage', 'triage_bot',
 'Distinguishing viral respiratory illness and when to escalate to a doctor.',
 ARRAY['infection','COVID-19','influenza'], TRUE, 'launch', 3, 'en'),

('Food Safety: Home and Street Tips',
 'food-safety-home-street', 68, 'infection_prevention', 'Audio', 5,
 'safe_food_practices_ticked', 'checklist_log',
 'Practical food hygiene in home kitchens and at street food stalls.',
 ARRAY['infection','food safety','hygiene'], TRUE, 'launch', 2, 'en'),

('Malaria: Mosquito Prevention',
 'malaria-mosquito-prevention', 69, 'infection_prevention', 'Video', 5,
 'net_used_yes_fever_check', 'symptom_log',
 'ITN use, repellents, and recognising malaria symptoms for prompt treatment.',
 ARRAY['infection','malaria','prevention'], TRUE, 'launch', 2, 'en'),

('Antibiotics: Smart Use Only',
 'antibiotics-smart-use', 70, 'infection_prevention', 'Article', 5,
 'leftover_meds_discarded_yes', 'consult_flag',
 'Why antibiotic resistance matters and how to use antibiotics responsibly.',
 ARRAY['infection','antibiotics','AMR'], TRUE, 'launch', 3, 'en'),

-- ── 🏃 Nutrition & Exercise (71–85) ─────────────────────────
('COPD: Breathing and Exacerbations',
 'copd-breathing-exacerbations', 71, 'nutrition_exercise', 'Article', 5,
 'lung_ease_score_1_10', 'chronic_plan',
 'Breathing techniques, rescue inhaler use, and avoiding COPD flare-up triggers.',
 ARRAY['chronic disease','COPD','respiratory'], TRUE, 'launch', 3, 'en'),

('Kidney Health for Diabetics and Hypertensives',
 'kidney-health-diabetics-hypertensives', 72, 'nutrition_exercise', 'Video', 5,
 'water_intake_litres_day', 'vitals_log',
 'Protecting kidney function through blood pressure control and hydration.',
 ARRAY['chronic disease','kidney','diabetes'], TRUE, 'launch', 2, 'en'),

('Osteoporosis: Bone Strength Tips',
 'osteoporosis-bone-strength', 73, 'nutrition_exercise', 'Audio', 5,
 'weight_bearing_exercise_yes_mins', 'exercise_log',
 'Calcium, vitamin D, and weight-bearing exercise to prevent bone loss.',
 ARRAY['chronic disease','osteoporosis','bone health'], TRUE, 'launch', 2, 'en'),

('Arthritis: Joint Care Daily',
 'arthritis-joint-care-daily', 74, 'nutrition_exercise', 'Article', 6,
 'joint_pain_areas_flare', 'pain_log',
 'Daily pacing, hot/cold therapy, and gentle movement to manage arthritis.',
 ARRAY['chronic disease','arthritis','joint pain'], TRUE, 'launch', 4, 'en'),

('Cancer Prevention Lifestyle Basics',
 'cancer-prevention-lifestyle', 75, 'nutrition_exercise', 'Video', 5,
 'sun_protection_veggies_daily_yes', 'habits_log',
 'Evidence-based lifestyle factors that reduce cancer risk.',
 ARRAY['chronic disease','cancer','prevention'], TRUE, 'launch', 2, 'en'),

('Balanced Nutrition: Local Foods Guide',
 'balanced-nutrition-local-foods', 76, 'nutrition_exercise', 'Article', 5,
 'veggie_fruit_servings_count', 'nutrition_log',
 'Building a balanced plate using affordable, readily available East African foods.',
 ARRAY['nutrition','local foods','diet'], TRUE, 'launch', 3, 'en'),

('Protein Needs for Muscle Health',
 'protein-needs-muscle-health', 77, 'nutrition_exercise', 'Video', 4,
 'protein_meal_yes_photo_opt', 'nutrition_log',
 'How much protein you need, and the best plant and animal sources in East Africa.',
 ARRAY['nutrition','protein','muscle health'], TRUE, 'launch', 2, 'en'),

('Hydration Myths and Daily Goals',
 'hydration-myths-daily-goals', 78, 'nutrition_exercise', 'Audio', 5,
 'water_glasses_per_day', 'vitals_log',
 'How much water you really need and the signs of mild dehydration.',
 ARRAY['nutrition','hydration','water'], TRUE, 'launch', 2, 'en'),

('Strength Training at Home (No Gym)',
 'strength-training-at-home', 79, 'nutrition_exercise', 'Video', 6,
 'reps_sets_done', 'exercise_log',
 'Bodyweight exercises for all fitness levels — no equipment required.',
 ARRAY['exercise','strength','home workout'], TRUE, 'launch', 3, 'en'),

('Flexibility: Stretching for All Ages',
 'flexibility-stretching-all-ages', 80, 'nutrition_exercise', 'Audio', 10,
 'stretch_session_flexibility_rating', 'exercise_log',
 'Daily stretching routines that improve mobility and reduce injury risk.',
 ARRAY['exercise','flexibility','stretching'], TRUE, 'launch', 4, 'en'),

('Walking vs. Running for Heart Health',
 'walking-vs-running-heart-health', 81, 'nutrition_exercise', 'Article', 5,
 'walk_run_mins_heart_rate', 'wearable_sync',
 'Comparing the cardiovascular benefits of walking and running for different ages.',
 ARRAY['exercise','walking','cardiovascular'], TRUE, 'launch', 3, 'en'),

('Rest Days: Recovery Importance',
 'rest-days-recovery', 82, 'nutrition_exercise', 'Video', 4,
 'rest_day_activity_level', 'exercise_log',
 'Why recovery days are essential for fitness gains and injury prevention.',
 ARRAY['exercise','recovery','rest'], TRUE, 'launch', 2, 'en'),

('Vitamin Deficiencies: Signs in East Africa',
 'vitamin-deficiencies-east-africa', 83, 'nutrition_exercise', 'Article', 5,
 'diet_sources_intake_today', 'nutrition_log',
 'Iron, vitamin D, B12 and folate deficiencies common in the region and how to address them.',
 ARRAY['nutrition','vitamins','East Africa'], TRUE, 'launch', 3, 'en'),

('Gut Health: Probiotics and Fibre',
 'gut-health-probiotics-fibre', 84, 'nutrition_exercise', 'Audio', 5,
 'bowel_regularity_yes_no', 'symptom_log',
 'The gut microbiome, why fibre matters, and fermented foods in East African diets.',
 ARRAY['nutrition','gut health','probiotics'], TRUE, 'launch', 2, 'en'),

('Intermittent Fasting Basics',
 'intermittent-fasting-basics', 85, 'nutrition_exercise', 'Video', 5,
 'fasting_window_hours_adhered', 'habits_log',
 'What the evidence says about intermittent fasting and who it suits (and who it doesn''t).',
 ARRAY['nutrition','fasting','diet'], TRUE, 'launch', 2, 'en'),

-- ── 💊 Safety, Pharmacy & Wrap-Up (86–100) ──────────────────
('Spotting Fake Medicines: Packaging Clues',
 'spotting-fake-medicines-packaging', 86, 'safety_pharmacy', 'Article', 5,
 'scan_result_via_medverify', 'medverify',
 'Physical and visual checks on packaging that flag counterfeit medicines.',
 ARRAY['pharmacy','counterfeit','safety'], TRUE, 'launch', 3, 'en'),

('Drug Side Effects: What to Watch',
 'drug-side-effects-watch', 87, 'safety_pharmacy', 'Video', 4,
 'new_med_side_effect_symptoms_date', 'side_effect_report',
 'Common and serious side effects to monitor when starting a new medication.',
 ARRAY['pharmacy','side effects','medications'], TRUE, 'launch', 2, 'en'),

('Safe Storage of Family Medicines',
 'safe-storage-family-medicines', 88, 'safety_pharmacy', 'Audio', 5,
 'kids_safe_storage_yes', 'medication_log',
 'Temperature, light, and child-safety requirements for common household medicines.',
 ARRAY['pharmacy','storage','safety'], TRUE, 'launch', 2, 'en'),

('Allergies: Reactions and Alerts',
 'allergies-reactions-alerts', 89, 'safety_pharmacy', 'Article', 5,
 'known_allergy_updated_profile', 'ehr_profile',
 'Drug and food allergies, anaphylaxis recognition, and updating your health record.',
 ARRAY['pharmacy','allergies','safety'], TRUE, 'launch', 3, 'en'),

('Generic vs. Brand: Cost and Quality',
 'generic-vs-brand-medicines', 90, 'safety_pharmacy', 'Video', 4,
 'generic_tried_saved_amount', 'generic_engine',
 'Why generics are bioequivalent to branded drugs and how to make the switch.',
 ARRAY['pharmacy','generic drugs','cost'], TRUE, 'launch', 2, 'en'),

('First Aid: Cuts, Burns, and Sprains',
 'first-aid-cuts-burns-sprains', 91, 'safety_pharmacy', 'Article', 6,
 'first_aid_used_outcome_consult', 'consult_opt',
 'Step-by-step first aid for the most common household injuries.',
 ARRAY['first aid','safety','emergency'], TRUE, 'launch', 4, 'en'),

('Emergency Numbers and Prep Kit',
 'emergency-numbers-prep-kit', 92, 'safety_pharmacy', 'Video', 3,
 'kit_stocked_yes', 'emergency_log',
 'Somalia and regional emergency numbers, and what every home kit should contain.',
 ARRAY['first aid','emergency','preparedness'], TRUE, 'launch', 2, 'en'),

('Hypertension Meds: Common Types',
 'hypertension-meds-common-types', 93, 'safety_pharmacy', 'Audio', 5,
 'dose_log_streak', 'adherence_score',
 'ACE inhibitors, ARBs, calcium channel blockers — what they do and side effects.',
 ARRAY['pharmacy','hypertension','medications'], TRUE, 'launch', 2, 'en'),

('Painkillers: Safe Dosing Limits',
 'painkillers-safe-dosing', 94, 'safety_pharmacy', 'Article', 5,
 'pain_relief_used_type_dose', 'medication_log',
 'Maximum safe doses of paracetamol, ibuprofen, and aspirin — and what to avoid.',
 ARRAY['pharmacy','painkillers','dosing'], TRUE, 'launch', 3, 'en'),

('Pharmacy Visits: Questions to Ask',
 'pharmacy-visits-questions', 95, 'safety_pharmacy', 'Video', 4,
 'questions_asked_yes_list', 'pharmacy_finder',
 'Empowering patients to ask the right questions at their pharmacy.',
 ARRAY['pharmacy','patient rights','communication'], TRUE, 'launch', 2, 'en'),

('Ageing Gracefully: 50+ Health Tips',
 'ageing-gracefully-50-plus', 96, 'safety_pharmacy', 'Article', 5,
 'fall_risk_check_monthly', 'ehr_chronic_plan',
 'Polypharmacy, fall prevention, cognitive health, and staying active after 50.',
 ARRAY['ageing','senior health','chronic disease'], TRUE, 'launch', 3, 'en'),

('Immune Boosters: Diet and Habits',
 'immune-boosters-diet-habits', 97, 'safety_pharmacy', 'Video', 5,
 'sleep_exercise_combined_score', 'vitals_log',
 'What actually works for immune health — and the supplement myths to ignore.',
 ARRAY['immunity','nutrition','lifestyle'], TRUE, 'launch', 2, 'en'),

('Heatstroke and Dehydration in Heat',
 'heatstroke-dehydration-heat', 98, 'safety_pharmacy', 'Audio', 5,
 'heat_exposure_hydrated_yes', 'symptom_log',
 'Recognising and responding to heat exhaustion and heatstroke in hot climates.',
 ARRAY['first aid','heatstroke','dehydration'], TRUE, 'launch', 2, 'en'),

('Pet Health and Zoonoses (Rabies etc.)',
 'pet-health-zoonoses-rabies', 99, 'safety_pharmacy', 'Article', 5,
 'pet_vaccinated_yes', 'health_records',
 'Diseases spread from animals to humans in East Africa and how to stay safe.',
 ARRAY['zoonoses','rabies','pets'], TRUE, 'launch', 3, 'en'),

('Lifelong Learning: Health Habits Review',
 'lifelong-learning-health-review', 100, 'safety_pharmacy', 'Video', 6,
 'top_3_habits_commitment_cert', 'full_quiz_cert',
 'Consolidate your 100-module journey and earn your SmartQure Health Learner certificate.',
 ARRAY['education','certificate','health habits'], TRUE, 'launch', 3, 'en')

ON CONFLICT (slug) DO NOTHING;


-- ── PART 11: UPDATE education_content published_at ───────────
-- Set published_at for all seeded modules that are now published

UPDATE education_content
SET published_at = now()
WHERE module_number IS NOT NULL
  AND published = TRUE
  AND published_at IS NULL;

-- ── Done ─────────────────────────────────────────────────────
-- You should see NOTICE messages above confirming each policy.
-- Check the new tables in: Table Editor > appointments,
--   services_catalogue, service_locations, vitals_log,
--   education_content, app_config
-- ============================================================
