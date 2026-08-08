-- ============================================================================
-- GrapeGuard AI — Supabase Database Schema
-- ============================================================================
-- Run this SQL in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- This creates the required tables and Row-Level Security policies.
-- ============================================================================

-- 1. PROFILES TABLE
-- Stores user metadata linked to Supabase Auth users.
CREATE TABLE IF NOT EXISTS profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name  TEXT NOT NULL DEFAULT '',
    role       TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'expert')),
    phone      TEXT DEFAULT '',
    location   TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies: users can read their own profile; service role can do anything
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Allow service_role full access (needed by backend admin client)
CREATE POLICY "Service role full access on profiles"
    ON profiles FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. REPORTS TABLE
-- Stores disease analysis reports submitted by farmers.
CREATE TABLE IF NOT EXISTS reports (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    image_url       TEXT DEFAULT '',
    disease_name    TEXT DEFAULT '',
    mongo_doc_id    TEXT DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    expert_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    expert_comment  TEXT DEFAULT '',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policies: farmers see own reports; experts see all
CREATE POLICY "Farmers can view own reports"
    ON reports FOR SELECT
    USING (auth.uid() = farmer_id);

CREATE POLICY "Experts can view all reports"
    ON reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'expert'
        )
    );

-- Service role full access (backend uses service role key)
CREATE POLICY "Service role full access on reports"
    ON reports FOR ALL
    USING (true)
    WITH CHECK (true);

-- Auto-update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 3. INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_reports_farmer_id ON reports(farmer_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 4. DEVICE TOKENS TABLE
-- Stores Firebase Cloud Messaging tokens for experts and farmers.
CREATE TABLE IF NOT EXISTS device_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('farmer', 'expert')),
    fcm_token   TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, fcm_token)
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own device tokens"
    ON device_tokens FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own device tokens"
    ON device_tokens FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own device tokens"
    ON device_tokens FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on device tokens"
    ON device_tokens FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE TRIGGER set_device_tokens_updated_at
    BEFORE UPDATE ON device_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_role_active ON device_tokens(role, is_active);

-- 5. NOTIFICATIONS TABLE
-- Stores in-app notification history for farmers and experts.
CREATE TABLE IF NOT EXISTS notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role         TEXT NOT NULL CHECK (role IN ('farmer', 'expert')),
    title        TEXT NOT NULL DEFAULT '',
    body         TEXT NOT NULL DEFAULT '',
    type         TEXT NOT NULL DEFAULT 'GENERAL',
    report_id    UUID REFERENCES reports(id) ON DELETE SET NULL,
    data         JSONB NOT NULL DEFAULT '{}'::jsonb,
    read_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on notifications"
    ON notifications FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ============================================================================
-- SEED DATA (Optional) — Create demo expert account
-- ============================================================================
-- After running this schema, create users via Supabase Auth (Dashboard or API):
--
-- 1. Farmer: farmer@gmail.com / Farmer@123
--    Then INSERT into profiles: role='farmer', full_name='Demo Farmer'
--
-- 2. Expert: expert@gmail.com / Expert@123
--    Then INSERT into profiles: role='expert', full_name='Demo Expert'
--
-- The backend signup endpoint handles this automatically for farmer signups.
-- For expert accounts, use the Supabase Dashboard to create the auth user,
-- then manually insert the profile row:
--
--   INSERT INTO profiles (id, full_name, role)
--   VALUES ('<expert-auth-user-uuid>', 'Demo Expert', 'expert');
-- ============================================================================
