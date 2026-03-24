-- Migration 011: Seed Microsoft merchant and offer

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'Microsoft',
  'Shop Microsoft for Surface laptops, tablets, Xbox, Office 365, Windows, and accessories. Get the latest tech for school, work, and gaming.',
  'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE1Mu3b',
  'https://www.microsoft.com',
  'Electronics & Software'
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Microsoft Back to School Sale — Earn 2% Cashback',
  'Shop Microsoft''s Back to School event for deals on Surface laptops, Office 365, Xbox, and accessories. Earn 2% cashback on qualifying purchases.',
  2,
  5,
  'Earn 2% cashback on qualifying Microsoft purchases. 1-day referral period. Excludes Xbox Game Pass, software subscriptions billed separately, and digital game downloads unless otherwise stated. No paid search bidding on Microsoft trademarks. Subject to Microsoft affiliate program terms.',
  'https://www.anrdoezrs.net/click-101708885-15587298',
  1,
  'percentage',
  NULL
FROM merchants m
WHERE m.name = 'Microsoft'
ON CONFLICT DO NOTHING;
