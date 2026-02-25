/**
 * SmartQure — Phase 3: Verification Engine + Confidence Scoring
 *
 * This is the core logic that powers the /api/verify endpoint.
 * Replaces all hardcoded 95/72/12 confidence values with real scoring.
 *
 * Scoring breakdown (total: 100 points):
 *   [30pts] GTIN/medication known in database
 *   [25pts] Batch number match + batch status
 *   [20pts] Expiry date valid and consistent
 *   [15pts] Manufacturer WHO/GS1 verified
 *   [10pts] No active alerts for this drug/batch/area
 *
 * Result thresholds:
 *   85–100 → "verified"   (green)
 *   50–84  → "caution"    (amber)
 *   0–49   → "fake"       (red)
 *
 * Usage (Next.js API route):
 *   import { verifyMedication } from '@/lib/verificationEngine';
 *   const result = await verifyMedication({ gtin, batch_number, expiry_date, medication_name, user_location });
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── GS1 Barcode Parser ───────────────────────────────────────────────────────
/**
 * Parses a raw GS1 barcode string into structured fields.
 * Handles GS1-128, GS1 DataMatrix, and GS1 QR Code formats.
 *
 * Application Identifiers (AIs) used in pharmaceutical barcodes:
 *   (01) GTIN-14         — 14-digit product code
 *   (10) Batch/Lot       — batch number (variable length, ends at FNC1 or next AI)
 *   (17) Expiry date     — YYMMDD format
 *   (21) Serial number   — individual item serial
 *
 * @param {string} rawBarcode - raw string from barcode scanner (ZXing output)
 * @returns {{ gtin, batch_number, expiry_date, serial_number, raw, error }}
 */
export function parseGS1Barcode(rawBarcode) {
  if (!rawBarcode) return { error: 'No barcode data provided' };

  // ZXing sometimes prefixes with ']C1' (GS1-128 symbology identifier) — strip it
  let data = rawBarcode.replace(/^\]C1/, '').replace(/^\]d2/, '');

  const result = {
    gtin: null,
    batch_number: null,
    expiry_date: null,
    serial_number: null,
    raw: rawBarcode,
    error: null,
  };

  // FNC1 separator character (ASCII 29, or ^ in some scanners)
  const FNC1 = String.fromCharCode(29);
  data = data.replace(/\^/g, FNC1); // normalize ^ → FNC1

  let pos = 0;

  while (pos < data.length) {
    // Read Application Identifier — try 4-digit first, then 3, then 2
    let ai = null;
    let value = null;

    if (pos + 4 <= data.length) {
      const ai4 = data.substring(pos, pos + 4);
      // Fixed-length AIs starting with these prefixes
      if (['3100','3101','3102','3103','3104','3105'].includes(ai4)) {
        ai = ai4;
        value = data.substring(pos + 4, pos + 10);
        pos += 10;
      }
    }

    if (!ai && pos + 2 <= data.length) {
      const ai2 = data.substring(pos, pos + 2);

      if (ai2 === '01') {
        // GTIN: fixed 14 chars
        result.gtin = data.substring(pos + 2, pos + 16);
        pos += 16;
        continue;
      }

      if (ai2 === '17') {
        // Expiry date: fixed 6 chars YYMMDD
        const raw = data.substring(pos + 2, pos + 8);
        result.expiry_date = parseGS1Date(raw);
        pos += 8;
        continue;
      }

      if (ai2 === '10') {
        // Batch/Lot: variable length, ends at FNC1 or end of string
        const start = pos + 2;
        const fnc1pos = data.indexOf(FNC1, start);
        const end = fnc1pos === -1 ? data.length : fnc1pos;
        result.batch_number = data.substring(start, Math.min(end, start + 20));
        pos = end + 1; // skip past FNC1
        continue;
      }

      if (ai2 === '21') {
        // Serial number: variable length
        const start = pos + 2;
        const fnc1pos = data.indexOf(FNC1, start);
        const end = fnc1pos === -1 ? data.length : fnc1pos;
        result.serial_number = data.substring(start, Math.min(end, start + 20));
        pos = end + 1;
        continue;
      }
    }

    // Unknown AI or malformed — advance one char to avoid infinite loop
    pos++;
  }

  // Validate GTIN check digit
  if (result.gtin) {
    if (!validateGTINCheckDigit(result.gtin)) {
      result.error = `GTIN check digit invalid (${result.gtin}) — possible scan error or counterfeit`;
    }
  }

  return result;
}

/**
 * Parse GS1 date format YYMMDD → ISO date string
 * Per GS1 spec: if MM=00, it means the last day of the year;
 * if DD=00, it means the last day of the month.
 */
