-- Migration 010: Seed ID.me merchant and offer

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'ID.me',
  'ID.me is the leading digital identity network. Verify your identity once and access exclusive discounts for military, first responders, students, teachers, nurses, and more.',
  'https://s3.amazonaws.com/idme/developer/idme-docs/images/idme-logo.svg',
  'https://www.id.me',
  'Identity & Services'
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Verify Your Identity with ID.me — Earn $3 Cashback',
  'Sign up for ID.me and verify your identity to access exclusive discounts for military members, first responders, students, teachers, and more. Earn $3 cashback after completing your verified registration.',
  3,
  10,
  'Earn $3 flat cashback per new ID.me account verified registration. New users only. Must complete full identity verification. 1-day referral period. No fraudulent or incentivized traffic.',
  'https://www.tkqlhce.com/click-101708885-15578170',
  1,
  'flat',
  NULL
FROM merchants m
WHERE m.name = 'ID.me'
ON CONFLICT DO NOTHING;
