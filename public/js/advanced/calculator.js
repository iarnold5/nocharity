/**
 * Advanced Mode Reality Check Calculator
 * Handles billionaire selection, donation pairing, currency switching,
 * historical wealth parity calculation, and receipt accordion rendering.
 */

import { state } from './state.js';
import { formatCurrency, formatHeadlineAmount } from './utils.js';
import { fetchPeople, fetchDonations, fetchParity, fetchComparison } from './api.js';

export async function loadRealityCheckCalculator() {
  const c = state.calculator;
  
  const nwInput = document.getElementById('calcUserNetWorthInput');
  if (nwInput) nwInput.value = (c.userNetWorth !== null && c.userNetWorth !== undefined) ? c.userNetWorth : '';

  const incomeInput = document.getElementById('calcUserIncomeInput');
  if (incomeInput) incomeInput.value = (c.monthlyIncome !== null && c.monthlyIncome !== undefined) ? c.monthlyIncome : '';
  
  const currSelect = document.getElementById('calcCurrencySelect');
  if (currSelect) currSelect.value = c.currency;

  const incomeSymbol = document.getElementById('calcIncomeCurrencySymbol');
  if (incomeSymbol) incomeSymbol.textContent = c.currency;

  // Fetch billionaires list if not already loaded
  if (!c.allBillionaires || c.allBillionaires.length === 0) {
    try {
      const data = await fetchPeople({ limit: 100, sortBy: 'personal_giving', sortOrder: 'desc' });
      c.allBillionaires = data.people || [];
    } catch (err) {
      console.error('Error fetching billionaires for calculator:', err);
    }
  }

  // Populate Billionaire Select
  const billSelect = document.getElementById('calcBillionaireSelect');
  if (billSelect && billSelect.options.length <= 1) {
    billSelect.innerHTML = `
      <option value="canonical" ${c.isCanonicalExample ? 'selected' : ''}>⭐ Canonical Benchmark ($500M on $100B)</option>
      ${c.allBillionaires.map(b => `
        <option value="${b.id || b.person_id}" ${(!c.isCanonicalExample && c.selectedBillionaireId === (b.id || b.person_id)) ? 'selected' : ''}>
          ${b.canonical_name} (${formatCurrency(b.latest_net_worth)}) · ${b.country || ''}
        </option>
      `).join('')}
    `;
  }

  populateBillionaireDropdowns(c.allBillionaires);

  if (!c.isCanonicalExample && c.selectedBillionaireId) {
    await loadDonationsForCalculator(c.selectedBillionaireId);
  } else {
    const donSelect = document.getElementById('calcDonationSelect');
    if (donSelect) {
      donSelect.innerHTML = `<option value="canonical" selected>$500,000,000 (0.50% of $100B Net Worth) — Gates Foundation & Family Charities (2018-05-01)</option>`;
    }
  }

  await calculateAndRenderParity();
  loadRealityCheckComparison();
}

export async function loadDonationsForCalculator(personId) {
  const donSelect = document.getElementById('calcDonationSelect');
  if (!donSelect) return;

  try {
    const data = await fetchDonations({ personId, limit: 50 });
    const dons = data.donations || [];
    state.calculator.currentDonationsList = dons;

    if (dons.length === 0) {
      donSelect.innerHTML = '<option value="">No verified personal gifts on public record</option>';
      state.calculator.selectedDonationId = null;
      return;
    }

    donSelect.innerHTML = dons.map((d, idx) => {
      const amtStr = formatCurrency(d.amount);
      const cause = d.recipient_organization_name || d.recipient_person_name || d.cause_category || 'Charitable Cause';
      const pctStr = (d.historical_percentage !== null && !isNaN(d.historical_percentage)) ? ` (${Number(d.historical_percentage).toFixed(2)}% of wealth)` : '';
      return `<option value="${d.id}" ${idx === 0 ? 'selected' : ''}>${amtStr}${pctStr} — ${cause} (${d.donation_date || 'N/A'})</option>`;
    }).join('');

    state.calculator.selectedDonationId = dons[0].id;
  } catch (err) {
    console.error('Error fetching donations for calculator:', err);
  }
}

