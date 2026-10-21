/**
 * NoCharity Ingestion Framework — Validation Index
 */

export * from './rules.js';

import {
  validatePerson,
  validateOrganization,
  validateSource,
  validateWealthSnapshot,
  validateDonation
} from './rules.js';
import { ENTITY_TYPES } from '../normalize/schemas.js';

/**
 * Validates a normalized record based on its entity_type
 */
export function validateRecord(record) {
  if (!record || !record.entity_type) {
    return {
      isValid: false,
      errors: ['Record missing entity_type']
    };
  }

  switch (record.entity_type) {
    case ENTITY_TYPES.PERSON:
      return validatePerson(record);
    case ENTITY_TYPES.ORGANIZATION:
      return validateOrganization(record);
    case ENTITY_TYPES.SOURCE:
      return validateSource(record);
    case ENTITY_TYPES.WEALTH_SNAPSHOT:
      return validateWealthSnapshot(record);
    case ENTITY_TYPES.DONATION:
      return validateDonation(record);
    default:
      return {
        isValid: false,
        errors: [`Unrecognized entity_type: "${record.entity_type}"`]
      };
  }
}
