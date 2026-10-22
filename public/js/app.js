/**
 * NoCharity — Interactive Parity Calculator Logic
 * Inspired by Gianmarco Soresi (@GianmarcoSoresi)
 */

import { INITIAL_BILLIONAIRES } from './data.js';

// Application State with LocalStorage Persistence
// Ensure that visiting Basic Mode clears any stale redirect flag to Advanced Mode
localStorage.setItem('nocharity_advanced_mode', 'false');

const state = {
  monthlyIncome: parseFloat(localStorage.getItem('nocharity_income')) || 35000,
  currency: localStorage.getItem('nocharity_currency') || '₹',
  incomeFrequency: localStorage.getItem('nocharity_income_frequency') || 'monthly', // 'monthly' or 'annual'
  calcMode: localStorage.getItem('nocharity_income_frequency') || 'monthly',
  activeTimeframe: 'all', // 'all', 'past_month', 'past_year', 'custom'
  customStartDate: '2023-01-01',
  customEndDate: '2026-12-31',
  currentIndex: 0,
  billionaires: JSON.parse(JSON.stringify(INITIAL_BILLIONAIRES)),
  isOffline: true,
  dataSourceNotice: 'Operating from verified offline snapshot'
};

// DOM References
const timeframeHeaderGroup = document.getElementById('timeframeHeaderGroup');
const customDateRow = document.getElementById('customDateRow');
const customStartDate = document.getElementById('customStartDate');
const customEndDate = document.getElementById('customEndDate');
const btnApplyCustomDates = document.getElementById('btnApplyCustomDates');

// Header Settings
const openSettingsBtn = document.getElementById('openSettingsBtn');
const headerSettingsLabel = document.getElementById('headerSettingsLabel');
const settingsModal = document.getElementById('settingsModal');
const closeSettingsModal = document.getElementById('closeSettingsModal');
const settingsCurrencySelect = document.getElementById('settingsCurrencySelect');
const settingsIncomeInput = document.getElementById('settingsIncomeInput');
const settingsIncomeSlider = document.getElementById('settingsIncomeSlider');
const settingsAdvancedModeToggle = document.getElementById('settingsAdvancedModeToggle');
const btnSaveSettings = document.getElementById('btnSaveSettings');

// Welcome Modal
const welcomeModal = document.getElementById('welcomeModal');
const welcomeCurrencySelect = document.getElementById('welcomeCurrencySelect');
const welcomeIncomeInput = document.getElementById('welcomeIncomeInput');
const btnStartWelcome = document.getElementById('btnStartWelcome');

// Me Card Elements
const matchTargetQuote = document.getElementById('matchTargetQuote');
const matchHeroAmount = document.getElementById('matchHeroAmount');
const matchSubText = document.getElementById('matchSubText');
const tangibleIcon = document.getElementById('tangibleIcon');
const tangibleText = document.getElementById('tangibleText');
const cheeringTip = document.getElementById('cheeringTip');

// Billionaire Carousel Elements
const carouselCounter = document.getElementById('carouselCounter');
const prevBillionaireBtn = document.getElementById('prevBillionaireBtn');
const nextBillionaireBtn = document.getElementById('nextBillionaireBtn');
const carouselCardBody = document.getElementById('carouselCardBody');
const thumbBar = document.getElementById('thumbBar');

// News & MCP Modals
const newsModal = document.getElementById('newsModal');
const closeNewsModal = document.getElementById('closeNewsModal');
const modalBillionaireTitle = document.getElementById('modalBillionaireTitle');
const modalSubTitle = document.getElementById('modalSubTitle');
const modalLoadingIndicator = document.getElementById('modalLoadingIndicator');
const modalArticlesContainer = document.getElementById('modalArticlesContainer');

const mcpModal = document.getElementById('mcpModal');
const openMcpModalBtn = document.getElementById('openMcpModalBtn');
const closeMcpModal = document.getElementById('closeMcpModal');

/**
 * Format currency amounts in human-readable millions/billions
 */
