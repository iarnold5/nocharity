/**
 * NoCharity Advanced Mode (Phase 6) — Multi-View & Navigation Test Suite
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import express from 'express';
import {
  getDashboardMetrics,
  getPeople,
  getPersonById,
  getDonations,
  getRankings,
  getWealthHistory,
  getPersonOrganizations
} from '../server/data-access.js';
import { calculateDonationParity } from '../mcp-server.js';
import { INITIAL_BILLIONAIRES } from '../public/js/data.js';

describe('NoCharity Advanced Mode — Phase 6 Integration Tests', () => {

  describe('1. Advanced Dashboard Metrics', () => {
    test('1.1 Returns documented metrics with all 6 required KPI values', async () => {
      const data = await getDashboardMetrics();
      assert.ok(data, 'Dashboard response exists');
      const m = data.documentedMetrics;
      assert.ok(m, 'Documented metrics object exists');
      assert.strictEqual(typeof m.trackedBillionairesCount, 'number');
      assert.ok(m.trackedBillionairesCount >= 4, 'Has at least 4 billionaires');
      assert.strictEqual(typeof m.documentedPersonalDonationsCount, 'number');
      assert.ok(m.documentedPersonalDonationsCount >= 1, 'Has documented personal donations');
      assert.strictEqual(typeof m.documentedPersonalGivingTotal, 'number');
      assert.ok(m.documentedPersonalGivingTotal > 0, 'Documented personal giving is positive');
      assert.strictEqual(typeof m.verifiedDonationsCount, 'number');
      assert.strictEqual(typeof m.sourcesCount, 'number');
      assert.ok(m.latestDataDate, 'Has latest data date');
    });

    test('1.2 Contains explicit documented disclaimer notice', async () => {
      const data = await getDashboardMetrics();
      assert.ok(data.notice, 'Notice disclaimer exists');
      assert.ok(data.notice.includes('documented'), 'States figures are documented');
      assert.ok(data.notice.includes('regulatory'), 'Mentions regulatory filings');
    });

    test('1.3 Clearly distinguishes personal giving total from foundation & corporate giving', async () => {
      const data = await getDashboardMetrics();
      const m = data.documentedMetrics;
      assert.ok(m.totalFoundationGiving !== undefined, 'Foundation giving total tracked');
      assert.ok(m.totalCorporateGiving !== undefined, 'Corporate giving total tracked');
      assert.ok(m.totalDafTransfers !== undefined, 'DAF transfers tracked');
      assert.ok(m.totalPledges !== undefined, 'Pledges tracked');
    });
  });

  describe('2. Billionaire Explorer & Multi-Dimensional Filters', () => {
    test('2.1 Retrieves paginated list of billionaires with wealth and giving ratios', async () => {
      const res = await getPeople({ limit: 10, offset: 0 });
      assert.ok(res.people.length > 0, 'Returns people');
      assert.ok(res.totalCount >= res.people.length, 'Total count valid');
      const p = res.people[0];
      assert.ok(p.canonical_name, 'Has canonical name');
      assert.ok(p.latest_net_worth !== undefined, 'Has latest net worth');
      assert.ok(p.total_personal_giving !== undefined, 'Has total personal giving');
      assert.ok(p.lifetime_personal_giving_ratio !== undefined, 'Has giving ratio');
    });

    test('2.2 Filters by search query', async () => {
      const res = await getPeople({ search: 'Buffett' });
      assert.ok(res.people.length >= 1, 'Found Buffett');
      assert.ok(res.people.some(p => p.canonical_name.includes('Buffett')));
    });

    test('2.3 Filters by Giving Pledge status', async () => {
      const resPledge = await getPeople({ givingPledge: true });
      assert.ok(resPledge.people.length >= 1, 'Returns pledge signatories');
      assert.ok(resPledge.people.every(p => p.giving_pledge === true));

      const resNonPledge = await getPeople({ givingPledge: false });
      assert.ok(resNonPledge.people.every(p => p.giving_pledge === false));
    });

    test('2.4 Filters by Country and Industry', async () => {
      const resCountry = await getPeople({ country: 'United States' });
      assert.ok(resCountry.people.length >= 1, 'Returns US billionaires');
      assert.ok(resCountry.people.every(p => p.country && p.country.includes('United States')));

      const resTech = await getPeople({ industry: 'Technology' });
      assert.ok(resTech.people.length >= 1, 'Returns Tech billionaires');
      assert.ok(resTech.people.every(p => p.industry && p.industry.toLowerCase().includes('tech')));
    });

    test('2.5 Sorts by Net Worth and Documented Personal Giving', async () => {
      const resWealth = await getPeople({ sortBy: 'net_worth', sortOrder: 'desc', limit: 5 });
      assert.ok(resWealth.people.length >= 2);
      for (let i = 1; i < resWealth.people.length; i++) {
        assert.ok(Number(resWealth.people[i - 1].latest_net_worth) >= Number(resWealth.people[i].latest_net_worth));
      }

      const resGiving = await getPeople({ sortBy: 'personal_giving', sortOrder: 'desc', limit: 5 });
      assert.ok(resGiving.people.length >= 2);
      for (let i = 1; i < resGiving.people.length; i++) {
        assert.ok(Number(resGiving.people[i - 1].total_personal_giving) >= Number(resGiving.people[i].total_personal_giving));
      }
    });
  });

  describe('3. Donation Explorer & Attribution Isolation', () => {
    test('3.1 Default query strictly excludes corporate and foundation gifts from personal parity', async () => {
      const res = await getDonations({ includeAssociatedOrgGiving: false });
      assert.ok(res.donations.length > 0, 'Returns personal donations');
      res.donations.forEach(d => {
        assert.ok(
          ['PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'].includes(d.funding_source_type),
          `Expected personal funding source type, got ${d.funding_source_type}`
        );
      });
    });

    test('3.2 "Include foundations and companies" mode exposes contextual organization giving', async () => {
      const res = await getDonations({ includeAssociatedOrgGiving: true });
      assert.ok(res.donations.length > 0);
      const types = new Set(res.donations.map(d => d.funding_source_type));
      assert.ok(types.has('FOUNDATION') || types.has('CORPORATE') || types.has('DAF'), 'Contains organization giving');
    });

    test('3.3 Filters by specific billionaire ID', async () => {
      const people = await getPeople({ limit: 1 });
      const target = people.people[0];
      const res = await getDonations({ personId: target.person_id, includeAssociatedOrgGiving: true });
      assert.ok(Array.isArray(res.donations));
      res.donations.forEach(d => {
        assert.ok(
          d.donor_person_id === target.person_id || d.recipient_person_id === target.person_id,
          'Donation matches target person'
        );
      });
    });

    test('3.4 Filters by status and funding source type', async () => {
      const resVerified = await getDonations({ status: 'VERIFIED', includeAssociatedOrgGiving: true });
      assert.ok(resVerified.donations.every(d => d.status === 'VERIFIED'));

      const resFoundation = await getDonations({ fundingSourceType: 'FOUNDATION', includeAssociatedOrgGiving: true });
      assert.ok(resFoundation.donations.every(d => d.funding_source_type === 'FOUNDATION'));
    });

    test('3.5 Supports pagination and does not load entire database', async () => {
      const resPage1 = await getDonations({ limit: 5, offset: 0, includeAssociatedOrgGiving: true });
      assert.strictEqual(resPage1.donations.length, 5);

      const resPage2 = await getDonations({ limit: 5, offset: 5, includeAssociatedOrgGiving: true });
      assert.ok(resPage2.donations.length <= 5);
      if (resPage2.donations.length > 0) {
        assert.notStrictEqual(resPage1.donations[0].id, resPage2.donations[0].id);
      }
    });
  });

  describe('4. Leaderboard Rankings', () => {
    test('4.1 Computes rankings by Documented Personal Giving', async () => {
      const res = await getRankings({ metric: 'personal_giving', limit: 10 });
      assert.ok(res.rankings.length >= 2);
      for (let i = 1; i < res.rankings.length; i++) {
        assert.ok(Number(res.rankings[i - 1].total_personal_giving) >= Number(res.rankings[i].total_personal_giving));
      }
    });

    test('4.2 Computes rankings by Generosity Ratio', async () => {
      const res = await getRankings({ metric: 'giving_ratio', limit: 10 });
      assert.ok(res.rankings.length >= 2);
      for (let i = 1; i < res.rankings.length; i++) {
        const prev = res.rankings[i - 1].peak_donation_percentage?.percentage ?? 0;
        const curr = res.rankings[i].peak_donation_percentage?.percentage ?? 0;
        assert.ok(prev >= curr);
      }
    });

    test('4.3 Computes rankings by Net Worth', async () => {
      const res = await getRankings({ metric: 'net_worth', limit: 10 });
      assert.ok(res.rankings.length >= 2);
      for (let i = 1; i < res.rankings.length; i++) {
        assert.ok(Number(res.rankings[i - 1].latest_net_worth) >= Number(res.rankings[i].latest_net_worth));
      }
    });
  });

  describe('5. Individual Billionaire Profile View Data', () => {
    test('5.1 Returns profile with giving summary, tags, organizations, and wealth history', async () => {
      const people = await getPeople({ limit: 1 });
      const personId = people.people[0].person_id;

      const profile = await getPersonById(personId);
      assert.ok(profile, 'Profile retrieved');
      assert.strictEqual(profile.person_id, personId);
      assert.ok(profile.canonical_name, 'Has canonical name');

      const orgs = await getPersonOrganizations(personId);
      assert.ok(Array.isArray(orgs), 'Organizations returned as array');

      const wealth = await getWealthHistory(personId);
      assert.ok(Array.isArray(wealth.snapshots), 'Wealth snapshots returned as array');
    });
  });

  describe('6. Zero Breaking Changes to Basic Meme Mode', () => {
    test('6.1 Basic Mode dataset INITIAL_BILLIONAIRES remains intact with all 17 billionaires', () => {
      assert.strictEqual(INITIAL_BILLIONAIRES.length, 17);
      const names = INITIAL_BILLIONAIRES.map(b => b.name);
      assert.ok(names.includes('Warren Buffett'));
      assert.ok(names.includes('Bill Gates'));
      assert.ok(names.includes('MacKenzie Scott'));
      assert.ok(names.includes('Elon Musk'));
      assert.ok(names.includes('Bernard Arnault & Family'));
    });

    test('6.2 Basic Mode calculateDonationParity function operates identically without regressions', () => {
      const mockBillionaire = {
        id: 'warren-buffett',
        netWorth: 100_000_000_000,
        estimatedAnnualIncome: 10_000_000_000
      };
      const basicParity = calculateDonationParity(mockBillionaire, 1_000_000_000, 4000, '$', 'networth');
      assert.ok(basicParity);
      assert.strictEqual(basicParity.percentage, 1.0);
      assert.strictEqual(basicParity.userEquivalentMonthly, 40);
      assert.strictEqual(basicParity.userEquivalentAnnual, 480);
      assert.strictEqual(basicParity.baseMetricLabel, 'Total Net Worth');
    });
  });

});
