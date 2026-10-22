/**
 * Advanced Mode Donation Explorer Module
 * Handles progressive filtering, verification statuses, citation modals,
 * and audited transaction table rendering.
 */

import { state, DF_OPTIONS } from './state.js';
import { formatCurrency, getDonationBadgeHtml } from './utils.js';
import { fetchDonations, fetchCitations } from './api.js';

export function renderDonationActiveChips() {
  const container = document.getElementById('activeDonationChipsRow');
  if (!container) return;
  const df = state.donationFilters;
  const chips = [];

  if (df.search) {
    chips.push({ key: 'search', label: `Search: "${df.search}"` });
  }
  if (df.fundingSourceType && df.fundingSourceType !== 'all') {
    const item = DF_OPTIONS.fundingSource.find(f => f.val === df.fundingSourceType);
    chips.push({ key: 'fundingSourceType', label: `Funding: ${item ? item.label : df.fundingSourceType}` });
  }
  if (df.status && df.status !== 'all') {
    chips.push({ key: 'status', label: df.status === 'VERIFIED' ? 'Status: Verified' : 'Status: Unverified' });
  }
  if (df.amountRange && df.amountRange !== 'all') {
    const item = DF_OPTIONS.amount.find(a => a.val === df.amountRange);
    chips.push({ key: 'amountRange', label: `Amount: ${item ? item.label : df.amountRange}` });
  }
  if (df.sourceType && df.sourceType !== 'all') {
    const item = DF_OPTIONS.sourceType.find(s => s.val === df.sourceType);
    chips.push({ key: 'sourceType', label: `Tier: ${item ? item.label : df.sourceType}` });
  }
  if (df.billionaireId && df.billionaireId !== 'all') {
    const donor = (state.calculator?.allBillionaires || []).find(b => (b.id || b.person_id) === df.billionaireId);
    chips.push({ key: 'billionaireId', label: `Donor: ${donor ? donor.canonical_name : df.billionaireId}` });
  }

  if (chips.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = chips.map(c => `
    <span class="active-filter-chip">
      <span>${c.label}</span>
      <button type="button" class="chip-remove-btn" onclick="removeDonationFilter('${c.key}')">×</button>
    </span>
  `).join('') + `
    <button type="button" class="btn-clear-all-chips" onclick="clearDonationFilters()">Clear all</button>
  `;
}

export function removeDonationFilter(key) {
  if (key === 'search') {
    state.donationFilters.search = '';
    const input = document.getElementById('inputDonationSearch');
    if (input) input.value = '';
  } else if (key === 'fundingSourceType') {
    state.donationFilters.fundingSourceType = 'all';
  } else if (key === 'status') {
    state.donationFilters.status = 'all';
  } else if (key === 'amountRange') {
    state.donationFilters.amountRange = 'all';
  } else if (key === 'sourceType') {
    state.donationFilters.sourceType = 'all';
  } else if (key === 'billionaireId') {
    state.donationFilters.billionaireId = 'all';
  }
  state.donationFilters.offset = 0;
  renderDonationActiveChips();
  loadDonations();
}

export function clearDonationFilters() {
  state.donationFilters.search = '';
  state.donationFilters.billionaireId = 'all';
  state.donationFilters.fundingSourceType = 'all';
  state.donationFilters.status = 'all';
  state.donationFilters.sourceType = 'all';
  state.donationFilters.amountRange = 'all';
  state.donationFilters.startDate = '';
  state.donationFilters.endDate = '';
  state.donationFilters.offset = 0;

  const input = document.getElementById('inputDonationSearch');
  if (input) input.value = '';

  renderDonationActiveChips();
  loadDonations();
}

export async function loadDonations() {
  const {
    search,
    billionaireId,
    fundingSourceType,
    status,
    sourceType,
    amountRange,
    startDate,
    endDate,
    includeAssociatedOrgGiving,
    sortBy,
    sortOrder,
    limit,
    offset
  } = state.donationFilters;

  let url = `/api/advanced/donations?limit=${limit}&offset=${offset}&includeAssociatedOrgGiving=${includeAssociatedOrgGiving}&sortBy=${sortBy}&sortOrder=${sortOrder}`;

  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (billionaireId && billionaireId !== 'all') url += `&personId=${billionaireId}`;
  if (fundingSourceType && fundingSourceType !== 'all') url += `&fundingSourceType=${fundingSourceType}`;
  if (status && status !== 'all') url += `&status=${status}`;
  if (sourceType && sourceType !== 'all') url += `&sourceType=${sourceType}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;

  if (amountRange === '1B+') url += `&minAmount=1000000000`;
  else if (amountRange === '100M-1B') url += `&minAmount=100000000&maxAmount=1000000000`;
  else if (amountRange === '10M-100M') url += `&minAmount=10000000&maxAmount=100000000`;
  else if (amountRange === 'under10M') url += `&maxAmount=10000000`;

  try {
    const data = await fetchDonations(url);
    state.donations = data.donations || [];
    renderDonationsTable(state.donations);
    updateSortHeaderVisuals();

    const total = data.totalCount !== undefined ? data.totalCount : state.donations.length;
    document.getElementById('donationPaginationInfo').textContent = 
      `Showing ${state.donations.length > 0 ? offset + 1 : 0}-${offset + state.donations.length} of ${Number(total).toLocaleString()} donations`;
    document.getElementById('btnDonationPrev').disabled = offset <= 0;
    document.getElementById('btnDonationNext').disabled = offset + state.donations.length >= total;
  } catch (err) {
    console.error('Error loading donations:', err);
    const tbody = document.getElementById('donationExplorerTableBody');
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state-cell error-state">
          <div class="empty-state-content">
            <span>⚠️</span>
            <h3>We couldn't load the results</h3>
            <p>The database request encountered an issue. Please try again.</p>
            <button type="button" class="btn btn-sm btn-primary" onclick="loadDonations()">Retry</button>
          </div>
        </td>
      </tr>
    `;
  }
}

