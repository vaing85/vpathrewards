-- Migration 008: Seed Temu merchant and offer

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'Temu',
  'Shop incredible deals on fashion, home goods, electronics, beauty, and more. Millions of products at unbeatable prices with fast shipping.',
  'https://aimg.kwcdn.com/upload_aimg/temu/3d71fcd0-e1ca-4286-9b9b-7c44b088ef50.png.slim.png',
  'https://www.temu.com',
  'Shopping'
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Shop Temu — Earn 7% Cashback (New Customers)',
  'Shop millions of products at incredible prices on Temu and earn 7% cashback on your first order. Fashion, home, electronics, beauty, and more — all with fast, free shipping.',
  7,
  10,
  'Earn 7% cashback on qualifying purchases by new Temu customers only. No cashback is earned on orders placed by returning customers or on devices that have previously placed orders with Temu. 1-day referral period. Cashback locks after 90 days. Cancelled or refunded orders are not eligible. Incentivized traffic, email, and social media promotion require prior written approval from Temu. No bidding on Temu trademarks in paid search. Coupons and promotional codes must be provided exclusively through the affiliate program. Sub-affiliates require individual Temu approval. January 2026 CPS terms apply.',
  'https://www.tkqlhce.com/click-101708885-15736632',
  1,
  'percentage',
  NULL
FROM merchants m
WHERE m.name = 'Temu'
ON CONFLICT DO NOTHING;
