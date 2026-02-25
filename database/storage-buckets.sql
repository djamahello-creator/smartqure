-- Supabase Storage Buckets Setup (Phase 2)

-- Create medication-scans bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('medication-scans', 'medication-scans', true)
ON CONFLICT (id) DO NOTHING;

-- Create id-verifications bucket (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-verifications', 'id-verifications', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for medication-scans
CREATE POLICY "Users can upload own medication scans"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'medication-scans' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own medication scans"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'medication-scans' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own medication scans"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'medication-scans' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policies for id-verifications
CREATE POLICY "Users can upload own ID verifications"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'id-verifications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own ID verifications"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'id-verifications' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Push subscriptions table (Phase 2)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
ON push_subscriptions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
