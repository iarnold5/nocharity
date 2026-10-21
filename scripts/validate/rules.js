/**
 * NoCharity Ingestion Framework — Validation Rules (Phase 4)
 * 
 * Enforces strict record validation prior to deduplication and database upsert.
 */

import {
  ENTITY_TYPES,
  ORGANIZATION_TYPES,
  SOURCE_TIERS,
  FUNDING_SOURCE_TYPES,
  VERIFICATION_STATUSES,
  WEALTH_CONFIDENCE_LEVELS
} from '../normalize/schemas.js';

export function isValidDateFormat(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1800 || year > 2050) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

export function validatePerson(record) {
  const errors = [];
  if (!record) return { isValid: false, errors: ['Record is null or undefined'] };

  if (!record.canonical_name || typeof record.canonical_name !== 'string' || !record.canonical_name.trim()) {
    errors.push('canonical_name is required and must be a non-empty string');
  }

  if (record.birth_date && !isValidDateFormat(record.birth_date)) {
    errors.push(`Invalid birth_date format: "${record.birth_date}". Expected YYYY-MM-DD`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateOrganization(record) {
  const errors = [];
  if (!record) return { isValid: false, errors: ['Record is null or undefined'] };

  if (!record.legal_name || typeof record.legal_name !== 'string' || !record.legal_name.trim()) {
    errors.push('legal_name is required and must be a non-empty string');
  }

  if (record.organization_type && !ORGANIZATION_TYPES.includes(record.organization_type)) {
    errors.push(`Invalid organization_type: "${record.organization_type}". Allowed: ${ORGANIZATION_TYPES.join(', ')}`);
  }

  if (record.ein && !/^\d{2}-\d{7}$/.test(record.ein)) {
    errors.push(`Invalid EIN format: "${record.ein}". Expected XX-XXXXXXX`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateSource(record) {
  const errors = [];
  if (!record) return { isValid: false, errors: ['Record is null or undefined'] };

  if (!record.url || typeof record.url !== 'string') {
    errors.push('url is required');
  } else {
    try {
      new URL(record.url);
    } catch {
      errors.push(`Invalid URL format: "${record.url}"`);
    }
  }

  if (!record.publisher || typeof record.publisher !== 'string' || !record.publisher.trim()) {
    errors.push('publisher is required and must be a non-empty string');
  }

  if (record.source_type && !SOURCE_TIERS.includes(record.source_type)) {
    errors.push(`Invalid source_type: "${record.source_type}". Allowed: ${SOURCE_TIERS.join(', ')}`);
  }

  if (record.published_at && !isValidDateFormat(record.published_at)) {
    errors.push(`Invalid published_at format: "${record.published_at}". Expected YYYY-MM-DD`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateWealthSnapshot(record) {
  const errors = [];
  if (!record) return { isValid: false, errors: ['Record is null or undefined'] };

  if (!record.person_name && !record.person_id) {
    errors.push('Either person_name or person_id is required to link wealth snapshot');
  }

  if (!record.snapshot_date || !isValidDateFormat(record.snapshot_date)) {
    errors.push(`Invalid or missing snapshot_date: "${record.snapshot_date}". Expected YYYY-MM-DD`);
  }

  if (record.net_worth === undefined || record.net_worth === null || !isFinite(Number(record.net_worth)) || Number(record.net_worth) <= 0) {
    errors.push(`net_worth must be a finite positive number. Received: ${record.net_worth}`);
  }

  if (record.confidence && !WEALTH_CONFIDENCE_LEVELS.includes(record.confidence)) {
    errors.push(`Invalid confidence: "${record.confidence}". Allowed: ${WEALTH_CONFIDENCE_LEVELS.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validateDonation(record) {
  const errors = [];
  if (!record) return { isValid: false, errors: ['Record is null or undefined'] };

  const hasDonor = Boolean(
    record.donor_person_name ||
    record.donor_person_id ||
    record.donor_organization_name ||
    record.donor_organization_id
  );
  if (!hasDonor) {
    errors.push('Donation must specify at least one donor (donor_person_name, donor_person_id, donor_organization_name, or donor_organization_id)');
  }

  if (!record.donation_date || !isValidDateFormat(record.donation_date)) {
    errors.push(`Invalid or missing donation_date: "${record.donation_date}". Expected YYYY-MM-DD`);
  }

  if (record.amount === undefined || record.amount === null || !isFinite(Number(record.amount)) || Number(record.amount) <= 0) {
    errors.push(`amount must be a finite positive number. Received: ${record.amount}`);
  }

  if (record.funding_source_type && !FUNDING_SOURCE_TYPES.includes(record.funding_source_type)) {
    errors.push(`Invalid funding_source_type: "${record.funding_source_type}". Allowed: ${FUNDING_SOURCE_TYPES.join(', ')}`);
  }

  if (record.status && !VERIFICATION_STATUSES.includes(record.status)) {
    errors.push(`Invalid status: "${record.status}". Allowed: ${VERIFICATION_STATUSES.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}
