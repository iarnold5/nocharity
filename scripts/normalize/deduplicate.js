/**
 * NoCharity Ingestion Framework — Deduplication & Conservative Matcher (Phase 4)
 * 
 * Rules:
 * 1. Never blindly create duplicates.
 * 2. Use stable identifiers where available (EIN, CIK, canonical URLs, gov IDs).
 * 3. Use conservative matching where no stable ID exists.
 * 4. Never overwrite higher-quality existing data with lower-quality incoming data.
 * 5. Do NOT use AI for identity resolution (deterministic heuristics only).
 */

import {
  cleanUrl,
  cleanEin,
  cleanCik,
  SOURCE_TIER_WEIGHTS,
  WEALTH_CONFIDENCE_WEIGHTS,
  VERIFICATION_STATUS_WEIGHTS
} from './schemas.js';

/**
 * Standardize text for conservative comparison
 */
export function normalizeStringForComparison(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strips common corporate/foundation suffixes for conservative name matching
 */
export function stripLegalEntitySuffixes(name) {
  if (!name) return '';
  let cleaned = normalizeStringForComparison(name);
  const suffixes = [
    'foundation', 'inc', 'incorporated', 'corp', 'corporation',
    'llc', 'ltd', 'limited', 'co', 'company', 'fund', 'trust', 'endowment',
    'the', 'of', 'and'
  ];
  const words = cleaned.split(' ');
  const filtered = words.filter(w => !suffixes.includes(w));
  return filtered.length > 0 ? filtered.join(' ') : cleaned;
}

/**
 * Levenshtein distance for conservative string similarity
 */
export function calculateLevenshteinDistance(a, b) {
  if (!a || !b) return (a || b || '').length;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

/**
 * 1. Match Person against existing people roster
 */
export function matchPerson(incomingPerson, existingPeople = []) {
  if (!incomingPerson || !incomingPerson.canonical_name) {
    return { matchType: 'NONE' };
  }

  const incomingClean = normalizeStringForComparison(incomingPerson.canonical_name);
  const incomingAliases = (incomingPerson.aliases || []).map(normalizeStringForComparison);

  // Check 1: Exact canonical_name match
  for (const existing of existingPeople) {
    const existingClean = normalizeStringForComparison(existing.canonical_name);
    if (incomingClean === existingClean) {
      return {
        matchType: 'EXACT',
        matchedBy: 'CANONICAL_NAME',
        existing
      };
    }

    // Check 2: Match against existing aliases
    const existingAliases = (existing.aliases || []).map(normalizeStringForComparison);
    if (existingAliases.includes(incomingClean)) {
      return {
        matchType: 'EXACT',
        matchedBy: 'EXISTING_ALIAS',
        existing
      };
    }

    // Check 3: Incoming alias matches existing canonical name
    if (incomingAliases.includes(existingClean)) {
      return {
        matchType: 'EXACT',
        matchedBy: 'INCOMING_ALIAS',
        existing
      };
    }

    // Check 4: External identifier match (e.g. wikidata_id, forbes_id)
    if (
      incomingPerson.identifiers?.wikidata_id &&
      existing.identifiers?.wikidata_id &&
      incomingPerson.identifiers.wikidata_id === existing.identifiers.wikidata_id
    ) {
      return {
        matchType: 'EXACT',
        matchedBy: 'WIKIDATA_ID',
        existing
      };
    }
  }

  // Check 5: Conservative fuzzy/potential duplicate detection
  for (const existing of existingPeople) {
    const existingClean = normalizeStringForComparison(existing.canonical_name);
    const dist = calculateLevenshteinDistance(incomingClean, existingClean);

    // If names differ by <= 2 characters (e.g. typos, "MacKenzie Scott" vs "Mackenzie Scott")
    if (dist <= 2 && Math.abs(incomingClean.length - existingClean.length) <= 2) {
      return {
        matchType: 'POTENTIAL_DUPLICATE',
        confidence: 0.85,
        reason: `Close name edit distance (${dist}) between "${incomingPerson.canonical_name}" and "${existing.canonical_name}"`,
        existing
      };
    }

    // Matching last name + same birth date if both present
    if (
      incomingPerson.last_name && existing.last_name &&
      incomingPerson.birth_date && existing.birth_date &&
      normalizeStringForComparison(incomingPerson.last_name) === normalizeStringForComparison(existing.last_name) &&
      incomingPerson.birth_date === existing.birth_date
    ) {
      return {
        matchType: 'POTENTIAL_DUPLICATE',
        confidence: 0.8,
        reason: `Shared last name "${existing.last_name}" and birth date ${existing.birth_date}`,
        existing
      };
    }
  }

  return { matchType: 'NONE' };
}

/**
 * 2. Match Organization against existing organizations
 */
export function matchOrganization(incomingOrg, existingOrgs = []) {
  if (!incomingOrg) return { matchType: 'NONE' };

  const incomingEin = cleanEin(incomingOrg.ein);
  const incomingCik = cleanCik(incomingOrg.cik);
  const incomingUrl = cleanUrl(incomingOrg.website);
  const incomingCleanName = normalizeStringForComparison(incomingOrg.legal_name);
  const incomingStripped = stripLegalEntitySuffixes(incomingOrg.legal_name);

  for (const existing of existingOrgs) {
    // Stable Identifier: EIN
    if (incomingEin && cleanEin(existing.ein) === incomingEin) {
      return {
        matchType: 'EXACT',
        matchedBy: 'EIN',
        existing
      };
    }

    // Stable Identifier: CIK
    if (incomingCik && cleanCik(existing.cik) === incomingCik) {
      return {
        matchType: 'EXACT',
        matchedBy: 'CIK',
        existing
      };
    }

    // Exact Legal Name
    const existingCleanName = normalizeStringForComparison(existing.legal_name);
    if (incomingCleanName === existingCleanName) {
      return {
        matchType: 'EXACT',
        matchedBy: 'LEGAL_NAME',
        existing
      };
    }

    // Display Name exact match
    if (existing.display_name && normalizeStringForComparison(incomingOrg.display_name) === normalizeStringForComparison(existing.display_name)) {
      return {
        matchType: 'EXACT',
        matchedBy: 'DISPLAY_NAME',
        existing
      };
    }

    // Domain match on website
    if (incomingUrl && existing.website) {
      try {
        const inHost = new URL(incomingUrl).hostname.replace(/^www\./, '');
        const exHost = new URL(cleanUrl(existing.website)).hostname.replace(/^www\./, '');
        if (inHost === exHost && inHost.includes('.')) {
          return {
            matchType: 'EXACT',
            matchedBy: 'WEBSITE_DOMAIN',
            existing
          };
        }
      } catch {}
    }
  }

  // Conservative Substring / Suffix-Stripped Match
  for (const existing of existingOrgs) {
    const existingStripped = stripLegalEntitySuffixes(existing.legal_name);
    if (
      (incomingStripped.length >= 4 && existingStripped.length >= 4) &&
      (incomingStripped === existingStripped ||
       incomingStripped.includes(existingStripped) ||
       existingStripped.includes(incomingStripped))
    ) {
      return {
        matchType: 'POTENTIAL_DUPLICATE',
        confidence: 0.75,
        reason: `Base organization name match without stable ID: "${incomingOrg.legal_name}" vs "${existing.legal_name}"`,
        existing
      };
    }
  }

  return { matchType: 'NONE' };
}

/**
 * 3. Match Source against existing sources
 */
export function matchSource(incomingSource, existingSources = []) {
  if (!incomingSource || !incomingSource.url) return { matchType: 'NONE' };

  const incomingCleanUrl = cleanUrl(incomingSource.url);
  const inNorm = incomingCleanUrl ? incomingCleanUrl.replace(/\/$/, '') : '';

  for (const existing of existingSources) {
    const existingCleanUrl = cleanUrl(existing.url);
    const exNorm = existingCleanUrl ? existingCleanUrl.replace(/\/$/, '') : '';
    if (incomingCleanUrl === existingCleanUrl || (inNorm && inNorm === exNorm)) {
      return {
        matchType: 'EXACT',
        matchedBy: 'CANONICAL_URL',
        existing
      };
    }

    // Title + Publisher + Date exact match
    if (
      incomingSource.title && existing.title &&
      incomingSource.publisher && existing.publisher &&
      incomingSource.published_at && existing.published_at &&
      normalizeStringForComparison(incomingSource.title) === normalizeStringForComparison(existing.title) &&
      normalizeStringForComparison(incomingSource.publisher) === normalizeStringForComparison(existing.publisher) &&
      incomingSource.published_at === existing.published_at
    ) {
      return {
        matchType: 'POTENTIAL_DUPLICATE',
        confidence: 0.85,
        reason: `Different URLs but identical article title, publisher, and published date`,
        existing
      };
    }
  }

  return { matchType: 'NONE' };
}

/**
 * 4. Match Wealth Snapshot
 */
export function matchWealthSnapshot(incomingSnapshot, existingSnapshots = [], personId) {
  if (!incomingSnapshot || !personId || !incomingSnapshot.snapshot_date) {
    return { matchType: 'NONE' };
  }

  for (const existing of existingSnapshots) {
    if (existing.person_id === personId && existing.snapshot_date === incomingSnapshot.snapshot_date) {
      return {
        matchType: 'EXACT',
        matchedBy: 'PERSON_AND_DATE',
        existing
      };
    }
  }

  return { matchType: 'NONE' };
}

/**
 * 5. Match Donation
 * 
 * Rules:
 * - Do NOT deduplicate solely on donor + amount + date (different recipients can receive equal gifts on same date).
 * - Match EXACT if donor, date, amount match AND recipient matches or source matches.
 * - If donor, date, amount match but recipients differ, they are distinct donations (NONE).
 * - If donor, date, amount match but recipient context is ambiguous, flag as POTENTIAL_DUPLICATE for review.
 * - Flag potential duplicate if same donor + amount occurs within 14 days.
 */
export function matchDonation(incomingDonation, existingDonations = [], resolvedDonorId, resolvedRecipientId) {
  if (!incomingDonation || !incomingDonation.donation_date || !incomingDonation.amount) {
    return { matchType: 'NONE' };
  }

  const incomingAmount = Number(incomingDonation.amount);
  const incomingDate = incomingDonation.donation_date;
  const donorId = resolvedDonorId || incomingDonation.donor_person_id || incomingDonation.donor_organization_id;
  const inRecipient = resolvedRecipientId || incomingDonation.recipient_organization_id || incomingDonation.recipient_person_id;
  const inSource = cleanUrl(incomingDonation.source_url);

  for (const existing of existingDonations) {
    const existingAmount = Number(existing.amount);
    const existingDate = existing.donation_date;
    const sameDonor = donorId && (existing.donor_person_id === donorId || existing.donor_organization_id === donorId);

    if (!sameDonor) continue;

    // Check amount match
    const amountsMatch = Math.abs(incomingAmount - existingAmount) < 1.0;
    if (!amountsMatch) continue;

    const exRecipient = existing.recipient_organization_id || existing.recipient_person_id;
    const exSource = cleanUrl(existing.source_url);

    // If both have recipients identified and they are different, they are DISTINCT donations
    if (inRecipient && exRecipient && inRecipient !== exRecipient) {
      continue;
    }

    // Exact match: Same donor + same date + same amount
    if (existingDate === incomingDate) {
      const sameRecipient = inRecipient && exRecipient && inRecipient === exRecipient;
      const sameSource = inSource && exSource && inSource === exSource;

      // If recipients match or sources match or neither specifies a different recipient
      if (sameRecipient || sameSource || (!inRecipient && !exRecipient)) {
        return {
          matchType: 'EXACT',
          matchedBy: sameRecipient ? 'DONOR_RECIPIENT_DATE_AMOUNT' : 'DONOR_DATE_AMOUNT',
          existing
        };
      }

      // If recipient context is ambiguous (one has recipient, other does not), flag for review rather than blindly merging
      return {
        matchType: 'POTENTIAL_DUPLICATE',
        confidence: 0.85,
        reason: `Same donor, date (${incomingDate}), and amount ($${incomingAmount}), but recipient context requires maintainer verification`,
        existing
      };
    }

    // Potential duplicate: Same donor + same amount within 14 days
    const inD = new Date(incomingDate);
    const exD = new Date(existingDate);
    const daysDiff = Math.abs((inD - exD) / 86400000);
    if (daysDiff <= 14) {
      return {
        matchType: 'POTENTIAL_DUPLICATE',
        confidence: 0.8,
        reason: `Same donor and amount (${incomingAmount}) recorded within 14 days (${daysDiff} days apart: ${incomingDate} vs ${existingDate})`,
        existing
      };
    }
  }

  return { matchType: 'NONE' };
}

/**
 * Quality Protection Rule Checker
 * Prevents downgrading existing verified or higher-quality data.
 */
export function canOverwriteField(existingValue, incomingValue, fieldType) {
  // If existing is null/empty, incoming can always enrich it
  if (existingValue === null || existingValue === undefined || existingValue === '') {
    return true;
  }
  // Never overwrite existing data with null/empty
  if (incomingValue === null || incomingValue === undefined || incomingValue === '') {
    return false;
  }

  if (fieldType === 'SOURCE_TIER') {
    const existingWeight = SOURCE_TIER_WEIGHTS[existingValue] || 0;
    const incomingWeight = SOURCE_TIER_WEIGHTS[incomingValue] || 0;
    return incomingWeight >= existingWeight;
  }

  if (fieldType === 'WEALTH_CONFIDENCE') {
    const existingWeight = WEALTH_CONFIDENCE_WEIGHTS[existingValue] || 0;
    const incomingWeight = WEALTH_CONFIDENCE_WEIGHTS[incomingValue] || 0;
    return incomingWeight >= existingWeight;
  }

  if (fieldType === 'DONATION_STATUS') {
    const existingWeight = VERIFICATION_STATUS_WEIGHTS[existingValue] || 0;
    const incomingWeight = VERIFICATION_STATUS_WEIGHTS[incomingValue] || 0;
    return incomingWeight >= existingWeight;
  }

  return true;
}
