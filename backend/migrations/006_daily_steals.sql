-- Migration 006: Seed Daily Steals merchant and offer

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'Daily Steals',
  'Fresh deals every single day on tech, home, fashion, jewelry, and more. Massive discounts on top brands.',
  'https://www.dailysteals.com/images/logo.png',
  'https://www.dailysteals.com',
  'Daily Deals'
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Shop Daily Deals on Tech, Home & Fashion — Earn 3% Cashback',
  'New deals drop every day at Daily Steals — tech, home goods, fashion, jewelry and more. Earn 3% cashback on every completed order. 30-day referral window with unlimited eligible orders.',
  3,
  5,
  'Earn 3% cashback on completed purchases at DailySteals.com. 30-day referral period, unlimited occurrences. Coupons and promotional codes available through the affiliate program may be used.',
  'https://www.anrdoezrs.net/click-101708885-15736809',
  1,
  'percentage',
  NULL
FROM merchants m
WHERE m.name = 'Daily Steals'
ON CONFLICT DO NOTHING;
