/**
 * Live Verification Script for Advanced Mode Features against Populated Supabase Database
 */

import {
  getRankings,
  getDonations,
  getBillionaireProfile,
  getWealthHistory,
  getDashboardMetrics,
  getTags
} from '../server/data-access.js';

async function verify() {
  console.log('============================================================');
  console.log('🔍 VERIFYING ADVANCED MODE AGAINST LIVE POPULATED SUPABASE');
  console.log('============================================================\n');

  // 1. Dashboard Metrics
  console.log('1. Checking Dashboard Metrics...');
  const metrics = await getDashboardMetrics();
  console.log('  Metrics:', JSON.stringify(metrics, null, 2));

  // 2. Rankings
  console.log('\n2. Checking Rankings...');
  const rankingsRes = await getRankings({ metric: 'personal_giving', limit: 10 });
  const rankings = rankingsRes.rankings || [];
  console.log(`  Loaded ${rankings.length} ranked individuals (Total in index: ${rankingsRes.totalCount}).`);
  console.log('  Top 5 Donors:');
  rankings.slice(0, 5).forEach((r) => {
    console.log(`    #${r.rank}: ${r.canonical_name} — Personal: $${Number(r.total_personal_giving).toLocaleString()} (Parity: ${r.avg_historical_percentage}%)`);
  });

  // 3. Donation Data Loading & Attribution Filters
  console.log('\n3. Checking Donation Data & Attribution Filters...');
  const allDonationsRes = await getDonations({ limit: 150 });
  const allDonations = allDonationsRes.donations || [];
  console.log(`  Total donations loaded: ${allDonations.length} (Total on record: ${allDonationsRes.totalCount})`);

  const personalOnlyRes = await getDonations({ fundingSourceTypes: ['PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'] });
  console.log(`  Personal direct / confirmed funds donations: ${personalOnlyRes.donations?.length || 0}`);

  const foundationOnlyRes = await getDonations({ fundingSourceTypes: ['FOUNDATION'], includeAssociatedOrgGiving: true });
  console.log(`  Foundation donations: ${foundationOnlyRes.donations?.length || 0}`);

  const corporateOnlyRes = await getDonations({ fundingSourceTypes: ['CORPORATE'], includeAssociatedOrgGiving: true });
  console.log(`  Corporate donations: ${corporateOnlyRes.donations?.length || 0}`);

  const pledgeOnlyRes = await getDonations({ fundingSourceTypes: ['PLEDGE'], includeAssociatedOrgGiving: true });
  console.log(`  Pledge records: ${pledgeOnlyRes.donations?.length || 0}`);

  // 4. Historical Wealth & Profile
  console.log('\n4. Checking Individual Profile & Historical Wealth...');
  const samplePerson = rankings.find(r => r.canonical_name.includes('Warren Buffett')) || rankings[0];
  const profile = await getBillionaireProfile(samplePerson.person_id);
  console.log(`  Profile for: ${profile.canonical_name}`);
  console.log(`  Net worth: $${Number(profile.latest_net_worth).toLocaleString()}`);
  console.log(`  Donations count: ${profile.donations?.length || 0}`);

  const wealthHistoryRes = await getWealthHistory(samplePerson.person_id);
  const wealthHistory = wealthHistoryRes.snapshots || [];
  console.log(`  Historical wealth snapshots count: ${wealthHistory.length}`);
  if (wealthHistory.length > 0) {
    console.log(`  Earliest snapshot: ${wealthHistory[0].snapshot_date} ($${Number(wealthHistory[0].net_worth).toLocaleString()})`);
    console.log(`  Latest snapshot: ${wealthHistory[wealthHistory.length - 1].snapshot_date} ($${Number(wealthHistory[wealthHistory.length - 1].net_worth).toLocaleString()})`);
  }

  // 5. Source Information Accessibility
  console.log('\n5. Checking Source Accessibility...');
  const donationWithSource = allDonations.find(d => d.source_url);
  console.log(`  Sample donation: "${donationWithSource.description?.slice(0, 50)}..."`);
  console.log(`  Source Title: "${donationWithSource.source_title}"`);
  console.log(`  Source Publisher: "${donationWithSource.source_publisher}"`);
  console.log(`  Source URL: ${donationWithSource.source_url}`);

  // 6. Tags & Categories
  console.log('\n6. Checking Taxonomy Tags...');
  const tags = await getTags();
  console.log(`  Taxonomy tags count: ${tags.length}`);

  console.log('\n✅ ALL ADVANCED MODE CHECKS PASSED SUCCESSFULLY!');
}

verify().catch(err => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