function parseGS1Date(yymmdd) {
  if (!yymmdd || yymmdd.length !== 6) return null;
  const yy = parseInt(yymmdd.substring(0, 2));
  const mm = parseInt(yymmdd.substring(2, 4));
  const dd = parseInt(yymmdd.substring(4, 6));

  // GS1 spec: years 00-49 = 2000-2049, 50-99 = 1950-1999
  const year = yy <= 49 ? 2000 + yy : 1900 + yy;
  const month = mm === 0 ? 12 : mm;
  const day = dd === 0 ? new Date(year, month, 0).getDate() : dd;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Validate GTIN-8, GTIN-12, GTIN-13, or GTIN-14 check digit
 * using the standard GS1 modulo-10 algorithm.
 */
export function validateGTINCheckDigit(gtin) {
  if (!gtin || !/^\d+$/.test(gtin)) return false;
  if (![8, 12, 13, 14].includes(gtin.length)) return false;

  const digits = gtin.split('').map(Number);
  const checkDigit = digits.pop();
  let sum = 0;

  digits.reverse().forEach((d, i) => {
    sum += d * (i % 2 === 0 ? 3 : 1);
  });

  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}


// ─── Confidence Scoring ───────────────────────────────────────────────────────

/**
 * Score breakdown object — returned alongside final result for UI display.
 * @typedef {Object} ScoreBreakdown
 * @property {number} medication_known   - 0 or 30
 * @property {number} batch_match        - 0, 10, 15, or 25
 * @property {number} expiry_valid       - 0, 10, 15, or 20
 * @property {number} manufacturer_trust - 0, 8, 12, or 15
 * @property {number} no_alerts          - 0 or 10
 * @property {number} total              - 0–100
 */

/**
 * Core verification function.
 *
 * @param {Object} input
 * @param {string} [input.gtin]             - GTIN from barcode scan
 * @param {string} [input.batch_number]     - batch/lot number
 * @param {string} [input.expiry_date]      - ISO date string (YYYY-MM-DD)
 * @param {string} [input.medication_name]  - free text (for manual entry fallback)
 * @param {string} [input.scan_type]        - 'barcode' | 'photo' | 'manual'
 * @param {string} [input.user_location]    - country code e.g. 'SO'
 * @returns {Promise<VerificationResult>}
 */
export async function verifyMedication({
  gtin = null,
  batch_number = null,
  expiry_date = null,
  medication_name = null,
  scan_type = 'manual',
  user_location = null,
}) {
  const scoreBreakdown = {
    medication_known: 0,
    batch_match: 0,
    expiry_valid: 0,
    manufacturer_trust: 0,
    no_alerts: 0,
    total: 0,
  };

  const flags = [];         // Array of human-readable flag strings shown in UI
  let medication = null;
  let batch = null;
  let manufacturer = null;

  // ── Step 1: Identify medication (30 pts) ─────────────────────────────────
  if (gtin) {
    // Primary: look up by GTIN prefix in medications table
    const { data: medByGtin } = await supabase
      .from('medications')
      .select('*, manufacturers!primary_manufacturer_id(*)')
      .contains('gtin_prefixes', [gtin.substring(0, 8)])
      .limit(1)
      .maybeSingle();

    if (medByGtin) {
      medication = medByGtin;
      scoreBreakdown.medication_known = 30;
    }
  }

  if (!medication && medication_name) {
    // Require at least 3 characters — single-letter searches match too broadly
    if (medication_name.trim().length >= 3) {
      const { data: medByName } = await supabase
        .from('medications')
        .select('*, manufacturers!primary_manufacturer_id(*)')
        .or(`inn_name.ilike.%${medication_name}%,brand_names.cs.{"${medication_name}"}`)
        .limit(1)
        .maybeSingle();

      if (medByName) {
        medication = medByName;
        scoreBreakdown.medication_known = scan_type === 'barcode' ? 15 : 20;
        flags.push('Medication identified by name only — barcode not matched');
      }
    } else {
      flags.push('Medication name too short to search — please enter a more complete name');
    }
  }

  if (!medication) {
    flags.push('Medication not found in database');
    scoreBreakdown.medication_known = 0;
  }

  // Flag if medication is known to be commonly counterfeited
  if (medication?.common_counterfeits) {
    flags.push(`⚠️ ${medication.inn_name} is frequently counterfeited in East Africa. Inspect packaging carefully.`);
  }

  // ── Step 2: Batch number verification (25 pts) ────────────────────────────
  if (batch_number && medication) {
    const { data: batchData } = await supabase
      .from('medication_batches')
      .select('*, manufacturers(*)')
      .eq('batch_number', batch_number)
      .eq('medication_id', medication.id)
      .maybeSingle();

    if (batchData) {
      batch = batchData;

      if (batchData.status === 'active') {
        scoreBreakdown.batch_match = batchData.who_batch_released ? 25 : 18;
        if (batchData.who_batch_released) {
          flags.push('✅ Batch confirmed in WHO prequalified release records');
        }
      } else if (batchData.status === 'recalled') {
        scoreBreakdown.batch_match = 0;
        flags.push(`🚨 RECALLED BATCH: ${batchData.recall_reason || 'Recalled by manufacturer/authority'}`);
      } else if (batchData.status === 'expired') {
        scoreBreakdown.batch_match = 5;
        flags.push('⚠️ This batch is expired per database records');
      }

      manufacturer = batchData.manufacturers;
    } else if (batch_number) {
      // Batch not in DB — suspicious but not conclusive
      scoreBreakdown.batch_match = 10;
      flags.push('Batch number not found in database — could be a new batch or unregistered product');
    }
  } else if (!batch_number) {
    scoreBreakdown.batch_match = 10; // no batch provided — neutral
    flags.push('No batch number provided — full verification not possible');
  }

  // ── Step 3: Expiry date validation (20 pts) ───────────────────────────────
  if (expiry_date) {
    const today = new Date();
    const expiry = new Date(expiry_date);
    const diffDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));

    if (isNaN(expiry.getTime())) {
      flags.push('⚠️ Expiry date could not be parsed');
      scoreBreakdown.expiry_valid = 0;
    } else if (diffDays < 0) {
      flags.push(`🚨 EXPIRED: This medication expired ${Math.abs(diffDays)} days ago`);
      scoreBreakdown.expiry_valid = 0;
    } else if (diffDays < 30) {
      flags.push(`⚠️ Expires in ${diffDays} days — do not buy unless you will finish the course`);
      scoreBreakdown.expiry_valid = 10;
    } else {
      scoreBreakdown.expiry_valid = 15;

      // Cross-check: does the expiry on the box match what's in our batch record?
      if (batch?.expiry_date) {
        const dbExpiry = new Date(batch.expiry_date);
        const diffMs = Math.abs(expiry - dbExpiry);
        const diffDaysFromDb = diffMs / (1000 * 60 * 60 * 24);

        if (diffDaysFromDb > 90) {
          // More than 90 days difference is suspicious (possible relabelling)
          scoreBreakdown.expiry_valid = 5;
          flags.push(`⚠️ Expiry date on packaging (${expiry_date}) differs significantly from our records (${batch.expiry_date}) — possible relabelling`);
        } else {
          scoreBreakdown.expiry_valid = 20;
          flags.push('✅ Expiry date matches batch records');
        }
      } else {
        scoreBreakdown.expiry_valid = 15;
      }
    }
  } else {
    // No expiry provided
    scoreBreakdown.expiry_valid = 5;
    flags.push('No expiry date provided');
  }

  // ── Step 4: Manufacturer trust (15 pts) ───────────────────────────────────
  // Use batch manufacturer if available, otherwise medication's primary manufacturer
  const mfg = manufacturer || medication?.manufacturers;

  if (mfg) {
    if (mfg.who_prequalified && mfg.verified) {
      scoreBreakdown.manufacturer_trust = 15;
      flags.push(`✅ Manufacturer (${mfg.short_name || mfg.name}) is WHO Prequalified`);
    } else if (mfg.verified) {
      scoreBreakdown.manufacturer_trust = 12;
      flags.push(`✅ Manufacturer (${mfg.short_name || mfg.name}) is verified`);
    } else {
      scoreBreakdown.manufacturer_trust = 5;
      flags.push(`⚠️ Manufacturer (${mfg.name}) not fully verified`);
    }

    // GTIN company prefix check — does the GTIN match the manufacturer's GS1 prefix?
    if (gtin && mfg.gs1_company_prefix) {
      if (!gtin.includes(mfg.gs1_company_prefix)) {
        scoreBreakdown.manufacturer_trust = Math.max(0, scoreBreakdown.manufacturer_trust - 8);
        flags.push('🚨 GTIN company prefix does not match manufacturer\'s registered GS1 prefix — high risk of counterfeit');
      }
    }
  } else {
    scoreBreakdown.manufacturer_trust = 0;
    flags.push('⚠️ Manufacturer unknown or unverified');
  }

  // ── Step 5: Active alerts check (10 pts) ──────────────────────────────────
  const alertQuery = supabase
    .from('fake_news_alerts')
    .select('id, medication_name, severity, description, affected_area')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  if (medication) {
    alertQuery.ilike('medication_name', `%${medication.inn_name}%`);
  }
  if (batch_number) {
    // Check alerts matching this specific batch
    alertQuery.or(`batch_number.is.null,batch_number.eq.${batch_number}`);
  }

  const { data: alerts } = await alertQuery.limit(5);

  const relevantAlerts = alerts?.filter(a => {
    if (!user_location) return true;
    if (!a.affected_area) return true;
    return a.affected_area.includes(user_location);
  }) || [];

  if (relevantAlerts.length === 0) {
    scoreBreakdown.no_alerts = 10;
  } else {
    scoreBreakdown.no_alerts = 0;
    relevantAlerts.forEach(alert => {
      const severity = alert.severity?.toUpperCase() || 'MEDIUM';
      flags.push(`🚨 ACTIVE ALERT [${severity}]: ${alert.description || alert.medication_name}`);
    });
  }

  // ── Final score & result ──────────────────────────────────────────────────
  scoreBreakdown.total =
    scoreBreakdown.medication_known +
    scoreBreakdown.batch_match +
    scoreBreakdown.expiry_valid +
    scoreBreakdown.manufacturer_trust +
    scoreBreakdown.no_alerts;

  // Hard overrides — certain conditions force a specific result regardless of score
  let result;
  if (batch?.status === 'recalled') {
    result = 'fake'; // Always red if batch is recalled
  } else if (expiry_date && new Date(expiry_date) < new Date()) {
    result = 'fake'; // Always red if expired
  } else if (scoreBreakdown.total >= 85) {
    result = 'verified';
  } else if (scoreBreakdown.total >= 50) {
    result = 'caution';
  } else {
    result = 'fake';
  }

  return {
    result,                    // 'verified' | 'caution' | 'fake'
    confidence: scoreBreakdown.total,
    score_breakdown: scoreBreakdown,
    flags,                     // Array of human-readable messages for UI
    medication: medication ? {
      id: medication.id,
      inn_name: medication.inn_name,
      brand_names: medication.brand_names,
      dosage_form: medication.dosage_form,
      strength: medication.strength,
      therapeutic_class: medication.therapeutic_class,
      who_eml: medication.who_eml,
      prescription_required: medication.prescription_required,
      storage_conditions: medication.storage_conditions,
      common_counterfeits: medication.common_counterfeits,
      counterfeit_notes: medication.counterfeit_notes,
    } : null,
    batch: batch ? {
      id: batch.id,
      batch_number: batch.batch_number,
      gtin: batch.gtin,
      expiry_date: batch.expiry_date,
      status: batch.status,
      who_batch_released: batch.who_batch_released,
      countries_distributed: batch.countries_distributed,
    } : null,
    manufacturer: mfg ? {
      name: mfg.name,
      short_name: mfg.short_name,
      country: mfg.country,
      who_prequalified: mfg.who_prequalified,
    } : null,
    alerts: relevantAlerts,
    scanned_at: new Date().toISOString(),
  };
}


