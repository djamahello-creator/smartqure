-- MedVerify Complete Database Schema
-- Run this in Supabase SQL Editor

-- 1. PROFILES TABLE (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  email TEXT,
  phone TEXT,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  id_data JSONB, -- Store anonymized verification data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 2. SCANS TABLE (medication scans)
CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  medication_name TEXT NOT NULL,
  batch_number TEXT,
  expiry_date DATE,
  manufacturer TEXT,
  country_of_origin TEXT,
  photo_url TEXT,
  result TEXT CHECK (result IN ('verified', 'caution', 'high_risk')) DEFAULT 'verified',
  confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100) DEFAULT 0,
  has_alert BOOLEAN DEFAULT false,
  alert_details JSONB,
  scan_type TEXT CHECK (scan_type IN ('barcode', 'manual', 'photo')) DEFAULT 'manual',
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scans
CREATE POLICY "Users can view own scans" 
  ON scans FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scans" 
  ON scans FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scans" 
  ON scans FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scans" 
  ON scans FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. REPORTS TABLE (user reports for suspicious medications)
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  report_type TEXT CHECK (report_type IN ('counterfeit', 'substandard', 'packaging', 'adverse', 'other')) NOT NULL,
  details TEXT NOT NULL,
  medication_name TEXT,
  batch_number TEXT,
  status TEXT CHECK (status IN ('pending', 'reviewed', 'resolved')) DEFAULT 'pending',
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reports
CREATE POLICY "Users can view own reports" 
  ON reports FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" 
  ON reports FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 4. ID_SCANS TABLE (ID verification records)
CREATE TABLE IF NOT EXISTS id_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  id_type TEXT CHECK (id_type IN ('passport', 'national_id', 'drivers_license')) NOT NULL,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  ocr_data JSONB,
  face_match_confidence NUMERIC(5,2),
  verification_result TEXT CHECK (verification_result IN ('verified', 'caution', 'failed')) DEFAULT 'failed',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE id_scans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for id_scans
CREATE POLICY "Users can view own id_scans" 
  ON id_scans FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own id_scans" 
  ON id_scans FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 5. PRESCRIPTIONS TABLE (Rx wallet)
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  doctor_name TEXT,
  doctor_license TEXT,
  medication_name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  quantity INTEGER,
  frequency TEXT,
  duration_days INTEGER,
  start_date DATE,
  expiry_date DATE,
  qr_code TEXT UNIQUE,
  prescription_photo_url TEXT,
  ai_review_status TEXT CHECK (ai_review_status IN ('safe', 'warning', 'danger')) DEFAULT 'safe',
  ai_review_notes TEXT,
  filled_at TIMESTAMPTZ,
  pharmacy_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for prescriptions
CREATE POLICY "Users can view own prescriptions" 
  ON prescriptions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prescriptions" 
  ON prescriptions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prescriptions" 
  ON prescriptions FOR UPDATE 
  USING (auth.uid() = user_id);

-- 6. SIDE_EFFECTS TABLE (medication feedback)
CREATE TABLE IF NOT EXISTS side_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
  medication_name TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('none', 'mild', 'moderate', 'severe')) NOT NULL,
  description TEXT,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE side_effects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for side_effects
CREATE POLICY "Users can view own side_effects" 
  ON side_effects FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own side_effects" 
  ON side_effects FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 7. FAKE_NEWS_ALERTS TABLE (automated news scanning)
CREATE TABLE IF NOT EXISTS fake_news_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_name TEXT NOT NULL,
  batch_number TEXT,
  location TEXT,
  severity TEXT CHECK (severity IN ('high', 'medium', 'low')) DEFAULT 'medium',
  source TEXT NOT NULL,
  source_url TEXT,
  description TEXT,
  affected_area TEXT,
  published_date TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (public read)
ALTER TABLE fake_news_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view alerts" 
  ON fake_news_alerts FOR SELECT 
  TO authenticated
  USING (true);

-- 8. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_id_scans_user_id ON id_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_user_id ON prescriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_qr_code ON prescriptions(qr_code);
CREATE INDEX IF NOT EXISTS idx_side_effects_user_id ON side_effects(user_id);
CREATE INDEX IF NOT EXISTS idx_fake_news_alerts_medication ON fake_news_alerts(medication_name);

-- 9. FUNCTIONS for auto-updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
