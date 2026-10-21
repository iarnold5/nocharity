/**
 * NoCharity Web App - Interactive Logic & MCP Client
 */

import { INITIAL_BILLIONAIRES } from './data.js';

// Application State
const state = {
  monthlyIncome: 4000,
  currency: '$',
  activeTimeframe: 'all',
  searchQuery: '',
  sortBy: 'generosity-desc',
  viewMode: 'grid',
  billionaires: JSON.parse(JSON.stringify(INITIAL_BILLIONAIRES)),
  isServerAvailable: true,
};

// DOM Element References
const incomeInput = document.getElementById('incomeInput');
const incomeSlider = document.getElementById('incomeSlider');
const incomePreviewDisplay = document.getElementById('incomePreviewDisplay');
const currencySelect = document.getElementById('currencySelect');
const timeframeOptions = document.getElementById('timeframeOptions');
const activeTimeframeLabel = document.getElementById('activeTimeframeLabel');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const viewGridBtn = document.getElementById('viewGridBtn');
const viewChartBtn = document.getElementById('viewChartBtn');
const cardsGrid = document.getElementById('cardsGrid');
const chartViewContainer = document.getElementById('chartViewContainer');
const chartRowsList = document.getElementById('chartRowsList');

// Stats Elements
const statTotalWealth = document.getElementById('statTotalWealth');
const statTotalDonated = document.getElementById('statTotalDonated');
const statAvgPercent = document.getElementById('statAvgPercent');
const statAvgParity = document.getElementById('statAvgParity');

// Modals
const newsModalOverlay = document.getElementById('newsModalOverlay');
const closeNewsModalBtn = document.getElementById('closeNewsModalBtn');
const modalBillionaireName = document.getElementById('modalBillionaireName');
const modalTimeframeSub = document.getElementById('modalTimeframeSub');
const modalArticleList = document.getElementById('modalArticleList');
const modalLoadingSpinner = document.getElementById('modalLoadingSpinner');

const mcpArchitectureModalOverlay = document.getElementById('mcpArchitectureModalOverlay');
const openMcpModalBtn = document.getElementById('openMcpModalBtn');
const closeMcpModalBtn = document.getElementById('closeMcpModalBtn');

/**
 * Format currency amounts in human-readable millions/billions
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
 * Get Tangible Everyday Comparison for User Equivalent Amount
 */
function getTangibleComparison(userAmount, currency = '$') {
  if (userAmount <= 0.05) {
    return { icon: "🪙", text: `Less than a single cent (${currency}${userAmount.toFixed(2)})` };
  }
  if (userAmount < 0.50) {
    return { icon: "🍬", text: `A loose piece of chewing gum (${currency}${userAmount.toFixed(2)})` };
  }
  if (userAmount < 2.00) {
    return { icon: "☕", text: `A cup of drip coffee (${currency}${userAmount.toFixed(2)})` };
  }
  if (userAmount < 5.00) {
    return { icon: "🚌", text: `A single metro/bus ticket (${currency}${userAmount.toFixed(2)})` };
  }
  if (userAmount < 15.00) {
    return { icon: "🍔", text: `A fast food lunch combo (${currency}${userAmount.toFixed(2)})` };
  }
  if (userAmount < 40.00) {
    return { icon: "📺", text: `A monthly Netflix / Spotify bill (${currency}${userAmount.toFixed(2)})` };
  }
  if (userAmount < 120.00) {
    return { icon: "🛒", text: `A weekly grocery run (${currency}${userAmount.toFixed(2)})` };
  }
  if (userAmount < 400.00) {
    return { icon: "⚡", text: `A monthly electric or utility bill (${currency}${userAmount.toFixed(2)})` };
  }
  return { icon: "🏡", text: `A major rent / mortgage contribution (${currency}${userAmount.toFixed(2)})` };
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
    if (timeframe === 'past_5_years') return d.year >= 2021;
    if (timeframe === '2020-2023') return d.year >= 2020 && d.year <= 2023;
    return true;
  });
}

