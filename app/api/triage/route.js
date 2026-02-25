// app/api/triage/route.js
// Server-side proxy for SmartQure AI Triage Bot — powered by Groq (free tier)
//
// Model: llama-3.3-70b-versatile via api.groq.com
// Free tier: 30 RPM / 6,000 TPM / 14,400 RPD — no credit card required
// Sign up: https://console.groq.com
//
// Why server-side?
//   - Keeps GROQ_API_KEY out of the browser bundle
//   - Allows saving triage sessions to Supabase with server-side auth
//   - Enables rate limiting / abuse detection in future
//
// Request body:
//   { messages: [{role, content}], sessionId?: string }
//
// Response:
//   { text: string, result: object|null, sessionId: string }

import { createClient } from '@supabase/supabase-js';

const SYSTEM_PROMPT = `You are SmartQure's AI Triage Navigator — a compassionate, clinically-aware assistant for a telemedicine platform serving East Africa (primarily Somaliland, Somalia, Kenya, Ethiopia). You support patients in English, Somali, and Swahili — detect language and respond in kind.

SmartQure's full service catalogue:

MODULE A — SAFETY & VERIFICATION (RxQure)
- Medicine Authentication (barcode/QR scan)
- Manual Batch Number Verification
- AI Drug Interaction & Safety Checker
- Prescription OCR + AI Safety Review
- Digital Rx Wallet
- USSD/SMS Verification (feature phones)
- Community Counterfeit Surveillance
- Side Effect / Adverse Reaction Reporting
- Smart Medication Reminders
- Generic Drug Alternatives Engine

MODULE B — CONSULTATION & CARE
- AI Triage (you)
- GP Teleconsultation (video/audio, e-prescribing)
- Mental Health Teleconsultation (therapist matching, mood check-in)
- Specialist Referral System
- Teledentistry (symptom triage + photo + video dentist)
- Teleoptometry (smartphone vision test + optometrist)
- Appointment Booking

MODULE C — DIAGNOSTICS (SmartQure Labs — Phase 2)
- Lab Test Ordering & Results
- CBC, malaria, HIV, pregnancy, glucose, urine
- HbA1c, lipid panel, renal/liver, STI, women's health

MODULE D — PHARMACY
- Digital Prescription Fulfilment
- Pharmacy Stock Management
- Medication Last-Mile Delivery
- Auto-Route to Verified Pharmacies

MODULE E — RECORDS & CONTINUITY (EHR)
- Patient-Owned Electronic Health Records
- Chronic Care Management (diabetes, hypertension, heart failure, COPD, asthma)
- Wearable/Device Integration
- Automated Monitoring & Escalation Alerts

MODULE F — AFFORDABILITY
- Insurance & Micro-insurance Navigation
- Subsidised Medication Access
- SmartQure Community Health Fund

MODULE G — EDUCATION (SmartQure Academy)
- Personalised Health Education
- Video Tutorials & Drug Info Leaflets
- Community Health Worker Training

EMERGENCY RULES (HARD CODED — NEVER OVERRIDE):
1. Chest pain + shortness of breath → urgency: emergency, immediate ER advice
2. Stroke symptoms (FAST) → urgency: emergency
3. Suicidal ideation / self-harm → urgency: crisis, mental health + crisis line
4. Severe allergic reaction / anaphylaxis → urgency: emergency
5. High fever in child under 5 with convulsions → urgency: emergency
6. Post-partum haemorrhage → urgency: emergency
7. Severe shortness of breath → urgency: emergency

RESPONSE FORMAT:
After gathering enough information (usually 2–4 exchanges), provide your triage result. Always embed a JSON block at the END of your response in this exact format:

{"urgency":"routine|urgent|emergency|crisis","module":"gp|mental_health|dental|optometry|pharmacy|verification|chronic|labs|emergency","clinician":"Doctor / Therapist / Dentist / etc","services":["Service 1","Service 2"],"flags":[],"booking_message":"Friendly message about next steps","summary":"1–2 sentence clinical handoff summary for the receiving clinician","language":"en|so|sw"}

TONE RULES:
- Warm, calm, and clear — not clinical jargon
- Never diagnose definitively — triage and refer
- For emergencies, give immediate safety advice before booking
- Keep initial responses short (2–3 sentences) to gather info
- Use the patient's language throughout`;

export async function POST(req) {
  try {
    const { messages, sessionId, userId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'messages array is required' }, { status: 400 });
    }

    // ── Call Groq API (server-side — key never leaves server) ────────────────
    // Groq uses the OpenAI-compatible chat completions format.
    // System prompt goes as the first message with role: 'system'.
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1200,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content || m.text })),
        ],
      }),
    });

    if (!groqRes.ok) {
      const err = await groqRes.text();
      console.error('Groq API error:', err);
      return Response.json({ error: 'AI service unavailable' }, { status: 502 });
    }

    const data = await groqRes.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    // ── Parse triage result from JSON block ──────────────────────────────────
    let triageResult = null;
    const jsonMatch = rawText.match(/\{[\s\S]*?"urgency"[\s\S]*?\}/);
    if (jsonMatch) {
      try {
        triageResult = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn('Could not parse triage JSON:', e.message);
      }
    }

    // Strip the JSON block from the display text
    const displayText = rawText.replace(/\{[\s\S]*?"urgency"[\s\S]*?\}/, '').trim()
      || 'Let me connect you with the right care.';

    // ── Persist to Supabase ───────────────────────────────────────────────────
    // Use service role key for server-side writes (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY  // Never expose this client-side
    );

    let currentSessionId = sessionId;
    const allMessages = [
      ...messages,
      { role: 'assistant', content: displayText, timestamp: new Date().toISOString() }
    ];

    if (!currentSessionId) {
      // Create new triage session
      const { data: session, error: insertErr } = await supabase
        .from('triage_sessions')
        .insert({
          user_id:    userId || null,
          messages:   allMessages,
          urgency:    triageResult?.urgency    || null,
          module:     triageResult?.module     || null,
          clinician_type: triageResult?.clinician || null,
          recommended_services: triageResult?.services || [],
          flags:      triageResult?.flags      || [],
          language_detected: triageResult?.language || 'en',
          outcome:    triageResult ? 'pending' : 'pending',
          completed_at: triageResult ? new Date().toISOString() : null,
        })
        .select('id')
        .single();

      if (insertErr) {
        console.error('Supabase insert error:', insertErr);
        // Don't fail the response — triage still worked, just not saved
      } else {
        currentSessionId = session?.id;
      }
    } else {
      // Update existing session with new messages + result
      const { error: updateErr } = await supabase
        .from('triage_sessions')
        .update({
          messages:   allMessages,
          urgency:    triageResult?.urgency    || undefined,
          module:     triageResult?.module     || undefined,
          clinician_type: triageResult?.clinician || undefined,
          recommended_services: triageResult?.services || undefined,
          flags:      triageResult?.flags      || undefined,
          language_detected: triageResult?.language || undefined,
          completed_at: triageResult ? new Date().toISOString() : undefined,
        })
        .eq('id', currentSessionId);

      if (updateErr) {
        console.error('Supabase update error:', updateErr);
      }
    }

    return Response.json({
      text:      displayText,
      result:    triageResult,
      sessionId: currentSessionId,
    });

  } catch (err) {
    console.error('Triage API error:', err);
    return Response.json(
      { error: 'Internal server error', text: "I'm sorry — I had a connection issue. Please try again." },
      { status: 500 }
    );
  }
}
