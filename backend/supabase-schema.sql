-- ============================================================
-- V PATHing Rewards — Supabase / PostgreSQL Schema
-- ============================================================
-- Paste this entire file into:
--   Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id                      SERIAL PRIMARY KEY,
  email                   TEXT UNIQUE NOT NULL,
  password                TEXT NOT NULL,
  name                    TEXT NOT NULL,
  total_earnings          DOUBLE PRECISION DEFAULT 0,
  is_admin                INTEGER DEFAULT 0,
  notification_email      INTEGER DEFAULT 1,
  notification_cashback   INTEGER DEFAULT 1,
  notification_withdrawal INTEGER DEFAULT 1,
  notification_new_offers INTEGER DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Merchants
CREATE TABLE IF NOT EXISTS merchants (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  logo_url    TEXT,
  website_url TEXT,
  category    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Offers
CREATE TABLE IF NOT EXISTS offers (
  id             SERIAL PRIMARY KEY,
  merchant_id    INTEGER NOT NULL REFERENCES merchants(id),
  title          TEXT NOT NULL,
  description    TEXT,
  cashback_rate  DOUBLE PRECISION NOT NULL,
  terms          TEXT,
  affiliate_link TEXT NOT NULL,
  is_active      INTEGER DEFAULT 1,
  end_date       TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Cashback transactions
CREATE TABLE IF NOT EXISTS cashback_transactions (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id),
  offer_id         INTEGER NOT NULL REFERENCES offers(id),
  amount           DOUBLE PRECISION NOT NULL,
  status           TEXT DEFAULT 'pending',
  transaction_date TIMESTAMPTZ DEFAULT NOW()
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  amount          DOUBLE PRECISION NOT NULL,
  payment_method  TEXT NOT NULL,
  payment_details TEXT NOT NULL,
  status          TEXT DEFAULT 'pending',
  admin_notes     TEXT,
  processed_by    INTEGER REFERENCES users(id),
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

-- Referral codes
CREATE TABLE IF NOT EXISTS user_referral_codes (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER UNIQUE NOT NULL REFERENCES users(id),
  referral_code TEXT UNIQUE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Referral relationships
CREATE TABLE IF NOT EXISTS referral_relationships (
  id            SERIAL PRIMARY KEY,
  referrer_id   INTEGER NOT NULL REFERENCES users(id),
  referred_id   INTEGER UNIQUE NOT NULL REFERENCES users(id),
  referral_code TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Referral earnings
CREATE TABLE IF NOT EXISTS referral_earnings (
  id               SERIAL PRIMARY KEY,
  referrer_id      INTEGER NOT NULL REFERENCES users(id),
  referred_id      INTEGER NOT NULL REFERENCES users(id),
  transaction_id   INTEGER REFERENCES cashback_transactions(id),
  amount           DOUBLE PRECISION NOT NULL,
  bonus_percentage DOUBLE PRECISION DEFAULT 10.0,
  status           TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Affiliate clicks
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id),
  offer_id      INTEGER NOT NULL REFERENCES offers(id),
  session_id    TEXT NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  referrer      TEXT,
  clicked_at    TIMESTAMPTZ DEFAULT NOW(),
  converted     INTEGER DEFAULT 0,
  conversion_id INTEGER
);

-- Conversions
CREATE TABLE IF NOT EXISTS conversions (
  id                SERIAL PRIMARY KEY,
  click_id          INTEGER REFERENCES affiliate_clicks(id),
  user_id           INTEGER REFERENCES users(id),
  offer_id          INTEGER NOT NULL REFERENCES offers(id),
  session_id        TEXT NOT NULL,
  order_id          TEXT,
  order_amount      DOUBLE PRECISION,
  commission_amount DOUBLE PRECISION,
  status            TEXT DEFAULT 'pending',
  conversion_date   TIMESTAMPTZ DEFAULT NOW()
);

-- User favorites
CREATE TABLE IF NOT EXISTS user_favorites (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  offer_id    INTEGER REFERENCES offers(id),
  merchant_id INTEGER REFERENCES merchants(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (offer_id IS NOT NULL AND merchant_id IS NULL) OR
    (offer_id IS NULL AND merchant_id IS NOT NULL)
  )
);

-- Merchant reviews
CREATE TABLE IF NOT EXISTS merchant_reviews (
  id          SERIAL PRIMARY KEY,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (merchant_id, user_id)
);

-- Subscriptions (Stripe)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER UNIQUE NOT NULL REFERENCES users(id),
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                   TEXT DEFAULT 'free',
  status                 TEXT DEFAULT 'active',
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

-- Cashback goals
CREATE TABLE IF NOT EXISTS cashback_goals (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL REFERENCES users(id),
  title          TEXT NOT NULL,
  target_amount  DOUBLE PRECISION NOT NULL,
  current_amount DOUBLE PRECISION DEFAULT 0,
  period_type    TEXT DEFAULT 'monthly',
  start_date     DATE,
  end_date       DATE,
  is_completed   INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_email                        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_admin                     ON users(is_admin);
CREATE INDEX IF NOT EXISTS idx_merchants_category                 ON merchants(category);
CREATE INDEX IF NOT EXISTS idx_merchants_name                     ON merchants(name);
CREATE INDEX IF NOT EXISTS idx_offers_merchant_id                 ON offers(merchant_id);
CREATE INDEX IF NOT EXISTS idx_offers_is_active                   ON offers(is_active);
CREATE INDEX IF NOT EXISTS idx_offers_cashback_rate               ON offers(cashback_rate);
CREATE INDEX IF NOT EXISTS idx_offers_created_at                  ON offers(created_at);
CREATE INDEX IF NOT EXISTS idx_cashback_user_id                   ON cashback_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_cashback_offer_id                  ON cashback_transactions(offer_id);
CREATE INDEX IF NOT EXISTS idx_cashback_status                    ON cashback_transactions(status);
CREATE INDEX IF NOT EXISTS idx_cashback_transaction_date          ON cashback_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_clicks_user_id                     ON affiliate_clicks(user_id);
CREATE INDEX IF NOT EXISTS idx_clicks_offer_id                    ON affiliate_clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at                  ON affiliate_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS idx_clicks_converted                   ON affiliate_clicks(converted);
CREATE INDEX IF NOT EXISTS idx_conversions_user_id                ON conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversions_offer_id               ON conversions(offer_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status                 ON conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_conversion_date        ON conversions(conversion_date);
CREATE INDEX IF NOT EXISTS idx_conversions_click_id               ON conversions(click_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id                ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status                 ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_requested_at           ON withdrawals(requested_at);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referrer_id ON referral_relationships(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_relationships_referred_id ON referral_relationships(referred_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_referrer_id      ON referral_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_earnings_status           ON referral_earnings(status);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id                  ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_reviews_merchant_id       ON merchant_reviews(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_reviews_user_id           ON merchant_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_reviews_rating            ON merchant_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_goals_user_id                      ON cashback_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_is_completed                 ON cashback_goals(is_completed);
CREATE INDEX IF NOT EXISTS idx_goals_user_created                 ON cashback_goals(user_id, created_at);

-- Partial unique indexes for user_favorites (NULLs handled correctly)
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_offer
  ON user_favorites(user_id, offer_id)
  WHERE offer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id         ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer  ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_status      ON subscriptions(plan, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_merchant
  ON user_favorites(user_id, merchant_id)
  WHERE merchant_id IS NOT NULL;
