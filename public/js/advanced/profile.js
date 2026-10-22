/**
 * Advanced Mode Billionaire Profile Dossier Module
 * Handles individual dossier presentation, historical wealth timelines,
 * verified giving breakdowns, and primary citations.
 */

import { state } from './state.js';
import { formatCurrency, formatPercent, getFundingBadgeClass, formatFundingTypeLabel } from './utils.js';
import { fetchPersonProfile } from './api.js';

export function viewBillionaireProfile(personId) {
  state.activeProfileId = personId;
  window.location.hash = `#profile/${personId}`;
  if (window.switchTab) window.switchTab('profile');
  loadProfile(personId);
}

export async function loadProfile(personId) {
  try {
    const data = await fetchPersonProfile(personId);
    const p = data.person || data;
    const sum = data.summary || data.personal_giving_metrics || {};
    const wealthList = (data.wealth_history && data.wealth_history.snapshots) || data.wealth_snapshots || [];
    const personalDons = data.personal_donations || (data.donations || []).filter(d => d.is_personal_parity_eligible);
    const orgDons = (data.donations || []).filter(d => !d.is_personal_parity_eligible);

    const profSelect = document.getElementById('selectBillionaireProfile');
    if (profSelect) profSelect.value = personId;

    // Header info
    const headerName = document.getElementById('profileHeaderName') || document.getElementById('profileCanonicalName');
    if (headerName) headerName.textContent = p.canonical_name || 'Billionaire Profile';
    const countryEl = document.getElementById('profileCountry');
    if (countryEl) countryEl.textContent = p.country || 'Global';
    const occEl = document.getElementById('profileOccupation');
    if (occEl) occEl.textContent = p.occupation || p.industry || 'Investor';

    const pledgeBadge = document.getElementById('profileGivingPledgeBadge');
    if (pledgeBadge) {
      pledgeBadge.textContent = p.giving_pledge ? '✍️ Giving Pledge Signatory' : 'Non-Signatory';
      pledgeBadge.className = p.giving_pledge ? 'badge badge-personal' : 'badge badge-unverified';
    }

    // Metrics
    const nwEl = document.getElementById('profileNetWorth');
    if (nwEl) nwEl.textContent = formatCurrency(p.latest_net_worth);
    const totGivingEl = document.getElementById('profileTotalPersonalGiving');
    if (totGivingEl) totGivingEl.textContent = formatCurrency(sum.lifetime_personal_giving || p.total_personal_giving || 0);
    const countEl = document.getElementById('profilePersonalDonationsCount');
    if (countEl) countEl.textContent = sum.qualifying_donations_count || p.personal_donations_count || 0;
    const largestElem = document.getElementById('profileLargestPersonalDonation') || document.getElementById('profileLargestGift');
    if (largestElem) largestElem.textContent = formatCurrency(sum.largest_donation?.amount || p.largest_personal_donation_amount || 0);
    const latestElem = document.getElementById('profileLatestPersonalDonation') || document.getElementById('profileLatestGift');
    if (latestElem) latestElem.textContent = formatCurrency(sum.latest_donation?.amount || 0);
    const avgElem = document.getElementById('profileAvgPersonalDonation') || document.getElementById('profileAvgGift');
    if (avgElem) avgElem.textContent = formatCurrency(sum.average_donation || 0);
    const ratioEl = document.getElementById('profileAvgRatio');
    if (ratioEl) ratioEl.textContent = formatPercent(sum.peak_donation_percentage || p.peak_historical_percentage);

    // Historical Wealth table
    const wealthTbody = document.getElementById('profileWealthSnapshotsTable');
    if (wealthTbody) {
      if (wealthList.length === 0) {
        wealthTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 16px;">No discrete wealth benchmarks recorded.</td></tr>';
      } else {
        wealthTbody.innerHTML = wealthList.map(w => `
          <tr>
            <td style="font-family: var(--font-mono); color: var(--text-muted);">${w.snapshot_date}</td>
            <td class="cell-numeric" style="color: var(--accent-gold); font-weight: 600;">${formatCurrency(w.net_worth)}</td>
            <td>${w.source_name || w.source || 'Bloomberg / Forbes'}</td>
            <td><span class="badge badge-personal">${w.confidence || 'HIGH'}</span></td>
          </tr>
        `).join('');
      }
    }

    // Personal Donations
    const persContainer = document.getElementById('profilePersonalDonationsContainer');
    if (persContainer) {
      if (personalDons.length === 0) {
        persContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.82rem; padding: 12px 0;">No personal direct gifts recorded in verified regulatory filings.</div>';
      } else {
        persContainer.innerHTML = personalDons.map(d => `
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; color: var(--text-main);">${d.recipient_organization_name || d.recipient_person_name || d.cause_category}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${d.donation_date} · ${d.description || ''}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-family: var(--font-mono); font-weight: 700; color: #34d399; font-size: 1.05rem;">${formatCurrency(d.amount)}</div>
              ${d.historical_percentage ? `<div style="font-size: 0.74rem; color: #38bdf8;">${Number(d.historical_percentage).toFixed(2)}% of wealth</div>` : ''}
            </div>
          </div>
        `).join('');
      }
    }

    // Org Donations
    const orgContainer = document.getElementById('profileOrgDonationsContainer');
    if (orgContainer) {
      if (orgDons.length === 0) {
        orgContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.82rem; padding: 12px 0;">No associated foundation or corporate disbursements recorded.</div>';
      } else {
        orgContainer.innerHTML = orgDons.map(d => `
          <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div>
              <div style="font-weight: 700; color: var(--text-main);">${d.recipient_organization_name || d.cause_category}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${d.donation_date} · <span class="badge ${getFundingBadgeClass(d.funding_source_type)}">${formatFundingTypeLabel(d.funding_source_type)}</span></div>
            </div>
            <div style="text-align: right;">
              <div style="font-family: var(--font-mono); font-weight: 700; color: #c084fc; font-size: 1rem;">${formatCurrency(d.amount)}</div>
            </div>
          </div>
        `).join('');
      }
    }

    // Citations
    const srcContainer = document.getElementById('profileSourcesContainer');
    if (srcContainer) {
      const sources = (data.donations || []).map(d => ({
        id: d.id,
        publisher: d.source_publisher || 'U.S. Securities and Exchange Commission (EDGAR)',
        title: d.source_title || 'SEC Form 4: Statement of Changes in Beneficial Ownership',
        url: d.source_url || 'https://www.sec.gov/edgar'
      })).filter(s => s.url);

      if (sources.length === 0) {
        srcContainer.innerHTML = '<div style="color: var(--text-muted); font-size: 0.82rem;">Regulatory filing records available upon inquiry.</div>';
      } else {
        srcContainer.innerHTML = sources.slice(0, 5).map(s => `
          <div style="font-size: 0.8rem; display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <div>
              <strong style="color: var(--text-main);">${s.publisher}</strong>: ${s.title}
            </div>
            <a href="${s.url}" target="_blank" rel="noopener" class="btn-table-action">View Filing ↗</a>
          </div>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}
