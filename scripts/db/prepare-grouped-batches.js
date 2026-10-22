import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const batches = JSON.parse(fs.readFileSync(path.join(__dirname, 'population-batches.json'), 'utf8'));

const outDir = path.join(__dirname, 'sql-chunks');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const peopleBatches = batches.filter(b => b.table === 'people');
const orgBatches = batches.filter(b => b.table === 'organizations');
const sourceBatches = batches.filter(b => b.table === 'sources');
const snapshotBatches = batches.filter(b => b.table === 'wealth_snapshots');
const personOrgBatches = batches.filter(b => b.table === 'person_organizations');

const chunks = [
  // 1. People (0-199, 200-399, 400-599, 600-799, 800-978)
  { name: '01_people_p1', sql: peopleBatches.slice(0, 2).map(b => b.sql).join('\n\n') },
  { name: '02_people_p2', sql: peopleBatches.slice(2, 4).map(b => b.sql).join('\n\n') },
  { name: '03_people_p3', sql: peopleBatches.slice(4, 6).map(b => b.sql).join('\n\n') },
  { name: '04_people_p4', sql: peopleBatches.slice(6, 8).map(b => b.sql).join('\n\n') },
  { name: '05_people_p5', sql: peopleBatches.slice(8).map(b => b.sql).join('\n\n') },

  // 2. Organizations
  { name: '06_organizations', sql: orgBatches.map(b => b.sql).join('\n\n') },

  // 3. Sources (0-499, 500-1000)
  { name: '07_sources_p1', sql: sourceBatches.slice(0, 5).map(b => b.sql).join('\n\n') },
  { name: '08_sources_p2', sql: sourceBatches.slice(5).map(b => b.sql).join('\n\n') },

  // 4. Wealth Snapshots (0-499, 500-999)
  { name: '09_wealth_snapshots_p1', sql: snapshotBatches.slice(0, 5).map(b => b.sql).join('\n\n') },
  { name: '10_wealth_snapshots_p2', sql: snapshotBatches.slice(5).map(b => b.sql).join('\n\n') },

  // 5. Person Organizations
  { name: '11_person_organizations', sql: personOrgBatches.map(b => b.sql).join('\n\n') }
];

// Clean existing chunk files first
for (const f of fs.readdirSync(outDir)) {
  fs.unlinkSync(path.join(outDir, f));
}

for (const c of chunks) {
  const filePath = path.join(outDir, `${c.name}.sql`);
  fs.writeFileSync(filePath, c.sql, 'utf8');
  console.log(`Wrote ${c.name}.sql (${(c.sql.length / 1024).toFixed(1)} KB)`);
}
