'use client';
// TriageFlow.jsx — SmartQure AI Triage Navigator
// Wired version: calls /api/triage (server-side) instead of Anthropic directly.
// Triage sessions are persisted to Supabase via the API route.
//
// Props:
//   navigateTo(screen, data) — from SmartQureApp.jsx router
//   user — current Supabase auth user (can be null for anonymous)

import { useState, useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (matches smartqure-triage.jsx source)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:          '#080C12',
  surface:     '#0F1620',
  surfaceHigh: '#162030',
  border:      '#1E2D40',
  borderLight: '#243548',
  accent:      '#00D4AA',
  blue:        '#3B9EFF',
  purple:      '#9B6DFF',
  amber:       '#FFB020',
  red:         '#FF4757',
  green:       '#2ED573',
  text:        '#E8F0F8',
  textSub:     '#7A9BB5',
  textDim:     '#3D5A73',
};

const MODULE_COLORS = {
  gp:           C.blue,
  mental_health: C.purple,
  dental:       C.accent,
  optometry:    C.green,
  pharmacy:     C.amber,
  verification: C.accent,
  chronic:      C.red,
  labs:         C.blue,
  emergency:    C.red,
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span style={{
      background: color + '20', color,
      border: `1px solid ${color}40`,
      borderRadius: 99, padding: '3px 10px',
      fontSize: 11, fontWeight: 600,
      letterSpacing: 0.5,
    }}>{label}</span>
  );
}

