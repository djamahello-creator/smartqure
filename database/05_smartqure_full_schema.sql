-- =============================================================================
-- SmartQure Platform — Full Database Schema v2.0
-- =============================================================================
-- Run order: After database-schema.sql (live) and 01_medicines_verification_tables.sql
-- Skip: PharmaPOS tables → run PharmaQure/pharmapos_mvp_schema.sql separately
--
-- This file adds:
--   [A] Core identity extensions: patients, doctors
--   [B] Clinical layer: appointments, consultations, prescriptions (doctor-issued),
--       lab_orders, lab_results, doctor_reviews
--   [C] AI Triage bot: triage_sessions
--   [D] Clinician supply: clinician_profiles, clinician_availability
--   [E] Recruitment: smartqure_applications
--   [F] Patient engagement: health_conditions, health_allergies, medication_reminders,
--       achievements, user_achievements, education_content, notifications
--   [G] Drug interactions
--   [H] Subscriptions
--   [I] Backward-compat alias for fake_news_alerts
-- =============================================================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";


-- =============================================================================
-- [A] CORE IDENTITY EXTENSIONS
-- =============================================================================

-- A1. PATIENTS — extended profile for patient users
-- Complements the existing `profiles` table (already live)
CREATE TABLE IF NOT EXISTS patients (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id              UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  blood_type              TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown')),
  height_cm               NUMERIC(5,1),
  weight_kg               NUMERIC(5,1),
  allergies               JSONB DEFAULT '[]',   -- [{substance, severity, reaction}]
  chronic_conditions      JSONB DEFAULT '[]',   -- [{name, icd10, diagnosed_at, managed_by}]
  current_medications     JSONB DEFAULT '[]',   -- [{name, dose, frequency, started_at}]
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  insurance_provider      TEXT,
  insurance_number        TEXT,
  data_sharing_consent    BOOLEAN DEFAULT FALSE,
  consent_updated_at      TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- A2. DOCTORS — licensed clinicians on the platform
CREATE TABLE IF NOT EXISTS doctors (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  profile_id                UUID UNIQUE REFERENCES profiles(id) ON DELETE SET NULL,
  full_name                 TEXT NOT NULL,
  license_number            TEXT UNIQUE NOT NULL,
  license_country           TEXT NOT NULL,
  license_expiry            DATE,
  speciality                TEXT NOT NULL,              -- e.g. 'General Practice', 'Psychiatry', 'Dentistry'
  sub_specialities          TEXT[] DEFAULT '{}',
  medical_school            TEXT,
  graduation_year           INTEGER,
  years_experience          INTEGER DEFAULT 0,
  languages                 TEXT[] DEFAULT ARRAY['en'],
  consultation_fee_usd      NUMERIC(8,2) DEFAULT 0,
  teleconsult_fee_usd       NUMERIC(8,2) DEFAULT 0,
  available_for_teleconsult BOOLEAN DEFAULT TRUE,
  clinic_name               TEXT,
  clinic_address            TEXT,
  clinic_city               TEXT,
  clinic_country            TEXT DEFAULT 'SO',
  coordinates               GEOGRAPHY(Point, 4326),
  bio                       TEXT,
  avatar_url                TEXT,
  verified                  BOOLEAN DEFAULT FALSE,
  verified_at               TIMESTAMPTZ,
  verified_by               UUID REFERENCES auth.users(id),
  is_active                 BOOLEAN DEFAULT TRUE,
  total_consultations       INTEGER DEFAULT 0,
  avg_rating                NUMERIC(3,2) DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctors_speciality       ON doctors(speciality);
CREATE INDEX IF NOT EXISTS idx_doctors_verified         ON doctors(verified) WHERE verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_doctors_teleconsult      ON doctors(available_for_teleconsult) WHERE available_for_teleconsult = TRUE;
CREATE INDEX IF NOT EXISTS idx_doctors_location         ON doctors USING GIST(coordinates);


-- =============================================================================
-- [B] CLINICAL LAYER
-- =============================================================================

-- B1. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id          UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id           UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  appointment_type    TEXT NOT NULL CHECK (appointment_type IN (
                        'in_person','video','audio','chat',
                        'dental','optometry','mental_health','follow_up')),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration_minutes    INTEGER DEFAULT 30,
  status              TEXT DEFAULT 'pending' CHECK (status IN (
                        'pending','confirmed','in_progress','completed',
                        'cancelled','no_show','rescheduled')),
  chief_complaint     TEXT,
  triage_session_id   UUID,                             -- FK added after triage_sessions created below
  notes               TEXT,
  cancellation_reason TEXT,
  cancelled_by        TEXT CHECK (cancelled_by IN ('patient','doctor','system')),
  fee_usd             NUMERIC(8,2),
  paid                BOOLEAN DEFAULT FALSE,
  payment_method      TEXT,
  payment_reference   TEXT,
  video_room_url      TEXT,                             -- SDK-generated room URL
  video_room_token    TEXT,                             -- SDK token (short-lived, stored briefly)
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient     ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor      ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled   ON appointments(scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_status      ON appointments(status);

-- B2. CONSULTATIONS — the clinical encounter record
CREATE TABLE IF NOT EXISTS consultations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id  UUID UNIQUE REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_actual INTEGER,                              -- minutes, calculated on end
  -- Vitals
  vitals          JSONB DEFAULT '{}',                   -- {bp_systolic, bp_diastolic, pulse, temp_c, spo2, rr, weight_kg, height_cm}
  -- SOAP notes
  subjective      TEXT,                                 -- Patient's reported complaints
  objective       TEXT,                                 -- Examination findings
  assessment      TEXT,                                 -- Clinical assessment/diagnoses
  plan            TEXT,                                 -- Treatment plan
  -- Structured data
  diagnoses       JSONB DEFAULT '[]',                   -- [{icd10, description, primary: true/false}]
  ai_differential JSONB DEFAULT '[]',                   -- [{condition, probability, reasoning}]
  -- Metadata
  consultation_type TEXT DEFAULT 'teleconsult' CHECK (consultation_type IN ('in_person','teleconsult','chat')),
  status          TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','complete','draft','amended')),
  amended_notes   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_patient  ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor   ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_date     ON consultations(started_at DESC);

-- B3. DOCTOR-ISSUED PRESCRIPTIONS (e-Rx with QR code)
-- Note: the live DB has a `prescriptions` table used by MedVerify for scan data.
-- This table is distinct: doctor-generated e-prescriptions linking to consultations.
CREATE TABLE IF NOT EXISTS erx_prescriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id       UUID REFERENCES consultations(id) ON DELETE RESTRICT,
  patient_id            UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id             UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  items                 JSONB NOT NULL DEFAULT '[]',    -- [{medication_id, name, dose, frequency, duration_days, instructions, qty}]
  safety_check          JSONB DEFAULT '{}',             -- {interactions_checked: true, flags: []}
  qr_code               TEXT UNIQUE,                   -- UUID-based, used by pharmacist to scan
  pdf_url               TEXT,
  status                TEXT DEFAULT 'active' CHECK (status IN (
                          'active','filled','partially_filled','expired','cancelled','superseded')),
  filled_at             TIMESTAMPTZ,
  filled_by_pharmacy_id UUID,                           -- FK to pharmacies (populated when PharmaPOS tables exist)
  expires_at            TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_erx_patient    ON erx_prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_erx_doctor     ON erx_prescriptions(doctor_id);
CREATE INDEX IF NOT EXISTS idx_erx_qr         ON erx_prescriptions(qr_code);
CREATE INDEX IF NOT EXISTS idx_erx_status     ON erx_prescriptions(status);

-- B4. LAB ORDERS
CREATE TABLE IF NOT EXISTS lab_orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  tests_ordered   JSONB NOT NULL DEFAULT '[]',          -- [{test_code, test_name, specimen_type, fasting_required}]
  clinical_notes  TEXT,                                 -- Relevant history for lab
  urgency         TEXT DEFAULT 'routine' CHECK (urgency IN ('routine','urgent','stat')),
  status          TEXT DEFAULT 'ordered' CHECK (status IN (
                    'ordered','sample_collected','processing','completed','cancelled')),
  lab_name        TEXT,
  ordered_at      TIMESTAMPTZ DEFAULT NOW(),
  collected_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON lab_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_status  ON lab_orders(status);

-- B5. LAB RESULTS
CREATE TABLE IF NOT EXISTS lab_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lab_order_id    UUID NOT NULL REFERENCES lab_orders(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  results         JSONB NOT NULL DEFAULT '[]',          -- [{test, value, unit, reference_range, flag: H/L/N}]
  summary         TEXT,
  doctor_comment  TEXT,
  pdf_url         TEXT,
  reported_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lab_results_patient    ON lab_results(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_order      ON lab_results(lab_order_id);

-- B6. DOCTOR REVIEWS
CREATE TABLE IF NOT EXISTS doctor_reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id       UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT,
  is_anonymous    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(doctor_id, consultation_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_doctor ON doctor_reviews(doctor_id);


-- =============================================================================
-- [C] AI TRIAGE BOT
-- =============================================================================

-- C1. TRIAGE SESSIONS — persists every AI triage conversation
CREATE TABLE IF NOT EXISTS triage_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_id          UUID REFERENCES patients(id) ON DELETE SET NULL,
  -- Conversation
  messages            JSONB NOT NULL DEFAULT '[]',      -- [{role: user/assistant, content, timestamp}]
  message_count       INTEGER DEFAULT 0,
  -- Triage output (parsed from last AI response)
  urgency             TEXT CHECK (urgency IN ('routine','urgent','emergency','crisis')),
  module              TEXT,                             -- gp, mental_health, dental, optometry, pharmacy, chronic, labs, medverify, critical
  clinician_type      TEXT,                             -- GP, Psychiatrist, Dentist, etc.
  recommended_services JSONB DEFAULT '[]',             -- [{service, description}]
  flags               JSONB DEFAULT '[]',               -- safety flags detected
  language_detected   TEXT DEFAULT 'en',
  -- Session metadata
  session_source      TEXT DEFAULT 'web' CHECK (session_source IN ('web','pwa','ussd','sms')),
  ip_country          TEXT,
  device_type         TEXT,
  -- Outcome
  appointment_id      UUID REFERENCES appointments(id) ON DELETE SET NULL,
  outcome             TEXT DEFAULT 'pending' CHECK (outcome IN (
                        'pending','booked','self_care','referred','emergency_escalated','abandoned')),
  follow_up_required  BOOLEAN DEFAULT FALSE,
  follow_up_at        TIMESTAMPTZ,
  -- Timestamps
  started_at          TIMESTAMPTZ DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_user      ON triage_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_triage_patient   ON triage_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_urgency   ON triage_sessions(urgency);
CREATE INDEX IF NOT EXISTS idx_triage_outcome   ON triage_sessions(outcome);
CREATE INDEX IF NOT EXISTS idx_triage_date      ON triage_sessions(started_at DESC);

-- Now add the deferred FK from appointments → triage_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_appointments_triage'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT fk_appointments_triage
      FOREIGN KEY (triage_session_id) REFERENCES triage_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;


-- =============================================================================
-- [D] CLINICIAN SUPPLY CHAIN
-- =============================================================================

-- D1. CLINICIAN PROFILES — onboarded, active clinicians (post-recruitment)
-- This is separate from `doctors` (which is for registered medical practitioners).
-- Clinician profiles cover all clinical roles: therapists, nurses, opticians, dentists.
CREATE TABLE IF NOT EXISTS clinician_profiles (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id      UUID,                             -- References smartqure_applications.id
  full_name           TEXT NOT NULL,
  role                TEXT NOT NULL CHECK (role IN (
                        'gp','psychiatrist','psychotherapist','psychiatric_nurse',
                        'dentist','optometrist','pharmacist','lab_technician','nutritionist')),
  license_number      TEXT,
  license_country     TEXT,
  specialisms         TEXT[] DEFAULT '{}',              -- e.g. ['CBT','DBT','Trauma','EMDR']
  therapy_modalities  TEXT[] DEFAULT '{}',
  languages           TEXT[] DEFAULT ARRAY['en'],
  countries_serving   TEXT[] DEFAULT '{}',
  teleconsult_enabled BOOLEAN DEFAULT TRUE,
  consultation_fee_usd NUMERIC(8,2) DEFAULT 0,
  timezone            TEXT DEFAULT 'Africa/Nairobi',
  bio                 TEXT,
  avatar_url          TEXT,
  is_active           BOOLEAN DEFAULT TRUE,
  is_verified         BOOLEAN DEFAULT FALSE,
  verified_at         TIMESTAMPTZ,
  total_sessions      INTEGER DEFAULT 0,
  avg_rating          NUMERIC(3,2) DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinician_role      ON clinician_profiles(role);
CREATE INDEX IF NOT EXISTS idx_clinician_active    ON clinician_profiles(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_clinician_languages ON clinician_profiles USING GIN(languages);
CREATE INDEX IF NOT EXISTS idx_clinician_countries ON clinician_profiles USING GIN(countries_serving);

-- D2. CLINICIAN AVAILABILITY — bookable time slots
CREATE TABLE IF NOT EXISTS clinician_availability (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clinician_id    UUID NOT NULL REFERENCES clinician_profiles(id) ON DELETE CASCADE,
  slot_date       DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  duration_mins   INTEGER NOT NULL DEFAULT 30,
  slot_type       TEXT DEFAULT 'teleconsult' CHECK (slot_type IN ('teleconsult','in_person','chat')),
  status          TEXT DEFAULT 'available' CHECK (status IN ('available','booked','blocked','break')),
  appointment_id  UUID REFERENCES appointments(id) ON DELETE SET NULL,
  timezone        TEXT DEFAULT 'Africa/Nairobi',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinician_id, slot_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_availability_clinician ON clinician_availability(clinician_id);
CREATE INDEX IF NOT EXISTS idx_availability_date      ON clinician_availability(slot_date);
CREATE INDEX IF NOT EXISTS idx_availability_status    ON clinician_availability(status) WHERE status = 'available';


-- =============================================================================
-- [E] RECRUITMENT (from latest additions / smartqure-schema.sql)
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS application_number_seq START 1000;

CREATE TABLE IF NOT EXISTS smartqure_applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  app_number      TEXT UNIQUE DEFAULT 'APP-' || NEXTVAL('application_number_seq'),
  -- Applicant
  full_name       TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  country         TEXT,
  city            TEXT,
  -- Track classification
  track           TEXT NOT NULL CHECK (track IN ('clinical','tech','ops','b2b')),
  role_id         TEXT NOT NULL,                        -- e.g. 'psychotherapist', 'gp', 'pharmacy_partner'
  role_label      TEXT,
  -- Form data (flexible JSONB for different role schemas)
  form_data       JSONB NOT NULL DEFAULT '{}',
  -- Review workflow
  status          TEXT DEFAULT 'new' CHECK (status IN (
                    'new','under_review','shortlisted','interview_scheduled',
                    'onboarded','rejected','deferred','withdrawn')),
  reviewed_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  review_notes    TEXT,
  action_taken    TEXT,
  -- Metadata
  source          TEXT DEFAULT 'web',                   -- web, referral, linkedin, etc.
  submitted_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_track    ON smartqure_applications(track);
CREATE INDEX IF NOT EXISTS idx_applications_role     ON smartqure_applications(role_id);
CREATE INDEX IF NOT EXISTS idx_applications_status   ON smartqure_applications(status);
-- Note: column is applicant_email in existing table, email in fresh installs
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='smartqure_applications' AND column_name='applicant_email') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_applications_email') THEN
      CREATE INDEX idx_applications_email ON smartqure_applications(applicant_email);
    END IF;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='smartqure_applications' AND column_name='email') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_applications_email') THEN
      CREATE INDEX idx_applications_email ON smartqure_applications(email);
    END IF;
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='smartqure_applications' AND column_name='applicant_country') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_applications_country') THEN
      CREATE INDEX idx_applications_country ON smartqure_applications(applicant_country);
    END IF;
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='smartqure_applications' AND column_name='country') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='idx_applications_country') THEN
      CREATE INDEX idx_applications_country ON smartqure_applications(country);
    END IF;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_applications_date     ON smartqure_applications(submitted_at DESC);

-- B2B convenience view — drop and recreate to avoid column mismatch errors
DROP VIEW IF EXISTS b2b_enquiries;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='smartqure_applications' AND column_name='applicant_email') THEN
    CREATE VIEW b2b_enquiries AS
      SELECT
        id, applicant_name AS full_name, applicant_email AS email,
        applicant_phone AS phone, applicant_country AS country, applicant_city AS city,
        role_id, role_label,
        form_data->>'organisation_name'  AS organisation_name,
        form_data->>'pharmacy_name'      AS pharmacy_name,
        form_data->>'hospital_name'      AS hospital_name,
        form_data->>'ngo_name'           AS ngo_name,
        form_data->>'website'            AS website,
        form_data->>'partnership_type'   AS partnership_type,
        status, submitted_at
      FROM smartqure_applications
      WHERE track = 'b2b';
  ELSE
    CREATE VIEW b2b_enquiries AS
      SELECT
        id, full_name, email, phone, country, city,
        role_id, role_label,
        form_data->>'organisation_name'  AS organisation_name,
        form_data->>'pharmacy_name'      AS pharmacy_name,
        form_data->>'hospital_name'      AS hospital_name,
        form_data->>'ngo_name'           AS ngo_name,
        form_data->>'website'            AS website,
        form_data->>'partnership_type'   AS partnership_type,
        status, submitted_at
      FROM smartqure_applications
      WHERE track = 'b2b';
  END IF;
END $$;


-- =============================================================================
-- [F] PATIENT ENGAGEMENT
-- =============================================================================

-- F1. HEALTH CONDITIONS (structured, separate from JSONB in patients table)
CREATE TABLE IF NOT EXISTS health_conditions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  condition_name  TEXT NOT NULL,
  icd10_code      TEXT,
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','resolved','monitoring','suspected')),
  severity        TEXT CHECK (severity IN ('mild','moderate','severe')),
  diagnosed_at    DATE,
  diagnosed_by    UUID REFERENCES doctors(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_health_conditions_patient ON health_conditions(patient_id);

-- F2. HEALTH ALLERGIES
CREATE TABLE IF NOT EXISTS health_allergies (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  substance       TEXT NOT NULL,
  allergy_type    TEXT CHECK (allergy_type IN ('drug','food','environmental','latex','contrast','other')),
  reaction        TEXT,
  severity        TEXT CHECK (severity IN ('mild','moderate','severe','anaphylaxis')),
  confirmed       BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_allergies_patient ON health_allergies(patient_id);

-- F3. MEDICATION REMINDERS
CREATE TABLE IF NOT EXISTS medication_reminders (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id          UUID REFERENCES patients(id) ON DELETE CASCADE,
  erx_prescription_id UUID REFERENCES erx_prescriptions(id) ON DELETE SET NULL,
  medication_name     TEXT NOT NULL,
  dose                TEXT,
  frequency           TEXT,                             -- e.g. 'twice daily'
  reminder_times      TEXT[] DEFAULT '{}',              -- ['08:00','20:00']
  start_date          DATE DEFAULT CURRENT_DATE,
  end_date            DATE,
  is_active           BOOLEAN DEFAULT TRUE,
  -- Adherence tracking
  total_doses         INTEGER DEFAULT 0,
  doses_taken         INTEGER DEFAULT 0,
  doses_missed        INTEGER DEFAULT 0,
  last_taken_at       TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminders_user    ON medication_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_active  ON medication_reminders(is_active) WHERE is_active = TRUE;

-- Dose log (individual dose events)
CREATE TABLE IF NOT EXISTS medication_dose_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id     UUID NOT NULL REFERENCES medication_reminders(id) ON DELETE CASCADE,
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  taken_at        TIMESTAMPTZ,
  skipped         BOOLEAN DEFAULT FALSE,
  skip_reason     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dose_log_reminder ON medication_dose_log(reminder_id);
CREATE INDEX IF NOT EXISTS idx_dose_log_patient  ON medication_dose_log(patient_id);

-- F4. GAMIFICATION
CREATE TABLE IF NOT EXISTS achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  icon            TEXT,                                 -- emoji or icon key
  category        TEXT CHECK (category IN ('adherence','scans','education','appointments','profile','community')),
  points          INTEGER DEFAULT 0,
  requirement     JSONB DEFAULT '{}',                   -- {type: 'scan_count', threshold: 10}
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id  UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);

-- User points ledger
CREATE TABLE IF NOT EXISTS user_points (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points    INTEGER DEFAULT 0,
  level           INTEGER DEFAULT 1,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS points_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points          INTEGER NOT NULL,                     -- positive=earned, negative=spent
  reason          TEXT NOT NULL,                        -- 'scan_verified', 'appointment_kept', etc.
  reference_id    UUID,                                 -- FK to relevant record
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_tx_user ON points_transactions(user_id);

-- F5. EDUCATION CONTENT
CREATE TABLE IF NOT EXISTS education_content (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE NOT NULL,
  content         TEXT,
  summary         TEXT,
  category        TEXT,                                 -- 'malaria','hiv','maternal','nutrition', etc.
  tags            TEXT[] DEFAULT '{}',
  language        TEXT DEFAULT 'en',
  reading_time_mins INTEGER DEFAULT 3,
  image_url       TEXT,
  source          TEXT,
  published       BOOLEAN DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_published ON education_content(published) WHERE published = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_language  ON education_content(language);
CREATE INDEX IF NOT EXISTS idx_content_tags      ON education_content USING GIN(tags);

CREATE TABLE IF NOT EXISTS user_content_progress (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id      UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  progress_pct    INTEGER DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  UNIQUE(user_id, content_id)
);

-- F6. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
                    'dose_reminder','refill_alert','counterfeit_alert',
                    'appointment_reminder','appointment_confirmed','appointment_cancelled',
                    'lab_result_ready','prescription_issued','triage_followup',
                    'achievement_earned','system')),
  title           TEXT NOT NULL,
  body            TEXT,
  data            JSONB DEFAULT '{}',                   -- Arbitrary payload for deep-link
  read            BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_date   ON notifications(created_at DESC);


-- =============================================================================
-- [G] DRUG INTERACTIONS
-- =============================================================================

CREATE TABLE IF NOT EXISTS drug_interactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  drug_a_id       UUID REFERENCES medications(id) ON DELETE CASCADE,
  drug_b_id       UUID REFERENCES medications(id) ON DELETE CASCADE,
  drug_a_name     TEXT,                                 -- Fallback for drugs not in our DB
  drug_b_name     TEXT,
  severity        TEXT NOT NULL CHECK (severity IN ('contraindicated','major','moderate','minor','unknown')),
  mechanism       TEXT,
  clinical_effect TEXT NOT NULL,
  management      TEXT,
  evidence_level  TEXT CHECK (evidence_level IN ('established','probable','suspected','possible','unlikely')),
  source          TEXT,                                 -- e.g. 'DrugBank', 'Stockley', 'WHO'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(drug_a_id, drug_b_id)
);

CREATE INDEX IF NOT EXISTS idx_interactions_drug_a ON drug_interactions(drug_a_id);
CREATE INDEX IF NOT EXISTS idx_interactions_drug_b ON drug_interactions(drug_b_id);
CREATE INDEX IF NOT EXISTS idx_interactions_severity ON drug_interactions(severity) WHERE severity IN ('contraindicated','major');


-- =============================================================================
-- [H] SUBSCRIPTIONS / PLANS
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan            TEXT NOT NULL CHECK (plan IN ('free','basic','premium','family','corporate')),
  status          TEXT DEFAULT 'active' CHECK (status IN ('active','cancelled','expired','trial','paused')),
  price_usd       NUMERIC(8,2) DEFAULT 0,
  billing_cycle   TEXT CHECK (billing_cycle IN ('monthly','annual','lifetime')),
  payment_method  TEXT,
  payment_reference TEXT,
  trial_ends_at   TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end   TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);


-- =============================================================================
-- [I] BACKWARD COMPAT — fake_news_alerts alias
-- =============================================================================
-- The live DB uses `fake_news_alerts`. The unified schema uses `fake_drug_alerts`.
-- We keep the live table name as canonical. This view allows new code to use either name.

CREATE OR REPLACE VIEW fake_drug_alerts AS
  SELECT
    id,
    medication_name,
    description AS body,
    severity,
    source_url,
    published_date AS created_at
  FROM fake_news_alerts;

-- Note: For new alert inserts, continue writing to `fake_news_alerts`.
-- The seeded data in 04_seed_fake_alerts.sql already targets that table.


-- =============================================================================
-- TRIGGERS — shared timestamp updater
-- =============================================================================

-- Single reusable fn_update_timestamp function
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to all new tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'patients','doctors','appointments','consultations','erx_prescriptions',
    'clinician_profiles','medication_reminders','smartqure_applications',
    'education_content','subscriptions','drug_interactions','user_points'
  ] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_timestamp_%I ON %I;
      CREATE TRIGGER trg_timestamp_%I
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();
    ', tbl, tbl, tbl, tbl);
  END LOOP;
END;
$$;

-- Trigger: auto-update doctor avg_rating after a new review
CREATE OR REPLACE FUNCTION fn_update_doctor_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE doctors
    SET avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 2)
      FROM doctor_reviews
      WHERE doctor_id = NEW.doctor_id
    ),
    total_consultations = (
      SELECT COUNT(*)
      FROM consultations
      WHERE doctor_id = NEW.doctor_id AND status = 'complete'
    )
  WHERE id = NEW.doctor_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_doctor_rating ON doctor_reviews;
