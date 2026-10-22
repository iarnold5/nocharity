/**
 * Advanced Mode Billionaire Explorer Module
 * Handles progressive filtering, search, pagination, and billionaire directory rendering.
 */

import { state, BF_OPTIONS } from './state.js';
import { formatCurrency } from './utils.js';
import { fetchPeople } from './api.js';

export function renderBillionaireActiveChips() {
  const container = document.getElementById('activeBillionaireChipsRow');
  if (!container) return;
  const bf = state.billionaireFilters;
  const chips = [];

  if (bf.search) {
    chips.push({ key: 'search', label: `Search: "${bf.search}"` });
  }
  if (bf.country && bf.country !== 'all') {
    chips.push({ key: 'country', label: `Country: ${bf.country}` });
  }
  if (bf.industry && bf.industry !== 'all') {
    chips.push({ key: 'industry', label: `Industry: ${bf.industry}` });
  }
  if (bf.wealth && bf.wealth !== 'all') {
    const item = BF_OPTIONS.wealth.find(w => w.val === bf.wealth);
    chips.push({ key: 'wealth', label: `Net Worth: ${item ? item.label : bf.wealth}` });
  }
  if (bf.giving && bf.giving !== 'all') {
    const item = BF_OPTIONS.giving.find(g => g.val === bf.giving);
    chips.push({ key: 'giving', label: `Giving: ${item ? item.label : bf.giving}` });
  }
  if (bf.pledge && bf.pledge !== 'all') {
    chips.push({ key: 'pledge', label: bf.pledge === 'true' ? 'Pledge Signatory' : 'Non-Signatory' });
  }

  if (chips.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = chips.map(c => `
    <span class="active-filter-chip">
      <span>${c.label}</span>
      <button type="button" class="chip-remove-btn" onclick="removeBillionaireFilter('${c.key}')">×</button>
    </span>
  `).join('') + `
    <button type="button" class="btn-clear-all-chips" onclick="clearBillionaireFilters()">Clear all</button>
  `;
}

export function removeBillionaireFilter(key) {
  if (key === 'search') {
    state.billionaireFilters.search = '';
    const input = document.getElementById('inputBillionaireSearch');
    if (input) input.value = '';
  } else if (key === 'country') {
    state.billionaireFilters.country = 'all';
  } else if (key === 'industry') {
    state.billionaireFilters.industry = 'all';
  } else if (key === 'wealth') {
    state.billionaireFilters.wealth = 'all';
  } else if (key === 'giving') {
    state.billionaireFilters.giving = 'all';
  } else if (key === 'pledge') {
    state.billionaireFilters.pledge = 'all';
  }
  state.billionaireFilters.offset = 0;
  renderBillionaireActiveChips();
  loadBillionaires();
}

export function clearBillionaireFilters() {
  state.billionaireFilters.search = '';
  state.billionaireFilters.country = 'all';
  state.billionaireFilters.industry = 'all';
  state.billionaireFilters.wealth = 'all';
  state.billionaireFilters.giving = 'all';
  state.billionaireFilters.pledge = 'all';
  state.billionaireFilters.offset = 0;

  const input = document.getElementById('inputBillionaireSearch');
  if (input) input.value = '';

  renderBillionaireActiveChips();
  loadBillionaires();
}

export async function loadBillionaires() {
  const {
    search,
    country,
    industry,
    wealth,
    giving,
    pledge,
    sortBy,
    sortOrder,
    limit,
    offset
  } = state.billionaireFilters;

  const params = { limit, offset, sortBy, sortOrder };
  if (search) params.search = search;
  if (country && country !== 'all') params.country = country;
  if (industry && industry !== 'all') params.industry = industry;
  if (pledge && pledge !== 'all') params.givingPledge = pledge;

  if (wealth === '200B+') params.minNetWorth = 200000000000;
  else if (wealth === '100B-200B') { params.minNetWorth = 100000000000; params.maxNetWorth = 200000000000; }
  else if (wealth === '50B-100B') { params.minNetWorth = 50000000000; params.maxNetWorth = 100000000000; }
  else if (wealth === 'under50B') params.maxNetWorth = 50000000000;

  if (giving === '10B+') params.minPersonalGiving = 10000000000;
  else if (giving === '1B-10B') { params.minPersonalGiving = 1000000000; params.maxPersonalGiving = 10000000000; }
  else if (giving === '100M-1B') { params.minPersonalGiving = 100000000; params.maxPersonalGiving = 1000000000; }
  else if (giving === 'under100M') params.maxPersonalGiving = 100000000;

  try {
    const data = await fetchPeople(params);
    state.billionaires = data.people || [];
    renderBillionairesTable(state.billionaires);

    const total = data.totalCount !== undefined ? data.totalCount : state.billionaires.length;
    document.getElementById('billionairePaginationInfo').textContent = 
      `Showing ${state.billionaires.length > 0 ? offset + 1 : 0}-${offset + state.billionaires.length} of ${Number(total).toLocaleString()} billionaires`;
    document.getElementById('btnBillionairePrev').disabled = offset <= 0;
    document.getElementById('btnBillionaireNext').disabled = offset + state.billionaires.length >= total;
  } catch (err) {
    console.error('Error loading billionaires:', err);
    const tbody = document.getElementById('billionaireExplorerTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state-cell error-state">
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

export function renderBillionairesTable(people) {
  const tbody = document.getElementById('billionaireExplorerTableBody');
  if (!people || people.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state-cell">
          <div class="empty-state-content">
            <span>🔍</span>
            <h3>No matching billionaires found</h3>
            <p>No records match your active search or filter criteria.</p>
            <button type="button" class="btn btn-sm btn-outline" onclick="clearBillionaireFilters()">Clear filters</button>
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
    return `
      <tr>
        <td>
          <strong style="color: var(--text-main);">${p.canonical_name}</strong>
          <div style="font-size: 0.74rem; color: var(--text-muted);">${p.occupation || ''}</div>
        </td>
        <td>${p.country || 'Global'}</td>
        <td>${p.industry || 'Diversified'}</td>
        <td class="cell-numeric" style="color: var(--accent-gold); font-weight: 700;">${formatCurrency(p.latest_net_worth)}</td>
        <td class="cell-numeric" style="color: #34d399; font-weight: 700;">${formatCurrency(p.total_personal_giving)}</td>
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
  const popover = document.getElementById('popoverBillionaireFilter');
  const title = document.getElementById('popoverBFilterTitle');
  const options = document.getElementById('popoverBFilterOptions');
  if (!popover || !title || !options) return;

  popover.style.display = 'block';

  if (filterType === 'country') {
    title.textContent = 'Filter by Country';
    options.innerHTML = BF_OPTIONS.country.map(c => `
      <button type="button" class="pf-option-btn" onclick="applyBillionaireFilter('country', '${c === 'All Countries' ? 'all' : c}')">${c}</button>
    `).join('');
  } else if (filterType === 'industry') {
    title.textContent = 'Filter by Industry';
    options.innerHTML = BF_OPTIONS.industry.map(ind => `
      <button type="button" class="pf-option-btn" onclick="applyBillionaireFilter('industry', '${ind === 'All Industries' ? 'all' : ind}')">${ind}</button>
    `).join('');
  } else if (filterType === 'wealth') {
    title.textContent = 'Filter by Net Worth';
    options.innerHTML = BF_OPTIONS.wealth.map(w => `
      <button type="button" class="pf-option-btn" onclick="applyBillionaireFilter('wealth', '${w.val}')">${w.label}</button>
    `).join('');
  } else if (filterType === 'giving') {
    title.textContent = 'Filter by Documented Personal Giving';
    options.innerHTML = BF_OPTIONS.giving.map(g => `
      <button type="button" class="pf-option-btn" onclick="applyBillionaireFilter('giving', '${g.val}')">${g.label}</button>
    `).join('');
  } else if (filterType === 'pledge') {
    title.textContent = 'Filter by Giving Pledge';
    options.innerHTML = BF_OPTIONS.pledge.map(pl => `
      <button type="button" class="pf-option-btn" onclick="applyBillionaireFilter('pledge', '${pl.val}')">${pl.label}</button>
    `).join('');
  } else if (filterType === 'sortBy') {
    title.textContent = 'Sort Billionaires';
    options.innerHTML = BF_OPTIONS.sortBy.map(s => `
      <button type="button" class="pf-option-btn" onclick="applyBillionaireFilter('sortBy', '${s.val}')">${s.label}</button>
    `).join('');
  }
}

export function applyBillionaireFilter(filterType, val) {
  state.billionaireFilters[filterType] = val;
  state.billionaireFilters.offset = 0;
  const popover = document.getElementById('popoverBillionaireFilter');
  if (popover) popover.style.display = 'none';
  renderBillionaireActiveChips();
  loadBillionaires();
}
