/**
 * Advanced Mode Rankings Module
 * Handles multi-dimensional leaderboard queries and table rendering.
 */

import { state } from './state.js';
import { formatCurrency } from './utils.js';
import { fetchRankings } from './api.js';

export async function loadRankings() {
  const metric = state.rankingsMetric;
  const limit = state.rankingsLimit;
  const offset = state.rankingsOffset;

  const metricTitles = {
    largest_donation: 'Largest Documented Personal Donation',
    personal_giving: 'Highest Personal Giving Total',
    giving_ratio: '% of Wealth at Donation',
    average_donation: 'Average Personal Donation',
    most_donations: 'Most Documented Donations',
    giving_per_year: 'Giving Per Year (Historical Span)'
  };

  const metricDescs = {
    largest_donation: 'Ranked by single largest gift verified to originate from individual personal funds.',
    personal_giving: 'Ranked by cumulative verified personal direct giving (excludes foundations).',
    giving_ratio: 'Ranked by highest single gift relative to documented net worth on the date of gift.',
    average_donation: 'Ranked by average size of verified direct personal gifts.',
    most_donations: 'Ranked by total count of verified regulatory filings.',
    giving_per_year: 'Annualized personal giving for individuals with data spanning 2+ active years.'
  };

  document.getElementById('rankingsMetricTitle').textContent = metricTitles[metric] || 'Rankings';
  document.getElementById('rankingsMetricDesc').textContent = metricDescs[metric] || '';

  const thVal = document.getElementById('thRankingsMetricValue');
  if (thVal) {
    if (metric === 'largest_donation') thVal.textContent = 'Largest Personal Gift';
    else if (metric === 'personal_giving') thVal.textContent = 'Total Personal Giving';
    else if (metric === 'giving_ratio') thVal.textContent = 'Peak % of Wealth';
    else if (metric === 'average_donation') thVal.textContent = 'Avg Personal Gift';
    else if (metric === 'most_donations') thVal.textContent = 'Documented Gifts';
    else if (metric === 'giving_per_year') thVal.textContent = 'Annualized Giving';
  }

  try {
    const data = await fetchRankings(metric, limit, offset);
    state.rankings = data.rankings || [];
    renderRankingsTable(state.rankings, metric);

    const total = data.totalCount !== undefined ? data.totalCount : state.rankings.length;
    document.getElementById('rankingsPaginationInfo').textContent = 
      `Showing ${state.rankings.length > 0 ? offset + 1 : 0}-${offset + state.rankings.length} of ${Number(total).toLocaleString()} rankings`;
    document.getElementById('btnRankingsPrev').disabled = offset <= 0;
    document.getElementById('btnRankingsNext').disabled = offset + state.rankings.length >= total;
  } catch (err) {
    console.error('Error loading rankings:', err);
    const tbody = document.getElementById('rankingsTableBody');
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state-cell"><div class="empty-state-content"><span>⚠️</span><h3>No rankings available for this metric</h3><p>Unable to retrieve leaderboard data.</p></div></td></tr>';
  }
}

export function renderRankingsTable(rankings, metric) {
  const tbody = document.getElementById('rankingsTableBody');
  if (!rankings || rankings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state-cell"><div class="empty-state-content"><span>🏆</span><h3>No rankings available for this metric</h3><p>No records currently qualify for this ranking dimension.</p></div></td></tr>';
    return;
  }

  tbody.innerHTML = rankings.map(r => {
    let detailDon = r.largest_personal_donation || {};
    let metricDisplay = 'N/A';
    if (metric === 'largest_donation') {
      const amt = detailDon.amount !== undefined ? detailDon.amount : r.largest_personal_donation?.amount;
      metricDisplay = (amt !== undefined && amt !== null) ? formatCurrency(amt) : '—';
    } else if (metric === 'personal_giving') {
      metricDisplay = r.total_personal_giving ? formatCurrency(r.total_personal_giving) : '—';
    } else if (metric === 'giving_ratio') {
      const pct = r.peak_donation_percentage?.percentage || detailDon.historical_percentage;
      metricDisplay = pct ? Number(pct).toFixed(2) + '%' : '—';
    } else if (metric === 'average_donation') {
      metricDisplay = r.avg_personal_donation ? formatCurrency(r.avg_personal_donation) : '—';
    } else if (metric === 'most_donations') {
      metricDisplay = (r.qualifying_donations_count || 0) + ' gifts';
    } else if (metric === 'giving_per_year') {
      metricDisplay = r.annualized_giving ? formatCurrency(r.annualized_giving) + '/yr' : (r.total_personal_giving ? formatCurrency(r.total_personal_giving) : '—');
    } else if (r.primary_metric_formatted) {
      metricDisplay = r.primary_metric_formatted;
    }
    let recipient = detailDon.recipient || r.occupation || 'Charitable Beneficiaries';
    let donDate = detailDon.donation_date || r.coverage_years || 'Recorded Span';
    let wealthAtDate = detailDon.historical_net_worth ? formatCurrency(detailDon.historical_net_worth) : formatCurrency(r.latest_net_worth);
    let pctAtDate = detailDon.historical_percentage ? `${Number(detailDon.historical_percentage).toFixed(2)}%` : (r.peak_donation_percentage ? `${Number(r.peak_donation_percentage.percentage).toFixed(2)}%` : '—');

    return `
      <tr>
        <td><strong style="color: var(--accent-gold); font-family: var(--font-mono);">#${r.rank}</strong></td>
        <td>
          <strong style="color: var(--text-main);">${r.canonical_name}</strong>
          <div style="font-size: 0.72rem; color: var(--text-muted);">${r.country || 'Global'} · ${r.industry || ''}</div>
        </td>
        <td class="cell-numeric" style="color: #34d399; font-weight: 700;">${metricDisplay}</td>
        <td style="max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${recipient}</td>
        <td style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.78rem;">${donDate}</td>
        <td class="cell-numeric" style="color: var(--text-muted);">${wealthAtDate}</td>
        <td class="cell-numeric" style="color: #38bdf8; font-weight: 600;">${pctAtDate}</td>
        <td>
          <button type="button" class="btn-table-action" onclick="viewBillionaireProfile('${r.person_id}')">Profile →</button>
        </td>
      </tr>
    `;
  }).join('');
}
