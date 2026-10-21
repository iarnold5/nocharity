-- ==============================================================================
-- NoCharity Supabase Migration: 20261021000002_phase1_seed_data.sql
-- Representative Seed Dataset for Phase 1 Validation
-- ==============================================================================

-- 1. SEED TAGS
INSERT INTO tags (id, slug, name, description)
VALUES
('a0000000-0000-0000-0000-000000000001', 'personal', 'Personal Giving', 'Direct personal transfer of confirmed funds or equity from an individual'),
('a0000000-0000-0000-0000-000000000002', 'foundation', 'Foundation Grant', 'Disbursed by a tax-exempt private or family foundation endowment'),
('a0000000-0000-0000-0000-000000000003', 'corporate', 'Corporate Philanthropy', 'Donated from a corporate treasury or commercial business entity'),
('a0000000-0000-0000-0000-000000000004', 'daf', 'Donor-Advised Fund', 'Capital parked in a commercial DAF (opaque payout and timing)'),
('a0000000-0000-0000-0000-000000000005', 'health', 'Global Health', 'Combating infectious disease, maternal health, and medical research'),
('a0000000-0000-0000-0000-000000000006', 'education', 'Education', 'Public schooling, universities, scholarships, and literacy initiatives'),
('a0000000-0000-0000-0000-000000000007', 'community', 'Grassroots & Community', 'Local community resilience, food security, and social services'),
('a0000000-0000-0000-0000-000000000008', 'pledge', 'Giving Pledge', 'Public non-binding commitment to give away >50% of wealth')
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- 2. SEED PEOPLE
INSERT INTO people (id, canonical_name, first_name, last_name, aliases, country, birth_date, occupation, industry, description, is_billionaire)
VALUES
('b0000000-0000-0000-0000-000000000001', 'Warren Buffett', 'Warren', 'Buffett', ARRAY['The Oracle of Omaha', 'Warren E. Buffett'], '🇺🇸 United States', '1930-08-30', 'Investor & CEO', 'Finance & Investing', 'Chairman and CEO of Berkshire Hathaway. Committed to giving >99% of wealth to philanthropic foundations.', TRUE),
('b0000000-0000-0000-0000-000000000002', 'Bill Gates', 'William', 'Gates', ARRAY['Bill Gates III', 'William H. Gates'], '🇺🇸 United States', '1955-10-28', 'Co-Chair, Gates Foundation', 'Technology & Philanthropy', 'Co-founder of Microsoft and Co-Chair of the Bill & Melinda Gates Foundation.', TRUE),
('b0000000-0000-0000-0000-000000000003', 'MacKenzie Scott', 'MacKenzie', 'Scott', ARRAY['MacKenzie Bezos'], '🇺🇸 United States', '1970-04-07', 'Philanthropist & Author', 'Philanthropy', 'Pioneered rapid unrestricted direct grants to hundreds of community-focused non-profits via Yield Giving.', TRUE),
('b0000000-0000-0000-0000-000000000004', 'Elon Musk', 'Elon', 'Musk', ARRAY['Elon Reeve Musk'], '🇺🇸 United States', '1971-06-28', 'CEO of Tesla & SpaceX', 'Technology & Automotive', 'CEO of Tesla, SpaceX, and xAI. Primary philanthropy conducted through stock transfers to DAFs.', TRUE)
ON CONFLICT (id) DO UPDATE SET
    canonical_name = EXCLUDED.canonical_name,
    occupation = EXCLUDED.occupation,
    industry = EXCLUDED.industry,
    description = EXCLUDED.description;

