-- Migration 012: Seed Women's Jewelry merchant and offer

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'Women''s Jewelry',
  'Discover beautiful women''s jewelry including necklaces, earrings, bracelets, rings, and more. Elegant styles for every occasion at great prices.',
  NULL,
  NULL,
  'Fashion & Jewelry'
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Shop Women''s Jewelry — Earn 5% Cashback',
  'Browse a stunning collection of women''s jewelry including necklaces, earrings, bracelets, and rings. Earn 5% cashback on qualifying purchases.',
  5,
  10,
  'Earn 5% cashback on qualifying jewelry purchases. 1-day referral period. Excludes gift cards and items returned or cancelled. No fraudulent or incentivized traffic.',
  'https://www.jdoqocy.com/click-101708885-15562447',
  1,
  'percentage',
  NULL
FROM merchants m
WHERE m.name = 'Women''s Jewelry'
ON CONFLICT DO NOTHING;
