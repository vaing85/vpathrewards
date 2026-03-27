-- Migration 007: Seed Undercover Tourist merchant and offer

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'Undercover Tourist',
  'Save on Disney, Universal, SeaWorld, LEGOLAND and more. Discount theme park tickets, hotels, and car rentals.',
  'https://www.undercovertourist.com/images/logo.png',
  'https://www.undercovertourist.com',
  'Travel & Theme Parks'
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Save on Disney, Universal & More — Earn $2 Cashback',
  'Get discount tickets to Disney World, Disneyland, Universal Orlando, SeaWorld, LEGOLAND, and more. Plus save on hotels and car rentals. Earn $2 cashback per completed order.',
  2,
  5,
  'Earn $2 flat cashback per completed purchase. 30-day referral period, unlimited occurrences. Additional commissions on hotels, car rentals, and individual tickets are retained by the platform. No incentivized traffic without prior written approval from Undercover Tourist.',
  'https://www.dpbolvw.net/click-101708885-15733832',
  1,
  'flat',
  NULL
FROM merchants m
WHERE m.name = 'Undercover Tourist'
ON CONFLICT DO NOTHING;
