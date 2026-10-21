/**
 * NoCharity Ingestion Framework — Seed Data Ingest Source
 * 
 * Ingests baseline entities using the Phase 13 High-Quality Initial Dataset.
 */

import { fetchPhase13Records } from './seed-phase13.js';

export const sourceName = 'seed-data';

export async function fetchRecords() {
  return await fetchPhase13Records();
}
