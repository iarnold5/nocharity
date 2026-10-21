/**
 * NoCharity Ingestion Framework — Sources Normalizer
 */

import { createNormalizedSource, cleanUrl } from './schemas.js';

export function normalizeSource(raw) {
  if (!raw) return null;

  const url = cleanUrl(raw.url || raw.link || raw.source_url);
  if (!url) return null;

  let publisher = String(raw.publisher || raw.source_publisher || raw.source || '').trim();
  let title = String(raw.title || raw.headline || raw.source_title || '').trim();
  let sourceType = raw.source_type || raw.sourceType || raw.tier;

  // Auto-infer publisher from URL if missing
  if (!publisher) {
    try {
      const parsed = new URL(url);
      publisher = parsed.hostname.replace(/^www\./, '');
    } catch {
      publisher = 'Web Source';
    }
  }

  if (!title) {
    title = `${publisher} Citation`;
  }

  // Infer source tier if omitted
  if (!sourceType) {
    const lowerUrl = url.toLowerCase();
    const lowerPub = publisher.toLowerCase();

    if (lowerUrl.includes('sec.gov') || lowerUrl.includes('irs.gov') || lowerUrl.includes('edgar')) {
      sourceType = 'PRIMARY_REGULATORY';
    } else if (lowerPub.includes('pr newswire') || lowerPub.includes('business wire') || lowerUrl.includes('press-release')) {
      sourceType = 'OFFICIAL_PRESS_RELEASE';
    } else if (lowerPub.includes('propublica') || lowerPub.includes('icij') || lowerPub.includes('investigative')) {
      sourceType = 'INVESTIGATIVE_REPORT';
    } else {
      sourceType = 'SECONDARY_NEWS';
    }
  }

  return createNormalizedSource({
    url,
    publisher,
    title,
    source_type: sourceType,
    published_at: raw.published_at || raw.publishedAt || raw.date || null,
    accessed_at: raw.accessed_at || raw.accessedAt || null,
    notes: raw.notes || null
  });
}