/**
 * Calculate metrics for each billionaire based on current state
 */
function calculateMetrics() {
  return state.billionaires.map(b => {
    const periodDonations = filterDonations(b.historicalDonations, state.activeTimeframe);
    const totalDonatedInPeriod = periodDonations.reduce((sum, d) => sum + d.amount, 0);
    const percentage = b.netWorth > 0 ? (totalDonatedInPeriod / b.netWorth) * 100 : 0;
    const userMonthlyEquivalent = state.monthlyIncome * (percentage / 100);
    const tangible = getTangibleComparison(userMonthlyEquivalent, state.currency);

    return {
      ...b,
      periodDonations,
      totalDonatedInPeriod,
      percentage,
      percentageFormatted: percentage >= 0.01 ? `${percentage.toFixed(2)}%` : `${percentage.toFixed(4)}%`,
      userMonthlyEquivalent,
      tangible
    };
  });
}

/**
 * Sort and filter list
 */
function getFilteredAndSortedList(list) {
  let filtered = list;

  // Search filter
  if (state.searchQuery.trim()) {
    const q = state.searchQuery.toLowerCase().trim();
    filtered = filtered.filter(b => 
      b.name.toLowerCase().includes(q) ||
      b.company.toLowerCase().includes(q) ||
      b.industry.toLowerCase().includes(q) ||
      b.summary.toLowerCase().includes(q)
    );
  }

  // Sorting
  filtered.sort((a, b) => {
    switch (state.sortBy) {
      case 'generosity-desc':
        return b.percentage - a.percentage;
      case 'generosity-asc':
        return a.percentage - b.percentage;
      case 'amount-desc':
        return b.totalDonatedInPeriod - a.totalDonatedInPeriod;
      case 'wealth-desc':
        return b.netWorth - a.netWorth;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      default:
        return b.percentage - a.percentage;
    }
  });

  return filtered;
}

/**
 * Render Macro Stats Ribbon
 */
function renderStats(list) {
  const totalWealth = list.reduce((sum, b) => sum + b.netWorth, 0);
  const totalDonated = list.reduce((sum, b) => sum + b.totalDonatedInPeriod, 0);
  const avgPercent = totalWealth > 0 ? (totalDonated / totalWealth) * 100 : 0;
  const avgMonthlyParity = state.monthlyIncome * (avgPercent / 100);

  statTotalWealth.textContent = formatDollars(totalWealth, state.currency);
  statTotalDonated.textContent = formatDollars(totalDonated, state.currency);
  statAvgPercent.textContent = `${avgPercent.toFixed(2)}%`;
  statAvgParity.textContent = `${state.currency}${avgMonthlyParity.toFixed(2)}`;
}

/**
 * Render Billionaire Cards
 */