CREATE TRIGGER trg_doctor_rating
  AFTER INSERT OR UPDATE ON doctor_reviews
  FOR EACH ROW EXECUTE FUNCTION fn_update_doctor_rating();

-- Trigger: auto-increment triage session message count
CREATE OR REPLACE FUNCTION fn_triage_message_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.message_count = jsonb_array_length(NEW.messages);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_triage_message_count ON triage_sessions;
CREATE TRIGGER trg_triage_message_count
  BEFORE INSERT OR UPDATE ON triage_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_triage_message_count();


-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all new tables
ALTER TABLE patients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE erx_prescriptions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results             ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE triage_sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_availability  ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartqure_applications  ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_conditions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_allergies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_reminders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_dose_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points             ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE education_content       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_content_progress   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications           ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_interactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions           ENABLE ROW LEVEL SECURITY;

-- PATIENTS: own their data
CREATE POLICY "patients_own_data"
  ON patients FOR ALL
  USING (user_id = auth.uid());

-- DOCTORS: public read for verified doctors, own full access
CREATE POLICY "doctors_public_read"
  ON doctors FOR SELECT
  USING (verified = TRUE AND is_active = TRUE);

CREATE POLICY "doctors_own_write"
  ON doctors FOR ALL
  USING (user_id = auth.uid());

