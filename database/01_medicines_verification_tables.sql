-- ============================================================
-- MedVerify: Medicines Verification Reference Tables
-- Run AFTER database-schema.sql
-- These are the reference/lookup tables that power verification
-- ============================================================

-- 1. MANUFACTURERS TABLE
-- Stores verified pharmaceutical manufacturers
CREATE TABLE IF NOT EXISTS manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT,
  country TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  gs1_company_prefix TEXT,              -- GS1 prefix for GTIN validation
  who_prequalified BOOLEAN DEFAULT false,
  who_pq_url TEXT,                      -- Link to WHO PQ entry
  regulatory_approvals TEXT[],          -- e.g. {'FDA','EMA','KEBS','NAFDAC'}
  website TEXT,
  contact_email TEXT,
  verified BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view manufacturers"
  ON manufacturers FOR SELECT TO authenticated USING (true);

-- 2. MEDICATIONS TABLE
-- Master reference catalog of legitimate medicines
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inn_name TEXT NOT NULL,               -- WHO International Nonproprietary Name (generic)
  brand_names TEXT[],                   -- e.g. {'Coartem','Riamet','Lumartem'}
  atc_code TEXT,                        -- WHO ATC classification code
  atc_description TEXT,
  dosage_form TEXT NOT NULL,            -- tablet, capsule, syrup, injection, inhaler, etc.
  strength TEXT NOT NULL,               -- e.g. '500mg', '250mg/5ml', '80mg+480mg'
  route TEXT,                           -- oral, intravenous, intramuscular, topical, etc.
  therapeutic_class TEXT,               -- Antibiotic, Antimalarial, Antihypertensive, etc.
  who_eml BOOLEAN DEFAULT false,        -- On WHO Essential Medicines List
  who_eml_edition TEXT,                 -- e.g. '23rd 2023'
  manufacturer_ids UUID[],              -- References manufacturers table
  primary_manufacturer_id UUID REFERENCES manufacturers(id),
  gtin_prefixes TEXT[],                 -- Known GTIN prefixes for this medicine
  countries_registered TEXT[],          -- Countries where this medicine is registered
  prescription_required BOOLEAN DEFAULT true,
  controlled_substance BOOLEAN DEFAULT false,
  cold_chain_required BOOLEAN DEFAULT false,
  pregnancy_category TEXT,              -- A, B, C, D, X
  common_counterfeits BOOLEAN DEFAULT false,  -- Known to be commonly counterfeited
  counterfeit_notes TEXT,
  storage_conditions TEXT,
  shelf_life_months INTEGER,
  active_ingredients JSONB,             -- [{name: 'artemether', amount: '20mg'}, ...]
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view medications"
  ON medications FOR SELECT TO authenticated USING (true);

-- 3. MEDICATION_BATCHES TABLE
-- Batch-level data for high-confidence verification
-- Populated over time via partner pharmacies & manufacturer data
CREATE TABLE IF NOT EXISTS medication_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID REFERENCES medications(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  batch_number TEXT NOT NULL,
  gtin TEXT,                            -- Full 14-digit GTIN if known
  production_date DATE,
  expiry_date DATE NOT NULL,
  quantity_produced INTEGER,
  countries_distributed TEXT[],
  who_batch_released BOOLEAN DEFAULT false,  -- WHO batch release (for biologics)
  status TEXT CHECK (status IN ('active','recalled','expired','quarantine')) DEFAULT 'active',
  recall_reason TEXT,
  recall_date DATE,
  source TEXT DEFAULT 'manual',         -- 'manual','who','manufacturer','partner_pharmacy'
  source_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(batch_number, medication_id)
);

ALTER TABLE medication_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view batches"
  ON medication_batches FOR SELECT TO authenticated USING (true);

