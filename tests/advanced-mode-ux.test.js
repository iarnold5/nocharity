/**
 * Test Suite: Advanced Mode User Experience & "Show Me the Receipts" Flow
 * 
 * Verifies:
 * 1. Primary Flow & Visual Dominance in public/advanced.html:
 *    - Step 1: Choose a billionaire
 *    - Step 2: Choose a documented donation
 *    - Step 3: Dominant donation headline & reaction line
 *    - Step 4 & 5: Historical wealth statement & percentage of wealth donated
 *    - Step 6: User financial context (Net worth & take-home pay)
 *    - Step 7: User's equivalent & paycheck interpretation
 *    - Step 8: Progressive disclosure receipts with 7 distinct accordions
 * 2. Mobile-first design and responsive viewport rules
 * 3. Billionaire with verified historical wealth
 * 4. Billionaire with limited / unavailable historical data
 * 5. Donation with Tier 1 primary regulatory sources
 * 6. Donation with lower-quality but valid sources
 * 7. Missing optional user information (net worth, income, or both)
 * 8. Supabase unavailable / offline fallback handling
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  calculateHistoricalDonationParity,
  findClosestHistoricalWealthSnapshot,
  QUALITY_TIERS,
  QUALITY_METADATA
} from '../server/parity-engine.js';
import {
  getCanonicalBillionaires
} from '../server/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

describe('NoCharity Advanced Mode UX & "Show Me the Receipts" Verification', () => {

  const advancedHtml = fs.readFileSync(path.join(rootDir, 'public', 'advanced.html'), 'utf8');

  // =========================================================================
  // 1. Primary Flow & Visual Dominance in Template
  // =========================================================================
  describe('1. Primary Flow & Dominant Result Presentation', () => {
    test('1.1 First viewport includes clear 8-step flow elements', () => {
      // Step 1: Choose a billionaire
      assert.match(advancedHtml, /id="calcBillionaireSelect"/, 'Must contain billionaire selector');
      // Step 2: Choose a documented donation
      assert.match(advancedHtml, /id="calcDonationSelect"/, 'Must contain donation selector');
      // Step 3: Dominant headline amount and reaction line
      assert.match(advancedHtml, /id="calcHeroHeadlineAmount"/, 'Must contain dominant headline amount element');
      assert.match(advancedHtml, /id="calcHeroReaction"/, 'Must contain reaction line element');
      // Step 4 & 5: Wealth at donation date and percentage
      assert.match(advancedHtml, /id="calcHeroWealthStatement"/, 'Must contain wealth statement element');
      assert.match(advancedHtml, /id="calcHeroRatio"/, 'Must contain ratio percentage element');
      // Step 6: User financial context
      assert.match(advancedHtml, /id="calcUserNetWorthInput"/, 'Must contain user net worth input');
      assert.match(advancedHtml, /id="calcUserIncomeInput"/, 'Must contain user take-home pay input');
      // Step 7: User's equivalent & paycheck interpretation
      assert.match(advancedHtml, /id="calcHeroEquivalent"/, 'Must contain user equivalent amount element');
      assert.match(advancedHtml, /id="calcIncomeInterpretationText"/, 'Must contain paycheck interpretation element');
      // Calm, observational satirical kicker
      assert.match(advancedHtml, /id="calcHumorKickerText"/, 'Must contain observational juxtaposition element');
    });

    test('1.2 Dominant result card is styled for visual prominence', () => {
      assert.match(advancedHtml, /\.dominant-result-card/, 'CSS defines dominant result card container');
      assert.match(advancedHtml, /\.result-headline-amount/, 'CSS defines large headline typography');
      assert.match(advancedHtml, /\.result-reaction-line/, 'CSS defines reaction line style');
      assert.match(advancedHtml, /\.result-percentage-highlight/, 'CSS defines percentage highlight');
      assert.match(advancedHtml, /\.result-user-amount/, 'CSS defines prominent user equivalent amount');
      assert.match(advancedHtml, /\.result-satire-box/, 'CSS defines calm satire box');
    });
  });

  // =========================================================================
  // 2. Progressive Disclosure: 7 Distinct Expandable Accordions
  // =========================================================================
  describe('2. Progressive Disclosure Accordions ("Show Me the Receipts")', () => {
    test('2.1 Template contains all 7 secondary expandable sections', () => {
      // 1. How we calculated this
      assert.match(advancedHtml, /id="acc-calculation"/, 'Must contain Calculation accordion');
      assert.match(advancedHtml, /How we calculated this/i, 'Must have label "How we calculated this"');
      assert.match(advancedHtml, /id="calcReceiptRatioFormula"/, 'Must have ratio formula container');
      assert.match(advancedHtml, /id="calcReceiptEquivFormula"/, 'Must have equivalent formula container');

      // 2. Historical wealth
      assert.match(advancedHtml, /id="acc-wealth"/, 'Must contain Historical wealth accordion');
      assert.match(advancedHtml, /Historical wealth at donation date/i, 'Must have label for historical wealth');
      assert.match(advancedHtml, /id="receiptValWealth"/, 'Must display valuation amount');
      assert.match(advancedHtml, /id="calcReceiptSnapshotDate"/, 'Must display valuation date');
      assert.match(advancedHtml, /id="badgeWealthProximity"/, 'Must have proximity badge');

      // 3. Donation details
      assert.match(advancedHtml, /id="acc-donation"/, 'Must contain Donation details accordion');
      assert.match(advancedHtml, /Donation details/i, 'Must have label for donation details');
      assert.match(advancedHtml, /id="calcReceiptRecipient"/, 'Must display recipient');
      assert.match(advancedHtml, /id="calcReceiptAmountDisplay"/, 'Must display donation amount');
      assert.match(advancedHtml, /id="badgeDonationType"/, 'Must have donation type badge');

      // 4. Source evidence
      assert.match(advancedHtml, /id="acc-sources"/, 'Must contain Source evidence accordion');
      assert.match(advancedHtml, /Source evidence & citations/i, 'Must have label for source citations');
      assert.match(advancedHtml, /id="calcReceiptSourcesContainer"/, 'Must contain dynamic sources container');
      assert.match(advancedHtml, /id="badgeSourceTier"/, 'Must display source tier badge');

      // 5. Data quality
      assert.match(advancedHtml, /id="acc-quality"/, 'Must contain Data quality accordion');
      assert.match(advancedHtml, /Data quality & verification audit/i, 'Must have label for data quality audit');
      assert.match(advancedHtml, /id="calcSelectionQualityBadge"/, 'Must have casual data quality badge');
      assert.match(advancedHtml, /id="calcQualityScorePill"/, 'Must have audit score pill');
      assert.match(advancedHtml, /id="calcReceiptQualityChecklist"/, 'Must contain verification checklist grid');

      // 6. Attribution / funding source
      assert.match(advancedHtml, /id="acc-attribution"/, 'Must contain Attribution accordion');
      assert.match(advancedHtml, /Attribution & funding source/i, 'Must have label for attribution');
      assert.match(advancedHtml, /id="calcReceiptFundingSource"/, 'Must display funding source badge');

      // 7. Methodology
      assert.match(advancedHtml, /id="acc-methodology"/, 'Must contain Methodology accordion');
      assert.match(advancedHtml, /Methodology & marginal utility/i, 'Must have label for methodology');
    });

    test('2.2 Accordions use native <details> / <summary> elements without requiring JavaScript to expand', () => {
      const detailsCount = (advancedHtml.match(/<details class="receipt-accordion"/g) || []).length;
      assert.ok(detailsCount >= 7, `Expected at least 7 <details> accordions, found ${detailsCount}`);
    });
  });

  // =========================================================================
  // 3. Mobile Viewport & Responsive Design
  // =========================================================================
  describe('3. Mobile Viewport Responsiveness', () => {
    test('3.1 Mobile media queries exist and enforce thumb-friendly, non-overflowing layouts', () => {
      assert.match(advancedHtml, /@media\s*\(max-width:\s*768px\)/, 'Must have 768px media query');
      assert.match(advancedHtml, /grid-template-columns:\s*1fr/, 'Grid containers must collapse to 1 column on mobile');
      assert.match(advancedHtml, /overflow-x:\s*hidden/, 'Must prevent horizontal overflow');
      assert.match(advancedHtml, /word-break:\s*break-word/, 'Must break long text to prevent card blowouts');
    });
  });

  // =========================================================================
  // 4. Parity Logic: Billionaire with Historical Wealth
  // =========================================================================
  describe('4. Billionaire with Verified Historical Wealth', () => {
    test('4.1 Calculates exact percentage and user equivalent for Warren Buffett benchmark', () => {
      const snapshots = [
        { snapshot_date: '2018-05-01', net_worth: 100_000_000_000, source: 'Bloomberg' }
      ];

      const result = calculateHistoricalDonationParity({
        donationAmount: 500_000_000,
        donationDate: '2018-05-01',
        snapshots,
        userNetWorth: 1_000_000,
        monthlyIncome: 35_000,
        userCurrency: '₹'
      });

      assert.strictEqual(result.isAvailable, true);
      assert.strictEqual(result.historicalNetWorth, 100_000_000_000);
      assert.strictEqual(result.historicalGenerosityRatio, 0.50);
      assert.strictEqual(result.formattedRatio, '0.50%');
      assert.strictEqual(result.userEquivalent, 5_000);
      assert.strictEqual(result.quality, QUALITY_TIERS.EXACT_DATE);
      assert.match(result.incomeInterpretation, /That's about 14% of one month's take-home pay/);
    });
  });

  // =========================================================================
  // 5. Parity Logic: Billionaire with Limited Historical Data
  // =========================================================================
  describe('5. Billionaire with Limited / Stale Historical Data', () => {
    test('5.1 Quarantines snapshots older than 3 years as UNAVAILABLE', () => {
      const staleSnapshots = [
        { snapshot_date: '2010-01-01', net_worth: 50_000_000_000 } // > 10 years before donation
      ];

      const result = calculateHistoricalDonationParity({
        donationAmount: 100_000_000,
        donationDate: '2022-01-01',
        snapshots: staleSnapshots,
        userNetWorth: 1_000_000
      });

      assert.strictEqual(result.isAvailable, false, 'Stale snapshot must be quarantined');
      assert.strictEqual(result.quality, QUALITY_TIERS.UNAVAILABLE);
      assert.strictEqual(result.userEquivalent, null);
      assert.match(result.explanation, /older than 3 years|3 years/i);
    });

    test('5.2 Strictly rejects snapshots with dates in the future relative to the donation', () => {
      const futureSnapshots = [
        { snapshot_date: '2023-01-01', net_worth: 150_000_000_000 }
      ];

      const result = calculateHistoricalDonationParity({
        donationAmount: 100_000_000,
        donationDate: '2020-01-01', // 3 years before snapshot
        snapshots: futureSnapshots,
        userNetWorth: 1_000_000
      });

      assert.strictEqual(result.isAvailable, false);
      assert.strictEqual(result.quality, QUALITY_TIERS.UNAVAILABLE);
    });
  });

  // =========================================================================
  // 6. Source Quality & Tier Inspection
  // =========================================================================
  describe('6. Source Tiers & Citation Cleanliness', () => {
    test('6.1 Template formats Tier 1 primary regulatory sources cleanly without DB metadata dump', () => {
      assert.match(advancedHtml, /\.source-tier-pill\.tier-1/, 'Has Tier 1 CSS styling');
      assert.match(advancedHtml, /\.source-tier-pill\.tier-2/, 'Has Tier 2 CSS styling');
      assert.match(advancedHtml, /class="source-evidence-card"/, 'Has source evidence card structure');
      assert.match(advancedHtml, /class="source-evidence-head"/, 'Displays publisher/title header');
      assert.match(advancedHtml, /class="source-evidence-fact"/, 'Displays specific fact supported');
      assert.match(advancedHtml, /renderEvidenceSources/, 'Has renderEvidenceSources function');
    });
  });

  // =========================================================================
  // 7. Missing Optional User Information
  // =========================================================================
  describe('7. Missing Optional User Financial Context', () => {
    test('7.1 Works cleanly when user net worth is missing but income is provided', () => {
      const snapshots = [
        { snapshot_date: '2021-06-20', net_worth: 100_000_000_000 }
      ];

      const result = calculateHistoricalDonationParity({
        donationAmount: 500_000_000,
        donationDate: '2021-06-20',
        snapshots,
        userNetWorth: null,
        monthlyIncome: 35_000,
        userCurrency: '₹'
      });

      assert.strictEqual(result.isAvailable, true);
      assert.strictEqual(result.userEquivalent, null, 'Direct net worth equivalent cannot be invented');
      assert.strictEqual(result.netWorthStatus, 'MISSING');
      assert.match(result.incomeInterpretation, /Direct wealth comparison requires an estimated net worth/);
      assert.match(result.incomeInterpretation, /Note: comparing wealth to income is conceptually mismatched/);
    });

    test('7.2 Works cleanly when both net worth and monthly income are missing', () => {
      const snapshots = [
        { snapshot_date: '2021-06-20', net_worth: 100_000_000_000 }
      ];

      const result = calculateHistoricalDonationParity({
        donationAmount: 500_000_000,
        donationDate: '2021-06-20',
        snapshots,
        userNetWorth: null,
        monthlyIncome: null
      });

      assert.strictEqual(result.isAvailable, true);
      assert.strictEqual(result.historicalGenerosityRatio, 0.5);
      assert.strictEqual(result.formattedRatio, '0.50%');
      assert.strictEqual(result.userEquivalent, null);
      assert.strictEqual(result.incomeInterpretation, null);
      assert.strictEqual(result.statementEquivalent, 'Direct comparison requires an estimated net worth.');
    });
  });

  // =========================================================================
  // 8. Graceful Fallbacks When Supabase is Offline
  // =========================================================================
  describe('8. Supabase Offline Resilience', () => {
    test('8.1 getCanonicalBillionaires provides verified fallback data without throwing', async () => {
      const canonicalData = await getCanonicalBillionaires({
        monthlyIncome: 35000,
        currency: '₹',
        mode: 'networth'
      });

      assert.ok(canonicalData, 'Returns data');
      assert.ok(Array.isArray(canonicalData.billionaires), 'Contains billionaires array');
      assert.ok(canonicalData.billionaires.length > 0, 'Contains tracked donors');
      const buffett = canonicalData.billionaires.find(b => b.name.includes('Buffett') || b.id === 'warren-buffett');
      assert.ok(buffett, 'Includes Warren Buffett benchmark');
      assert.ok(buffett.userEquivalentMonthly > 0, 'Computes userEquivalentMonthly cleanly');
      assert.strictEqual(buffett.historicalDonations.length, 4, 'Includes historical donations');
    });
  });
});