function renderCards(list) {
  if (list.length === 0) {
    cardsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <p style="font-size: 1.8rem; margin-bottom: 12px;">🔎 No results found</p>
        <p>Try searching for a different name, company, or reset filters.</p>
      </div>
    `;
    return;
  }

  cardsGrid.innerHTML = list.map(b => {
    // Generosity class
    let percentClass = 'percent-mid';
    if (b.percentage >= 2.0) percentClass = 'percent-high';
    else if (b.percentage < 0.2) percentClass = 'percent-low';

    // Pledge badge
    const pledgeBadge = b.givingPledge 
      ? `<span class="badge-pill badge-pledged">✓ Giving Pledge</span>` 
      : `<span class="badge-pill badge-no-pledge">No Pledge</span>`;

    return `
      <article class="billionaire-card" data-id="${b.id}">
        <div>
          <!-- Card Top Row -->
          <div class="card-top">
            <div class="avatar-info">
              <div class="avatar-badge" style="background: linear-gradient(135deg, #4f46e5, #9333ea);">
                ${b.initials || b.name.substring(0, 2).toUpperCase()}
              </div>
              <div class="name-col">
                <h3>${b.name}</h3>
                <p class="company-sub">${b.company} • ${b.industry}</p>
              </div>
            </div>
            <div>${pledgeBadge}</div>
          </div>

          <!-- Wealth & Donation Comparison -->
          <div class="wealth-row">
            <div class="wealth-item">
              <div class="lbl">Net Worth</div>
              <div class="val">${formatDollars(b.netWorth, state.currency)}</div>
            </div>
            <div class="wealth-item">
              <div class="lbl">Donated (${getTimeframeLabel(state.activeTimeframe)})</div>
              <div class="val val-donated">${formatDollars(b.totalDonatedInPeriod, state.currency)}</div>
            </div>
          </div>

          <!-- Parity Reality Check Box -->
          <div class="parity-box">
            <div class="parity-header">
              <span class="parity-label">
                <span>⚖️</span> Wealth % Donated
              </span>
              <span class="parity-percent-tag ${percentClass}">${b.percentageFormatted}</span>
            </div>

            <div class="parity-result-row">
              <span class="user-equivalent-amount">
                ${state.currency}${b.userMonthlyEquivalent.toFixed(2)}
              </span>
              <span class="parity-month-sub">from your monthly budget</span>
            </div>

            <div class="parity-tangible">
              <span>${b.tangible.icon}</span>
              <span><strong>Equivalent to:</strong> ${b.tangible.text}</span>
            </div>
          </div>
        </div>

        <!-- Card Action Buttons -->
        <div class="card-actions">
          <button class="btn-card btn-news" data-action="view-news" data-id="${b.id}">
            <span>📰 Sources (${b.periodDonations.length})</span>
          </button>
          <button class="btn-card btn-live-scan" data-action="live-mcp-scan" data-id="${b.id}" data-name="${b.name}">
            <span>⚡ Live MCP Scan</span>
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/**
 * Render Comparative Bar Chart View
 */
function renderChart(list) {
  if (list.length === 0) {
    chartRowsList.innerHTML = `<p style="color: var(--text-muted); text-align: center; padding: 40px;">No data</p>`;
    return;
  }

  // Find max percentage for visual scaling (capped minimum at 5% to avoid division by zero)
  const maxPercent = Math.max(...list.map(b => b.percentage), 5);

  chartRowsList.innerHTML = list.map(b => {
    const width = Math.min(Math.max((b.percentage / maxPercent) * 100, 3), 100);
    let barColor = 'var(--primary-gradient)';
    if (b.percentage >= 2.0) barColor = 'var(--emerald-gradient)';
    else if (b.percentage < 0.2) barColor = 'var(--coral-gradient)';

    return `
      <div class="chart-row">
        <div>
          <div class="chart-name">${b.name}</div>
          <div style="font-size: 0.78rem; color: var(--text-dim);">${b.company}</div>
        </div>
        <div class="chart-bar-track">
          <div class="chart-bar-fill" style="width: ${width}%; background: ${barColor};">
            ${b.percentageFormatted}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: var(--font-heading); font-weight: 800; font-size: 1.05rem; color: #38bdf8;">
            ${state.currency}${b.userMonthlyEquivalent.toFixed(2)} / mo
          </div>
          <div style="font-size: 0.74rem; color: var(--text-dim);">${b.tangible.icon} ${b.tangible.text.split('(')[0]}</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Full UI Update Trigger
 */
function updateUI() {
  // Update Income preview text
  incomePreviewDisplay.textContent = `${state.currency}${state.monthlyIncome.toLocaleString()} / mo`;

  // Compute metrics
  const listWithMetrics = calculateMetrics();
  const displayList = getFilteredAndSortedList(listWithMetrics);

  renderStats(listWithMetrics);

  if (state.viewMode === 'grid') {
    cardsGrid.style.display = 'grid';
    chartViewContainer.style.display = 'none';
    renderCards(displayList);
  } else {
    cardsGrid.style.display = 'none';
    chartViewContainer.style.display = 'block';
    renderChart(displayList);
  }
}

/**
 * Helper to get clean human labels for timeframes
 */
function getTimeframeLabel(timeframe) {
  switch (timeframe) {
    case '2026': return '2026 Recent';
    case '2025': return '2025 Records';
    case 'past_2_years': return 'Past 2 Years';
    case 'past_5_years': return 'Past 5 Years';
    case '2020-2023': return '2020-2023';
    default: return 'All Time';
  }
}

/**
 * Open News Modal with verified articles
 */
function openVerifiedNews(billionaireId) {
  const billionaire = state.billionaires.find(b => b.id === billionaireId);
  if (!billionaire) return;

  modalBillionaireName.textContent = `${billionaire.name} — Philanthropy News`;
  modalTimeframeSub.textContent = `Timeframe: ${getTimeframeLabel(state.activeTimeframe)} • Forbes Score: ${'★'.repeat(billionaire.forbesPhilanthropyScore)}`;
  modalLoadingSpinner.style.display = 'none';

  const periodArticles = filterDonations(billionaire.historicalDonations, state.activeTimeframe);

  if (periodArticles.length === 0) {
    modalArticleList.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        <p>No major publicly reported donation records found for this specific timeframe.</p>
        <button class="btn-card btn-live-scan" style="margin: 16px auto 0; max-width: 220px;" data-action="live-mcp-scan" data-id="${billionaire.id}" data-name="${billionaire.name}">
          Run Live MCP Web Scan
        </button>
      </div>
    `;
  } else {
    modalArticleList.innerHTML = periodArticles.map(a => `
      <div class="article-item">
        <div class="article-meta">
          <span>🏛️ ${a.source}</span>
          <span>•</span>
          <span>📅 ${a.date}</span>
        </div>
        <a href="${a.url}" target="_blank" rel="noopener noreferrer" class="article-title">
          ${a.headline} ↗
        </a>
        <p class="article-snippet">
          <strong>Cause / Recipient:</strong> ${a.cause}
        </p>
        <span class="extracted-amount-tag">
          Reported Gift: ${formatDollars(a.amount, state.currency)}
        </span>
      </div>
    `).join('');
  }

  newsModalOverlay.classList.add('active');
}

/**
 * Trigger Live MCP News Scan via Backend API
 */
async function runLiveMcpScan(billionaireName, billionaireId) {
  modalBillionaireName.textContent = `Live MCP News Scan: ${billionaireName}`;
  modalTimeframeSub.textContent = `Querying Google News RSS via Model Context Protocol...`;
  modalArticleList.innerHTML = '';
  modalLoadingSpinner.style.display = 'block';
  newsModalOverlay.classList.add('active');

  try {
    const timeframeParam = state.activeTimeframe === 'all' ? '1y' : state.activeTimeframe;
    const response = await fetch(`/api/news?billionaire=${encodeURIComponent(billionaireName)}&timeframe=${encodeURIComponent(timeframeParam)}`);
    
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const data = await response.json();
    modalLoadingSpinner.style.display = 'none';

    if (!data.articles || data.articles.length === 0) {
      modalArticleList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted);">
          No recent matching donation headlines found in live news for this timeframe.
        </div>
      `;
      return;
    }

    modalArticleList.innerHTML = data.articles.map(article => `
      <div class="article-item">
        <div class="article-meta">
          <span>🌐 ${article.source}</span>
          <span>•</span>
          <span>📅 ${article.pubDate}</span>
        </div>
        <a href="${article.link}" target="_blank" rel="noopener noreferrer" class="article-title">
          ${article.title} ↗
        </a>
        <p class="article-snippet">${article.snippet || 'No excerpt available.'}</p>
        ${article.detectedAmountStr ? `<span class="extracted-amount-tag">Detected Figure: ${article.detectedAmountStr}</span>` : ''}
      </div>
    `).join('');

  } catch (err) {
    modalLoadingSpinner.style.display = 'none';
    modalArticleList.innerHTML = `
      <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; padding: 16px; color: #fca5a5;">
        <p><strong>Note:</strong> Live MCP News scanning requires the local Node server (running on <code>http://localhost:3000</code>). When deployed statically, verified historical news records are served automatically.</p>
        <p style="margin-top: 8px; font-size: 0.8rem;">Details: ${err.message}</p>
      </div>
    `;
  }
}

// Event Listeners Setup
function setupEventListeners() {
  // Monthly income number input
  incomeInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    state.monthlyIncome = Math.max(val, 0);
    incomeSlider.value = Math.min(state.monthlyIncome, 25000);
    updateUI();
  });

  // Monthly income slider
  incomeSlider.addEventListener('input', (e) => {
    state.monthlyIncome = parseFloat(e.target.value);
    incomeInput.value = state.monthlyIncome;
    updateUI();
  });

  // Currency select
  currencySelect.addEventListener('change', (e) => {
    state.currency = e.target.value;
    updateUI();
  });

  // Timeframe buttons
  timeframeOptions.addEventListener('click', (e) => {
    const btn = e.target.closest('.time-btn');
    if (!btn) return;

    document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    state.activeTimeframe = btn.dataset.timeframe;
    activeTimeframeLabel.textContent = getTimeframeLabel(state.activeTimeframe);
    updateUI();
  });

  // Search input
  searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    updateUI();
  });

  // Sort select
  sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    updateUI();
  });

  // View switchers
  viewGridBtn.addEventListener('click', () => {
    state.viewMode = 'grid';
    viewGridBtn.classList.add('active');
    viewChartBtn.classList.remove('active');
    updateUI();
  });

  viewChartBtn.addEventListener('click', () => {
    state.viewMode = 'chart';
    viewChartBtn.classList.add('active');
    viewGridBtn.classList.remove('active');
    updateUI();
  });

  // Card button delegations (Sources / Live MCP Scan)
  cardsGrid.addEventListener('click', (e) => {
    const newsBtn = e.target.closest('[data-action="view-news"]');
    if (newsBtn) {
      openVerifiedNews(newsBtn.dataset.id);
      return;
    }

    const scanBtn = e.target.closest('[data-action="live-mcp-scan"]');
    if (scanBtn) {
      runLiveMcpScan(scanBtn.dataset.name, scanBtn.dataset.id);
      return;
    }
  });

  // Modal delegation for scan button inside verified news modal
  modalArticleList.addEventListener('click', (e) => {
    const scanBtn = e.target.closest('[data-action="live-mcp-scan"]');
    if (scanBtn) {
      runLiveMcpScan(scanBtn.dataset.name, scanBtn.dataset.id);
    }
  });

  // News Modal Close
  closeNewsModalBtn.addEventListener('click', () => {
    newsModalOverlay.classList.remove('active');
  });

  newsModalOverlay.addEventListener('click', (e) => {
    if (e.target === newsModalOverlay) {
      newsModalOverlay.classList.remove('active');
    }
  });

  // MCP Architecture Modal
  openMcpModalBtn.addEventListener('click', () => {
    mcpArchitectureModalOverlay.classList.add('active');
  });

  closeMcpModalBtn.addEventListener('click', () => {
    mcpArchitectureModalOverlay.classList.remove('active');
  });

  mcpArchitectureModalOverlay.addEventListener('click', (e) => {
    if (e.target === mcpArchitectureModalOverlay) {
      mcpArchitectureModalOverlay.classList.remove('active');
    }
  });

  // ESC key to close any modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      newsModalOverlay.classList.remove('active');
      mcpArchitectureModalOverlay.classList.remove('active');
    }
  });
}

// Initializer
function init() {
  setupEventListeners();
  updateUI();
}

init();
