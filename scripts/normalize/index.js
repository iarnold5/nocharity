/**
 * NoCharity Ingestion Framework — Normalization Entrypoint
 */

export * from './schemas.js';
export { normalizePerson } from './people.js';
export { normalizeOrganization } from './organizations.js';
export { normalizeSource } from './sources.js';
export { normalizeWealthSnapshot } from './wealth-snapshots.js';
export { normalizeDonation } from './donations.js';

import { normalizePerson } from './people.js';
import { normalizeOrganization } from './organizations.js';
import { normalizeSource } from './sources.js';
import { normalizeWealthSnapshot } from './wealth-snapshots.js';
import { normalizeDonation } from './donations.js';

/**
 * Normalizes a raw record based on its target entity type
 */
export function normalizeRecord(type, rawData) {
  switch (type.toUpperCase()) {
    case 'PERSON':
    case 'PEOPLE':
      return normalizePerson(rawData);
    case 'ORGANIZATION':
    case 'ORGANIZATIONS':
      return normalizeOrganization(rawData);
    case 'SOURCE':
    case 'SOURCES':
      return normalizeSource(rawData);
    case 'WEALTH_SNAPSHOT':
    case 'WEALTH_SNAPSHOTS':
      return normalizeWealthSnapshot(rawData);
    case 'DONATION':
    case 'DONATIONS':
      return normalizeDonation(rawData);
    default:
      throw new Error(`Unknown entity type for normalization: ${type}`);
  }
}
