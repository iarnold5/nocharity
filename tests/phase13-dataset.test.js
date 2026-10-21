/**
 * NoCharity Advanced Mode — Phase 13 Test Suite
 * 
 * Verifies:
 * 1. Scope & Size: 20-30 high-profile billionaires with public data (25 canonical records).
 * 2. Canonical Identity: Country, industry, organizations, aliases, UUIDs.
 * 3. Historical Wealth Snapshots: Dated, positive (> 0), with verifiable sources.
 * 4. Attribution Separation: Personal direct vs Foundation grants vs Corporate CSR vs DAF transfers vs Pledges.
 * 5. Sources: Every seed record carries verifiable regulatory or public citations.
 * 6. Verification Status: Transparent classification (VERIFIED, APPROXIMATE, INCOMPLETE).
 * 7. Invariants: 8 Essential Questions Evaluator & Hard Validation Rules.
 * 8. Safe Re-run: Idempotent upserts and deduplication engine integration.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  PHASE13_BILLIONAIRES,
  DATA_QUALITY_STATUS
} from '../server/phase13-dataset.js';

import {
  validateDonationQuality,
  evaluateEightQuestions
} from '../server/data-quality.js';

import {
  fetchPhase13Records,
  auditPhase13Invariants
} from '../scripts/seed/seed-phase13.js';

import { planIngestion } from '../scripts/db/upsert.js';

describe('NoCharity Advanced Mode — Phase 13: High-Quality Initial Dataset Tests', () => {

  // ---------------------------------------------------------------------------
  // 1. Dataset Scope & Scale (Prioritizing Quality Over Quantity)
  // ---------------------------------------------------------------------------
  describe('1. Dataset Scope & Composition', () => {
    test('1.1 Initial dataset contains approximately 20–30 high-profile billionaires (exactly 25)', () => {
      assert.ok(PHASE13_BILLIONAIRES.length >= 20, 'At least 20 billionaires populated');
      assert.ok(PHASE13_BILLIONAIRES.length <= 30, 'At most 30 billionaires populated (not all 1,000)');
      assert.strictEqual(PHASE13_BILLIONAIRES.length, 25, 'Contains 25 curated high-profile billionaires');
    });

    test('1.2 Includes key global philanthropists and high-profile historical/contemporary figures', () => {
      const names = PHASE13_BILLIONAIRES.map(b => b.name);
      // Contemporary icons
      assert.ok(names.includes('Warren Buffett'), 'Warren Buffett present');
      assert.ok(names.includes('Bill Gates'), 'Bill Gates present');
      assert.ok(names.includes('MacKenzie Scott'), 'MacKenzie Scott present');
      assert.ok(names.includes('Elon Musk'), 'Elon Musk present');
      assert.ok(names.includes('Azim Premji'), 'Azim Premji present');
      assert.ok(names.includes('Mukesh Ambani'), 'Mukesh Ambani present');
      assert.ok(names.includes('Gautam Adani'), 'Gautam Adani present');
      assert.ok(names.includes('Carlos Slim'), 'Carlos Slim present');
      assert.ok(names.includes('Jack Ma'), 'Jack Ma present');
      assert.ok(names.includes('Michael Bloomberg'), 'Michael Bloomberg present');
      assert.ok(names.includes('Mark Zuckerberg & Priscilla Chan'), 'Zuckerberg & Chan present');
      assert.ok(names.includes('Jeff Bezos'), 'Jeff Bezos present');
      assert.ok(names.includes('Larry Ellison'), 'Larry Ellison present');
      assert.ok(names.includes('Bernard Arnault & Family'), 'Bernard Arnault present');
      assert.ok(names.includes('Steve & Connie Ballmer'), 'Ballmer present');
      assert.ok(names.includes('George Soros'), 'George Soros present');
      assert.ok(names.includes('Pierre Omidyar & Pam Omidyar'), 'Pierre Omidyar present');
      assert.ok(names.includes('Shiv Nadar'), 'Shiv Nadar present');
      assert.ok(names.includes('Michael Dell & Susan Dell'), 'Michael Dell present');
      assert.ok(names.includes('Sergey Brin'), 'Sergey Brin present');
      assert.ok(names.includes('Larry Page'), 'Larry Page present');

      // Historic benchmarks
      assert.ok(names.includes('Chuck Feeney (Historic)'), 'Chuck Feeney present');
      assert.ok(names.includes('Andrew Carnegie (Historic)'), 'Andrew Carnegie present');
      assert.ok(names.includes('John D. Rockefeller (Historic)'), 'John D. Rockefeller present');
      assert.ok(names.includes('Gordon Moore (Historic)'), 'Gordon Moore present');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Canonical Identity & Entity Metadata
  // ---------------------------------------------------------------------------
  describe('2. Canonical Identity & Metadata', () => {
    test('2.1 Every billionaire has canonical name, valid UUID, country, industry, and summary', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        assert.ok(b.id, `Billionaire ${b.name} must have a slug id`);
        assert.ok(b.uuid && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.uuid), `Billionaire ${b.name} must have valid UUID`);
        assert.ok(b.name && b.name.trim().length > 0, `Billionaire must have canonical name`);
        assert.ok(b.country && b.country.trim().length > 0, `${b.name} must specify country`);
        assert.ok(b.industry && b.industry.trim().length > 0, `${b.name} must specify industry`);
        assert.ok(b.occupation && b.occupation.trim().length > 0, `${b.name} must specify occupation`);
        assert.ok(b.summary && b.summary.trim().length > 20, `${b.name} must have comprehensive summary`);
        assert.strictEqual(b.is_billionaire, true, `${b.name} is_billionaire must be true`);
        assert.strictEqual(typeof b.giving_pledge, 'boolean', `${b.name} giving_pledge must be boolean`);
      }
    });

    test('2.2 Every billionaire has associated organizations with legal type and role', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        assert.ok(Array.isArray(b.organizations), `${b.name} must have organizations array`);
        assert.ok(b.organizations.length > 0, `${b.name} must have at least one affiliated organization`);

        for (const org of b.organizations) {
          assert.ok(org.id, `Organization ${org.name} for ${b.name} must have UUID`);
          assert.ok(org.name, `Organization for ${b.name} must have name`);
          assert.ok(['COMPANY', 'FOUNDATION', 'DAF', 'CHARITY'].includes(org.type), `Org type ${org.type} must be valid`);
          assert.ok(org.role, `Relationship role for ${org.name} must be specified`);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Historical Wealth Snapshots
  // ---------------------------------------------------------------------------
  describe('3. Historical Wealth Snapshots Integrity', () => {
    test('3.1 Every billionaire has documented historical wealth snapshots', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        assert.ok(Array.isArray(b.wealthSnapshots), `${b.name} must have wealthSnapshots`);
        assert.ok(b.wealthSnapshots.length >= 2, `${b.name} must have at least 2 historical snapshots across time`);
      }
    });

    test('3.2 Every wealth snapshot has valid ISO date, positive valuation (> 0), and explicit source', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        for (const snap of b.wealthSnapshots) {
          assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(snap.date), `Snapshot date "${snap.date}" for ${b.name} must be YYYY-MM-DD`);
          assert.ok(isFinite(snap.netWorth) && snap.netWorth > 0, `Net worth ${snap.netWorth} for ${b.name} must be positive`);
          assert.ok(snap.source && snap.source.trim().length > 0, `Snapshot for ${b.name} must cite source`);
          assert.ok(snap.quality, `Snapshot for ${b.name} must have quality tier`);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Attribution Separation (Personal vs Foundation vs Corporate vs DAF vs Pledge)
  // ---------------------------------------------------------------------------
  describe('4. Attribution Isolation & Non-Inference', () => {
    test('4.1 Personal donations strictly separated from foundation and corporate donations', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        // Personal gifts
        for (const d of b.donations || []) {
          assert.ok(['PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED', 'DAF', 'PLEDGE'].includes(d.funding_source_type),
            `Personal donation ${d.id} for ${b.name} has invalid funding_source_type: ${d.funding_source_type}`);
          assert.notStrictEqual(d.funding_source_type, 'FOUNDATION',
            `Must NOT label personal gift as foundation disbursement: ${b.name}`);
          assert.notStrictEqual(d.funding_source_type, 'CORPORATE',
            `Must NOT label personal gift as corporate donation: ${b.name}`);
        }

        // Foundation grants
        for (const d of b.foundationDonations || []) {
          assert.strictEqual(d.funding_source_type, 'FOUNDATION',
            `Foundation grant ${d.id} must have funding_source_type: 'FOUNDATION'`);
          assert.ok(d.donor_org_name, `Foundation grant ${d.id} must specify donor_org_name`);
        }

        // Corporate donations
        for (const d of b.corporateDonations || []) {
          assert.strictEqual(d.funding_source_type, 'CORPORATE',
            `Corporate donation ${d.id} must have funding_source_type: 'CORPORATE'`);
          assert.ok(d.donor_org_name, `Corporate donation ${d.id} must specify corporate donor`);
        }
      }
    });

    test('4.2 Pledges are explicitly flagged and excluded from completed giving', () => {
      const adani = PHASE13_BILLIONAIRES.find(b => b.id === 'gautam-adani');
      assert.ok(adani, 'Adani found');
      const pledge = adani.donations.find(d => d.funding_source_type === 'PLEDGE');
      assert.ok(pledge, 'Pledge record found');
      assert.strictEqual(pledge.data_quality_status, DATA_QUALITY_STATUS.INCOMPLETE);
      assert.strictEqual(pledge.amount, 7700000000);

      // Verify validation rule rejects pledge marked as completed giving
      const val = validateDonationQuality({
        ...pledge,
        donor_person_name: adani.name,
        is_completed_giving: true
      });
      assert.strictEqual(val.isValid, false);
      assert.ok(val.errors.some(e => e.includes('non-binding commitments')));
    });

    test('4.3 DAF transfers are explicitly identified and tagged INCOMPLETE for end-recipient opacity', () => {
      const musk = PHASE13_BILLIONAIRES.find(b => b.id === 'elon-musk');
      assert.ok(musk, 'Elon Musk found');
      const dafGift = musk.donations.find(d => d.funding_source_type === 'DAF');
      assert.ok(dafGift, 'DAF gift found');
      assert.strictEqual(dafGift.data_quality_status, DATA_QUALITY_STATUS.INCOMPLETE);
      assert.ok(dafGift.recipient.includes('DAF') || dafGift.recipient.includes('Fidelity Charitable'));
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Verification Status & The 8 Essential Questions
  // ---------------------------------------------------------------------------
  describe('5. Verification Status & Data Quality Standards', () => {
    test('5.1 All records carry documented status (VERIFIED, APPROXIMATE, INCOMPLETE)', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        assert.ok([
          DATA_QUALITY_STATUS.VERIFIED,
          DATA_QUALITY_STATUS.APPROXIMATE,
          DATA_QUALITY_STATUS.INCOMPLETE
        ].includes(b.data_quality_status), `${b.name} has invalid status: ${b.data_quality_status}`);

        const allDonations = [
          ...(b.donations || []),
          ...(b.foundationDonations || []),
          ...(b.corporateDonations || [])
        ];

        for (const d of allDonations) {
          assert.ok([
            DATA_QUALITY_STATUS.VERIFIED,
            DATA_QUALITY_STATUS.APPROXIMATE,
            DATA_QUALITY_STATUS.INCOMPLETE
          ].includes(d.data_quality_status), `Donation ${d.id} for ${b.name} has invalid status`);
        }
      }
    });

    test('5.2 100% of donation records satisfy all 8 Essential Questions', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        const allDonations = [
          ...(b.donations || []).map(d => ({ ...d, donor_person_name: b.name })),
          ...(b.foundationDonations || []).map(d => ({ ...d, donor_organization_name: d.donor_org_name })),
          ...(b.corporateDonations || []).map(d => ({ ...d, donor_organization_name: d.donor_org_name }))
        ];

        for (const d of allDonations) {
          const evalResult = evaluateEightQuestions(d);
          assert.strictEqual(
            evalResult.is_complete,
            true,
            `Donation ${d.id} for ${b.name} missed questions: [${evalResult.missing_questions.join(', ')}]`
          );
          assert.strictEqual(evalResult.answered_count, 8);
        }
      }
    });

    test('5.3 100% of donation records pass hard invariant quality validation', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        const allDonations = [
          ...(b.donations || []).map(d => ({ ...d, donor_person_name: b.name })),
          ...(b.foundationDonations || []).map(d => ({ ...d, donor_organization_name: d.donor_org_name })),
          ...(b.corporateDonations || []).map(d => ({ ...d, donor_organization_name: d.donor_org_name }))
        ];

        for (const d of allDonations) {
          const val = validateDonationQuality(d);
          assert.strictEqual(
            val.isValid,
            true,
            `Donation ${d.id} for ${b.name} failed validation: ${val.errors.join('; ')}`
          );
          assert.strictEqual(val.errors.length, 0);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Every Seed Record Has a Verifiable Source
  // ---------------------------------------------------------------------------
  describe('6. Source Citations & Provenance', () => {
    test('6.1 Every single personal, foundation, and corporate donation has a source citation', () => {
      for (const b of PHASE13_BILLIONAIRES) {
        const allDonations = [
          ...(b.donations || []),
          ...(b.foundationDonations || []),
          ...(b.corporateDonations || [])
        ];

        for (const d of allDonations) {
          assert.ok(d.source_publisher && d.source_publisher.trim().length > 0, `Donation ${d.id} for ${b.name} missing source_publisher`);
          assert.ok(d.source_title && d.source_title.trim().length > 0, `Donation ${d.id} for ${b.name} missing source_title`);
          assert.ok(d.source_url && d.source_url.startsWith('http'), `Donation ${d.id} for ${b.name} missing valid source_url`);
        }
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Safe Idempotent Seeding & Invariant Audit
  // ---------------------------------------------------------------------------
  describe('7. Safe Re-Runnable Seeding Engine', () => {
    test('7.1 fetchPhase13Records normalizes all 25 billionaires and auxiliary tables', async () => {
      const records = await fetchPhase13Records();
      assert.strictEqual(records.people.length, 25, '25 normalized people');
      assert.ok(records.organizations.length >= 40, 'At least 40 normalized organizations');
      assert.ok(records.sources.length >= 80, 'At least 80 normalized sources');
      assert.ok(records.wealthSnapshots.length >= 100, 'At least 100 normalized wealth snapshots');
      assert.ok(records.donations.length >= 60, 'At least 60 normalized donations');
    });

    test('7.2 auditPhase13Invariants passes with zero violations', async () => {
      const records = await fetchPhase13Records();
      const audit = auditPhase13Invariants(records);
      assert.strictEqual(audit.violations.length, 0, `Expected 0 violations, found: ${audit.violations.join('; ')}`);
      assert.strictEqual(audit.verifiedCount + audit.approximateCount + audit.incompleteCount, 25);
    });

    test('7.3 planIngestion produces zero invalid records and clean upsert plan', async () => {
      const incomingData = await fetchPhase13Records();
      const existingDataset = {
        people: [],
        organizations: [],
        sources: [],
        wealthSnapshots: [],
        donations: []
      };

      const plan = planIngestion({
        incomingData,
        existingDataset,
        options: { dryRun: true, verbose: false }
      });

      assert.strictEqual(plan.stats.invalidRecords, 0, 'Zero invalid records in ingestion plan');
      assert.strictEqual(plan.stats.newPeople, 25, 'All 25 people planned for insert');
      assert.ok(plan.stats.newDonations >= 60, 'All donations planned for insert');
    });
  });
});
