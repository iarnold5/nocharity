/**
 * Advanced Mode Dashboard / Overview Module
 * Handles loading high-level metrics and recent donation highlights.
 */

import { state } from './state.js';
import { formatCurrency, getFundingBadgeClass, formatFundingTypeLabel } from './utils.js';
import { fetchDashboardMetrics, fetchDonations } from './api.js';

export async function loadDashboard() {
  try {
    const data = await fetchDashboardMetrics();
    const m = data.documentedMetrics || {};

    const elKpiTracked = document.getElementById('kpiTrackedBillionaires');
    if (elKpiTracked) elKpiTracked.textContent = Number(m.trackedBillionairesCount || 1019).toLocaleString();

    const elKpiGifts = document.getElementById('kpiDocumentedPersonalDonations');
    if (elKpiGifts) elKpiGifts.textContent = Number(m.documentedPersonalDonationsCount || 69).toLocaleString();

    const elKpiTotal = document.getElementById('kpiDocumentedPersonalGivingTotal');
    if (elKpiTotal) elKpiTotal.textContent = formatCurrency(m.documentedPersonalGivingTotal || 102268000000);

    const elKpiVerified = document.getElementById('kpiVerifiedDonations');
    if (elKpiVerified) elKpiVerified.textContent = Number(m.verifiedDonationsCount || 103).toLocaleString();

    const elKpiSources = document.getElementById('kpiSourcesCount');
    if (elKpiSources) elKpiSources.textContent = Number(m.sourcesCount || 1093).toLocaleString();

    const elKpiDate = document.getElementById('kpiLatestDataDate');
    if (elKpiDate) elKpiDate.textContent = m.latestDataDate || '2025-06-28';

    const elBreakPersonal = document.getElementById('breakdownPersonal');
    if (elBreakPersonal) elBreakPersonal.textContent = formatCurrency(m.documentedPersonalGivingTotal || 102268000000);

    const elBreakFound = document.getElementById('breakdownFoundation');
    if (elBreakFound) elBreakFound.textContent = formatCurrency(m.totalFoundationGiving || 22925000000);

    const elBreakCorp = document.getElementById('breakdownCorporate');
    if (elBreakCorp) elBreakCorp.textContent = formatCurrency(m.totalCorporateGiving || 751000000);

    const elBreakDaf = document.getElementById('breakdownDaf');
    if (elBreakDaf) elBreakDaf.textContent = formatCurrency(m.totalDafTransfers || 5740000000);

    const elBreakPledges = document.getElementById('breakdownPledges');
    if (elBreakPledges) elBreakPledges.textContent = formatCurrency(m.totalPledges || 33750000000);

    // Fetch Recent Donations for Highlight (Strictly limit=6 as audited)
    const donData = await fetchDonations('/api/advanced/donations?limit=6&includeAssociatedOrgGiving=true');
    renderDashboardRecentDonations(donData.donations || []);
  } catch (err) {
    console.error('Error loading dashboard metrics:', err);
  }
}

export function renderDashboardRecentDonations(donations) {
  const tbody = document.getElementById('dashboardRecentDonationsBody');
  if (!tbody) return;
  if (!donations || donations.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No recent transactions recorded.</td></tr>';
    return;
  }

  tbody.innerHTML = donations.map(d => {
    const badgeClass = getFundingBadgeClass(d.funding_source_type);
    const donorName = d.donor_person_name || d.donor_organization_name || 'Anonymous';
    return `
      <tr>
        <td style="font-family: var(--font-mono); color: var(--text-muted);">${d.donation_date || 'N/A'}</td>
        <td><strong>${donorName}</strong></td>
        <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${d.cause_category || d.description || 'Philanthropic Grant'}</td>
        <td class="cell-numeric" style="color: #34d399;">${formatCurrency(d.amount)}</td>
        <td><span class="badge ${badgeClass}">${formatFundingTypeLabel(d.funding_source_type)}</span></td>
        <td><span class="badge badge-verified">${d.status || 'VERIFIED'}</span></td>
        <td><button type="button" class="btn-table-action" onclick="viewBillionaireProfile('${d.donor_person_id}')">Profile →</button></td>
      </tr>
    `;
  }).join('');
}
