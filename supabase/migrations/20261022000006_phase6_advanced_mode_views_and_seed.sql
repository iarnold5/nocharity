-- ==============================================================================
-- NoCharity Supabase Migration: 20261022000006_phase6_advanced_mode_views_and_seed.sql
-- Phase 6: Advanced Mode Multi-View Architecture, Full Billionaire Seed & Metrics View
-- ==============================================================================

-- 1. ADD giving_pledge COLUMN TO people TABLE
ALTER TABLE people ADD COLUMN IF NOT EXISTS giving_pledge BOOLEAN DEFAULT false;

-- 2. UPDATE EXISTING PEOPLE GIVING PLEDGE STATUS
UPDATE people SET giving_pledge = true WHERE id IN (
  'b0000000-0000-0000-0000-000000000001', -- Warren Buffett
  'b0000000-0000-0000-0000-000000000002', -- Bill Gates
  'b0000000-0000-0000-0000-000000000003', -- MacKenzie Scott
  'b0000000-0000-0000-0000-000000000004'  -- Elon Musk
);

-- 3. INSERT REMAINING 13 BILLIONAIRES
INSERT INTO people (
    id, canonical_name, first_name, last_name, country, occupation, industry, description, is_billionaire, giving_pledge
) VALUES
('b0000000-0000-0000-0000-000000000005', 'Azim Premji', 'Azim', 'Premji', '🇮🇳 India', 'Wipro / Azim Premji Foundation', 'Information Technology', 'First Indian signatory of the Giving Pledge. Has transferred over $21 Billion (74% of his total business earnings) into an irrevocable trust for primary education in rural India.', true, true),
('b0000000-0000-0000-0000-000000000006', 'Andrew Carnegie (Historic)', 'Andrew', 'Carnegie (Historic)', '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland / 🇺🇸 US', 'Carnegie Steel / Carnegie Corp', 'Steel & Heavy Industry', 'Authored ''The Gospel of Wealth'' in 1889, proclaiming that ''the man who dies rich dies disgraced.'' Donated over 90% of his fortune (~$350 million in 1900, roughly $350 billion today), building over 2,500 public libraries.', true, true),
('b0000000-0000-0000-0000-000000000007', 'John D. Rockefeller (Historic)', 'John', 'D. Rockefeller (Historic)', '🇺🇸 United States', 'Standard Oil / Rockefeller Foundation', 'Petroleum & Energy', 'America''s first billionaire. Given over $540 million (worth over $300 billion today), creating modern biomedical research, the University of Chicago, and eradicating hookworm and yellow fever.', true, true),
('b0000000-0000-0000-0000-000000000008', 'Mukesh Ambani', 'Mukesh', 'Ambani', '🇮🇳 India', 'Reliance Industries / Reliance Foundation', 'Energy, Telecom & Retail', 'Channels philanthropy via the Reliance Foundation, led by Nita Ambani, supporting disaster management, rural transformation, and sports education.', true, false),
('b0000000-0000-0000-0000-000000000009', 'Gautam Adani', 'Gautam', 'Adani', '🇮🇳 India', 'Adani Group / Adani Foundation', 'Infrastructure & Energy', 'Pledged ₹60,000 crore ($7.7B) in 2022 on his 60th birthday for healthcare, education, and skill development through the Adani Foundation.', true, false),
('b0000000-0000-0000-0000-000000000010', 'Carlos Slim', 'Carlos', 'Slim', '🇲🇽 Mexico', 'América Móvil / Grupo Carso', 'Telecommunications & Industry', 'Operates the Carlos Slim Foundation with over $4 billion in endowments focusing on digital education, public nutrition, and the Soumaya Museum in Mexico City.', true, false),
('b0000000-0000-0000-0000-000000000011', 'Jack Ma', 'Jack', 'Ma', '🇨🇳 China', 'Alibaba / Jack Ma Foundation', 'E-Commerce & Tech', 'Stepped down from executive roles to focus on the Jack Ma Foundation, championing rural teachers in China and the Africa Netpreneur Prize.', true, false),
('b0000000-0000-0000-0000-000000000012', 'Michael Bloomberg', 'Michael', 'Bloomberg', '🇺🇸 United States', 'Bloomberg LP', 'Media & Finance', 'Pledged nearly his entire business and wealth to Bloomberg Philanthropies, with major gifts for medical school tuition and public health.', true, true),
('b0000000-0000-0000-0000-000000000013', 'Mark Zuckerberg & Priscilla Chan', 'Mark', 'Zuckerberg & Priscilla Chan', '🇺🇸 United States', 'Meta', 'Technology', 'Chan Zuckerberg Initiative (CZI) aims to build biological imaging, cellular AI models, and support scientific biohubs worldwide.', true, true),
('b0000000-0000-0000-0000-000000000014', 'Jeff Bezos', 'Jeff', 'Bezos', '🇺🇸 United States', 'Amazon / Blue Origin', 'Tech & Commerce', 'Has not signed the Giving Pledge, but pledged $10 billion over a decade through the Bezos Earth Fund and supports homelessness non-profits.', true, false),
('b0000000-0000-0000-0000-000000000015', 'Larry Ellison', 'Larry', 'Ellison', '🇺🇸 United States', 'Oracle', 'Enterprise Software', 'Signed the Giving Pledge in 2010 promising 95% of wealth. Major public contributions have gone toward medical institutes and local Lanai conservation.', true, true),
('b0000000-0000-0000-0000-000000000016', 'Bernard Arnault & Family', 'Bernard', 'Arnault & Family', '🇫🇷 France', 'LVMH Moët Hennessy Louis Vuitton', 'Luxury Goods', 'Europe''s wealthiest tycoon; has not signed the Giving Pledge. Focuses on French cultural monuments and national emergency food relief.', true, false),
('b0000000-0000-0000-0000-000000000017', 'Steve & Connie Ballmer', 'Steve', '& Connie Ballmer', '🇺🇸 United States', 'Ballmer Group / Microsoft', 'Tech & Sports', 'Champions data-driven philanthropic giving focusing on economic mobility for impoverished youth and racial equity through the Ballmer Group.', true, true)
ON CONFLICT (id) DO NOTHING;

