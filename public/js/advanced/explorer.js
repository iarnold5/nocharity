/**
 * Advanced Mode Billionaire Explorer Module
 * Handles progressive multi-field filtering, persistent filter chips,
 * foundation / org giving toggle, pagination with clickable page numbers,
 * and billionaire directory rendering.
 */

import { state } from './state.js';
import { formatCurrency, escapeHtml, renderPaginationButtons } from './utils.js';
import { fetchPeople } from './api.js';

if (!state.billionaireFilters.activeFilterChips) {
  state.billionaireFilters.activeFilterChips = [];
}

export function renderBillionaireActiveChips() {
  const container = document.getElementById('activeBillionaireChipsRow');
  if (!container) return;

  const chips = state.billionaireFilters.activeFilterChips || [];

  if (chips.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = chips.map(c => `
    <div class="filter-card-chip" data-id="${c.id}">
      <span class="filter-card-field">${escapeHtml(c.fieldLabel || c.field)}:</span>
      <span class="filter-card-val">"${escapeHtml(c.query)}"</span>
      <button type="button" class="filter-card-remove" onclick="removeBillionaireFilterChip('${c.id}')" title="Remove this filter" aria-label="Remove filter">✕</button>
    </div>
  `).join('') + `
    <button type="button" class="btn-clear-all-chips" onclick="clearAllBillionaireFilterChips()">Clear all</button>
  `;
}

export function addBillionaireFilterFromInput() {
  const select = document.getElementById('selectBillionaireFilterField');
  const input = document.getElementById('filterBillionaireSearch');
  if (!input) return;

  const query = input.value.trim();
  if (!query) return;

  const field = select ? select.value : 'name';
  const fieldLabel = select && select.selectedOptions && select.selectedOptions[0]
    ? select.selectedOptions[0].text.replace(/^[^\w\s]+/, '').trim()
    : field;

  if (!state.billionaireFilters.activeFilterChips) {
    state.billionaireFilters.activeFilterChips = [];
  }

  // Prevent duplicate filters
  const exists = state.billionaireFilters.activeFilterChips.some(
    c => c.field === field && c.query.toLowerCase() === query.toLowerCase()
  );

  if (!exists) {
    state.billionaireFilters.activeFilterChips.push({
      id: 'bfc_' + Date.now() + Math.random().toString(36).substring(2, 6),
      field,
      fieldLabel,
      query
    });
  }

  input.value = '';
  const clearBtn = document.getElementById('btnClearBillionaireSearch');
  if (clearBtn) clearBtn.style.display = 'none';

  state.billionaireFilters.offset = 0;
  renderBillionaireActiveChips();
  loadBillionaires();
}

export function removeBillionaireFilterChip(id) {
  if (!state.billionaireFilters.activeFilterChips) return;
  state.billionaireFilters.activeFilterChips = state.billionaireFilters.activeFilterChips.filter(c => c.id !== id);
  state.billionaireFilters.offset = 0;
  renderBillionaireActiveChips();
  loadBillionaires();
}

export function clearAllBillionaireFilterChips() {
  state.billionaireFilters.activeFilterChips = [];
  state.billionaireFilters.search = '';
  state.billionaireFilters.offset = 0;
  const input = document.getElementById('filterBillionaireSearch');
  if (input) input.value = '';
  const clearBtn = document.getElementById('btnClearBillionaireSearch');
  if (clearBtn) clearBtn.style.display = 'none';

  renderBillionaireActiveChips();
  loadBillionaires();
}

export function removeBillionaireFilter(key) {
  clearAllBillionaireFilterChips();
}

export function clearBillionaireFilters() {
  clearAllBillionaireFilterChips();
}

export function goToBillionairePage(pageNum) {
  const limit = state.billionaireFilters.limit || 20;
  state.billionaireFilters.offset = Math.max(0, (pageNum - 1) * limit);
  loadBillionaires();
}

export async function loadBillionaires() {
  const {
    sortBy,
    sortOrder,
    limit,
    offset
  } = state.billionaireFilters;

  const chips = state.billionaireFilters.activeFilterChips || [];
  const searchInput = document.getElementById('filterBillionaireSearch');
  const liveQuery = searchInput ? searchInput.value.trim() : '';
  const liveField = document.getElementById('selectBillionaireFilterField')?.value || 'name';

  const params = { limit: 100, offset: 0, sortBy, sortOrder };

  // Pass primary filters to API if matched in chips
  chips.forEach(c => {
    if (c.field === 'name' || c.field === 'all') params.search = c.query;
    if (c.field === 'country') params.country = c.query;
    if (c.field === 'industry') params.industry = c.query;
    if (c.field === 'pledge') {
      const q = c.query.toLowerCase();
      if (q.includes('yes') || q.includes('sign') || q.includes('true')) params.givingPledge = 'true';
      else if (q.includes('no') || q.includes('false')) params.givingPledge = 'false';
    }
  });

  if (liveQuery && !params.search) {
    if (liveField === 'country') params.country = liveQuery;
    else if (liveField === 'industry') params.industry = liveQuery;
    else params.search = liveQuery;
  }

  try {
    const data = await fetchPeople(params);
    let allPeople = data.people || [];

    // Filter in-memory for all persistent chips to ensure multi-filter AND precision
    if (chips.length > 0) {
      allPeople = allPeople.filter(p => {
        return chips.every(c => {
          const q = c.query.toLowerCase();
          if (c.field === 'name') {
            return (p.canonical_name && p.canonical_name.toLowerCase().includes(q)) ||
                   (p.aliases && p.aliases.some(a => a.toLowerCase().includes(q)));
          }
          if (c.field === 'country') {
            return p.country && p.country.toLowerCase().includes(q);
          }
          if (c.field === 'industry') {
            return p.industry && p.industry.toLowerCase().includes(q);
          }
          if (c.field === 'wealth') {
            const nwStr = formatCurrency(p.latest_net_worth).toLowerCase();
            return nwStr.includes(q) || String(p.latest_net_worth).includes(q);
          }
          if (c.field === 'giving') {
            const givStr = formatCurrency(p.total_personal_giving).toLowerCase();
            return givStr.includes(q) || String(p.total_personal_giving).includes(q);
          }
          if (c.field === 'pledge') {
            const isSignatory = Boolean(p.giving_pledge);
            if (q.includes('yes') || q.includes('sign') || q.includes('true')) return isSignatory;
            if (q.includes('no') || q.includes('false')) return !isSignatory;
            return true;
          }
          // 'all'
          return (p.canonical_name && p.canonical_name.toLowerCase().includes(q)) ||
                 (p.country && p.country.toLowerCase().includes(q)) ||
                 (p.industry && p.industry.toLowerCase().includes(q)) ||
                 (p.occupation && p.occupation.toLowerCase().includes(q));
        });
      });
    }

    // Apply live query if present
    if (liveQuery) {
      const q = liveQuery.toLowerCase();
      allPeople = allPeople.filter(p => {
        if (liveField === 'name') return p.canonical_name && p.canonical_name.toLowerCase().includes(q);
        if (liveField === 'country') return p.country && p.country.toLowerCase().includes(q);
        if (liveField === 'industry') return p.industry && p.industry.toLowerCase().includes(q);
        return (p.canonical_name && p.canonical_name.toLowerCase().includes(q)) ||
               (p.country && p.country.toLowerCase().includes(q)) ||
               (p.industry && p.industry.toLowerCase().includes(q));
      });
    }

    const total = (chips.length > 0 || liveQuery) ? allPeople.length : (data.totalCount !== undefined ? data.totalCount : allPeople.length);
    const paginatedPeople = allPeople.slice(offset, offset + limit);

    state.billionaires = paginatedPeople;
    renderBillionairesTable(paginatedPeople);

    // Update pagination status
    const startNum = total > 0 ? offset + 1 : 0;
    const endNum = Math.min(offset + paginatedPeople.length, total);
    const infoEl = document.getElementById('billionairePaginationInfo');
    if (infoEl) {
      infoEl.textContent = `Showing ${startNum}-${endNum} of ${Number(total).toLocaleString()} billionaires`;
    }

    const prevBtn = document.getElementById('btnBillionairePrev');
    if (prevBtn) prevBtn.disabled = offset <= 0;

    const nextBtn = document.getElementById('btnBillionaireNext');
    if (nextBtn) nextBtn.disabled = offset + paginatedPeople.length >= total;

    // Render clickable page numbers
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    renderPaginationButtons('billionairePaginationPages', currentPage, totalPages, 'goToBillionairePage');

  } catch (err) {
    console.error('Error loading billionaires:', err);
    const tbody = document.getElementById('billionaireExplorerTableBody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="empty-state-cell error-state">
            <div class="empty-state-content">
              <span>⚠️</span>
              <h3>We couldn't load the results</h3>
              <p>The database request encountered an issue. Please try again.</p>
              <button type="button" class="btn btn-sm btn-primary" onclick="loadBillionaires()">Retry</button>
            </div>
          </td>
        </tr>
      `;
    }
  }
}

export function renderBillionairesTable(people) {
  const tbody = document.getElementById('billionaireExplorerTableBody');
  if (!tbody) return;

  const showOrg = Boolean(state.showBillionaireOrgGiving);

  // Sync table header column
  document.querySelectorAll('.col-org-giving').forEach(el => {
    el.style.display = showOrg ? 'table-cell' : 'none';
  });

  if (!people || people.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state-cell">
          <div class="empty-state-content">
            <span>🔍</span>
            <h3>No matching billionaires found</h3>
            <p>No records match your active search or filter criteria.</p>
            <button type="button" class="btn btn-sm btn-outline" onclick="clearAllBillionaireFilterChips()">Clear filters</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = people.map(p => {
    const pledgeBadge = p.giving_pledge 
      ? '<span class="badge badge-personal">✍️ Signatory</span>'
      : '<span class="badge badge-unverified">Non-Signatory</span>';

    const personId = p.person_id || p.id;
    const orgGiving = Number(p.total_foundation_giving || 0) + Number(p.total_corporate_giving || 0) + Number(p.total_daf_transfers || 0);
    const peakPct = p.peak_historical_percentage !== null && p.peak_historical_percentage !== undefined && !isNaN(p.peak_historical_percentage)
      ? `${Number(p.peak_historical_percentage).toFixed(2)}%`
      : 'N/A';

    return `
      <tr>
        <td>
          <strong style="color: var(--text-main);">${escapeHtml(p.canonical_name)}</strong>
          <div style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(p.occupation || '')}</div>
        </td>
        <td>${escapeHtml(p.country || 'Global')}</td>
        <td>${escapeHtml(p.industry || 'Diversified')}</td>
        <td class="cell-numeric" style="color: var(--accent-gold); font-weight: 700;">${formatCurrency(p.latest_net_worth)}</td>
        <td class="cell-numeric" style="color: #34d399; font-weight: 700;">${formatCurrency(p.total_personal_giving)}</td>
        <td class="cell-numeric" style="color: #38bdf8; font-weight: 600;">${peakPct}</td>
        <td class="cell-numeric col-org-giving" style="color: #c084fc; font-weight: 700; display: ${showOrg ? 'table-cell' : 'none'};">${formatCurrency(orgGiving)}</td>
        <td>${pledgeBadge}</td>
        <td>
          <button type="button" class="btn-table-action" onclick="viewBillionaireProfile('${personId}')">
            Profile →
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export function openBillionaireFilterPopover(filterType) {
  // Legacy popover compatibility stub
}

export function applyBillionaireFilter(filterType, val) {
  state.billionaireFilters[filterType] = val;
  state.billionaireFilters.offset = 0;
  loadBillionaires();
}

// Global attachments for inline handlers
window.goToBillionairePage = goToBillionairePage;
window.removeBillionaireFilterChip = removeBillionaireFilterChip;
window.clearAllBillionaireFilterChips = clearAllBillionaireFilterChips;
window.addBillionaireFilterFromInput = addBillionaireFilterFromInput;
