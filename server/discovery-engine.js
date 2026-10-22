/**
 * NoCharity Advanced Mode — Phase 11: News Discovery Engine
 * 
 * Central Principles:
 * 1. Google News is a DISCOVERY mechanism, not the authoritative database.
 * 2. News results describing donations are NEVER automatically marked VERIFIED.
 * 3. News results are NEVER automatically inserted as confirmed personal giving.
 * 4. Every candidate is tagged with status DISCOVERED and explicit label:
 *    "Potential donation — verification required"
 * 5. Extracts detected donor, detected recipient, extracted amount with confidence,
 *    publication date, source publisher, and possible funding source.
 * 6. Supports a lightweight maintainer-only workflow:
 *    News result → review → classify → verify → insert/update Supabase.
 */

import { searchGoogleNews } from '../mcp-server.js';
import { INITIAL_BILLIONAIRES } from '../public/js/data.js';

export const DISCOVERY_STATUS = Object.freeze({
  DISCOVERED: 'DISCOVERED',
  UNVERIFIED: 'UNVERIFIED',
  PARTIALLY_VERIFIED: 'PARTIALLY_VERIFIED',
  VERIFIED: 'VERIFIED',
  DISPUTED: 'DISPUTED'
});

export const DISCOVERY_LABEL = "Potential donation — verification required";

/**
 * Extracts numeric dollar amount and confidence level from headline and snippet text.
 */
export function extractDonationAmount(text) {
  if (!text || typeof text !== 'string') {
    return {
      amount: null,
      formatted: 'Unspecified Amount',
      rawMatch: null,
      confidence: 'NONE'
    };
  }

  // Common patterns: $5.3 billion, $100M, $500,000, $1.2B, $50k
  const regex = /\$(\d+(?:\.\d+)?)\s*(billion|million|thousand|trillion|B|M|k)?/i;
  const match = text.match(regex);

  if (!match) {
    return {
      amount: null,
      formatted: 'Unspecified Amount',
      rawMatch: null,
      confidence: 'NONE'
    };
  }

  const rawVal = parseFloat(match[1]);
  const unit = (match[2] || '').toLowerCase();
  let amount = rawVal;
  let formatted = `$${rawVal}`;

  if (unit.startsWith('b')) {
    amount = rawVal * 1_000_000_000;
    formatted = `$${rawVal} Billion`;
  } else if (unit.startsWith('m')) {
    amount = rawVal * 1_000_000;
    formatted = `$${rawVal} Million`;
  } else if (unit.startsWith('k') || unit.startsWith('th')) {
    amount = rawVal * 1_000;
    formatted = `$${rawVal} Thousand`;
  } else if (unit.startsWith('t')) {
    amount = rawVal * 1_000_000_000_000;
    formatted = `$${rawVal} Trillion`;
  }

  // Assess confidence: High if linked with donation verbs, Medium otherwise
  const lower = text.toLowerCase();
  const hasDonationVerb = /(donate|donated|donates|donating|gives|gave|giving|gift|pledge|pledged|pledges|grants|granting|bequeath)/i.test(lower);
  const confidence = hasDonationVerb ? 'HIGH' : 'MEDIUM';

  return {
    amount,
    formatted,
    rawMatch: match[0],
    confidence
  };
}

/**
 * Detects possible recipient from article text.
 */
