# Video SDK Comparison for SmartQure Teleconsultations

**Decision needed:** Which SDK to use for patient ↔ doctor video calls.
**Context:** Telemedicine platform, East Africa primary market (Somaliland, Somalia, Kenya, Ethiopia), Next.js 14, ~30-minute consultation sessions, needs to work on mobile browsers and low-bandwidth connections.

---

## Quick Verdict

| | Daily.co | Agora.io | LiveKit | Jitsi (self-host) | Twilio |
|---|---|---|---|---|---|
| **Best for SmartQure?** | ✅ Strong fit | ✅ Strong fit | ⚠️ Requires more DevOps | ❌ Self-host burden | ❌ Being deprecated |
| **African servers** | US/EU only | ✅ Mumbai, Singapore | US/EU only | Self-hosted = your choice | US/EU only |
| **Free tier** | 10k mins/month | 10k mins/month | ✅ Generous OSS | Free (self-hosted infra cost) | 5k mins/month |
| **React/Next.js SDK** | ✅ Excellent | ✅ Good | ✅ Good | ⚠️ Unofficial | ✅ Good |
| **Low-bandwidth mode** | ✅ Built-in | ✅ Adaptive bitrate | ✅ | ✅ | ✅ |
| **Recording** | ✅ Cloud recording | ✅ Cloud recording | ✅ S3 recording | ⚠️ Manual setup | ✅ |
| **HIPAA/compliance** | ✅ BAA available | ✅ BAA available | ✅ Self-host = full control | ✅ Self-hosted | ✅ BAA |
| **Price at scale** | $$ | $ | $$ (hosted) / Free (OSS) | $ (infra only) | $$ |
| **Integration complexity** | Low | Medium | Medium | High | Low |

---

## Detail on Each Option

### 1. Daily.co
**Already referenced in your EXECUTIVE_SUMMARY.md.**

Pros:
- Easiest Next.js integration — `@daily-co/daily-react` hooks, drop-in prebuilt UI available
- Prebuilt call UI works out of the box (no design needed for MVP)
- Custom domain support (`meet.smartqure.com`)
- Good docs, active support
- Built-in waiting rooms, recording, transcription, screenshare
- HIPAA BAA available on paid plans

Cons:
- No African PoP servers — calls route via US/EU, adds ~200-400ms latency for Somaliland/East Africa
- Free tier: 10,000 minutes/month (enough for MVP/beta)
- Paid: ~$0.0045/minute per participant — 1,000 consultations × 30 min = ~$270/month at scale
- Less adaptive to very low bandwidth vs Agora

**Best for:** Fastest path to a working MVP. If you're launching in weeks not months.

---

### 2. Agora.io
**Strongest candidate for East Africa specifically.**

Pros:
- **Server PoPs in Mumbai and Singapore** — significantly lower latency for East Africa than Daily or Twilio (~80-150ms vs 300+ms)
- Adaptive bitrate: automatically degrades gracefully at 2G/3G speeds — critical for Somalia/Somaliland
- 10,000 free minutes/month (voice + video combined)
- React SDK (`agora-rtc-react`) is mature and well-documented
- Built-in features: audio-only fallback, background blur, noise suppression
- HIPAA compliant with BAA
- Pricing: ~$0.0099/min per host, ~$0.0014/min per viewer — competitive

Cons:
- Integration is more code-heavy than Daily's prebuilt UI
- Requires server-side token generation (you need an API route for this — not just a client-side key)
- Docs can be inconsistent (some examples are outdated)
- Vendor is Chinese-owned (Agora Inc.) — consider data sovereignty implications for health data

**Best for:** Production quality, East Africa latency optimisation, best patient experience on weak connections.

---

### 3. LiveKit (Open Source)
Pros:
- Fully open source (Apache 2.0) — can self-host on a VPS in Africa (e.g. Hetzner Johannesburg)
- If self-hosted on African infrastructure, latency problem is solved completely
- React SDK (`@livekit/components-react`) is modern and clean
- Recording via LiveKit Egress → save to Supabase Storage or S3
- Zero per-minute cost if self-hosted

Cons:
- LiveKit Cloud (managed) is US/EU only, same latency problem as Daily
- Self-hosting requires DevOps: Docker, media server config, STUN/TURN, SSL — significant ongoing maintenance burden
- Not suitable if the team doesn't have server admin capacity

**Best for:** If you have DevOps bandwidth and want zero vendor lock-in. Not for MVP.

---

### 4. Jitsi (Self-hosted)
Pros:
- 100% free and open source
- Battle-tested (powers many NHS and EU health deployments)
- Can embed via iframe with minimal code

Cons:
- Self-hosted only (Jitsi Meet SaaS doesn't give you API control needed for booking flows)
- Heavy infra requirements: Prosody XMPP, Jicofo, Jitsi Video Bridge — complex to manage
- React integration is unofficial/community-maintained
- Not suitable for programmatic room creation (critical for appointment booking flow)

**Verdict: Eliminate.** The operational burden outweighs cost savings at this stage.

---

### 5. Twilio Video
**Officially being sunset.** Twilio announced end-of-life for Twilio Video in December 2024. **Do not use.**

---

## Recommendation for SmartQure

**For MVP launch (next 3-6 months): Daily.co**
- Fastest to integrate with Next.js
- Works for beta testing while you validate the consultation model
- Prebuilt UI means zero design work on the call screen
- Switch is possible later — room URLs are abstracted in the `appointments` table

**For production at scale (6+ months): Migrate to Agora.io**
- Latency matters enormously for doctor-patient trust in telemedicine
- 200-400ms extra lag on Daily makes consultations feel broken on mobile in Somaliland
- The Agora React SDK is a manageable migration once the appointment flow is proven

**Implementation in the codebase:**
The `appointments` table stores `video_room_url` and `video_room_token` — both are SDK-agnostic fields. The swap from Daily to Agora only requires changing the server-side API route that generates rooms (`app/api/video-room/route.js`), not the frontend.

---

## Integration Snippet (Daily.co — MVP path)

```js
// app/api/video-room/route.js
// Server-side: create a Daily room when appointment is confirmed
export async function POST(req) {
  const { appointmentId, durationMins } = await req.json();

  const res = await fetch('https://api.daily.co/v1/rooms', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `sq-${appointmentId}`,
      properties: {
        exp: Math.floor(Date.now() / 1000) + (durationMins + 15) * 60,
        enable_knocking: true,
        enable_screenshare: false,
        max_participants: 2,
      },
    }),
  });

  const room = await res.json();
  // Save room.url to appointments.video_room_url in Supabase
  return Response.json({ url: room.url });
}
```

```js
// Client-side (VideoConsultFlow.jsx)
import { DailyProvider, useDaily, DailyVideo } from '@daily-co/daily-react';

export default function VideoConsultFlow({ roomUrl }) {
  return (
    <DailyProvider url={roomUrl}>
      <CallUI />
    </DailyProvider>
  );
}
```

---

**Decision summary:** Use **Daily.co for MVP**, plan migration to **Agora.io for production**. Both support the SDK-agnostic `video_room_url` field in the schema.
