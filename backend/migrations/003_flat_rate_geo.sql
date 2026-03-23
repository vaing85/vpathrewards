-- Migration 003: Add cashback_type and excluded_states to offers
-- cashback_type: 'percentage' (default) or 'flat' (fixed dollar amount)
-- excluded_states: comma-separated US state codes where offer is not valid (e.g. 'CA,IA,UT,WA')

ALTER TABLE offers ADD COLUMN IF NOT EXISTS cashback_type TEXT DEFAULT 'percentage';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS excluded_states TEXT;

-- Seed: Choice Home Warranty merchant
INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'Choice Home Warranty',
  'America''s #1 Home Warranty provider. Get coverage for your home''s major systems and appliances.',
  'https://www.choicehomewarranty.com/wp-content/themes/choicehomewarranty/img/logo.png',
  'https://www.choicehomewarranty.com',
  'Home & Garden'
)
ON CONFLICT DO NOTHING;

-- Seed: Choice Home Warranty offer ($5 flat cashback per completed lead)
INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Get an Instant Home Warranty Quote — Earn $5',
  'Complete a free instant quote form and earn $5 cashback. Choice Home Warranty covers major home systems and appliances with plans starting at $1/day.',
  5,
  20,
  'Earn $5 flat for each completed instant quote form. Not available in California, Iowa, Utah, or Washington. No SEM or paid search traffic. Facebook advertising not allowed. Incentivized traffic requires prior written approval from Choice Home Warranty. Session-based referral period.',
  'https://www.dpbolvw.net/click-101708885-12337172',
  1,
  'flat',
  'CA,IA,UT,WA'
FROM merchants m
WHERE m.name = 'Choice Home Warranty'
ON CONFLICT DO NOTHING;