-- APPOINTMENTS: patient sees own, doctor sees theirs
CREATE POLICY "appointments_patient"
  ON appointments FOR ALL
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "appointments_doctor"
  ON appointments FOR SELECT
  USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

-- CONSULTATIONS: patient and doctor see their own
CREATE POLICY "consultations_patient"
  ON consultations FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "consultations_doctor"
  ON consultations FOR ALL
  USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

-- ERX: patient reads own, doctor creates/reads
CREATE POLICY "erx_patient_read"
  ON erx_prescriptions FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "erx_doctor_manage"
  ON erx_prescriptions FOR ALL
  USING (
    doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid())
  );

-- LAB ORDERS + RESULTS: patient reads own
CREATE POLICY "lab_orders_patient"
  ON lab_orders FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "lab_results_patient"
  ON lab_results FOR SELECT
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- TRIAGE: user sees own sessions
CREATE POLICY "triage_own"
  ON triage_sessions FOR ALL
  USING (user_id = auth.uid());

-- TRIAGE: allow anonymous insert (pre-login triage)
CREATE POLICY "triage_anon_insert"
  ON triage_sessions FOR INSERT
  WITH CHECK (TRUE);

-- CLINICIAN PROFILES: public read for active verified clinicians
CREATE POLICY "clinicians_public_read"
  ON clinician_profiles FOR SELECT
  USING (is_active = TRUE AND is_verified = TRUE);

