-- ==============================================================================
-- NoCharity Supabase Migration: 20261022000007_phase8_rankings_and_donation_explorer.sql
-- Phase 8: Multi-Year Historical Personal Giving & Donation Explorer Indexing
-- ==============================================================================

-- 1. SEED ADDITIONAL HISTORICAL SOURCES FOR VERIFIED PERSONAL GIFTS
INSERT INTO sources (id, publisher, title, url, source_type, notes)
VALUES
  ('d0000000-0000-0000-0000-000000000060', 'Reuters', 'Warren Buffett donates $5.3 billion Berkshire Hathaway stock to charities', 'https://www.reuters.com/business/finance/warren-buffett-donates-53-billion-berkshire-hathaway-stock-charities-2024-06-28/', 'NEWS', 'SEC Form 4 stock gift disclosure 2024'),
  ('d0000000-0000-0000-0000-000000000061', 'CNBC', 'Warren Buffett donates $4.64 billion of Berkshire stock to five foundations', 'https://www.cnbc.com/2023/06/21/warren-buffett-donates-4point64-billion-in-berkshire-hathaway-shares-to-five-foundations.html', 'NEWS', 'SEC Form 4 stock gift disclosure 2023'),
  ('d0000000-0000-0000-0000-000000000062', 'Forbes', 'Warren Buffett Gives Away Another $4 Billion In Berkshire Shares', 'https://www.forbes.com/sites/rachelsandler/2022/06/14/warren-buffett-gives-away-another-4-billion-in-berkshire-shares/', 'NEWS', 'SEC Form 4 stock gift disclosure 2022'),
  ('d0000000-0000-0000-0000-000000000063', 'Yield Giving', 'Open Call and 2023 Giving Portfolio Disclosure', 'https://yieldgiving.com/gifts-2023/', 'PRIMARY', 'Official Yield Giving gift registry 2023'),
  ('d0000000-0000-0000-0000-000000000064', 'Medium / Yield Giving', 'Helping Any Way You Can - $3.86B gift disclosure', 'https://mackenzie-scott.medium.com/helping-any-way-you-can-3a817d2a78e4', 'PRIMARY', 'Official gift disclosure to 465 non-profit organizations March 2022'),
  ('d0000000-0000-0000-0000-000000000065', 'Medium / Yield Giving', 'Seeding by Ceding - $2.74B gift disclosure', 'https://mackenzie-scott.medium.com/seeding-by-ceding-ea6de074181', 'PRIMARY', 'Official gift disclosure to 286 organizations June 2021'),
  ('d0000000-0000-0000-0000-000000000066', 'Medium / Yield Giving', '384 Ways to Help - $4.16B COVID-19 relief gifts', 'https://mackenzie-scott.medium.com/384-ways-to-help-december-2020-c737517c2447', 'PRIMARY', 'Official gift disclosure December 2020')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED ADDITIONAL DOCUMENTED PERSONAL GIFTS FOR MULTI-YEAR COVERAGE
INSERT INTO donations (
  id,
  amount,
  currency,
  donation_date,
  donation_type,
  funding_source_type,
  status,
  description,
  cause_category,
  donor_person_id,
  source_id
)
VALUES
  -- Warren Buffett 2024 ($5.3B)
  ('e0000000-0000-0000-0000-000000000060', 5300000000, 'USD', '2024-06-28', 'STOCK_TRANSFER', 'PERSONAL_FUNDS_CONFIRMED', 'VERIFIED',
   'Buffett donated Class B shares of Berkshire Hathaway directly from his personal holdings to five foundations.',
   'Global Health & Family Foundations', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000060'),

  -- Warren Buffett 2023 ($4.64B)
  ('e0000000-0000-0000-0000-000000000061', 4640000000, 'USD', '2023-06-21', 'STOCK_TRANSFER', 'PERSONAL_FUNDS_CONFIRMED', 'VERIFIED',
   'Buffett converted 9,129 Class A shares into Class B shares and donated them from personal funds.',
   'Global Development & Family Charities', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000061'),

  -- Warren Buffett 2022 ($4.0B)
  ('e0000000-0000-0000-0000-000000000062', 4000000000, 'USD', '2022-06-14', 'STOCK_TRANSFER', 'PERSONAL_FUNDS_CONFIRMED', 'VERIFIED',
   'Annual stock contribution of 14.4 million Class B shares directly from personal portfolio.',
   'Philanthropy & Global Health', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000062'),

  -- MacKenzie Scott 2023 ($2.15B)
  ('e0000000-0000-0000-0000-000000000063', 2150000000, 'USD', '2023-12-05', 'DIRECT_GRANT', 'PERSONAL_DIRECT', 'VERIFIED',
   'Unrestricted direct personal gifts to 360 organizations supporting community resilience.',
   'Community Development & Education', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000063'),

  -- MacKenzie Scott 2022 ($3.86B)
  ('e0000000-0000-0000-0000-000000000064', 3860000000, 'USD', '2022-03-23', 'DIRECT_GRANT', 'PERSONAL_DIRECT', 'VERIFIED',
   'Direct personal gifts to 465 non-profit organizations supporting underrepresented groups.',
   'Social Equity & Human Services', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000064'),

  -- MacKenzie Scott 2021 ($2.74B)
  ('e0000000-0000-0000-0000-000000000065', 2740000000, 'USD', '2021-06-15', 'DIRECT_GRANT', 'PERSONAL_DIRECT', 'VERIFIED',
   'High-impact unrestricted grants to 286 organizations focused on higher education and racial justice.',
   'Higher Education & Civil Rights', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000065'),

  -- MacKenzie Scott 2020 ($4.16B)
  ('e0000000-0000-0000-0000-000000000066', 4160000000, 'USD', '2020-12-15', 'DIRECT_GRANT', 'PERSONAL_DIRECT', 'VERIFIED',
   'Immediate direct personal assistance gifts to 384 organizations providing relief during the pandemic.',
   'Pandemic Relief & Food Banks', 'b0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000066')
ON CONFLICT (id) DO NOTHING;

-- 3. LINK CITATIONS
INSERT INTO donation_sources (donation_id, source_id)
VALUES
  ('e0000000-0000-0000-0000-000000000060', 'd0000000-0000-0000-0000-000000000060'),
  ('e0000000-0000-0000-0000-000000000061', 'd0000000-0000-0000-0000-000000000061'),
  ('e0000000-0000-0000-0000-000000000062', 'd0000000-0000-0000-0000-000000000062'),
  ('e0000000-0000-0000-0000-000000000063', 'd0000000-0000-0000-0000-000000000063'),
  ('e0000000-0000-0000-0000-000000000064', 'd0000000-0000-0000-0000-000000000064'),
  ('e0000000-0000-0000-0000-000000000065', 'd0000000-0000-0000-0000-000000000065'),
  ('e0000000-0000-0000-0000-000000000066', 'd0000000-0000-0000-0000-000000000066')
ON CONFLICT (donation_id, source_id) DO NOTHING;
