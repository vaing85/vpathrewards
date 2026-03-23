-- Migration 005: Seed ABC Wigs merchant and offer

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'ABC Wigs',
  'Shop high-quality wigs, hair extensions, and hairpieces. Wide selection of styles, colors, and lengths.',
  'https://www.abcwigs.com/images/logo.png',
  'https://www.abcwigs.com',
  'Beauty & Hair'
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Shop Wigs & Hair Extensions — Earn 7% Cashback',
  'Browse hundreds of high-quality wigs and hair extensions at ABC Wigs and earn 7% cashback on every completed order. 45-day referral window with unlimited eligible orders.',
  7,
  10,
  'Earn 7% cashback on completed purchases. 45-day referral period, unlimited occurrences. Coupons and promotional codes available through the affiliate program may be used.',
  'https://www.kqzyfj.com/click-101708885-17240111',
  1,
  'percentage',
  NULL
FROM merchants m
WHERE m.name = 'ABC Wigs'
ON CONFLICT DO NOTHING;
