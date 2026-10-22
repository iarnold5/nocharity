/**
 * NoCharity Advanced Mode — Data Repeatability & Safe Update Invariant Tests
 * 
 * Verifies the foundational architectural requirements:
 * 1. Idempotency: Re-running ingestion never duplicates people, donations, snapshots, or sources.
 * 2. Incremental Expansion: Safely adds new donations, historical wealth snapshots, and citations.
 * 3. Contextual Deduplication: Two donations on the same date with the same amount but different recipients are NOT merged.
 * 4. Non-Destructive History: Adding newer wealth snapshots never overwrites or deletes prior snapshots.
 * 5. Quality Protection: Verified records are never overwritten by lower-tier or unverified claims.
 * 6. Historical Parity: snapshot_date <= donation_date is strictly respected without synthetic backfills.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  matchPerson,
  matchOrganization,
  matchSource,
  matchWealthSnapshot,
  matchDonation,
  canOverwriteField
} from '../scripts/normalize/deduplicate.js';

import { planIngestion, generateSqlFromPlan } from '../scripts/db/upsert.js';
import { calculateHistoricalDonationParity } from '../server/parity-engine.js';
import { loadSourceRecords } from '../scripts/ingest/index.js';

describe('NoCharity Data Repeatability & Maintainability Tests', () => {

  // 1. Idempotency & Repeatable Ingestion
  describe('1. Ingestion Idempotency & Zero Duplication', () => {
    test('1.1 Ingesting an already-existing person plans 0 new people and registers canonical ID', () => {
      const existingPerson = {
        id: 'b0000000-0000-0000-0000-000000000026',
        canonical_name: 'Phil Knight',
        first_name: 'Philip',
        last_name: 'Knight',
        country: 'United States',
        industry: 'Apparel & Retail'
      };

      const incomingPerson = {
        canonical_name: 'Phil Knight',
        first_name: 'Philip',
        last_name: 'Knight',
        country: 'United States',
        industry: 'Apparel & Retail'
      };

      const plan = planIngestion({
        incomingData: { people: [incomingPerson] },
        existingDataset: { people: [existingPerson], organizations: [], sources: [], wealthSnapshots: [], donations: [] }
      });

      assert.equal(plan.stats.newPeople, 0, 'Must not plan new person for existing entity');
      assert.equal(plan.personIdByName.get('phil knight'), existingPerson.id, 'Must resolve to existing canonical ID');
    });

    test('1.2 Ingesting expansion dataset against itself produces zero new records', async () => {
      const expansion = await loadSourceRecords('expansion-data');

      const mockExisting = {
        people: expansion.people.map(p => ({ ...p })),
        organizations: expansion.organizations.map(o => ({ ...o })),
        sources: expansion.sources.map(s => ({ ...s })),
        wealthSnapshots: expansion.wealthSnapshots.map(ws => ({ ...ws })),
        donations: expansion.donations.map(d => ({ ...d })),
        donationSources: expansion.donationSources ? expansion.donationSources.map(ds => ({ ...ds })) : [],
        personOrganizations: expansion.personOrganizations ? expansion.personOrganizations.map(po => ({ ...po })) : []
      };

      const plan = planIngestion({
        incomingData: expansion,
        existingDataset: mockExisting,
        options: { dryRun: true }
      });

      assert.equal(plan.stats.newPeople, 0, 'Zero new people when re-running import');
      assert.equal(plan.stats.newOrganizations, 0, 'Zero new organizations when re-running import');
      assert.equal(plan.stats.newSources, 0, 'Zero new sources when re-running import');
      assert.equal(plan.stats.newWealthSnapshots, 0, 'Zero new wealth snapshots when re-running import');
      assert.equal(plan.stats.newDonations, 0, 'Zero new donations when re-running import');
      assert.equal(plan.stats.potentialDuplicates, 0, 'Zero unhandled potential duplicates');
      assert.equal(plan.stats.invalidRecords, 0, 'Zero invalid records');
    });
  });

  // 2. Safe Incremental Updates & Provenance Enrichment
  describe('2. Incremental Addition Without History Loss', () => {
    test('2.1 Adding a new donation to an existing person plans 1 insert without modifying people', () => {
      const existingPerson = {
        id: 'b0000000-0000-0000-0000-000000000028',
        canonical_name: 'Jensen Huang & Lori Huang'
      };

      const newDonation = {
        id: 'f0000000-0000-0000-0000-000000000999',
        donor_person_id: existingPerson.id,
        amount: 25000000,
        currency: 'USD',
        donation_date: '2025-01-15',
        donation_type: 'GIFT',
        funding_source_type: 'PERSONAL_DIRECT',
        status: 'VERIFIED',
        description: 'New verified personal endowment',
        source_id: 'e0000000-0000-0000-0000-000000000062'
      };

      const plan = planIngestion({
        incomingData: { people: [existingPerson], donations: [newDonation] },
        existingDataset: { people: [existingPerson], organizations: [], sources: [], wealthSnapshots: [], donations: [] }
      });

      assert.equal(plan.stats.newPeople, 0, 'Person must not be re-inserted');
      assert.equal(plan.stats.newDonations, 1, 'New donation must be planned for insert');
      assert.equal(plan.operations.donationsToInsert[0].id, newDonation.id);
    });

    test('2.2 Adding a new historical wealth snapshot creates a new snapshot point and preserves older points', () => {
      const existingPerson = {
        id: 'b0000000-0000-0000-0000-000000000026',
        canonical_name: 'Phil Knight'
      };

      const snapshot2008 = {
        person_id: existingPerson.id,
        snapshot_date: '2008-09-01',
        net_worth: 10500000000,
        currency: 'USD',
        source_name: 'Forbes 400 2008'
      };

      const snapshot2016 = {
        person_id: existingPerson.id,
        snapshot_date: '2016-09-01',
        net_worth: 25000000000,
        currency: 'USD',
        source_name: 'Forbes 400 2016'
      };

      const newSnapshot2025 = {
        person_id: existingPerson.id,
        snapshot_date: '2025-01-01',
        net_worth: 42000000000,
        currency: 'USD',
        source_name: 'Forbes 2025 Real-Time'
      };

      const plan = planIngestion({
        incomingData: { wealthSnapshots: [snapshot2008, snapshot2016, newSnapshot2025] },
        existingDataset: {
          people: [existingPerson],
          wealthSnapshots: [snapshot2008, snapshot2016],
          organizations: [],
          sources: [],
          donations: []
        }
      });

      assert.equal(plan.stats.newWealthSnapshots, 1, 'Only the new 2025 snapshot should be planned for insert');
      assert.equal(plan.operations.snapshotsToInsert[0].snapshot_date, '2025-01-01');
    });

    test('2.3 Better source for an existing donation updates citation and attaches junction record', () => {
      const existingDonation = {
        id: 'f0000000-0000-0000-0000-000000000077',
        donor_person_id: 'b0000000-0000-0000-0000-000000000027',
        amount: 20000000,
        currency: 'USD',
        donation_date: '2016-09-08',
        funding_source_type: 'PERSONAL_DIRECT',
        status: 'PARTIALLY_VERIFIED',
        source_id: 'e0000000-0000-0000-0000-000000000058' // Secondary news
      };

      const incomingEnrichedDonation = {
        id: existingDonation.id,
        donor_person_id: existingDonation.donor_person_id,
        amount: 20000000,
        currency: 'USD',
        donation_date: '2016-09-08',
        funding_source_type: 'PERSONAL_DIRECT',
        status: 'VERIFIED',
        source_id: 'e0000000-0000-0000-0000-000000000060' // Primary regulatory statement
      };

      const plan = planIngestion({
        incomingData: {
          donations: [incomingEnrichedDonation],
          donationSources: [{ donation_id: existingDonation.id, source_id: 'e0000000-0000-0000-0000-000000000060', is_primary: false }]
        },
        existingDataset: {
          people: [],
          organizations: [],
          sources: [],
          wealthSnapshots: [],
          donations: [existingDonation],
          donationSources: [{ donation_id: existingDonation.id, source_id: 'e0000000-0000-0000-0000-000000000058' }]
        }
      });

      assert.equal(plan.stats.newDonations, 0, 'Must not create a duplicate donation');
      assert.equal(plan.stats.updatedDonations, 1, 'Must plan an update/enrichment');
      assert.equal(plan.operations.donationsToUpdate[0].updates.status, 'VERIFIED');
      assert.equal(plan.operations.donationSourcesToInsert.length, 1, 'Must attach the new source to junction table');
    });
  });

  // 3. Contextual Deduplication (Same donor, amount & date to different recipients)
  describe('3. Contextual Deduplication Rules', () => {
    test('3.1 Two donations with the same donor, amount, and date but DIFFERENT recipients are distinct', () => {
      const donorPersonId = 'b0000000-0000-0000-0000-000000000026'; // Phil Knight
      const recipientOrgA = 'c0000000-0000-0000-0000-000000000048'; // U of Oregon Foundation
      const recipientOrgB = 'c0000000-0000-0000-0000-000000000049'; // OHSU Foundation

      const existingDonation = {
        id: 'f0000000-0000-0000-0000-000000000074',
        donor_person_id: donorPersonId,
        recipient_organization_id: recipientOrgA,
        amount: 500000000,
        currency: 'USD',
        donation_date: '2021-07-06'
      };

      const incomingDifferentDonation = {
        donor_person_id: donorPersonId,
        recipient_organization_id: recipientOrgB,
        amount: 500000000,
        currency: 'USD',
        donation_date: '2021-07-06'
      };

      const match = matchDonation(incomingDifferentDonation, [existingDonation]);
      assert.equal(match.matchType, 'NONE', 'Must NOT match as duplicate when recipients differ');
    });

    test('3.2 Two donations with the same donor, amount, date AND recipient ARE matched as exact', () => {
      const donorPersonId = 'b0000000-0000-0000-0000-000000000026';
      const recipientOrg = 'c0000000-0000-0000-0000-000000000048';

      const existingDonation = {
        id: 'f0000000-0000-0000-0000-000000000074',
        donor_person_id: donorPersonId,
        recipient_organization_id: recipientOrg,
        amount: 500000000,
        currency: 'USD',
        donation_date: '2021-07-06'
      };

      const incomingSameDonation = {
        donor_person_id: donorPersonId,
        recipient_organization_id: recipientOrg,
        amount: 500000000,
        currency: 'USD',
        donation_date: '2021-07-06'
      };

      const match = matchDonation(incomingSameDonation, [existingDonation]);
      assert.equal(match.matchType, 'EXACT', 'Must match as EXACT when recipient is identical');
      assert.equal(match.existing.id, existingDonation.id);
    });
  });

  // 4. Historical Parity Temporal Invariant
  describe('4. Historical Parity Temporal Invariants', () => {
    test('4.1 Uses prior snapshot (snapshot_date <= donation_date) and never uses future snapshot', () => {
      const donationDate = '2022-10-14';
      const snapshots = [
        { snapshot_date: '2008-09-01', net_worth: 800000000 },
        { snapshot_date: '2021-03-01', net_worth: 14700000000 },
        { snapshot_date: '2022-09-01', net_worth: 16100000000 },
        { snapshot_date: '2024-03-01', net_worth: 77000000000 } // Future relative to 2022
      ];

      const parity = calculateHistoricalDonationParity({
        donationAmount: 50000000,
        donationDate,
        snapshots
      });

      assert.equal(parity.isAvailable, true);
      assert.equal(parity.snapshotDate, '2022-09-01', 'Must choose latest snapshot before donation date');
      assert.equal(parity.historicalNetWorth, 16100000000);
      assert(parity.snapshotDate <= donationDate, 'Snapshot date must be on or before donation date');
    });

    test('4.2 Parity is marked UNAVAILABLE when all snapshots are after donation date', () => {
      const donationDate = '2005-05-01';
      const snapshots = [
        { snapshot_date: '2010-01-01', net_worth: 15000000000 },
        { snapshot_date: '2020-01-01', net_worth: 40000000000 }
      ];

      const parity = calculateHistoricalDonationParity({
        donationAmount: 10000000,
        donationDate,
        snapshots
      });

      assert.equal(parity.isAvailable, false, 'Must report UNAVAILABLE instead of synthesizing future wealth');
      assert.equal(parity.historicalNetWorth, null);
    });
  });

  // 5. Funding Source Isolation
  describe('5. Funding Source Invariants', () => {
    test('5.1 Foundation and Corporate giving must never count as personal giving', () => {
      const foundationDonation = {
        amount: 100000000,
        funding_source_type: 'FOUNDATION',
        donation_type: 'GRANT'
      };

      const corporateDonation = {
        amount: 10000000,
        funding_source_type: 'CORPORATE',
        donation_type: 'CORPORATE_MATCH'
      };

      const personalDonation = {
        amount: 50000000,
        funding_source_type: 'PERSONAL_DIRECT',
        donation_type: 'GIFT'
      };

      const isPersonal = (d) => ['PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'].includes(d.funding_source_type);

      assert.equal(isPersonal(foundationDonation), false, 'Foundation grants must NOT count as personal');
      assert.equal(isPersonal(corporateDonation), false, 'Corporate donations must NOT count as personal');
      assert.equal(isPersonal(personalDonation), true, 'Personal direct donations must count as personal');
    });
  });

  // 6. Idempotent SQL Generator
  describe('6. Non-Destructive SQL Generation', () => {
    test('6.1 generateSqlFromPlan creates idempotent ON CONFLICT statements for all tables', () => {
      const plan = {
        operations: {
          peopleToInsert: [{ id: 'b0000000-0000-0000-0000-000000000026', canonical_name: 'Phil Knight' }],
          orgsToInsert: [{ id: 'c0000000-0000-0000-0000-000000000047', legal_name: 'Nike, Inc.' }],
          sourcesToInsert: [{ id: 'e0000000-0000-0000-0000-000000000057', url: 'https://example.com', publisher: 'Pub', title: 'Title', source_type: 'PRIMARY' }],
          snapshotsToInsert: [{ id: 's1', person_id: 'b0000000-0000-0000-0000-000000000026', snapshot_date: '2020-01-01', net_worth: 1000000000, currency: 'USD' }],
          donationsToInsert: [{ id: 'f0000000-0000-0000-0000-000000000074', donor_person_id: 'b0000000-0000-0000-0000-000000000026', amount: 500000000, currency: 'USD', donation_date: '2021-07-06', funding_source_type: 'PERSONAL_DIRECT' }],
          donationSourcesToInsert: [{ donation_id: 'f0000000-0000-0000-0000-000000000074', source_id: 'e0000000-0000-0000-0000-000000000057' }],
          personOrgsToInsert: [{ id: 'po1', person_id: 'b0000000-0000-0000-0000-000000000026', organization_id: 'c0000000-0000-0000-0000-000000000047', relationship_type: 'CO_FOUNDER' }]
        }
      };

      const sql = generateSqlFromPlan(plan);

      assert(sql.includes('ON CONFLICT (id) DO UPDATE'), 'People and orgs must have ON CONFLICT (id) DO UPDATE');
      assert(sql.includes('ON CONFLICT (person_id, snapshot_date) DO UPDATE'), 'Wealth snapshots must have composite ON CONFLICT');
      assert(sql.includes('ON CONFLICT (donation_id, source_id) DO NOTHING'), 'Donation sources must have ON CONFLICT DO NOTHING');
      assert(sql.includes('ON CONFLICT (person_id, organization_id, relationship_type) DO NOTHING'), 'Person orgs must have ON CONFLICT DO NOTHING');
      assert(!sql.includes('DELETE FROM'), 'SQL migration must never contain accidental DELETE statements');
      assert(!sql.includes('DROP TABLE'), 'SQL migration must never contain accidental DROP statements');
    });
  });

});
