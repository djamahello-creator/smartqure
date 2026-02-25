// app/api/id-verify/route.js
// Server-side ID verification using AWS Rekognition + Tesseract OCR
// AWS credentials stay server-side — never exposed to the browser.
//
// POST /api/id-verify
// Body: { front: string (base64), back: string (base64), selfie: string (base64), user_id: string }
// Response: { result: 'verified'|'caution'|'failed', confidence: number, extracted: object, error?: string }

import { CompareFacesCommand, DetectTextCommand } from '@aws-sdk/client-rekognition';
import { rekognitionClient } from '@/lib/awsConfig';
import { createClient } from '@supabase/supabase-js';

// Convert base64 data URL to Buffer for Rekognition
function base64ToBuffer(base64String) {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

export async function POST(req) {
  try {
    const { front, back, selfie, user_id } = await req.json();

    if (!front || !selfie) {
      return Response.json(
        { error: 'front and selfie images are required' },
        { status: 400 }
      );
    }

    const frontBuffer  = base64ToBuffer(front);
    const selfieBuffer = base64ToBuffer(selfie);

    // ── Step 1: Compare faces (ID photo vs selfie) ───────────────────────────
    let faceMatchConfidence = 0;
    let faceMatchResult     = 'no_match';

    try {
      const compareFacesCmd = new CompareFacesCommand({
        SourceImage: { Bytes: selfieBuffer },
        TargetImage: { Bytes: frontBuffer },
        SimilarityThreshold: 70,
      });

      const faceData = await rekognitionClient.send(compareFacesCmd);
      const topMatch = faceData.FaceMatches?.[0];

      if (topMatch) {
        faceMatchConfidence = Math.round(topMatch.Similarity);
        faceMatchResult = faceMatchConfidence >= 90 ? 'high_match'
                        : faceMatchConfidence >= 70 ? 'possible_match'
                        : 'low_match';
      }
    } catch (faceErr) {
      console.warn('Face comparison error:', faceErr.message);
      // Continue — don't block on Rekognition failure
    }

    // ── Step 2: Extract text from ID front ───────────────────────────────────
    let extractedText = '';
    let extractedFields = {};

    try {
      const detectTextCmd = new DetectTextCommand({
        Image: { Bytes: frontBuffer },
      });

      const textData = await rekognitionClient.send(detectTextCmd);
      extractedText = textData.TextDetections
        ?.filter(t => t.Type === 'LINE')
        .map(t => t.DetectedText)
        .join('\n') || '';

      // Simple field extraction from common ID formats
      const nameMatch   = extractedText.match(/(?:name|full name)[:\s]+([A-Z\s]+)/i);
      const dobMatch    = extractedText.match(/(?:dob|date of birth|born)[:\s]+([0-9\/\-.]+)/i);
      const idMatch     = extractedText.match(/(?:id no|id number|no\.)[:\s]+([A-Z0-9]+)/i);

      extractedFields = {
        name:     nameMatch?.[1]?.trim() || null,
        dob:      dobMatch?.[1]?.trim()  || null,
        id_number: idMatch?.[1]?.trim()  || null,
      };
    } catch (textErr) {
      console.warn('Text extraction error:', textErr.message);
    }

    // ── Step 3: Determine result ─────────────────────────────────────────────
    let result     = 'caution';
    let confidence = 0;

    if (faceMatchConfidence >= 90) {
      result     = 'verified';
      confidence = faceMatchConfidence;
    } else if (faceMatchConfidence >= 70) {
      result     = 'caution';
      confidence = faceMatchConfidence;
    } else {
      result     = 'caution';
      confidence = Math.max(faceMatchConfidence, 40); // minimum score for "attempted"
    }

    // ── Step 4: Save to Supabase ─────────────────────────────────────────────
    if (user_id) {
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_KEY
        );

        await supabase.from('id_scans').insert({
          user_id,
          verification_result: result,
          confidence,
          extracted_name:       extractedFields.name      || null,
          extracted_dob:        extractedFields.dob       || null,
          face_match_score:     faceMatchConfidence,
          status:               result === 'verified' ? 'approved' : 'manual_review',
        });

        // If verified, update profile
        if (result === 'verified') {
          await supabase.from('profiles')
            .update({ verified: true, verified_at: new Date().toISOString() })
            .eq('id', user_id);
        }
      } catch (dbErr) {
        console.error('DB save error:', dbErr);
        // Don't fail the response
      }
    }

    return Response.json({
      result,
      confidence,
      face_match: { confidence: faceMatchConfidence, result: faceMatchResult },
      extracted:  extractedFields,
    });

  } catch (err) {
    console.error('ID verify error:', err);
    return Response.json(
      { error: 'Verification service error', result: 'caution', confidence: 0 },
      { status: 500 }
    );
  }
}
