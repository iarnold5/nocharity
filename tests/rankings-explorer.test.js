/**
 * NoCharity Advanced Mode — Phase 8 Integration & Unit Tests
 * Donation Explorer & Comprehensive 6-Metric Ranking System
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getRankings,
  getDonations,
  getPersonGivingSummary
} from '../server/supabase.js';

describe('NoCharity Advanced Mode — Phase 8: Rankings & Donation Explorer Tests', () => {

  // =========================================================================
  // 1. ALL 6 REQUIRED RANKING METRICS
  // =========================================================================
  describe('1. Documented Philanthropy Rankings — 6 Core Metrics', () => {

    test('1.1 Metric 1: Largest Documented Personal Donation', async () => {
      const res = await getRankings({ metric: 'largest_donation', limit: 10 });
      assert.ok(res, 'Rankings result returned');
      assert.strictEqual(res.metric, 'largest_donation');
      assert.ok(Array.isArray(res.rankings), 'Rankings array present');
      assert.ok(res.rankings.length > 0, 'Rankings not empty');

      // Top person should have the highest single personal donation amount
      const top = res.rankings[0];
      assert.ok(top.largest_personal_donation, 'Top person has largest_personal_donation');
      assert.ok(top.largest_personal_donation.amount > 0, 'Largest donation amount > 0');

      // Verify descending order by largest personal donation amount
      for (let i = 0; i < res.rankings.length - 1; i++) {
        const currAmt = res.rankings[i].largest_personal_donation?.amount || 0;
        const nextAmt = res.rankings[i + 1].largest_personal_donation?.amount || 0;
        assert.ok(currAmt >= nextAmt, `Rank ${i+1} ($${currAmt}) >= Rank ${i+2} ($${nextAmt})`);
      }
    });

    test('1.2 Metric 2: Highest Documented Personal Giving Total', async () => {
      const res = await getRankings({ metric: 'personal_giving', limit: 10 });
      assert.ok(res);
      assert.strictEqual(res.metric, 'personal_giving');
      assert.ok(res.rankings.length > 0);

      // Verify descending order by total personal giving
      for (let i = 0; i < res.rankings.length - 1; i++) {
        const curr = res.rankings[i].total_personal_giving || 0;
        const next = res.rankings[i + 1].total_personal_giving || 0;
        assert.ok(curr >= next, `Rank ${i+1} ($${curr}) >= Rank ${i+2} ($${next})`);
      }
    });

    test('1.3 Metric 3: Highest Giving as % of Wealth at Time of Donation', async () => {
      const res = await getRankings({ metric: 'giving_ratio', limit: 10 });
      assert.ok(res);
      assert.strictEqual(res.metric, 'giving_ratio');
      assert.ok(res.rankings.length > 0);

      const top = res.rankings[0];
      assert.ok(top.peak_donation_percentage, 'Top ranking has peak_donation_percentage');
      assert.ok(typeof top.peak_donation_percentage.percentage === 'number');

      // CRITICAL REQUIREMENT VERIFICATION:
      // Percentage ranking MUST use: (donation amount / wealth at donation date)
      // Percentage ranking MUST NOT use: (total donations / current net worth)
      const peak = top.peak_donation_percentage;
      const expectedRatio = (peak.amount / peak.historical_net_worth) * 100;
      assert.ok(
        Math.abs(peak.percentage - expectedRatio) < 0.01,
        `Peak percentage (${peak.percentage}%) strictly matches (donation amount / historical wealth at donation date) (${expectedRatio.toFixed(2)}%)`
      );

      // Verify descending order by peak percentage
      for (let i = 0; i < res.rankings.length - 1; i++) {
        const currPct = res.rankings[i].peak_donation_percentage?.percentage || 0;
        const nextPct = res.rankings[i + 1].peak_donation_percentage?.percentage || 0;
        assert.ok(currPct >= nextPct, `Rank ${i+1} (${currPct}%) >= Rank ${i+2} (${nextPct}%)`);
      }
    });

    test('1.4 Metric 4: Highest Average Personal Donation', async () => {
      const res = await getRankings({ metric: 'average_donation', limit: 10 });
      assert.ok(res);
      assert.strictEqual(res.metric, 'average_donation');
      assert.ok(res.rankings.length > 0);

      // Verify descending order by average personal donation
      for (let i = 0; i < res.rankings.length - 1; i++) {
        const curr = res.rankings[i].avg_personal_donation || 0;
        const next = res.rankings[i + 1].avg_personal_donation || 0;
        assert.ok(curr >= next, `Rank ${i+1} ($${curr}) >= Rank ${i+2} ($${next})`);
      }
    });

    test('1.5 Metric 5: Most Documented Personal Donations', async () => {
      const res = await getRankings({ metric: 'most_donations', limit: 10 });
      assert.ok(res);
      assert.strictEqual(res.metric, 'most_donations');
      assert.ok(res.rankings.length > 0);

      // Verify descending order by qualifying donations count
      for (let i = 0; i < res.rankings.length - 1; i++) {
        const curr = res.rankings[i].qualifying_donations_count || 0;
        const next = res.rankings[i + 1].qualifying_donations_count || 0;
        assert.ok(curr >= next, `Rank ${i+1} (${curr} gifts) >= Rank ${i+2} (${next} gifts)`);
      }
    });

    test('1.6 Metric 6: Giving Per Year (Where Sufficient Historical Data Exists)', async () => {
      const res = await getRankings({ metric: 'giving_per_year', limit: 10 });
      assert.ok(res);
      assert.strictEqual(res.metric, 'giving_per_year');
      assert.ok(res.rankings.length > 0);

      // Top individuals with multi-year baselines (span >= 2 years) should be prioritized
      const multiYearGroup = res.rankings.filter(r => r.has_sufficient_data);
      assert.ok(multiYearGroup.length > 0, 'Found individuals with multi-year giving baselines');

      // Check first item in multi-year group
      const topMultiYear = multiYearGroup[0];
      assert.ok(topMultiYear.has_sufficient_data, 'Top multi-year item has sufficient data flag');
      assert.ok(topMultiYear.coverage_span >= 2, `Coverage span is at least 2 years (${topMultiYear.coverage_span})`);
      assert.ok(topMultiYear.annualized_giving > 0, 'Annualized giving rate calculated');
      
      const expectedAnnualized = topMultiYear.total_personal_giving / topMultiYear.coverage_span;
      assert.ok(
        Math.abs(topMultiYear.annualized_giving - expectedAnnualized) < 1.0,
        'Annualized giving matches total personal giving divided by coverage span'
      );
    });
  });

  // =========================================================================
  // 2. DATA COVERAGE INDICATORS
  // =========================================================================
  describe('2. Data Coverage Indicators & Historical Grounding', () => {

    test('2.1 Every ranked individual has transparent coverage indicators', async () => {
      const res = await getRankings({ metric: 'personal_giving', limit: 20 });
      for (const r of res.rankings) {
        assert.ok(r.coverage_years, `Person ${r.canonical_name} has coverage_years`);
        assert.ok(r.coverage_indicator, `Person ${r.canonical_name} has human-readable coverage_indicator`);
        assert.strictEqual(typeof r.has_sufficient_data, 'boolean');
        assert.strictEqual(typeof r.active_years_count, 'number');
        assert.strictEqual(typeof r.coverage_span, 'number');
      }
    });

    test('2.2 Differentiates multi-year tracked donors from single-year records', async () => {
      const res = await getRankings({ metric: 'giving_per_year', limit: 20 });
      
      // Buffett and Scott should have multi-year coverage spans
      const buffett = res.rankings.find(r => r.canonical_name.includes('Buffett'));
      const scott = res.rankings.find(r => r.canonical_name.includes('Scott'));

      if (buffett && buffett.qualifying_donations_count >= 2) {
        assert.strictEqual(buffett.has_sufficient_data, true, 'Buffett has sufficient multi-year data');
        assert.ok(buffett.coverage_span >= 2, `Buffett span (${buffett.coverage_span}) >= 2`);
      }

      if (scott && scott.qualifying_donations_count >= 2) {
        assert.strictEqual(scott.has_sufficient_data, true, 'MacKenzie Scott has sufficient multi-year data');
        assert.ok(scott.coverage_span >= 2, `Scott span (${scott.coverage_span}) >= 2`);
      }
    });
  });

  // =========================================================================
  // 3. DONATION EXPLORER SORTING
  // =========================================================================
  describe('3. Donation Explorer Sorting Across All Dimensions', () => {

    test('3.1 Sorting by amount: desc and asc', async () => {
      const descRes = await getDonations({ sortBy: 'amount', sortOrder: 'desc', limit: 10 });
      assert.ok(descRes.donations.length >= 2);
      for (let i = 0; i < descRes.donations.length - 1; i++) {
        assert.ok(
          parseFloat(descRes.donations[i].amount) >= parseFloat(descRes.donations[i + 1].amount),
          `Amount desc: ${descRes.donations[i].amount} >= ${descRes.donations[i+1].amount}`
        );
      }

      const ascRes = await getDonations({ sortBy: 'amount', sortOrder: 'asc', limit: 10 });
      assert.ok(ascRes.donations.length >= 2);
      for (let i = 0; i < ascRes.donations.length - 1; i++) {
        assert.ok(
          parseFloat(ascRes.donations[i].amount) <= parseFloat(ascRes.donations[i + 1].amount),
          `Amount asc: ${ascRes.donations[i].amount} <= ${ascRes.donations[i+1].amount}`
        );
      }
    });

    test('3.2 Sorting by date: desc and asc', async () => {
      const descRes = await getDonations({ sortBy: 'date', sortOrder: 'desc', limit: 10 });
      assert.ok(descRes.donations.length >= 2);
      for (let i = 0; i < descRes.donations.length - 1; i++) {
        const d1 = new Date(descRes.donations[i].donation_date).getTime();
        const d2 = new Date(descRes.donations[i + 1].donation_date).getTime();
        assert.ok(d1 >= d2, `Date desc: ${descRes.donations[i].donation_date} >= ${descRes.donations[i+1].donation_date}`);
      }

      const ascRes = await getDonations({ sortBy: 'date', sortOrder: 'asc', limit: 10 });
      assert.ok(ascRes.donations.length >= 2);
      for (let i = 0; i < ascRes.donations.length - 1; i++) {
        const d1 = new Date(ascRes.donations[i].donation_date).getTime();
        const d2 = new Date(ascRes.donations[i + 1].donation_date).getTime();
        assert.ok(d1 <= d2, `Date asc: ${ascRes.donations[i].donation_date} <= ${ascRes.donations[i+1].donation_date}`);
      }
    });

    test('3.3 Sorting by percentage of wealth: desc', async () => {
      const res = await getDonations({ sortBy: 'percentage', sortOrder: 'desc', limit: 10 });
      assert.ok(res.donations.length >= 2);
      for (let i = 0; i < res.donations.length - 1; i++) {
        const p1 = res.donations[i].historical_percentage || 0;
        const p2 = res.donations[i + 1].historical_percentage || 0;
        assert.ok(p1 >= p2, `% desc: ${p1}% >= ${p2}%`);
      }
    });

    test('3.4 Sorting by billionaire name: asc', async () => {
      const res = await getDonations({ sortBy: 'billionaire', sortOrder: 'asc', limit: 10 });
      assert.ok(res.donations.length >= 2);
      for (let i = 0; i < res.donations.length - 1; i++) {
        const n1 = (res.donations[i].donor_person_name || '').toLowerCase();
        const n2 = (res.donations[i + 1].donor_person_name || '').toLowerCase();
        assert.ok(n1.localeCompare(n2) <= 0, `Name asc: "${n1}" <= "${n2}"`);
      }
    });

    test('3.5 Sorting by status: verified first', async () => {
      const res = await getDonations({ sortBy: 'status', sortOrder: 'desc', limit: 10 });
      assert.ok(res.donations.length >= 2);
      assert.strictEqual(res.donations[0].status, 'VERIFIED');
    });
  });

  // =========================================================================
  // 4. EXPLICIT BADGES AND ISOLATION TOGGLE
  // =========================================================================
  describe('4. Explicit Badges and Isolation Toggle', () => {

    test('4.1 Default mode returns only personal gifts', async () => {
      const res = await getDonations({ includeAssociatedOrgGiving: false, limit: 30 });
      for (const d of res.donations) {
        assert.ok(
          ['PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'].includes(d.funding_source_type),
          `Default mode must only include personal funding sources, got ${d.funding_source_type}`
        );
        assert.strictEqual(d.funding_source_badge, 'PERSONAL');
      }
    });

    test('4.2 Explicit toggle "Include foundation/company donations" returns badges for all 5 types', async () => {
      const res = await getDonations({ includeAssociatedOrgGiving: true, limit: 50 });
      const badges = new Set(res.donations.map(d => d.funding_source_badge));

      // Must include PERSONAL and at least FOUNDATION / CORPORATE / DAF / PLEDGE
      assert.ok(badges.has('PERSONAL'), 'Contains PERSONAL badge');
      assert.ok(
        badges.has('FOUNDATION') || badges.has('CORPORATE') || badges.has('DAF') || badges.has('PLEDGE'),
        'Contains organizational giving badges when toggle is enabled'
      );

      // Verify each donation has a distinct valid badge
      for (const d of res.donations) {
        assert.ok(
          ['PERSONAL', 'FOUNDATION', 'CORPORATE', 'DAF', 'PLEDGE', 'UNKNOWN'].includes(d.funding_source_badge),
          `Badge must be one of the 5 explicit types, got: ${d.funding_source_badge}`
        );
      }
    });
  });
});