-- 4. INSERT ORGANIZATIONS
INSERT INTO organizations (id, legal_name, display_name, organization_type, country) VALUES
('c0000000-0000-0000-0000-000000000008', 'Wipro Limited', 'Wipro Limited', 'COMPANY', '🇮🇳 India'),
('c0000000-0000-0000-0000-000000000009', 'Azim Premji Foundation', 'Azim Premji Foundation', 'FOUNDATION', '🇮🇳 India'),
('c0000000-0000-0000-0000-000000000010', 'Carnegie Corporation of New York', 'Carnegie Corporation of New York', 'FOUNDATION', '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland / 🇺🇸 US'),
('c0000000-0000-0000-0000-000000000011', 'Rockefeller Foundation', 'Rockefeller Foundation', 'FOUNDATION', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000012', 'Reliance Industries Limited', 'Reliance Industries Limited', 'COMPANY', '🇮🇳 India'),
('c0000000-0000-0000-0000-000000000013', 'Reliance Foundation', 'Reliance Foundation', 'FOUNDATION', '🇮🇳 India'),
('c0000000-0000-0000-0000-000000000014', 'Adani Group', 'Adani Group', 'COMPANY', '🇮🇳 India'),
('c0000000-0000-0000-0000-000000000015', 'Adani Foundation', 'Adani Foundation', 'FOUNDATION', '🇮🇳 India'),
('c0000000-0000-0000-0000-000000000016', 'Grupo Carso / América Móvil', 'Grupo Carso / América Móvil', 'COMPANY', '🇲🇽 Mexico'),
('c0000000-0000-0000-0000-000000000017', 'Carlos Slim Foundation', 'Carlos Slim Foundation', 'FOUNDATION', '🇲🇽 Mexico'),
('c0000000-0000-0000-0000-000000000018', 'Alibaba Group', 'Alibaba Group', 'COMPANY', '🇨🇳 China'),
('c0000000-0000-0000-0000-000000000019', 'Jack Ma Foundation', 'Jack Ma Foundation', 'FOUNDATION', '🇨🇳 China'),
('c0000000-0000-0000-0000-000000000020', 'Bloomberg LP', 'Bloomberg LP', 'COMPANY', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000021', 'Bloomberg Philanthropies', 'Bloomberg Philanthropies', 'FOUNDATION', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000022', 'Meta Platforms Inc', 'Meta Platforms Inc', 'COMPANY', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000023', 'Chan Zuckerberg Initiative', 'Chan Zuckerberg Initiative', 'FOUNDATION', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000024', 'Amazon.com Inc', 'Amazon.com Inc', 'COMPANY', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000025', 'Bezos Earth Fund', 'Bezos Earth Fund', 'FOUNDATION', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000026', 'Oracle Corporation', 'Oracle Corporation', 'COMPANY', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000027', 'Lawrence Ellison Foundation', 'Lawrence Ellison Foundation', 'FOUNDATION', '🇺🇸 United States'),
('c0000000-0000-0000-0000-000000000028', 'LVMH Moët Hennessy Louis Vuitton', 'LVMH Moët Hennessy Louis Vuitton', 'COMPANY', '🇫🇷 France'),
('c0000000-0000-0000-0000-000000000029', 'Fondation Louis Vuitton', 'Fondation Louis Vuitton', 'FOUNDATION', '🇫🇷 France'),
('c0000000-0000-0000-0000-000000000030', 'Ballmer Group', 'Ballmer Group', 'FOUNDATION', '🇺🇸 United States')
ON CONFLICT (id) DO NOTHING;

-- 5. LINK PERSON_ORGANIZATIONS
INSERT INTO person_organizations (person_id, organization_id, relationship_type) VALUES
('b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000008', 'FOUNDER_AND_CHAIRMAN'),
('b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000009', 'CHAIRMAN'),
('b0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000010', 'FOUNDER'),
('b0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000011', 'FOUNDER'),
('b0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000012', 'CHAIRMAN_AND_MD'),
('b0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000013', 'TRUSTEE'),
('b0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000014', 'FOUNDER_AND_CHAIRMAN'),
('b0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000015', 'TRUSTEE'),
('b0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000016', 'HONORARY_CHAIRMAN'),
('b0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000017', 'PRESIDENT'),
('b0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000018', 'CO_FOUNDER'),
('b0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000019', 'FOUNDER'),
('b0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000020', 'FOUNDER_AND_MAJORITY_OWNER'),
('b0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000021', 'FOUNDER'),
('b0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000022', 'FOUNDER_AND_CEO'),
('b0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000023', 'CO_FOUNDER'),
('b0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000024', 'EXECUTIVE_CHAIR'),
('b0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000025', 'FOUNDER'),
('b0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000026', 'CHIEF_TECHNOLOGY_OFFICER'),
('b0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000027', 'FOUNDER'),
('b0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000028', 'CHAIRMAN_AND_CEO'),
('b0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000029', 'PATRON'),
('b0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000030', 'CO_FOUNDER')
ON CONFLICT (person_id, organization_id, relationship_type) DO NOTHING;

-- 6. INSERT WEALTH SNAPSHOTS
INSERT INTO wealth_snapshots (person_id, snapshot_date, net_worth, currency, source_name, confidence) VALUES
('b0000000-0000-0000-0000-000000000005', '2024-01-01', 23000000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000005', '2026-01-01', 25000000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000006', '2024-01-01', 322000000000, 'USD', 'Carnegie Corporation Historical Archives', 'HIGH'),
('b0000000-0000-0000-0000-000000000006', '2026-01-01', 350000000000, 'USD', 'Carnegie Corporation Historical Archives', 'HIGH'),
('b0000000-0000-0000-0000-000000000007', '2024-01-01', 368000000000, 'USD', 'Rockefeller Foundation Archives', 'HIGH'),
('b0000000-0000-0000-0000-000000000007', '2026-01-01', 400000000000, 'USD', 'Rockefeller Foundation Archives', 'HIGH'),
('b0000000-0000-0000-0000-000000000008', '2024-01-01', 105800000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000008', '2026-01-01', 115000000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000009', '2024-01-01', 78200000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000009', '2026-01-01', 85000000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000010', '2024-01-01', 87400000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000010', '2026-01-01', 95000000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000011', '2024-01-01', 23920000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000011', '2026-01-01', 26000000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000012', '2024-01-01', 96600000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000012', '2026-01-01', 105000000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000013', '2024-01-01', 197800000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000013', '2026-01-01', 215000000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000014', '2024-01-01', 202400000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000014', '2026-01-01', 220000000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000015', '2024-01-01', 161000000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000015', '2026-01-01', 175000000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000016', '2024-01-01', 165600000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000016', '2026-01-01', 180000000000, 'USD', 'Bloomberg Billionaires Index', 'HIGH'),
('b0000000-0000-0000-0000-000000000017', '2024-01-01', 119600000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH'),
('b0000000-0000-0000-0000-000000000017', '2026-01-01', 130000000000, 'USD', 'Forbes Real-Time Billionaires', 'HIGH')
ON CONFLICT (person_id, snapshot_date) DO NOTHING;

-- 7. INSERT SOURCES
INSERT INTO sources (id, publisher, title, url, source_type, published_at) VALUES
('d0000000-0000-0000-0000-000000000010', 'The Hindu', 'Azim Premji Philanthropic Initiatives commit ₹10,000 Crore to expand district public health', 'https://www.thehindu.com/business/azim-premji-philanthropic-initiatives-rural-healthcare/article68051234.ece', 'NEWS', '2025-04-12'),
('d0000000-0000-0000-0000-000000000011', 'Economic Times', 'EdelGive Hurun India Philanthropy List names Azim Premji top education benefactor for 5th consecutive year', 'https://economictimes.indiatimes.com/news/india/hurun-india-philanthropy-list-azim-premji/articleshow/115082194.cms', 'NEWS', '2024-11-08'),
('d0000000-0000-0000-0000-000000000012', 'Business Standard', 'Azim Premji Foundation commits ₹1,125 crore for public healthcare and humanitarian aid', 'https://www.business-standard.com/article/companies/azim-premji-foundation-commits-additional-funds-for-covid-relief-121051801234_1.html', 'NEWS', '2021-05-18'),
('d0000000-0000-0000-0000-000000000013', 'LiveMint', 'Azim Premji gives away 34% of Wipro shares worth $7.5 billion to philanthropic trust', 'https://www.livemint.com/companies/news/azim-premji-earmarks-economic-benefits-of-wipro-shares-worth-7-5-billion-for-philanthropy-1552554746682.html', 'NEWS', '2019-03-14'),
('d0000000-0000-0000-0000-000000000014', 'Carnegie Historical Records', 'Andrew Carnegie endows Carnegie Corporation with bulk of remaining wealth for international peace and knowledge', 'https://www.carnegie.org/about/our-history/', 'NEWS', '1911-11-10'),
('d0000000-0000-0000-0000-000000000015', 'Library of Congress', 'Carnegie establishes pension fund for college professors and teachers', 'https://www.loc.gov/item/today-in-history/november-25/', 'NEWS', '1905-04-16'),
('d0000000-0000-0000-0000-000000000016', 'PBS American Experience', 'Carnegie begins massive gift campaign to build free public libraries across English-speaking world', 'https://www.pbs.org/wgbh/americanexperience/features/carnegie-philanthropy/', 'NEWS', '1901-03-03'),
('d0000000-0000-0000-0000-000000000017', 'Rockefeller Archive Center', 'John D. Rockefeller endows Rockefeller Foundation to ''promote the well-being of mankind throughout the world''', 'https://www.rockefellerfoundation.org/about-us/our-history/', 'NEWS', '1913-05-14'),
('d0000000-0000-0000-0000-000000000018', 'Rockefeller University Archives', 'Rockefeller founds America''s first biomedical research institute', 'https://www.rockefeller.edu/about/history/', 'NEWS', '1901-06-14'),
('d0000000-0000-0000-0000-000000000019', 'UChicago Chronicles', 'Rockefeller funds creation of University of Chicago as premier research institution', 'https://www.uchicago.edu/about/history', 'NEWS', '1890-09-10'),
('d0000000-0000-0000-0000-000000000020', 'Times of India', 'Reliance Foundation announces ₹1,200 crore expansion for free pediatric hospital beds', 'https://timesofindia.indiatimes.com/business/india-business/reliance-foundation-hospital-expansion-mumbai/articleshow/114523912.cms', 'NEWS', '2024-10-24'),
('d0000000-0000-0000-0000-000000000021', 'Hindustan Times', 'Reliance Foundation awards 5,000 undergraduate and postgraduate scholarships across India', 'https://www.hindustantimes.com/education/reliance-foundation-scholarships-merit-students/story-892347.html', 'NEWS', '2023-08-15'),
('d0000000-0000-0000-0000-000000000022', 'NDTV', 'Reliance Industries commits ₹500 crore to PM CARES Fund alongside emergency quarantine centers', 'https://www.ndtv.com/india-news/reliance-industries-donates-rs-500-crore-to-pm-cares-fund-for-coronavirus-fight-2203023', 'NEWS', '2020-03-30'),
('d0000000-0000-0000-0000-000000000023', 'BusinessLine', 'Adani Foundation expands skill development centers across Gujarat and Maharashtra', 'https://www.thehindubusinessline.com/companies/adani-foundation-skill-development-rural-youth/article68631234.ece', 'NEWS', '2024-09-12'),
('d0000000-0000-0000-0000-000000000024', 'The Hindu', 'Gautam Adani and family pledge ₹60,000 crore ($7.7B) to social causes on 60th birthday', 'https://www.thehindu.com/business/gautam-adani-pledges-60000-crore-to-charity-on-60th-birthday/article65557762.ece', 'NEWS', '2022-06-23'),
('d0000000-0000-0000-0000-000000000025', 'El Universal', 'Carlos Slim Foundation reports 25 million people trained through free digital job platform', 'https://www.eluniversal.com.mx/cartera/fundacion-carlos-slim-capacita-a-millones-en-empleo/', 'NEWS', '2024-04-18'),
('d0000000-0000-0000-0000-000000000026', 'BBC News', 'Carlos Slim Foundation finances early production of AstraZeneca vaccine for Latin America', 'https://www.bbc.com/news/world-latin-america-53765104', 'NEWS', '2020-08-13'),
('d0000000-0000-0000-0000-000000000027', 'South China Morning Post', 'Jack Ma Foundation convenes annual rural teacher awards in Hangzhou', 'https://www.scmp.com/tech/big-tech/article/3249182/jack-ma-appears-video-rural-teachers-annual-awards', 'NEWS', '2024-01-20'),
('d0000000-0000-0000-0000-000000000028', 'Reuters', 'Jack Ma Foundation ships over 100 million face masks and testing kits worldwide', 'https://www.reuters.com/article/us-health-coronavirus-jack-ma-idUSKCN22329G/', 'NEWS', '2020-04-21'),
('d0000000-0000-0000-0000-000000000029', 'The Baltimore Sun', 'Michael Bloomberg donates $1 billion to make Johns Hopkins Medical School tuition-free for most students', 'https://www.baltimoresun.com/2024/07/08/bloomberg-billion-dollar-gift-hopkins-medical-school/', 'NEWS', '2024-07-08'),
('d0000000-0000-0000-0000-000000000030', 'Chronicle of Philanthropy', 'Michael Bloomberg gifted $3 billion in 2023, ranking among America''s top philanthropists', 'https://www.philanthropy.com/article/the-philanthropy-50-americas-biggest-donors', 'NEWS', '2024-02-06'),
('d0000000-0000-0000-0000-000000000031', 'Forbes', 'Bloomberg Philanthropies announces $1.7 billion distributed in 2022', 'https://www.forbes.com/sites/kerryadolan/2023/01/24/americas-top-givers-2023-the-25-most-philanthropic-billionaires/', 'NEWS', '2022-12-15'),
('d0000000-0000-0000-0000-000000000032', 'Science Magazine', 'Chan Zuckerberg Initiative funds $720M for new biomedical research hubs in Chicago and NYC', 'https://www.science.org/content/article/zuckerberg-chan-initiative-funds-biomedical-hubs-chicago-new-york', 'NEWS', '2024-05-18'),
('d0000000-0000-0000-0000-000000000033', 'Nature', 'CZI builds high-performance GPU cluster for scientific AI with $600M capital expenditure', 'https://www.nature.com/articles/d41586-023-02910-1', 'NEWS', '2023-09-19'),
('d0000000-0000-0000-0000-000000000034', 'The Harvard Crimson', 'Zuckerberg and Chan donate $500 million to Harvard for artificial intelligence and biology institute', 'https://www.thecrimson.com/article/2021/12/7/chan-zuckerberg-gift-kempner-institute/', 'NEWS', '2021-12-07'),
('d0000000-0000-0000-0000-000000000035', 'USA Today', 'Jeff Bezos awards $110.5 million in Day 1 Families Fund grants to combat family homelessness', 'https://www.usatoday.com/story/money/2024/11/20/jeff-bezos-day-1-families-fund-grants/76451234007/', 'NEWS', '2024-11-20'),
('d0000000-0000-0000-0000-000000000036', 'CNN', 'Jeff Bezos and Lauren Sánchez pledge $100M Maui Fund; Earth Fund disburses $150M for clean food systems', 'https://www.cnn.com/2023/08/11/business/jeff-bezos-lauren-sanchez-maui-donation/index.html', 'NEWS', '2023-08-11'),
('d0000000-0000-0000-0000-000000000037', 'CNN Exclusive', 'Bezos pledges majority of wealth to charity, grants $100M Courage & Civility Award to Dolly Parton', 'https://www.cnn.com/2022/11/14/business/jeff-bezos-charity-donation/index.html', 'NEWS', '2022-11-14'),
('d0000000-0000-0000-0000-000000000038', 'Washington Post', 'Jeff Bezos announces first $791M of his $10 billion Earth Fund climate pledge', 'https://www.washingtonpost.com/climate-environment/2020/11/16/bezos-earth-fund-climate-donations/', 'NEWS', '2020-11-16'),
('d0000000-0000-0000-0000-000000000039', 'Honolulu Civil Beat', 'Ellison foundation backs marine biology and wildlife sanctuaries in Hawaii', 'https://www.civilbeat.org/2024/08/larry-ellison-foundation-hawaii-lanai-wildlife/', 'NEWS', '2024-08-14'),
('d0000000-0000-0000-0000-000000000040', 'USC News', 'Larry Ellison funds cancer research center at University of Southern California', 'https://news.usc.edu/169727/larry-ellison-institute-transformative-medicine-usc-opening/', 'NEWS', '2020-05-10'),
('d0000000-0000-0000-0000-000000000041', 'Le Monde', 'Arnault family pledges emergency aid to Restos du Cœur and cultural preservation in Paris', 'https://www.lemonde.fr/en/economy/article/2024/03/12/bernard-arnault-and-family-pledge-aid-to-restos-du-coeur_6609823_19.html', 'NEWS', '2024-03-12'),
('d0000000-0000-0000-0000-000000000042', 'BBC News', 'Bernard Arnault family steps in with €10 million donation to French emergency food aid charity', 'https://www.bbc.com/news/world-europe-66717524', 'NEWS', '2023-09-05'),
('d0000000-0000-0000-0000-000000000043', 'Reuters', 'LVMH and Arnault family commit €200 million ($226M) to rebuild fire-ravaged Notre-Dame', 'https://www.reuters.com/article/us-france-notredame-arnault-idUSKCN1RS0L3/', 'NEWS', '2019-04-16'),
('d0000000-0000-0000-0000-000000000044', 'Inside Philanthropy', 'Ballmer Group distributes $600M+ targeting economic mobility and early childhood in 2024', 'https://www.insidephilanthropy.com/home/2024/10/18/steve-and-connie-ballmers-massive-giving-year', 'NEWS', '2024-10-18'),
('d0000000-0000-0000-0000-000000000045', 'University of Oregon News', 'Steve and Connie Ballmer donate $425 million to create Children''s Behavioral Health Institute', 'https://around.uoregon.edu/ballmer-institute-childrens-behavioral-health', 'NEWS', '2023-03-01'),
('d0000000-0000-0000-0000-000000000046', 'Forbes', 'Ballmer Group pledges $400 million to four organizations backing black-led initiatives', 'https://www.forbes.com/sites/kerryadolan/2022/04/06/steve-and-connie-ballmer-commit-400-million-to-black-led-funds/', 'NEWS', '2022-04-06')
ON CONFLICT (id) DO NOTHING;

-- 8. INSERT DONATIONS
INSERT INTO donations (id, donor_person_id, amount, currency, donation_date, donation_type, funding_source_type, status, description, cause_category, source_id) VALUES
('f0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000005', 1200000000, 'USD', '2025-04-12', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Azim Premji Philanthropic Initiatives commit ₹10,000 Crore to expand district public health', 'Azim Premji Foundation Rural Teacher Training & Healthcare', 'd0000000-0000-0000-0000-000000000010'),
('f0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000005', 1100000000, 'USD', '2024-11-08', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'EdelGive Hurun India Philanthropy List names Azim Premji top education benefactor for 5th consecutive year', 'Primary School Infrastructure across 7 Indian States', 'd0000000-0000-0000-0000-000000000011'),
('f0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000005', 1300000000, 'USD', '2021-05-18', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Azim Premji Foundation commits ₹1,125 crore for public healthcare and humanitarian aid', 'COVID-19 Humanitarian Relief & Medical Oxygen Systems', 'd0000000-0000-0000-0000-000000000012'),
('f0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000005', 7500000000, 'USD', '2019-03-14', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Azim Premji gives away 34% of Wipro shares worth $7.5 billion to philanthropic trust', 'Azim Premji Foundation Endowment Irrevocable Trust', 'd0000000-0000-0000-0000-000000000013'),
('f0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000006', 135000000000, 'USD', '1911-11-10', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Andrew Carnegie endows Carnegie Corporation with bulk of remaining wealth for international peace and knowledge', 'Carnegie Corporation of New York Permanent Endowment', 'd0000000-0000-0000-0000-000000000014'),
('f0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000006', 60000000000, 'USD', '1905-04-16', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Carnegie establishes pension fund for college professors and teachers', 'Carnegie Foundation for the Advancement of Teaching', 'd0000000-0000-0000-0000-000000000015'),
('f0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000006', 120000000000, 'USD', '1901-03-03', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Carnegie begins massive gift campaign to build free public libraries across English-speaking world', 'Public Libraries Program (Over 2,500 libraries worldwide)', 'd0000000-0000-0000-0000-000000000016'),
('f0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000007', 150000000000, 'USD', '1913-05-14', 'GIFT', 'FOUNDATION', 'VERIFIED', 'John D. Rockefeller endows Rockefeller Foundation to ''promote the well-being of mankind throughout the world''', 'Rockefeller Foundation Charter Endowment', 'd0000000-0000-0000-0000-000000000017'),
('f0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000007', 80000000000, 'USD', '1901-06-14', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Rockefeller founds America''s first biomedical research institute', 'Rockefeller Institute for Medical Research (now Rockefeller University)', 'd0000000-0000-0000-0000-000000000018'),
('f0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000007', 70000000000, 'USD', '1890-09-10', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Rockefeller funds creation of University of Chicago as premier research institution', 'University of Chicago Founding Endowment', 'd0000000-0000-0000-0000-000000000019'),
('f0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000008', 150000000, 'USD', '2024-10-24', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Reliance Foundation announces ₹1,200 crore expansion for free pediatric hospital beds', 'Reliance Foundation Healthcare & Hospital Expansion in Mumbai', 'd0000000-0000-0000-0000-000000000020'),
('f0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000008', 120000000, 'USD', '2023-08-15', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Reliance Foundation awards 5,000 undergraduate and postgraduate scholarships across India', 'Jio Institute Higher Education Scholarships', 'd0000000-0000-0000-0000-000000000021'),
('f0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000008', 67000000, 'USD', '2020-03-30', 'GIFT', 'PLEDGE', 'VERIFIED', 'Reliance Industries commits ₹500 crore to PM CARES Fund alongside emergency quarantine centers', 'PM-CARES COVID-19 Emergency Fund', 'd0000000-0000-0000-0000-000000000022'),
('f0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000009', 80000000, 'USD', '2024-09-12', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Adani Foundation expands skill development centers across Gujarat and Maharashtra', 'Adani Foundation Skill Development Centers & Rural Schools', 'd0000000-0000-0000-0000-000000000023'),
('f0000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000009', 7700000000, 'USD', '2022-06-23', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Gautam Adani and family pledge ₹60,000 crore ($7.7B) to social causes on 60th birthday', 'Adani Foundation Landmark Birthday Commitment (Healthcare & Education)', 'd0000000-0000-0000-0000-000000000024'),
('f0000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000010', 120000000, 'USD', '2024-04-18', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Carlos Slim Foundation reports 25 million people trained through free digital job platform', 'Capacítate para el Empleo Free Digital Job Training', 'd0000000-0000-0000-0000-000000000025'),
('f0000000-0000-0000-0000-000000000026', 'b0000000-0000-0000-0000-000000000010', 50000000, 'USD', '2020-08-13', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Carlos Slim Foundation finances early production of AstraZeneca vaccine for Latin America', 'AstraZeneca COVID Vaccine Production for Latin America', 'd0000000-0000-0000-0000-000000000026'),
('f0000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000011', 45000000, 'USD', '2024-01-20', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Jack Ma Foundation convenes annual rural teacher awards in Hangzhou', 'Jack Ma Rural Teachers & Headmasters Initiative', 'd0000000-0000-0000-0000-000000000027'),
('f0000000-0000-0000-0000-000000000028', 'b0000000-0000-0000-0000-000000000011', 145000000, 'USD', '2020-04-21', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Jack Ma Foundation ships over 100 million face masks and testing kits worldwide', 'Global PPE and Medical Supplies Donation across 150 Countries', 'd0000000-0000-0000-0000-000000000028'),
('f0000000-0000-0000-0000-000000000029', 'b0000000-0000-0000-0000-000000000012', 1000000000, 'USD', '2024-07-08', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Michael Bloomberg donates $1 billion to make Johns Hopkins Medical School tuition-free for most students', 'Johns Hopkins Medical School Tuition-Free Endowment', 'd0000000-0000-0000-0000-000000000029'),
('f0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000012', 3000000000, 'USD', '2024-02-06', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Michael Bloomberg gifted $3 billion in 2023, ranking among America''s top philanthropists', 'Bloomberg Philanthropies Annual Distributions & Beyond Coal', 'd0000000-0000-0000-0000-000000000030'),
('f0000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000012', 1700000000, 'USD', '2022-12-15', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Bloomberg Philanthropies announces $1.7 billion distributed in 2022', 'Municipal Innovation & Global Public Health', 'd0000000-0000-0000-0000-000000000031'),
('f0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000013', 720000000, 'USD', '2024-05-18', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Chan Zuckerberg Initiative funds $720M for new biomedical research hubs in Chicago and NYC', 'Chan Zuckerberg Biohub & Chicago Institute for Quantum Biology', 'd0000000-0000-0000-0000-000000000032'),
('f0000000-0000-0000-0000-000000000033', 'b0000000-0000-0000-0000-000000000013', 600000000, 'USD', '2023-09-19', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'CZI builds high-performance GPU cluster for scientific AI with $600M capital expenditure', 'AI for Scientific Biology & Cellular Computing', 'd0000000-0000-0000-0000-000000000033'),
('f0000000-0000-0000-0000-000000000034', 'b0000000-0000-0000-0000-000000000013', 500000000, 'USD', '2021-12-07', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Zuckerberg and Chan donate $500 million to Harvard for artificial intelligence and biology institute', 'Kempner Institute for Natural & Artificial Intelligence at Harvard', 'd0000000-0000-0000-0000-000000000034'),
('f0000000-0000-0000-0000-000000000035', 'b0000000-0000-0000-0000-000000000014', 110000000, 'USD', '2024-11-20', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Jeff Bezos awards $110.5 million in Day 1 Families Fund grants to combat family homelessness', 'Day 1 Families Fund (Family Homelessness Shelters)', 'd0000000-0000-0000-0000-000000000035'),
('f0000000-0000-0000-0000-000000000036', 'b0000000-0000-0000-0000-000000000014', 250000000, 'USD', '2023-08-11', 'GIFT', 'PLEDGE', 'VERIFIED', 'Jeff Bezos and Lauren Sánchez pledge $100M Maui Fund; Earth Fund disburses $150M for clean food systems', 'Maui Wildfire Emergency Fund & Bezos Earth Fund Grants', 'd0000000-0000-0000-0000-000000000036'),
('f0000000-0000-0000-0000-000000000037', 'b0000000-0000-0000-0000-000000000014', 300000000, 'USD', '2022-11-14', 'GIFT', 'PLEDGE', 'VERIFIED', 'Bezos pledges majority of wealth to charity, grants $100M Courage & Civility Award to Dolly Parton', 'Bezos Earth Fund & Smithsonian Institution', 'd0000000-0000-0000-0000-000000000037'),
('f0000000-0000-0000-0000-000000000038', 'b0000000-0000-0000-0000-000000000014', 1000000000, 'USD', '2020-11-16', 'GIFT', 'PLEDGE', 'VERIFIED', 'Jeff Bezos announces first $791M of his $10 billion Earth Fund climate pledge', 'Inaugural Bezos Earth Fund Grants', 'd0000000-0000-0000-0000-000000000038'),
('f0000000-0000-0000-0000-000000000039', 'b0000000-0000-0000-0000-000000000015', 25000000, 'USD', '2024-08-14', 'GIFT', 'FOUNDATION', 'VERIFIED', 'Ellison foundation backs marine biology and wildlife sanctuaries in Hawaii', 'Lanai Wildlife Sanctuary & Hawaiian Marine Conservation', 'd0000000-0000-0000-0000-000000000039'),
('f0000000-0000-0000-0000-000000000040', 'b0000000-0000-0000-0000-000000000015', 200000000, 'USD', '2020-05-10', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Larry Ellison funds cancer research center at University of Southern California', 'USC Lawrence J. Ellison Institute for Transformative Medicine', 'd0000000-0000-0000-0000-000000000040'),
('f0000000-0000-0000-0000-000000000041', 'b0000000-0000-0000-0000-000000000016', 15000000, 'USD', '2024-03-12', 'GIFT', 'PLEDGE', 'VERIFIED', 'Arnault family pledges emergency aid to Restos du Cœur and cultural preservation in Paris', 'Restos du Cœur Food Relief & Paris Cultural Preservation', 'd0000000-0000-0000-0000-000000000041'),
('f0000000-0000-0000-0000-000000000042', 'b0000000-0000-0000-0000-000000000016', 10000000, 'USD', '2023-09-05', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Bernard Arnault family steps in with €10 million donation to French emergency food aid charity', 'Restos du Cœur Emergency Food Charity', 'd0000000-0000-0000-0000-000000000042'),
('f0000000-0000-0000-0000-000000000043', 'b0000000-0000-0000-0000-000000000016', 226000000, 'USD', '2019-04-16', 'GIFT', 'PLEDGE', 'VERIFIED', 'LVMH and Arnault family commit €200 million ($226M) to rebuild fire-ravaged Notre-Dame', 'Notre-Dame Cathedral Reconstruction', 'd0000000-0000-0000-0000-000000000043'),
('f0000000-0000-0000-0000-000000000044', 'b0000000-0000-0000-0000-000000000017', 600000000, 'USD', '2024-10-18', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Ballmer Group distributes $600M+ targeting economic mobility and early childhood in 2024', 'US Economic Mobility & Early Childhood Initiatives', 'd0000000-0000-0000-0000-000000000044'),
('f0000000-0000-0000-0000-000000000045', 'b0000000-0000-0000-0000-000000000017', 425000000, 'USD', '2023-03-01', 'GIFT', 'PERSONAL_DIRECT', 'VERIFIED', 'Steve and Connie Ballmer donate $425 million to create Children''s Behavioral Health Institute', 'Ballmer Institute for Children''s Behavioral Health (Univ of Oregon)', 'd0000000-0000-0000-0000-000000000045'),
('f0000000-0000-0000-0000-000000000046', 'b0000000-0000-0000-0000-000000000017', 400000000, 'USD', '2022-04-06', 'GIFT', 'PLEDGE', 'VERIFIED', 'Ballmer Group pledges $400 million to four organizations backing black-led initiatives', 'Black Community Investment & Youth Sports', 'd0000000-0000-0000-0000-000000000046')
ON CONFLICT (id) DO NOTHING;

-- 9. REBUILD VIEWS WITH giving_pledge COLUMN
DROP VIEW IF EXISTS v_person_rankings CASCADE;
DROP VIEW IF EXISTS v_person_giving_summary CASCADE;

CREATE OR REPLACE VIEW v_person_giving_summary AS
WITH latest_wealth AS (
    SELECT DISTINCT ON (person_id)
        person_id,
        net_worth AS latest_net_worth,
        snapshot_date AS latest_snapshot_date,
        currency AS wealth_currency
    FROM wealth_snapshots
    ORDER BY person_id, snapshot_date DESC
),
donation_agg AS (
    SELECT
        donor_person_id AS person_id,
        COUNT(*)::INT AS total_donations_count,
        COUNT(*) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'))::INT AS personal_donations_count,
        COALESCE(SUM(amount), 0) AS total_donated_all,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')), 0) AS total_personal_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'FOUNDATION'), 0) AS total_foundation_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'DAF'), 0) AS total_daf_transfers,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'CORPORATE'), 0) AS total_corporate_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'PLEDGE'), 0) AS total_pledges
    FROM donations
    WHERE donor_person_id IS NOT NULL
    GROUP BY donor_person_id
),
historical_parity_agg AS (
    SELECT
        donor_person_id AS person_id,
        ROUND(AVG(historical_percentage), 4) AS avg_historical_percentage,
        MAX(historical_percentage) AS peak_historical_percentage
    FROM v_donations_with_parity
    WHERE donor_person_id IS NOT NULL
      AND is_individual_attribution = true
    GROUP BY donor_person_id
)
SELECT 
    p.id AS person_id,
    p.canonical_name,
    p.first_name,
    p.last_name,
    p.aliases,
    p.country,
    p.occupation,
    p.industry,
    p.description,
    p.is_billionaire,
    p.giving_pledge,
    lw.latest_net_worth,
    lw.latest_snapshot_date,
    COALESCE(lw.wealth_currency, 'USD') AS wealth_currency,
    COALESCE(da.total_donations_count, 0) AS total_donations_count,
    COALESCE(da.personal_donations_count, 0) AS personal_donations_count,
    COALESCE(da.total_donated_all, 0) AS total_donated_all,
    COALESCE(da.total_personal_giving, 0) AS total_personal_giving,
    COALESCE(da.total_foundation_giving, 0) AS total_foundation_giving,
    COALESCE(da.total_daf_transfers, 0) AS total_daf_transfers,
    COALESCE(da.total_corporate_giving, 0) AS total_corporate_giving,
    COALESCE(da.total_pledges, 0) AS total_pledges,
    CASE 
        WHEN lw.latest_net_worth > 0 THEN 
            ROUND((COALESCE(da.total_personal_giving, 0) / lw.latest_net_worth) * 100, 4)
        ELSE 0 
    END AS lifetime_personal_giving_ratio,
    COALESCE(hpa.avg_historical_percentage, 0) AS avg_historical_percentage,
    COALESCE(hpa.peak_historical_percentage, 0) AS peak_historical_percentage
FROM people p
LEFT JOIN latest_wealth lw ON lw.person_id = p.id
LEFT JOIN donation_agg da ON da.person_id = p.id
LEFT JOIN historical_parity_agg hpa ON hpa.person_id = p.id;

CREATE OR REPLACE VIEW v_person_rankings AS
SELECT 
    s.*,
    DENSE_RANK() OVER (ORDER BY s.total_personal_giving DESC) AS rank_by_personal_giving,
    DENSE_RANK() OVER (ORDER BY s.lifetime_personal_giving_ratio DESC) AS rank_by_giving_ratio,
    DENSE_RANK() OVER (ORDER BY COALESCE(s.latest_net_worth, 0) DESC) AS rank_by_net_worth
FROM v_person_giving_summary s;

-- 10. ADVANCED DASHBOARD METRICS VIEW
CREATE OR REPLACE VIEW v_advanced_dashboard_metrics AS
SELECT
    (SELECT COUNT(*)::INT FROM people WHERE is_billionaire = true) AS tracked_billionaires_count,
    (SELECT COUNT(*)::INT FROM donations WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'))::INT AS documented_personal_donations_count,
    (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM donations WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')) AS documented_personal_giving_total,
    (SELECT COUNT(*)::INT FROM donations WHERE status = 'VERIFIED')::INT AS verified_donations_count,
    (SELECT COUNT(*)::INT FROM sources)::INT AS sources_count,
    (SELECT MAX(donation_date) FROM donations) AS latest_data_date,
    (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM donations WHERE funding_source_type = 'FOUNDATION') AS total_foundation_giving,
    (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM donations WHERE funding_source_type = 'CORPORATE') AS total_corporate_giving,
    (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM donations WHERE funding_source_type = 'DAF') AS total_daf_transfers,
    (SELECT COALESCE(SUM(amount), 0)::NUMERIC FROM donations WHERE funding_source_type = 'PLEDGE') AS total_pledges;
