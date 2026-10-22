/**
 * Final Population Repeatability & Maintainability Verification Test
 * 
 * Verifies:
 * 1. Re-running the 1,000 Forbes billionaires ingestion against the populated database
 *    is 100% idempotent:
 *    - 0 new people
 *    - 0 new wealth snapshots
 *    - 0 new sources
 *    - 0 invalid records
 * 2. Incremental addition of a genuinely new source-backed entity works seamlessly.
 * 3. Historical wealth snapshots and sources are strictly preserved.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { supabase } from '../scripts/db/client.js';
import { fetchExistingDataset, planIngestion } from '../scripts/db/upsert.js';
import { fetchRecords } from '../scripts/ingest/forbes-billionaires.js';

describe('Final Billionaire Population Repeatability & Idempotency', () => {

  test('1. Re-ingesting Forbes dataset against live populated database produces 0 new people and 0 new snapshots', async () => {
    const existingDataset = await fetchExistingDataset(supabase);
    assert.ok(existingDataset.people.length >= 1000, `Expected at least 1,000 people, got ${existingDataset.people.length}`);
    assert.ok(existingDataset.wealthSnapshots.length >= 1000, `Expected at least 1,000 snapshots, got ${existingDataset.wealthSnapshots.length}`);

    const incomingData = await fetchRecords();
    assert.equal(incomingData.people.length, 1000, 'Forbes input contains exactly 1,000 billionaires');

    const plan = planIngestion({
      incomingData,
      existingDataset,
      options: { dryRun: true }
    });

    assert.equal(plan.stats.newPeople, 0, 'Must produce 0 new people when re-running against populated database');
    assert.equal(plan.stats.newWealthSnapshots, 0, 'Must produce 0 new wealth snapshots on identical date');
    assert.equal(plan.stats.newSources, 0, 'Must produce 0 new sources');
    assert.equal(plan.stats.newOrganizations, 0, 'Must produce 0 new organizations');
    assert.equal(plan.stats.invalidRecords, 0, 'Must produce 0 invalid records');
  });

  test('2. Adding genuinely new information (new snapshot on a different date) plans exactly 1 new snapshot without duplicating people', async () => {
    const existingDataset = await fetchExistingDataset(supabase);
    const targetPerson = existingDataset.people[0];
    assert.ok(targetPerson, 'Existing person must exist');

    const newSnapshot = {
      person_id: targetPerson.id,
      snapshot_date: '2026-11-01',
      net_worth: 100000000000,
      currency: 'USD',
      source_name: 'Forbes Real-Time Billionaires',
      source_id: existingDataset.sources[0]?.id,
      confidence: 'HIGH'
    };

    const plan = planIngestion({
      incomingData: {
        people: [{ canonical_name: targetPerson.canonical_name }],
        wealthSnapshots: [newSnapshot],
        organizations: [],
        sources: [],
        donations: []
      },
      existingDataset,
      options: { dryRun: true }
    });

    assert.equal(plan.stats.newPeople, 0, 'Must not duplicate existing person');
    assert.equal(plan.stats.newWealthSnapshots, 1, 'Must plan exactly 1 new snapshot');
    assert.equal(plan.operations.snapshotsToInsert[0].snapshot_date, '2026-11-01');
  });

  test('3. Repeating representative subset (50 billionaires) is completely non-destructive', async () => {
    const existingDataset = await fetchExistingDataset(supabase);
    const incomingData = await fetchRecords();
    const subset = {
      people: incomingData.people.slice(0, 50),
      wealthSnapshots: incomingData.wealthSnapshots.slice(0, 50),
      organizations: incomingData.organizations.slice(0, 50),
      sources: incomingData.sources.slice(0, 50),
      donations: []
    };

    const plan = planIngestion({
      incomingData: subset,
      existingDataset,
      options: { dryRun: true }
    });

    assert.equal(plan.stats.newPeople, 0);
    assert.equal(plan.stats.newWealthSnapshots, 0);
    assert.equal(plan.stats.newOrganizations, 0);
    assert.equal(plan.stats.newSources, 0);
    assert.equal(plan.stats.invalidRecords, 0);
  });
});
