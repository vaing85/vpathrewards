-- 016_perf_advisor_fixes.sql
--
-- Address Supabase performance advisor findings on the vpathing-rewards
-- project (uxnbbvqsqfmkakysoelv).
--
-- Two categories of fix, both behavior-preserving:
--
--   1. Seven foreign keys had no covering index, so joins/cascades against
--      the child tables required a sequential scan. Adds CREATE INDEX
--      IF NOT EXISTS for each.
--
--   2. Nine RLS policies inlined calls to auth.jwt() or
--      current_setting('request.jwt.claims', true). PostgreSQL re-evaluates
--      those per row, blowing past the planner's init-plan optimization.
--      Wrapping the call in a (SELECT ...) subquery lets the planner run it
--      ONCE per query. The condition is semantically identical.
--
-- Pattern reference:
--   https://supabase.com/docs/guides/database/postgres/row-level-security
--   #call-functions-with-select
--
-- All operations run in one transaction so a partial failure rolls back
-- cleanly. The DROP + CREATE POLICY pairs are atomic within BEGIN/COMMIT
-- (no window where the policy is missing).

BEGIN;

-- =====================================================================
-- 1. Index the seven unindexed foreign keys
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_cashback_alerts_merchant_id
  ON public.cashback_alerts (merchant_id);

CREATE INDEX IF NOT EXISTS idx_cashback_alerts_offer_id
  ON public.cashback_alerts (offer_id);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_referred_id
  ON public.referral_earnings (referred_id);

CREATE INDEX IF NOT EXISTS idx_referral_earnings_transaction_id
  ON public.referral_earnings (transaction_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_merchant_id
  ON public.user_favorites (merchant_id);

CREATE INDEX IF NOT EXISTS idx_user_favorites_offer_id
  ON public.user_favorites (offer_id);

CREATE INDEX IF NOT EXISTS idx_withdrawals_processed_by
  ON public.withdrawals (processed_by);

-- =====================================================================
-- 2. Rewrite nine RLS policies to use (SELECT ...) init-plan pattern
-- =====================================================================
-- Each policy below is dropped and recreated with the auth function call
-- wrapped in a subquery. Conditions are otherwise byte-for-byte identical
-- to what's currently in production.

-- ---- admin_audit_log ------------------------------------------------
DROP POLICY IF EXISTS admin_read_audit_log ON public.admin_audit_log;
CREATE POLICY admin_read_audit_log ON public.admin_audit_log
  FOR SELECT
  USING (((SELECT auth.jwt()) ->> 'user_role') = 'admin');

-- ---- cashback_alerts ------------------------------------------------
DROP POLICY IF EXISTS cashback_alerts_insert_own ON public.cashback_alerts;
CREATE POLICY cashback_alerts_insert_own ON public.cashback_alerts
  FOR INSERT
  WITH CHECK (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  );

DROP POLICY IF EXISTS cashback_alerts_select_own ON public.cashback_alerts;
CREATE POLICY cashback_alerts_select_own ON public.cashback_alerts
  FOR SELECT
  USING (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  );

-- ---- notifications --------------------------------------------------
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT
  USING (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  );

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE
  USING (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  )
  WITH CHECK (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  );

-- ---- stripe_connect_accounts ---------------------------------------
DROP POLICY IF EXISTS stripe_connect_accounts_select_own ON public.stripe_connect_accounts;
CREATE POLICY stripe_connect_accounts_select_own ON public.stripe_connect_accounts
  FOR SELECT
  USING (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  );

DROP POLICY IF EXISTS stripe_connect_accounts_insert_own ON public.stripe_connect_accounts;
CREATE POLICY stripe_connect_accounts_insert_own ON public.stripe_connect_accounts
  FOR INSERT
  WITH CHECK (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  );

DROP POLICY IF EXISTS stripe_connect_accounts_update_own ON public.stripe_connect_accounts;
CREATE POLICY stripe_connect_accounts_update_own ON public.stripe_connect_accounts
  FOR UPDATE
  USING (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  )
  WITH CHECK (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  );

DROP POLICY IF EXISTS stripe_connect_accounts_delete_own ON public.stripe_connect_accounts;
CREATE POLICY stripe_connect_accounts_delete_own ON public.stripe_connect_accounts
  FOR DELETE
  USING (
    (SELECT ((current_setting('request.jwt.claims', true))::json ->> 'user_id')::integer)
      = user_id
  );

COMMIT;
