/**
 * NoCharity Ingestion Framework — Wealth Snapshots Normalizer
 */

import { createNormalizedWealthSnapshot } from './schemas.js';

export function normalizeWealthSnapshot(raw) {
  if (!raw) return null;

  const rawDate = raw.snapshot_date || raw.snapshotDate || raw.date;
  if (!rawDate) return null;

  const snapshotDate = String(rawDate).trim().split('T')[0];

  let netWorth = raw.net_worth !== undefined ? raw.net_worth : raw.netWorth;
  if (typeof netWorth === 'string') {
    // Parse strings like "$145 Billion", "145B", etc.
    const match = netWorth.match(/([\d.]+)\s*(billion|million|b|m)?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || '').toLowerCase();
      if (unit.startsWith('b')) {
        netWorth = val * 1_000_000_000;
      } else if (unit.startsWith('m')) {
        netWorth = val * 1_000_000;
      } else {
        netWorth = val;
      }
    } else {
      netWorth = parseFloat(netWorth.replace(/[^\d.-]/g, ''));
    }
  }

  const numericNetWorth = Number(netWorth);
  if (!isFinite(numericNetWorth) || numericNetWorth <= 0) return null;

  return createNormalizedWealthSnapshot({
    person_name: raw.person_name || raw.personName || raw.person || null,
    person_id: raw.person_id || raw.personId || null,
    snapshot_date: snapshotDate,
    net_worth: numericNetWorth,
    currency: raw.currency || 'USD',
    source_url: raw.source_url || raw.sourceUrl || raw.url || null,
    source_id: raw.source_id || raw.sourceId || null,
    source_name: raw.source_name || raw.sourceName || raw.source || 'Historical Wealth Index',
    confidence: raw.confidence || 'HIGH'
  });
}
