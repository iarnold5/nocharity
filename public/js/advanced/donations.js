/**
 * Advanced Mode Donation Explorer Module
 * Handles progressive multi-field filtering, persistent filter chips,
 * hover-over attribution info, clickable page numbers, citation modals,
 * and audited transaction table rendering.
 */

import { state } from './state.js';
import { formatCurrency, getDonationBadgeHtml, escapeHtml, renderPaginationButtons } from './utils.js';
import { fetchDonations, fetchCitations } from './api.js';

if (!state.donationFilters.activeFilterChips) {
  state.donationFilters.activeFilterChips = [];
}

export function renderDonationActiveChips() {
  const container = document.getElementById('activeDonationChipsRow');
  if (!container) return;

  const chips = state.donationFilters.activeFilterChips || [];

  if (chips.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = chips.map(c => `
    <div class="filter-card-chip" data-id="${c.id}">
      <span class="filter-card-field">${escapeHtml(c.fieldLabel || c.field)}:</span>
      <span class="filter-card-val">"${escapeHtml(c.query)}"</span>
      <button type="button" class="filter-card-remove" onclick="removeDonationFilterChip('${c.id}')" title="Remove this filter" aria-label="Remove filter">✕</button>
    </div>
  `).join('') + `
    <button type="button" class="btn-clear-all-chips" onclick="clearAllDonationFilterChips()">Clear all</button>
  `;
}

export function addDonationFilterFromInput() {
  const select = document.getElementById('selectDonationFilterField');
  const input = document.getElementById('filterDonationSearch');
  if (!input) return;

  const query = input.value.trim();
  if (!query) return;

  const field = select ? select.value : 'donor';
  const fieldLabel = select && select.selectedOptions && select.selectedOptions[0]
    ? select.selectedOptions[0].text.replace(/^[^\w\s]+/, '').trim()
    : field;

  if (!state.donationFilters.activeFilterChips) {
    state.donationFilters.activeFilterChips = [];
  }

  // Prevent duplicate
  const exists = state.donationFilters.activeFilterChips.some(
    c => c.field === field && c.query.toLowerCase() === query.toLowerCase()
  );

  if (!exists) {
    state.donationFilters.activeFilterChips.push({
      id: 'dfc_' + Date.now() + Math.random().toString(36).substring(2, 6),
      field,
      fieldLabel,
      query
    });
  }

  input.value = '';
  const clearBtn = document.getElementById('btnClearDonationSearch');
  if (clearBtn) clearBtn.style.display = 'none';

  state.donationFilters.offset = 0;
  renderDonationActiveChips();
  loadDonations();
}

export function removeDonationFilterChip(id) {
  if (!state.donationFilters.activeFilterChips) return;
  state.donationFilters.activeFilterChips = state.donationFilters.activeFilterChips.filter(c => c.id !== id);
  state.donationFilters.offset = 0;
  renderDonationActiveChips();
  loadDonations();
}

export function clearAllDonationFilterChips() {
  state.donationFilters.activeFilterChips = [];
  state.donationFilters.search = '';
  state.donationFilters.offset = 0;
  const input = document.getElementById('filterDonationSearch');
  if (input) input.value = '';
  const clearBtn = document.getElementById('btnClearDonationSearch');
  if (clearBtn) clearBtn.style.display = 'none';

  renderDonationActiveChips();
  loadDonations();
}

export function removeDonationFilter(key) {
  clearAllDonationFilterChips();
}

export function clearDonationFilters() {
  clearAllDonationFilterChips();
}

export function goToDonationPage(pageNum) {
  const limit = state.donationFilters.limit || 20;
  state.donationFilters.offset = Math.max(0, (pageNum - 1) * limit);
  loadDonations();
}

export function updateDonationOrgToggleTooltip(isChecked) {
  const wrapper = document.getElementById('donationOrgToggleWrapper');
  if (!wrapper) return;

  if (isChecked) {
    wrapper.title = 'All Giving Included: Showing personal gifts plus corporate treasury giving, foundation disbursements, and DAF grants.';
  } else {
    wrapper.title = 'Personal Giving Only: Corporate, Foundation, and DAF grants are excluded so personal billionaire sacrifice is never artificially inflated.';
  }
}

export async function loadDonations() {
  const {
    includeAssociatedOrgGiving,
    sortBy,
    sortOrder,
    limit,
    offset
  } = state.donationFilters;

  const chips = state.donationFilters.activeFilterChips || [];
  const searchInput = document.getElementById('filterDonationSearch');
  const liveQuery = searchInput ? searchInput.value.trim() : '';
  const liveField = document.getElementById('selectDonationFilterField')?.value || 'donor';

  // Fetch larger batch to allow client-side multi-filter refinement
  let url = `/api/advanced/donations?limit=100&offset=0&includeAssociatedOrgGiving=${Boolean(includeAssociatedOrgGiving)}&sortBy=${sortBy}&sortOrder=${sortOrder}`;

  // If a chip matches primary search, pass to server
  chips.forEach(c => {
    if (c.field === 'donor' || c.field === 'all') url += `&search=${encodeURIComponent(c.query)}`;
    if (c.field === 'fundingSource') {
      const q = c.query.toUpperCase();
      if (q.includes('PERSON')) url += `&fundingSourceType=PERSONAL_DIRECT`;
      else if (q.includes('FOUND')) url += `&fundingSourceType=FOUNDATION`;
      else if (q.includes('CORP')) url += `&fundingSourceType=CORPORATE`;
      else if (q.includes('DAF')) url += `&fundingSourceType=DAF`;
    }
    if (c.field === 'status') {
      const q = c.query.toUpperCase();
      if (q.includes('VERIF')) url += `&status=VERIFIED`;
      else if (q.includes('UNVER')) url += `&status=UNVERIFIED`;
    }
  });

  if (liveQuery && !url.includes('&search=')) {
    url += `&search=${encodeURIComponent(liveQuery)}`;
  }

  try {
    const data = await fetchDonations(url);
    let allDonations = data.donations || [];

    // Filter in-memory for all persistent chips to ensure multi-filter precision
    if (chips.length > 0) {
      allDonations = allDonations.filter(d => {
        return chips.every(c => {
          const q = c.query.toLowerCase();
          if (c.field === 'donor') {
            const donor = (d.donor_person_name || d.donor_organization_name || '').toLowerCase();
            return donor.includes(q);
          }
          if (c.field === 'recipient') {
            const recip = (d.recipient_organization_name || d.recipient_person_name || d.cause_category || d.description || '').toLowerCase();
            return recip.includes(q);
          }
          if (c.field === 'fundingSource') {
            const f = (d.funding_source_type || '').toLowerCase();
            return f.includes(q);
          }
          if (c.field === 'status') {
            const st = (d.status || '').toLowerCase();
            return st.includes(q);
          }
          if (c.field === 'amount') {
            const amtStr = formatCurrency(d.amount).toLowerCase();
            return amtStr.includes(q) || String(d.amount).includes(q);
          }
          // 'all'
          const blob = `${d.donor_person_name || ''} ${d.donor_organization_name || ''} ${d.recipient_organization_name || ''} ${d.recipient_person_name || ''} ${d.cause_category || ''} ${d.description || ''}`.toLowerCase();
          return blob.includes(q);
        });
      });
    }

    // Apply live query if present
    if (liveQuery) {
      const q = liveQuery.toLowerCase();
      allDonations = allDonations.filter(d => {
        if (liveField === 'donor') {
          return (d.donor_person_name || d.donor_organization_name || '').toLowerCase().includes(q);
        }
        if (liveField === 'recipient') {
          return (d.recipient_organization_name || d.recipient_person_name || d.cause_category || d.description || '').toLowerCase().includes(q);
        }
        return `${d.donor_person_name || ''} ${d.recipient_organization_name || ''} ${d.cause_category || ''}`.toLowerCase().includes(q);
      });
    }

    const total = (chips.length > 0 || liveQuery) ? allDonations.length : (data.totalCount !== undefined ? data.totalCount : allDonations.length);
    const paginatedDonations = allDonations.slice(offset, offset + limit);

    state.donations = paginatedDonations;
    renderDonationsTable(paginatedDonations);
    updateSortHeaderVisuals();

    // Update pagination status
    const startNum = total > 0 ? offset + 1 : 0;
    const endNum = Math.min(offset + paginatedDonations.length, total);
    const infoEl = document.getElementById('donationPaginationInfo');
    if (infoEl) {
      infoEl.textContent = `Showing ${startNum}-${endNum} of ${Number(total).toLocaleString()} donations`;
    }

    const prevBtn = document.getElementById('btnDonationPrev');
    if (prevBtn) prevBtn.disabled = offset <= 0;

    const nextBtn = document.getElementById('btnDonationNext');
    if (nextBtn) nextBtn.disabled = offset + paginatedDonations.length >= total;

    // Render clickable page numbers
    const totalPages = Math.ceil(total / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    renderPaginationButtons('donationPaginationPages', currentPage, totalPages, 'goToDonationPage');

  } catch (err) {
    console.error('Error loading donations:', err);
    const tbody = document.getElementById('donationExplorerTableBody');
    if (tbody) {
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
}

export function renderDonationsTable(donations) {
  const tbody = document.getElementById('donationExplorerTableBody');
  if (!tbody) return;

  if (!donations || donations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state-cell">
          <div class="empty-state-content">
            <span>🔍</span>
            <h3>No matching donations found</h3>
            <p>No verified gifts match this filter combination.</p>
            <button type="button" class="btn btn-sm btn-outline" onclick="clearAllDonationFilterChips()">Clear filters</button>
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
        <td style="font-family: var(--font-mono); color: var(--text-muted); white-space: nowrap;">${escapeHtml(d.donation_date || 'N/A')}</td>
        <td>
          <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(donorName)}</div>
          ${d.donor_person_id ? `<button type="button" class="btn-table-action" style="font-size: 0.68rem; padding: 1px 6px; margin-top: 2px;" onclick="viewBillionaireProfile('${d.donor_person_id}')">Profile</button>` : ''}
        </td>
        <td style="max-width: 280px;">
          <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(recipientName)}</div>
          <div style="font-size: 0.74rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(d.description || '')}</div>
        </td>
        <td class="cell-numeric" style="color: #34d399; font-weight: 700;">${formatCurrency(d.amount)}</td>
        <td>${badgeHtml}</td>
        <td>
          <span class="badge badge-verified">${escapeHtml(d.status || 'VERIFIED')}</span>
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
  // Legacy popover compatibility stub
}

export function applyDonationFilter(filterType, val) {
  state.donationFilters[filterType] = val;
  state.donationFilters.offset = 0;
  loadDonations();
}

export function applyDonationSort(combined) {
  const [sortBy, sortOrder] = combined.split('_');
  state.donationFilters.sortBy = sortBy;
  state.donationFilters.sortOrder = sortOrder;
  state.donationFilters.offset = 0;
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
            <div style="font-weight: 700; color: var(--text-main); margin-bottom: 4px;">${escapeHtml(s.publisher || 'Official Regulatory Registry')}</div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 6px;">${escapeHtml(s.title || 'Filing Citation')}</div>
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

// Global attachments for inline handlers
window.goToDonationPage = goToDonationPage;
window.removeDonationFilterChip = removeDonationFilterChip;
window.clearAllDonationFilterChips = clearAllDonationFilterChips;
window.addDonationFilterFromInput = addDonationFilterFromInput;
window.updateDonationOrgToggleTooltip = updateDonationOrgToggleTooltip;