function formatDollars(amount, currency = '$') {
  if (amount >= 1_000_000_000_000) {
    const val = amount / 1_000_000_000_000;
    return `${currency}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)} Trillion`;
  }
  if (amount >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return `${currency}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(2)} Billion`;
  }
  if (amount >= 1_000_000) {
    const val = amount / 1_000_000;
    return `${currency}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)} Million`;
  }
  if (amount >= 1_000) {
    const val = amount / 1_000;
    return `${currency}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}k`;
  }
  return `${currency}${amount.toLocaleString()}`;
}

/**
 * Tangible Everyday Micro-Comparisons
 * 
 * Rules:
 * - Do not apply USD thresholds directly to INR or other currencies.
 * - For USD ('$'), provide calibrated everyday purchase comparisons.
 * - For INR ('₹') and other currencies without a verified regional basket,
 *   prefer a generic proportional statement ("Proportional paycheck share").
 * - Tone: Context-aware without moralizing:
 *   - Lower equivalent: "Your matching financial share."
 *   - Higher equivalent: "That's a substantial personal sacrifice at your income level."
 *   - Very high equivalent: "That would consume a large share of your income."
 */
export function getTangibleMatch(userAmount, currency = '₹', userIncome = null) {
  const numericAmount = Math.max(0, Number(userAmount) || 0);
  const numericIncome = Number(userIncome);
  const ratio = (numericIncome && numericIncome > 0) ? (numericAmount / numericIncome) : (numericAmount / 4000);

  let tip = "Your matching financial share.";
  if (ratio >= 0.25) {
    tip = "That would consume a large share of your income.";
  } else if (ratio >= 0.05) {
    tip = "That's a substantial personal sacrifice at your income level.";
  }

  // Format amount cleanly (whole currency units unless very small positive amount)
  const amountStr = (numericAmount < 1 && numericAmount > 0)
    ? `${currency}${numericAmount.toFixed(2)}`
    : `${currency}${Math.round(numericAmount).toLocaleString()}`;

  // USD Calibrated Purchase Basket
  if (currency === '$') {
    if (numericAmount <= 0.25) {
      return {
        icon: "🪙",
        text: `Loose pocket change (${amountStr})`,
        tip
      };
    }
    if (numericAmount < 1.00) {
      return {
        icon: "🍬",
        text: `A single pack of chewing gum (${amountStr})`,
        tip
      };
    }
    if (numericAmount < 5.00) {
      return {
        icon: "☕",
        text: `A modest cup of coffee (${amountStr})`,
        tip
      };
    }
    if (numericAmount < 25.00) {
      return {
        icon: "🍕",
        text: `A casual takeout lunch (${amountStr})`,
        tip
      };
    }
    if (numericAmount < 100.00) {
      return {
        icon: "🛒",
        text: `A portion of a grocery run (${amountStr})`,
        tip
      };
    }
    if (numericAmount < 500.00) {
      return {
        icon: "⚡",
        text: `A monthly utility or electric bill (${amountStr})`,
        tip
      };
    }
    return {
      icon: "🏡",
      text: `A major living expense (${amountStr})`,
      tip
    };
  }

  // Non-USD (e.g. INR ₹) without calibrated local basket:
  // Use generic proportional statement and do NOT display misleading named purchases.
  let icon = "⚖️";
  if (ratio >= 0.25) {
    icon = "⚠️";
  } else if (ratio >= 0.05) {
    icon = "💼";
  }

  return {
    icon,
    text: `Proportional paycheck share (${amountStr})`,
    tip
  };
}

/**
 * Filter donations by timeframe
 */
