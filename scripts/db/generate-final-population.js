/**
 * Generates the idempotent SQL migration for the final 1,000 billionaire dataset population.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

import { supabase } from './client.js';
import { fetchExistingDataset, planIngestion } from './upsert.js';
import { fetchRecords } from '../ingest/forbes-billionaires.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isFinite(val) ? String(val) : 'NULL';
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (Array.isArray(val)) {
    const escaped = val.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',');
    return `'${escaped.replace(/'/g, "''")}'::text[]`;
  }
  return `'${String(val).replace(/'/g, "''")}'`;
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function generatePopulationMigration() {
  console.log('[Population] Fetching baseline dataset from Supabase...');
  const existingDataset = await fetchExistingDataset(supabase);
  console.log(`[Population] Baseline count: ${existingDataset.people.length} people, ${existingDataset.wealthSnapshots.length} snapshots, ${existingDataset.sources.length} sources`);

  console.log('[Population] Normalizing Forbes top 1,000 billionaires...');
  const incomingData = await fetchRecords();
  console.log(`[Population] Loaded ${incomingData.people.length} incoming billionaires`);

  console.log('[Population] Planning ingestion with conservative deduplication...');
  const plan = planIngestion({
    incomingData,
    existingDataset,
    options: { dryRun: false, verbose: true }
  });

  console.log('[Population] Ingestion plan statistics:');
  console.log(JSON.stringify(plan.stats, null, 2));

  const { operations } = plan;
  const statements = [];
  const batches = []; // Array of SQL strings ready for execution

  // 1. People
  if (operations.peopleToInsert.length > 0) {
    const chunks = chunkArray(operations.peopleToInsert, 100);
    for (const chunk of chunks) {
      const rows = chunk.map(p =>
        `(${escapeSql(p.id)}, ${escapeSql(p.canonical_name)}, ${escapeSql(p.first_name)}, ${escapeSql(p.last_name)}, ${escapeSql(p.country)}, ${escapeSql(p.occupation)}, ${escapeSql(p.industry)}, ${escapeSql(p.description)}, ${escapeSql(p.is_billionaire)}, ${escapeSql(p.giving_pledge || false)})`
      );
      const sql = `INSERT INTO people (id, canonical_name, first_name, last_name, country, occupation, industry, description, is_billionaire, giving_pledge) VALUES\n${rows.join(',\n')}\nON CONFLICT (id) DO UPDATE SET\n  canonical_name = EXCLUDED.canonical_name,\n  first_name = EXCLUDED.first_name,\n  last_name = EXCLUDED.last_name,\n  country = EXCLUDED.country,\n  occupation = EXCLUDED.occupation,\n  industry = EXCLUDED.industry,\n  description = EXCLUDED.description,\n  is_billionaire = EXCLUDED.is_billionaire,\n  giving_pledge = EXCLUDED.giving_pledge,\n  updated_at = NOW();`;
      statements.push(sql);
      batches.push({ table: 'people', sql });
    }
  }

  // 2. Organizations
  if (operations.orgsToInsert.length > 0) {
    const chunks = chunkArray(operations.orgsToInsert, 100);
    for (const chunk of chunks) {
      const rows = chunk.map(o =>
        `(${escapeSql(o.id)}, ${escapeSql(o.legal_name)}, ${escapeSql(o.display_name)}, ${escapeSql(o.organization_type)}, ${escapeSql(o.ein)}, ${escapeSql(o.cik)}, ${escapeSql(o.website)}, ${escapeSql(o.country)})`
      );
      const sql = `INSERT INTO organizations (id, legal_name, display_name, organization_type, ein, cik, website, country) VALUES\n${rows.join(',\n')}\nON CONFLICT (id) DO UPDATE SET\n  legal_name = EXCLUDED.legal_name,\n  display_name = EXCLUDED.display_name,\n  organization_type = EXCLUDED.organization_type,\n  ein = EXCLUDED.ein,\n  cik = EXCLUDED.cik,\n  website = EXCLUDED.website,\n  country = EXCLUDED.country;`;
      statements.push(sql);
      batches.push({ table: 'organizations', sql });
    }
  }

  // 3. Sources
  if (operations.sourcesToInsert.length > 0) {
    const chunks = chunkArray(operations.sourcesToInsert, 100);
    for (const chunk of chunks) {
      const rows = chunk.map(s =>
        `(${escapeSql(s.id)}, ${escapeSql(s.url)}, ${escapeSql(s.publisher)}, ${escapeSql(s.title)}, ${escapeSql(s.source_type)}, ${escapeSql(s.published_at)})`
      );
      const sql = `INSERT INTO sources (id, url, publisher, title, source_type, published_at) VALUES\n${rows.join(',\n')}\nON CONFLICT (id) DO UPDATE SET\n  url = EXCLUDED.url,\n  publisher = EXCLUDED.publisher,\n  title = EXCLUDED.title,\n  source_type = EXCLUDED.source_type,\n  published_at = EXCLUDED.published_at;`;
      statements.push(sql);
      batches.push({ table: 'sources', sql });
    }
  }

  // 4. Wealth Snapshots
  if (operations.snapshotsToInsert.length > 0) {
    const chunks = chunkArray(operations.snapshotsToInsert, 100);
    for (const chunk of chunks) {
      const rows = chunk.map(ws =>
        `(${escapeSql(ws.id || crypto.randomUUID())}, ${escapeSql(ws.person_id)}, ${escapeSql(ws.snapshot_date)}, ${escapeSql(ws.net_worth)}, ${escapeSql(ws.currency || 'USD')}, ${escapeSql(ws.source_name)}, ${escapeSql(ws.source_id)}, ${escapeSql(ws.confidence || 'HIGH')})`
      );
      const sql = `INSERT INTO wealth_snapshots (id, person_id, snapshot_date, net_worth, currency, source_name, source_id, confidence) VALUES\n${rows.join(',\n')}\nON CONFLICT (person_id, snapshot_date) DO UPDATE SET\n  net_worth = EXCLUDED.net_worth,\n  currency = EXCLUDED.currency,\n  source_name = EXCLUDED.source_name,\n  source_id = COALESCE(EXCLUDED.source_id, wealth_snapshots.source_id),\n  confidence = EXCLUDED.confidence;`;
      statements.push(sql);
      batches.push({ table: 'wealth_snapshots', sql });
    }
  }

  // 5. Person Organizations
  if (operations.personOrgsToInsert && operations.personOrgsToInsert.length > 0) {
    const chunks = chunkArray(operations.personOrgsToInsert, 100);
    for (const chunk of chunks) {
      const rows = chunk.map(po =>
        `(${escapeSql(po.id || crypto.randomUUID())}, ${escapeSql(po.person_id)}, ${escapeSql(po.organization_id)}, ${escapeSql(po.relationship_type)})`
      );
      const sql = `INSERT INTO person_organizations (id, person_id, organization_id, relationship_type) VALUES\n${rows.join(',\n')}\nON CONFLICT (person_id, organization_id, relationship_type) DO NOTHING;`;
      statements.push(sql);
      batches.push({ table: 'person_organizations', sql });
    }
  }

  const migrationHeader = `-- NoCharity Phase 15: Complete Billionaire Dataset Population
-- Description: Expands the live dataset to cover the top ~1,000 global billionaires using the Forbes Real-Time Index.
-- Preserves existing records, historical wealth snapshots, source citations, and verified donation relationships.
-- Date: 2026-10-22

`;

  const migrationFilePath = path.resolve(__dirname, '../../supabase/migrations/20261022000013_complete_billionaire_dataset_population.sql');
  const fullSql = migrationHeader + statements.join('\n\n') + '\n';
  fs.writeFileSync(migrationFilePath, fullSql, 'utf8');
  console.log(`[Population] Wrote migration file: ${migrationFilePath} (${(fullSql.length / 1024).toFixed(1)} KB)`);

  const batchesFilePath = path.resolve(__dirname, 'population-batches.json');
  fs.writeFileSync(batchesFilePath, JSON.stringify(batches, null, 2), 'utf8');
  console.log(`[Population] Wrote ${batches.length} execution batches to ${batchesFilePath}`);

  return { plan, batches, migrationFilePath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generatePopulationMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}
