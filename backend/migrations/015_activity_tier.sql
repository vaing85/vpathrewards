-- Migration 015: Activity-based tier columns
-- Pivot from Stripe subscription tiers to free activity-based tiers.
-- Tier is computed from lifetime CONFIRMED cashback (sum of cashback_transactions.amount where status='confirmed').

ALTER TABLE users ADD COLUMN IF NOT EXISTS lifetime_cashback_confirmed REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_tier TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_tier_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_activity_tier ON users(activity_tier);

-- One-time backfill: compute lifetime_cashback_confirmed and activity_tier for existing users.
-- Thresholds (in dollars of confirmed cashback): bronze >= 5, silver >= 25, gold >= 100, platinum >= 500.
UPDATE users
   SET lifetime_cashback_confirmed = COALESCE((
         SELECT SUM(amount)
           FROM cashback_transactions
          WHERE cashback_transactions.user_id = users.id
            AND cashback_transactions.status = 'confirmed'
       ), 0);

UPDATE users
   SET activity_tier = CASE
       WHEN lifetime_cashback_confirmed >= 500 THEN 'platinum'
       WHEN lifetime_cashback_confirmed >= 100 THEN 'gold'
       WHEN lifetime_cashback_confirmed >= 25  THEN 'silver'
       WHEN lifetime_cashback_confirmed >= 5   THEN 'bronze'
       ELSE 'free'
   END,
   activity_tier_updated_at = CURRENT_TIMESTAMP;
