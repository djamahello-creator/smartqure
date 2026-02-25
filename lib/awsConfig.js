// lib/awsConfig.js
// AWS client is SERVER-SIDE ONLY — never import this in a 'use client' component.
// Keys use server-only env vars (no NEXT_PUBLIC_ prefix).
// For client-side ID verification, call /api/id-verify instead.

import { RekognitionClient } from '@aws-sdk/client-rekognition';

if (typeof window !== 'undefined') {
  throw new Error(
    'awsConfig.js imported in a browser context. ' +
    'Move the call to a server-side API route (/api/id-verify).'
  );
}

export const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
