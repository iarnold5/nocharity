/**
 * Advanced Mode Main Application Entrypoint
 * Orchestrates module initialization, global routing, modal controllers,
 * and attaches public API actions to window for native DOM events.
 */

import { state } from './state.js';
import { loadDashboard } from './dashboard.js';
import { 
  loadRealityCheckCalculator, 
  loadDonationsForCalculator, 
  calculateAndRenderParity, 
  loadRealityCheckComparison,
  setCompareFilter,
  selectBillionaireInCalculator
} from './calculator.js';
import { 
  loadBillionaires, 
  removeBillionaireFilter, 
  clearBillionaireFilters, 
  openBillionaireFilterPopover, 
  applyBillionaireFilter 
} from './explorer.js';
import { 
  loadDonations, 
  removeDonationFilter, 
  clearDonationFilters, 
  openDonationFilterPopover, 
  applyDonationFilter, 
  applyDonationSort, 
  handleDonationSortClick, 
  showCitationDetails 
} from './donations.js';
import { loadRankings } from './rankings.js';
import { loadProfile, viewBillionaireProfile } from './profile.js';
import { loadDiscoveryTab, runDiscoveryScan, loadMethodologyTab } from './discovery.js';

// Expose public controller methods on window for HTML event handlers
window.switchTab = switchTab;
window.openMethodologyModal = openMethodologyModal;
window.closeMethodologyModal = closeMethodologyModal;
window.switchMethTab = switchMethTab;
window.viewBillionaireProfile = viewBillionaireProfile;
window.selectBillionaireInCalculator = selectBillionaireInCalculator;
window.setCompareFilter = setCompareFilter;
window.applyBillionaireFilter = applyBillionaireFilter;
window.removeBillionaireFilter = removeBillionaireFilter;
window.clearBillionaireFilters = clearBillionaireFilters;
window.openBillionaireFilterPopover = openBillionaireFilterPopover;
window.applyDonationFilter = applyDonationFilter;
window.applyDonationSort = applyDonationSort;
window.removeDonationFilter = removeDonationFilter;
window.clearDonationFilters = clearDonationFilters;
window.openDonationFilterPopover = openDonationFilterPopover;
window.handleDonationSortClick = handleDonationSortClick;
window.showCitationDetails = showCitationDetails;
window.loadDonations = loadDonations;
window.loadBillionaires = loadBillionaires;

