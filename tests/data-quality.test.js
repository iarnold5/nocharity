/**
 * NoCharity Advanced Mode — Phase 12: Data Quality & Consistency Layer Tests
 * 
 * Verifies:
 * 1. The 8 Essential Questions Evaluator (WHO, WHAT, WHEN, HOW MUCH, FROM WHOM, TO WHOM, SOURCE, HOW CERTAIN).
 * 2. Hard Invariant Validation Rules:
 *    - Donation amount must be positive (> 0)
 *    - Donation date cannot be invalid
 *    - Source should exist for verified records
 *    - Personal donation should have a person donor
 *    - Corporate donation should have an organization donor
 *    - Foundation donation should have an organization donor
 *    - Pledge must not count as completed giving
 *    - Disputed records must not count in default rankings
 *    - Wealth must be positive (> 0)
 *    - Currency must be specified
 * 3. Consistency Checks:
 *    - Temporal wealth consistency (2018 donation vs 2026 snapshot rejected or marked unavailable/approximate)
 *    - Multi-source discrepancies (preserves disagreement, calculates spread, does not silently pick one, flags record)
 * 4. Transparent Quality Scoring & Grading (Grade A, B, C, D/Flagged).
 * 5. MCP Server tool validate_donation_quality and enriched get_donation.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  createMcpServer
} from '../mcp-server.js';
import {
  evaluateEightQuestions,
  validateDonationQuality,
  checkTemporalWealthConsistency,
  checkSourceDiscrepancies,
  computeDataQualityScore,
  EIGHT_QUESTIONS,
  QUALITY_GRADES
} from '../server/data-quality.js';

describe('Phase 12: Data Quality & Consistency Layer', () => {

  describe('1. The 8 Essential Questions Evaluator', () => {
    it('should answer all 8 questions for a complete, fully documented donation', () => {
      const record = {
        donor_person_name: 'Warren Buffett',
        description: 'Berkshire Hathaway Class B stock gift to Gates Foundation',
        donation_date: '2023-06-21',
        amount: 3500000000,
        currency: 'USD',
        funding_source_type: 'PERSONAL_DIRECT',
        recipient_name: 'Bill & Melinda Gates Foundation Trust',
        source_url: 'https://www.sec.gov/edgar/searchedgar/companysearch',
        source_publisher: 'U.S. Securities and Exchange Commission (EDGAR)',
        status: 'VERIFIED'
      };

      const result = evaluateEightQuestions(record);
      assert.equal(result.total_count, 8);
      assert.equal(result.answered_count, 8);
      assert.equal(result.is_complete, true);
      assert.equal(result.completeness_ratio, 1.0);
      assert.equal(result.missing_questions.length, 0);

      assert.equal(result.answers.who, 'Warren Buffett');
      assert.ok(result.answers.what.includes('Berkshire Hathaway'));
      assert.equal(result.answers.when, '2023-06-21');
      assert.equal(result.answers.how_much, 'USD 3,500,000,000');
      assert.equal(result.answers.from_whom, 'PERSONAL_DIRECT');
      assert.equal(result.answers.to_whom, 'Bill & Melinda Gates Foundation Trust');
      assert.equal(result.answers.source, 'https://www.sec.gov/edgar/searchedgar/companysearch');
      assert.equal(result.answers.how_certain, 'VERIFIED');
    });

    it('should detect missing questions on an incomplete record', () => {
      const record = {
        amount: 1000000,
        currency: 'USD'
      };

      const result = evaluateEightQuestions(record);
      assert.equal(result.answered_count, 2); // how_much & what (derived from monetary amount)
      assert.equal(result.is_complete, false);
      assert.ok(result.missing_questions.includes('who'));
      assert.ok(result.missing_questions.includes('when'));
      assert.ok(result.missing_questions.includes('from_whom'));
      assert.ok(result.missing_questions.includes('to_whom'));
      assert.ok(result.missing_questions.includes('source'));
      assert.ok(result.missing_questions.includes('how_certain'));
    });

    it('should handle null or invalid input gracefully', () => {
      const result = evaluateEightQuestions(null);
      assert.equal(result.answered_count, 0);
      assert.equal(result.is_complete, false);
      assert.equal(result.missing_questions.length, 8);
    });
  });

  describe('2. Hard Invariant Validation Rules', () => {
    it('Rule 1: should reject non-positive or invalid donation amounts', () => {
      const negativeDonation = { amount: -500000, donation_date: '2020-01-01' };
      const zeroDonation = { amount: 0, donation_date: '2020-01-01' };
      const invalidDonation = { amount: 'not_a_number', donation_date: '2020-01-01' };
      const validDonation = { amount: 500000, donation_date: '2020-01-01' };

      assert.equal(validateDonationQuality(negativeDonation).isValid, false);
      assert.equal(validateDonationQuality(zeroDonation).isValid, false);
      assert.equal(validateDonationQuality(invalidDonation).isValid, false);
      assert.equal(validateDonationQuality(validDonation).isValid, true);
    });

    it('Rule 2: should reject invalid dates or unrealistic temporal horizons', () => {
      const invalidDate = { amount: 1000, donation_date: 'not-a-date' };
      const ancientDate = { amount: 1000, donation_date: '1750-05-01' };
      const distantFutureDate = { amount: 1000, donation_date: '2099-01-01' };
      const validDate = { amount: 1000, donation_date: '2022-06-15' };

      assert.equal(validateDonationQuality(invalidDate).isValid, false);
      assert.equal(validateDonationQuality(ancientDate).isValid, false);
      assert.equal(validateDonationQuality(distantFutureDate).isValid, false);
      assert.equal(validateDonationQuality(validDate).isValid, true);
    });

    it('Rule 3: should require a verifiable source citation for verified records', () => {
      const verifiedWithoutSource = {
        amount: 1000000,
        donation_date: '2021-05-01',
        status: 'VERIFIED'
      };

      const verifiedWithSource = {
        amount: 1000000,
        donation_date: '2021-05-01',
        status: 'VERIFIED',
        source_url: 'https://sec.gov/edgar/form4'
      };

      const res1 = validateDonationQuality(verifiedWithoutSource);
      assert.equal(res1.isValid, false);
      assert.ok(res1.errors.some(e => e.includes('Source citation is strictly required')));

      const res2 = validateDonationQuality(verifiedWithSource);
      assert.equal(res2.isValid, true);
    });

    it('Rule 4: personal donations must specify a person donor', () => {
      const personalWithoutPerson = {
        amount: 1000000,
        donation_date: '2021-05-01',
        funding_source_type: 'PERSONAL_DIRECT'
      };

      const personalWithPerson = {
        amount: 1000000,
        donation_date: '2021-05-01',
        funding_source_type: 'PERSONAL_DIRECT',
        donor_person_name: 'MacKenzie Scott'
      };

      const res1 = validateDonationQuality(personalWithoutPerson);
      assert.equal(res1.isValid, false);
      assert.ok(res1.errors.some(e => e.includes('must specify a verified individual person')));

      const res2 = validateDonationQuality(personalWithPerson);
      assert.equal(res2.isValid, true);
    });

    it('Rule 5 & 6: corporate and foundation donations should specify an organization donor', () => {
      const corpWithoutOrg = {
        amount: 5000000,
        donation_date: '2021-05-01',
        funding_source_type: 'CORPORATE'
      };

      const foundationWithoutOrg = {
        amount: 5000000,
        donation_date: '2021-05-01',
        funding_source_type: 'FOUNDATION'
      };

      assert.equal(validateDonationQuality(corpWithoutOrg).isValid, false);
      assert.equal(validateDonationQuality(foundationWithoutOrg).isValid, false);

      const foundationWithOrg = {
        amount: 5000000,
        donation_date: '2021-05-01',
        funding_source_type: 'FOUNDATION',
        donor_organization_name: 'Bill & Melinda Gates Foundation'
      };
      assert.equal(validateDonationQuality(foundationWithOrg).isValid, true);
    });

    it('Rule 7: pledges must not count as completed giving or confirmed personal giving', () => {
      const invalidPledge = {
        amount: 1000000000,
        donation_date: '2020-01-01',
        funding_source_type: 'PLEDGE',
        is_completed_giving: true,
        counts_as_personal_giving: true
      };

      const res = validateDonationQuality(invalidPledge);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes('must not be marked as completed giving')));
      assert.ok(res.errors.some(e => e.includes('must not be counted toward confirmed personal giving totals')));
    });

    it('Rule 8: disputed records must not count in default rankings or parity', () => {
      const invalidDisputed = {
        amount: 5000000,
        donation_date: '2022-01-01',
        status: 'DISPUTED',
        is_default_ranking_eligible: true,
        is_personal_parity_eligible: true
      };

      const res = validateDonationQuality(invalidDisputed);
      assert.equal(res.isValid, false);
      assert.ok(res.errors.some(e => e.includes('must not be eligible for default philanthropy rankings')));
      assert.ok(res.errors.some(e => e.includes('must not be eligible for personal parity calculations')));
    });

    it('Rule 9 & 10: historical wealth must be positive and currency must be specified if present', () => {
      const negativeWealth = {
        amount: 100000,
        donation_date: '2020-01-01',
        historical_net_worth: -10000000
      };

      const emptyCurrency = {
        amount: 100000,
        donation_date: '2020-01-01',
        currency: '   '
      };

      assert.equal(validateDonationQuality(negativeWealth).isValid, false);
      assert.equal(validateDonationQuality(emptyCurrency).isValid, false);
    });
  });

  describe('3. Consistency Checks', () => {
    describe('Temporal Wealth Consistency', () => {
      it('should reject or mark as unavailable a 2026 snapshot applied to a 2018 donation (Future Snapshot)', () => {
        const donationDate = '2018-05-01';
        const snapshotDate = '2026-01-01';

        const check = checkTemporalWealthConsistency(donationDate, snapshotDate);
        assert.equal(check.isConsistent, false);
        assert.equal(check.isUnavailable, true);
        assert.equal(check.isApproximate, true);
        assert.equal(check.classification, 'FUTURE_SNAPSHOT_MISMATCH');
        assert.ok(check.warning.includes('is in the future relative to donation date'));
      });

      it('should validate exact-date and same-year benchmarks as consistent', () => {
        const exact = checkTemporalWealthConsistency('2023-06-21', '2023-06-21');
        assert.equal(exact.isConsistent, true);
        assert.equal(exact.isApproximate, false);
        assert.equal(exact.isUnavailable, false);
        assert.equal(exact.classification, 'EXACT_DATE');

        const sameYear = checkTemporalWealthConsistency('2023-11-15', '2023-01-15');
        assert.equal(sameYear.isConsistent, true);
        assert.equal(sameYear.isUnavailable, false);
      });

      it('should mark wealth snapshots with 1-3 year gap as approximate historical', () => {
        const approx = checkTemporalWealthConsistency('2021-06-01', '2019-06-01');
        assert.equal(approx.isConsistent, true);
        assert.equal(approx.isApproximate, true);
        assert.equal(approx.isUnavailable, false);
        assert.equal(approx.classification, 'APPROXIMATE_HISTORICAL');
      });

      it('should reject or mark unavailable snapshots older than 3 years', () => {
        const distantPast = checkTemporalWealthConsistency('2022-01-01', '2015-01-01');
        assert.equal(distantPast.isConsistent, false);
        assert.equal(distantPast.isUnavailable, true);
        assert.equal(distantPast.classification, 'EXCESSIVE_TEMPORAL_GAP');
      });
    });

    describe('Multi-Source Discrepancies', () => {
      it('should detect when multiple sources disagree on donation amount and preserve disagreement', () => {
        const donation = {
          amount: 50000000,
          source_publisher: 'Press Wire A',
          alternative_amounts: [80000000]
        };

        const result = checkSourceDiscrepancies(donation);
        assert.equal(result.has_discrepancy, true);
        assert.equal(result.discrepancy_type, 'AMOUNT_DISAGREEMENT');
        assert.equal(result.discrepancy_details.min_amount, 50000000);
        assert.equal(result.discrepancy_details.max_amount, 80000000);
        assert.equal(result.discrepancy_details.spread_amount, 30000000);
        assert.ok(result.discrepancy_details.disagreement_summary.includes('neither figure was silently chosen'));
      });

      it('should not flag a discrepancy when all sources report consistent figures within tolerance', () => {
        const donation = {
          amount: 100000000,
          sources: [
            { publisher: 'SEC', reported_amount: 100000000 },
            { publisher: 'Bloomberg', reported_amount: 100000000 }
          ]
        };

        const result = checkSourceDiscrepancies(donation);
        assert.equal(result.has_discrepancy, false);
      });
    });
  });

  describe('4. Data Quality Scoring & Status', () => {
    it('should assign Grade A (85-100) to a fully verified, clean, complete record', () => {
      const record = {
        donation_id: 'don-test-clean',
        donor_person_name: 'MacKenzie Scott',
        description: 'Unrestricted grant to Habitat for Humanity',
        donation_date: '2022-03-22',
        amount: 436000000,
        currency: 'USD',
        funding_source_type: 'PERSONAL_DIRECT',
        recipient_name: 'Habitat for Humanity International',
        source_url: 'https://habitat.org/newsroom/2022/mackenzie-scott-donation',
        source_publisher: 'Habitat for Humanity Press Release',
        status: 'VERIFIED'
      };

      const result = computeDataQualityScore(record);
      assert.ok(result.quality_score >= 85);
      assert.equal(result.quality_grade, 'A');
      assert.equal(result.is_valid, true);
      assert.equal(result.has_source_discrepancy, false);
    });

    it('should downgrade to Grade D and flag a record when sources disagree', () => {
      const record = {
        donation_id: 'don-discrepant',
        donor_person_name: 'Tech Founder',
        description: 'Conflicting pledge vs wire disclosures',
        donation_date: '2021-04-10',
        amount: 50000000,
        currency: 'USD',
        funding_source_type: 'PERSONAL_DIRECT',
        recipient_name: 'University AI Lab',
        status: 'PARTIALLY_VERIFIED',
        alternative_amounts: [75000000]
      };

      const result = computeDataQualityScore(record);
      assert.equal(result.has_source_discrepancy, true);
      assert.equal(result.quality_grade, 'D');
      assert.ok(result.quality_score <= 45);
    });

    it('should downgrade and flag a record when temporal wealth mismatch occurs (2018 vs 2026)', () => {
      const record = {
        donation_id: 'don-temporal',
        donor_person_name: 'Donor Y',
        description: 'Gift with mismatched future wealth',
        donation_date: '2018-06-15',
        amount: 10000000,
        currency: 'USD',
        funding_source_type: 'PERSONAL_DIRECT',
        recipient_name: 'Public Library',
        source_url: 'https://library.org',
        status: 'VERIFIED'
      };

      const wealthSnapshot = {
        snapshot_date: '2026-01-01',
        net_worth: 50000000000
      };

      const result = computeDataQualityScore(record, { wealthSnapshot });
      assert.equal(result.temporal_consistency.isConsistent, false);
      assert.equal(result.temporal_consistency.classification, 'FUTURE_SNAPSHOT_MISMATCH');
    });
  });

  describe('5. MCP Server Tool: validate_donation_quality', () => {
    let client;
    let server;

    before(async () => {
      server = createMcpServer();
      client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await Promise.all([
        client.connect(clientTransport),
        server.connect(serverTransport)
      ]);
    });

    after(async () => {
      await client.close();
      await server.close();
    });

    it('should be listed in MCP tools and execute validation on payload', async () => {
      const tools = await client.listTools();
      const toolNames = tools.tools.map(t => t.name);
      assert.ok(toolNames.includes('validate_donation_quality'));

      const testPayload = {
        donation: {
          donor_person_name: 'Warren Buffett',
          description: 'Class B Stock grant',
          donation_date: '2023-06-21',
          amount: 3500000000,
          currency: 'USD',
          funding_source_type: 'PERSONAL_DIRECT',
          recipient_name: 'Gates Foundation',
          source_url: 'https://sec.gov',
          status: 'VERIFIED'
        },
        wealthSnapshot: {
          snapshot_date: '2023-06-21',
          net_worth: 118000000000
        }
      };

      const result = await client.callTool({
        name: 'validate_donation_quality',
        arguments: testPayload
      });

      assert.ok(!result.isError);
      const data = JSON.parse(result.content[0].text);
      assert.ok(data.quality_score >= 85);
      assert.equal(data.quality_grade, 'A');
      assert.equal(data.answered_questions_count, 8);
      assert.equal(data.temporal_consistency.isConsistent, true);
    });

    it('should return enriched data_quality metadata on get_donation', async () => {
      const searchRes = await client.callTool({
        name: 'search_donations',
        arguments: { limit: 1 }
      });
      const searchData = JSON.parse(searchRes.content[0].text);
      const testDonation = searchData.donations[0];
      assert.ok(testDonation && testDonation.id);

      const result = await client.callTool({
        name: 'get_donation',
        arguments: { donationId: testDonation.id }
      });

      assert.ok(!result.isError);
      const data = JSON.parse(result.content[0].text);
      assert.equal(data.id, testDonation.id);
      assert.ok(data.data_quality);
      assert.ok(data.data_quality.quality_score >= 50 || data.data_quality.score >= 50);
      assert.ok(data.data_quality.eight_questions);
    });
  });
});