export function extractRecipient(text, donorName = '') {
  if (!text || typeof text !== 'string') return 'Unspecified Recipient';

  // 1. Check for known institutional foundation or cause mentions first
  if (/gates foundation/i.test(text)) return 'Bill & Melinda Gates Foundation';
  if (/bezos earth fund/i.test(text)) return 'Bezos Earth Fund';
  if (/chan zuckerberg/i.test(text)) return 'Chan Zuckerberg Initiative';
  if (/red cross/i.test(text)) return 'American Red Cross';
  if (/feeding america/i.test(text)) return 'Feeding America';
  if (/howard university/i.test(text)) return 'Howard University';

  // 2. Pattern: "to [Recipient]" or "gives [Amount] to [Recipient]"
  const toMatch = text.match(/(?:donates?|gives?|gift(?:ed)?|pledges?|grants?)[^.!?\n]+?\s+to\s+(?:the\s+)?([A-Z][A-Za-z0-9&',.\s]{2,45}?)(?:\s+for|\s+after|\s+as|\s+in|\.|\,|$)/i);
  if (toMatch && toMatch[1]) {
    const candidate = toMatch[1].trim();
    if (candidate.length > 2 && candidate.toLowerCase() !== donorName.toLowerCase()) {
      return candidate;
    }
  }

  // 3. Secondary pattern: "to support [Recipient/Cause]"
  const supportMatch = text.match(/to\s+support\s+(?:the\s+)?([A-Z][A-Za-z0-9&',.\s]{2,45}?)(?:\s+for|\.|\,|$)/i);
  if (supportMatch && supportMatch[1]) {
    return supportMatch[1].trim();
  }

  return 'Unspecified Cause / Recipient';
}

/**
 * Classifies possible funding source type from article context.
 * Strictly distinguishes PERSONAL, FOUNDATION, CORPORATE, DAF, PLEDGE, and UNKNOWN_SOURCE.
 */
export function classifyCandidateFundingSource(text) {
  if (!text || typeof text !== 'string') return 'UNKNOWN_SOURCE';
  const lower = text.toLowerCase();

  // 1. PLEDGE (commitment rather than transfer)
  if (/(pledges?|pledged|pledging|commits?(?: to)?|commitment to donate|committed to donate|promises?(?: to give)?|promised|will donate|plans? to donate|signed the giving pledge)/i.test(lower) &&
      !/(transferred|completed donation|filed sec|disbursed)/i.test(lower)) {
    return 'PLEDGE';
  }

  // 2. FOUNDATION (charitable trust or foundation funds)
  if (/(foundation|charitable trust|family foundation|gates foundation|bezos earth fund|bloomberg philanthropies)/i.test(lower) &&
      !/(personal stock|personal wealth|from private fortune|personal funds)/i.test(lower)) {
    return 'FOUNDATION';
  }

  // 3. CORPORATE (company treasury funds or direct company gift)
  if (/(corporate donation|company funds|from corporate treasury|company announced donation|on behalf of the company)/i.test(lower)) {
    return 'CORPORATE';
  }

  // 4. DAF (Donor-Advised Fund transfer)
  if (/(donor-advised fund|daf|fidelity charitable|schwab charitable|vanguard charitable)/i.test(lower)) {
    return 'DAF';
  }

  // 5. PERSONAL (explicit indication of individual fortune)
  if (/(personal wealth|personal fortune|from his personal|from her personal|out of pocket|private fortune|direct personal gift)/i.test(lower)) {
    return 'PERSONAL_DIRECT';
  }

  // Default: Unknown source attribution
  return 'UNKNOWN_SOURCE';
}

/**
 * Matches donor name against tracked database or seed billionaires list.
 */
export function matchTrackedDonor(text, knownBillionaires = INITIAL_BILLIONAIRES) {
  if (!text) return null;

  for (const b of knownBillionaires) {
    const fullName = b.name || b.canonical_name;
    if (!fullName) continue;

    const lowerText = text.toLowerCase();
    const lowerName = fullName.toLowerCase();

    // Check full name match
    if (lowerText.includes(lowerName)) {
      return {
        matched: true,
        person_id: b.id || b.person_id,
        name: fullName,
        country: b.country,
        industry: b.industry,
        latest_net_worth: b.netWorth || b.latest_net_worth
      };
    }

    // Check surname with high confidence if unique
    const parts = fullName.split(' ');
    if (parts.length > 1) {
      const lastName = parts[parts.length - 1].toLowerCase();
      if (['buffett', 'gates', 'musk', 'bezos', 'zuckerberg', 'bloomberg', 'ellison', 'adani', 'ambani', 'carnegie', 'rockefeller'].includes(lastName)) {
        if (lowerText.includes(lastName)) {
          return {
            matched: true,
            person_id: b.id || b.person_id,
            name: fullName,
            country: b.country,
            industry: b.industry,
            latest_net_worth: b.netWorth || b.latest_net_worth
          };
        }
      }
    }
  }

  return null;
}

/**
 * Transforms a raw news article into an Advanced Mode Discovered Donation candidate.
 * 
 * Guarantees:
 * - NOT marked VERIFIED
 * - NOT counted as confirmed personal giving
 * - Labeled "Potential donation — verification required"
 */
export function extractDiscoveredDonation(article, options = {}) {
  const title = article.title || '';
  const snippet = article.snippet || '';
  const combinedText = `${title} — ${snippet}`;

  // 1. Detected Donor
  let donor = null;
  if (options.billionaireName) {
    const matched = matchTrackedDonor(options.billionaireName, options.trackedPeople);
    donor = {
      name: options.billionaireName,
      person_id: matched ? matched.person_id : null,
      matched_tracked: Boolean(matched)
    };
  } else {
    const matched = matchTrackedDonor(combinedText, options.trackedPeople);
    if (matched) {
      donor = {
        name: matched.name,
        person_id: matched.person_id,
        matched_tracked: true
      };
    } else {
      donor = {
        name: 'Unspecified Donor',
        person_id: null,
        matched_tracked: false
      };
    }
  }

  // 2. Extracted Amount
  const amountInfo = extractDonationAmount(title.includes('$') ? title : combinedText);

  // 3. Detected Recipient
  const recipient = extractRecipient(combinedText, donor.name);

  // 4. Possible Funding Source
  const possibleFundingSource = classifyCandidateFundingSource(combinedText);

  // 5. Generate unique candidate ID for review tracking
  const cleanUrl = article.link || '';
  const urlHash = cleanUrl.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
  const candidateId = `discovered-${Math.abs(urlHash).toString(36)}-${Math.floor(Math.random() * 1000).toString(36)}`;

  return {
    candidate_id: candidateId,
    headline: title,
    url: article.link || null,
    source_publisher: article.source || 'News Media',
    published_at: article.pubDate || new Date().toISOString().split('T')[0],
    snippet,

    // Detected Entities
    detected_donor: donor,
    detected_recipient: recipient,
    extracted_amount: amountInfo.amount,
    formatted_amount: amountInfo.formatted,
    amount_confidence: amountInfo.confidence,
    possible_funding_source: possibleFundingSource,

    // Phase 11 Guardrails: NEVER mark authoritative or confirmed
    status: DISCOVERY_STATUS.DISCOVERED,
    verification_badge: DISCOVERY_LABEL,
    is_confirmed_personal_giving: false,
    is_authoritative: false,
    disclaimer: 'Potential donation discovered from public media reports; verification and audit against primary regulatory filings (SEC Form 4, 990-PF) required before inclusion in confirmed personal giving parity calculations.',
    
    // Workflow tracking
    review_workflow: {
      step_1_discovered: true,
      step_2_classified: false,
      step_3_verified: false,
      step_4_committed_to_supabase: false,
      recommended_action: 'Maintainer review required: verify with primary filing before database ingestion.'
    }
  };
}

/**
 * Searches Google News and returns structured Discovered Donation candidate records.
 */
export async function discoverDonationsFromNews(billionaireName, options = {}) {
  const timeframe = options.timeframe || 'all';
  const startDate = options.startDate || null;
  const endDate = options.endDate || null;

  const rawArticles = await searchGoogleNews(billionaireName, timeframe, startDate, endDate);

  const candidates = rawArticles.map(article => 
    extractDiscoveredDonation(article, {
      billionaireName,
      trackedPeople: options.trackedPeople || INITIAL_BILLIONAIRES
    })
  );

  return {
    source: 'google_news_rss_discovery',
    donor_query: billionaireName,
    timeframe,
    discovered_count: candidates.length,
    status_label: DISCOVERY_LABEL,
    is_authoritative: false,
    disclaimer: 'Google News is a discovery mechanism, not an authoritative database. Candidates must be verified before inclusion in confirmed personal giving.',
    candidates
  };
}
