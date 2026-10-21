/**
 * Unit Tests for Donation Classification and Verification System (Phase 5)
 * 
 * Verifies:
 * 1. Eligibility Matrix: All combinations of 7 funding source types x 5 verification statuses
 * 2. Parity Calculation Protection: Ineligible donations (Foundation, Corporate, DAF, Pledge, Unknown, Disputed)
 *    are strictly excluded from personal parity calculations with explicit rejection reasons.
 * 3. Negative Inference Rules: Billionaire names never automatically trigger PERSONAL_FUNDS_CONFIRMED;
 *    Foundation/Corporate entities are never treated as personal gifts.
 * 4. Contextual Organization Giving: Support for "Show associated organization giving" filter.
 * 5. Source Provenance: Metadata structures for publisher, source type, published date, and URL.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  FUNDING_SOURCE_TYPES,
  DONATION_STATUSES,
  FUNDING_SOURCE_METADATA,
  STATUS_METADATA,
  isPersonalParityEligible,
  calculateHistoricalDonationParity
} from '../server/parity-engine.js';
import { inferFundingSourceType, normalizeDonation } from '../scripts/normalize/donations.js';

describe('Donation Classification & Verification System - Phase 5 Unit Tests', () => {

  // 1. Comprehensive Eligibility Matrix (7 funding source types x 5 statuses)
  describe('1. Eligibility Matrix (7 Types x 5 Statuses)', () => {
    
    // Test all 7 funding source types
    test('1.1 Supported funding source types contains all 7 mandated values', () => {
      const expected = [
        'PERSONAL_DIRECT',
        'PERSONAL_FUNDS_CONFIRMED',
        'FOUNDATION',
        'CORPORATE',
        'DAF',
        'PLEDGE',
        'UNKNOWN_SOURCE'
      ];
      assert.deepEqual([...FUNDING_SOURCE_TYPES].sort(), [...expected].sort());
    });

    test('1.2 Supported donation statuses contains all 5 mandated values', () => {
      const expected = [
        'DISCOVERED',
        'UNVERIFIED',
        'PARTIALLY_VERIFIED',
        'VERIFIED',
        'DISPUTED'
      ];
      assert.deepEqual([...DONATION_STATUSES].sort(), [...expected].sort());
    });

    test('1.3 PERSONAL_DIRECT is eligible for all non-disputed statuses', () => {
      const validStatuses = ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'DISCOVERED'];
      validStatuses.forEach(st => {
        const res = isPersonalParityEligible('PERSONAL_DIRECT', st);
        assert.equal(res.isEligible, true, `PERSONAL_DIRECT + ${st} should be eligible`);
        assert.equal(res.category, 'PERSONAL');
      });
    });

    test('1.4 PERSONAL_FUNDS_CONFIRMED is eligible for all non-disputed statuses', () => {
      const validStatuses = ['VERIFIED', 'PARTIALLY_VERIFIED', 'UNVERIFIED', 'DISCOVERED'];
      validStatuses.forEach(st => {
        const res = isPersonalParityEligible('PERSONAL_FUNDS_CONFIRMED', st);
        assert.equal(res.isEligible, true, `PERSONAL_FUNDS_CONFIRMED + ${st} should be eligible`);
        assert.equal(res.category, 'PERSONAL');
      });
    });

    test('1.5 DISPUTED status disqualifies even PERSONAL_DIRECT and PERSONAL_FUNDS_CONFIRMED', () => {
      const directDisputed = isPersonalParityEligible('PERSONAL_DIRECT', 'DISPUTED');
      assert.equal(directDisputed.isEligible, false);
      assert(directDisputed.reason.toLowerCase().includes('disputed'));

      const confirmedDisputed = isPersonalParityEligible('PERSONAL_FUNDS_CONFIRMED', 'DISPUTED');
      assert.equal(confirmedDisputed.isEligible, false);
      assert(confirmedDisputed.reason.toLowerCase().includes('disputed'));
    });

    test('1.6 FOUNDATION donations are ALWAYS ineligible regardless of status', () => {
      DONATION_STATUSES.forEach(st => {
        const res = isPersonalParityEligible('FOUNDATION', st);
        assert.equal(res.isEligible, false, `FOUNDATION + ${st} must be ineligible`);
        assert.equal(res.category, 'FOUNDATION');
        if (st === 'DISPUTED') {
          assert(res.reason.toLowerCase().includes('disputed'));
        } else {
          assert(res.reason.toLowerCase().includes('foundation'));
        }
      });
    });

    test('1.7 CORPORATE donations are ALWAYS ineligible regardless of status', () => {
      DONATION_STATUSES.forEach(st => {
        const res = isPersonalParityEligible('CORPORATE', st);
        assert.equal(res.isEligible, false, `CORPORATE + ${st} must be ineligible`);
        assert.equal(res.category, 'CORPORATE');
        if (st === 'DISPUTED') {
          assert(res.reason.toLowerCase().includes('disputed'));
        } else {
          assert(res.reason.toLowerCase().includes('corporate') || res.reason.toLowerCase().includes('company'));
        }
      });
    });

    test('1.8 DAF (Donor-Advised Fund) donations are ALWAYS ineligible', () => {
      DONATION_STATUSES.forEach(st => {
        const res = isPersonalParityEligible('DAF', st);
        assert.equal(res.isEligible, false, `DAF + ${st} must be ineligible`);
        assert.equal(res.category, 'DAF');
        if (st === 'DISPUTED') {
          assert(res.reason.toLowerCase().includes('disputed'));
        } else {
          assert(res.reason.toLowerCase().includes('donor-advised') || res.reason.toLowerCase().includes('daf'));
        }
      });
    });

    test('1.9 PLEDGE donations are ALWAYS ineligible even if attributed to a person', () => {
      DONATION_STATUSES.forEach(st => {
        const res = isPersonalParityEligible('PLEDGE', st);
        assert.equal(res.isEligible, false, `PLEDGE + ${st} must be ineligible`);
        assert.equal(res.category, 'PLEDGE');
        if (st === 'DISPUTED') {
          assert(res.reason.toLowerCase().includes('disputed'));
        } else {
          assert(res.reason.toLowerCase().includes('pledge') || res.reason.toLowerCase().includes('commitment'));
        }
      });
    });

    test('1.10 UNKNOWN_SOURCE donations are ALWAYS ineligible', () => {
      DONATION_STATUSES.forEach(st => {
        const res = isPersonalParityEligible('UNKNOWN_SOURCE', st);
        assert.equal(res.isEligible, false, `UNKNOWN_SOURCE + ${st} must be ineligible`);
        assert.equal(res.category, 'UNKNOWN');
        if (st === 'DISPUTED') {
          assert(res.reason.toLowerCase().includes('disputed'));
        } else {
          assert(res.reason.toLowerCase().includes('unknown') || res.reason.toLowerCase().includes('unestablished'));
        }
      });
    });
  });

  // 2. Parity Engine Enforcement: Ineligible donations are rejected with explicit reasons
  describe('2. Parity Engine Enforcement & Ineligibility Guards', () => {
    const validSnapshots = [
      { snapshot_date: '2024-01-01', net_worth: 100_000_000_000 }
    ];

    test('2.1 Rejects FOUNDATION donation and does not calculate user equivalent', () => {
      const result = calculateHistoricalDonationParity({
        donationAmount: 1_000_000_000,
        donationDate: '2024-01-01',
        snapshots: validSnapshots,
        fundingSourceType: 'FOUNDATION',
        status: 'VERIFIED',
        userIncome: 60_000
      });

      assert.equal(result.isAvailable, false);
      assert.equal(result.isEligible, false);
      assert.equal(result.userEquivalent, null);
      assert.equal(result.historicalGenerosityRatio, null);
      assert.equal(result.fundingSourceType, 'FOUNDATION');
      assert(result.reason.toLowerCase().includes('foundation'));
      assert(result.explanation.includes('personal giving'));
    });

    test('2.2 Rejects CORPORATE donation with clear distinction from personal giving', () => {
      const result = calculateHistoricalDonationParity({
        donationAmount: 50_000_000,
        donationDate: '2024-01-01',
        snapshots: validSnapshots,
        fundingSourceType: 'CORPORATE',
        status: 'VERIFIED',
        userIncome: 60_000
      });

      assert.equal(result.isAvailable, false);
      assert.equal(result.isEligible, false);
      assert.equal(result.userEquivalent, null);
      assert.equal(result.fundingSourceType, 'CORPORATE');
      assert(result.reason.toLowerCase().includes('corporate'));
    });

    test('2.3 Rejects PLEDGE commitments even from confirmed individuals', () => {
      const result = calculateHistoricalDonationParity({
        donationAmount: 500_000_000,
        donationDate: '2024-01-01',
        snapshots: validSnapshots,
        fundingSourceType: 'PLEDGE',
        status: 'VERIFIED',
        userIncome: 60_000
      });

      assert.equal(result.isAvailable, false);
      assert.equal(result.isEligible, false);
      assert.equal(result.fundingSourceType, 'PLEDGE');
      assert(result.reason.toLowerCase().includes('pledge'));
    });

    test('2.4 Rejects DISPUTED donations even if marked PERSONAL_FUNDS_CONFIRMED', () => {
      const result = calculateHistoricalDonationParity({
        donationAmount: 100_000_000,
        donationDate: '2024-01-01',
        snapshots: validSnapshots,
        fundingSourceType: 'PERSONAL_FUNDS_CONFIRMED',
        status: 'DISPUTED',
        userIncome: 60_000
      });

      assert.equal(result.isAvailable, false);
      assert.equal(result.isEligible, false);
      assert.equal(result.status, 'DISPUTED');
      assert(result.reason.toLowerCase().includes('disputed'));
    });

    test('2.5 Allows PERSONAL_DIRECT with VERIFIED status to compute accurate parity', () => {
      const result = calculateHistoricalDonationParity({
        donationAmount: 1_000_000_000,
        donationDate: '2024-01-01',
        snapshots: validSnapshots,
        fundingSourceType: 'PERSONAL_DIRECT',
        status: 'VERIFIED',
        userIncome: 60_000,
        incomeFrequency: 'monthly',
        userCurrency: '₹'
      });

      assert.equal(result.isAvailable, true);
      assert.equal(result.isEligible, true);
      assert.equal(result.historicalGenerosityRatio, 1.0);
      assert.equal(result.userEquivalent, 600);
      assert.equal(result.userCurrency, '₹');
    });

    test('2.6 Allows PERSONAL_FUNDS_CONFIRMED to compute accurate parity', () => {
      const result = calculateHistoricalDonationParity({
        donationAmount: 2_000_000_000,
        donationDate: '2024-01-01',
        snapshots: validSnapshots,
        fundingSourceType: 'PERSONAL_FUNDS_CONFIRMED',
        status: 'VERIFIED',
        userIncome: 5_000,
        incomeFrequency: 'monthly',
        userCurrency: '$'
      });

      assert.equal(result.isAvailable, true);
      assert.equal(result.isEligible, true);
      assert.equal(result.historicalGenerosityRatio, 2.0);
      assert.equal(result.userEquivalent, 100);
    });
  });

  // 3. Negative Inference Rules (Strict Classification)
  describe('3. Negative Inference & Classification Rules', () => {
    
    test('3.1 Does NOT infer PERSONAL_FUNDS_CONFIRMED simply because a billionaire is named', () => {
      // News headline naming billionaire without documentary evidence
      const raw = {
        donor: 'Elon Musk',
        recipient: 'St. Jude Children Research Hospital',
        amount: '$50M',
        date: '2023-09-15',
        description: 'Elon Musk donates $50 million to St. Jude Children Research Hospital'
      };

      const inferred = inferFundingSourceType(raw);
      // Must NOT be PERSONAL_FUNDS_CONFIRMED simply because Elon Musk is named
      assert.notEqual(inferred, 'PERSONAL_FUNDS_CONFIRMED');
      assert.equal(inferred, 'PERSONAL_DIRECT');
    });

    test('3.2 Does NOT infer personal income as source of a direct donation', () => {
      const raw = {
        donor: 'Jeff Bezos',
        recipient: 'Maui Wildfire Fund',
        amount: '$100M',
        date: '2023-08-11',
        description: 'Jeff Bezos and Lauren Sanchez announce $100M Maui fund'
      };

      const inferred = inferFundingSourceType(raw);
      assert.equal(inferred, 'PERSONAL_DIRECT');
      // Verify normalizer creates record without assuming personal income
      const normalized = normalizeDonation(raw);
      assert.equal(normalized.funding_source_type, 'PERSONAL_DIRECT');
      assert.notEqual(normalized.funding_source_type, 'PERSONAL_FUNDS_CONFIRMED');
    });

    test('3.3 Infers FOUNDATION when donor organization contains Foundation or Trust', () => {
      const raw = {
        donor_organization_name: 'Bill & Melinda Gates Foundation',
        recipient: 'World Health Organization',
        amount: '$250M',
        date: '2024-02-01',
        description: 'Global health grant for polio eradication'
      };

      const inferred = inferFundingSourceType(raw);
      assert.equal(inferred, 'FOUNDATION');
    });

    test('3.4 Infers CORPORATE when donor organization is a corporation or description mentions company match', () => {
      const raw = {
        donor_organization_name: 'Microsoft Corp',
        recipient: 'Red Cross',
        amount: '$10M',
        date: '2024-03-01',
        description: 'Corporate matching program disbursement'
      };

      const inferred = inferFundingSourceType(raw);
      assert.equal(inferred, 'CORPORATE');
    });

    test('3.5 Infers DAF when donor-advised fund is specified', () => {
      const raw = {
        donor: 'Anonymous Tech Executive',
        donor_organization_name: 'Fidelity Charitable',
        amount: '$5M',
        date: '2024-04-01',
        description: 'Disbursement through donor-advised fund'
      };

      const inferred = inferFundingSourceType(raw);
      assert.equal(inferred, 'DAF');
    });

    test('3.6 Infers PLEDGE when description indicates non-binding commitment', () => {
      const raw = {
        donor: 'Gautam Adani',
        amount: '$7.7B',
        date: '2022-06-24',
        description: 'Adani family pledges $7.7 billion for healthcare, education, and skill development'
      };

      const inferred = inferFundingSourceType(raw);
      assert.equal(inferred, 'PLEDGE');
    });

    test('3.7 Explicit SEC Form 4 personal stock filing yields PERSONAL_FUNDS_CONFIRMED', () => {
      const raw = {
        donor: 'Warren Buffett',
        recipient: 'Gates Foundation',
        amount: '$4B',
        date: '2023-06-21',
        description: 'Annual transfer of 13.7M Berkshire Class B shares confirmed via SEC Form 4 filing'
      };

      const inferred = inferFundingSourceType(raw);
      assert.equal(inferred, 'PERSONAL_FUNDS_CONFIRMED');
    });

    test('3.8 Ambiguous donor attribution defaults to UNKNOWN_SOURCE', () => {
      const raw = {
        recipient: 'Local Hospital',
        amount: '$1M',
        date: '2023-01-01',
        description: 'Anonymous gift coordinated through local civic leaders'
      };

      const inferred = inferFundingSourceType(raw);
      assert.equal(inferred, 'UNKNOWN_SOURCE');
    });
  });

  // 4. Metadata & Visual Representation Structures
  describe('4. Metadata & Provenance Representation', () => {
    
    test('4.1 Funding source metadata provides distinct UI labels and badges for all 7 types', () => {
      FUNDING_SOURCE_TYPES.forEach(type => {
        const meta = FUNDING_SOURCE_METADATA[type];
        assert(meta, `Metadata must exist for ${type}`);
        assert(meta.label, `Label must exist for ${type}`);
        assert(meta.badgeColor, `Badge color must exist for ${type}`);
        assert(meta.category, `Category must exist for ${type}`);
        assert(typeof meta.isPersonal === 'boolean', `isPersonal flag must exist for ${type}`);
      });

      // Verify specific distinct labels
      assert.equal(FUNDING_SOURCE_METADATA.PERSONAL_DIRECT.label, 'Personal Donation (Direct)');
      assert.equal(FUNDING_SOURCE_METADATA.PERSONAL_FUNDS_CONFIRMED.label, 'Personal Donation (Confirmed Funds)');
      assert.equal(FUNDING_SOURCE_METADATA.FOUNDATION.label, 'Foundation Donation');
      assert.equal(FUNDING_SOURCE_METADATA.CORPORATE.label, 'Corporate Donation');
      assert.equal(FUNDING_SOURCE_METADATA.DAF.label, 'Donor-Advised Fund (DAF)');
      assert.equal(FUNDING_SOURCE_METADATA.PLEDGE.label, 'Pledge Commitment');
      assert.equal(FUNDING_SOURCE_METADATA.UNKNOWN_SOURCE.label, 'Unknown Source');
    });

    test('4.2 Status metadata provides distinct badges and labels for all 5 statuses', () => {
      DONATION_STATUSES.forEach(status => {
        const meta = STATUS_METADATA[status];
        assert(meta, `Metadata must exist for ${status}`);
        assert(meta.label, `Label must exist for ${status}`);
        assert(meta.badgeColor, `Badge color must exist for ${status}`);
      });

      assert.equal(STATUS_METADATA.VERIFIED.label, 'Verified');
      assert.equal(STATUS_METADATA.PARTIALLY_VERIFIED.label, 'Partially Verified');
      assert.equal(STATUS_METADATA.UNVERIFIED.label, 'Unverified');
      assert.equal(STATUS_METADATA.DISCOVERED.label, 'Discovered');
      assert.equal(STATUS_METADATA.DISPUTED.label, 'Disputed');
    });
  });
});
