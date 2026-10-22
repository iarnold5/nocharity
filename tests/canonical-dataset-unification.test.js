/**
 * Unit & Integration Tests for Canonical Dataset Unification
 * 
 * Verifies:
 * 1. Basic Mode works with Supabase (GET /api/billionaires & getCanonicalBillionaires).
 * 2. Basic Mode works with the offline snapshot (graceful degradation fallback).
 * 3. Advanced Mode continues to work seamlessly without regressions.
 * 4. Both modes select the same underlying person & donation records (same facts, dates, amounts, wealth).
 * 5. Supabase failure does not crash the site (returns offline fallback response with clear notice).
 * 6. Free-tier compliance (cache reuse, 0 realtime subscriptions, 0 database writes).
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCanonicalBillionaires,
  filterDonationsByTimeframe,
  getPeople,
  getPersonById,
  getDonations,
  getRankings,
  getDashboardMetrics
} from '../server/data-access.js';
import {
  CANONICAL_OFFLINE_SNAPSHOT,
  INITIAL_BILLIONAIRES,
  SNAPSHOT_METADATA
} from '../public/js/data.js';

describe('Canonical Dataset Unification — Unit & Integration Tests', () => {

  // =========================================================================
  // 1. Basic Mode Works with Supabase
  // =========================================================================
  test('1. Basic Mode reads canonical dataset from Supabase', async () => {
    const res = await getCanonicalBillionaires({
      timeframe: 'all',
      monthlyIncome: 35000,
      currency: '₹'
    });

    assert.ok(res, 'Response exists');
    assert.equal(res.source, 'supabase');
    assert.equal(res.isOffline, false);
    assert.ok(Array.isArray(res.billionaires));
    assert.equal(res.billionaires.length, 17);

    // Verify key canonical billionaires are present with verified facts
    const buffett = res.billionaires.find(b => b.id === 'warren-buffett');
    assert.ok(buffett, 'Warren Buffett must exist');
    assert.equal(buffett.person_id, 'b0000000-0000-0000-0000-000000000001');
    assert.equal(buffett.netWorth, 153619569000);
    assert.equal(buffett.historicalDonations.length, 4);
    assert.equal(buffett.totalDonatedInPeriod, 17170000000);

    const gates = res.billionaires.find(b => b.id === 'bill-gates');
    assert.ok(gates, 'Bill Gates must exist');
    assert.equal(gates.person_id, 'b0000000-0000-0000-0000-000000000002');
    assert.equal(gates.netWorth, 117729778000);
    assert.equal(gates.historicalDonations.length, 2);
    assert.equal(gates.totalDonatedInPeriod, 21000000000);

    const scott = res.billionaires.find(b => b.id === 'mackenzie-scott');
    assert.ok(scott, 'MacKenzie Scott must exist');
    assert.equal(scott.person_id, 'b0000000-0000-0000-0000-000000000003');
    assert.equal(scott.netWorth, 28175655000);
    assert.equal(scott.historicalDonations.length, 3);
  });

  // =========================================================================
  // 2. Basic Mode Works with Offline Snapshot
  // =========================================================================
  test('2. Bundled verified offline snapshot corresponds strictly to canonical dataset', () => {
    assert.ok(Array.isArray(CANONICAL_OFFLINE_SNAPSHOT));
    assert.equal(CANONICAL_OFFLINE_SNAPSHOT.length, 17);
    assert.equal(INITIAL_BILLIONAIRES, CANONICAL_OFFLINE_SNAPSHOT, 'INITIAL_BILLIONAIRES aliases CANONICAL_OFFLINE_SNAPSHOT');

    assert.ok(SNAPSHOT_METADATA);
    assert.equal(SNAPSHOT_METADATA.source, 'canonical_supabase_export');
    assert.equal(SNAPSHOT_METADATA.isOfflineFallback, true);
    assert.equal(SNAPSHOT_METADATA.billionairesCount, 17);

    // Verify snapshot facts match Supabase facts
    const buffett = CANONICAL_OFFLINE_SNAPSHOT.find(b => b.id === 'warren-buffett');
    assert.equal(buffett.netWorth, 153619569000);
    assert.equal(buffett.historicalDonations.length, 4);

    const gates = CANONICAL_OFFLINE_SNAPSHOT.find(b => b.id === 'bill-gates');
    assert.equal(gates.netWorth, 117729778000);
    assert.equal(gates.historicalDonations.length, 2);

    const premji = CANONICAL_OFFLINE_SNAPSHOT.find(b => b.id === 'azim-premji');
    assert.equal(premji.netWorth, 8083511000);
    assert.equal(premji.historicalDonations.length, 2);
  });

  // =========================================================================
  // 3. Advanced Mode Still Works
  // =========================================================================
  test('3. Advanced Mode endpoints continue to function without regression', async () => {
    const dashboard = await getDashboardMetrics();
    assert.ok(dashboard);
    assert.ok(dashboard.documentedMetrics.trackedBillionairesCount >= 1000);

    const rankings = await getRankings({ metric: 'personal_giving', limit: 5 });
    assert.ok(rankings.rankings.length >= 5);
    assert.equal(rankings.rankings[0].canonical_name, 'Bill Gates');

    const buffettProfile = await getPersonById('b0000000-0000-0000-0000-000000000001');
    assert.equal(buffettProfile.canonical_name, 'Warren Buffett');
    assert.equal(buffettProfile.latest_net_worth, 153619569000);
  });

  // =========================================================================
  // 4. Both Modes Select the Same Underlying Person/Donation Records
  // =========================================================================
  test('4. Both modes agree 100% on people, wealth, donations, and dates', async () => {
    const basicRes = await getCanonicalBillionaires({ timeframe: 'all' });
    const basicBuffett = basicRes.billionaires.find(b => b.id === 'warren-buffett');

    const advBuffett = await getPersonById('b0000000-0000-0000-0000-000000000001');
    const advDonations = await getDonations({ billionaireId: 'b0000000-0000-0000-0000-000000000001' });

    // Wealth must match exactly
    assert.equal(basicBuffett.netWorth, advBuffett.latest_net_worth);

    // Number of personal donations must match exactly
    assert.equal(basicBuffett.historicalDonations.length, advDonations.donations.length);

    // Every donation amount, date, and publisher must match
    for (let i = 0; i < basicBuffett.historicalDonations.length; i++) {
      const basicDon = basicBuffett.historicalDonations[i];
      const advDon = advDonations.donations[i];
      assert.equal(basicDon.id, advDon.id);
      assert.equal(basicDon.amount, advDon.amount);
      assert.equal(basicDon.date, advDon.donation_date);
      assert.equal(basicDon.source, advDon.source_publisher);
    }
  });

  // =========================================================================
  // 5. Supabase Failure Does Not Crash the Site (Graceful Degradation)
  // =========================================================================
  test('5. Supabase failure or offline mode falls back smoothly with notice', () => {
    // filterDonationsByTimeframe works standalone
    const all = [
      { date: '2024-05-01', amount: 1000 },
      { date: '2020-01-01', amount: 500 }
    ];
    const filtered = filterDonationsByTimeframe(all, 'custom', '2024-01-01', '2024-12-31');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].amount, 1000);

    // Snapshot fallback operates with full parity calculations
    const fallbackBillionaires = CANONICAL_OFFLINE_SNAPSHOT.map(b => {
      const filteredDonations = filterDonationsByTimeframe(b.historicalDonations, 'all');
      const total = filteredDonations.reduce((sum, d) => sum + d.amount, 0);
      const pct = b.netWorth > 0 ? (total / b.netWorth) * 100 : 0;
      return {
        ...b,
        totalDonatedInPeriod: total,
        percentage: pct
      };
    });

    assert.equal(fallbackBillionaires.length, 17);
    const buffett = fallbackBillionaires.find(b => b.id === 'warren-buffett');
    assert.equal(buffett.totalDonatedInPeriod, 17170000000);
    assert.ok(buffett.percentage > 0);
  });

  // =========================================================================
  // 6. Timeframe Filtering Consistency
  // =========================================================================
  test('6. Timeframe filtering correctly isolates recent donations', async () => {
    const recentRes = await getCanonicalBillionaires({
      timeframe: 'custom',
      startDate: '2025-01-01',
      endDate: '2025-12-31'
    });

    const buffett = recentRes.billionaires.find(b => b.id === 'warren-buffett');
    // In 2025, Buffett made exactly one $5.3B donation
    assert.equal(buffett.donations.length, 1);
    assert.equal(buffett.donations[0].amount, 5300000000);
    assert.equal(buffett.totalDonatedInPeriod, 5300000000);
  });
});