function filterDonations(donations, timeframe, start, end) {
  if (!timeframe || timeframe === 'all') return donations;
  const now = new Date();

  return donations.filter(d => {
    if (!d.date) return timeframe === 'all';
    const donationDate = new Date(d.date);

    if (timeframe === 'past_month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      return donationDate >= thirtyDaysAgo;
    }
    if (timeframe === 'past_year') {
      const oneYearAgo = new Date();
      oneYearAgo.setDate(now.getDate() - 365);
      return donationDate >= oneYearAgo;
    }
    if (timeframe === 'custom' && start && end) {
      const startDate = new Date(start);
      const endDate = new Date(end);
      return donationDate >= startDate && donationDate <= endDate;
    }
    return true;
  });
}

function getTimeframeLabel(timeframe) {
  switch (timeframe) {
    case 'past_month': return 'Past Month';
    case 'past_year': return 'Past Year';
    case 'custom': return `Custom (${state.customStartDate} to ${state.customEndDate})`;
    default: return 'All Time';
  }
}

/**
 * Render the Active Billionaire Profile Card & Match Box
 */
function renderActiveBillionaire() {
  const b = state.billionaires[state.currentIndex];
  if (!b) return;

  // Filter donations for active timeframe
  const activeDonations = filterDonations(b.historicalDonations, state.activeTimeframe, state.customStartDate, state.customEndDate);
  const totalDonatedInPeriod = activeDonations.reduce((sum, d) => sum + d.amount, 0);

  // Parity percentage calculation is strictly donation percentage of wealth:
  // (total donation amount / wealth at donation or current wealth in basic mode)
  const percentage = b.netWorth > 0 ? (totalDonatedInPeriod / b.netWorth) * 100 : 0;
  const isAnnual = state.incomeFrequency === 'annual' || state.calcMode === 'annual';
  const periodLabel = isAnnual ? 'annual' : 'monthly';
  const userEquivalent = state.monthlyIncome * (percentage / 100);
  const tangible = getTangibleMatch(userEquivalent, state.currency, state.monthlyIncome);

  // Format percentage: 2 decimals, or <0.01% for tiny values
  const formattedPct = percentage >= 0.01
    ? percentage.toFixed(2) + '%'
    : (percentage > 0 ? '<0.01%' : '0.00%');

  // Update satirical lead
  const satiricalLead = document.getElementById('satiricalLeadText');
  if (satiricalLead) {
    const donatedStr = formatDollars(totalDonatedInPeriod, '$');
    satiricalLead.innerHTML = `<strong>${b.name}</strong> gave ${donatedStr}. <em>Sounds enormous.</em> That was <strong>${formattedPct}</strong> of their wealth:`;
  }

  // Update Left "ME" Panel
  matchTargetQuote.innerHTML = `To match <strong>${b.name}'s</strong> documented giving of <span class="highlight-percentage" id="highlightMatchPercentage">${formattedPct}</span> of their estimated wealth (${getTimeframeLabel(state.activeTimeframe)}):`;
  
  // Hero number (clean whole units unless small fraction)
  const heroStr = (userEquivalent < 1 && userEquivalent > 0)
    ? `${state.currency}${userEquivalent.toFixed(2)}`
    : `${state.currency}${Math.round(userEquivalent).toLocaleString()}`;
  matchHeroAmount.textContent = heroStr;
  matchSubText.textContent = `(out of your ${state.currency}${state.monthlyIncome.toLocaleString()} ${periodLabel} income)*`;
  
  tangibleIcon.textContent = tangible.icon;
  tangibleText.textContent = tangible.text;
  cheeringTip.textContent = tangible.tip;

  // Update carousel counter
  carouselCounter.textContent = `Billionaire ${state.currentIndex + 1} of ${state.billionaires.length}`;

  // Update header settings button text
  headerSettingsLabel.textContent = `Settings (${state.currency}${state.monthlyIncome.toLocaleString()}/${isAnnual ? 'yr' : 'mo'})`;

  // Flag and Country formatting (supports 2-letter regional indicator pairs e.g. 🇺🇸)
  const countryStr = b.country || '';
  const flagMatch = countryStr.match(/(\p{Regional_Indicator}{2}|\p{Emoji_Presentation}|\p{Extended_Pictographic})/u);
  const flag = flagMatch ? flagMatch[0] : '🌐';
  const countryName = countryStr.replace(/(\p{Regional_Indicator}{2}|\p{Emoji_Presentation}|\p{Extended_Pictographic})/u, '').trim();

  // Financial badge: ALWAYS billionaire native net worth in USD
  const financialBadge = `
    <a href="${b.netWorthSourceUrl}" target="_blank" rel="noopener noreferrer" class="tag-badge tag-networth" title="Source: ${b.netWorthSourceName || 'Bloomberg / Forbes'}">
      💰 Net Worth: ${formatDollars(b.netWorth, '$')} ↗
    </a>
  `;

  // Pledge badge
  const pledgeBadge = b.givingPledge 
    ? `<span class="pledge-icon-badge" title="Giving Pledge Signatory">✓</span>` 
    : `<span class="pledge-icon-badge" style="border-color:#94a3b8; color:#94a3b8;" title="Not a Giving Pledge Signatory">✕</span>`;

  const starRating = '★'.repeat(b.forbesPhilanthropyScore) + '☆'.repeat(5 - b.forbesPhilanthropyScore);

  // Generate donations with verified direct links (billionaire donations denominated in USD)
  const donationsHtml = activeDonations.length > 0
    ? activeDonations.map(d => `
        <div class="donation-news-card">
          <a href="${d.url}" target="_blank" rel="noopener noreferrer" class="donation-news-headline">
            <span>${d.headline}</span>
            <span style="color: #ea580c; font-size: 14px;">↗</span>
          </a>
          <div class="donation-news-meta">
            <span class="donation-amount-badge">${formatDollars(d.amount, '$')}</span>
            <span>•</span>
            <span class="news-source-tag">${d.source}</span>
            <span>•</span>
            <span>${d.date}</span>
          </div>
        </div>
      `).join('')
    : `<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.86rem; background: #fff; border-radius: 8px;">
        No major public donations reported in news during this specific timeframe.
       </div>`;

  carouselCardBody.innerHTML = `
    <!-- Profile Top -->
    <div class="billionaire-profile-header">
      <div class="billionaire-photo-wrap">
        <img class="billionaire-photo" src="${b.image}" alt="${b.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=f59e0b&color=fff&size=200'">
        ${pledgeBadge}
      </div>
      <div class="profile-meta">
        <h3>${b.name}</h3>
        <p class="profile-company">${b.company}</p>
        <p class="profile-origin">
          <span class="country-flag-icon">${flag}</span>
          <span>${countryName}</span>
        </p>
        <div class="profile-tags-row">
          ${financialBadge}
          <span class="tag-badge tag-score" title="Forbes Philanthropy Score">⭐ Score: ${starRating}</span>
        </div>
      </div>
    </div>

    <!-- Stats Grid: Color Matched (Green & Purple) -->
    <div class="b-stats-grid">
      <div class="b-stat-box">
        <div class="lbl">Donated in Period</div>
        <div class="val val-green">${formatDollars(totalDonatedInPeriod, '$')}</div>
      </div>
      <div class="b-stat-box">
        <div class="lbl">${state.calcMode === 'income' ? 'Income % Donated' : 'Wealth % Donated'}</div>
        <div class="val val-purple">${percentage >= 0.01 ? percentage.toFixed(2) : percentage.toFixed(4)}%</div>
      </div>
    </div>

    <!-- Verified Donations Section with Header Run Live MCP Scan Button -->
    <div class="donations-section">
      <div class="donations-section-title">
        <span>📰 Verified Reports (${activeDonations.length})</span>
        <button id="btnHeaderLiveMcpScan" class="btn-refresh-scan" title="Run live news scan via MCP">
          <span>Run Live MCP Scan</span>
          <span class="refresh-icon">🔄</span>
        </button>
      </div>
      <div class="donations-news-list">
        ${donationsHtml}
      </div>
    </div>
  `;

  // Attach live MCP scan listener on header button
  document.getElementById('btnHeaderLiveMcpScan').addEventListener('click', () => {
    runLiveMcpNewsScan(b.name);
  });

  // Update thumbnail active states
  renderThumbBar();
}

