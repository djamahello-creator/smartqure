# MedVerify Deployment Guide

This guide will help you deploy the MedVerify application with all 11 flows and proper database setup.

## Prerequisites

1. Node.js 18+ installed
2. A Supabase account (free tier works)
3. Vercel account (optional, for deployment)

## Step 1: Set Up Supabase

### 1.1 Create Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Fill in project details
4. Wait for database to be provisioned (~2 minutes)

### 1.2 Run Database Schema

1. In your Supabase dashboard, go to "SQL Editor"
2. Click "New Query"
3. Copy the entire contents of `database-schema.sql`
4. Paste and click "Run"
5. Verify tables are created in the "Table Editor"

### 1.3 Get API Keys

1. Go to "Settings" → "API"
2. Copy your:
   - Project URL
   - `anon` public key
3. Save these for the next step

## Step 2: Set Up Local Development

### 2.1 Install Dependencies

```bash
# Create a new Next.js project (if you haven't already)
npx create-next-app@latest medverify --typescript --tailwind --app

cd medverify

# Install required packages
npm install @supabase/supabase-js lucide-react
```

### 2.2 Configure Environment Variables

1. Create `.env.local` in your project root
2. Copy contents from `.env.template`
3. Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2.3 Set Up Project Structure

Create the following folder structure:

```
src/
├── lib/
│   └── supabase.js
├── components/
│   └── flows/
│       ├── WelcomeFlow.jsx
│       ├── AuthFlow.jsx
│       ├── HomepageFlow.jsx
│       ├── ScannerFlow.jsx
│       ├── ManualEntryFlow.jsx
│       ├── IDVerificationFlow.jsx
│       ├── IDResultFlow.jsx
│       ├── HistoryFlow.jsx
│       ├── HistoryDetailFlow.jsx
│       ├── ReportFlow.jsx
│       ├── AlertsFlow.jsx
│       ├── ProfileFlow.jsx
│       └── ResultFlow.jsx
├── MedVerifyApp.jsx
└── app/
    └── page.js
```

### 2.4 Copy Files

1. Copy `supabase.js` to `src/lib/supabase.js`
2. Copy all flow components to `src/components/flows/`
3. Copy `MedVerifyApp.jsx` to `src/`

### 2.5 Update app/page.js

```javascript
import MedVerifyApp from '../MedVerifyApp';

export default function Home() {
  return <MedVerifyApp />;
}
```

### 2.6 Run Development Server

```bash
npm run dev
```

Visit http://localhost:3000

## Step 3: Test the Application

### 3.1 Test Authentication

1. Click "Get Started"
2. Create an account with email/password
3. Check your email for verification (if enabled)
4. Sign in with your credentials

### 3.2 Test Core Flows

✅ Welcome → Auth → Homepage ✓
✅ Scanner (simulated) ✓
✅ Manual Entry → Result ✓
✅ ID Verification (3-step) ✓
✅ History List → Detail ✓
✅ Report Submission ✓
✅ Alerts View ✓
✅ Profile with verification status ✓

### 3.3 Verify Database

Check Supabase dashboard to ensure:
- User was created in `auth.users`
- Profile exists in `profiles` table
- Scans appear in `scans` table
- Reports saved to `reports` table

## Step 4: Deploy to Production

### Option A: Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to https://vercel.com
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click "Deploy"

### Option B: Deploy to Netlify

1. Install Netlify CLI: `npm install -g netlify-cli`
2. Build your app: `npm run build`
3. Deploy: `netlify deploy --prod`
4. Set environment variables in Netlify dashboard

## Step 5: Post-Deployment Configuration

### 5.1 Update Supabase Auth Settings

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your production URL to:
   - Site URL
   - Redirect URLs

### 5.2 Configure Email Templates (Optional)

1. Go to Authentication → Email Templates
2. Customize verification and password reset emails

### 5.3 Set Up Row Level Security (Already Done)

All tables have RLS enabled via the schema script. Verify by checking:
1. Supabase Dashboard → Authentication → Policies
2. Each table should show green "RLS enabled"

## Troubleshooting

### Issue: "Acquiring Navigator LockManager lock failed"

**Solution**: Already fixed in `supabase.js` with `lock: false` option.

### Issue: Reports not saving

**Solution**: 
1. Check RLS policies in Supabase
2. Verify user is authenticated
3. Check browser console for errors
4. Ensure `getCurrentUser()` is used, not `getSession()`

### Issue: Profile name not showing

**Solution**: 
1. Verify `first_name` column exists in profiles table
2. Check that signup flow inserts `first_name`
3. Clear browser cache and re-signup

### Issue: ID verification not updating profile

**Solution**:
1. Check `verified` column exists in profiles table
2. Verify RLS policy allows user to update their own profile
3. Check console for update errors

## Next Steps

### Implement Real Features

1. **Barcode Scanning**: 
   - Use QuaggaJS or Dynamsoft Barcode Reader
   - Add to `ScannerFlow.jsx`

2. **ID OCR**:
   ```bash
   npm install tesseract.js
   ```
   - Implement in `IDVerificationFlow.jsx`

3. **Face Matching**:
   ```bash
   npm install face-api.js @tensorflow/tfjs
   ```
   - Add biometric matching logic

4. **File Storage**:
   - Enable Supabase Storage
   - Upload photos for scans and ID verification

5. **News Alerts Cron**:
   - Set up Vercel Cron or Supabase Edge Function
   - Scrape RSS feeds and populate `fake_news_alerts`

## Security Checklist

- ✅ Row Level Security enabled on all tables
- ✅ Auth lock issue resolved
- ✅ Environment variables properly configured
- ✅ HTTPS enforced in production
- ✅ API keys never committed to git
- ✅ User input sanitized (Supabase handles this)

## Support

For issues or questions:
1. Check Supabase logs: Dashboard → Logs
2. Check browser console for errors
3. Review this deployment guide
4. Check Next.js and Supabase documentation

## Version History

- **v1.0.0** - Initial release with 11 flows
  - Authentication (signup/login)
  - Homepage dashboard
  - Medication scanning (barcode + manual)
  - ID verification (3-step)
  - Scan history with detail views
  - Report submission
  - News alerts
  - Profile with verification status
  - Result screens (verified/caution/high-risk)

---

**Congratulations! Your MedVerify app is now live! 🎉**