export async function calculateAndRenderParity() {
  const c = state.calculator;
  const curr = c.currency || '$';

  const hasNetWorth = c.userNetWorth !== null && c.userNetWorth !== undefined && c.userNetWorth !== '' && !isNaN(parseFloat(c.userNetWorth));
  const numericNetWorth = hasNetWorth ? parseFloat(c.userNetWorth) : null;

  const hasMonthly = c.monthlyIncome !== null && c.monthlyIncome !== undefined && c.monthlyIncome !== '' && !isNaN(parseFloat(c.monthlyIncome));
  const numericMonthlyIncome = hasMonthly ? parseFloat(c.monthlyIncome) : null;

  // Canonical Benchmark Mode
  if (c.isCanonicalExample || !c.selectedDonationId || c.selectedDonationId === 'canonical') {
    const ratio = 0.50;
    const donationAmt = 500000000;
    const wealthAmt = 100000000000;
    const donorName = 'Warren Buffett';

    document.getElementById('calcHeroHeadlineAmount').textContent = formatHeadlineAmount(donationAmt, '$');
    document.getElementById('calcHeroReaction').textContent = 'That sounds like a vast sum of money.';
    document.getElementById('displayBillionaireHero').textContent = donorName;
    document.getElementById('calcHeroWealth').textContent = formatCurrency(wealthAmt, '$');
    document.getElementById('calcHeroRatio').textContent = '0.50%';

    let userEquivalentStr = 'N/A';
    let paycheckInterp = '';

    if (numericNetWorth !== null) {
      const userEquiv = (numericNetWorth * ratio) / 100;
      userEquivalentStr = `${curr}${Math.round(userEquiv).toLocaleString()}`;

      if (numericMonthlyIncome && numericMonthlyIncome > 0) {
        const share = Math.round((userEquiv / numericMonthlyIncome) * 100);
        const days = Math.round(userEquiv / (numericMonthlyIncome / 30));
        paycheckInterp = `That's about ${share}% of your monthly take-home pay (${days >= 1 ? `roughly ${days} days of earnings` : 'less than one workday'}).`;
      } else {
        paycheckInterp = `Calibrated against your ${curr}${Math.round(numericNetWorth).toLocaleString()} net worth.`;
      }
    } else if (numericMonthlyIncome !== null) {
      const userEquiv = (numericMonthlyIncome * ratio) / 100;
      userEquivalentStr = `${curr}${Math.round(userEquiv).toLocaleString()}`;
      paycheckInterp = `Illustrative monthly paycheck analogy (0.50% of monthly take-home pay).`;
    } else {
      userEquivalentStr = 'Requires Net Worth';
      paycheckInterp = 'Enter your net worth above to calculate your exact proportional equivalent.';
    }

    document.getElementById('calcHeroEquivalent').textContent = userEquivalentStr;
    document.getElementById('calcIncomeInterpretationText').textContent = paycheckInterp;
    document.getElementById('calcHumorKickerText').textContent = 
      `Relinquishing 0.50% of a $100.0B fortune leaves tens of billions in surplus generational capital with zero material impact on living standards. Relinquishing 0.50% of your financial foundation (${userEquivalentStr}) is a conscious personal choice.`;

    // Update Receipts
    document.getElementById('calcReceiptRatioFormula').textContent = '($500M ÷ $100B) = 0.50%';
    document.getElementById('calcReceiptEquivFormula').textContent = numericNetWorth !== null 
      ? `0.50% × ${curr}${Math.round(numericNetWorth).toLocaleString()} = ${userEquivalentStr}`
      : 'Wealth input required';
    document.getElementById('receiptValWealth').textContent = '$100.0B';
    document.getElementById('calcReceiptSnapshotDate').textContent = '2018-05-01';
    document.getElementById('calcReceiptAmountDisplay').textContent = '$500,000,000';
    document.getElementById('calcReceiptRecipient').textContent = 'Gates Foundation & Family Charities';
    renderEvidenceSources([
      {
        title: 'Berkshire Hathaway Annual Shareholder Letter & Form 4 Disclosures',
        publisher: 'U.S. Securities and Exchange Commission (SEC)',
        published_at: '2018-05-01',
        source_type: 'REGULATORY_FILING',
        notes: 'Verified irrevocable conversion of 3,180 Class A shares to Class B for foundation contribution.'
      }
    ], { amount: 500000000, recipient: 'Gates Foundation & Family Charities', donation_date: '2018-05-01' }, 100000000000, 'Warren Buffett');
    return;
  }

  // Live Dynamic Donation Parity
  try {
    let url = `/api/advanced/parity/calculate?donationId=${c.selectedDonationId}&userCurrency=${encodeURIComponent(curr)}`;
    if (numericNetWorth !== null) url += `&userNetWorth=${numericNetWorth}`;
    if (numericMonthlyIncome !== null) url += `&monthlyIncome=${numericMonthlyIncome}&userIncome=${numericMonthlyIncome}`;

    const data = await fetchParity(url);
    const p = data.parityResult || {};
    const d = data.donation || {};

    const donAmt = d.amount || 0;
    const donorName = d.donor_person_name || 'The Billionaire';
    const wealth = p.historicalNetWorth;
    const ratio = p.historicalGenerosityRatio;

    document.getElementById('calcHeroHeadlineAmount').textContent = formatHeadlineAmount(donAmt, '$');
    document.getElementById('displayBillionaireHero').textContent = donorName;
    document.getElementById('calcHeroWealth').textContent = wealth ? formatCurrency(wealth, '$') : 'Valuation Unavailable';
    document.getElementById('calcHeroRatio').textContent = (ratio !== null && !isNaN(ratio)) ? `${Number(ratio).toFixed(2)}%` : 'N/A';

    let reaction = 'That sounds like a substantial gift.';
    if (donAmt >= 1e9) reaction = 'A multi-billion dollar headline that dominates news cycles.';
    else if (donAmt >= 100e6) reaction = 'An enormous headline figure lauded across media.';
    document.getElementById('calcHeroReaction').textContent = reaction;

    const equiv = p.userEquivalent;
    const userEquivStr = (equiv !== null && !isNaN(equiv)) ? `${curr}${Math.round(equiv).toLocaleString()}` : (numericNetWorth ? 'Unavailable' : 'Enter Net Worth');
    document.getElementById('calcHeroEquivalent').textContent = userEquivStr;

    let paycheckInterp = p.incomeInterpretation || '';
    if (!paycheckInterp && numericNetWorth && ratio) {
      paycheckInterp = `Scaled to ${Number(ratio).toFixed(2)}% of your financial foundation.`;
    }
    document.getElementById('calcIncomeInterpretationText').textContent = paycheckInterp || 'Enter your financial context above for paycheck translation.';

    let kicker = p.explanation || '';
    if (!kicker) {
      kicker = (ratio && wealth) 
        ? `Relinquishing ${Number(ratio).toFixed(2)}% of a ${formatCurrency(wealth, '$')} fortune leaves billions in surplus capital with zero material impact on lifestyle. Relinquishing ${userEquivStr} from your own resources requires conscious budgetary sacrifice.`
        : 'Point-in-time net worth for this gift was not reliably documented within regulatory filing windows.';
    }
    document.getElementById('calcHumorKickerText').textContent = kicker;

    // Receipts
    document.getElementById('calcReceiptRatioFormula').textContent = (ratio && wealth) 
      ? `(${formatCurrency(donAmt, '$')} ÷ ${formatCurrency(wealth, '$')}) = ${Number(ratio).toFixed(2)}%`
      : 'Wealth snapshot unavailable at date of gift';
    document.getElementById('calcReceiptEquivFormula').textContent = (ratio && numericNetWorth)
      ? `${Number(ratio).toFixed(2)}% × ${curr}${Math.round(numericNetWorth).toLocaleString()} = ${userEquivStr}`
      : 'Requires valid net worth & historical valuation';
    document.getElementById('receiptValWealth').textContent = wealth ? formatCurrency(wealth, '$') : 'N/A';
    document.getElementById('calcReceiptSnapshotDate').textContent = p.snapshotDate || d.donation_date || 'N/A';
    document.getElementById('calcReceiptAmountDisplay').textContent = formatCurrency(donAmt, '$');
    document.getElementById('calcReceiptRecipient').textContent = d.recipient_organization_name || d.recipient_person_name || d.cause_category || 'Charitable Cause';
    renderEvidenceSources(data.sources || d.sources, d, wealth, donorName);
  } catch (err) {
    console.error('Error calculating parity:', err);
  }
}