-- 4. VERIFICATION_LOG TABLE
-- Audit trail: every time a medicine is verified against the DB
CREATE TABLE IF NOT EXISTS verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  medication_id UUID REFERENCES medications(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  batch_id UUID REFERENCES medication_batches(id),
  gtin_checked TEXT,
  batch_checked TEXT,
  medicine_found BOOLEAN DEFAULT false,
  manufacturer_verified BOOLEAN DEFAULT false,
  batch_found BOOLEAN DEFAULT false,
  gtin_valid BOOLEAN DEFAULT false,
  expiry_valid BOOLEAN DEFAULT false,
  confidence_score INTEGER,
  result TEXT CHECK (result IN ('verified','caution','high_risk')),
  failure_reasons TEXT[],
  data_sources TEXT[],
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE verification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own verification logs"
  ON verification_log FOR SELECT TO authenticated
  USING (scan_id IN (SELECT id FROM scans WHERE user_id = auth.uid()));

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_medications_inn_name ON medications(inn_name);
CREATE INDEX IF NOT EXISTS idx_medications_atc ON medications(atc_code);
CREATE INDEX IF NOT EXISTS idx_medications_who_eml ON medications(who_eml) WHERE who_eml = true;
CREATE INDEX IF NOT EXISTS idx_medications_counterfeits ON medications(common_counterfeits) WHERE common_counterfeits = true;
CREATE INDEX IF NOT EXISTS idx_manufacturers_country ON manufacturers(country_code);
CREATE INDEX IF NOT EXISTS idx_manufacturers_who_pq ON manufacturers(who_prequalified) WHERE who_prequalified = true;
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON medication_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_gtin ON medication_batches(gtin);
CREATE INDEX IF NOT EXISTS idx_batches_status ON medication_batches(status);

-- GIN indexes for array searching
CREATE INDEX IF NOT EXISTS idx_medications_brand_names ON medications USING GIN(brand_names);
CREATE INDEX IF NOT EXISTS idx_medications_countries ON medications USING GIN(countries_registered);

-- Full-text search index omitted here.
-- The verificationEngine.js uses .ilike() queries which work with the indexes above.
-- FTS can be added later via a trigger once the tables are populated.

-- 6. HELPER FUNCTION: verify a medicine by name + batch
CREATE OR REPLACE FUNCTION verify_medicine(
  p_medicine_name TEXT,
  p_batch_number TEXT DEFAULT NULL,
  p_manufacturer TEXT DEFAULT NULL,
  p_gtin TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_medication medications%ROWTYPE;
  v_manufacturer manufacturers%ROWTYPE;
  v_batch medication_batches%ROWTYPE;
  v_confidence INTEGER := 0;
  v_result TEXT;
  v_failure_reasons TEXT[] := '{}';
  v_data_sources TEXT[] := '{}';
BEGIN
  -- Step 1: Look up medicine by INN name or brand name
  SELECT * INTO v_medication
  FROM medications
  WHERE inn_name ILIKE '%' || p_medicine_name || '%'
     OR p_medicine_name ILIKE ANY(brand_names)
  LIMIT 1;

  IF FOUND THEN
    v_confidence := v_confidence + 40;
    v_data_sources := array_append(v_data_sources, 'MedVerify Medicines DB');
  ELSE
    v_failure_reasons := array_append(v_failure_reasons, 'Medicine not found in database');
  END IF;

  -- Step 2: Check manufacturer if provided
  IF p_manufacturer IS NOT NULL THEN
    SELECT * INTO v_manufacturer
    FROM manufacturers
    WHERE name ILIKE '%' || p_manufacturer || '%'
       OR short_name ILIKE '%' || p_manufacturer || '%';

    IF FOUND THEN
      v_confidence := v_confidence + 20;
      v_data_sources := array_append(v_data_sources, 'Manufacturer Registry');
      IF v_manufacturer.who_prequalified THEN
        v_confidence := v_confidence + 20;
        v_data_sources := array_append(v_data_sources, 'WHO Prequalified List');
      END IF;
    ELSE
      v_failure_reasons := array_append(v_failure_reasons, 'Manufacturer not in verified registry');
    END IF;
  END IF;

  -- Step 3: Check batch number if provided
  IF p_batch_number IS NOT NULL AND v_medication.id IS NOT NULL THEN
    SELECT * INTO v_batch
    FROM medication_batches
    WHERE batch_number ILIKE p_batch_number
      AND medication_id = v_medication.id;

    IF FOUND THEN
      v_confidence := v_confidence + 15;
      v_data_sources := array_append(v_data_sources, 'Batch Registry');
      IF v_batch.status = 'recalled' THEN
        v_confidence := 5;
        v_failure_reasons := array_append(v_failure_reasons, 'BATCH RECALLED: ' || COALESCE(v_batch.recall_reason, 'See health authority'));
      END IF;
    ELSE
      v_failure_reasons := array_append(v_failure_reasons, 'Batch number not found in registry');
    END IF;
  END IF;

  -- Step 4: Check if known counterfeit target
  IF v_medication.id IS NOT NULL AND v_medication.common_counterfeits THEN
    v_failure_reasons := array_append(v_failure_reasons, 'HIGH ALERT: This medicine is a known counterfeit target');
    v_confidence := LEAST(v_confidence, 70); -- Cap confidence for high-risk medicines
  END IF;

  -- Step 5: Determine result
  IF v_confidence >= 70 THEN
    v_result := 'verified';
  ELSIF v_confidence >= 40 THEN
    v_result := 'caution';
  ELSE
    v_result := 'high_risk';
  END IF;

  RETURN jsonb_build_object(
    'result', v_result,
    'confidence', v_confidence,
    'medicine_found', v_medication.id IS NOT NULL,
    'manufacturer_verified', v_manufacturer.id IS NOT NULL,
    'batch_found', v_batch.id IS NOT NULL,
    'failure_reasons', v_failure_reasons,
    'data_sources', v_data_sources,
    'medication', CASE WHEN v_medication.id IS NOT NULL THEN
      jsonb_build_object(
        'id', v_medication.id,
        'inn_name', v_medication.inn_name,
        'brand_names', v_medication.brand_names,
        'therapeutic_class', v_medication.therapeutic_class,
        'who_eml', v_medication.who_eml,
        'common_counterfeits', v_medication.common_counterfeits
      )
    ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. UPDATED TIMESTAMP TRIGGERS
CREATE TRIGGER update_manufacturers_updated_at
  BEFORE UPDATE ON manufacturers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
