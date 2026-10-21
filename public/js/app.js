/**
 * NoCharity — Cheerful "Me vs. Billionaire" Interactive Parity Calculator Logic
 */

import { INITIAL_BILLIONAIRES } from './data.js';

// Application State
const state = {
  monthlyIncome: 4000,
  currency: '$',
  activeTimeframe: 'all',
  currentIndex: 0,
  billionaires: JSON.parse(JSON.stringify(INITIAL_BILLIONAIRES)),
};

// DOM References
const incomeInput = document.getElementById('incomeInput');
const incomeSlider = document.getElementById('incomeSlider');
const incomeDisplayTag = document.getElementById('incomeDisplayTag');
const currencySelect = document.getElementById('currencySelect');
const timeframePills = document.getElementById('timeframePills');

// Me Match Result Elements
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

// Modals
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
 * Currency & Number Formatting Helpers
 */
function formatDollars(amount, currency = '$') {
  if (amount >= 1_000_000_000_000) {
    return `${currency}${(amount / 1_000_000_000_000).toFixed(2)} Trillion`;
  }
  if (amount >= 1_000_000_000) {
    return `${currency}${(amount / 1_000_000_000).toFixed(2)} Billion`;
  }
  if (amount >= 1_000_000) {
    return `${currency}${(amount / 1_000_000).toFixed(1)} Million`;
  }
  if (amount >= 1_000) {
    return `${currency}${(amount / 1_000).toFixed(0)}k`;
  }
  return `${currency}${amount.toLocaleString()}`;
}

/**
 * Everyday Tangible Comparison Items & Cheerful Messaging
 */
function getTangibleMatch(userAmount, currency = '$') {
  if (userAmount <= 0.25) {
    return {
      icon: "🪙",
      text: `A loose coin from under the sofa (${currency}${userAmount.toFixed(2)})`,
      tip: "You can match this billionaire's entire generosity ratio with literal pocket lint! 🛋️✨"
    };
  }
  if (userAmount < 1.00) {
    return {
      icon: "🍬",
      text: `A single pack of chewing gum (${currency}${userAmount.toFixed(2)})`,
      tip: "Skip one piece of gum and you're officially as philanthropic as a titan of industry. 🍬🌟"
    };
  }
  if (userAmount < 3.50) {
    return {
      icon: "☕",
      text: `One cup of filter coffee (${currency}${userAmount.toFixed(2)})`,
      tip: "One modest coffee this month equals their exact net worth sacrifice! ☕🎉"
    };
  }
  if (userAmount < 7.00) {
    return {
      icon: "🚌",
      text: `A single bus or subway fare (${currency}${userAmount.toFixed(2)})`,
      tip: "Walk one bus stop and you've matched their philanthropic track record! 🚶✨"
    };
  }
  if (userAmount < 14.00) {
    return {
      icon: "🍕",
      text: `A couple slices of pizza & a drink (${currency}${userAmount.toFixed(2)})`,
      tip: "A casual lunch bite equals this billionaire's total percentage contribution. 🍕😋"
    };
  }
  if (userAmount < 35.00) {
    return {
      icon: "📺",
      text: `A basic Netflix streaming subscription (${currency}${userAmount.toFixed(2)})`,
      tip: "One monthly subscription makes you match their lifetime generosity ratio! 📺🍿"
    };
  }
  if (userAmount < 90.00) {
    return {
      icon: "🛒",
      text: `A weekly grocery basket (${currency}${userAmount.toFixed(2)})`,
      tip: "A modest grocery basket matches their public giving percentage! 🛒🥦"
    };
  }
  if (userAmount < 300.00) {
    return {
      icon: "⚡",
      text: `A monthly electricity & utility bill (${currency}${userAmount.toFixed(2)})`,
      tip: "This billionaire made serious gifts — matching them requires a real monthly pledge! ⚡💪"
    };
  }
  return {
    icon: "🏡",
    text: `A major rent / mortgage contribution (${currency}${userAmount.toFixed(2)})`,
    tip: "Top-tier philanthropy! This billionaire gave away a huge portion of their fortune. 🏆👏"
  };
}