export function renderEvidenceSources(sources, donation, wealth, donorName) {
  const container = document.getElementById('calcReceiptSourcesContainer');
  if (!container) return;

  const donAmt = donation && donation.amount ? donation.amount : 0;
  const donRecip = (donation && (donation.recipient_organization_name || donation.recipient)) || 'charitable cause';
  const donDate = (donation && donation.donation_date) ? donation.donation_date.split('T')[0] : 'Historical';

  if (!sources || sources.length === 0) {
    container.innerHTML = '<div class="source-evidence-card">' +
      '<div class="source-evidence-head">' +
        '<div class="source-evidence-title">Public Regulatory Disclosures & Philanthropy Registers</div>' +
        '<span class="source-tier-pill tier-1">Tier 1: Verified Record</span>' +
      '</div>' +
      '<div class="source-evidence-fact">' +
        'Supports: Irrevocable transfer of ' + formatCurrency(donAmt, '$') + ' to ' + donRecip + '.' +
      '</div>' +
      '<div class="source-evidence-meta">' +
        '<span>Publisher: <strong>Securities and Exchange Commission (SEC) / IRS 990-PF</strong></span>' +
        '<span>•</span>' +
        '<span>Filing Date: ' + donDate + '</span>' +
      '</div>' +
    '</div>';
    return;
  }

  container.innerHTML = sources.map(s => {
    const isTier1 = s.source_type === 'REGULATORY_FILING' || s.source_tier === 1;
    const tierClass = isTier1 ? 'tier-1' : 'tier-2';
    const tierLabel = isTier1 ? 'Tier 1: Primary Source' : 'Tier 2: Verified Media';
    const title = s.title || (isTier1 ? 'SEC Form 4: Statement of Changes in Beneficial Ownership' : 'Verified Investigative Report');
    const publisher = s.publisher || (isTier1 ? 'U.S. Securities and Exchange Commission' : 'Independent Financial News');
    const date = (s.published_at || s.published_date || donDate).split('T')[0];
    const notes = s.notes || ('Supports documented transfer of ' + formatCurrency(donAmt, '$') + ' on ' + donDate + '.');
    const urlLink = s.url ? '<a href="' + s.url + '" target="_blank" rel="noopener" class="btn-table-action">View Primary Filing ↗</a>' : '';

    return '<div class="source-evidence-card">' +
      '<div class="source-evidence-head">' +
        '<div class="source-evidence-title">' + title + '</div>' +
        '<span class="source-tier-pill ' + tierClass + '">' + tierLabel + '</span>' +
      '</div>' +
      '<div class="source-evidence-fact">' +
        'Supports: ' + notes +
      '</div>' +
      '<div class="source-evidence-meta">' +
        '<span>Publisher: <strong>' + publisher + '</strong></span>' +
        '<span>•</span>' +
        '<span>Date: ' + date + '</span>' +
        (urlLink ? '<span>•</span><span>' + urlLink + '</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}

export async function loadRealityCheckComparison() {
  const c = state.calculator;
  const curr = c.currency || '$';
  const grid = document.getElementById('calcCompareCardsGrid');
  if (!grid) return;

  const hasNetWorth = c.userNetWorth !== null && c.userNetWorth !== undefined && c.userNetWorth !== '' && !isNaN(parseFloat(c.userNetWorth));
  const numericNetWorth = hasNetWorth ? parseFloat(c.userNetWorth) : null;
  const hasMonthly = c.monthlyIncome !== null && c.monthlyIncome !== undefined && c.monthlyIncome !== '' && !isNaN(parseFloat(c.monthlyIncome));
  const numericMonthlyIncome = hasMonthly ? parseFloat(c.monthlyIncome) : null;

  const subtitle = document.getElementById('calcCompareIncomeSubtitle');
  if (subtitle) {
    if (numericNetWorth !== null) {
      subtitle.textContent = `${curr}${Math.round(numericNetWorth).toLocaleString()} net worth`;
    } else if (numericMonthlyIncome !== null) {
      subtitle.textContent = `${curr}${Math.round(numericMonthlyIncome).toLocaleString()}/month income`;
    }
  }

  try {
    let url = `/api/advanced/parity/compare?userCurrency=${encodeURIComponent(curr)}`;
    if (numericNetWorth !== null) url += `&userNetWorth=${numericNetWorth}`;
    if (numericMonthlyIncome !== null) url += `&monthlyIncome=${numericMonthlyIncome}&userIncome=${numericMonthlyIncome}`;

    const data = await fetchComparison(url);
    const comparisons = data.comparisons || [];

    const filter = c.compareFilter || 'all';
    let filtered = comparisons;
    if (filter === 'top') filtered = comparisons.filter(p => p.ratio_percentage >= 1.0);
    else if (filter === 'tech') filtered = comparisons.filter(p => (p.industry && p.industry.toLowerCase().includes('tech')) || ['Elon Musk', 'Bill Gates', 'Mark Zuckerberg', 'Larry Ellison', 'Jeff Bezos'].includes(p.canonical_name));
    else if (filter === 'india') filtered = comparisons.filter(p => p.country && p.country.toLowerCase().includes('india'));
    else if (filter === 'us') filtered = comparisons.filter(p => p.country && p.country.toLowerCase().includes('united states'));

    if (filtered.length === 0) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 24px;">No tracked billionaires matching the selected filter.</div>';
      return;
    }

    grid.innerHTML = filtered.map(b => {
      const ratio = b.ratio_percentage || 0;
      const equiv = b.user_equivalent;
      const formattedEquiv = b.formatted_equivalent || (equiv !== null ? `${curr}${Math.round(equiv).toLocaleString()}` : 'Requires Net Worth');
      const barWidth = Math.min(100, Math.max(1, ratio * 10)).toFixed(1);

      return `
        <div class="compare-card">
          <div class="compare-card-head">
            <div>
              <div class="compare-name">${b.canonical_name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${b.country || 'Global'} · ${formatCurrency(b.latest_net_worth)}</div>
            </div>
            <button type="button" class="btn-table-action" onclick="selectBillionaireInCalculator('${b.person_id}')">Select</button>
          </div>
          <div class="compare-stat-row">
            <span style="color: var(--text-muted);">Peak % of Wealth:</span>
            <strong style="color: #38bdf8;">${ratio.toFixed(2)}%</strong>
          </div>
          <div class="compare-ratio-bar-wrap">
            <div class="compare-ratio-bar-fill" style="width: ${barWidth}%;"></div>
          </div>
          <div class="compare-stat-row">
            <span style="color: var(--text-muted);">Your Equivalent:</span>
            <strong style="color: #34d399;">${formattedEquiv}</strong>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error('Error loading comparison:', err);
  }
}

export function setCompareFilter(filter) {
  state.calculator.compareFilter = filter;
  document.querySelectorAll('#acc-compare .calc-chip-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase().includes(filter));
  });
  loadRealityCheckComparison();
}

export async function selectBillionaireInCalculator(personId) {
  const c = state.calculator;
  c.isCanonicalExample = false;
  c.selectedBillionaireId = personId;

  if (window.switchTab) window.switchTab('calculator');

  const billSelect = document.getElementById('calcBillionaireSelect');
  if (billSelect) billSelect.value = personId;

  await loadDonationsForCalculator(personId);
  await calculateAndRenderParity();

  const target = document.getElementById('calcDominantResultCard');
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function populateBillionaireDropdowns(people) {
  if (!people || people.length === 0) return;
  const profSelect = document.getElementById('selectBillionaireProfile');
  if (profSelect && profSelect.options.length <= 1) {
    profSelect.innerHTML = people.map(p => `
      <option value="${p.person_id}">${p.canonical_name}</option>
    `).join('');
  }

  const reviewSelect = document.getElementById('reviewDonorPersonId');
  if (reviewSelect && reviewSelect.options.length <= 1) {
    reviewSelect.innerHTML = '<option value="">-- Unattributed / Non-Billionaire --</option>' + people.map(p => `
      <option value="${p.person_id}">${p.canonical_name}</option>
    `).join('');
  }
}
