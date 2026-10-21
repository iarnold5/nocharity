/**
 * NoCharity Advanced Mode — Normalized Record Schemas (Phase 4)
 * 
 * Defines canonical data contracts for:
 * 1. PEOPLE
 * 2. ORGANIZATIONS
 * 3. SOURCES
 * 4. WEALTH SNAPSHOTS
 * 5. DONATIONS
 * 
 * All ingest sources must normalize raw data into these shapes before
 * deduplication, validation, and database upsert.
 */

export const ENTITY_TYPES = Object.freeze({
  PERSON: 'PERSON',
  ORGANIZATION: 'ORGANIZATION',
  SOURCE: 'SOURCE',
  WEALTH_SNAPSHOT: 'WEALTH_SNAPSHOT',
  DONATION: 'DONATION'
});

export const ORGANIZATION_TYPES = Object.freeze([
  'FOUNDATION',
  'COMPANY',
  'CHARITY',
  'DAF',
  'POLITICAL_COMMITTEE',
  'OTHER'
]);

export const SOURCE_TIERS = Object.freeze([
  'PRIMARY_REGULATORY',      // Weight: 5 (SEC Form 4, IRS Form 990, etc.)
  'OFFICIAL_PRESS_RELEASE', // Weight: 4 (Direct entity statements)
  'INVESTIGATIVE_REPORT',   // Weight: 3 (Independent journalistic audits)
  'SECONDARY_NEWS',         // Weight: 2 (Mainstream news coverage)
  'DISPUTED'                // Weight: 1 (Unverified or contested claims)
]);

export const SOURCE_TIER_WEIGHTS = Object.freeze({
  PRIMARY_REGULATORY: 5,
  OFFICIAL_PRESS_RELEASE: 4,
  INVESTIGATIVE_REPORT: 3,
  SECONDARY_NEWS: 2,
  DISPUTED: 1
});

export const FUNDING_SOURCE_TYPES = Object.freeze([
  'PERSONAL_DIRECT',          // A public source attributes the donation directly to the individual
  'PERSONAL_FUNDS_CONFIRMED', // The source explicitly establishes that personal funds were used
  'FOUNDATION',               // The foundation / charitable organization made the donation
  'CORPORATE',                // A company made the donation
  'DAF',                      // Donation was made through a donor-advised fund
  'PLEDGE',                   // A commitment rather than a completed transfer
  'UNKNOWN_SOURCE'            // Donor relationship known or suspected, but actual funding source cannot be established
]);

export const VERIFICATION_STATUSES = Object.freeze([
  'DISCOVERED',         // Ingested / discovered from source, pending audit
  'UNVERIFIED',         // Publicly reported but uncorroborated by primary documentation
  'PARTIALLY_VERIFIED', // Cross-referenced with recipient disclosure or secondary citation
  'VERIFIED',           // Audited against primary regulatory filing (SEC Form 4, 990)
  'DISPUTED'            // Contested or repudiated claim
]);

export const VERIFICATION_STATUS_WEIGHTS = Object.freeze({
  VERIFIED: 5,
  PARTIALLY_VERIFIED: 4,
  UNVERIFIED: 3,
  PENDING: 3,           // Alias for backward compatibility
  DISCOVERED: 2,
  DISPUTED: 1
});

export const WEALTH_CONFIDENCE_LEVELS = Object.freeze([
  'HIGH',
  'MEDIUM',
  'ESTIMATE',
  'DISPUTED'
]);

export const WEALTH_CONFIDENCE_WEIGHTS = Object.freeze({
  HIGH: 4,
  MEDIUM: 3,
  ESTIMATE: 2,
  DISPUTED: 1
});

/**
 * Creates a normalized PERSON record
 */
export function createNormalizedPerson({
  canonical_name,
  first_name = null,
  last_name = null,
  aliases = [],
  country = null,
  birth_date = null,
  occupation = null,
  industry = null,
  description = null,
  is_billionaire = true,
  identifiers = {}
} = {}) {
  return {
    entity_type: ENTITY_TYPES.PERSON,
    canonical_name: canonical_name ? String(canonical_name).trim() : '',
    first_name: first_name ? String(first_name).trim() : null,
    last_name: last_name ? String(last_name).trim() : null,
    aliases: Array.isArray(aliases)
      ? Array.from(new Set(aliases.map(a => String(a).trim()).filter(Boolean)))
      : [],
    country: country ? String(country).trim() : null,
    birth_date: birth_date ? String(birth_date).trim().split('T')[0] : null,
    occupation: occupation ? String(occupation).trim() : null,
    industry: industry ? String(industry).trim() : null,
    description: description ? String(description).trim() : null,
    is_billionaire: Boolean(is_billionaire),
    identifiers: {
      wikidata_id: identifiers.wikidata_id ? String(identifiers.wikidata_id).trim() : null,
      forbes_id: identifiers.forbes_id ? String(identifiers.forbes_id).trim() : null,
      bloomberg_id: identifiers.bloomberg_id ? String(identifiers.bloomberg_id).trim() : null,
      ...identifiers
    }
  };
}

/**
 * Creates a normalized ORGANIZATION record
 */
export function createNormalizedOrganization({
  legal_name,
  display_name = null,
  organization_type = 'CHARITY',
  ein = null,
  cik = null,
  country = null,
  website = null,
  description = null
} = {}) {
  return {
    entity_type: ENTITY_TYPES.ORGANIZATION,
    legal_name: legal_name ? String(legal_name).trim() : '',
    display_name: display_name ? String(display_name).trim() : (legal_name ? String(legal_name).trim() : ''),
    organization_type: ORGANIZATION_TYPES.includes(organization_type) ? organization_type : 'OTHER',
    ein: ein ? cleanEin(ein) : null,
    cik: cik ? cleanCik(cik) : null,
    country: country ? String(country).trim() : null,
    website: website ? cleanUrl(website) : null,
    description: description ? String(description).trim() : null
  };
}

