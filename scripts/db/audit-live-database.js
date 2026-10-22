/**
 * Comprehensive Live Supabase Audit Script for NoCharity Final Dataset
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSupabaseCredentials() {
  const mcpConfigPath = path.resolve('C:/Users/iarno/.gemini/config/mcp_config.json');
  const cfg = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
  return {
    token: cfg?.mcpServers?.supabase?.SUPABASE_ACCESS_TOKEN,
    projectRef: 'jqgqdgviudpwarmwfxyf'
  };
}

async function querySql(query, token, projectRef) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function audit() {
  const { token, projectRef } = getSupabaseCredentials();

  console.log('============================================================');
  console.log('🔎 RUNNING THOROUGH LIVE DATABASE INTEGRITY & ATTRIBUTION AUDIT');
  console.log('============================================================\n');

  // 1. Duplicate people by canonical_name (case-insensitive)
  const dupPeople = await querySql(`
    SELECT LOWER(canonical_name) AS norm_name, COUNT(*) AS cnt, array_agg(canonical_name) AS names, array_agg(id) AS ids
    FROM people
    GROUP BY LOWER(canonical_name)
    HAVING COUNT(*) > 1;
  `, token, projectRef);
  console.log(`1. Duplicate people by canonical name: ${dupPeople.length}`);
  if (dupPeople.length > 0) console.log(JSON.stringify(dupPeople, null, 2));

  // 2. Duplicate organizations by display_name (case-insensitive)
  const dupOrgs = await querySql(`
    SELECT LOWER(display_name) AS norm_name, COUNT(*) AS cnt, array_agg(display_name) AS names
    FROM organizations
    GROUP BY LOWER(display_name)
    HAVING COUNT(*) > 1;
  `, token, projectRef);
  console.log(`2. Duplicate organizations by display name: ${dupOrgs.length}`);
  if (dupOrgs.length > 0) console.log(JSON.stringify(dupOrgs, null, 2));

  // 3. Duplicate donations (same donor, recipient, date, amount)
  const dupDonations = await querySql(`
    SELECT donor_person_id, recipient_organization_id, donation_date, amount, COUNT(*) as cnt
    FROM donations
    GROUP BY donor_person_id, recipient_organization_id, donation_date, amount
    HAVING COUNT(*) > 1;
  `, token, projectRef);
  console.log(`3. Duplicate donations: ${dupDonations.length}`);
  if (dupDonations.length > 0) console.log(JSON.stringify(dupDonations, null, 2));

  // 4. Duplicate wealth snapshots (person_id, snapshot_date)
  const dupSnapshots = await querySql(`
    SELECT person_id, snapshot_date, COUNT(*) as cnt
    FROM wealth_snapshots
    GROUP BY person_id, snapshot_date
    HAVING COUNT(*) > 1;
  `, token, projectRef);
  console.log(`4. Duplicate wealth snapshots (same person + date): ${dupSnapshots.length}`);
  if (dupSnapshots.length > 0) console.log(JSON.stringify(dupSnapshots, null, 2));

  // 5. Orphaned donations (donor_person_id not in people or recipient not in organizations)
  const orphanDonations = await querySql(`
    SELECT d.id, d.donor_person_id, d.recipient_organization_id
    FROM donations d
    LEFT JOIN people p ON d.donor_person_id = p.id
    LEFT JOIN organizations o ON d.recipient_organization_id = o.id
    WHERE (d.donor_person_id IS NOT NULL AND p.id IS NULL)
       OR (d.recipient_organization_id IS NOT NULL AND o.id IS NULL);
  `, token, projectRef);
  console.log(`5. Orphaned donations: ${orphanDonations.length}`);
  if (orphanDonations.length > 0) console.log(JSON.stringify(orphanDonations, null, 2));

  // 6. Donations without sources (neither source_id nor donation_sources)
  const unreferencedDonations = await querySql(`
    SELECT d.id, d.description, d.amount
    FROM donations d
    LEFT JOIN sources s ON s.id = d.source_id
    LEFT JOIN donation_sources ds ON ds.donation_id = d.id
    WHERE s.id IS NULL AND ds.source_id IS NULL;
  `, token, projectRef);
  console.log(`6. Donations without any source: ${unreferencedDonations.length}`);
  if (unreferencedDonations.length > 0) console.log(JSON.stringify(unreferencedDonations, null, 2));

  // 7. Wealth snapshots without sources
  const unreferencedSnapshots = await querySql(`
    SELECT ws.id, ws.person_id, ws.snapshot_date
    FROM wealth_snapshots ws
    LEFT JOIN sources s ON s.id = ws.source_id
    WHERE ws.source_id IS NULL AND (ws.source_name IS NULL OR TRIM(ws.source_name) = '');
  `, token, projectRef);
  console.log(`7. Wealth snapshots without sources: ${unreferencedSnapshots.length}`);
  if (unreferencedSnapshots.length > 0) console.log(JSON.stringify(unreferencedSnapshots, null, 2));

  // 8. Future wealth snapshots (snapshot_date > 2026-10-22)
  const futureSnapshots = await querySql(`
    SELECT id, person_id, snapshot_date
    FROM wealth_snapshots
    WHERE snapshot_date > '2026-10-22'::date;
  `, token, projectRef);
  console.log(`8. Future wealth snapshots (> 2026-10-22): ${futureSnapshots.length}`);
  if (futureSnapshots.length > 0) console.log(JSON.stringify(futureSnapshots, null, 2));

  // 9. Attribution Taxonomy Compliance
  const attributionCounts = await querySql(`
    SELECT funding_source_type, status, COUNT(*) as cnt
    FROM donations
    GROUP BY funding_source_type, status
    ORDER BY funding_source_type;
  `, token, projectRef);
  console.log('9. Attribution and Verification breakdown:');
  console.log(JSON.stringify(attributionCounts, null, 2));

  // 10. Historical parity calculation verification (v_donations_with_parity)
  const parityStats = await querySql(`
    SELECT 
      COUNT(*) AS total_rows,
      COUNT(historical_snapshot_date) AS with_snapshot,
      COUNT(*) - COUNT(historical_snapshot_date) AS without_snapshot,
      COUNT(historical_percentage) AS with_percentage,
      ROUND(AVG(historical_percentage), 4) AS avg_historical_percentage
    FROM v_donations_with_parity;
  `, token, projectRef);
  console.log('10. Historical Parity View (v_donations_with_parity) health:');
  console.log(JSON.stringify(parityStats[0], null, 2));

  // 11. Giving Summary View (v_person_giving_summary) top 5 check
  const topRanked = await querySql(`
    SELECT canonical_name, latest_net_worth, total_donations_count, total_personal_giving, lifetime_personal_giving_ratio, avg_historical_percentage
    FROM v_person_rankings
    ORDER BY total_personal_giving DESC
    LIMIT 5;
  `, token, projectRef);
  console.log('11. Top 5 Ranked by Personal Giving:');
  console.log(JSON.stringify(topRanked, null, 2));

  // 12. Test fixtures or example.com links
  const fixtures = await querySql(`
    SELECT 
      (SELECT COUNT(*) FROM sources WHERE url ILIKE '%example.com%' OR title ILIKE '%fixture%' OR title ILIKE '%test%') as fixture_sources,
      (SELECT COUNT(*) FROM donations WHERE description ILIKE '%fixture%' OR description ILIKE '%test%') as fixture_donations,
      (SELECT COUNT(*) FROM people WHERE canonical_name ILIKE '%fixture%' OR canonical_name ILIKE '%test%') as fixture_people;
  `, token, projectRef);
  console.log('12. Test fixtures in production:');
  console.log(JSON.stringify(fixtures[0], null, 2));

  console.log('\n✅ Audit completed successfully.');
}

audit().catch(console.error);