/**
 * Render Quick Thumbnail Selector Bar
 */
function renderThumbBar() {
  thumbBar.innerHTML = state.billionaires.map((b, i) => `
    <button class="thumb-item ${i === state.currentIndex ? 'active' : ''}" data-index="${i}" title="${b.name} (${b.country || ''})">
      <img class="thumb-img" src="${b.image}" alt="${b.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=f59e0b&color=fff&size=80'">
      <span class="thumb-name">${b.name.split(' ')[1] || b.name}</span>
    </button>
  `).join('');
}

function nextBillionaire() {
  state.currentIndex = (state.currentIndex + 1) % state.billionaires.length;
  renderActiveBillionaire();
}

function prevBillionaire() {
  state.currentIndex = (state.currentIndex - 1 + state.billionaires.length) % state.billionaires.length;
  renderActiveBillionaire();
}

/**
 * Trigger Live MCP News Scan Modal
 */
async function runLiveMcpNewsScan(billionaireName) {
  modalBillionaireTitle.textContent = `Live MCP News Scan: ${billionaireName}`;
  modalSubTitle.textContent = `Streaming Google News RSS via Model Context Protocol...`;
  modalArticlesContainer.innerHTML = '';
  modalLoadingIndicator.style.display = 'block';
  newsModal.classList.add('active');

  try {
    let url = `/api/news?billionaire=${encodeURIComponent(billionaireName)}&timeframe=${encodeURIComponent(state.activeTimeframe)}`;
    if (state.activeTimeframe === 'custom') {
      url += `&startDate=${state.customStartDate}&endDate=${state.customEndDate}`;
    }
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    
    modalLoadingIndicator.style.display = 'none';

    if (!data.articles || data.articles.length === 0) {
      modalArticlesContainer.innerHTML = `
        <div style="text-align: center; padding: 24px; color: var(--text-muted);">
          No matching recent headlines found via Google News RSS for this timeframe.
        </div>
      `;
      return;
    }

    modalArticlesContainer.innerHTML = data.articles.map(a => `
      <div style="background: #f8fafc; border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px 14px;">
        <a href="${a.link}" target="_blank" rel="noopener noreferrer" style="font-size: 0.92rem; font-weight: 700; color: #0284c7; text-decoration: none; display: block; margin-bottom: 4px;">
          ${a.title} ↗
        </a>
        <p style="font-size: 0.82rem; color: #64748b; margin-bottom: 6px;">${a.snippet || ''}</p>
        <div style="font-size: 0.74rem; color: #94a3b8; display: flex; gap: 8px; align-items: center;">
          <span>🏛️ ${a.source}</span>
          <span>•</span>
          <span>📅 ${a.pubDate}</span>
          ${a.detectedAmountStr ? `<span style="background: #d1fae5; color: #065f46; font-weight: 800; padding: 1px 8px; border-radius: 9999px;">Amount: ${a.detectedAmountStr}</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    modalLoadingIndicator.style.display = 'none';
    modalArticlesContainer.innerHTML = `
      <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; color: #991b1b; font-size: 0.88rem;">
        <p><strong>Notice:</strong> Live RSS news scanning connects to the server backend. In static mode, verified historical reports with direct links are loaded automatically.</p>
      </div>
    `;
  }
}

/**
 * Open Settings Modal & Pre-fill values
 */
function openSettings() {
  settingsCurrencySelect.value = state.currency;
  settingsIncomeInput.value = state.monthlyIncome;
  settingsIncomeSlider.value = Math.min(state.monthlyIncome, 25000);
  
  const radio = document.querySelector(`input[name="calcMode"][value="${state.incomeFrequency}"]`) ||
                document.querySelector(`input[name="calcMode"][value="${state.calcMode}"]`);
  if (radio) radio.checked = true;

  // Invariant: Basic Mode must remain Basic Mode unless the user explicitly toggles it during this session
  if (settingsAdvancedModeToggle) {
    settingsAdvancedModeToggle.checked = false;
    updateModeDisplay(false);
  }

  settingsModal.classList.add('active');
}

function updateModeDisplay(isAdv) {
  const title = document.getElementById('modeTitleText');
  const badge = document.getElementById('modeBadgeText');
  const sub = document.getElementById('modeSubText');
  if (!title) return;
  if (isAdv) {
    title.textContent = 'Advanced Mode';
    title.style.color = '#38bdf8';
    badge.textContent = 'Selected';
    badge.style.background = 'rgba(56, 189, 248, 0.15)';
    badge.style.color = '#38bdf8';
    sub.textContent = 'Show me the receipts. Deep dive into documented donation filings, historical wealth dates, and audit evidence.';
  } else {
    title.textContent = 'Basic Mode';
    title.style.color = 'inherit';
    badge.textContent = 'Current';
    badge.style.background = 'rgba(245, 158, 11, 0.15)';
    badge.style.color = '#f59e0b';
    sub.textContent = 'The quick everyday meme calculator. Simple, fast comparisons against your monthly paycheck.';
  }
}

/**
 * Save Settings & Persist to LocalStorage
 */
function saveSettings() {
  state.currency = settingsCurrencySelect.value;
  state.monthlyIncome = parseFloat(settingsIncomeInput.value) || 35000;
  
  const selectedMode = document.querySelector('input[name="calcMode"]:checked');
  if (selectedMode) {
    state.calcMode = selectedMode.value;
    state.incomeFrequency = selectedMode.value;
  }

  localStorage.setItem('nocharity_income', state.monthlyIncome);
  localStorage.setItem('nocharity_currency', state.currency);
  localStorage.setItem('nocharity_income_frequency', state.incomeFrequency);
  localStorage.setItem('nocharity_mode', state.calcMode);

  if (settingsAdvancedModeToggle && settingsAdvancedModeToggle.checked) {
    localStorage.setItem('nocharity_advanced_mode', 'true');
    window.location.href = '/advanced';
    return;
  } else {
    localStorage.setItem('nocharity_advanced_mode', 'false');
  }

  settingsModal.classList.remove('active');
  renderActiveBillionaire();
  loadCanonicalData();
}

/**
 * Event Listeners Setup
 */
function setupEvents() {
  // Header Timeframe buttons (All Time, Past Month, Past Year, Custom)
  timeframeHeaderGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-btn');
    if (!btn) return;
    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    state.activeTimeframe = btn.dataset.timeframe;

    if (state.activeTimeframe === 'custom') {
      customDateRow.classList.add('visible');
    } else {
      customDateRow.classList.remove('visible');
    }
    renderActiveBillionaire();
  });

  // Apply custom dates
  btnApplyCustomDates.addEventListener('click', () => {
    state.customStartDate = customStartDate.value;
    state.customEndDate = customEndDate.value;
    renderActiveBillionaire();
  });

  // Settings Modal triggers
  openSettingsBtn.addEventListener('click', openSettings);
  closeSettingsModal.addEventListener('click', () => settingsModal.classList.remove('active'));
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) settingsModal.classList.remove('active');
  });

  // Settings income input/slider sync
  settingsIncomeInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    settingsIncomeSlider.value = Math.min(val, 25000);
  });
  settingsIncomeSlider.addEventListener('input', (e) => {
    settingsIncomeInput.value = e.target.value;
  });

  // Save Settings
  btnSaveSettings.addEventListener('click', saveSettings);

  // Settings Advanced Mode toggle immediate redirect
  if (settingsAdvancedModeToggle) {
    settingsAdvancedModeToggle.addEventListener('change', (e) => {
      updateModeDisplay(e.target.checked);
      if (e.target.checked) {
        localStorage.setItem('nocharity_advanced_mode', 'true');
        setTimeout(() => {
          window.location.href = '/advanced';
        }, 180);
      } else {
        localStorage.setItem('nocharity_advanced_mode', 'false');
      }
    });
  }

  // First-time Welcome modal trigger & handler
  if (!localStorage.getItem('nocharity_income')) {
    welcomeModal.classList.add('active');
  }

  btnStartWelcome.addEventListener('click', () => {
    state.currency = welcomeCurrencySelect.value;
    state.monthlyIncome = parseFloat(welcomeIncomeInput.value) || 35000;
    localStorage.setItem('nocharity_income', state.monthlyIncome);
    localStorage.setItem('nocharity_currency', state.currency);
    welcomeModal.classList.remove('active');
    renderActiveBillionaire();
  });

  // Carousel navigation buttons
  prevBillionaireBtn.addEventListener('click', prevBillionaire);
  nextBillionaireBtn.addEventListener('click', nextBillionaire);

  // Thumbnail clicks
  thumbBar.addEventListener('click', (e) => {
    const item = e.target.closest('.thumb-item');
    if (!item) return;
    state.currentIndex = parseInt(item.dataset.index, 10);
    renderActiveBillionaire();
  });

  // Keyboard navigation (Up/Down arrow keys)
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      prevBillionaire();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      nextBillionaire();
    } else if (e.key === 'Escape') {
      newsModal.classList.remove('active');
      mcpModal.classList.remove('active');
      settingsModal.classList.remove('active');
    }
  });

  // Modals close
  closeNewsModal.addEventListener('click', () => newsModal.classList.remove('active'));
  newsModal.addEventListener('click', (e) => {
    if (e.target === newsModal) newsModal.classList.remove('active');
  });

  openMcpModalBtn.addEventListener('click', () => mcpModal.classList.add('active'));
  closeMcpModal.addEventListener('click', () => mcpModal.classList.remove('active'));
  mcpModal.addEventListener('click', (e) => {
    if (e.target === mcpModal) mcpModal.classList.remove('active');
  });
}