export function switchTab(tabName) {
  state.activeTab = tabName;
  window.location.hash = tabName;

  document.querySelectorAll('.nav-tab-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
    btn.setAttribute('aria-selected', btn.dataset.tab === tabName);
  });

  document.querySelectorAll('.nav-more-menu-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Show profile tab item in more menu if on profile
  const profItem = document.getElementById('navItemProfileSecondary');
  if (profItem) {
    profItem.style.display = tabName === 'profile' ? 'flex' : 'none';
  }

  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${tabName}`);
  });

  // Close more menu if open
  const moreMenu = document.getElementById('navMoreMenu');
  if (moreMenu) moreMenu.style.display = 'none';

  if (tabName === 'dashboard') loadDashboard();
  if (tabName === 'calculator') loadRealityCheckCalculator();
  if (tabName === 'billionaires') loadBillionaires();
  if (tabName === 'donations') loadDonations();
  if (tabName === 'rankings') loadRankings();
  if (tabName === 'profile' && state.activeProfileId) loadProfile(state.activeProfileId);
  if (tabName === 'discovery') loadDiscoveryTab();
  if (tabName === 'methodology') loadMethodologyTab();
}

export function openMethodologyModal() {
  const dlg = document.getElementById('modalDataMethodology');
  if (dlg) {
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.style.display = 'block';
  }
}

export function closeMethodologyModal() {
  const dlg = document.getElementById('modalDataMethodology');
  if (dlg) {
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.style.display = 'none';
  }
}

export function switchMethTab(tabId) {
  document.querySelectorAll('.meth-tab-pill').forEach(b => b.classList.remove('active'));
  if (window.event && window.event.target) window.event.target.classList.add('active');
  document.querySelectorAll('.meth-section').forEach(s => s.style.display = 'none');
  const targetSec = document.getElementById(`sec-${tabId}`);
  if (targetSec) targetSec.style.display = 'block';
}

function handleHashRoute() {
  const rawHash = window.location.hash.replace('#', '').trim();
  if (rawHash.startsWith('calculator')) {
    switchTab('calculator');
    const queryIdx = rawHash.indexOf('?');
    if (queryIdx !== -1) {
      const params = new URLSearchParams(rawHash.substring(queryIdx + 1));
      const personId = params.get('personId');
      if (personId) selectBillionaireInCalculator(personId);
    }
  } else if (rawHash.startsWith('profile')) {
    const parts = rawHash.split('/');
    switchTab('profile');
    if (parts.length > 1 && parts[1]) {
      state.activeProfileId = parts[1];
      loadProfile(parts[1]);
    } else if (state.activeProfileId) {
      loadProfile(state.activeProfileId);
    }
  } else if (['dashboard', 'calculator', 'billionaires', 'donations', 'rankings', 'discovery', 'methodology'].includes(rawHash)) {
    switchTab(rawHash);
  } else {
    switchTab('calculator');
  }
}

export function initAdvancedApp() {
  // Header Back / Return Basic Mode
  document.getElementById('btnQuickReturnBasic')?.addEventListener('click', () => {
    try { localStorage.setItem('nocharity_advanced_mode', 'false'); } catch (e) {}
    window.location.href = '/';
  });

  document.getElementById('btnGoBasicMode')?.addEventListener('click', (e) => {
    e.preventDefault();
    try { localStorage.setItem('nocharity_advanced_mode', 'false'); } catch (e) {}
    window.location.href = '/';
  });

  // Header Methodology Modal Triggers
  document.getElementById('btnOpenHeaderMethodology')?.addEventListener('click', openMethodologyModal);
  document.getElementById('btnProvenanceReadMore')?.addEventListener('click', openMethodologyModal);
  document.getElementById('btnCloseMethodologyDialog')?.addEventListener('click', closeMethodologyModal);

  // Tab Buttons
  document.querySelectorAll('.nav-tab-item:not(.nav-more-btn)').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('.nav-more-menu-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // More menu toggle
  const btnMore = document.getElementById('btnNavMore');
  const moreMenu = document.getElementById('navMoreMenu');
  if (btnMore && moreMenu) {
    btnMore.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = moreMenu.style.display !== 'none';
      moreMenu.style.display = isExpanded ? 'none' : 'flex';
      btnMore.setAttribute('aria-expanded', !isExpanded);
    });

    document.addEventListener('click', () => {
      moreMenu.style.display = 'none';
      btnMore.setAttribute('aria-expanded', 'false');
    });
  }

  // Billionaire Search
  const inputBSearch = document.getElementById('inputBillionaireSearch');
  let bSearchTimer = null;
  inputBSearch?.addEventListener('input', (e) => {
    clearTimeout(bSearchTimer);
    bSearchTimer = setTimeout(() => {
      state.billionaireFilters.search = e.target.value.trim();
      state.billionaireFilters.offset = 0;
      loadBillionaires();
    }, 250);
  });

  // Billionaire Add Filter Dropdown & Popover
  const btnBAddFilter = document.getElementById('btnBillionaireAddFilter');
  const menuBFilter = document.getElementById('menuBFilterDropdown');
  const popoverBFilter = document.getElementById('popoverBillionaireFilter');
  const btnCloseBPopover = document.getElementById('btnCloseBFilterPopover');

  btnBAddFilter?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = menuBFilter.style.display !== 'none';
    menuBFilter.style.display = isShown ? 'none' : 'flex';
    if (popoverBFilter) popoverBFilter.style.display = 'none';
  });

  document.querySelectorAll('#menuBFilterDropdown .pf-menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const filterType = btn.dataset.filterType;
      menuBFilter.style.display = 'none';
      openBillionaireFilterPopover(filterType);
    });
  });

  btnCloseBPopover?.addEventListener('click', () => {
    if (popoverBFilter) popoverBFilter.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (menuBFilter && !menuBFilter.contains(e.target) && e.target !== btnBAddFilter) {
      menuBFilter.style.display = 'none';
    }
    if (popoverBFilter && !popoverBFilter.contains(e.target) && !menuBFilter?.contains(e.target)) {
      popoverBFilter.style.display = 'none';
    }
  });

  // Billionaire Pagination
  document.getElementById('btnBillionairePrev')?.addEventListener('click', () => {
    state.billionaireFilters.offset = Math.max(0, state.billionaireFilters.offset - state.billionaireFilters.limit);
    loadBillionaires();
  });

  document.getElementById('btnBillionaireNext')?.addEventListener('click', () => {
    state.billionaireFilters.offset += state.billionaireFilters.limit;
    loadBillionaires();
  });

  // Donation Search
  const inputDSearch = document.getElementById('inputDonationSearch');
  let dSearchTimer = null;
  inputDSearch?.addEventListener('input', (e) => {
    clearTimeout(dSearchTimer);
    dSearchTimer = setTimeout(() => {
      state.donationFilters.search = e.target.value.trim();
      state.donationFilters.offset = 0;
      loadDonations();
    }, 250);
  });

  // Donation Add Filter Dropdown & Popover
  const btnDAddFilter = document.getElementById('btnDonationAddFilter');
  const menuDFilter = document.getElementById('menuDFilterDropdown');
  const popoverDFilter = document.getElementById('popoverDonationFilter');
  const btnCloseDPopover = document.getElementById('btnCloseDFilterPopover');

  btnDAddFilter?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isShown = menuDFilter.style.display !== 'none';
    menuDFilter.style.display = isShown ? 'none' : 'flex';
    if (popoverDFilter) popoverDFilter.style.display = 'none';
  });

  document.querySelectorAll('#menuDFilterDropdown .pf-menu-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const filterType = btn.dataset.filterType;
      menuDFilter.style.display = 'none';
      openDonationFilterPopover(filterType);
    });
  });

  btnCloseDPopover?.addEventListener('click', () => {
    if (popoverDFilter) popoverDFilter.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (menuDFilter && !menuDFilter.contains(e.target) && e.target !== btnDAddFilter) {
      menuDFilter.style.display = 'none';
    }
    if (popoverDFilter && !popoverDFilter.contains(e.target) && !menuDFilter?.contains(e.target)) {
      popoverDFilter.style.display = 'none';
    }
  });

  document.getElementById('toggleDonationOrgGiving')?.addEventListener('change', (e) => {
    state.donationFilters.includeAssociatedOrgGiving = e.target.checked;
    state.donationFilters.offset = 0;
    const notice = document.getElementById('donationModeNotice');
    if (notice) {
      if (e.target.checked) {
        notice.style.background = 'rgba(168, 85, 247, 0.08)';
        notice.style.borderColor = 'rgba(168, 85, 247, 0.25)';
        notice.style.color = '#e9d5ff';
        notice.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;"><span>🏛️</span><div><strong>CONTEXTUAL EXPLORATION MODE: Including Foundation & Corporate Grants.</strong> These organizational disbursements provide research context but are strictly excluded from personal parity calculations.</div></div>`;
      } else {
        notice.style.background = 'rgba(16, 185, 129, 0.08)';
        notice.style.borderColor = 'rgba(16, 185, 129, 0.25)';
        notice.style.color = '#a7f3d0';
        notice.innerHTML = `<div style="display: flex; align-items: center; gap: 8px;"><span>👤</span><div><strong>DEFAULT MODE: Showing Documented Personal Giving Only.</strong> Corporate, Foundation, and DAF grants are excluded by default to ensure personal billionaire sacrifice is never artificially inflated.</div></div>`;
      }
    }
    loadDonations();
  });

  document.getElementById('btnDonationPrev')?.addEventListener('click', () => {
    state.donationFilters.offset = Math.max(0, state.donationFilters.offset - state.donationFilters.limit);
    loadDonations();
  });

  document.getElementById('btnDonationNext')?.addEventListener('click', () => {
    state.donationFilters.offset += state.donationFilters.limit;
    loadDonations();
  });

  document.querySelectorAll('#donationsTableHeader th.th-sortable').forEach(th => {
    th.addEventListener('click', () => handleDonationSortClick(th.dataset.sort));
  });

  // Rankings Tabs
  document.querySelectorAll('.ranking-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.ranking-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.rankingsMetric = btn.dataset.metric;
      state.rankingsOffset = 0;
      loadRankings();
    });
  });

  document.getElementById('btnRankingsPrev')?.addEventListener('click', () => {
    state.rankingsOffset = Math.max(0, state.rankingsOffset - state.rankingsLimit);
    loadRankings();
  });

  document.getElementById('btnRankingsNext')?.addEventListener('click', () => {
    state.rankingsOffset += state.rankingsLimit;
    loadRankings();
  });

  // Calculator Inputs & Benchmark Selector
  document.getElementById('calcBillionaireSelect')?.addEventListener('change', async (e) => {
    const val = e.target.value;
    const c = state.calculator;
    if (val === 'canonical') {
      c.isCanonicalExample = true;
      c.selectedBillionaireId = null;
      c.selectedDonationId = 'canonical';
      const donSelect = document.getElementById('calcDonationSelect');
      if (donSelect) {
        donSelect.innerHTML = `<option value="canonical" selected>$500,000,000 (0.50% of $100B Net Worth) — Gates Foundation & Family Charities (2018-05-01)</option>`;
      }
      calculateAndRenderParity();
    } else {
      c.isCanonicalExample = false;
      c.selectedBillionaireId = val;
      await loadDonationsForCalculator(val);
      await calculateAndRenderParity();
    }
  });

  document.getElementById('calcDonationSelect')?.addEventListener('change', (e) => {
    state.calculator.selectedDonationId = e.target.value;
    calculateAndRenderParity();
  });

  document.getElementById('calcCurrencySelect')?.addEventListener('change', (e) => {
    const curr = e.target.value;
    state.calculator.currency = curr;
    state.currency = curr;
    try { localStorage.setItem('nocharity_currency', curr); } catch (err) {}
    const symbol = document.getElementById('calcIncomeCurrencySymbol');
    if (symbol) symbol.textContent = curr;
    calculateAndRenderParity();
    loadRealityCheckComparison();
  });

  // User Net Worth
  const nwInput = document.getElementById('calcUserNetWorthInput');
  nwInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    state.calculator.userNetWorth = val === '' ? null : parseFloat(val);
    calculateAndRenderParity();
    loadRealityCheckComparison();
  });

  document.querySelectorAll('.calc-nw-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-nw-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = parseFloat(btn.dataset.val);
      state.calculator.userNetWorth = val;
      if (nwInput) nwInput.value = val;
      calculateAndRenderParity();
      loadRealityCheckComparison();
    });
  });

  document.getElementById('btnClearNetWorth')?.addEventListener('click', () => {
    state.calculator.userNetWorth = null;
    if (nwInput) nwInput.value = '';
    document.querySelectorAll('.calc-nw-chip').forEach(b => b.classList.remove('active'));
    calculateAndRenderParity();
    loadRealityCheckComparison();
  });

  // User Income & Frequency
  const incInput = document.getElementById('calcUserIncomeInput');
  incInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    const num = val === '' ? null : parseFloat(val);
    state.calculator.userIncome = num;
    if (state.calculator.incomeFrequency === 'annual' && num !== null) {
      state.calculator.monthlyIncome = num / 12;
    } else {
      state.calculator.monthlyIncome = num;
    }
    calculateAndRenderParity();
    loadRealityCheckComparison();
  });

  document.querySelectorAll('.btn-freq').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-freq').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const freq = btn.dataset.freq;
      state.calculator.incomeFrequency = freq;
      const num = state.calculator.userIncome;
      if (num !== null) {
        state.calculator.monthlyIncome = freq === 'annual' ? num / 12 : num;
      }
      calculateAndRenderParity();
      loadRealityCheckComparison();
    });
  });

  document.querySelectorAll('.calc-inc-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.calc-inc-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const val = parseFloat(btn.dataset.val);
      state.calculator.userIncome = val;
      state.calculator.monthlyIncome = state.calculator.incomeFrequency === 'annual' ? val / 12 : val;
      if (incInput) incInput.value = val;
      calculateAndRenderParity();
      loadRealityCheckComparison();
    });
  });

  document.getElementById('btnClearIncome')?.addEventListener('click', () => {
    state.calculator.monthlyIncome = null;
    state.calculator.userIncome = null;
    if (incInput) incInput.value = '';
    document.querySelectorAll('.calc-inc-chip').forEach(b => b.classList.remove('active'));
    calculateAndRenderParity();
    loadRealityCheckComparison();
  });

  // Profile Select
  document.getElementById('selectBillionaireProfile')?.addEventListener('change', (e) => {
    viewBillionaireProfile(e.target.value);
  });

  // Discovery & Quality Tester
  document.getElementById('btnRunDiscoveryScan')?.addEventListener('click', runDiscoveryScan);
  document.getElementById('btnCloseCitationModal')?.addEventListener('click', () => {
    const m = document.getElementById('citationDetailsModal');
    if (m) m.style.display = 'none';
  });

  window.addEventListener('hashchange', handleHashRoute);
  handleHashRoute();

  // Pre-fetch dashboard metrics in background so Overview is instant
  loadDashboard();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdvancedApp);
} else {
  initAdvancedApp();
}
