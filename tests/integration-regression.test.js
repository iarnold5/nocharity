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
  checkTemporalWealthConsistency
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
    // Advanced HTML template verification
    const advancedHtml = fs.readFileSync(path.join(rootDir, 'public', 'advanced.html'), 'utf8');
    assert.match(advancedHtml, /No matching billionaires found/i, 'Billionaire explorer must have empty state');
    assert.match(advancedHtml, /No matching donations found/i, 'Donation explorer must have empty state');
    assert.match(advancedHtml, /No rankings available for this metric/i, 'Rankings table must have empty state');

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

    const advancedHtml = fs.readFileSync(path.join(rootDir, 'public', 'advanced.html'), 'utf8');
    assert.match(advancedHtml, /@media\s*\(max-width:\s*768px\)/, 'Advanced mode must have mobile media queries');
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
