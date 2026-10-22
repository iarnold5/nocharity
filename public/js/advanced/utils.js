/**
 * Advanced Mode Shared Formatting & Badge Utilities
 * Pure presentation helpers with zero business logic mutation.
 */

export function formatCurrency(val, currency = '$') {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  const num = Number(val);
  if (num >= 1e12) return `${currency}${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${currency}${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${currency}${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${currency}${(num / 1e3).toFixed(1)}K`;
  return `${currency}${num.toLocaleString()}`;
}

export function formatPercent(val) {
  if (val === null || val === undefined || isNaN(val)) return 'N/A';
  return `${Number(val).toFixed(2)}%`;
}

export function formatHeadlineAmount(val, currency = '$') {
  if (val === null || val === undefined || isNaN(val)) return 'Unavailable';
  const abs = Math.abs(Number(val));
  if (abs >= 1_000_000_000) {
    const b = abs / 1_000_000_000;
    return `${currency}${b % 1 === 0 ? b.toFixed(0) : b.toFixed(1)} billion`;
  }
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${currency}${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)} million`;
  }
  if (abs >= 1_000) {
    return `${currency}${Math.round(abs).toLocaleString()}`;
  }
  return `${currency}${abs.toLocaleString()}`;
}

export function getFundingBadgeClass(fType) {
  if (fType === 'PERSONAL_DIRECT' || fType === 'PERSONAL_FUNDS_CONFIRMED') return 'badge-personal';
  if (fType === 'FOUNDATION') return 'badge-foundation';
  if (fType === 'CORPORATE') return 'badge-corporate';
  if (fType === 'DAF') return 'badge-daf';
  if (fType === 'PLEDGE') return 'badge-pledge';
  return 'badge-unverified';
}

export function formatFundingTypeLabel(fType) {
  if (fType === 'PERSONAL_DIRECT') return '👤 Direct Gift';
  if (fType === 'PERSONAL_FUNDS_CONFIRMED') return '🛡️ Personal Funds (Verified)';
  if (fType === 'FOUNDATION') return '🏛️ Foundation Grant';
  if (fType === 'CORPORATE') return '🏢 Corporate Gift';
  if (fType === 'DAF') return '📦 DAF Transfer';
  if (fType === 'PLEDGE') return '✍️ Non-binding Pledge';
  return 'Unattributed';
}

export function getDonationBadgeHtml(d) {
  const fType = d.funding_source_type;
  let badgeLabel = 'PERSONAL';
  let badgeClass = 'badge-personal';

  if (fType === 'PERSONAL_DIRECT' || fType === 'PERSONAL_FUNDS_CONFIRMED') {
    badgeLabel = 'PERSONAL';
    badgeClass = 'badge-personal';
  } else if (fType === 'FOUNDATION') {
    badgeLabel = 'FOUNDATION';
    badgeClass = 'badge-foundation';
  } else if (fType === 'CORPORATE') {
    badgeLabel = 'CORPORATE';
    badgeClass = 'badge-corporate';
  } else if (fType === 'DAF') {
    badgeLabel = 'DAF';
    badgeClass = 'badge-daf';
  } else if (fType === 'PLEDGE') {
    badgeLabel = 'PLEDGE';
    badgeClass = 'badge-pledge';
  } else {
    badgeLabel = 'UNKNOWN';
    badgeClass = 'badge-unverified';
  }

  return `<span class="badge ${badgeClass}">${badgeLabel}</span>`;
}

export function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderPaginationButtons(containerId, currentPage, totalPages, onPageClickFnName) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!totalPages || totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  container.innerHTML = pages.map(p => {
    if (p === '...') return `<span class="btn-page-ellipsis">…</span>`;
    const isActive = p === currentPage;
    return `<button type="button" class="btn-page-num ${isActive ? 'active' : ''}" onclick="${onPageClickFnName}(${p})" title="Page ${p}" aria-label="Page ${p}" ${isActive ? 'aria-current="page"' : ''}>${p}</button>`;
  }).join('');
}
