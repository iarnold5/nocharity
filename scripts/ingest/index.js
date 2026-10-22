/**
 * NoCharity Ingestion Framework — Ingest Sources Index
 */

import * as secForm4 from './source-sec-form4.js';
import * as givingPledge from './source-giving-pledge.js';
import * as seedPhase13 from '../seed/seed-phase13.js';
import * as expansionData from './expansion-data.js';
import * as forbesBillionaires from './forbes-billionaires.js';

export const REGISTERED_SOURCES = Object.freeze({
  'sec-form4': secForm4,
  'giving-pledge': givingPledge,
  'seed-phase13': seedPhase13,
  'expansion-data': expansionData,
  'forbes-billionaires': forbesBillionaires
});

/**
 * Loads records from registered sources
 */
export async function loadSourceRecords(requestedSource = 'all') {
  const sourcesToRun = [];

  if (!requestedSource || requestedSource === 'all') {
    sourcesToRun.push(...Object.values(REGISTERED_SOURCES));
  } else if (REGISTERED_SOURCES[requestedSource]) {
    sourcesToRun.push(REGISTERED_SOURCES[requestedSource]);
  } else {
    throw new Error(`Unknown ingest source: "${requestedSource}". Available: ${Object.keys(REGISTERED_SOURCES).join(', ')}, all`);
  }

  const aggregated = {
    people: [],
    organizations: [],
    sources: [],
    wealthSnapshots: [],
    donations: [],
    donationSources: [],
    personOrganizations: []
  };

  for (const src of sourcesToRun) {
    const data = await src.fetchRecords();
    aggregated.people.push(...(data.people || []));
    aggregated.organizations.push(...(data.organizations || []));
    aggregated.sources.push(...(data.sources || []));
    aggregated.wealthSnapshots.push(...(data.wealthSnapshots || []));
    aggregated.donations.push(...(data.donations || []));
    if (data.donationSources) aggregated.donationSources.push(...data.donationSources);
    if (data.personOrganizations) aggregated.personOrganizations.push(...data.personOrganizations);
  }

  return aggregated;
}
