/**
 * Test Suite for NoCharity Personal Comparison Model
 * 
 * Verifies:
 * 1. Wealth-based calculation (billionaire wealth percentage applied directly to user's estimated net worth)
 * 2. Zero net worth handling (equivalent = 0, humorous free-sacrifice copy)
 * 3. Negative net worth handling (equivalent = 0, humorous debt-immunity copy)
 * 4. Missing net worth handling (user provides only income: no net worth invention, clear mismatch disclaimer)
 * 5. Monthly income interpretation (translates wealth sacrifice to % of one month's paycheck and approximate days)
 * 6. Currency handling and display normalization
 * 7. Historical donation percentage (anchored strictly to historical snapshot on or before donation date)
 * 8. Rounding and precision (unrounded float math internally, clean user-facing formatting)
 * 9. Extreme small and extreme large numbers
 * 10. Backwards compatibility with legacy tests
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHistoricalDonationParity,
  formatCurrencyAmount,
  formatRatio
} from '../server/parity-engine.js';

describe('NoCharity Personal Comparison Model - Unit Tests', () => {

  // Standard test snapshot: Warren Buffett $100B at donation date
  const standardSnapshots = [
    { snapshot_date: '2020-01-01', net_worth: 90_000_000_000 },
    { snapshot_date: '2021-06-20', net_worth: 100_000_000_000 }, // Exact benchmark
    { snapshot_date: '2022-01-01', net_worth: 110_000_000_000 }
  ];

  // =========================================================================
  // 1. Core Wealth-to-Wealth Calculation (The Primary Comparison)
  // =========================================================================
  test('1. Core Wealth-to-Wealth Calculation: $500M on $100B is 0.5%, applied to ₹10,00,000 = ₹5,000', () => {
    const result = calculateHistoricalDonationParity({
      donationAmount: 500_000_000, // $500M
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: 1_000_000,     // ₹10,00,000
      userCurrency: '₹'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.historicalNetWorth, 100_000_000_000);
    assert.equal(result.donationAmount, 500_000_000);
    assert.equal(result.historicalGenerosityRatio, 0.5); // Exactly 0.5%
    assert.equal(result.formattedRatio, '0.50%');

    // Primary Comparison
    assert.equal(result.userNetWorth, 1_000_000);
    assert.equal(result.userEquivalent, 5_000); // 0.5% of 10L = 5,000
    assert.equal(result.statementEquivalent, 'That would be ₹5,000.00 for you.');
    assert.equal(result.statementRatio, 'They gave approximately 0.50% of their documented wealth at the time.');
    assert.equal(result.humorCopy, 'Congratulations. You too can experience the billionaire donation lifestyle.');
  });

  // =========================================================================
  // 2. Zero Net Worth Handling
  // =========================================================================
  test('2. Zero Net Worth Handling: userNetWorth = 0 produces equivalent 0 with humorous zero-sacrifice copy', () => {
    const result = calculateHistoricalDonationParity({
      donationAmount: 500_000_000,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: 0,
      monthlyIncome: 35_000,
      userCurrency: '₹'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.userNetWorth, 0);
    assert.equal(result.userEquivalent, 0);
    assert.equal(result.isZeroOrNegativeNetWorth, true);
    assert.equal(result.netWorthStatus, 'ZERO');
    assert.equal(result.statementEquivalent, 'That would be ₹0.00 for you.');
    assert.equal(result.humorCopy, "At zero net worth, you've matched the billionaire's sacrifice for free.");
    assert.match(result.incomeInterpretation, /At zero estimated net worth, your wealth equivalent is ₹0/);
    assert.match(result.incomeInterpretation, /without touching your monthly paycheck/);
  });

  // =========================================================================
  // 3. Negative Net Worth Handling (Debts Exceed Assets)
  // =========================================================================
  test('3. Negative Net Worth Handling: negative net worth clamps equivalent to 0 with debt immunity copy', () => {
    const result = calculateHistoricalDonationParity({
      donationAmount: 500_000_000,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: -250_000, // Student loans / debts exceed assets
      monthlyIncome: 45_000,
      userCurrency: '₹'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.userNetWorth, -250_000);
    assert.equal(result.userEquivalent, 0);
    assert.equal(result.isZeroOrNegativeNetWorth, true);
    assert.equal(result.netWorthStatus, 'NEGATIVE');
    assert.equal(result.statementEquivalent, 'That would be ₹0.00 for you.');
    assert.equal(result.humorCopy, 'Your debts have officially granted you immunity from philanthropic guilt.');
    assert.match(result.incomeInterpretation, /With debts exceeding assets/);
    assert.match(result.incomeInterpretation, /yields ₹0 in deployable sacrifice/);
  });

  // =========================================================================
  // 4. Missing Net Worth Handling (Unknown Net Worth)
  // =========================================================================
  test('4. Missing Net Worth Handling: when user only provides monthly income, does not invent net worth', () => {
    const result = calculateHistoricalDonationParity({
      donationAmount: 500_000_000,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: null, // User skipped or does not know net worth
      monthlyIncome: 35_000,
      userCurrency: '₹'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.userNetWorth, null);
    assert.equal(result.userEquivalent, null); // Must not invent a net worth
    assert.equal(result.netWorthStatus, 'MISSING');
    assert.equal(result.statementEquivalent, 'Direct comparison requires an estimated net worth.');
    assert.equal(result.humorCopy, 'Give yourself a rough net worth estimate — what you own minus what you owe.');

    // Distinguishes wealth comparison from income interpretation clearly
    assert.ok(result.incomeInterpretation);
    assert.match(result.incomeInterpretation, /Direct wealth comparison requires an estimated net worth/);
    assert.match(result.incomeInterpretation, /for illustration only/);
    assert.match(result.incomeInterpretation, /comparing wealth to income is conceptually mismatched/);
  });

  // =========================================================================
  // 5. Monthly Income Contextual Interpretation
  // =========================================================================
  test("5. Monthly Income Interpretation: ₹5,000 sacrifice on ₹35,000 monthly income shows ~14% of monthly pay", () => {
    const result = calculateHistoricalDonationParity({
      donationAmount: 500_000_000,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: 1_000_000,
      monthlyIncome: 35_000,
      userCurrency: '₹'
    });

    assert.equal(result.userEquivalent, 5_000);
    assert.equal(result.monthlyIncome, 35_000);

    // 5,000 / 35,000 = 14.2857%
    assert.ok(result.incomeSharePercentage >= 14.28 && result.incomeSharePercentage <= 14.29);
    assert.equal(result.formattedIncomeShare, '14%');

    // 5,000 / (35,000 / 30) = 4.2857 days
    assert.ok(result.incomeDaysEquivalent >= 4.28 && result.incomeDaysEquivalent <= 4.29);
    assert.equal(
      result.incomeInterpretation,
      "That's about 14% of one month's take-home pay (roughly 4 days of earnings)."
    );
  });

  // =========================================================================
  // 6. Currency Conversion and Display Normalization
  // =========================================================================
  test('6. Currency Normalization: Preserves source USD calculations while rendering user currency cleanly', () => {
    // USD
    const resUsd = calculateHistoricalDonationParity({
      donationAmount: 500_000_000,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: 200_000,
      monthlyIncome: 8_000,
      userCurrency: '$'
    });
    assert.equal(resUsd.userEquivalent, 1_000); // 0.5% of 200K = 1,000
    assert.equal(resUsd.statementEquivalent, 'That would be $1,000.00 for you.');
    assert.equal(
      resUsd.incomeInterpretation,
      "That's about 13% of one month's take-home pay (roughly 4 days of earnings)."
    );

    // EUR with display multiplier
    const resEur = calculateHistoricalDonationParity({
      donationAmount: 500_000_000,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: 150_000,
      monthlyIncome: 5_000,
      userCurrency: '€',
      displayExchangeRate: 0.92
    });
    assert.equal(resEur.historicalGenerosityRatio, 0.5); // Never distorted by rate
    assert.equal(resEur.userEquivalent, 750); // 0.5% of 150K = 750
    assert.equal(resEur.statementEquivalent, 'That would be €750.00 for you.');
    assert.equal(
      resEur.incomeInterpretation,
      "That's about 15% of one month's take-home pay (roughly 5 days of earnings)."
    );
  });

  // =========================================================================
  // 7. Historical Donation Percentage Anchoring
  // =========================================================================
  test('7. Historical Donation Percentage: Ratio is anchored strictly to historical snapshot on/before donation', () => {
    const historicalSnapshots = [
      { snapshot_date: '2015-01-01', net_worth: 20_000_000_000 },
      { snapshot_date: '2018-01-01', net_worth: 50_000_000_000 },
      { snapshot_date: '2020-01-01', net_worth: 80_000_000_000 }, // Closest prior to donation
      { snapshot_date: '2022-01-01', net_worth: 150_000_000_000 } // Future snapshot, must be ignored
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 1_000_000_000, // $1B
      donationDate: '2020-06-15',
      snapshots: historicalSnapshots,
      userNetWorth: 5_000_000,
      userCurrency: '₹'
    });

    assert.equal(result.snapshotDate, '2020-01-01');
    assert.equal(result.historicalNetWorth, 80_000_000_000);
    // 1B / 80B * 100 = 1.25%
    assert.equal(result.historicalGenerosityRatio, 1.25);
    assert.equal(result.formattedRatio, '1.25%');
    // 1.25% of 5,000,000 = 62,500
    assert.equal(result.userEquivalent, 62_500);
    assert.equal(result.statementEquivalent, 'That would be ₹62,500.00 for you.');
  });

  // =========================================================================
  // 8. Rounding and Precision
  // =========================================================================
  test('8. Rounding and Precision: Retains unrounded floats internally without corruption', () => {
    // 333,333,333.33 on 100B = 0.33333333333%
    const result = calculateHistoricalDonationParity({
      donationAmount: 333_333_333.33,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: 1_234_567.89,
      monthlyIncome: 45_678.90,
      userCurrency: '₹'
    });

    assert.equal(typeof result.historicalGenerosityRatio, 'number');
    assert.ok(result.historicalGenerosityRatio > 0.3333 && result.historicalGenerosityRatio < 0.3334);
    assert.equal(typeof result.userEquivalent, 'number');
    // 1,234,567.89 * (0.33333333333 / 100) = ~4,115.22
    assert.ok(result.userEquivalent > 4115.2 && result.userEquivalent < 4115.3);

    // Formatted strings must be clean and free of NaN or raw floats
    assert.match(result.formattedRatio, /^0\.3333%/);
    assert.match(result.formattedUserEquivalent, /^₹4,115\.23/);
  });

  // =========================================================================
  // 9. Extreme Scale Numbers (Very Small and Very Large)
  // =========================================================================
  test('9. Extreme Numbers: Micro-percentages (0.00001%) and massive fortunes ($500B)', () => {
    // Micro-gift: $10,000 on $100B wealth = 0.00001%
    const microResult = calculateHistoricalDonationParity({
      donationAmount: 10_000,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: 50_000,
      monthlyIncome: 15_000,
      userCurrency: '₹'
    });
    assert.ok(Math.abs(microResult.historicalGenerosityRatio - 0.00001) < 1e-9);
    assert.equal(microResult.userEquivalent, 0.005);
    assert.ok(microResult.formattedRatio.includes('%'));
    assert.ok(microResult.statementEquivalent.includes('₹'));

    // Mega-gift: $50B on $100B wealth = 50%
    const megaResult = calculateHistoricalDonationParity({
      donationAmount: 50_000_000_000,
      donationDate: '2021-06-20',
      snapshots: standardSnapshots,
      userNetWorth: 10_000_000, // 1 Crore
      monthlyIncome: 200_000,
      userCurrency: '₹'
    });
    assert.equal(megaResult.historicalGenerosityRatio, 50.0);
    assert.equal(megaResult.userEquivalent, 5_000_000); // 50 Lakhs
    assert.equal(megaResult.statementEquivalent, 'That would be ₹5.00 Million for you.');
    assert.match(megaResult.incomeInterpretation, /That's about 2500% of one month's take-home pay/);
  });

  // =========================================================================
  // 10. Backwards Compatibility with Legacy Tests
  // =========================================================================
  test('10. Backwards Compatibility: When userNetWorth is omitted and userIncome is passed, legacy equivalence works', () => {
    const legacyResult = calculateHistoricalDonationParity({
      donationAmount: 1_000_000_000,
      donationDate: '2018-05-01',
      historicalNetWorth: 50_000_000_000,
      userIncome: 60_000,
      incomeFrequency: 'monthly',
      userCurrency: '₹'
    });

    assert.equal(legacyResult.isAvailable, true);
    assert.equal(legacyResult.historicalGenerosityRatio, 2.0);
    assert.equal(legacyResult.userEquivalent, 1_200); // 2% of 60,000 = 1,200
    assert.equal(legacyResult.userEquivalentMonthly, 1_200);
    assert.equal(legacyResult.userEquivalentAnnual, 14_400);
    assert.equal(legacyResult.statementEquivalent, 'For an income of ₹60,000/month, that is equivalent to ₹1,200.00.');
  });
});