/**
 * Update the subtle data source notice badge
 */
function updateDataSourceBadge(isOffline, notice) {
  const badge = document.getElementById('dataSourceBadge');
  if (!badge) return;
  if (isOffline) {
    badge.className = 'data-source-badge offline';
    badge.textContent = '📦 Verified Offline Snapshot';
    badge.title = notice || 'Operating from verified offline snapshot. All figures correspond to the canonical dataset.';
  } else {
    badge.className = 'data-source-badge live';
    badge.textContent = '🟢 Canonical Data';
    badge.title = notice || 'Live data from canonical database.';
  }
}

/**
 * Asynchronously load canonical billionaire data from backend API
 */
async function loadCanonicalData() {
  if (typeof window === 'undefined' || typeof document === 'undefined' || !window.location?.origin) {
    return;
  }
  try {
    const origin = window.location.origin;
    const res = await fetch(`${origin}/api/billionaires?currency=${encodeURIComponent(state.currency)}&monthlyIncome=${state.monthlyIncome}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data && Array.isArray(data.billionaires) && data.billionaires.length > 0) {
      state.billionaires = data.billionaires;
      state.isOffline = Boolean(data.isOffline || data.source === 'offline_fallback');
      state.dataSourceNotice = data.notice || (state.isOffline ? 'Operating from verified offline snapshot' : 'Canonical database records');
      renderActiveBillionaire();
      renderThumbBar();
      updateDataSourceBadge(state.isOffline, state.dataSourceNotice);
    }
  } catch (err) {
    console.warn('Could not fetch canonical billionaires from API, continuing with verified offline snapshot:', err);
    state.isOffline = true;
    state.dataSourceNotice = 'Operating from verified offline snapshot';
    updateDataSourceBadge(true, state.dataSourceNotice);
  }
}

function init() {
  setupEvents();
  renderThumbBar();
  renderActiveBillionaire();
  updateDataSourceBadge(state.isOffline, state.dataSourceNotice);
  loadCanonicalData();
}

init();
