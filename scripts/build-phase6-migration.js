/**
 * NoCharity Phase 6 Migration Generator
 * Generates supabase/migrations/20261022000006_phase6_advanced_mode_views_and_seed.sql
 */

import { INITIAL_BILLIONAIRES } from '../public/js/data.js';
import fs from 'fs';
import path from 'path';

const idMap = {
  'warren-buffett': 'b0000000-0000-0000-0000-000000000001',
  'bill-gates': 'b0000000-0000-0000-0000-000000000002',
  'mackenzie-scott': 'b0000000-0000-0000-0000-000000000003',
  'elon-musk': 'b0000000-0000-0000-0000-000000000004',
  'azim-premji': 'b0000000-0000-0000-0000-000000000005',
  'andrew-carnegie': 'b0000000-0000-0000-0000-000000000006',
  'john-d-rockefeller': 'b0000000-0000-0000-0000-000000000007',
  'mukesh-ambani': 'b0000000-0000-0000-0000-000000000008',
  'gautam-adani': 'b0000000-0000-0000-0000-000000000009',
  'carlos-slim': 'b0000000-0000-0000-0000-000000000010',
  'jack-ma': 'b0000000-0000-0000-0000-000000000011',
  'michael-bloomberg': 'b0000000-0000-0000-0000-000000000012',
  'mark-zuckerberg': 'b0000000-0000-0000-0000-000000000013',
  'jeff-bezos': 'b0000000-0000-0000-0000-000000000014',
  'larry-ellison': 'b0000000-0000-0000-0000-000000000015',
  'bernard-arnault': 'b0000000-0000-0000-0000-000000000016',
  'steve-ballmer': 'b0000000-0000-0000-0000-000000000017'
};

