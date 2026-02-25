// app/api/verify/route.js
// Medicine verification API endpoint for RxQure / SmartQure
//
// Accepts both barcode scans and manual entry:
//
//   POST /api/verify
//   Body (barcode scan):
//     { type: 'barcode', raw_barcode: string, user_id?: string, location_country?: string }
//
//   Body (manual entry):
//     { type: 'manual', medication_name: string, manufacturer_name?: string,
//       batch_number?: string, expiry_date?: string, user_id?: string, location_country?: string }
//
//   Response:
//     { result: 'verified'|'caution'|'fake'|'unknown', confidence: number,
//       medication: object|null, batch: object|null, flags: string[],
//       scan_id: string, details: object }

import { createClient } from '@supabase/supabase-js';
import { parseGS1Barcode, verifyMedication } from '@/lib/verificationEngine';

export async function POST(req) {
  try {
    const body = await req.json();
    const { type, user_id, location_country } = body;

    if (!type || !['barcode', 'manual'].includes(type)) {
      return Response.json({ error: 'type must be "barcode" or "manual"' }, { status: 400 });
    }

    // ── Service-role Supabase client (server-side only) ──────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    let verificationInput = {};

    if (type === 'barcode') {
      const { raw_barcode } = body;
      if (!raw_barcode) {
        return Response.json({ error: 'raw_barcode is required for barcode type' }, { status: 400 });
      }

      // Parse GS1 barcode into structured fields
      const parsed = parseGS1Barcode(raw_barcode);
      if (parsed.error && !parsed.gtin) {
        return Response.json({
          result: 'unknown',
          confidence: 0,
          flags: ['barcode_parse_error'],
          details: { parse_error: parsed.error },
          scan_id: null,
        });
      }

      verificationInput = {
        gtin:              parsed.gtin,
        batch_number:      parsed.batch_number,
        expiry_date:       parsed.expiry_date,
        serial_number:     parsed.serial_number,
        user_location:     location_country || null,
      };

    } else {
      // Manual entry
      const { medication_name, manufacturer_name, batch_number, expiry_date } = body;
      if (!medication_name) {
        return Response.json({ error: 'medication_name is required for manual type' }, { status: 400 });
      }
      if (medication_name.trim().length < 3) {
        return Response.json({ error: 'Please enter at least 3 characters for the medication name' }, { status: 400 });
      }
      verificationInput = {
        medication_name,
        manufacturer_name: manufacturer_name || null,
        batch_number:      batch_number      || null,
        expiry_date:       expiry_date       || null,
        user_location:     location_country  || null,
      };
    }

    // ── Run verification engine ───────────────────────────────────────────────
    const verification = await verifyMedication(verificationInput);

    // ── Save scan to Supabase ─────────────────────────────────────────────────
    const scanPayload = {
      user_id:         user_id || null,
      scan_type:       type === 'barcode' ? 'barcode' : 'manual',
      raw_input:       type === 'barcode' ? body.raw_barcode : (body.medication_name || ''),
      medication_id:   verification.medication?.id    || null,
      batch_id:        verification.batch?.id         || null,
      result:          verification.result,
      confidence:      verification.confidence,
      flags:           verification.flags             || [],
      location_country: location_country             || null,
    };

    const { data: scan, error: scanErr } = await supabase
      .from('scans')
      .insert(scanPayload)
      .select('id')
      .single();

    if (scanErr) {
      console.error('Error saving scan:', scanErr);
      // Don't fail — return result even if save failed
    }

    // ── Also log to verification_log table (detailed record) ─────────────────
    if (scan?.id) {
      await supabase.from('verification_log').insert({
        scan_id:       scan.id,
        user_id:       user_id || null,
        medication_id: verification.medication?.id  || null,
        batch_id:      verification.batch?.id       || null,
        gtin_scanned:  verificationInput.gtin       || null,
        batch_scanned: verificationInput.batch_number || null,
        result:        verification.result,
        confidence:    verification.confidence,
        score_breakdown: verification.scoreBreakdown || {},
        flags:         verification.flags            || [],
        alert_id:      verification.alert?.id       || null,
        location_country: location_country          || null,
      });
    }

    return Response.json({
      result:     verification.result,
      confidence: verification.confidence,
      medication: verification.medication
        ? {
            id:          verification.medication.id,
            name:        verification.medication.inn_name,
            brand_names: verification.medication.brand_names,
            dosage_form: verification.medication.dosage_form,
            strength:    verification.medication.strength,
            who_eml:     verification.medication.who_eml,
          }
        : null,
      batch: verification.batch
        ? {
            batch_number:   verification.batch.batch_number,
            expiry_date:    verification.batch.expiry_date,
            status:         verification.batch.status,
            recall_reason:  verification.batch.recall_reason || null,
          }
        : null,
      manufacturer: verification.manufacturer
        ? {
            name:       verification.manufacturer.name,
            country:    verification.manufacturer.country,
            who_pq:     verification.manufacturer.who_pq_status,
          }
        : null,
      alert:     verification.alert   || null,
      flags:     verification.flags   || [],
      scan_id:   scan?.id             || null,
      details:   verification.details || {},
    });

  } catch (err) {
    console.error('Verification API error:', err);
    return Response.json(
      { error: 'Internal server error', result: 'unknown', confidence: 0 },
      { status: 500 }
    );
  }
}
