/**
 * NoCharity Advanced Mode — Phase 7 Integration Tests
 * Individual Billionaire Profile Page
 */

import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBillionaireProfile,
  getPersonById,
  getPeople,
  getWealthHistory,
  getPersonOrganizations
} from '../server/supabase.js';

describe('NoCharity Advanced Mode — Phase 7: Individual Billionaire Profile Tests', () => {

  describe('1. Profile Header & Net Worth Metadata', () => {
    test('1.1 Returns complete header with name, country, industry, net worth, date, and data source', async () => {
      const profile = await getBillionaireProfile('warren-buffett');
      assert.ok(profile, 'Profile retrieved for Warren Buffett');
      assert.strictEqual(profile.canonical_name, 'Warren Buffett');
      assert.ok(profile.country, 'Has country');
      assert.ok(profile.industry, 'Has industry');
      assert.ok(profile.latest_net_worth > 0, 'Has latest net worth');
      assert.ok(profile.latest_snapshot_date, 'Has latest valuation date');
      assert.ok(profile.latest_wealth_source_name, 'Has benchmark data source name');
      assert.ok(
        profile.latest_wealth_source_name.includes('Bloomberg') || profile.latest_wealth_source_name.includes('Forbes'),
        'Benchmark source matches reputable publisher'
      );
    });

    test('1.2 Resolves both UUID and kebab-case slug interchangeably', async () => {
      const bySlug = await getBillionaireProfile('bill-gates');
      assert.ok(bySlug);
      const byId = await getBillionaireProfile(bySlug.person_id);
      assert.ok(byId);
      assert.strictEqual(bySlug.canonical_name, byId.canonical_name);
      assert.strictEqual(bySlug.latest_net_worth, byId.latest_net_worth);
    });
  });

  describe('2. Documented Personal Giving Metrics', () => {
    test('2.1 Computes all 6 required personal giving metrics with exact precision', async () => {
      const profile = await getBillionaireProfile('warren-buffett');
      const pm = profile.personal_giving_metrics;
      assert.ok(pm, 'personal_giving_metrics object exists');

      // 1. Lifetime documented personal giving
      assert.strictEqual(typeof pm.lifetime_personal_giving, 'number');
      assert.ok(pm.lifetime_personal_giving > 0);

      // 2. Number of qualifying donations
      assert.strictEqual(typeof pm.qualifying_donations_count, 'number');
      assert.ok(pm.qualifying_donations_count >= 1);

      // 3. Largest donation
      assert.ok(pm.largest_donation, 'Has largest donation');
      assert.ok(pm.largest_donation.amount > 0);
      assert.ok(pm.largest_donation.donation_date);
      assert.ok(pm.largest_donation.recipient);

      // 4. Latest donation
      assert.ok(pm.latest_donation, 'Has latest donation');
      assert.ok(pm.latest_donation.amount > 0);
      assert.ok(pm.latest_donation.donation_date);

      // 5. Average donation
      assert.strictEqual(pm.average_donation, pm.lifetime_personal_giving / pm.qualifying_donations_count);

      // 6. Giving as percentage of wealth at time of donation
      assert.strictEqual(typeof pm.giving_as_pct_of_wealth_at_donation, 'number');
      assert.ok(pm.giving_as_pct_of_wealth_at_donation > 0);
    });

    test('2.2 Handles billionaires with zero qualifying personal gifts gracefully', async () => {
      const profile = await getBillionaireProfile('elon-musk');
      assert.ok(profile);
      const pm = profile.personal_giving_metrics;
      assert.strictEqual(pm.qualifying_donations_count, 0);
      assert.strictEqual(pm.lifetime_personal_giving, 0);
      assert.strictEqual(pm.largest_donation, null);
      assert.strictEqual(pm.latest_donation, null);
      assert.strictEqual(pm.average_donation, 0);
    });
  });

  describe('3. Associated Organization Giving (Strict Separation)', () => {
    test('3.1 Organizations and organization grants are strictly separated from personal giving', async () => {
      const profile = await getBillionaireProfile('elon-musk');
      const orgGiving = profile.associated_organization_giving;
      assert.ok(orgGiving, 'associated_organization_giving exists');

      // Must list associated organizations
      assert.ok(Array.isArray(orgGiving.organizations));
      assert.ok(orgGiving.organizations.length > 0);
      const orgNames = orgGiving.organizations.map(o => o.display_name);
      assert.ok(orgNames.includes('Tesla'));

      // Must list organization donations
      assert.ok(Array.isArray(orgGiving.donations));
      assert.ok(orgGiving.donations.length >= 1);

      // Crucial: Personal giving metrics MUST NOT include these corporate/DAF grants
      assert.strictEqual(profile.personal_giving_metrics.lifetime_personal_giving, 0);
      assert.strictEqual(profile.personal_giving_metrics.qualifying_donations_count, 0);

      // Total corporate/DAF giving is tracked in the organization section
      assert.ok(orgGiving.total_corporate_giving > 0 || orgGiving.total_daf_transfers > 0);
    });

    test('3.2 Bill Gates profile includes Gates Foundation grant in organization section without merging into personal giving', async () => {
      const profile = await getBillionaireProfile('bill-gates');
      const orgGiving = profile.associated_organization_giving;
      assert.ok(orgGiving);

      // Gates Foundation grant ($7B) appears in organization donations
      const foundationDonations = orgGiving.donations.filter(d => d.funding_source_type === 'FOUNDATION');
      assert.ok(foundationDonations.length >= 1, 'Has foundation donation');
      assert.strictEqual(foundationDonations[0].amount, 7000000000);

      // But personal qualifying count reflects individual transfers only
      assert.ok(profile.personal_giving_metrics.lifetime_personal_giving < 7000000000);
    });
  });

  describe('4. Wealth History & Historical Benchmarks (No Fabricated Interpolation)', () => {
    test('4.1 Returns chronological wealth snapshots with benchmark sources and confidence', async () => {
      const profile = await getBillionaireProfile('warren-buffett');
      const wh = profile.wealth_history;
      assert.ok(wh, 'wealth_history exists');
      assert.ok(Array.isArray(wh.snapshots));
      assert.ok(wh.snapshots.length >= 3, 'Has multiple historical snapshots');

      // Verify chronological ordering for charting
      for (let i = 1; i < wh.snapshots.length; i++) {
        const prev = new Date(wh.snapshots[i - 1].snapshot_date);
        const curr = new Date(wh.snapshots[i].snapshot_date);
        assert.ok(curr >= prev, 'Snapshots are chronologically sorted for chart rendering');
      }

      // Check snapshot fields
      const snap = wh.snapshots[0];
      assert.ok(snap.snapshot_date);
      assert.ok(snap.net_worth > 0);
      assert.ok(snap.source_name);
      assert.ok(snap.confidence);
    });
  });

  describe('5. Donation History & Proximity Classification', () => {
    test('5.1 Donation history contains historical net worth and snapshot proximity information', async () => {
      const profile = await getBillionaireProfile('warren-buffett');
      assert.ok(Array.isArray(profile.donations));
      assert.ok(profile.donations.length >= 1);

      const d = profile.donations[0];
      assert.ok(d.donation_date);
      assert.ok(d.amount > 0);
      assert.ok(d.funding_source_type);
      assert.ok(d.status);
      assert.ok(d.historical_net_worth > 0);
      assert.ok(d.historical_percentage > 0);
      assert.ok(d.source_publisher);
      assert.ok(d.source_url);
    });
  });

});
