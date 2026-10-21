/**
 * NoCharity Ingestion Framework — Organizations Normalizer
 */

import { createNormalizedOrganization, cleanEin, cleanCik, cleanUrl } from './schemas.js';

export function normalizeOrganization(raw) {
  if (!raw) return null;

  const legalName = String(raw.legal_name || raw.legalName || raw.name || '').trim();
  if (!legalName) return null;

  const displayName = raw.display_name || raw.displayName || legalName;

  // Infer organization type if omitted or unknown
  let orgType = raw.organization_type || raw.organizationType || raw.type;
  if (!orgType || orgType === 'OTHER') {
    const lower = legalName.toLowerCase();
    if (lower.includes('foundation') || lower.includes('endowment') || lower.includes('trust')) {
      orgType = 'FOUNDATION';
    } else if (lower.includes('corp') || lower.includes('inc') || lower.includes('llc') || lower.includes('company')) {
      orgType = 'COMPANY';
    } else if (lower.includes('fund') && lower.includes('advised')) {
      orgType = 'DAF';
    } else if (lower.includes('charity') || lower.includes('aid') || lower.includes('red cross')) {
      orgType = 'CHARITY';
    } else if (lower.includes('pac') || lower.includes('committee') || lower.includes('campaign')) {
      orgType = 'POLITICAL_COMMITTEE';
    } else {
      orgType = 'CHARITY';
    }
  }

  return createNormalizedOrganization({
    legal_name: legalName,
    display_name: displayName,
    organization_type: orgType,
    ein: raw.ein || raw.tax_id || null,
    cik: raw.cik || null,
    country: raw.country || null,
    website: raw.website || raw.url || null,
    description: raw.description || null
  });
}
