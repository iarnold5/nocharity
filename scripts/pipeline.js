#!/usr/bin/env node
/**
 * NoCharity Advanced Mode — Data Ingestion CLI Pipeline (Phase 4)
 * 
 * Usage:
 *   npm run ingest -- --dry-run           (Inspect changes without database writes)
 *   npm run ingest                        (Commit changes to live Supabase database)
 *   npm run ingest -- --source sec-form4  (Ingest only a specific source)
 *   npm run ingest -- --source seed-data  (Ingest baseline seed dataset)
 */

import { loadSourceRecords, REGISTERED_SOURCES } from './ingest/index.js';
import * as seedSource from './seed/seed-data.js';
import { supabase } from './db/client.js';
import { fetchExistingDataset, planIngestion, executeIngestion } from './db/upsert.js';

async function main() {
  const args = process.argv.slice(2);
  // Match --dry-run, -n, dryrun, or default if missing commit flag
  const hasDryRunArg = args.some(a => a === '--dry-run' || a === '-n' || a.includes('dry-run'));
  const hasCommitArg = args.some(a => a === '--commit' || a === '-c');
  // If explicitly dry-run, or if committing without credentials
  const dryRun = hasDryRunArg || (!hasCommitArg && !args.includes('--live'));
  const verbose = args.includes('--verbose') || args.includes('-v');

  let sourceName = 'all';
  const sourceIndex = args.findIndex(a => a === '--source' || a === '-s');
  if (sourceIndex !== -1 && args[sourceIndex + 1]) {
    sourceName = args[sourceIndex + 1];
  }

  console.log('------------------------------------------------------------');
  console.log(`📦 NoCharity Ingestion Pipeline`);
  console.log(`Mode:    ${dryRun ? 'DRY-RUN (No writes)' : 'LIVE COMMIT'}`);
  console.log(`Source:  ${sourceName}`);
  console.log('------------------------------------------------------------');

  try {
    let incomingData;
    if (sourceName === 'seed-data') {
      const seedData = await seedSource.fetchRecords();
      incomingData = {
        people: seedData.people || [],
        organizations: seedData.organizations || [],
        sources: seedData.sources || [],
        wealthSnapshots: seedData.wealthSnapshots || [],
        donations: seedData.donations || []
      };
    } else {
      incomingData = await loadSourceRecords(sourceName);
    }

    console.log(`Loaded from source(s):`);
    console.log(`  - People:           ${(incomingData.people || []).length}`);
    console.log(`  - Organizations:    ${(incomingData.organizations || []).length}`);
    console.log(`  - Sources:          ${(incomingData.sources || []).length}`);
    console.log(`  - Wealth Snapshots: ${(incomingData.wealthSnapshots || []).length}`);
    console.log(`  - Donations:        ${(incomingData.donations || []).length}`);

    // Fetch existing database records to perform deduplication and matching
    console.log(`\nFetching existing records from Supabase...`);
    const existingDataset = await fetchExistingDataset(supabase);
    console.log(`Existing in database: ${existingDataset.people.length} people, ${existingDataset.organizations.length} organizations, ${existingDataset.donations.length} donations.`);

    // Plan & validate
    const plan = planIngestion({
      incomingData,
      existingDataset,
      options: { dryRun, verbose }
    });

    // Execute or print dry run
    await executeIngestion(plan, supabase);
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Ingestion failed with error:', err.message);
    if (verbose) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();