/**
 * Creates a normalized SOURCE record
 */
export function createNormalizedSource({
  url,
  publisher,
  title,
  source_type = 'SECONDARY_NEWS',
  published_at = null,
  accessed_at = null,
  notes = null
} = {}) {
  return {
    entity_type: ENTITY_TYPES.SOURCE,
    url: cleanUrl(url),
    publisher: publisher ? String(publisher).trim() : 'Unknown Publisher',
    title: title ? String(title).trim() : 'Untitled Document',
    source_type: SOURCE_TIERS.includes(source_type) ? source_type : 'SECONDARY_NEWS',
    published_at: published_at ? String(published_at).trim().split('T')[0] : null,
    accessed_at: accessed_at || new Date().toISOString(),
    notes: notes ? String(notes).trim() : null
  };
}

/**
 * Creates a normalized WEALTH SNAPSHOT record
 */
export function createNormalizedWealthSnapshot({
  person_name = null,
  person_id = null,
  snapshot_date,
  net_worth,
  currency = 'USD',
  source_url = null,
  source_id = null,
  source_name = 'Historical Wealth Index',
  confidence = 'HIGH'
} = {}) {
  return {
    entity_type: ENTITY_TYPES.WEALTH_SNAPSHOT,
    person_name: person_name ? String(person_name).trim() : null,
    person_id: person_id || null,
    snapshot_date: snapshot_date ? String(snapshot_date).trim().split('T')[0] : null,
    net_worth: Number(net_worth),
    currency: currency ? String(currency).trim().toUpperCase() : 'USD',
    source_url: source_url ? cleanUrl(source_url) : null,
    source_id: source_id || null,
    source_name: source_name ? String(source_name).trim() : 'Historical Wealth Index',
    confidence: WEALTH_CONFIDENCE_LEVELS.includes(confidence) ? confidence : 'HIGH'
  };
}

/**
 * Creates a normalized DONATION record
 */
export function createNormalizedDonation({
  donor_person_name = null,
  donor_person_id = null,
  donor_organization_name = null,
  donor_organization_id = null,
  recipient_person_name = null,
  recipient_person_id = null,
  recipient_organization_name = null,
  recipient_organization_id = null,
  amount,
  currency = 'USD',
  donation_date,
  donation_type = 'GIFT',
  funding_source_type = 'PERSONAL_DIRECT',
  status = 'VERIFIED',
  description = null,
  cause_category = null,
  source_url = null,
  source_id = null,
  corroborating_source_urls = []
} = {}) {
  return {
    entity_type: ENTITY_TYPES.DONATION,
    donor_person_name: donor_person_name ? String(donor_person_name).trim() : null,
    donor_person_id: donor_person_id || null,
    donor_organization_name: donor_organization_name ? String(donor_organization_name).trim() : null,
    donor_organization_id: donor_organization_id || null,
    recipient_person_name: recipient_person_name ? String(recipient_person_name).trim() : null,
    recipient_person_id: recipient_person_id || null,
    recipient_organization_name: recipient_organization_name ? String(recipient_organization_name).trim() : null,
    recipient_organization_id: recipient_organization_id || null,
    amount: Number(amount),
    currency: currency ? String(currency).trim().toUpperCase() : 'USD',
    donation_date: donation_date ? String(donation_date).trim().split('T')[0] : null,
    donation_type: donation_type ? String(donation_type).trim().toUpperCase() : 'GIFT',
    funding_source_type: FUNDING_SOURCE_TYPES.includes(funding_source_type) ? funding_source_type : 'UNKNOWN_SOURCE',
    status: VERIFICATION_STATUSES.includes(status) ? status : (status === 'PENDING' ? 'UNVERIFIED' : 'UNVERIFIED'),
    description: description ? String(description).trim() : null,
    cause_category: cause_category ? String(cause_category).trim() : null,
    source_url: source_url ? cleanUrl(source_url) : null,
    source_id: source_id || null,
    corroborating_source_urls: Array.isArray(corroborating_source_urls)
      ? Array.from(new Set(corroborating_source_urls.map(cleanUrl).filter(Boolean)))
      : []
  };
}

/**
 * Strips tracking parameters, lowercases host, and standardizes URL
 */
export function cleanUrl(rawUrl) {
  if (!rawUrl) return null;
  try {
    const trimmed = String(rawUrl).trim();
    const hasScheme = /^https?:\/\//i.test(trimmed);
    const parsed = new URL(hasScheme ? trimmed : `https://${trimmed}`);
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    
    // Strip common tracking and session parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid'
    ];
    for (const param of trackingParams) {
      parsed.searchParams.delete(param);
    }
    
    let result = parsed.toString();
    // Remove trailing slash if only the domain is present
    if (parsed.pathname === '/' && !parsed.search && !parsed.hash) {
      result = `${parsed.protocol}//${parsed.hostname}`;
    }
    return result;
  } catch (err) {
    return String(rawUrl).trim();
  }
}

/**
 * Standardizes 9-digit US EIN into XX-XXXXXXX format
 */
export function cleanEin(rawEin) {
  if (!rawEin) return null;
  const digits = String(rawEin).replace(/\D/g, '');
  if (digits.length !== 9) return null;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

/**
 * Standardizes SEC CIK into zero-padded 10-digit format
 */
export function cleanCik(rawCik) {
  if (!rawCik) return null;
  const digits = String(rawCik).replace(/\D/g, '');
  if (digits.length === 0 || digits.length > 10) return null;
  return digits.padStart(10, '0');
}