// ─── Next.js API Route Handler ────────────────────────────────────────────────
/**
 * Drop this into: app/api/verify/route.js (Next.js App Router)
 * or: pages/api/verify.js (Pages Router)
 *
 * Accepts POST with JSON body:
 * {
 *   barcode?: string,       // raw GS1 barcode string (preferred)
 *   gtin?: string,          // manual GTIN if already parsed
 *   batch_number?: string,
 *   expiry_date?: string,
 *   medication_name?: string,
 *   scan_type?: string,
 *   user_location?: string,
 *   user_id?: string,       // optional — to save scan to scans table
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();

    let gtin = body.gtin || null;
    let batch_number = body.batch_number || null;
    let expiry_date = body.expiry_date || null;

    // If raw barcode string provided, parse it first
    if (body.barcode) {
      const parsed = parseGS1Barcode(body.barcode);
      gtin = parsed.gtin || gtin;
      batch_number = parsed.batch_number || batch_number;
      expiry_date = parsed.expiry_date || expiry_date;
    }

    const verificationResult = await verifyMedication({
      gtin,
      batch_number,
      expiry_date,
      medication_name: body.medication_name,
      scan_type: body.scan_type || (body.barcode ? 'barcode' : 'manual'),
      user_location: body.user_location,
    });

    // Persist scan to database if user_id provided
    if (body.user_id) {
      await supabase.from('scans').insert({
        user_id: body.user_id,
        medication_name: verificationResult.medication?.inn_name || body.medication_name || 'Unknown',
        batch_number: batch_number,
        expiry_date: expiry_date,
        manufacturer: verificationResult.manufacturer?.name,
        result: verificationResult.result,
        confidence: verificationResult.confidence,
        has_alert: verificationResult.alerts.length > 0,
        alert_details: verificationResult.alerts.length > 0 ? verificationResult.alerts : null,
        scan_type: body.scan_type || (body.barcode ? 'barcode' : 'manual'),
      });
    }

    return Response.json(verificationResult, { status: 200 });
  } catch (err) {
    console.error('Verification error:', err);
    return Response.json({ error: 'Verification failed', details: err.message }, { status: 500 });
  }
}
