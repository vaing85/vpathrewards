-- ============================================================
-- Migration 002: Enable Row Level Security (RLS) on all tables
-- ============================================================
-- This app uses a custom Express/JWT backend that connects to
-- Supabase via a direct DATABASE_URL as the postgres superuser.
-- The postgres superuser bypasses RLS automatically, so the
-- backend continues to work without any changes.
--
-- These policies lock down Supabase's PostgREST (REST API) so
-- that no data is exposed via the anon or authenticated roles.
-- All application access must go through the backend API.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ------------------------------------------------------------
-- merchant_banners
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS merchant_banners (
  id          SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  click_url   TEXT,
  width       INTEGER,
  height      INTEGER,
  alt_text    TEXT,
  is_active   INTEGER DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE merchant_banners ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- users  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- merchants  (public catalogue — allow anonymous read only)
-- ------------------------------------------------------------
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchants_anon_read"
  ON merchants FOR SELECT
  TO anon
  USING (true);

-- ------------------------------------------------------------
-- offers  (public catalogue — allow anonymous read of active offers)
-- ------------------------------------------------------------
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers_anon_read"
  ON offers FOR SELECT
  TO anon
  USING (is_active = 1);

-- ------------------------------------------------------------
-- cashback_transactions  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE cashback_transactions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- withdrawals  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- user_referral_codes  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE user_referral_codes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- referral_relationships  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE referral_relationships ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- referral_earnings  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- affiliate_clicks  (internal tracking — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- conversions  (internal tracking — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- user_favorites  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- merchant_reviews  (public read, no write via PostgREST)
-- ------------------------------------------------------------
ALTER TABLE merchant_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "merchant_reviews_anon_read"
  ON merchant_reviews FOR SELECT
  TO anon
  USING (true);

-- ------------------------------------------------------------
-- subscriptions  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- cashback_goals  (sensitive — no PostgREST access)
-- ------------------------------------------------------------
ALTER TABLE cashback_goals ENABLE ROW LEVEL SECURITY;
