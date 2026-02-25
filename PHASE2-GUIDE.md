# MedVerify Phase 2 Implementation Guide

## Installation

```bash
npm install @ericblade/quagga2 tesseract.js face-api.js next-pwa web-push
```

## 1. Real Barcode Scanner

**File**: Replace `ScannerFlow.jsx` with `ScannerFlow-v2.jsx`

The new scanner includes:
- Real-time QuaggaJS barcode detection
- Photo upload to Supabase Storage
- Support for UPC, EAN, Code 128, Code 39

## 2. ID Verification with OCR

Create new file with Tesseract.js and face-api.js integration.

Models needed (download to public/models/):
- tiny_face_detector_model
- face_landmark_68_model  
- face_recognition_model

Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights

## 3. News Scraping Cron

Create `app/api/scan-news/route.js` with NewsAPI key: b4367c6b41d84aea85f9f66310e4bbfd

## 4. PWA Setup

Create `next.config.js`:
```javascript
const withPWA = require('next-pwa')({ dest: 'public' });
module.exports = withPWA({ reactStrictMode: true });
```

Create `public/manifest.json` with app metadata.

## 5. Push Notifications

Create `public/sw.js` for service worker.

## Environment Variables

Add to `.env.local`:
```
NEWSAPI_KEY=b4367c6b41d84aea85f9f66310e4bbfd
SUPABASE_SERVICE_KEY=your_service_key
CRON_SECRET=random_secret
```

See full implementation details in the updated flow files.
