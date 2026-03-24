-- Migration 009: Seed Zip merchant and offers

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'Zip',
  'Buy now, pay later with Zip. Split purchases into 4 interest-free installments. Shop at thousands of stores with no impact to your credit score.',
  'https://zip.co/content/dam/zip/zip-logo-reversed.svg',
  'https://zip.co',
  'Finance & BNPL'
)
ON CONFLICT DO NOTHING;

-- Default / Evergreen offer
INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Pay in 4 with Zip — Earn $5 Cashback',
  'Sign up for Zip and split your purchases into 4 interest-free installments. New customers earn $5 cashback after completing your first qualifying purchase.',
  5,
  15,
  'Earn $5 flat cashback per new Zip account activation. New customers only. Must complete a qualifying purchase. 1-day referral period. No fraudulent, incentivized, or pop-up/pop-under traffic.',
  'https://www.kqzyfj.com/click-101708885-15784383',
  1,
  'flat',
  NULL
FROM merchants m
WHERE m.name = 'Zip'
ON CONFLICT DO NOTHING;

-- ZIPNEW30 promo: 30% off orders $39+, capped at $25, new users only
INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  '30% Off $39+ with Code ZIPNEW30 + $5 Cashback (New Users)',
  'New to Zip? Use code ZIPNEW30 at checkout to get 30% off orders of $39 or more (discount capped at $25). New customers also earn $5 cashback after completing their first purchase.',
  5,
  15,
  'Promo code ZIPNEW30 valid for new Zip users only. 30% off orders of $39 or more, maximum discount $25. $5 flat cashback earned per new account activation with a qualifying purchase. 1-day referral period. Offer subject to change or cancellation at any time.',
  'https://www.anrdoezrs.net/click-101708885-15585195',
  1,
  'flat',
  NULL
FROM merchants m
WHERE m.name = 'Zip'
ON CONFLICT DO NOTHING;

-- July deals page / carousel offers (marked inactive as seasonal)
INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Zip July Deals — Pay in 4, Earn $5 Cashback',
  'Shop Zip''s July deals and split your purchase into 4 interest-free installments. New customers earn $5 cashback on their first qualifying order.',
  5,
  15,
  'Earn $5 flat cashback per new Zip account activation. New customers only. Must complete a qualifying purchase. Seasonal promotion — subject to availability.',
  'https://www.dpbolvw.net/click-101708885-15582687',
  0,
  'flat',
  NULL
FROM merchants m
WHERE m.name = 'Zip'
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Zip Summer Carousel — Pay in 4, Earn $5 Cashback',
  'Discover Zip''s summer featured deals. Split your purchase into 4 interest-free installments and earn $5 cashback as a new customer.',
  5,
  15,
  'Earn $5 flat cashback per new Zip account activation. New customers only. Must complete a qualifying purchase. Seasonal promotion — subject to availability.',
  'https://www.dpbolvw.net/click-101708885-15573499',
  0,
  'flat',
  NULL
FROM merchants m
WHERE m.name = 'Zip'
ON CONFLICT DO NOTHING;
