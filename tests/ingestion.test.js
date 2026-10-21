/**
 * Unit Tests for NoCharity Ingestion Framework (Phase 4)
 * 
 * Verifies:
 * 1. Schema normalization & URL/EIN/CIK canonicalization
 * 2. Strict validation rules & invalid record rejection
 * 3. Stable identifier matching (EIN, CIK, canonical URL, canonical name, aliases)
 * 4. Conservative matching & potential duplicate flagging
 * 5. Quality protection rules (preventing downgrade of verified data)
 * 6. Ingestion planning, stats calculation, and dry-run execution
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  createNormalizedPerson,
  createNormalizedOrganization,
  createNormalizedSource,
  createNormalizedWealthSnapshot,
  createNormalizedDonation,
  cleanUrl,
  cleanEin,
  cleanCik
} from '../scripts/normalize/schemas.js';

import {
  normalizePerson,
  normalizeOrganization,
  normalizeSource,
  normalizeWealthSnapshot,
  normalizeDonation
} from '../scripts/normalize/index.js';

import {
  validatePerson,
  validateOrganization,
  validateSource,
  validateWealthSnapshot,
  validateDonation,
  validateRecord
} from '../scripts/validate/index.js';

import {
  matchPerson,
  matchOrganization,
  matchSource,
  matchWealthSnapshot,
  matchDonation,
  canOverwriteField
} from '../scripts/normalize/deduplicate.js';

import { planIngestion } from '../scripts/db/upsert.js';

describe('NoCharity Ingestion Framework - Phase 4 Unit Tests', () => {

  // 1. Schema Normalization & Cleaning
  describe('1. Normalization & Canonicalization', () => {
    test('1.1 Canonicalizes URLs and strips tracking parameters', () => {
      const raw = 'HTTPS://WWW.BLOOMBERG.COM/profiles/warren-buffett/?utm_source=twitter&utm_medium=social&ref=123';
      const cleaned = cleanUrl(raw);
      assert.equal(cleaned, 'https://bloomberg.com/profiles/warren-buffett/');
    });

    test('1.2 Standardizes US EIN into XX-XXXXXXX', () => {
      assert.equal(cleanEin('911909341'), '91-1909341');
      assert.equal(cleanEin('91-1909341'), '91-1909341');
      assert.equal(cleanEin('invalid-ein'), null);
      assert.equal(cleanEin('123'), null);
    });

    test('1.3 Standardizes SEC CIK into zero-padded 10 digits', () => {
      assert.equal(cleanCik('1092657'), '0001092657');
      assert.equal(cleanCik('0001092657'), '0001092657');
      assert.equal(cleanCik(''), null);
    });

    test('1.4 Normalizes Person: splits first/last name, deduplicates aliases', () => {
      const normalized = normalizePerson({
        name: 'Warren Edward Buffett',
        aliases: ['Warren Buffett', 'Oracle of Omaha', 'Warren Buffett']
      });

      assert.equal(normalized.canonical_name, 'Warren Edward Buffett');
      assert.equal(normalized.first_name, 'Warren Edward');
      assert.equal(normalized.last_name, 'Buffett');
      assert.equal(normalized.aliases.length, 2);
      assert(normalized.aliases.includes('Warren Buffett'));
      assert(normalized.aliases.includes('Oracle of Omaha'));
    });

    test('1.5 Normalizes Organization: infers foundation type and standardizes fields', () => {
      const org = normalizeOrganization({
        name: 'The Susan Thompson Buffett Foundation',
        ein: '470553264'
      });

      assert.equal(org.legal_name, 'The Susan Thompson Buffett Foundation');
      assert.equal(org.organization_type, 'FOUNDATION');
      assert.equal(org.ein, '47-0553264');
    });

    test('1.6 Normalizes Wealth Snapshot: parses string billions and formats dates', () => {
      const snap = normalizeWealthSnapshot({
        person: 'Warren Buffett',
        net_worth: '$135.5 Billion',
        date: '2025-06-28T14:30:00Z'
      });

      assert.equal(snap.person_name, 'Warren Buffett');
      assert.equal(snap.net_worth, 135_500_000_000);
      assert.equal(snap.snapshot_date, '2025-06-28');
    });

    test('1.7 Normalizes Donation: parses amount, dates, and infers funding_source_type', () => {
      const donation = normalizeDonation({
        donor: 'Warren Buffett',
        recipient: 'Gates Foundation',
        amount: '$5.3B',
        date: '2025-06-28',
        description: 'Stock transfer of Berkshire Class B shares confirmed via Form 4'
      });

      assert.equal(donation.donor_person_name, 'Warren Buffett');
      assert.equal(donation.amount, 5_300_000_000);
      assert.equal(donation.donation_date, '2025-06-28');
      assert.equal(donation.funding_source_type, 'PERSONAL_FUNDS_CONFIRMED');
    });
  });

  // 2. Strict Validation Rules
  describe('2. Validation Rules & Constraint Checks', () => {
    test('2.1 Rejects Person with missing or empty canonical_name', () => {
      const res = validatePerson({ canonical_name: '' });
      assert.equal(res.isValid, false);
      assert(res.errors[0].includes('canonical_name is required'));
    });

    test('2.2 Rejects invalid date formats', () => {
      const res = validateDonation({
        donor_person_name: 'Buffett',
        amount: 1000,
        donation_date: '2024-02-31' // Invalid leap year day
      });
      assert.equal(res.isValid, false);
      assert(res.errors.some(e => e.includes('Invalid or missing donation_date')));
    });

    test('2.3 Rejects non-positive net worth or donation amount', () => {
      const snapRes = validateWealthSnapshot({
        person_name: 'Buffett',
        snapshot_date: '2024-01-01',
        net_worth: -500
      });
      assert.equal(snapRes.isValid, false);

      const donRes = validateDonation({
        donor_person_name: 'Buffett',
        donation_date: '2024-01-01',
        amount: 0
      });
      assert.equal(donRes.isValid, false);
    });

    test('2.4 Rejects invalid enum options for organization_type and source_type', () => {
      const orgRes = validateOrganization({
        legal_name: 'Test Org',
        organization_type: 'INVALID_TYPE'
      });
      assert.equal(orgRes.isValid, false);

      const srcRes = validateSource({
        url: 'https://example.com/test',
        publisher: 'Test Pub',
        source_type: 'BLOG_POST'
      });
      assert.equal(srcRes.isValid, false);
    });
  });

  // 3. Deduplication & Stable Identifier Matching
  describe('3. Deduplication & Stable Identifiers', () => {
    test('3.1 Matches Organization by stable EIN', () => {
      const existing = [
        { id: 'org-1', legal_name: 'Bill & Melinda Gates Foundation', ein: '91-1909341' }
      ];
      const incoming = { legal_name: 'Gates Foundation', ein: '91-1909341' };
      const match = matchOrganization(incoming, existing);

      assert.equal(match.matchType, 'EXACT');
      assert.equal(match.matchedBy, 'EIN');
      assert.equal(match.existing.id, 'org-1');
    });

    test('3.2 Matches Organization by stable CIK', () => {
      const existing = [
        { id: 'org-2', legal_name: 'Berkshire Hathaway Inc', cik: '0001092657' }
      ];
      const incoming = { legal_name: 'Berkshire Hathaway', cik: '0001092657' };
      const match = matchOrganization(incoming, existing);

      assert.equal(match.matchType, 'EXACT');
      assert.equal(match.matchedBy, 'CIK');
    });

    test('3.3 Matches Source by canonical clean URL', () => {
      const existing = [
        { id: 'src-1', url: 'https://bloomberg.com/profiles/warren-buffett' }
      ];
      const incoming = {
        url: 'HTTPS://WWW.BLOOMBERG.COM/profiles/warren-buffett/?ref=twitter'
      };
      const match = matchSource(incoming, existing);

      assert.equal(match.matchType, 'EXACT');
      assert.equal(match.matchedBy, 'CANONICAL_URL');
    });

    test('3.4 Matches Person by alias', () => {
      const existing = [
        { id: 'p-1', canonical_name: 'Warren Buffett', aliases: ['Warren E. Buffett', 'Oracle of Omaha'] }
      ];
      const incoming = { canonical_name: 'Warren E. Buffett' };
      const match = matchPerson(incoming, existing);

      assert.equal(match.matchType, 'EXACT');
      assert.equal(match.matchedBy, 'EXISTING_ALIAS');
    });

    test('3.5 Matches Wealth Snapshot by composite (person_id, snapshot_date)', () => {
      const existing = [
        { id: 'ws-1', person_id: 'p-1', snapshot_date: '2025-06-28', net_worth: 135_000_000_000 }
      ];
      const incoming = { snapshot_date: '2025-06-28', net_worth: 135_000_000_000 };
      const match = matchWealthSnapshot(incoming, existing, 'p-1');

      assert.equal(match.matchType, 'EXACT');
      assert.equal(match.matchedBy, 'PERSON_AND_DATE');
    });
  });

  // 4. Conservative Matching & Potential Duplicate Detection
  describe('4. Conservative Matching (Flags Potential Duplicates)', () => {
    test('4.1 Flags Person potential duplicate with close Levenshtein distance', () => {
      const existing = [
        { id: 'p-1', canonical_name: 'MacKenzie Scott' }
      ];
      // Close typo / casing
      const incoming = { canonical_name: 'MacKenzie Scot' };
      const match = matchPerson(incoming, existing);

      assert.equal(match.matchType, 'POTENTIAL_DUPLICATE');
      assert(match.reason.includes('edit distance'));
    });

    test('4.2 Flags Organization potential duplicate on suffix-stripped name without EIN', () => {
      const existing = [
        { id: 'org-1', legal_name: 'The Gates Foundation Trust' }
      ];
      const incoming = { legal_name: 'Gates Foundation' };
      const match = matchOrganization(incoming, existing);

      assert.equal(match.matchType, 'POTENTIAL_DUPLICATE');
    });

    test('4.3 Flags Donation potential duplicate within 14-day window for same donor & amount', () => {
      const existing = [
        {
          id: 'don-1',
          donor_person_id: 'p-1',
          amount: 5_300_000_000,
          donation_date: '2025-06-28'
        }
      ];
      const incoming = {
        amount: 5_300_000_000,
        donation_date: '2025-07-02' // 4 days later
      };
      const match = matchDonation(incoming, existing, 'p-1', null);

      assert.equal(match.matchType, 'POTENTIAL_DUPLICATE');
      assert(match.reason.includes('14 days'));
    });
  });

  // 5. Quality Protection Rules
  describe('5. Quality Protection Rules', () => {
    test('5.1 Lower-quality source tier cannot overwrite higher-quality source tier', () => {
      // PRIMARY_REGULATORY (weight 5) vs SECONDARY_NEWS (weight 2)
      assert.equal(canOverwriteField('PRIMARY_REGULATORY', 'SECONDARY_NEWS', 'SOURCE_TIER'), false);
      assert.equal(canOverwriteField('SECONDARY_NEWS', 'PRIMARY_REGULATORY', 'SOURCE_TIER'), true);
      assert.equal(canOverwriteField('PRIMARY_REGULATORY', 'PRIMARY_REGULATORY', 'SOURCE_TIER'), true);
    });

    test('5.2 Lower wealth confidence cannot overwrite higher confidence', () => {
      // HIGH (weight 4) vs ESTIMATE (weight 2)
      assert.equal(canOverwriteField('HIGH', 'ESTIMATE', 'WEALTH_CONFIDENCE'), false);
      assert.equal(canOverwriteField('ESTIMATE', 'HIGH', 'WEALTH_CONFIDENCE'), true);
    });

    test('5.3 Lower donation status cannot overwrite VERIFIED donation', () => {
      assert.equal(canOverwriteField('VERIFIED', 'PENDING', 'DONATION_STATUS'), false);
      assert.equal(canOverwriteField('PENDING', 'VERIFIED', 'DONATION_STATUS'), true);
    });

    test('5.4 Existing non-null fields cannot be overwritten by null or empty values', () => {
      assert.equal(canOverwriteField('1930-08-30', null, 'GENERIC'), false);
      assert.equal(canOverwriteField('1930-08-30', '', 'GENERIC'), false);
      assert.equal(canOverwriteField(null, '1930-08-30', 'GENERIC'), true);
    });
  });

  // 6. Ingestion Plan & Dry-Run Execution
  describe('6. Ingestion Plan & Dry-Run Statistics', () => {
    test('6.1 Computes exact statistics across new, updated, duplicate, and invalid records', () => {
      const existingDataset = {
        people: [
          { id: 'p-1', canonical_name: 'Warren Buffett', description: null, aliases: [] }
        ],
        organizations: [],
        sources: [],
        wealthSnapshots: [],
        donations: []
      };

      const incomingData = {
        people: [
          // 1. Existing person updated with description
          createNormalizedPerson({
            canonical_name: 'Warren Buffett',
            description: 'Legendary CEO of Berkshire Hathaway'
          }),
          // 2. New person
          createNormalizedPerson({
            canonical_name: 'Azim Premji',
            country: 'India'
          }),
          // 3. Potential duplicate of Warren Buffett
          createNormalizedPerson({
            canonical_name: 'Warren Bufft' // close typo
          }),
          // 4. Invalid person (empty name)
          { entity_type: 'PERSON', canonical_name: '' }
        ],
        organizations: [],
        sources: [],
        wealthSnapshots: [],
        donations: []
      };

      const plan = planIngestion({
        incomingData,
        existingDataset,
        options: { dryRun: true }
      });

      assert.equal(plan.dryRun, true);
      assert.equal(plan.stats.newPeople, 1);       // Azim Premji
      assert.equal(plan.stats.updatedPeople, 1);   // Warren Buffett
      assert.equal(plan.stats.potentialDuplicates, 1); // Warren Bufft
      assert.equal(plan.stats.invalidRecords, 1);  // Empty name
      assert.equal(plan.operations.peopleToInsert.length, 1);
      assert.equal(plan.operations.peopleToUpdate.length, 1);
    });
  });
});
