-- Migration 004: Seed PeopleFinders merchant and offer

INSERT INTO merchants (name, description, logo_url, website_url, category)
VALUES (
  'PeopleFinders',
  'Find anyone, anywhere. People search, background checks, reverse phone lookup, and genealogy records.',
  'https://www.peoplefinders.com/images/pf-logo.png',
  'https://www.peoplefinders.com',
  'People Search'
)
ON CONFLICT DO NOTHING;

INSERT INTO offers (merchant_id, title, description, cashback_rate, commission_rate, terms, affiliate_link, is_active, cashback_type, excluded_states)
SELECT
  m.id,
  'Search People, Phone Numbers & Background Reports — Earn $2',
  'Run a people search, reverse phone lookup, or background check and earn $2 cashback on your purchase. 45-day referral window with unlimited eligible orders.',
  2,
  5,
  'Earn $2 flat cashback per completed purchase. 45-day referral period, unlimited occurrences. Not for employment screening, tenant screening, credit/insurance eligibility, or any purpose covered by the Fair Credit Reporting Act (FCRA). No use for hiring decisions, nanny or household worker screening, or professional service provider screening. No GPS or current location claims.',
  'https://www.tkqlhce.com/click-101708885-15733401',
  1,
  'flat',
  NULL
FROM merchants m
WHERE m.name = 'PeopleFinders'
ON CONFLICT DO NOTHING;