CREATE POLICY "clinicians_own_write"
  ON clinician_profiles FOR ALL
  USING (user_id = auth.uid());

-- AVAILABILITY: public read for available slots
CREATE POLICY "availability_public_read"
  ON clinician_availability FOR SELECT
  USING (status = 'available');

-- HEALTH CONDITIONS / ALLERGIES: patient owns their data
CREATE POLICY "health_conditions_own"
  ON health_conditions FOR ALL
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

CREATE POLICY "health_allergies_own"
  ON health_allergies FOR ALL
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- MEDICATION REMINDERS: user owns
CREATE POLICY "reminders_own"
  ON medication_reminders FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "dose_log_own"
  ON medication_dose_log FOR ALL
  USING (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );

-- GAMIFICATION: users see own points/achievements; achievements list is public
CREATE POLICY "achievements_public_read"
  ON achievements FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "user_achievements_own"
  ON user_achievements FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "user_points_own"
  ON user_points FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "points_tx_own"
  ON points_transactions FOR SELECT
  USING (user_id = auth.uid());

-- EDUCATION: published content is public
CREATE POLICY "content_public_read"
  ON education_content FOR SELECT
  USING (published = TRUE);

CREATE POLICY "content_progress_own"
  ON user_content_progress FOR ALL
  USING (user_id = auth.uid());