-- 3. SEED ORGANIZATIONS
INSERT INTO organizations (id, legal_name, display_name, organization_type, ein, cik, country, website, description)
VALUES
('c0000000-0000-0000-0000-000000000001', 'Berkshire Hathaway Inc.', 'Berkshire Hathaway', 'COMPANY', '47-0813844', '0001067983', '🇺🇸 United States', 'https://www.berkshirehathaway.com', 'Multinational conglomerate holding company based in Omaha, Nebraska.'),
('c0000000-0000-0000-0000-000000000002', 'Bill & Melinda Gates Foundation', 'Gates Foundation', 'FOUNDATION', '56-2618866', NULL, '🇺🇸 United States', 'https://www.gatesfoundation.org', 'One of the world''s largest private philanthropic foundations focused on global health and poverty alleviation.'),
('c0000000-0000-0000-0000-000000000003', 'Susan Thompson Buffett Foundation', 'Buffett Foundation', 'FOUNDATION', '47-6032365', NULL, '🇺🇸 United States', 'https://buffettfoundation.org', 'Private family foundation focused on reproductive healthcare and scholarships.'),
('c0000000-0000-0000-0000-000000000004', 'Tesla, Inc.', 'Tesla', 'COMPANY', '91-2197729', '0001318605', '🇺🇸 United States', 'https://www.tesla.com', 'Electric vehicle and clean energy technology company.'),
('c0000000-0000-0000-0000-000000000005', 'The Musk Foundation', 'Musk Foundation', 'FOUNDATION', '75-2964348', NULL, '🇺🇸 United States', 'https://muskfoundation.org', 'Private foundation funded primarily through Tesla stock transfers.'),
('c0000000-0000-0000-0000-000000000006', 'Fidelity Investments Charitable Gift Fund', 'Fidelity Charitable (DAF)', 'DAF', '04-3132322', NULL, '🇺🇸 United States', 'https://www.fidelitycharitable.org', 'Largest donor-advised fund sponsor in the United States.'),
('c0000000-0000-0000-0000-000000000007', 'Yield Giving Public Registry', 'Yield Giving', 'CHARITY', NULL, NULL, '🇺🇸 United States', 'https://yieldgiving.com', 'Open public disclosure database for MacKenzie Scott''s non-profit grantmaking.')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED SOURCES
INSERT INTO sources (id, publisher, title, url, source_type, published_at, notes)
VALUES
('d0000000-0000-0000-0000-000000000001', 'SEC EDGAR', 'SEC Form 4: Berkshire Hathaway Class B Share Disposition to Charities', 'https://www.sec.gov/edgar/searchedgar/companysearch', 'SEC_FILING', '2025-06-28', 'Primary regulatory disclosure of Warren Buffett annual stock contribution.'),
('d0000000-0000-0000-0000-000000000002', 'Associated Press', 'Warren Buffett donates $5.3 billion in Berkshire Hathaway shares to five foundations', 'https://apnews.com/article/warren-buffett-donation-gates-foundation-berkshire-hathaway-800ec47902506bbd9241b12b55f5f401', 'NEWS', '2025-06-28', 'Secondary news reporting confirming transfer details.'),
('d0000000-0000-0000-0000-000000000003', 'SEC EDGAR', 'SEC Form 4: Tesla Inc Share Transfer by Elon Musk to DAF', 'https://www.sec.gov/Archives/edgar/data/1318605/000089924322006323/xslF345X03/doc4.xml', 'SEC_FILING', '2021-11-19', 'Primary regulatory disclosure of 5,044,000 Tesla shares transferred to DAF / charity.'),
('d0000000-0000-0000-0000-000000000004', 'Yield Giving', 'Yield Giving Open Database of Non-Profit Grants', 'https://yieldgiving.com', 'PRIMARY', '2024-12-10', 'Primary institutional registry of direct community grants disbursed by MacKenzie Scott.'),
('d0000000-0000-0000-0000-000000000005', 'Bloomberg', 'Bloomberg Billionaires Index Historical Profile - Warren Buffett', 'https://www.bloomberg.com/billionaires/profiles/warren-e-buffett/', 'DATABASE', '2025-06-28', 'Daily net worth valuation benchmark.')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED PERSON_ORGANIZATIONS
INSERT INTO person_organizations (id, person_id, organization_id, relationship_type, ownership_percent, start_date, source_id)
VALUES
('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'CHAIRMAN_AND_CEO', 15.60, '1970-05-01', 'd0000000-0000-0000-0000-000000000001'),
('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'CO_CHAIR', NULL, '2000-01-01', NULL),
('e0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'CEO', 20.50, '2008-10-15', 'd0000000-0000-0000-0000-000000000003'),
('e0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000005', 'PRESIDENT', NULL, '2001-01-01', NULL),
('e0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000007', 'FOUNDER', NULL, '2020-01-01', 'd0000000-0000-0000-0000-000000000004')
ON CONFLICT (person_id, organization_id, relationship_type) DO NOTHING;

-- 6. SEED WEALTH_SNAPSHOTS (Historical Wealth Points)
INSERT INTO wealth_snapshots (person_id, snapshot_date, net_worth, currency, source_name, source_id, confidence)
VALUES
-- Warren Buffett historical valuations
('b0000000-0000-0000-0000-000000000001', '2022-01-01', 108000000000, 'USD', 'Forbes Billionaires 2022', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000001', '2023-01-01', 106000000000, 'USD', 'Forbes Billionaires 2023', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000001', '2024-01-01', 120000000000, 'USD', 'Forbes Billionaires 2024', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000001', '2025-06-28', 135000000000, 'USD', 'Bloomberg Billionaires Index', 'd0000000-0000-0000-0000-000000000005', 'HIGH'),
('b0000000-0000-0000-0000-000000000001', '2026-01-01', 145000000000, 'USD', 'Bloomberg Billionaires Index', NULL, 'HIGH'),

-- Bill Gates historical valuations
('b0000000-0000-0000-0000-000000000002', '2022-01-01', 129000000000, 'USD', 'Forbes Billionaires 2022', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000002', '2024-01-01', 128000000000, 'USD', 'Forbes Billionaires 2024', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000002', '2026-01-01', 134000000000, 'USD', 'Bloomberg Billionaires Index', NULL, 'HIGH'),

-- MacKenzie Scott historical valuations
('b0000000-0000-0000-0000-000000000003', '2020-01-01', 36000000000, 'USD', 'Forbes Billionaires 2020', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000003', '2022-01-01', 43600000000, 'USD', 'Forbes Billionaires 2022', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000003', '2024-12-10', 35600000000, 'USD', 'Forbes 400', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000003', '2026-01-01', 32000000000, 'USD', 'Forbes Billionaires 2026', NULL, 'HIGH'),

-- Elon Musk historical valuations
('b0000000-0000-0000-0000-000000000004', '2021-11-19', 300000000000, 'USD', 'Bloomberg Billionaires Index', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000004', '2022-01-01', 219000000000, 'USD', 'Forbes Billionaires 2022', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000004', '2024-01-01', 210000000000, 'USD', 'Forbes Billionaires 2024', NULL, 'HIGH'),
('b0000000-0000-0000-0000-000000000004', '2026-01-01', 320000000000, 'USD', 'Bloomberg Billionaires Index', NULL, 'HIGH')
ON CONFLICT (person_id, snapshot_date) DO NOTHING;

-- 7. SEED DONATIONS (Demonstrating Attribution and Verification Tiers)
INSERT INTO donations (
    id, donor_person_id, donor_organization_id, recipient_person_id, recipient_organization_id,
    amount, currency, donation_date, donation_type, funding_source_type, status,
    description, cause_category, source_id
)
VALUES
-- Warren Buffett: $5.3B stock transfer to Gates Foundation (Personal funds confirmed via SEC Form 4)
('f0000000-0000-0000-0000-000000000001',
 'b0000000-0000-0000-0000-000000000001', NULL, NULL, 'c0000000-0000-0000-0000-000000000002',
 5300000000, 'USD', '2025-06-28', 'STOCK_TRANSFER', 'PERSONAL_FUNDS_CONFIRMED', 'VERIFIED',
 'Warren Buffett converted and donated 13,000,000 Berkshire Class B shares to the Gates Foundation and four family foundations.',
 'Global Health & Education', 'd0000000-0000-0000-0000-000000000001'),

-- MacKenzie Scott: $2.15B direct unrestricted community non-profit grants
('f0000000-0000-0000-0000-000000000002',
 'b0000000-0000-0000-0000-000000000003', NULL, NULL, NULL,
 2150000000, 'USD', '2024-12-10', 'DIRECT_GRANT', 'PERSONAL_DIRECT', 'VERIFIED',
 'Direct unrestricted gifts to 360 grassroots community and civil society non-profit organizations.',
 'Grassroots & Community Resilience', 'd0000000-0000-0000-0000-000000000004'),

-- Elon Musk: $5.74B Tesla stock transferred to DAF / Musk Foundation (Categorized as DAF - Not direct personal gift)
('f0000000-0000-0000-0000-000000000003',
 'b0000000-0000-0000-0000-000000000004', NULL, NULL, 'c0000000-0000-0000-0000-000000000006',
 5740000000, 'USD', '2021-11-19', 'STOCK_TRANSFER', 'DAF', 'PARTIALLY_VERIFIED',
 'Transferred 5,044,000 Tesla shares to a donor-advised fund and the Musk Foundation. End disbursements remain opaque.',
 'Undisclosed Philanthropic DAF', 'd0000000-0000-0000-0000-000000000003'),

-- Gates Foundation: $7B annual institutional grantmaking (Corporate/Foundation grant - NOT an individual donation)
('f0000000-0000-0000-0000-000000000004',
 NULL, 'c0000000-0000-0000-0000-000000000002', NULL, NULL,
 7000000000, 'USD', '2023-01-15', 'FOUNDATION_GRANT', 'FOUNDATION', 'VERIFIED',
 'Annual institutional programmatic disbursement across global polio eradication, maternal health, and agricultural R&D.',
 'Global Health & Poverty Alleviation', NULL)
ON CONFLICT (id) DO NOTHING;

-- 8. SEED DONATION_SOURCES (Corroborating multiple sources)
INSERT INTO donation_sources (donation_id, source_id)
VALUES
('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001'),
('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002'),
('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000004'),
('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003')
ON CONFLICT (donation_id, source_id) DO NOTHING;

-- 9. SEED PERSON_TAGS
INSERT INTO person_tags (person_id, tag_id)
VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000008'), -- Buffett -> Giving Pledge
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'), -- Buffett -> Personal
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000008'), -- Gates -> Giving Pledge
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005'), -- Gates -> Health
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000008'), -- Scott -> Giving Pledge
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007'), -- Scott -> Community
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000008')  -- Musk -> Giving Pledge
ON CONFLICT (person_id, tag_id) DO NOTHING;

-- 10. SEED DONATION_TAGS
INSERT INTO donation_tags (donation_id, tag_id)
VALUES
('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001'), -- Buffett gift -> Personal
('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005'), -- Buffett gift -> Health
('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001'), -- Scott gift -> Personal
('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007'), -- Scott gift -> Community
('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004'), -- Musk gift -> DAF
('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002'), -- Gates Foundation -> Foundation
('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005')  -- Gates Foundation -> Health
ON CONFLICT (donation_id, tag_id) DO NOTHING;
