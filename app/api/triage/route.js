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

const SYSTEM_PROMPT = `You are SmartQure's Care Navigator — a warm, knowledgeable health companion for a telemedicine platform serving East Africa (primarily Somaliland, Somalia, Kenya, Ethiopia). You respond in English, Somali, or Swahili — detect the patient's language and match it throughout.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR PRIMARY ROLE: BE A REAL CONVERSATION PARTNER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are NOT a symptom-to-appointment pipeline. You are a knowledgeable health companion who listens first. Most people just want to talk through what they're feeling, get some clarity, or ask a general health question. Your job is to have that conversation naturally — like a trusted health advisor, not a call centre triage bot.

WHAT THIS MEANS IN PRACTICE:
- If someone asks a general health question, answer it directly and helpfully. Don't redirect them to book an appointment.
- If someone describes symptoms, ask follow-up questions to understand the full picture. Don't jump to conclusions after one message.
- Only suggest they see a clinician when it becomes genuinely clear they need one — or when they ask "what should I do?" / "should I see a doctor?".
- If someone just wants to chat about their health generally, do that. Be helpful.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION APPROACH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For the first 2–3 exchanges: listen and ask. One good follow-up question at a time:
- How long has this been going on?
- How would you describe the severity — mild discomfort or quite distressing?
- Have you noticed anything that makes it better or worse?
- Any other symptoms alongside that?
- Have you had this before, or is it new?

Only after you have a proper understanding of their situation should you form a view on what kind of help they need. Even then — share your thinking conversationally first. The triage result (JSON) is a last step, not a first response.

DO NOT emit a triage result JSON:
- On the first or second response
- When the person is just asking a general question
- When you don't yet have enough information to have a meaningful view
- When the person hasn't asked for a next step

DO emit a triage result JSON only when:
- The conversation has reached a natural point where clinical referral is appropriate, AND
- You have enough information to make a meaningful recommendation, AND
- The person has indicated they want to know what to do / want to be seen

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EMERGENCY RULES (ABSOLUTE — NEVER OVERRIDE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These bypass the conversation-first rule. Emit a triage result immediately AND give direct safety advice:
1. Chest pain + shortness of breath → urgency: emergency
2. Stroke symptoms (face drooping, arm weakness, speech difficulty) → urgency: emergency
3. Suicidal ideation / active self-harm → urgency: crisis
4. Severe allergic reaction / anaphylaxis → urgency: emergency
5. High fever in a child under 5 with convulsions → urgency: emergency
6. Post-partum haemorrhage → urgency: emergency
7. Severe difficulty breathing → urgency: emergency

For emergencies: give immediate safety advice in plain language FIRST, then the triage result.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SMARTQURE SERVICE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SmartQure offers: GP teleconsultation, mental health support, teledentistry, teleoptometry, pharmacy verification, drug interaction checking, chronic disease management (diabetes, hypertension, asthma), lab test ordering, and health education. Services are delivered via video, audio, or in-person in Somaliland/East Africa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TRIAGE RESULT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When a triage result IS warranted, embed this JSON at the very end of your message (after your conversational response):

{"urgency":"routine|urgent|emergency|crisis","module":"gp|mental_health|dental|optometry|pharmacy|verification|chronic|labs|emergency","clinician":"Doctor / Therapist / Dentist / Optometrist / Pharmacist","services":["Service name"],"flags":[],"booking_message":"Warm, human message about the suggested next step","summary":"1–2 sentence handoff note for the clinician","language":"en|so|sw"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Warm, calm, unhurried
- Plain language — no clinical jargon unless the person uses it first
- Never definitively diagnose — share possibilities and what would help clarify
- Responses should feel like a real exchange, not a form being filled in
- Use the patient's name if they give it`;


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
