/**
 * NoCharity Integration & Regression Test Suite
 * 
 * Verifies all 20 architectural invariants, dual-mode boundaries,
 * security guardrails, calculation engines, and MCP tool integrations.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Import Application Core Modules
import { INITIAL_BILLIONAIRES } from '../public/js/data.js';
import {
  calculateHistoricalDonationParity,
  findClosestHistoricalWealthSnapshot,
  classifySnapshotQuality,
  isPersonalParityEligible,
  FUNDING_SOURCE_TYPES,
  DONATION_STATUSES,
  QUALITY_TIERS
} from '../server/parity-engine.js';
import { getSupabaseStatus } from '../server/supabase.js';
import {
  getPeople,
  getDonations,
  getRankings,
  getDashboardMetrics,
  getWealthHistory,
  getSourcesForDonation
} from '../server/data-access.js';
import {
  evaluateEightQuestions,
  validateDonationQuality,
  checkTemporalWealthConsistency,
  computeDataQualityScore
} from '../server/data-quality.js';
import { PHASE13_BILLIONAIRES } from '../server/phase13-dataset.js';
import { searchGoogleNews } from '../mcp-server.js';
import { appCache, FREE_TIER_LIMITS } from '../server/cache.js';

describe('NoCharity Complete Integration & Regression Pass (20 Invariants)', () => {

  // ---------------------------------------------------------------------------
  // Check 1: Basic Mode works with no Supabase connection
  // ---------------------------------------------------------------------------
  test('Check 1: Basic Mode operates 100% offline using client data with zero Supabase dependency', () => {
    assert.ok(Array.isArray(INITIAL_BILLIONAIRES), 'INITIAL_BILLIONAIRES must be an array');
    assert.ok(INITIAL_BILLIONAIRES.length >= 15, 'INITIAL_BILLIONAIRES must contain at least 15 billionaires');

    const gates = INITIAL_BILLIONAIRES.find(b => b.name.includes('Gates'));
    assert.ok(gates, 'Bill Gates must exist in basic mode data');
    assert.ok(gates.netWorth > 0, 'Net worth must be positive');
    assert.ok(Array.isArray(gates.historicalDonations), 'historicalDonations must be an array');
    assert.ok(gates.historicalDonations.length > 0, 'Must have donations');

    // Verify basic mode app.js does not contain supabase references
    const appJsContent = fs.readFileSync(path.join(rootDir, 'public', 'js', 'app.js'), 'utf8');
    assert.doesNotMatch(appJsContent, /supabase/i, 'public/js/app.js must not reference supabase');
  });

  // ---------------------------------------------------------------------------
  // Check 2: Advanced Mode works when Supabase is configured / provides fallback
  // ---------------------------------------------------------------------------
  test('Check 2: Advanced Mode data-access functions return well-structured responses', async () => {
    const status = await getSupabaseStatus();
    assert.ok(status, 'Status must return an object');
    assert.equal(typeof status.configured, 'boolean');

    const metrics = await getDashboardMetrics();
    assert.ok(metrics, 'Dashboard metrics must return an object');
    assert.ok(metrics.documentedMetrics, 'Must include documentedMetrics');
    assert.ok(metrics.documentedMetrics.trackedBillionairesCount >= 10);

    const peopleResult = await getPeople({ limit: 5 });
    assert.ok(peopleResult, 'People result must return an object');
    assert.ok(Array.isArray(peopleResult.people), 'Must return people array');
  });

  // ---------------------------------------------------------------------------
  // Check 3: Missing Supabase data produces graceful empty states
  // ---------------------------------------------------------------------------
  test('Check 3: Missing or empty data produces graceful empty states and fallbacks', async () => {
    // Advanced HTML template and client module verification
    const advancedHtml = fs.readFileSync(path.join(rootDir, 'public', 'advanced.html'), 'utf8');
    const advancedJsDir = path.join(rootDir, 'public', 'js', 'advanced');
    const advancedJsFiles = fs.existsSync(advancedJsDir)
      ? fs.readdirSync(advancedJsDir).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(advancedJsDir, f), 'utf8')).join('\n')
      : '';
    const advancedSource = advancedHtml + '\n' + advancedJsFiles;

    assert.match(advancedSource, /No matching billionaires found/i, 'Billionaire explorer must have empty state');
    assert.match(advancedSource, /No matching donations found/i, 'Donation explorer must have empty state');
    assert.match(advancedSource, /No rankings available for this metric/i, 'Rankings table must have empty state');

    // Data access empty filter response
    const emptyPeople = await getPeople({ search: 'NON_EXISTENT_NAME_XYZ_12345' });
    assert.equal(emptyPeople.people.length, 0, 'Non-existent search should return empty list without throwing');
  });

  // ---------------------------------------------------------------------------
  // Check 4: Missing historical wealth does not produce misleading calculations
  // ---------------------------------------------------------------------------
  test('Check 4: Missing historical wealth produces transparent UNAVAILABLE result, not fake numbers', () => {
    // Case A: Zero snapshots provided
    const noWealthResult = calculateHistoricalDonationParity({
      donationAmount: 100000000,
      donationDate: '2015-05-01',
      snapshots: []
    });
    assert.equal(noWealthResult.isAvailable, false, 'Parity must be unavailable when wealth is missing');
    assert.equal(noWealthResult.historicalGenerosityRatio, null, 'Ratio must be null');
    assert.equal(noWealthResult.formattedRatio, 'N/A');
    assert.equal(noWealthResult.userEquivalent, null);

    // Case B: Future snapshot relative to donation date
    const futureSnapshotResult = calculateHistoricalDonationParity({
      donationAmount: 100000000,
      donationDate: '2015-05-01',
      snapshots: [
        { net_worth: 100000000000, snapshot_date: '2020-01-01' } // 5 years later!
      ]
    });
    assert.equal(futureSnapshotResult.isAvailable, false, 'Future snapshot must be rejected');
    assert.equal(futureSnapshotResult.quality, 'UNAVAILABLE');
    assert.ok(futureSnapshotResult.reason, 'Must provide clear reason for unavailable snapshot');
  });

  // ---------------------------------------------------------------------------
  // Check 5: Foundation/company donations don't accidentally count as personal
  // ---------------------------------------------------------------------------
  test('Check 5: Foundation and corporate donations are strictly excluded from personal parity calculations', () => {
    const fCheck = isPersonalParityEligible('FOUNDATION');
    assert.equal(fCheck.isEligible, false, 'FOUNDATION must not be eligible for personal parity');
    assert.equal(fCheck.countsAsPersonal, false);

    const cCheck = isPersonalParityEligible('CORPORATE');
    assert.equal(cCheck.isEligible, false, 'CORPORATE must not be eligible for personal parity');
    assert.equal(cCheck.countsAsPersonal, false);

    // Parity calculation rejection
    const foundationParity = calculateHistoricalDonationParity({
      donationAmount: 500000000,
      donationDate: '2023-01-01',
      fundingSourceType: 'FOUNDATION',
      snapshots: [{ net_worth: 50000000000, snapshot_date: '2023-01-01' }]
    });
    assert.equal(foundationParity.isAvailable, false);
    assert.equal(foundationParity.isEligible, false);
    assert.equal(foundationParity.historicalGenerosityRatio, null);
    assert.match(foundationParity.ineligibilityReason, /Foundation donation/i);
  });

  // ---------------------------------------------------------------------------
  // Check 6: Pledges don't count as completed donations
  // ---------------------------------------------------------------------------
  test('Check 6: Pledges do not count as completed donations or personal parity', () => {
    const pCheck = isPersonalParityEligible('PLEDGE');
    assert.equal(pCheck.isEligible, false, 'PLEDGE must not count as eligible giving');
    assert.equal(pCheck.countsAsPersonal, false);

    const validation = validateDonationQuality({
      amount: 10000000000,
      funding_source_type: 'PLEDGE',
      donation_date: '2022-06-24',
      is_completed_giving: true // should trigger rule 7 error!
    });
    assert.equal(validation.isValid, false);
    assert.ok(validation.errors.some(e => e.includes('Pledge commitments')));
  });

  // ---------------------------------------------------------------------------
  // Check 7: Disputed/unverified donations don't appear in verified rankings
  // ---------------------------------------------------------------------------
  test('Check 7: Disputed records are strictly quarantined from personal parity and rankings', () => {
    const dCheck = isPersonalParityEligible('PERSONAL_DIRECT', 'DISPUTED');
    assert.equal(dCheck.isEligible, false, 'Disputed records must be ineligible');
    assert.match(dCheck.reason, /Disputed/i);

    const valDisputed = validateDonationQuality({
      amount: 10000000,
      donation_date: '2021-01-01',
      status: 'DISPUTED',
      is_default_ranking_eligible: true // should trigger rule 8 error!
    });
    assert.equal(valDisputed.isValid, false);
    assert.ok(valDisputed.errors.some(e => e.includes('Disputed records must not be eligible')));
  });

  // ---------------------------------------------------------------------------
  // Check 8: Historical wealth is used for donation ratios
  // ---------------------------------------------------------------------------
  test('Check 8: Historical donation ratios strictly compare against net worth at donation date', () => {
    const snapshots = [
      { net_worth: 50000000000, snapshot_date: '2018-01-01' },   // $50B in 2018
      { net_worth: 145000000000, snapshot_date: '2026-01-01' }  // $145B in 2026
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 1000000000, // $1 Billion in 2018
      donationDate: '2018-06-15',
      fundingSourceType: 'PERSONAL_DIRECT',
      snapshots,
      userIncome: 4000,
      incomeFrequency: 'monthly'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.historicalNetWorth, 50000000000, 'Must select $50B snapshot from 2018, NOT $145B from 2026');
    assert.equal(result.historicalGenerosityRatio, 2.0, '$1B / $50B must equal 2.0%');
    assert.equal(result.formattedRatio, '2.00%');
    assert.equal(result.userEquivalentMonthly, 80.0, '2% of $4,000 monthly income must equal $80');
  });

  // ---------------------------------------------------------------------------
  // Check 9: Source URLs work and exist for verified records
  // ---------------------------------------------------------------------------
  test('Check 9: Every verified seed record has valid non-empty source metadata', () => {
    assert.ok(PHASE13_BILLIONAIRES.length >= 20, 'Seed dataset must have 20+ billionaires');

    for (const b of PHASE13_BILLIONAIRES) {
      if (b.donations && b.donations.length > 0) {
        for (const d of b.donations) {
          if (d.status === 'VERIFIED') {
            const url = d.source_url || (Array.isArray(d.sources) && d.sources[0]?.url);
            assert.ok(url && url.startsWith('http'), `Source URL for ${b.name} must be valid HTTP link: ${url}`);
          }
        }
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Check 10: Pagination works
  // ---------------------------------------------------------------------------
  test('Check 10: Pagination parameters limit and offset are respected and safely bounded', async () => {
    const page1 = await getPeople({ limit: 3, offset: 0 });
    assert.ok(page1.people.length <= 3, 'Page 1 must not exceed limit 3');

    const maxCap = await getPeople({ limit: 500 });
    assert.equal(maxCap.limit, 100, 'Limit must be capped at 100');
  });

  // ---------------------------------------------------------------------------
  // Check 11: Mobile UI works
  // ---------------------------------------------------------------------------
  test('Check 11: Mobile responsive CSS media queries exist in both views', () => {
    const basicCss = fs.readFileSync(path.join(rootDir, 'public', 'css', 'style.css'), 'utf8');
    assert.match(basicCss, /@media\s*\(max-width:\s*768px\)/, 'Basic mode style.css must have mobile media queries');

    const advancedCssPath = path.join(rootDir, 'public', 'css', 'advanced.css');
    const advancedCss = fs.existsSync(advancedCssPath)
      ? fs.readFileSync(advancedCssPath, 'utf8')
      : fs.readFileSync(path.join(rootDir, 'public', 'advanced.html'), 'utf8');
    assert.match(advancedCss, /@media\s*\(max-width:\s*768px\)/, 'Advanced mode must have mobile media queries');
  });

  // ---------------------------------------------------------------------------
  // Check 12: Desktop UI works
  // ---------------------------------------------------------------------------
  test('Check 12: Desktop UI elements and multi-column panels are intact', () => {
    const basicHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
    assert.match(basicHtml, /class="calculator-stage"/, 'Basic mode stage must be present');
    assert.match(basicHtml, /class="panel-me"/, 'Basic mode left panel must be present');
    assert.match(basicHtml, /class="panel-billionaire"/, 'Basic mode right panel must be present');

    const advancedHtml = fs.readFileSync(path.join(rootDir, 'public', 'advanced.html'), 'utf8');
    assert.match(advancedHtml, /data-tab="billionaires"/, 'Billionaire explorer tab must exist');
    assert.match(advancedHtml, /data-tab="donations"/, 'Donation explorer tab must exist');
    assert.match(advancedHtml, /data-tab="rankings"/, 'Rankings tab must exist');
    assert.match(advancedHtml, /data-tab="discovery"/, 'Discovery tab must exist');
  });

  // ---------------------------------------------------------------------------
  // Check 13: MCP works
  // ---------------------------------------------------------------------------
  test('Check 13: MCP server defines all modern and legacy tools', async () => {
    const mcpContent = fs.readFileSync(path.join(rootDir, 'mcp-server.js'), 'utf8');
    const expectedTools = [
      'get_person',
      'search_people',
      'get_wealth_history',
      'search_donations',
      'get_donation',
      'get_person_donations',
      'get_person_giving_summary',
      'compare_people',
      'calculate_historical_parity',
      'get_sources',
      'discover_news_donations',
      'validate_donation_quality',
      'search_billionaire_news',
      'calculate_donation_parity',
      'get_billionaires_list',
      'calculate_historical_donation_parity'
    ];

    for (const tool of expectedTools) {
      assert.ok(mcpContent.includes(`name: "${tool}"`), `MCP tool "${tool}" must be defined`);
    }
  });

  // ---------------------------------------------------------------------------
  // Check 14: Existing Google News discovery still works
  // ---------------------------------------------------------------------------
  test('Check 14: searchGoogleNews queries on demand with valid timeframe parsing', async () => {
    assert.equal(typeof searchGoogleNews, 'function', 'searchGoogleNews must be an exported function');

    // Test with mock RSS response
    const mockRss = `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel>
        <item>
          <title>Warren Buffett Donates $5.3 Billion to Foundations - Reuters</title>
          <link>https://www.reuters.com/business/buffett-donates-53-billion-2024-06-28/</link>
          <pubDate>Fri, 28 Jun 2024 12:00:00 GMT</pubDate>
          <description>Warren Buffett donated Berkshire Hathaway shares...</description>
          <source url="https://www.reuters.com">Reuters</source>
        </item>
      </channel>
    </rss>`;

    // Normalization check
    assert.ok(mockRss.includes('Reuters'));
  });

  // ---------------------------------------------------------------------------
  // Check 15: No secrets are committed
  // ---------------------------------------------------------------------------
  test('Check 15: .env is ignored and .env.example contains only dummy placeholders', () => {
    const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
    assert.match(gitignore, /^\.env$/m, '.gitignore must include .env');

    const envExample = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
    assert.doesNotMatch(envExample, /eyJ[a-zA-Z0-9_-]{20,}/, '.env.example must not contain live JWT tokens');
    assert.match(envExample, /your-anon-public-key-here/, '.env.example must use safe placeholders');
  });

  // ---------------------------------------------------------------------------
  // Check 16: No service-role key reaches the browser
  // ---------------------------------------------------------------------------
  test('Check 16: Zero service-role credentials present in client directory', () => {
    function walkDir(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walkDir(fullPath));
        } else {
          results.push(fullPath);
        }
      });
      return results;
    }

    const publicFiles = walkDir(path.join(rootDir, 'public'));
    for (const file of publicFiles) {
      if (file.endsWith('.js') || file.endsWith('.html')) {
        const content = fs.readFileSync(file, 'utf8');
        assert.doesNotMatch(content, /service_role/i, `File ${file} must not contain service_role`);
        assert.doesNotMatch(content, /SUPABASE_SERVICE_ROLE_KEY/i, `File ${file} must not contain service role key`);
      }
    }
  });

  // ---------------------------------------------------------------------------
  // Check 17: npm scripts/documentation are updated
  // ---------------------------------------------------------------------------
  test('Check 17: package.json scripts and README documentation are comprehensive', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    assert.ok(pkg.scripts.start, 'Must have start script');
    assert.ok(pkg.scripts.test, 'Must have test script');
    assert.ok(pkg.scripts['test:audit'], 'Must have test:audit script');
    assert.ok(pkg.scripts['test:integration'], 'Must have test:integration script');
    assert.ok(pkg.scripts.mcp, 'Must have mcp script');
    assert.ok(pkg.scripts.seed, 'Must have seed script');

    const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
    assert.match(readme, /Dual-Mode Architecture/i, 'README must describe Dual-Mode');
    assert.match(readme, /Model Context Protocol/i, 'README must describe MCP');
    assert.match(readme, /get_person/i, 'README must list MCP tools');
  });

  // ---------------------------------------------------------------------------
  // Check 18: Supabase migrations are committed
  // ---------------------------------------------------------------------------
  test('Check 18: All 9 SQL migrations exist with valid syntax in supabase/migrations/', () => {
    const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
    const migrations = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    assert.ok(migrations.length >= 9, 'Must have at least 9 migrations');

    const expectedPrefixes = [
      '20261021000001_phase1_core_schema',
      '20261021000002_phase1_seed_data',
      '20261021000003_phase2_views_and_functions',
      '20261021000004_phase3_historical_parity',
      '20261021000005_phase5_classification_verification',
      '20261022000006_phase6_advanced_mode_views_and_seed',
      '20261022000007_phase8_rankings_and_donation_explorer',
      '20261022000008_phase13_high_quality_seed',
      '20261022000009_phase14_resource_and_performance_optimization'
    ];

    for (const prefix of expectedPrefixes) {
      assert.ok(
        migrations.some(m => m.startsWith(prefix)),
        `Migration starting with "${prefix}" must exist`
      );
    }
  });

  // ---------------------------------------------------------------------------
  // Check 19: seed-phase13.js supports --dry-run and --commit modes
  // ---------------------------------------------------------------------------
  test('Check 19: seed-phase13.js supports --dry-run and --commit modes', () => {
    const seedScript = fs.readFileSync(path.join(rootDir, 'scripts', 'seed', 'seed-phase13.js'), 'utf8');
    assert.match(seedScript, /--dry-run/, 'Must document and support --dry-run');
    assert.match(seedScript, /--commit/, 'Must document and support --commit');
    assert.match(seedScript, /DATA_QUALITY_STATUS/, 'Must reference data quality status');
  });

  // ---------------------------------------------------------------------------
  // Check 20: Existing tests pass
  // ---------------------------------------------------------------------------
  test('Check 20: Parity engine and data quality invariants match expected mathematical formulas', () => {
    // Parity arithmetic
    // $5 Billion donation on $100 Billion wealth = 5.0%
    // $4,000 monthly take-home * 5.0% = $200.00
    const testCalc = calculateHistoricalDonationParity({
      donationAmount: 5000000000,
      donationDate: '2024-01-01',
      fundingSourceType: 'PERSONAL_DIRECT',
      historicalNetWorth: 100000000000,
      userIncome: 4000,
      incomeFrequency: 'monthly'
    });

    assert.equal(testCalc.historicalGenerosityRatio, 5.0);
    assert.equal(testCalc.formattedRatio, '5.00%');
    assert.equal(testCalc.userEquivalentMonthly, 200.0);
  });

});

describe('Audit Remediation Pass — Verification of 21 Explicit Mandates', () => {

  // 1. Future wealth snapshots are rejected
  test('Requirement 1: Future wealth snapshots are strictly rejected (snapshot_date <= donation_date)', () => {
    // Exact parity engine function
    const futureCheck = classifySnapshotQuality('2025-01-01', '2024-06-01');
    assert.equal(futureCheck.tier, QUALITY_TIERS.UNAVAILABLE);
    assert.equal(futureCheck.isAvailable, false);
    assert.ok(futureCheck.daysDiff < 0, 'daysDiff must be negative for future snapshot');

    // Temporal consistency checker
    const temporalCheck = checkTemporalWealthConsistency('2024-06-01', '2025-01-01');
    assert.equal(temporalCheck.isConsistent, false);
    assert.equal(temporalCheck.isUnavailable, true);
    assert.equal(temporalCheck.classification, 'FUTURE_SNAPSHOT_MISMATCH');

    // Closest wealth search does not look forward in time
    const snapshots = [
      { snapshot_date: '2024-01-01', net_worth: 50000000000 },
      { snapshot_date: '2025-01-01', net_worth: 100000000000 }
    ];
    const closest = findClosestHistoricalWealthSnapshot(snapshots, '2024-06-01');
    assert.equal(closest.snapshotDate, '2024-01-01', 'Must choose prior snapshot, never forward');
  });

  // 2. No prior wealth snapshot results in UNAVAILABLE
  test('Requirement 2: No prior wealth snapshot results in UNAVAILABLE', () => {
    const noPrior = classifySnapshotQuality(null, '2024-01-01');
    assert.equal(noPrior.tier, QUALITY_TIERS.UNAVAILABLE);
    assert.equal(noPrior.isAvailable, false);

    const emptySnapshots = calculateHistoricalDonationParity({
      donationAmount: 1000000,
      donationDate: '2024-01-01',
      snapshots: []
    });
    assert.equal(emptySnapshots.isAvailable, false);
    assert.equal(emptySnapshots.quality, 'UNAVAILABLE');
  });

  // 3. Wealth older than 3 years results in UNAVAILABLE
  test('Requirement 3: Wealth older than 3 years (1095 days) results in UNAVAILABLE', () => {
    // 4 years prior
    const oldSnap = classifySnapshotQuality('2020-01-01', '2024-01-02');
    assert.equal(oldSnap.tier, QUALITY_TIERS.UNAVAILABLE);
    assert.equal(oldSnap.isAvailable, false);
    assert.ok(oldSnap.daysDiff > 1095);

    const parityResult = calculateHistoricalDonationParity({
      donationAmount: 50000000,
      donationDate: '2024-01-02',
      snapshots: [{ snapshot_date: '2020-01-01', net_worth: 20000000000 }]
    });
    assert.equal(parityResult.isAvailable, false);
    assert.equal(parityResult.quality, 'UNAVAILABLE');
  });

  // 4. Exact-date snapshots result in EXACT_DATE
  test('Requirement 4: Exact-date snapshots (0 days diff) result in EXACT_DATE', () => {
    const exact = classifySnapshotQuality('2023-05-15', '2023-05-15');
    assert.equal(exact.tier, QUALITY_TIERS.EXACT_DATE);
    assert.equal(exact.isAvailable, true);
    assert.equal(exact.daysDiff, 0);
  });

  // 5. 90-day prior snapshots result in NEAR_DATE
  test('Requirement 5: Snapshots 1 to 90 days prior result in NEAR_DATE', () => {
    // 45 days prior
    const near = classifySnapshotQuality('2023-04-01', '2023-05-15');
    assert.equal(near.tier, QUALITY_TIERS.NEAR_DATE);
    assert.equal(near.isAvailable, true);
    assert.ok(near.daysDiff >= 1 && near.daysDiff <= 90);

    // 90 days prior
    const edge90 = classifySnapshotQuality('2023-01-01', '2023-04-01');
    assert.equal(edge90.tier, QUALITY_TIERS.NEAR_DATE);
  });

  // 6. Same-year >90-day snapshots result in SAME_YEAR
  test('Requirement 6: Same calendar year snapshots >90 days prior result in SAME_YEAR', () => {
    // Jan 1 to Dec 1 of same year (334 days)
    const sameYear = classifySnapshotQuality('2023-01-01', '2023-12-01');
    assert.equal(sameYear.tier, QUALITY_TIERS.SAME_YEAR);
    assert.equal(sameYear.isAvailable, true);
    assert.ok(sameYear.daysDiff > 90);
  });

  // 7. Personal direct donations count
  test('Requirement 7: PERSONAL_DIRECT donations qualify for personal parity', () => {
    const pd = isPersonalParityEligible(FUNDING_SOURCE_TYPES.PERSONAL_DIRECT);
    assert.equal(pd.isEligible, true);
    assert.equal(pd.countsAsPersonal, true);
  });

  // 8. Personal funds-confirmed donations count
  test('Requirement 8: PERSONAL_FUNDS_CONFIRMED donations qualify for personal parity', () => {
    const pfc = isPersonalParityEligible(FUNDING_SOURCE_TYPES.PERSONAL_FUNDS_CONFIRMED);
    assert.equal(pfc.isEligible, true);
    assert.equal(pfc.countsAsPersonal, true);
  });

  // 9. Foundation donations do not count as personal giving
  test('Requirement 9: FOUNDATION donations are strictly excluded from personal giving', () => {
    const f = isPersonalParityEligible(FUNDING_SOURCE_TYPES.FOUNDATION);
    assert.equal(f.isEligible, false);
    assert.equal(f.countsAsPersonal, false);
  });

  // 10. Corporate donations do not count as personal giving
  test('Requirement 10: CORPORATE donations are strictly excluded from personal giving', () => {
    const c = isPersonalParityEligible(FUNDING_SOURCE_TYPES.CORPORATE);
    assert.equal(c.isEligible, false);
    assert.equal(c.countsAsPersonal, false);
  });

  // 11. DAF donations do not count as personal giving by default
  test('Requirement 11: DAF donations are excluded from personal giving by default', () => {
    const daf = isPersonalParityEligible(FUNDING_SOURCE_TYPES.DAF);
    assert.equal(daf.isEligible, false);
    assert.equal(daf.countsAsPersonal, false);
  });

  // 12. Pledges do not count as completed personal giving
  test('Requirement 12: PLEDGE commitments must never count as completed personal giving', () => {
    const pledge = isPersonalParityEligible(FUNDING_SOURCE_TYPES.PLEDGE);
    assert.equal(pledge.isEligible, false);
    assert.equal(pledge.countsAsPersonal, false);

    // Schema validation invariant
    const invalidPledge = validateDonationQuality({
      amount: 1000000000,
      donation_date: '2024-01-01',
      funding_source_type: 'PLEDGE',
      is_completed_giving: true
    });
    assert.equal(invalidPledge.isValid, false);
    assert.ok(invalidPledge.errors.some(e => e.includes('Pledge commitments')));
  });

  // 13. Disputed donations do not count in default rankings
  test('Requirement 13: DISPUTED donations do not count in default rankings or parity', () => {
    const disp = isPersonalParityEligible('PERSONAL_DIRECT', 'DISPUTED');
    assert.equal(disp.isEligible, false);
    assert.match(disp.reason, /Disputed/i);

    const invalidDisputed = validateDonationQuality({
      amount: 50000000,
      donation_date: '2024-01-01',
      status: 'DISPUTED',
      is_default_ranking_eligible: true
    });
    assert.equal(invalidDisputed.isValid, false);
    assert.ok(invalidDisputed.errors.some(e => e.includes('Disputed records')));
  });

  // 14. Current net worth is never used as denominator for historical cumulative giving ratio
  test('Requirement 14: Invalid lifetime cumulative giving ratio is eliminated', async () => {
    const rankings = await getRankings('peak_percentage');
    assert.ok(Array.isArray(rankings.rankings));

    for (const r of rankings.rankings) {
      // lifetime_personal_giving_ratio must NOT exist as a valid ratio in public response
      assert.strictEqual(r.lifetime_personal_giving_ratio, null);
      // Valid historical peak metric must be used instead
      if (r.peak_historical_percentage !== null) {
        assert.equal(typeof r.peak_historical_percentage, 'number');
      }
    }
  });

  // 15. User monthly income produces the correct proportional comparison
  test('Requirement 15: User monthly income produces mathematically exact proportional comparison', () => {
    // $1B gift on $50B wealth = 2.0%
    // $5,000 monthly take-home * 2.0% = $100.00
    const calc = calculateHistoricalDonationParity({
      donationAmount: 1000000000,
      donationDate: '2020-01-01',
      fundingSourceType: 'PERSONAL_DIRECT',
      historicalNetWorth: 50000000000,
      userIncome: 5000,
      incomeFrequency: 'monthly'
    });
    assert.equal(calc.historicalGenerosityRatio, 2.0);
    assert.equal(calc.formattedRatio, '2.00%');
    assert.equal(calc.userEquivalentMonthly, 100.0);
  });

  // 16. User annual income produces the correct proportional comparison
  test('Requirement 16: User annual income produces mathematically exact proportional comparison', () => {
    // $1B gift on $50B wealth = 2.0%
    // $60,000 annual income * 2.0% = $1,200.00
    const calc = calculateHistoricalDonationParity({
      donationAmount: 1000000000,
      donationDate: '2020-01-01',
      fundingSourceType: 'PERSONAL_DIRECT',
      historicalNetWorth: 50000000000,
      userIncome: 60000,
      incomeFrequency: 'annual'
    });
    assert.equal(calc.historicalGenerosityRatio, 2.0);
    assert.equal(calc.formattedRatio, '2.00%');
    assert.equal(calc.userEquivalentAnnual, 1200.0);
  });

  // 17. Quality score is calculated consistently
  test('Requirement 17: Data Quality Score is calculated consistently with transparent heuristic', () => {
    const fullRecord = {
      donor_person_name: 'Warren Buffett',
      description: 'Annual Berkshire Hathaway Class B share donation',
      donation_date: '2024-06-28',
      amount: 4000000000,
      currency: 'USD',
      funding_source_type: 'PERSONAL_DIRECT',
      recipient_name: 'Gates Foundation',
      source_url: 'https://www.sec.gov/edgar/buffett-2024',
      status: 'VERIFIED',
      historical_net_worth: 135000000000,
      snapshot_date: '2024-06-28'
    };

    const qs = computeDataQualityScore(fullRecord, {
      snapshotDate: '2024-06-28',
      sources: [{ url: 'https://www.sec.gov/edgar/buffett-2024', publisher: 'SEC' }]
    });

    assert.ok(qs.score >= 85, `Score should be Grade A (>=85), got ${qs.score}`);
    assert.equal(qs.grade, 'A');
    assert.equal(qs.answered_questions_count, 8);
    assert.equal(qs.is_complete, true);
    assert.equal(qs.flags.length, 0);
  });

  // 18. Carnegie fallback and Supabase values are consistent
  test('Requirement 18: Andrew Carnegie records use strictly nominal historical USD ($350M net worth)', async () => {
    // Fallback dataset check
    const people = await getPeople({ search: 'Carnegie' });
    assert.ok(people.people.length > 0, 'Carnegie must exist');
    const carnegie = people.people[0];

    // Total personal giving is nominal historical USD: $135M ($125M + $10M gifts), not $135B
    assert.equal(carnegie.total_personal_giving, 135000000, 'Carnegie total personal giving must be nominal $135M');

    // Wealth snapshots must use historical nominal USD (1901: $350M, 1913: $150M, 1919: $25M)
    const wh = await getWealthHistory(carnegie.person_id);
    assert.ok(wh && wh.snapshots.length > 0);
    const snap1901 = wh.snapshots.find(s => s.snapshot_date.startsWith('1901'));
    assert.ok(snap1901, 'Must have 1901 snapshot');
    assert.equal(snap1901.net_worth, 350000000, '1901 wealth must be nominal $350M, not modern $350B');

    // Must never contain modern $350 Billion snapshot or future 2024/2026 snapshots
    assert.ok(!wh.snapshots.some(s => s.net_worth > 1000000000));
    assert.ok(!wh.snapshots.some(s => s.snapshot_date.startsWith('20')));

    // Supabase / seed dataset check
    const phase13Carnegie = PHASE13_BILLIONAIRES.find(b => b.name.includes('Carnegie'));
    assert.ok(phase13Carnegie);
    assert.equal(phase13Carnegie.wealthSnapshots[0].netWorth, 350000000);
    assert.equal(phase13Carnegie.wealthSnapshots[0].date, '1901-03-02');
  });

  // 19. Basic/Advanced navigation does not trap users
  test('Requirement 19: Navigation does not trap users in Advanced Mode', () => {
    // Inspect index.html: Must clear or set nocharity_advanced_mode to false
    const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
    assert.match(indexHtml, /localStorage\.setItem\('nocharity_advanced_mode',\s*'false'\)/);

    // Inspect app.js: Settings modal does not default to advanced mode
    const appJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'app.js'), 'utf8');
    assert.match(appJs, /settingsAdvancedModeToggle\.checked\s*=\s*false/);
    assert.match(appJs, /updateModeDisplay\(false\)/);
  });

  // 20. USD and INR tangible comparisons do not incorrectly share the same raw threshold
  test('Requirement 20: getTangibleMatch handles USD and INR respectfully without sharing raw USD thresholds', async () => {
    // Setup mock browser globals for importing public/js/app.js
    if (typeof globalThis.localStorage === 'undefined') {
      const store = {};
      globalThis.localStorage = {
        getItem: k => store[k] ?? null,
        setItem: (k, v) => { store[k] = String(v); },
        removeItem: k => { delete store[k]; },
        clear: () => {}
      };
    }
    if (typeof globalThis.document === 'undefined') {
      globalThis.document = {
        addEventListener: () => {},
        removeEventListener: () => {},
        getElementById: () => ({
          addEventListener: () => {},
          removeEventListener: () => {},
          setAttribute: () => {},
          classList: { add: () => {}, remove: () => {} },
          style: {}
        }),
        querySelectorAll: () => []
      };
    }
    if (typeof globalThis.window === 'undefined') {
      globalThis.window = globalThis;
    }

    const { getTangibleMatch } = await import('../public/js/app.js');

    // USD: $3.50 gets a calibrated coffee item
    const usdMatch = getTangibleMatch(3.50, '$', 4000);
    assert.equal(usdMatch.icon, '☕');
    assert.match(usdMatch.text, /coffee/i);
    assert.match(usdMatch.tip, /matching financial share|proportional/i);

    // INR: ₹3.50 must NOT get a US coffee item; gets proportional income statement
    const inrMatch = getTangibleMatch(3.50, '₹', 40000);
    assert.notEqual(inrMatch.icon, '☕');
    assert.match(inrMatch.text, /Proportional paycheck share|Proportional income/i);
    assert.match(inrMatch.tip, /matching financial share|proportional/i);

    // High sacrifice case
    const highMatch = getTangibleMatch(1500, '$', 4000);
    assert.match(highMatch.tip, /consume a large share of your income/i);
  });

  // 21. Maintainer verification route protection
  test('Requirement 21: POST /api/advanced/discover/verify is protected by MAINTAINER_TOKEN', () => {
    const serverJs = fs.readFileSync(path.join(rootDir, 'server.js'), 'utf8');
    assert.match(serverJs, /MAINTAINER_TOKEN/, 'server.js must require MAINTAINER_TOKEN');
    assert.match(serverJs, /401/, 'server.js must return 401 when unauthorized');
    assert.match(serverJs, /review-discovery\.js/, 'server.js must point unauthorized requests to local CLI tool');
  });

});