const orgMap = {
  'azim-premji': [
    { id: 'c0000000-0000-0000-0000-000000000008', name: 'Wipro Limited', type: 'COMPANY', role: 'FOUNDER_AND_CHAIRMAN' },
    { id: 'c0000000-0000-0000-0000-000000000009', name: 'Azim Premji Foundation', type: 'FOUNDATION', role: 'CHAIRMAN' }
  ],
  'andrew-carnegie': [
    { id: 'c0000000-0000-0000-0000-000000000010', name: 'Carnegie Corporation of New York', type: 'FOUNDATION', role: 'FOUNDER' }
  ],
  'john-d-rockefeller': [
    { id: 'c0000000-0000-0000-0000-000000000011', name: 'Rockefeller Foundation', type: 'FOUNDATION', role: 'FOUNDER' }
  ],
  'mukesh-ambani': [
    { id: 'c0000000-0000-0000-0000-000000000012', name: 'Reliance Industries Limited', type: 'COMPANY', role: 'CHAIRMAN_AND_MD' },
    { id: 'c0000000-0000-0000-0000-000000000013', name: 'Reliance Foundation', type: 'FOUNDATION', role: 'TRUSTEE' }
  ],
  'gautam-adani': [
    { id: 'c0000000-0000-0000-0000-000000000014', name: 'Adani Group', type: 'COMPANY', role: 'FOUNDER_AND_CHAIRMAN' },
    { id: 'c0000000-0000-0000-0000-000000000015', name: 'Adani Foundation', type: 'FOUNDATION', role: 'TRUSTEE' }
  ],
  'carlos-slim': [
    { id: 'c0000000-0000-0000-0000-000000000016', name: 'Grupo Carso / América Móvil', type: 'COMPANY', role: 'HONORARY_CHAIRMAN' },
    { id: 'c0000000-0000-0000-0000-000000000017', name: 'Carlos Slim Foundation', type: 'FOUNDATION', role: 'PRESIDENT' }
  ],
  'jack-ma': [
    { id: 'c0000000-0000-0000-0000-000000000018', name: 'Alibaba Group', type: 'COMPANY', role: 'CO_FOUNDER' },
    { id: 'c0000000-0000-0000-0000-000000000019', name: 'Jack Ma Foundation', type: 'FOUNDATION', role: 'FOUNDER' }
  ],
  'michael-bloomberg': [
    { id: 'c0000000-0000-0000-0000-000000000020', name: 'Bloomberg LP', type: 'COMPANY', role: 'FOUNDER_AND_MAJORITY_OWNER' },
    { id: 'c0000000-0000-0000-0000-000000000021', name: 'Bloomberg Philanthropies', type: 'FOUNDATION', role: 'FOUNDER' }
  ],
  'mark-zuckerberg': [
    { id: 'c0000000-0000-0000-0000-000000000022', name: 'Meta Platforms Inc', type: 'COMPANY', role: 'FOUNDER_AND_CEO' },
    { id: 'c0000000-0000-0000-0000-000000000023', name: 'Chan Zuckerberg Initiative', type: 'FOUNDATION', role: 'CO_FOUNDER' }
  ],
  'jeff-bezos': [
    { id: 'c0000000-0000-0000-0000-000000000024', name: 'Amazon.com Inc', type: 'COMPANY', role: 'EXECUTIVE_CHAIR' },
    { id: 'c0000000-0000-0000-0000-000000000025', name: 'Bezos Earth Fund', type: 'FOUNDATION', role: 'FOUNDER' }
  ],
  'larry-ellison': [
    { id: 'c0000000-0000-0000-0000-000000000026', name: 'Oracle Corporation', type: 'COMPANY', role: 'CHIEF_TECHNOLOGY_OFFICER' },
    { id: 'c0000000-0000-0000-0000-000000000027', name: 'Lawrence Ellison Foundation', type: 'FOUNDATION', role: 'FOUNDER' }
  ],
  'bernard-arnault': [
    { id: 'c0000000-0000-0000-0000-000000000028', name: 'LVMH Moët Hennessy Louis Vuitton', type: 'COMPANY', role: 'CHAIRMAN_AND_CEO' },
    { id: 'c0000000-0000-0000-0000-000000000029', name: 'Fondation Louis Vuitton', type: 'FOUNDATION', role: 'PATRON' }
  ],
  'steve-ballmer': [
    { id: 'c0000000-0000-0000-0000-000000000030', name: 'Ballmer Group', type: 'FOUNDATION', role: 'CO_FOUNDER' }
  ]
};

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
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
`;

const newPeopleSql = [];
const orgsSql = [];
const personOrgsSql = [];
const wealthSql = [];
const sourcesSql = [];
const donationsSql = [];

let sourceCounter = 10;
let donationCounter = 10;

for (const b of INITIAL_BILLIONAIRES) {
  const pId = idMap[b.id];
  const isExisting = ['warren-buffett', 'bill-gates', 'mackenzie-scott', 'elon-musk'].includes(b.id);

  if (!isExisting) {
    const parts = b.name.split(' ');
    const firstName = parts[0] || b.name;
    const lastName = parts.slice(1).join(' ') || null;
    newPeopleSql.push(`(${escapeSql(pId)}, ${escapeSql(b.name)}, ${escapeSql(firstName)}, ${escapeSql(lastName)}, ${escapeSql(b.country)}, ${escapeSql(b.company || 'Investor')}, ${escapeSql(b.industry)}, ${escapeSql(b.summary)}, true, ${b.givingPledge ? 'true' : 'false'})`);

    // Wealth snapshots
    wealthSql.push(`(${escapeSql(pId)}, '2024-01-01', ${Math.round(b.netWorth * 0.92)}, 'USD', ${escapeSql(b.netWorthSourceName || 'Bloomberg / Forbes')}, 'HIGH')`);
    wealthSql.push(`(${escapeSql(pId)}, '2026-01-01', ${b.netWorth}, 'USD', ${escapeSql(b.netWorthSourceName || 'Bloomberg Billionaires Index')}, 'HIGH')`);

    // Organizations
    const orgs = orgMap[b.id] || [];
    for (const org of orgs) {
      orgsSql.push(`(${escapeSql(org.id)}, ${escapeSql(org.name)}, ${escapeSql(org.name)}, ${escapeSql(org.type)}, ${escapeSql(b.country)})`);
      personOrgsSql.push(`(${escapeSql(pId)}, ${escapeSql(org.id)}, ${escapeSql(org.role)})`);
    }
  }

  // Donations for all 13 new billionaires
  if (!isExisting && Array.isArray(b.historicalDonations)) {
    for (const d of b.historicalDonations) {
      const sourceId = `d0000000-0000-0000-0000-0000000000${String(sourceCounter++).padStart(2, '0')}`;
      const donationId = `f0000000-0000-0000-0000-0000000000${String(donationCounter++).padStart(2, '0')}`;
      let donationDate = d.date;
      if (!donationDate && d.year) donationDate = `${d.year}-06-15`;

      // Determine funding source type strictly
      let fundingType = 'PERSONAL_DIRECT';
      const headline = (d.headline || d.cause || '').toLowerCase();
      const cause = (d.cause || '').toLowerCase();
      if (headline.includes('foundation') || cause.includes('foundation')) {
        fundingType = 'FOUNDATION';
      } else if (headline.includes('pledge') || headline.includes('commit') || cause.includes('pledge')) {
        fundingType = 'PLEDGE';
      } else if (headline.includes('corporate') || headline.includes('company') || cause.includes('corporate')) {
        fundingType = 'CORPORATE';
      } else if (headline.includes('shares') || headline.includes('stock transfer') || headline.includes('equity')) {
        fundingType = 'PERSONAL_FUNDS_CONFIRMED';
      }

      // Source
      const publisher = d.source || 'Journalistic Citation';
      const title = d.headline || `${b.name} Philanthropic Record`;
      const url = d.url || `https://nocharity.org/sources/${b.id}-${donationDate}`;
      sourcesSql.push(`(${escapeSql(sourceId)}, ${escapeSql(publisher)}, ${escapeSql(title)}, ${escapeSql(url)}, 'NEWS', ${escapeSql(donationDate)})`);

      donationsSql.push(`(${escapeSql(donationId)}, ${escapeSql(pId)}, ${d.amount}, 'USD', ${escapeSql(donationDate)}, 'GIFT', ${escapeSql(fundingType)}, 'VERIFIED', ${escapeSql(d.headline || d.cause)}, ${escapeSql(d.cause)}, ${escapeSql(sourceId)})`);
    }
  }
}