export function renderDonationsTable(donations) {
  const tbody = document.getElementById('donationExplorerTableBody');
  if (!donations || donations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state-cell">
          <div class="empty-state-content">
            <span>🔍</span>
            <h3>No matching donations found</h3>
            <p>No verified gifts match this filter combination.</p>
            <button type="button" class="btn btn-sm btn-outline" onclick="clearDonationFilters()">Clear filters</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = donations.map((d) => {
    const badgeHtml = getDonationBadgeHtml(d);
    const donorName = d.donor_person_name || d.donor_organization_name || 'Anonymous';
    const recipientName = d.recipient_organization_name || d.recipient_person_name || d.cause_category || 'Charitable Grant';
    
    const hasPct = d.historical_percentage !== null && !isNaN(d.historical_percentage);
    const parityDisplay = hasPct
      ? `<span style="color: #38bdf8; font-weight: 700;">${Number(d.historical_percentage).toFixed(2)}%</span>`
      : `<span style="color: var(--text-subtle);">—</span>`;
    const wealthSubtext = d.historical_net_worth
      ? `<div style="font-size: 0.72rem; color: var(--text-muted);">${formatCurrency(d.historical_net_worth)} wealth</div>`
      : (d.is_personal_parity_eligible ? `<div style="font-size: 0.72rem; color: var(--text-subtle);">No wealth snapshot</div>` : `<div style="font-size: 0.72rem; color: var(--text-subtle);">Org disbursement</div>`);

    return `
      <tr>
        <td style="font-family: var(--font-mono); color: var(--text-muted); white-space: nowrap;">${d.donation_date || 'N/A'}</td>
        <td>
          <div style="font-weight: 700; color: var(--text-main);">${donorName}</div>
          ${d.donor_person_id ? `<button type="button" class="btn-table-action" style="font-size: 0.68rem; padding: 1px 6px; margin-top: 2px;" onclick="viewBillionaireProfile('${d.donor_person_id}')">Profile</button>` : ''}
        </td>
        <td style="max-width: 280px;">
          <div style="font-weight: 600; color: var(--text-main);">${recipientName}</div>
          <div style="font-size: 0.74rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${d.description || ''}</div>
        </td>
        <td class="cell-numeric" style="color: #34d399; font-weight: 700;">${formatCurrency(d.amount)}</td>
        <td>${badgeHtml}</td>
        <td>
          <span class="badge badge-verified">${d.status || 'VERIFIED'}</span>
          <div style="font-size: 0.7rem; color: var(--text-subtle); margin-top: 2px;">Data Quality: ${d.quality_score || 100}/100</div>
        </td>
        <td class="cell-numeric">
          ${parityDisplay}
          ${wealthSubtext}
        </td>
        <td>
          <button type="button" class="btn-table-action" onclick="showCitationDetails('${d.id}')">
            📑 Citations
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export function updateSortHeaderVisuals() {
  const { sortBy, sortOrder } = state.donationFilters;
  document.querySelectorAll('#donationsTableHeader th.th-sortable').forEach(th => {
    const col = th.dataset.sort;
    const arrow = th.querySelector('.sort-arrow');
    if (col === sortBy) {
      th.classList.add('active-sort');
      if (arrow) arrow.textContent = sortOrder === 'asc' ? '▲' : '▼';
    } else {
      th.classList.remove('active-sort');
      if (arrow) arrow.textContent = '';
    }
  });
}

export function handleDonationSortClick(column) {
  const df = state.donationFilters;
  if (df.sortBy === column) {
    df.sortOrder = df.sortOrder === 'asc' ? 'desc' : 'asc';
  } else {
    df.sortBy = column;
    df.sortOrder = (column === 'billionaire' || column === 'status') ? 'asc' : 'desc';
  }
  df.offset = 0;
  updateSortHeaderVisuals();
  loadDonations();
}

export function openDonationFilterPopover(filterType) {
  const popover = document.getElementById('popoverDonationFilter');
  const title = document.getElementById('popoverDFilterTitle');
  const options = document.getElementById('popoverDFilterOptions');
  if (!popover || !title || !options) return;

  popover.style.display = 'block';

  if (filterType === 'donor') {
    title.textContent = 'Filter by Tracked Donor';
    const billionaires = state.calculator?.allBillionaires || [];
    options.innerHTML = `
      <button type="button" class="pf-option-btn" onclick="applyDonationFilter('billionaireId', 'all')">All Donors</button>
    ` + billionaires.map(b => `
      <button type="button" class="pf-option-btn" onclick="applyDonationFilter('billionaireId', '${b.id || b.person_id}')">${b.canonical_name}</button>
    `).join('');
  } else if (filterType === 'fundingSource') {
    title.textContent = 'Filter by Funding Source';
    options.innerHTML = DF_OPTIONS.fundingSource.map(f => `
      <button type="button" class="pf-option-btn" onclick="applyDonationFilter('fundingSourceType', '${f.val}')">${f.label}</button>
    `).join('');
  } else if (filterType === 'status') {
    title.textContent = 'Filter by Verification Status';
    options.innerHTML = DF_OPTIONS.status.map(s => `
      <button type="button" class="pf-option-btn" onclick="applyDonationFilter('status', '${s.val}')">${s.label}</button>
    `).join('');
  } else if (filterType === 'amount') {
    title.textContent = 'Filter by Amount Range';
    options.innerHTML = DF_OPTIONS.amount.map(a => `
      <button type="button" class="pf-option-btn" onclick="applyDonationFilter('amountRange', '${a.val}')">${a.label}</button>
    `).join('');
  } else if (filterType === 'sourceType') {
    title.textContent = 'Filter by Source Tier';
    options.innerHTML = DF_OPTIONS.sourceType.map(s => `
      <button type="button" class="pf-option-btn" onclick="applyDonationFilter('sourceType', '${s.val}')">${s.label}</button>
    `).join('');
  } else if (filterType === 'sortBy') {
    title.textContent = 'Sort Donations';
    options.innerHTML = DF_OPTIONS.sortBy.map(s => `
      <button type="button" class="pf-option-btn" onclick="applyDonationSort('${s.val}')">${s.label}</button>
    `).join('');
  }
}

export function applyDonationFilter(filterType, val) {
  state.donationFilters[filterType] = val;
  state.donationFilters.offset = 0;
  const popover = document.getElementById('popoverDonationFilter');
  if (popover) popover.style.display = 'none';
  renderDonationActiveChips();
  loadDonations();
}

export function applyDonationSort(combined) {
  const [sortBy, sortOrder] = combined.split('_');
  state.donationFilters.sortBy = sortBy;
  state.donationFilters.sortOrder = sortOrder;
  state.donationFilters.offset = 0;
  const popover = document.getElementById('popoverDonationFilter');
  if (popover) popover.style.display = 'none';
  renderDonationActiveChips();
  updateSortHeaderVisuals();
  loadDonations();
}

export async function showCitationDetails(donationId) {
  try {
    const data = await fetchCitations(donationId);
    const sources = data.sources || [];
    const content = document.getElementById('citationModalContent');
    if (content) {
      if (sources.length === 0) {
        content.innerHTML = '<p style="color: var(--text-muted); font-size: 0.84rem;">No primary regulatory citation registered for this transaction.</p>';
      } else {
        content.innerHTML = sources.map(s => `
          <div style="background: var(--bg-subcard); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px;">
            <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">${s.publisher || 'Official Regulatory Registry'}</div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 6px;">${s.title || 'Filing Citation'}</div>
            ${s.url ? `<a href="${s.url}" target="_blank" rel="noopener" class="btn-table-action">Open Primary Source ↗</a>` : ''}
          </div>
        `).join('');
      }
    }
    const modal = document.getElementById('citationDetailsModal');
    if (modal) modal.style.display = 'flex';
  } catch (err) {
    console.error('Error fetching citations:', err);
  }
}
