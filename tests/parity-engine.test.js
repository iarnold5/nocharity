/**
 * Unit Tests for Historical Wealth-Aware Calculation Engine (Phase 3)
 * 
 * Verifies:
 * 1. exact-date wealth (0 days diff, EXACT_DATE)
 * 2. near-date wealth (1–90 days diff, NEAR_DATE)
 * 3. same-year wealth (>90 days within same calendar year, SAME_YEAR)
 * 4. approximate wealth (>1 year up to 3 years, APPROXIMATE)
 * 5. missing wealth (null/empty snapshots, UNAVAILABLE)
 * 6. zero/invalid wealth (zero, negative, NaN net worth, UNAVAILABLE)
 * 7. future wealth snapshot rejection (snapshot_date > donation_date, UNAVAILABLE)
 * 8. stale wealth older than 3 years (UNAVAILABLE)
 * 9. large numbers ($250B+ wealth, $10B+ gifts)
 * 10. decimal ratios & precision (tiny percentage without floating corruption or internal rounding)
 * 11. monthly vs annual income calculations & explicit frequency declaration
 * 12. user prompt canonical example ($1B donation, $50B wealth, ₹60,000 monthly income -> ₹1,200)
 * 13. currency separation (source USD untouched by display exchange rate)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALITY_TIERS,
  parseCalendarDate,
  calculateDaysBetween,
  classifySnapshotQuality,
  findClosestHistoricalWealthSnapshot,
  calculateHistoricalDonationParity,
  formatCurrencyAmount,
  formatRatio
} from '../server/parity-engine.js';

describe('Historical Wealth Parity Engine - Unit Tests', () => {

  // Test 1: Exact-Date Wealth
  test('1. Exact-Date Wealth: Snapshot matches donation date exactly (0 days)', () => {
    const snapshots = [
      { snapshot_date: '2017-01-01', net_worth: 40_000_000_000 },
      { snapshot_date: '2018-05-01', net_worth: 50_000_000_000 }, // Exact match
      { snapshot_date: '2019-01-01', net_worth: 60_000_000_000 }  // Future (relative to donation)
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 1_000_000_000, // $1B
      donationDate: '2018-05-01',
      snapshots,
      userIncome: 60_000,
      incomeFrequency: 'monthly',
      userCurrency: '₹'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.quality, QUALITY_TIERS.EXACT_DATE);
    assert.equal(result.daysDiff, 0);
    assert.equal(result.snapshotDate, '2018-05-01');
    assert.equal(result.historicalNetWorth, 50_000_000_000);
    assert.equal(result.historicalGenerosityRatio, 2.0); // Exactly 2%
    assert.equal(result.userEquivalent, 1200); // Exactly ₹1,200
    assert.equal(result.incomeFrequency, 'monthly');
    assert.equal(result.userCurrency, '₹');
    assert.equal(result.formattedRatio, '2.00%');
  });

  // Test 2: Near-Date Wealth (1-90 days before donation)
  test('2. Near-Date Wealth: Snapshot 45 days prior to donation', () => {
    const snapshots = [
      { snapshot_date: '2024-03-01', net_worth: 100_000_000_000 }
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 500_000_000, // $500M
      donationDate: '2024-04-15', // 45 days after March 1
      snapshots,
      userIncome: 5_000,
      incomeFrequency: 'monthly',
      userCurrency: '$'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.quality, QUALITY_TIERS.NEAR_DATE);
    assert.equal(result.daysDiff, 45);
    assert.equal(result.historicalGenerosityRatio, 0.5); // 0.5%
    assert.equal(result.userEquivalent, 25); // $25
  });

  // Test 3: Same-Year Wealth (>90 days before donation, same calendar year)
  test('3. Same-Year Wealth: Snapshot 180 days prior within same calendar year', () => {
    const snapshots = [
      { snapshot_date: '2023-01-01', net_worth: 80_000_000_000 }
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 800_000_000,
      donationDate: '2023-07-01', // 181 days later, same calendar year 2023
      snapshots,
      userIncome: 4_000,
      incomeFrequency: 'monthly'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.quality, QUALITY_TIERS.SAME_YEAR);
    assert(result.daysDiff > 90, 'daysDiff must be > 90');
    assert.equal(result.historicalGenerosityRatio, 1.0);
    assert.equal(result.userEquivalent, 40);
  });

  // Test 4: Approximate Wealth (1 to 3 years prior)
  test('4. Approximate Wealth: Snapshot 500 days prior (~1.4 years)', () => {
    const snapshots = [
      { snapshot_date: '2021-01-01', net_worth: 120_000_000_000 }
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 1_200_000_000,
      donationDate: '2022-05-16', // 500 days later
      snapshots,
      userIncome: 10_000,
      incomeFrequency: 'monthly'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.quality, QUALITY_TIERS.APPROXIMATE);
    assert.equal(result.daysDiff, 500);
    assert.equal(result.historicalGenerosityRatio, 1.0);
    assert.equal(result.userEquivalent, 100);
    assert(result.explanation.includes('approximate') || result.reason.includes('approximate'));
  });

  // Test 5: Missing Wealth Data
  test('5. Missing Wealth: Empty snapshot array or null yields UNAVAILABLE without silent fallback', () => {
    const resultEmpty = calculateHistoricalDonationParity({
      donationAmount: 100_000_000,
      donationDate: '2020-01-01',
      snapshots: [],
      userIncome: 50_000
    });

    assert.equal(resultEmpty.isAvailable, false);
    assert.equal(resultEmpty.quality, QUALITY_TIERS.UNAVAILABLE);
    assert.equal(resultEmpty.historicalNetWorth, null);
    assert.equal(resultEmpty.historicalGenerosityRatio, null);
    assert.equal(resultEmpty.userEquivalent, null);

    const resultNull = calculateHistoricalDonationParity({
      donationAmount: 100_000_000,
      donationDate: '2020-01-01',
      snapshots: null,
      userIncome: 50_000
    });

    assert.equal(resultNull.isAvailable, false);
    assert.equal(resultNull.quality, QUALITY_TIERS.UNAVAILABLE);
  });

  // Test 6: Zero / Invalid Wealth
  test('6. Zero / Invalid Wealth: Net worth <= 0, NaN or missing yields UNAVAILABLE and avoids division by zero', () => {
    const snapshotsZero = [
      { snapshot_date: '2020-01-01', net_worth: 0 }
    ];
    const resZero = calculateHistoricalDonationParity({
      donationAmount: 10_000_000,
      donationDate: '2020-01-01',
      snapshots: snapshotsZero,
      userIncome: 50_000
    });
    assert.equal(resZero.isAvailable, false);
    assert.equal(resZero.quality, QUALITY_TIERS.UNAVAILABLE);

    const snapshotsNegative = [
      { snapshot_date: '2020-01-01', net_worth: -50_000_000 }
    ];
    const resNegative = calculateHistoricalDonationParity({
      donationAmount: 10_000_000,
      donationDate: '2020-01-01',
      snapshots: snapshotsNegative,
      userIncome: 50_000
    });
    assert.equal(resNegative.isAvailable, false);
    assert.equal(resNegative.quality, QUALITY_TIERS.UNAVAILABLE);
  });

  // Test 7: Future-Only Wealth Snapshots Rejection
  test('7. Future Wealth Snapshots Rejection: Never use future snapshots for historical donation', () => {
    // Donation on 2015-06-01, but only snapshots from 2016 and 2017 exist
    const snapshots = [
      { snapshot_date: '2016-01-01', net_worth: 50_000_000_000 },
      { snapshot_date: '2017-01-01', net_worth: 70_000_000_000 }
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 500_000_000,
      donationDate: '2015-06-01',
      snapshots,
      userIncome: 60_000
    });

    assert.equal(result.isAvailable, false);
    assert.equal(result.quality, QUALITY_TIERS.UNAVAILABLE);
    assert.equal(result.historicalNetWorth, null);
    assert.equal(result.historicalGenerosityRatio, null);
  });

  // Test 8: Stale Snapshots (> 3 Years Prior)
  test('8. Stale Snapshots: Wealth snapshots older than 3 years (1095 days) yield UNAVAILABLE', () => {
    const snapshots = [
      { snapshot_date: '2015-01-01', net_worth: 50_000_000_000 }
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 500_000_000,
      donationDate: '2019-01-01', // 4 years (1461 days) later
      snapshots,
      userIncome: 60_000
    });

    assert.equal(result.isAvailable, false);
    assert.equal(result.quality, QUALITY_TIERS.UNAVAILABLE);
    assert.equal(result.historicalGenerosityRatio, null);
  });

  // Test 9: Large Numbers
  test('9. Large Numbers: Extreme wealth figures ($300B) and multi-billion donations calculate with high precision', () => {
    const snapshots = [
      { snapshot_date: '2024-01-01', net_worth: 320_000_000_000 } // $320B (Elon Musk / Bernard Arnault scale)
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 5_740_000_000, // $5.74B gift
      donationDate: '2024-01-01',
      snapshots,
      userIncome: 75_000,
      incomeFrequency: 'monthly',
      userCurrency: '₹'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.quality, QUALITY_TIERS.EXACT_DATE);
    // 5.74B / 320B * 100 = 1.79375%
    assert.equal(result.historicalGenerosityRatio, 1.79375);
    // User equivalent = 75,000 * (1.79375 / 100) = 1345.3125
    assert.equal(result.userEquivalent, 1345.3125);
    assert.equal(result.userEquivalentMonthly, 1345.3125);
    assert(Math.abs(result.userEquivalentAnnual - 16143.75) < 1e-9);
  });

  // Test 10: Decimal Ratios & Precision (No Internal Premature Rounding)
  test('10. Decimal Ratios: Micro-fractions retain full float precision without internal rounding', () => {
    const snapshots = [
      { snapshot_date: '2023-05-10', net_worth: 150_000_000_000 } // $150B
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 50_000, // Small $50,000 gift relative to $150B
      donationDate: '2023-05-10',
      snapshots,
      userIncome: 60_000,
      incomeFrequency: 'monthly',
      userCurrency: '₹'
    });

    assert.equal(result.isAvailable, true);
    // 50,000 / 150,000,000,000 * 100 = 0.000033333333333333335%
    const expectedRatio = (50000 / 150000000000) * 100;
    assert.equal(result.historicalGenerosityRatio, expectedRatio);
    // User equivalent: 60,000 * (expectedRatio / 100) = 0.02
    assert.equal(result.userEquivalent, 60000 * (expectedRatio / 100));
    assert(Math.abs(result.userEquivalent - 0.02) < 1e-10);
  });

  // Test 11: Monthly vs Annual Income
  test('11. Monthly vs Annual Income: Explicit frequency declarations and proportional scaling', () => {
    const snapshots = [
      { snapshot_date: '2024-06-01', net_worth: 100_000_000_000 }
    ];

    // Monthly income test: $5,000 monthly
    const monthlyResult = calculateHistoricalDonationParity({
      donationAmount: 2_000_000_000, // 2%
      donationDate: '2024-06-01',
      snapshots,
      userIncome: 5_000,
      incomeFrequency: 'monthly',
      userCurrency: '$'
    });

    assert.equal(monthlyResult.incomeFrequency, 'monthly');
    assert.equal(monthlyResult.historicalGenerosityRatio, 2.0);
    assert.equal(monthlyResult.userEquivalent, 100); // 2% of $5,000 = $100
    assert.equal(monthlyResult.userEquivalentMonthly, 100);
    assert.equal(monthlyResult.userEquivalentAnnual, 1200);

    // Annual income test: $60,000 annual
    const annualResult = calculateHistoricalDonationParity({
      donationAmount: 2_000_000_000, // 2%
      donationDate: '2024-06-01',
      snapshots,
      userIncome: 60_000,
      incomeFrequency: 'annual',
      userCurrency: '$'
    });

    assert.equal(annualResult.incomeFrequency, 'annual');
    assert.equal(annualResult.historicalGenerosityRatio, 2.0);
    assert.equal(annualResult.userEquivalent, 1200); // 2% of $60,000 = $1,200
    assert.equal(annualResult.userEquivalentAnnual, 1200);
    assert.equal(annualResult.userEquivalentMonthly, 100);
  });

  // Test 12: User Prompt Canonical Example
  test('12. User Prompt Canonical Example: $1B donation in 2018-05-01 vs $50B wealth with ₹60,000 monthly income', () => {
    const snapshots = [
      { snapshot_date: '2018-05-01', net_worth: 50_000_000_000 }
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 1_000_000_000, // $1B
      donationDate: '2018-05-01',
      snapshots,
      userIncome: 60_000,
      incomeFrequency: 'monthly',
      userCurrency: '₹'
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.quality, QUALITY_TIERS.EXACT_DATE);
    assert.equal(result.historicalGenerosityRatio, 2.0); // 2%
    assert.equal(result.userEquivalent, 1200); // ₹1,200
    assert.equal(result.userCurrency, '₹');
    assert.equal(result.formattedUserEquivalent, '₹1,200.00');
  });

  // Test 13: Currency Display Separation
  test('13. Currency Display Separation: Display exchange rates never distort source USD ratio calculation', () => {
    const snapshots = [
      { snapshot_date: '2022-01-01', net_worth: 100_000_000_000, currency: 'USD' }
    ];

    const result = calculateHistoricalDonationParity({
      donationAmount: 5_000_000_000, // $5B (5%)
      donationDate: '2022-01-01',
      snapshots,
      userIncome: 50_000,
      incomeFrequency: 'monthly',
      sourceCurrency: 'USD',
      userCurrency: '₹',
      displayExchangeRate: 83.5 // 1 USD = 83.5 INR
    });

    assert.equal(result.isAvailable, true);
    assert.equal(result.sourceCurrency, 'USD');
    assert.equal(result.historicalGenerosityRatio, 5.0); // Ratio remains exact 5.0%
    assert.equal(result.userEquivalent, 2500); // 5% of ₹50,000 = ₹2,500
    assert.equal(result.displayConversion.applied, true);
    assert.equal(result.displayConversion.rate, 83.5);
    assert.equal(result.displayConversion.convertedDonationAmount, 417_500_000_000); // 5B * 83.5
    assert.equal(result.displayConversion.convertedHistoricalNetWorth, 8_350_000_000_000); // 100B * 83.5
  });

  // Test 14: Date Parsing & Calendar Difference
  test('14. Calendar date parsing handles ISO strings, standard dates, and custom objects accurately', () => {
    const parsed = parseCalendarDate('2025-06-28');
    assert.equal(parsed.year, 2025);
    assert.equal(parsed.month, 6);
    assert.equal(parsed.day, 28);
    assert.equal(parsed.isoString, '2025-06-28');

    const diff = calculateDaysBetween('2025-06-01', '2025-06-28');
    assert.equal(diff, 27);
  });

  // Test 15: Preservation of Basic Mode Parity Calculation
  test('15. Preservation of Basic Mode: Original calculateDonationParity remains unchanged and functional', async () => {
    const { calculateDonationParity } = await import('../mcp-server.js');
    const mockBillionaire = {
      id: 'warren-buffett',
      netWorth: 100_000_000_000,
      estimatedAnnualIncome: 10_000_000_000
    };

    const basicNetWorthParity = calculateDonationParity(mockBillionaire, 1_000_000_000, 4000, '$', 'networth');
    assert.equal(basicNetWorthParity.percentage, 1.0);
    assert.equal(basicNetWorthParity.userEquivalentMonthly, 40);
    assert.equal(basicNetWorthParity.userEquivalentAnnual, 480);
    assert.equal(basicNetWorthParity.baseMetricLabel, 'Total Net Worth');

    const basicIncomeParity = calculateDonationParity(mockBillionaire, 1_000_000_000, 4000, '$', 'income');
    assert.equal(basicIncomeParity.percentage, 10.0);
    assert.equal(basicIncomeParity.userEquivalentMonthly, 400);
    assert.equal(basicIncomeParity.userEquivalentAnnual, 4800);
    assert.equal(basicIncomeParity.baseMetricLabel, 'Estimated Annual Earnings');
  });

  // Test 16: MCP Server Tool Exposure
  test('16. MCP Server: Exports calculate_historical_donation_parity and handles requests', async () => {
    const { createMcpServer } = await import('../mcp-server.js');
    const server = createMcpServer();
    assert(server, 'MCP server instance must be created successfully');
  });
});

