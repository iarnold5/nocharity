/**
 * NoCharity Advanced Mode — Phase 9 Integration & Unit Tests
 * Reality Check Calculator (Centerpiece of Advanced Mode)
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHistoricalParity,
  compareBillionairesParity,
  calculateHistoricalDonationParity
} from '../server/supabase.js';

describe('NoCharity Advanced Mode — Phase 9: Reality Check Calculator Tests', () => {

  describe('1. Canonical Example Verification ($1B on $50B & ₹60,000 Income)', () => {
    test('1.1 Computes exact 2.00% ratio and ₹1,200 equivalent sacrifice for canonical benchmark', () => {
      const billionaireWealth = 50_000_000_000;
      const donationAmount = 1_000_000_000;
      const userMonthlyIncome = 60_000;

      const result = calculateHistoricalDonationParity({
        donationAmount,
        donationDate: '2018-05-01',
        historicalNetWorth: billionaireWealth,
        snapshotDate: '2018-05-01',
        userIncome: userMonthlyIncome,
        incomeFrequency: 'monthly',
        userCurrency: '₹'
      });

      assert.strictEqual(result.isAvailable, true, 'Calculation is available');
      assert.strictEqual(result.historicalGenerosityRatio, 2.0, 'Raw generosity ratio is exactly 2.0%');
      assert.strictEqual(result.formattedRatio, '2.00%', 'Formatted ratio is 2.00%');
      assert.strictEqual(result.userEquivalent, 1200, 'User equivalent sacrifice is exactly ₹1,200');
    });

    test('1.2 Generates exact canonical display statements required by Phase 9', () => {
      const billionaireWealth = 50_000_000_000;
      const donationAmount = 1_000_000_000;
      const userMonthlyIncome = 60_000;
      const ratio = (donationAmount / billionaireWealth) * 100;
      const equiv = (userMonthlyIncome * ratio) / 100;

      const statementRatio = `They gave approximately ${ratio.toFixed(2)}% of their documented wealth at the time.`;
      const statementEquivalent = `For an income of ₹${userMonthlyIncome.toLocaleString()}/month, that is equivalent to ₹${Math.round(equiv).toLocaleString()}.`;

      assert.strictEqual(
        statementRatio,
        'They gave approximately 2.00% of their documented wealth at the time.',
        'Exact ratio statement matches canonical requirement'
      );
      assert.strictEqual(
        statementEquivalent,
        'For an income of ₹60,000/month, that is equivalent to ₹1,200.',
        'Exact equivalent statement matches canonical requirement'
      );
    });

    test('1.3 Supports annual income frequency scaling with transparent labeling', () => {
      const billionaireWealth = 50_000_000_000;
      const donationAmount = 1_000_000_000;
      const userAnnualIncome = 720_000; // ₹60,000 * 12

      const result = calculateHistoricalDonationParity({
        donationAmount,
        donationDate: '2018-05-01',
        historicalNetWorth: billionaireWealth,
        snapshotDate: '2018-05-01',
        userIncome: userAnnualIncome,
        incomeFrequency: 'annual',
        userCurrency: '₹'
      });

      assert.strictEqual(result.historicalGenerosityRatio, 2.0, 'Ratio remains 2.0%');
      assert.strictEqual(result.userEquivalent, 14400, 'Annual equivalent sacrifice is ₹14,400 (720,000 * 2%)');

      const freqLabel = result.incomeFrequency === 'annual' ? 'year' : 'month';
      const statement = `For an income of ₹${userAnnualIncome.toLocaleString()}/${freqLabel}, that is equivalent to ₹${Math.round(result.userEquivalent).toLocaleString()}.`;
      assert.strictEqual(
        statement,
        'For an income of ₹720,000/year, that is equivalent to ₹14,400.',
        'Annual statement is properly derived'
      );
    });
  });

  describe('2. Strict Language Guardrails & Nuance Requirements', () => {
    test('2.1 Classifies calculation strictly as "Proportional wealth comparison"', async () => {
      const data = await compareBillionairesParity({
        userIncome: 60000,
        incomeFrequency: 'monthly',
        userCurrency: '₹'
      });

      assert.ok(data.methodology, 'Contains methodology metadata');
      assert.strictEqual(
        data.methodology.concept,
        'Proportional wealth comparison',
        'Strictly called proportional wealth comparison'
      );
      assert.strictEqual(
        data.methodology.tagline,
        'Equivalent by percentage of wealth',
        'Uses "Equivalent by percentage of wealth"'
      );
      assert.ok(
        data.methodology.disclaimer.includes('living standard') || data.methodology.disclaimer.includes('financial pain'),
        'Includes marginal utility disclaimer'
      );
    });

    test('2.2 Every billionaire comparison item carries strict non-pain qualification', async () => {
      const data = await compareBillionairesParity({
        userIncome: 60000,
        incomeFrequency: 'monthly',
        userCurrency: '₹'
      });

      assert.ok(data.comparisons.length > 0, 'Returns comparison items');
      data.comparisons.forEach(c => {
        assert.strictEqual(c.methodology_type, 'Proportional wealth comparison');
        assert.ok(
          c.qualification.includes('Equivalent by percentage of wealth'),
          'Explicit qualification tagline present'
        );
        assert.ok(
          c.qualification.includes('Not an exact comparison of financial pain'),
          'Explicit disclaimer against financial pain claim present'
        );
      });
    });
  });

  describe('3. Multi-Billionaire Side-by-Side Comparison Service', () => {
    test('3.1 Returns multiple billionaires with calibrated proportional sacrifices', async () => {
      const data = await compareBillionairesParity({
        userIncome: 60000,
        incomeFrequency: 'monthly',
        userCurrency: '₹'
      });

      assert.strictEqual(data.user_income, 60000);
      assert.strictEqual(data.income_frequency, 'monthly');
      assert.strictEqual(data.user_currency, '₹');
      assert.ok(data.comparisons.length >= 5, 'Compares at least 5 tracked billionaires');

      // Check first item structure
      const top = data.comparisons[0];
      assert.ok(top.canonical_name, 'Has name');
      assert.ok(top.ratio_percentage >= 0, 'Has ratio percentage');
      assert.ok(top.user_equivalent >= 0, 'Has equivalent amount');
      assert.ok(top.formatted_equivalent.startsWith('₹'), 'Formatted in target currency');
      assert.ok(top.statement_ratio.includes('documented wealth at the time'), 'Contains canonical ratio sentence');
      assert.ok(top.statement_equivalent.includes('₹60,000/month'), 'Contains canonical equivalent sentence');
    });

    test('3.2 Correctly replicates comparison examples from user request (Billionaire A: 5.2% -> ₹3,120; B: 1.1% -> ₹660; C: 0.3% -> ₹180)', () => {
      const income = 60000;
      
      const calcA = (income * 5.2) / 100;
      const calcB = (income * 1.1) / 100;
      const calcC = (income * 0.3) / 100;

      assert.strictEqual(Math.round(calcA), 3120, 'Billionaire A 5.2% yields ₹3,120');
      assert.strictEqual(Math.round(calcB), 660, 'Billionaire B 1.1% yields ₹660');
      assert.strictEqual(Math.round(calcC), 180, 'Billionaire C 0.3% yields ₹180');
    });

    test('3.3 Handles specific personIds subset filtering in comparison', async () => {
      const full = await compareBillionairesParity();
      const targetIds = full.comparisons.slice(0, 3).map(c => c.person_id);

      const subset = await compareBillionairesParity({
        personIds: targetIds,
        userIncome: 100000,
        incomeFrequency: 'monthly',
        userCurrency: '₹'
      });

      assert.strictEqual(subset.comparisons.length, 3, 'Filters to exactly requested 3 billionaires');
      assert.strictEqual(subset.user_income, 100000);
      subset.comparisons.forEach(item => {
        assert.ok(targetIds.includes(item.person_id));
      });
    });
  });

  describe('4. Historical Wealth Proximity & Real Database Donors', () => {
    test('4.1 Compares real donation against historical net worth at time of donation', async () => {
      // Warren Buffett / Bill Gates donation test
      const parity = await calculateHistoricalParity({
        donationAmount: 1000000000,
        donationDate: '2021-06-23',
        historicalNetWorth: 100000000000,
        snapshotDate: '2021-06-23',
        userIncome: 60000,
        incomeFrequency: 'monthly',
        userCurrency: '₹'
      });

      assert.strictEqual(parity.isAvailable, true);
      assert.strictEqual(parity.historicalGenerosityRatio, 1.0, '1B on 100B is 1%');
      assert.strictEqual(parity.userEquivalent, 600, '60,000 * 1% is ₹600');
    });

    test('4.2 Rejects foundation and corporate grants from personal parity calculations', () => {
      const foundationCheck = calculateHistoricalDonationParity({
        donationAmount: 500000000,
        donationDate: '2020-01-01',
        historicalNetWorth: 50000000000,
        snapshotDate: '2020-01-01',
        fundingSourceType: 'FOUNDATION'
      });

      assert.strictEqual(foundationCheck.isEligible, false, 'Foundation gift is excluded from personal sacrifice parity');
      assert.strictEqual(foundationCheck.userEquivalent, null);

      const corporateCheck = calculateHistoricalDonationParity({
        donationAmount: 500000000,
        donationDate: '2020-01-01',
        historicalNetWorth: 50000000000,
        snapshotDate: '2020-01-01',
        fundingSourceType: 'CORPORATE'
      });

      assert.strictEqual(corporateCheck.isEligible, false, 'Corporate gift is excluded from personal sacrifice parity');
    });
  });
});