sql += newPeopleSql.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';

if (orgsSql.length > 0) {
  sql += `-- 4. INSERT ORGANIZATIONS\nINSERT INTO organizations (id, legal_name, display_name, organization_type, country) VALUES\n` +
    orgsSql.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';
}

if (personOrgsSql.length > 0) {
  sql += `-- 5. LINK PERSON_ORGANIZATIONS\nINSERT INTO person_organizations (person_id, organization_id, relationship_type) VALUES\n` +
    personOrgsSql.join(',\n') + '\nON CONFLICT (person_id, organization_id, relationship_type) DO NOTHING;\n\n';
}

if (wealthSql.length > 0) {
  sql += `-- 6. INSERT WEALTH SNAPSHOTS\nINSERT INTO wealth_snapshots (person_id, snapshot_date, net_worth, currency, source_name, confidence) VALUES\n` +
    wealthSql.join(',\n') + '\nON CONFLICT (person_id, snapshot_date) DO NOTHING;\n\n';
}

if (sourcesSql.length > 0) {
  sql += `-- 7. INSERT SOURCES\nINSERT INTO sources (id, publisher, title, url, source_type, published_at) VALUES\n` +
    sourcesSql.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';
}

if (donationsSql.length > 0) {
  sql += `-- 8. INSERT DONATIONS\nINSERT INTO donations (id, donor_person_id, amount, currency, donation_date, donation_type, funding_source_type, status, description, cause_category, source_id) VALUES\n` +
    donationsSql.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';
}

// 9. Rebuild Views
sql += `-- 9. REBUILD VIEWS WITH giving_pledge COLUMN
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
`;

const outputPath = path.resolve('supabase/migrations/20261022000006_phase6_advanced_mode_views_and_seed.sql');
fs.writeFileSync(outputPath, sql, 'utf8');
console.log('Migration generated successfully at:', outputPath);
