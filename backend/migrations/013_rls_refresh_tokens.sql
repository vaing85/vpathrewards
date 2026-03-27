-- ============================================================
-- Migration 013: RLS policy for refresh_tokens
-- ============================================================
-- refresh_tokens was created after migration 002 so it did not
-- receive an explicit deny-all policy, triggering the Supabase
-- "RLS Enabled No Policy" INFO lint warning.
--
-- The table is accessed only via the Express backend which
-- connects as the postgres superuser (bypasses RLS).
-- This policy makes the deny-all intent explicit.
--
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_refresh_tokens"
  ON refresh_tokens FOR ALL TO anon, authenticated USING (false);