/**
 * Filter donations by timeframe
 */
function filterDonations(donations, timeframe) {
  if (!timeframe || timeframe === 'all') return donations;
  return donations.filter(d => {
    if (timeframe === '2026') return d.year === 2026;
    if (timeframe === '2025') return d.year === 2025;
    if (timeframe === 'past_2_years') return d.year >= 2024;
    if (timeframe === '2020-2023') return d.year >= 2020 && d.year <= 2023;
    return true;
  });
}

function getTimeframeLabel(timeframe) {
  switch (timeframe) {
    case '2026': return '2026 Recent';
    case '2025': return '2025 Calendar';
    case 'past_2_years': return 'Past 2 Years';
    case '2020-2023': return '2020 - 2023';
    default: return 'All Time';
  }
}

/**
 * Render the Active Billionaire Profile Card
 */
function renderActiveBillionaire() {
  const b = state.billionaires[state.currentIndex];
  if (!b) return;

  // Filter donations for active timeframe
  const activeDonations = filterDonations(b.historicalDonations, state.activeTimeframe);
  const totalDonatedInPeriod = activeDonations.reduce((sum, d) => sum + d.amount, 0);
  const percentage = b.netWorth > 0 ? (totalDonatedInPeriod / b.netWorth) * 100 : 0;
  const userEquivalentMonthly = state.monthlyIncome * (percentage / 100);
  const tangible = getTangibleMatch(userEquivalentMonthly, state.currency);

  // Update carousel counter
  carouselCounter.textContent = `Billionaire ${state.currentIndex + 1} of ${state.billionaires.length}`;

  // Update Left "ME" Result Box
  matchTargetQuote.innerHTML = `To match <strong>${b.name}</strong>'s generosity of <strong>${percentage >= 0.01 ? percentage.toFixed(2) : percentage.toFixed(4)}%</strong> of their net worth (${getTimeframeLabel(state.activeTimeframe)}):`;
  matchHeroAmount.textContent = `${state.currency}${userEquivalentMonthly.toFixed(2)}`;
  matchSubText.textContent = `out of your ${state.currency}${state.monthlyIncome.toLocaleString()} monthly paycheck`;
  
  tangibleIcon.textContent = tangible.icon;
  tangibleText.textContent = tangible.text;
  cheeringTip.textContent = tangible.tip;

  // Render Right Billionaire Card
  const pledgeBadge = b.givingPledge 
    ? `<span class="pledge-icon-badge" title="Giving Pledge Signatory">✓</span>` 
    : `<span class="pledge-icon-badge" style="border-color:#94a3b8; color:#94a3b8;" title="Not a Giving Pledge Signatory">✕</span>`;

  const starRating = '★'.repeat(b.forbesPhilanthropyScore) + '☆'.repeat(5 - b.forbesPhilanthropyScore);

  // Generate donations with verified direct links
  const donationsHtml = activeDonations.length > 0
    ? activeDonations.map(d => `
        <div class="donation-news-card">
          <a href="${d.url}" target="_blank" rel="noopener noreferrer" class="donation-news-headline">
            <span>${d.headline}</span>
            <span style="color: #ea580c; font-size: 14px;">↗</span>
          </a>
          <div class="donation-news-meta">
            <span class="donation-amount-badge">${formatDollars(d.amount, state.currency)}</span>
            <span>•</span>
            <span class="news-source-tag">${d.source}</span>
            <span>•</span>
            <span>${d.date}</span>
          </div>
        </div>
      `).join('')
    : `<div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.88rem; background: #fff; border-radius: 8px;">
        No major public donations verified in news during this timeframe.
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
        <p class="profile-company">${b.company} • ${b.industry}</p>
        <div class="profile-tags-row">
          <span class="tag-badge tag-networth">💰 Net Worth: ${formatDollars(b.netWorth, state.currency)}</span>
          <span class="tag-badge tag-score" title="Forbes Philanthropy Score">⭐ Forbes Score: ${starRating}</span>
        </div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="b-stats-grid">
      <div class="b-stat-box">
        <div class="lbl">Donated in Period</div>
        <div class="val val-green">${formatDollars(totalDonatedInPeriod, state.currency)}</div>
      </div>
      <div class="b-stat-box">
        <div class="lbl">Wealth % Donated</div>
        <div class="val val-purple">${percentage >= 0.01 ? percentage.toFixed(2) : percentage.toFixed(4)}%</div>
      </div>
    </div>

    <!-- Verified Donations Section with Direct Clickable Links -->
    <div class="donations-section">
      <div class="donations-section-title">
        <span>📰 Verified Public Reports (${activeDonations.length})</span>
        <span style="font-size: 0.74rem; font-weight: 600; text-transform: none; color: #0284c7;">Click any headline to read source ↗</span>
      </div>
      <div class="donations-news-list">
        ${donationsHtml}
      </div>
    </div>

    <!-- Live MCP Scan Button -->
    <div class="b-card-footer">
      <button class="btn-scan-mcp" id="btnLiveMcpScan">
        <span>📡 Run Live MCP News Scan for ${b.name.split(' ')[0]}</span>
      </button>
    </div>
  `;

  // Attach live MCP scan listener
  document.getElementById('btnLiveMcpScan').addEventListener('click', () => {
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
    <button class="thumb-item ${i === state.currentIndex ? 'active' : ''}" data-index="${i}" title="${b.name}">
      <img class="thumb-img" src="${b.image}" alt="${b.name}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(b.name)}&background=f59e0b&color=fff&size=80'">
      <span class="thumb-name">${b.name.split(' ')[1] || b.name}</span>
    </button>
  `).join('');
}

/**
 * Navigate to next/prev billionaire
 */
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
  modalSubTitle.textContent = `Streaming Google News RSS via Model Context Protocol tool...`;
  modalArticlesContainer.innerHTML = '';
  modalLoadingIndicator.style.display = 'block';
  newsModal.classList.add('active');

  try {
    const timeframeParam = state.activeTimeframe === 'all' ? '1y' : state.activeTimeframe;
    const response = await fetch(`/api/news?billionaire=${encodeURIComponent(billionaireName)}&timeframe=${encodeURIComponent(timeframeParam)}`);
    
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
        <p><strong>Note:</strong> Live news scan connects to the Node backend server (<code>server.js</code>). In static mode, verified historical reports with direct links are loaded automatically.</p>
      </div>
    `;
  }
}

/**
 * Event Listeners Setup
 */
function setupEvents() {
  // Income numerical input
  incomeInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    state.monthlyIncome = Math.max(val, 0);
    incomeSlider.value = Math.min(state.monthlyIncome, 20000);
    incomeDisplayTag.textContent = `${state.currency}${state.monthlyIncome.toLocaleString()} / mo`;
    renderActiveBillionaire();
  });

  // Income slider
  incomeSlider.addEventListener('input', (e) => {
    state.monthlyIncome = parseFloat(e.target.value);
    incomeInput.value = state.monthlyIncome;
    incomeDisplayTag.textContent = `${state.currency}${state.monthlyIncome.toLocaleString()} / mo`;
    renderActiveBillionaire();
  });

  // Currency select
  currencySelect.addEventListener('change', (e) => {
    state.currency = e.target.value;
    incomeDisplayTag.textContent = `${state.currency}${state.monthlyIncome.toLocaleString()} / mo`;
    renderActiveBillionaire();
  });

  // Timeframe pills
  timeframePills.addEventListener('click', (e) => {
    const pill = e.target.closest('.time-pill');
    if (!pill) return;
    document.querySelectorAll('.time-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.activeTimeframe = pill.dataset.timeframe;
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
    }
  });

  // Modals
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

function init() {
  setupEvents();
  renderActiveBillionaire();
}

init();
