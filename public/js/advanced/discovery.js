/**
 * Advanced Mode Discovery & Verification Audit Module
 * Handles news-based donation signal discovery and audit checklist tooling.
 */

import { state } from './state.js';
import { fetchDiscovery } from './api.js';
import { computeDataQualityScore, EIGHT_QUESTIONS } from '../data-quality.js';

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').trim();
}

export async function loadDiscoveryTab() {
  // Re-use calculator people cache if available to prevent duplicate network calls
  const cachedPeople = state.calculator?.allBillionaires || [];
}

export async function runDiscoveryScan() {
  const isFullPipeline = arguments[0] === true;
  const box = document.getElementById('discoveryProgressBox');
  const container = document.getElementById('discoveryResultsContainer');
  if (box) {
    box.style.display = 'block';
    box.textContent = isFullPipeline 
      ? 'Running full news ingestion pipeline across Google News RSS feeds...' 
      : 'Querying Google News RSS for public donation disclosures...';
  }

  try {
    const limit = isFullPipeline ? 15 : 10;
    const data = await fetchDiscovery(limit);
    if (box) box.style.display = 'none';

    const candidates = data.candidates || [];
    if (candidates.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.84rem; padding: 20px 0; text-align: center;">No new donation announcements detected in active news feeds.</p>';
      return;
    }

    container.innerHTML = candidates.map((c, i) => {
      const headline = stripHtml(c.headline || c.article_title || 'Philanthropic Announcement');
      const snippet = stripHtml(c.snippet || '');
      const url = c.url || c.article_url || '#';
      const publisher = stripHtml(c.source_publisher || 'Google News');
      const date = c.published_at || c.published_date || 'Recent';
      const donorName = c.detected_donor?.name || 'Unspecified Donor';
      const amountStr = c.formatted_amount || '';
      const recipient = c.detected_recipient || '';

      return `
        <div style="background: var(--bg-subcard); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 260px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap;">
              <span class="badge badge-unverified" style="font-size: 0.68rem;">🔍 Unverified Candidate</span>
              ${amountStr ? `<span class="badge badge-personal" style="font-size: 0.68rem; font-weight: 700;">${amountStr}</span>` : ''}
              <span style="font-size: 0.76rem; color: var(--accent-gold); font-weight: 600;">${donorName}</span>
            </div>
            <div style="font-weight: 700; color: var(--text-main); font-size: 0.92rem; margin-bottom: 4px;">
              ${headline}
            </div>
            ${snippet ? `<p style="font-size: 0.78rem; color: var(--text-muted); margin: 0 0 6px; line-height: 1.4;">${snippet}</p>` : ''}
            <div style="font-size: 0.74rem; color: var(--text-muted);">
              Publisher: <strong>${publisher}</strong> · Date: ${date} ${recipient ? `· Recipient: ${recipient}` : ''}
            </div>
          </div>
          <div>
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
              Read Article ↗
            </a>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    if (box) box.style.display = 'none';
    container.innerHTML = `<div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); color: #ef4444; padding: 16px;">Scan request failed: ${err.message}</div>`;
  }
}

export const SAMPLE_DATA = {
  clean: {
    donor_person_name: "Warren Buffett",
    amount: 500000000,
    currency: "USD",
    donation_date: "2018-05-01",
    recipient_name: "Bill & Melinda Gates Foundation",
    funding_source_type: "PERSONAL_FUNDS_CONFIRMED",
    description: "Annual Berkshire Hathaway Class B share contribution directly from personal holdings.",
    status: "VERIFIED",
    source_url: "https://www.sec.gov/edgar/searchedgar/companysearch",
    source_publisher: "U.S. Securities and Exchange Commission (SEC)"
  },
  discrepant: {
    donor_person_name: "Tech Founder",
    amount: 100000000,
    currency: "USD",
    donation_date: "2023-09-15",
    recipient_name: "Community Health Initiative",
    funding_source_type: "FOUNDATION_DISBURSEMENT",
    description: "Multi-source reported gift with reported figures ranging from $75M to $120M.",
    status: "PARTIALLY_VERIFIED",
    has_discrepancy: true,
    source_publisher: "Various Press Reports"
  },
  temporal: {
    donor_person_name: "Finance Executive",
    amount: 25000000,
    currency: "USD",
    donation_date: "2018-03-10",
    wealth_snapshot_date: "2026-01-15",
    recipient_name: "Urban Charter School Network",
    funding_source_type: "UNKNOWN_SOURCE",
    description: "Temporal failure: gift made in 2018 evaluated against modern 2026 peak net worth valuation.",
    status: "UNVERIFIED"
  }
};

export function setupMethodologyLab() {
  const input = document.getElementById('qualityTesterInput');
  const resultsContainer = document.getElementById('qualityTesterResults');

  document.getElementById('btnLoadCleanSample')?.addEventListener('click', () => {
    if (input) input.value = JSON.stringify(SAMPLE_DATA.clean, null, 2);
    hideAuditHelpTooltip();
  });

  document.getElementById('btnLoadDiscrepantSample')?.addEventListener('click', () => {
    if (input) input.value = JSON.stringify(SAMPLE_DATA.discrepant, null, 2);
    hideAuditHelpTooltip();
  });

  document.getElementById('btnLoadTemporalFailSample')?.addEventListener('click', () => {
    if (input) input.value = JSON.stringify(SAMPLE_DATA.temporal, null, 2);
    hideAuditHelpTooltip();
  });

  document.getElementById('btnRunQualityAudit')?.addEventListener('click', () => {
    const raw = (input?.value || '').trim();
    if (!raw) {
      showAuditHelpTooltip();
      return;
    }

    hideAuditHelpTooltip();
    try {
      const parsed = JSON.parse(raw);
      const audit = computeDataQualityScore(parsed);
      renderQualityAuditResults(audit, parsed);
    } catch (err) {
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div style="color: #ef4444; font-size: 0.85rem; padding: 16px;">
            <strong>⚠️ Invalid JSON format:</strong>
            <p style="margin: 4px 0 0; font-family: var(--font-mono); font-size: 0.78rem;">${err.message}</p>
          </div>
        `;
      }
    }
  });
}

function showAuditHelpTooltip() {
  let tip = document.getElementById('auditHelpTooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.id = 'auditHelpTooltip';
    tip.style.cssText = `
      position: absolute;
      bottom: calc(100% + 10px);
      left: 0;
      right: 0;
      background: #0f172a;
      border: 1px solid #f59e0b;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      border-radius: 8px;
      padding: 14px 16px;
      color: #f8fafc;
      font-size: 0.82rem;
      line-height: 1.5;
      z-index: 1000;
      animation: fadeIn 0.2s ease-in-out;
    `;
    const btn = document.getElementById('btnRunQualityAudit');
    if (btn && btn.parentElement) {
      btn.parentElement.style.position = 'relative';
      btn.parentElement.appendChild(tip);
    }
  }

  tip.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px;">
      <strong style="color: #fbbf24; font-size: 0.86rem;">💡 How to Use the Data Quality Auditor:</strong>
      <button type="button" onclick="document.getElementById('auditHelpTooltip').style.display='none'" style="background: none; border: none; color: #94a3b8; font-size: 1rem; cursor: pointer; line-height: 1;">✕</button>
    </div>
    <ol style="margin: 0; padding-left: 18px; color: #cbd5e1;">
      <li>Click one of the 3 pre-load buttons above (<strong>Load Clean Verified</strong>, <strong>Load Discrepant Sources</strong>, or <strong>Load 2018 vs 2026 Inconsistency</strong>) to prefill sample data.</li>
      <li>Or paste your own donation record JSON directly into the box.</li>
      <li>Click <strong>'Audit Record Quality & Consistency'</strong> to evaluate its 0–100 Data Quality Score and 8-question checklist!</li>
    </ol>
  `;
  tip.style.display = 'block';
}

function hideAuditHelpTooltip() {
  const tip = document.getElementById('auditHelpTooltip');
  if (tip) tip.style.display = 'none';
}

function renderQualityAuditResults(audit, parsed) {
  const container = document.getElementById('qualityTesterResults');
  if (!container) return;

  const eq = audit.eight_questions || {};
  const answers = eq.answers || {};

  const qKeys = [
    { k: 'who', l: 'WHO?', desc: 'Donor Identity' },
    { k: 'what', l: 'WHAT?', desc: 'Gift Nature/Cause' },
    { k: 'when', l: 'WHEN?', desc: 'Transaction Date' },
    { k: 'how_much', l: 'HOW MUCH?', desc: 'Quantified Amount' },
    { k: 'from_whom', l: 'FROM WHOM?', desc: 'Funding Vehicle' },
    { k: 'to_whom', l: 'TO WHOM?', desc: 'Recipient Org/Cause' },
    { k: 'source', l: 'SOURCE?', desc: 'Verifiable Citation' },
    { k: 'how_certain', l: 'HOW CERTAIN?', desc: 'Verification Tier' }
  ];

  container.innerHTML = `
    <div style="width: 100%; text-align: left;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px;">
        <div>
          <span style="font-size: 0.74rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700;">Data Quality Score</span>
          <div style="font-family: var(--font-mono); font-size: 1.8rem; font-weight: 800; color: ${audit.score >= 80 ? '#34d399' : (audit.score >= 50 ? '#fbbf24' : '#ef4444')};">
            ${audit.score}<span style="font-size: 1rem; color: var(--text-muted);">/100</span>
          </div>
        </div>
        <div style="text-align: right;">
          <span class="badge" style="background: rgba(${audit.score >= 80 ? '52, 211, 153' : (audit.score >= 50 ? '251, 191, 36' : '239, 68, 68')}, 0.15); color: ${audit.score >= 80 ? '#34d399' : (audit.score >= 50 ? '#fbbf24' : '#ef4444')}; font-size: 0.85rem; font-weight: 700; padding: 4px 10px;">
            Grade ${audit.grade}: ${audit.status_label}
          </span>
          <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">
            ${eq.answered_count} of 8 Questions Answered
          </div>
        </div>
      </div>

      <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px;">
        8-Question Verification Rubric:
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
        ${qKeys.map(q => {
          const has = Boolean(answers[q.k]);
          return `
            <div style="background: var(--bg-subcard); border: 1px solid ${has ? 'rgba(52, 211, 153, 0.25)' : 'rgba(239, 68, 68, 0.25)'}; border-radius: 6px; padding: 6px 8px; font-size: 0.72rem; display: flex; align-items: center; gap: 6px;">
              <span>${has ? '✅' : '❌'}</span>
              <div>
                <strong>${q.l}</strong> <span style="color: var(--text-muted); font-size: 0.68rem;">(${q.desc})</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      ${parsed.has_discrepancy ? `
        <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 8px 10px; font-size: 0.74rem; color: #fbbf24;">
          ⚠️ <strong>Discrepancy Alert:</strong> Multi-source disagreement flagged. Maximum Grade D applied.
        </div>
      ` : ''}

      ${parsed.wealth_snapshot_date && parsed.donation_date && Math.abs(new Date(parsed.wealth_snapshot_date) - new Date(parsed.donation_date)) > 365 * 24 * 3600 * 1000 ? `
        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; padding: 8px 10px; font-size: 0.74rem; color: #f87171; margin-top: 6px;">
          ❌ <strong>Temporal Inconsistency:</strong> Donation date (${parsed.donation_date}) and valuation snapshot (${parsed.wealth_snapshot_date}) are over 1 year apart without confidence tier adjustment.
        </div>
      ` : ''}
    </div>
  `;
}

export function loadMethodologyTab() {
  // Setup quality audit demo buttons
}