-- NOTIFICATIONS: user sees own
CREATE POLICY "notifications_own"
  ON notifications FOR ALL
  USING (user_id = auth.uid());

-- DRUG INTERACTIONS: read-only public
CREATE POLICY "interactions_public_read"
  ON drug_interactions FOR SELECT
  USING (TRUE);

-- SUBSCRIPTIONS: user sees own
CREATE POLICY "subscriptions_own"
  ON subscriptions FOR ALL
  USING (user_id = auth.uid());

-- RECRUITMENT APPLICATIONS: anon can insert; only admins can read/manage
CREATE POLICY "applications_public_insert"
  ON smartqure_applications FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "applications_admin_manage"
  ON smartqure_applications FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- DOCTOR REVIEWS: patients can insert own, all can read
CREATE POLICY "reviews_public_read"
  ON doctor_reviews FOR SELECT
  USING (is_anonymous = FALSE OR patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid()));

CREATE POLICY "reviews_patient_insert"
  ON doctor_reviews FOR INSERT
  WITH CHECK (
    patient_id IN (SELECT id FROM patients WHERE user_id = auth.uid())
  );


-- =============================================================================
-- SEED: Default Achievements
-- =============================================================================

INSERT INTO achievements (slug, title, description, icon, category, points, requirement)
VALUES
  ('first_scan',        'First Scan',           'Scanned your first medicine barcode',          '🔍', 'scans',       10,  '{"type":"scan_count","threshold":1}'),
  ('ten_scans',         'Safety Inspector',     'Scanned 10 medicines',                         '🛡️', 'scans',       50,  '{"type":"scan_count","threshold":10}'),
  ('fifty_scans',       'Medicine Guardian',    'Scanned 50 medicines — serious commitment!',   '💊', 'scans',      150,  '{"type":"scan_count","threshold":50}'),
  ('reported_fake',     'Alert Citizen',        'Reported a suspected counterfeit medicine',    '🚨', 'scans',       30,  '{"type":"fake_report","threshold":1}'),
  ('week_adherence',    '7-Day Streak',         'Took all doses for 7 days in a row',           '🌟', 'adherence',   40,  '{"type":"adherence_streak","threshold":7}'),
  ('month_adherence',   'Adherence Champion',   'Maintained 100% adherence for 30 days',        '🏆', 'adherence',  200,  '{"type":"adherence_streak","threshold":30}'),
  ('first_consult',     'Healthcare Journey',   'Completed your first teleconsultation',        '👨‍⚕️', 'appointments', 25, '{"type":"consult_count","threshold":1}'),
  ('profile_complete',  'Complete Profile',     'Filled in your full health profile',           '✅', 'profile',     20,  '{"type":"profile_complete","threshold":1}'),
  ('first_article',     'Health Learner',       'Read your first health education article',     '📚', 'education',   10,  '{"type":"content_read","threshold":1}'),
  ('five_articles',     'Health Scholar',       'Read 5 health education articles',             '🎓', 'education',   40,  '{"type":"content_read","threshold":5}')
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
-- Run order summary:
--   1. database-schema.sql          (live — 8 tables)
--   2. 01_medicines_verification_tables.sql  (manufacturers, medications, batches, verification_log)
--   3. 02_seed_manufacturers.sql
--   4. 03_seed_medications.sql
--   5. 04_seed_fake_alerts.sql
--   6. 05_smartqure_full_schema.sql  ← THIS FILE
--   7. PharmaQure/pharmapos_mvp_schema.sql   (pharmacies, inventory, transactions, etc.)
--
-- Total new tables added by this file: 27
-- Total platform tables (all files): ~43
-- =============================================================================
