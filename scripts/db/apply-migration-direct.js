/**
 * Applies the final dataset population migration to live Supabase PostgreSQL.
 * Uses official Supabase Management API with admin privileges.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSupabaseCredentials() {
  const mcpConfigPath = path.resolve('C:/Users/iarno/.gemini/config/mcp_config.json');
  if (fs.existsSync(mcpConfigPath)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
      const token = cfg?.mcpServers?.supabase?.SUPABASE_ACCESS_TOKEN;
      if (token) {
        return { token, projectRef: 'jqgqdgviudpwarmwfxyf' };
      }
    } catch (e) {
      console.warn(`[Apply] Could not parse mcp_config.json: ${e.message}`);
    }
  }

  throw new Error('Supabase Management Token could not be found.');
}

async function executeSql(query, token, projectRef) {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Supabase SQL query failed [HTTP ${res.status}]: ${errorText}`);
  }

  return res.json();
}

async function main() {
  console.log('============================================================');
  console.log('🚀 COMMITTING COMPLETE 1,000 BILLIONAIRE DATASET TO SUPABASE');
  console.log('============================================================\n');

  const { token, projectRef } = getSupabaseCredentials();
  console.log(`[Apply] Connected to Supabase Project: ${projectRef}`);

  const chunksDir = path.join(__dirname, 'sql-chunks');
  const chunkFiles = fs.readdirSync(chunksDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`[Apply] Found ${chunkFiles.length} sequential execution chunks.`);

  for (let i = 0; i < chunkFiles.length; i++) {
    const file = chunkFiles[i];
    const filePath = path.join(chunksDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');
    const start = Date.now();

    process.stdout.write(`  [${i + 1}/${chunkFiles.length}] Executing ${file} (${(sql.length / 1024).toFixed(1)} KB)... `);
    await executeSql(sql, token, projectRef);
    const elapsed = Date.now() - start;
    console.log(`✅ Done (${elapsed}ms)`);
  }

  console.log('\n[Apply] All chunks successfully committed!');
  console.log('[Apply] Querying live database audit counts...\n');

  const countsSql = `
    SELECT 
      (SELECT COUNT(*) FROM people) AS total_people,
      (SELECT COUNT(*) FROM people WHERE is_billionaire = true) AS billionaire_people,
      (SELECT COUNT(*) FROM organizations) AS total_organizations,
      (SELECT COUNT(*) FROM sources) AS total_sources,
      (SELECT COUNT(*) FROM wealth_snapshots) AS total_wealth_snapshots,
      (SELECT COUNT(*) FROM person_organizations) AS total_person_orgs,
      (SELECT COUNT(*) FROM donations) AS total_donations,
      (SELECT COUNT(*) FROM donations WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')) AS personal_donations,
      (SELECT COUNT(*) FROM donations WHERE funding_source_type = 'FOUNDATION') AS foundation_donations,
      (SELECT COUNT(*) FROM donations WHERE funding_source_type = 'CORPORATE') AS corporate_donations,
      (SELECT COUNT(*) FROM donations WHERE funding_source_type = 'DAF') AS daf_donations,
      (SELECT COUNT(*) FROM donations WHERE funding_source_type = 'PLEDGE') AS pledge_donations,
      (SELECT COUNT(*) FROM donations WHERE funding_source_type = 'DISPUTED') AS disputed_donations;
  `;

  const counts = await executeSql(countsSql, token, projectRef);
  console.log('📊 LIVE DATABASE AUDIT:');
  console.log(JSON.stringify(counts[0], null, 2));
}

main().catch(err => {
  console.error('\n❌ Execution error:', err);
  process.exit(1);
});
