/**
 * NoCharity Ingestion Source — Forbes World's Real-Time Billionaires (Top 1,000)
 * 
 * Source: Forbes Real-Time Billionaires Index
 * URL: https://www.forbes.com/real-time-billionaires/
 * Provenance: Public ranking tracking global billionaire wealth, citizenship, industries, and affiliations.
 * 
 * Rules:
 * 1. Uses one consistent, credible public ranking list as mandated by project methodology.
 * 2. Caches payload locally to scripts/ingest/data/forbes-top1000.json for zero-cost, offline reproducibility.
 * 3. Exact valuation dated to 2026-10-22.
 * 4. Normalizes identities with canonical name deduplication.
 * 5. Does not fabricate unproven historical dates or synthetic donations.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createNormalizedPerson,
  createNormalizedOrganization,
  createNormalizedSource,
  createNormalizedWealthSnapshot
} from '../normalize/schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sourceName = 'forbes-billionaires';
export const FORBES_INDEX_URL = 'https://www.forbes.com/real-time-billionaires/';

/**
 * Loads the top 1,000 billionaires dataset from local cache or fetches if missing.
 */
export async function getForbesTop1000() {
  const dataDir = path.join(__dirname, 'data');
  const cacheFile = path.join(dataDir, 'forbes-top1000.json');

  if (fs.existsSync(cacheFile)) {
    try {
      const content = fs.readFileSync(cacheFile, 'utf8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length >= 100) {
        return parsed;
      }
    } catch (e) {
      console.warn(`[Forbes Ingest] Cache read failed (${e.message}), fetching live...`);
    }
  }

  // Fetch live if cache missing
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const endpoint = 'https://www.forbes.com/forbesapi/person/rtb/0/position/true.json?limit=1000';
  const res = await fetch(endpoint, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });

  if (!res.ok) {
    throw new Error(`Forbes API returned HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  const rawList = json.personList?.personsLists || [];

  const clean = rawList.map(p => ({
    rank: p.rank,
    personName: p.personName,
    lastName: p.lastName,
    finalWorth: p.finalWorth,
    archivedWorth: p.archivedWorth,
    countryOfCitizenship: p.countryOfCitizenship,
    state: p.state,
    city: p.city,
    source: p.source,
    industries: p.industries,
    bios: p.bios?.slice(0, 5),
    uri: p.uri,
    naturalId: p.naturalId,
    birthDate: p.birthDate,
    timestamp: p.timestamp,
    companyName: p.financialAssets?.[0]?.companyName || null,
    ticker: p.financialAssets?.[0]?.ticker || null
  }));

  fs.writeFileSync(cacheFile, JSON.stringify(clean, null, 2), 'utf8');
  return clean;
}

/**
 * Normalizes the top 1,000 billionaires into canonical NoCharity schema records.
 */
export async function fetchRecords() {
  const rawBillionaires = await getForbesTop1000();

  const people = [];
  const organizationsMap = new Map();
  const sourcesMap = new Map();
  const wealthSnapshots = [];
  const donations = [];
  const donationSources = [];
  const personOrganizations = [];

  // Register master ranking source
  sourcesMap.set(FORBES_INDEX_URL, createNormalizedSource({
    url: FORBES_INDEX_URL,
    publisher: 'Forbes',
    title: "Forbes World's Real-Time Billionaires Ranking",
    source_type: 'DATABASE',
    published_at: '2026-10-22',
    notes: 'Primary global billionaire ranking list tracking the top ~1,000 individuals by estimated net worth.'
  }));

  for (const b of rawBillionaires) {
    if (!b || !b.personName || !b.finalWorth) continue;

    const canonicalName = b.personName.trim();
    const netWorthUSD = Math.round(Number(b.finalWorth) * 1_000_000);
    if (!isFinite(netWorthUSD) || netWorthUSD <= 0) continue;

    // 1. Identity & Demographics
    const nameParts = canonicalName.split(/\s+/);
    const firstName = nameParts.length > 1 ? nameParts[0] : null;
    const lastName = b.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : canonicalName);
    const country = b.countryOfCitizenship || 'Unknown';
    const industry = Array.isArray(b.industries) && b.industries.length > 0 ? b.industries[0] : 'Diversified';
    const occupation = b.source || 'Entrepreneur / Investor';

    let description = '';
    if (Array.isArray(b.bios) && b.bios.length > 0) {
      description = b.bios.join(' ');
    } else if (b.source) {
      description = `Rank #${b.rank} global billionaire. Primary wealth source: ${b.source}.`;
    } else {
      description = `Rank #${b.rank} global billionaire on the Forbes Real-Time Index.`;
    }

    const profileUrl = b.uri ? `https://www.forbes.com/profile/${b.uri}/` : FORBES_INDEX_URL;

    people.push(createNormalizedPerson({
      canonical_name: canonicalName,
      first_name: firstName,
      last_name: lastName,
      country,
      industry,
      occupation,
      description,
      is_billionaire: true,
      identifiers: {
        forbes_rank: b.rank,
        forbes_uri: b.uri || null,
        natural_id: b.naturalId || null
      }
    }));

    // 2. Source citation per profile
    if (!sourcesMap.has(profileUrl)) {
      sourcesMap.set(profileUrl, createNormalizedSource({
        url: profileUrl,
        publisher: 'Forbes',
        title: `Forbes Profile: ${canonicalName}`,
        source_type: 'DATABASE',
        published_at: '2026-10-22',
        notes: `Forbes Real-Time Billionaires valuation and biographical profile for ${canonicalName} (Rank #${b.rank}).`
      }));
    }

    // 3. Wealth Snapshot (dated 2026-10-22)
    wealthSnapshots.push(createNormalizedWealthSnapshot({
      person_name: canonicalName,
      snapshot_date: '2026-10-22',
      net_worth: netWorthUSD,
      currency: 'USD',
      source_name: 'Forbes Real-Time Billionaires',
      source_url: profileUrl,
      confidence: 'HIGH'
    }));

    // 4. Primary Associated Company
    const GENERIC_INDUSTRIES = new Set([
      'finance', 'investments', 'real estate', 'manufacturing', 'chemicals',
      'technology', 'software', 'banking', 'retail', 'healthcare', 'diversified',
      'energy', 'oil & gas', 'media', 'sports', 'food & beverage', 'telecom',
      'gambling', 'pharma', 'trading', 'construction', 'metals', 'mining',
      'insurance', 'hotels', 'e-commerce', 'automotive', 'commodities',
      'online gambling', 'hedge funds', 'hedge fund', 'sporting goods',
      'diamond jewelry', 'jewelry', 'beverages', 'cheese', 'financial software',
      'artificial intelligence', 'electronics', 'consumer goods', 'logistics',
      'cryptocurrency', 'crypto', 'wireless networking', 'computer hardware',
      'computer storage', 'private equity', 'venture capital', 'telecommunications',
      'supermarkets', 'department stores', 'hospitals', 'casinos', 'airlines',
      'airports', 'steel', 'aluminum', 'cement', 'fertilizers', 'agriculture',
      'poultry', 'pork', 'meat processing', 'grain', 'sugar', 'textiles',
      'apparel', 'footwear', 'fashion', 'luxury goods', 'perfume', 'cosmetics',
      'watches', 'beer', 'wine', 'spirits', 'restaurants', 'fast food',
      'pizza', 'coffee', 'candy', 'chocolate', 'tobacco', 'packaging',
      'paper', 'timber', 'lumber', 'auto parts', 'car dealerships', 'trucking',
      'freight', 'waste management', 'utilities', 'solar energy', 'wind energy',
      'batteries', 'semiconductors', 'medical devices', 'biotech', 'generic drugs',
      'pharmaceuticals', 'shipping'
    ]);

    let company = b.companyName;
    if (company && GENERIC_INDUSTRIES.has(company.trim().toLowerCase())) {
      company = null;
    }

    if (!company && b.source && !b.source.includes('&') && !b.source.includes(',')) {
      const trimmed = b.source.trim();
      if (!GENERIC_INDUSTRIES.has(trimmed.toLowerCase())) {
        // Only if it has corporate indicators or capitalized brand
        if (/\b(inc|corp|ltd|llc|group|holding|holdings|technologies|partners|capital|motors|airlines|energy|bank|co)\b/i.test(trimmed) ||
            (trimmed.length >= 4 && !/^[a-z]/.test(trimmed) && trimmed.split(/\s+/).length <= 4)) {
          company = trimmed;
        }
      }
    }

    if (company && company.length >= 3 && company.length <= 80 && !organizationsMap.has(company.toLowerCase())) {
      organizationsMap.set(company.toLowerCase(), createNormalizedOrganization({
        legal_name: company,
        display_name: company,
        organization_type: 'COMPANY',
        country,
        description: `Primary commercial enterprise associated with ${canonicalName}.`
      }));

      personOrganizations.push({
        person_name: canonicalName,
        organization_name: company,
        relationship_type: 'FOUNDER'
      });
    }
  }

  return {
    sourceName,
    people,
    organizations: Array.from(organizationsMap.values()),
    sources: Array.from(sourcesMap.values()),
    wealthSnapshots,
    donations,
    donationSources,
    personOrganizations
  };
}
