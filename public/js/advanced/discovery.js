/**
 * Advanced Mode Discovery & Verification Audit Module
 * Handles news-based donation signal discovery and audit checklist tooling.
 */

import { state } from './state.js';
import { fetchDiscovery } from './api.js';

export async function loadDiscoveryTab() {
  // Re-use calculator people cache if available to prevent duplicate network calls
  const cachedPeople = state.calculator?.allBillionaires || [];
}

export async function runDiscoveryScan() {
  const box = document.getElementById('discoveryProgressBox');
  const container = document.getElementById('discoveryResultsContainer');
  if (box) {
    box.style.display = 'block';
    box.textContent = 'Querying Google News RSS for verified philanthropic disclosures...';
  }

  try {
    const data = await fetchDiscovery(10);
    if (box) box.style.display = 'none';

    const candidates = data.candidates || [];
    if (candidates.length === 0) {
      container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.84rem; padding: 20px 0; text-align: center;">No new donation announcements detected in active news feeds.</p>';
      return;
    }

    container.innerHTML = candidates.map((c, i) => `
      <div style="background: var(--bg-subcard); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
        <div>
          <div style="font-weight: 700; color: var(--text-main); margin-bottom: 2px;">${c.article_title || 'News Announcement'}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">Publisher: ${c.source_publisher || 'Google News'} · Date: ${c.published_date || 'Recent'}</div>
        </div>
        <a href="${c.article_url}" target="_blank" rel="noopener" class="btn-table-action">Read Article ↗</a>
      </div>
    `).join('');
  } catch (err) {
    if (box) box.style.display = 'none';
    container.innerHTML = `<div style="color: #ef4444; padding: 16px;">Scan request failed: ${err.message}</div>`;
  }
}

export function loadMethodologyTab() {
  // Setup quality audit demo buttons
}