function ServiceTag({ name, color }) {
  return (
    <span style={{
      background: color + '18', color,
      borderRadius: 6, padding: '4px 10px',
      fontSize: 12, fontWeight: 500,
      border: `1px solid ${color}30`,
    }}>{name}</span>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '14px 18px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%', background: C.accent,
          animation: `triage-pulse 1.2s ${i * 0.22}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  );
}

function ResultPanel({ result, onBook, onContinue }) {
  const urgencyMeta = {
    routine:   { label: 'Routine',            color: C.accent },
    urgent:    { label: 'Urgent — 24–48 hrs', color: C.amber  },
    emergency: { label: '⚠ EMERGENCY',        color: C.red    },
    crisis:    { label: '⚠ CRISIS',           color: C.red    },
  }[result.urgency] || { label: result.urgency, color: C.accent };

  const modColor = MODULE_COLORS[result.module] || C.accent;

  return (
    <div style={{
      background: C.surface, border: `1px solid ${modColor}44`,
      borderRadius: 16, padding: 20, marginBottom: 14,
      boxShadow: `0 0 30px ${modColor}15`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: modColor, letterSpacing: 1 }}>
          SMARTQURE TRIAGE RESULT
        </span>
        <Badge label={urgencyMeta.label} color={urgencyMeta.color} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 5 }}>REFER TO</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: modColor }}>{result.clinician}</div>
      </div>

      {result.services?.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 8 }}>RECOMMENDED SERVICES</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {result.services.map(s => <ServiceTag key={s} name={s} color={modColor} />)}
          </div>
        </div>
      )}

      {result.flags?.length > 0 && (
        <div style={{
          background: C.red + '15', border: `1px solid ${C.red}33`,
          borderRadius: 8, padding: '8px 12px', marginBottom: 12,
          fontSize: 12, color: C.red, fontWeight: 600,
        }}>
          ⚑ Clinical flags: {result.flags.join(' · ')}
        </div>
      )}

      {result.summary && (
        <div style={{
          background: C.surfaceHigh, borderRadius: 8, padding: '10px 14px',
          marginBottom: 14, fontSize: 12, color: C.textSub, lineHeight: 1.6,
          borderLeft: `3px solid ${modColor}`,
        }}>
          <span style={{ fontSize: 10, color: C.textDim, letterSpacing: 1, display: 'block', marginBottom: 3 }}>
            FOR CLINICIAN
          </span>
          {result.summary}
        </div>
      )}

      <p style={{ color: C.textSub, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
        {result.booking_message}
      </p>

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={onBook}
          style={{
            flex: 1, padding: '11px 0', borderRadius: 10, border: 'none',
            background: `linear-gradient(135deg, ${modColor}, ${modColor}CC)`,
            color: C.bg, fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}
        >
          Book Appointment →
        </button>
        <button
          onClick={onContinue}
          style={{
            padding: '11px 18px', borderRadius: 10, background: 'transparent',
            border: `1px solid ${C.border}`, color: C.textSub,
            fontSize: 13, cursor: 'pointer',
          }}
        >
          Continue chat
        </button>
      </div>
    </div>
  );
}

function BookingConfirmation({ result, sessionId }) {
  const ref = sessionId
    ? 'SQ-' + sessionId.slice(0, 6).toUpperCase()
    : 'SQ-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  const eta = {
    emergency: 'immediately — call emergency services if life-threatening',
    crisis:    'within the hour',
    urgent:    'within 24 hours',
    routine:   'within 2 working days',
  }[result?.urgency] || 'soon';

  const modColor = MODULE_COLORS[result?.module] || C.accent;

  return (
    <div style={{
      background: C.surface, border: `1px solid ${modColor}44`,
      borderRadius: 16, padding: 24, marginBottom: 14, textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Appointment Request Sent</div>
      <p style={{ color: C.textSub, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
        Our team will reach you <strong style={{ color: C.text }}>{eta}</strong> to confirm your{' '}
        {result?.clinician} appointment. You'll receive confirmation via WhatsApp and in-app notification.
      </p>
      <Badge label={`Ref: ${ref}`} color={modColor} />
    </div>
  );
}

const QUICK_PROMPTS = [
  { label: 'I have a fever and headache',             icon: '🤒' },
  { label: "I'm feeling anxious and can't sleep",     icon: '😰' },
  { label: 'Toothache for 3 days',                    icon: '🦷' },
  { label: 'I need to check a medicine I was given',  icon: '💊' },
  { label: 'My vision has been blurry',               icon: '👁'  },
  { label: 'I have diabetes — need monitoring help',  icon: '🩺' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export default function TriageFlow({ navigateTo, user }) {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Assalamu alaykum — welcome to SmartQure. I'm your care navigator, here to help you find the right support quickly.\n\nYou can speak to me in English, Somali, or Swahili. What's brought you here today?",
    timestamp: new Date().toISOString(),
  }]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const [booked, setBooked]       = useState(false);
  const [showQuick, setShowQuick] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError]         = useState(null);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, result, booked]);

  const send = async (override) => {
    const msg = (override || input).trim();
    if (!msg || loading) return;

    setInput('');
    setShowQuick(false);
    setError(null);

    const userMsg = {
      role: 'user',
      content: msg,
      timestamp: new Date().toISOString(),
    };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setLoading(true);

    try {
      const res = await fetch('/api/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages:  nextMsgs.map(m => ({ role: m.role, content: m.content })),
          sessionId: sessionId,
          userId:    user?.id || null,
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();

      // Save session ID from first response
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.text || 'Let me connect you with the right care.',
        timestamp: new Date().toISOString(),
      }]);

      if (data.result) {
        setResult(data.result);
      }

    } catch (err) {
      console.error('Triage error:', err);
      setError('Connection issue — please try again.');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry — I had a connection issue. Please try again or call our support line.",
        timestamp: new Date().toISOString(),
      }]);
    }

    setLoading(false);
  };

  const handleBook = () => {
    setBooked(true);
    // Navigate to appointments flow if available
    if (navigateTo && result) {
      // Pass triage data to appointment booking
      navigateTo('appointments', {
        triageResult: result,
        sessionId:    sessionId,
        prefillModule: result.module,
        prefillClinicianType: result.clinician,
      });
    }
  };

  const reset = () => {
    setMessages([{
      role: 'assistant',
      content: "Assalamu alaykum — welcome to SmartQure. I'm your care navigator, here to help you find the right support quickly.\n\nYou can speak to me in English, Somali, or Swahili. What's brought you here today?",
      timestamp: new Date().toISOString(),
    }]);
    setInput('');
    setLoading(false);
    setResult(null);
    setBooked(false);
    setShowQuick(true);
    setSessionId(null);
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg, color: C.text,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
      paddingBottom: 72,
    }}>
      {/* Keyframes */}
      <style>{`
        @keyframes triage-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
        @keyframes triage-fade-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .triage-msg { animation: triage-fade-up 0.25s ease-out; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: `1px solid ${C.border}`,
        background: C.surface, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => navigateTo('homepage')}
            style={{
              width: 34, height: 34, borderRadius: 10, background: 'transparent',
              border: `1px solid ${C.border}`, color: C.textSub, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, flexShrink: 0,
            }}
            aria-label="Back to home"
          >←</button>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.accent}40, ${C.accent}10)`,
            border: `1px solid ${C.accent}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🩺</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>SmartQure Care Navigator</div>
            <div style={{ fontSize: 11, color: C.accent, fontWeight: 500, letterSpacing: 0.5 }}>
              AI TRIAGE · EN / SO / SW
            </div>
          </div>
        </div>
        <button
          onClick={reset}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'transparent', border: `1px solid ${C.border}`,
            color: C.textSub, cursor: 'pointer',
          }}
        >
          New session
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
        {messages.map((m, i) => {
          const isUser = m.role === 'user';
          return (
            <div key={i} className="triage-msg" style={{
              display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
              marginBottom: 12,
            }}>
              {!isUser && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: `${C.accent}20`, border: `1px solid ${C.accent}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, marginRight: 8, marginTop: 2,
                }}>🩺</div>
              )}
              <div style={{
                maxWidth: '78%',
                background: isUser
                  ? `linear-gradient(135deg, ${C.accent}25, ${C.blue}15)`
                  : C.surface,
                border: `1px solid ${isUser ? C.accent + '40' : C.border}`,
                borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                padding: '10px 14px',
                fontSize: 14, lineHeight: 1.65, color: C.text,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
            <div style={{
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '16px 16px 16px 4px',
            }}>
              <TypingDots />
            </div>
          </div>
        )}

        {result && !booked && (
          <ResultPanel
            result={result}
            onBook={handleBook}
            onContinue={() => setResult(null)}
          />
        )}

        {booked && <BookingConfirmation result={result} sessionId={sessionId} />}

        {error && (
          <div style={{
            background: C.red + '15', border: `1px solid ${C.red}33`,
            borderRadius: 8, padding: '8px 12px', marginBottom: 8,
            fontSize: 12, color: C.red, textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      {showQuick && messages.length <= 1 && (
        <div style={{ padding: '0 16px 12px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 1, marginBottom: 8 }}>
            COMMON CONCERNS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUICK_PROMPTS.map(p => (
              <button
                key={p.label}
                onClick={() => send(p.label)}
                style={{
                  padding: '7px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  background: C.surface, border: `1px solid ${C.border}`,
                  color: C.textSub, cursor: 'pointer', transition: 'all 150ms ease',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${C.border}`,
        background: C.surface,
        maxWidth: 680, width: '100%', margin: '0 auto',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe your symptoms or ask anything…"
            rows={1}
            style={{
              flex: 1, background: C.bg, border: `1.5px solid ${C.border}`,
              borderRadius: 12, padding: '10px 14px', fontSize: 14,
              color: C.text, resize: 'none', outline: 'none',
              fontFamily: 'inherit', lineHeight: 1.5,
              transition: 'border-color 150ms ease',
            }}
            onFocus={e => { e.target.style.borderColor = C.accent; }}
            onBlur={e => { e.target.style.borderColor = C.border; }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: 42, height: 42, borderRadius: 12, border: 'none',
              background: input.trim() && !loading
                ? `linear-gradient(135deg, ${C.accent}, ${C.accent}CC)`
                : C.border,
              color: input.trim() && !loading ? C.bg : C.textDim,
              fontWeight: 700, fontSize: 18, cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 150ms ease',
              flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>
        <div style={{ fontSize: 10, color: C.textDim, textAlign: 'center', marginTop: 8 }}>
          SmartQure AI Triage · Not a replacement for emergency services · Press Enter to send
        </div>
      </div>
    </div>
  );
}
