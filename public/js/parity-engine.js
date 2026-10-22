/**
 * NoCharity Advanced Mode — Historical Wealth-Aware Parity Engine (Phase 3)
 * 
 * Central Principle:
 * A donation must be compared against the billionaire's estimated wealth at the
 * time of the donation, not their current wealth.
 * 
 * Rules:
 * 1. Strictly prioritize snapshots on or before the donation date.
 * 2. Never use a future wealth snapshot for a historical donation.
 * 3. Never silently fall back to today's net worth.
 * 4. Tiers of wealth_snapshot_quality:
 *    - EXACT_DATE: same calendar date (0 days)
 *    - NEAR_DATE: 1–90 days before donation
 *    - SAME_YEAR: more than 90 days before donation but within the same calendar year
 *    - APPROXIMATE: more than 1 year (or outside same calendar year) up to 3 years (1095 days) before donation
 *    - UNAVAILABLE: no qualifying snapshot within 3 years, missing data, or net worth <= 0
 * 5. Do not round internally; use precise numeric calculations.
 * 6. USD is the canonical dataset currency; display conversion is separated from source ratio.
 * 7. Support explicit user income choice: monthly vs annual.
 */

export const QUALITY_TIERS = Object.freeze({
  EXACT_DATE: 'EXACT_DATE',
  NEAR_DATE: 'NEAR_DATE',
  SAME_YEAR: 'SAME_YEAR',
  APPROXIMATE: 'APPROXIMATE',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const QUALITY_METADATA = Object.freeze({
  EXACT_DATE: {
    code: 'EXACT_DATE',
    label: 'Exact Date',
    badgeClass: 'badge-exact',
    statusClass: 'status-green',
    icon: '🎯',
    description: 'Wealth snapshot matches the exact calendar date of the donation.'
  },
  NEAR_DATE: {
    code: 'NEAR_DATE',
    label: 'Near Date (≤ 90d)',
    badgeClass: 'badge-near',
    statusClass: 'status-blue',
    icon: '⏱️',
    description: 'Wealth snapshot recorded 1–90 days prior to the donation.'
  },
  SAME_YEAR: {
    code: 'SAME_YEAR',
    label: 'Same Year',
    badgeClass: 'badge-same-year',
    statusClass: 'status-amber',
    icon: '📅',
    description: 'Wealth snapshot recorded earlier in the same calendar year (> 90 days prior).'
  },
  APPROXIMATE: {
    code: 'APPROXIMATE',
    label: 'Historical (Approximate)',
    badgeClass: 'badge-approx',
    statusClass: 'status-orange',
    icon: '⏳',
    description: 'Wealth snapshot recorded 1–3 years prior to donation. Provided as a historical approximation.'
  },
  UNAVAILABLE: {
    code: 'UNAVAILABLE',
    label: 'Parity Unavailable',
    badgeClass: 'badge-unavailable',
    statusClass: 'status-red',
    icon: '⚠️',
    description: 'No verified historical wealth snapshot exists within 3 years prior to donation (future snapshots are rejected).'
  }
});

/**
 * Phase 5 Funding Source Types
 * Both an Array (iterable with .forEach / .includes) and an Object with constant keys.
 */
const _FUNDING_SOURCE_TYPES = [
  'PERSONAL_DIRECT',
  'PERSONAL_FUNDS_CONFIRMED',
  'FOUNDATION',
  'CORPORATE',
  'DAF',
  'PLEDGE',
  'UNKNOWN_SOURCE'
];
_FUNDING_SOURCE_TYPES.forEach(t => { _FUNDING_SOURCE_TYPES[t] = t; });
export const FUNDING_SOURCE_TYPES = Object.freeze(_FUNDING_SOURCE_TYPES);

/**
 * Phase 5 Verification Statuses
 * Both an Array (iterable with .forEach / .includes) and an Object with constant keys.
 */
const _DONATION_STATUSES = [
  'DISCOVERED',
  'UNVERIFIED',
  'PARTIALLY_VERIFIED',
  'VERIFIED',
  'DISPUTED'
];
_DONATION_STATUSES.forEach(s => { _DONATION_STATUSES[s] = s; });
export const DONATION_STATUSES = Object.freeze(_DONATION_STATUSES);

export const FUNDING_SOURCE_METADATA = Object.freeze({
  PERSONAL_FUNDS_CONFIRMED: {
    code: 'PERSONAL_FUNDS_CONFIRMED',
    label: 'Personal Donation (Confirmed Funds)',
    shortLabel: 'Personal donation',
    category: 'PERSONAL',
    badgeClass: 'badge-personal-confirmed',
    badgeColor: 'emerald',
    icon: '👤🔒',
    countsAsPersonal: true,
    isPersonal: true,
    description: "The source explicitly establishes that the individual's personal funds were used."
  },
  PERSONAL_DIRECT: {
    code: 'PERSONAL_DIRECT',
    label: 'Personal Donation (Direct)',
    shortLabel: 'Personal donation',
    category: 'PERSONAL',
    badgeClass: 'badge-personal-direct',
    badgeColor: 'green',
    icon: '👤',
    countsAsPersonal: true,
    isPersonal: true,
    description: 'A public source attributes the donation directly to the individual.'
  },
  FOUNDATION: {
    code: 'FOUNDATION',
    label: 'Foundation Donation',
    shortLabel: 'Foundation donation',
    category: 'FOUNDATION',
    badgeClass: 'badge-foundation',
    badgeColor: 'indigo',
    icon: '🏛️',
    countsAsPersonal: false,
    isPersonal: false,
    description: 'The foundation / charitable organization made the donation.'
  },
  CORPORATE: {
    code: 'CORPORATE',
    label: 'Corporate Donation',
    shortLabel: 'Corporate donation',
    category: 'CORPORATE',
    badgeClass: 'badge-corporate',
    badgeColor: 'amber',
    icon: '🏢',
    countsAsPersonal: false,
    isPersonal: false,
    description: 'A company made the donation from corporate treasury funds.'
  },
  DAF: {
    code: 'DAF',
    label: 'Donor-Advised Fund (DAF)',
    shortLabel: 'DAF transfer',
    category: 'DAF',
    badgeClass: 'badge-daf',
    badgeColor: 'cyan',
    icon: '📑',
    countsAsPersonal: false,
    isPersonal: false,
    description: 'Donation was made through a donor-advised fund.'
  },
  PLEDGE: {
    code: 'PLEDGE',
    label: 'Pledge Commitment',
    shortLabel: 'Pledge commitment',
    category: 'PLEDGE',
    badgeClass: 'badge-pledge',
    badgeColor: 'orange',
    icon: '🤝',
    countsAsPersonal: false,
    isPersonal: false,
    description: 'A commitment rather than a completed transfer.'
  },
  UNKNOWN_SOURCE: {
    code: 'UNKNOWN_SOURCE',
    label: 'Unknown Source',
    shortLabel: 'Unknown source',
    category: 'UNKNOWN',
    badgeClass: 'badge-unknown',
    badgeColor: 'gray',
    icon: '❓',
    countsAsPersonal: false,
    isPersonal: false,
    description: 'The donor relationship is known or suspected, but the actual funding source cannot be established.'
  }
});

export const STATUS_METADATA = Object.freeze({
  VERIFIED: {
    code: 'VERIFIED',
    label: 'Verified',
    badgeClass: 'badge-verified',
    badgeColor: 'green',
    icon: '✅',
    description: 'Audited against primary regulatory filings (SEC Form 4, 990) or audited statements.'
  },
  PARTIALLY_VERIFIED: {
    code: 'PARTIALLY_VERIFIED',
    label: 'Partially Verified',
    badgeClass: 'badge-partially-verified',
    badgeColor: 'blue',
    icon: '🔍',
    description: 'Cross-referenced with recipient disclosure or secondary citation.'
  },
  UNVERIFIED: {
    code: 'UNVERIFIED',
    label: 'Unverified',
    badgeClass: 'badge-unverified',
    badgeColor: 'amber',
    icon: '⏳',
    description: 'Publicly reported but uncorroborated by primary documentation.'
  },
  DISCOVERED: {
    code: 'DISCOVERED',
    label: 'Discovered',
    verificationBadge: 'Potential donation — verification required',
    candidateNotice: 'Potential donation — verification required',
    badgeClass: 'badge-discovered',
    badgeColor: 'amber',
    icon: '📡',
    description: 'Potential donation discovered from public media reports; verification and audit required before inclusion in confirmed personal giving.'
  },
  DISPUTED: {
    code: 'DISPUTED',
    label: 'Disputed',
    badgeClass: 'badge-disputed',
    badgeColor: 'red',
    icon: '⚠️',
    description: 'Contested or repudiated claim.'
  }
});

/**
 * Validates whether a donation is eligible for default personal parity calculations.
 * 
 * Rules:
 * A donation is eligible for personal parity calculation ONLY when:
 * 1. funding_source_type is PERSONAL_DIRECT or PERSONAL_FUNDS_CONFIRMED
 * 2. and not merely a PLEDGE
 * 3. and not DISPUTED
 */
export function isPersonalParityEligible(donationOrType, status = null) {
  let fundingSourceType = null;
  let donationStatus = null;

  if (typeof donationOrType === 'string') {
    fundingSourceType = donationOrType;
    donationStatus = status;
  } else if (donationOrType && typeof donationOrType === 'object') {
    fundingSourceType = donationOrType.funding_source_type || donationOrType.fundingSourceType;
    donationStatus = status || donationOrType.status || donationOrType.verification_status;
  }

  const meta = (fundingSourceType && FUNDING_SOURCE_METADATA[fundingSourceType]) || FUNDING_SOURCE_METADATA.UNKNOWN_SOURCE;

  // 1. Check status
  if (donationStatus === 'DISPUTED') {
    return {
      isEligible: false,
      code: 'DISPUTED_RECORD',
      reason: 'Donation claim is DISPUTED and cannot be used for truthful parity calculations.',
      category: meta.category,
      countsAsPersonal: false
    };
  }

  // 2. Check pledge
  if (fundingSourceType === 'PLEDGE') {
    return {
      isEligible: false,
      code: 'PLEDGE_COMMITMENT',
      reason: 'Pledge commitment: Unfulfilled commitments are excluded from personal giving calculations.',
      category: 'PLEDGE',
      countsAsPersonal: false
    };
  }

  // 3. Check foundation
  if (fundingSourceType === 'FOUNDATION') {
    return {
      isEligible: false,
      code: 'FOUNDATION_GIVING',
      reason: 'Foundation donation: Disbursed from foundation assets; corporate and foundation gifts are excluded from personal giving calculations.',
      category: 'FOUNDATION',
      countsAsPersonal: false
    };
  }

  // 4. Check corporate
  if (fundingSourceType === 'CORPORATE') {
    return {
      isEligible: false,
      code: 'CORPORATE_GIVING',
      reason: 'Corporate donation: Funded by company treasury; corporate gifts are excluded from personal giving calculations.',
      category: 'CORPORATE',
      countsAsPersonal: false
    };
  }

  // 5. Check DAF
  if (fundingSourceType === 'DAF') {
    return {
      isEligible: false,
      code: 'DAF_TRANSFER',
      reason: 'Donor-Advised Fund (DAF) transfer: Intermediary fund allocations are excluded from default personal giving calculations.',
      category: 'DAF',
      countsAsPersonal: false
    };
  }

  // 6. Check unknown source
  if (fundingSourceType === 'UNKNOWN_SOURCE') {
    return {
      isEligible: false,
      code: 'UNKNOWN_FUNDING_SOURCE',
      reason: 'Unknown funding source: Unestablished attribution prevents truthful personal giving parity calculations.',
      category: 'UNKNOWN',
      countsAsPersonal: false
    };
  }

  // 7. Check personal direct or confirmed
  if (fundingSourceType === 'PERSONAL_DIRECT' || fundingSourceType === 'PERSONAL_FUNDS_CONFIRMED') {
    return {
      isEligible: true,
      code: 'ELIGIBLE_PERSONAL',
      reason: fundingSourceType === 'PERSONAL_FUNDS_CONFIRMED'
        ? 'Verified personal funds confirmed from individual assets.'
        : 'Direct personal donation attributed to the individual.',
      category: 'PERSONAL',
      countsAsPersonal: true
    };
  }

  // Default fallback if unknown type passed
  return {
    isEligible: false,
    code: 'INELIGIBLE_ATTRIBUTION',
    reason: `Funding source type "${fundingSourceType}" is not eligible for personal parity calculation.`,
    category: meta.category,
    countsAsPersonal: false
  };
}

/**
 * Parses a date string or Date object into a UTC calendar date representation.
 * Prevents timezone off-by-one errors across environments.
 */
export function parseCalendarDate(val) {
  if (!val) return null;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return {
      year: val.getUTCFullYear(),
      month: val.getUTCMonth() + 1,
      day: val.getUTCDate(),
      utcTimestamp: Date.UTC(val.getUTCFullYear(), val.getUTCMonth(), val.getUTCDate()),
      isoString: val.toISOString().split('T')[0]
    };
  }

  const str = String(val).trim().split('T')[0];
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return {
      year,
      month,
      day,
      utcTimestamp: Date.UTC(year, month - 1, day),
      isoString: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    };
  }

  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    utcTimestamp: Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    isoString: d.toISOString().split('T')[0]
  };
}

/**
 * Calculates calendar day difference (endDate - startDate).
 * Positive means endDate is after startDate.
 */
export function calculateDaysBetween(startDate, endDate) {
  const s = parseCalendarDate(startDate);
  const e = parseCalendarDate(endDate);
  if (!s || !e) return null;
  return Math.round((e.utcTimestamp - s.utcTimestamp) / 86400000);
}

/**
 * Classifies the quality tier of a historical wealth snapshot relative to a donation date.
 */
export function classifySnapshotQuality(snapshotDate, donationDate, netWorth) {
  const numericNetWorth = Number(netWorth);
  if (!snapshotDate || !donationDate || !isFinite(numericNetWorth) || numericNetWorth <= 0) {
    return {
      quality: QUALITY_TIERS.UNAVAILABLE,
      daysDiff: null,
      reason: !snapshotDate || !donationDate
        ? 'Missing snapshot date or donation date'
        : 'Net worth must be a positive number'
    };
  }

  const s = parseCalendarDate(snapshotDate);
  const d = parseCalendarDate(donationDate);
  if (!s || !d) {
    return {
      quality: QUALITY_TIERS.UNAVAILABLE,
      daysDiff: null,
      reason: 'Invalid date format'
    };
  }

  const daysDiff = Math.round((d.utcTimestamp - s.utcTimestamp) / 86400000);

  // Strictly enforce: Never use a future wealth snapshot for a historical donation
  if (daysDiff < 0) {
    return {
      quality: QUALITY_TIERS.UNAVAILABLE,
      daysDiff,
      reason: `Snapshot date (${s.isoString}) is after donation date (${d.isoString}). Future snapshots are rejected.`
    };
  }

  // Exact calendar date: same day
  if (daysDiff === 0) {
    return {
      quality: QUALITY_TIERS.EXACT_DATE,
      daysDiff,
      reason: 'Wealth snapshot matches the donation date exactly.'
    };
  }

  // Near date: 1 to 90 days before donation
  if (daysDiff <= 90) {
    return {
      quality: QUALITY_TIERS.NEAR_DATE,
      daysDiff,
      reason: `Wealth snapshot is within ${daysDiff} day(s) before donation (≤ 90 days).`
    };
  }

  // Same year: more than 90 days before donation but within same calendar year
  if (s.year === d.year) {
    return {
      quality: QUALITY_TIERS.SAME_YEAR,
      daysDiff,
      reason: `Wealth snapshot recorded in the same calendar year (${s.year}), ${daysDiff} days prior.`
    };
  }

  // Approximate: more than 1 year (or different year >90 days) up to 3 years (1095 days)
  if (daysDiff <= 1095) {
    return {
      quality: QUALITY_TIERS.APPROXIMATE,
      daysDiff,
      reason: `Wealth snapshot is ${daysDiff} days prior (~${(daysDiff / 365).toFixed(1)} years). Historical estimate is approximate.`
    };
  }

  // Unavailable: older than 3 years
  return {
    quality: QUALITY_TIERS.UNAVAILABLE,
    daysDiff,
    reason: `Wealth snapshot is ${daysDiff} days prior (> 3 years). Comparison unavailable.`
  };
}

/**
 * Searches a list of wealth snapshots to find the closest valid snapshot at or before the donation date.
 */
export function findClosestHistoricalWealthSnapshot(snapshots, donationDate) {
  if (!Array.isArray(snapshots) || snapshots.length === 0 || !donationDate) {
    return {
      snapshot: null,
      netWorth: null,
      currency: 'USD',
      quality: QUALITY_TIERS.UNAVAILABLE,
      daysDiff: null,
      reason: 'No wealth snapshots provided or donation date missing.'
    };
  }

  const parsedDonation = parseCalendarDate(donationDate);
  if (!parsedDonation) {
    return {
      snapshot: null,
      netWorth: null,
      currency: 'USD',
      quality: QUALITY_TIERS.UNAVAILABLE,
      daysDiff: null,
      reason: 'Invalid donation date.'
    };
  }

  // Filter strictly for snapshots on or before donation date with positive net worth
  const candidates = [];
  for (const s of snapshots) {
    if (!s) continue;
    const nw = Number(s.net_worth !== undefined ? s.net_worth : s.netWorth);
    if (!isFinite(nw) || nw <= 0) continue;

    const rawDate = s.snapshot_date || s.snapshotDate || s.date;
    const parsedS = parseCalendarDate(rawDate);
    if (!parsedS) continue;

    const daysDiff = Math.round((parsedDonation.utcTimestamp - parsedS.utcTimestamp) / 86400000);
    // Exclude future snapshots (daysDiff < 0)
    if (daysDiff >= 0) {
      candidates.push({
        raw: s,
        parsedDate: parsedS,
        daysDiff,
        netWorth: nw,
        currency: s.currency || 'USD',
        sourceName: s.source_name || s.sourceName || s.source || 'Historical Wealth Index'
      });
    }
  }

  if (candidates.length === 0) {
    return {
      snapshot: null,
      netWorth: null,
      currency: 'USD',
      quality: QUALITY_TIERS.UNAVAILABLE,
      daysDiff: null,
      reason: 'No qualifying wealth snapshot found on or before the donation date.'
    };
  }

  // Sort ascending by daysDiff (closest prior snapshot first)
  candidates.sort((a, b) => a.daysDiff - b.daysDiff);
  const closest = candidates[0];

  const classification = classifySnapshotQuality(
    closest.parsedDate.isoString,
    parsedDonation.isoString,
    closest.netWorth
  );

  return {
    snapshot: closest.raw,
    netWorth: closest.netWorth,
    currency: closest.currency,
    sourceName: closest.sourceName,
    snapshotDate: closest.parsedDate.isoString,
    quality: classification.quality,
    daysDiff: closest.daysDiff,
    reason: classification.reason
  };
}

/**
 * Format helper for numbers without scientific notation
 */
export function formatCurrencyAmount(amount, currency = '$') {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  const num = Number(amount);
  const abs = Math.abs(num);

  if (abs >= 1_000_000_000_000) {
    return `${currency}${(num / 1_000_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} Trillion`;
  }
  if (abs >= 1_000_000_000) {
    return `${currency}${(num / 1_000_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} Billion`;
  }
  if (abs >= 1_000_000) {
    return `${currency}${(num / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} Million`;
  }
  if (abs >= 1_000) {
    return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${currency}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a ratio percentage with dynamic precision
 */
export function formatRatio(ratio) {
  if (ratio === null || ratio === undefined || isNaN(ratio)) return 'N/A';
  const num = Number(ratio);
  if (num === 0) return '0%';
  if (num >= 1) {
    return `${num.toFixed(2)}%`;
  }
  if (num >= 0.01) {
    const twoDec = num.toFixed(2);
    if (Math.abs(Number(twoDec) - num) < 1e-6) {
      return `${twoDec}%`;
    }
    return `${num.toFixed(4)}%`;
  }
  if (num >= 0.0001) {
    return `${num.toFixed(6)}%`;
  }
  return `${num.toExponential(4)}%`;
}

/**
 * Core Historical Wealth-Aware Calculation Engine
 * 
 * Compares donation against estimated historical wealth at donation date.
 * Calculates user equivalent sacrifice based on chosen income (monthly or annual).
 */
export function calculateHistoricalDonationParity({
  donationAmount,
  donationDate,
  snapshots = null,
  historicalNetWorth = null,
  snapshotDate = null,
  fundingSourceType = null,
  funding_source_type = null,
  status = null,
  verificationStatus = null,
  userNetWorth = undefined,
  user_net_worth = undefined,
  monthlyIncome = undefined,
  userMonthlyIncome = undefined,
  userIncome = undefined,
  incomeFrequency = 'monthly', // 'monthly' | 'annual'
  sourceCurrency = 'USD',
  userCurrency = '₹',
  displayExchangeRate = null // Optional explicit multiplier for display only
} = {}) {
  const numericDonation = Number(donationAmount);

  // 1. Resolve User Financial Context
  const rawNetWorth = userNetWorth !== undefined ? userNetWorth : user_net_worth;
  const hasExplicitNetWorth = rawNetWorth !== undefined && rawNetWorth !== null;
  const parsedNetWorth = hasExplicitNetWorth ? parseFloat(rawNetWorth) : null;
  const numericUserNetWorth = (hasExplicitNetWorth && !isNaN(parsedNetWorth)) ? parsedNetWorth : null;

  const rawMonthlyIncome = monthlyIncome !== undefined ? monthlyIncome : (userMonthlyIncome !== undefined ? userMonthlyIncome : undefined);
  const hasExplicitMonthlyIncome = rawMonthlyIncome !== undefined && rawMonthlyIncome !== null;
  const parsedMonthlyIncome = hasExplicitMonthlyIncome ? parseFloat(rawMonthlyIncome) : (userIncome !== undefined ? parseFloat(userIncome) : null);
  const numericMonthlyIncome = (parsedMonthlyIncome !== null && !isNaN(parsedMonthlyIncome)) ? parsedMonthlyIncome : null;

  // Legacy fallback flag for older Phase 3 / Phase 9 tests that provided userIncome without userNetWorth
  const isLegacyMode = !hasExplicitNetWorth && userIncome !== undefined && rawMonthlyIncome === undefined;
  const numericLegacyIncome = userIncome !== undefined ? Number(userIncome) : 60000;
  const normalizedFrequency = String(incomeFrequency || 'monthly').toLowerCase() === 'annual' ? 'annual' : 'monthly';

  // Resolve Phase 5 funding source type and status
  const fundingSource = fundingSourceType || funding_source_type;
  const donationStatus = status || verificationStatus;
  const eligibility = fundingSource ? isPersonalParityEligible(fundingSource, donationStatus) : { isEligible: true, countsAsPersonal: true };
  const fundingSourceMeta = fundingSource ? (FUNDING_SOURCE_METADATA[fundingSource] || FUNDING_SOURCE_METADATA.UNKNOWN_SOURCE) : null;
  const statusMeta = donationStatus ? (STATUS_METADATA[donationStatus] || STATUS_METADATA.UNVERIFIED) : null;

  // 2. Resolve wealth snapshot and quality tier
  let resolvedNetWorth = null;
  let resolvedSnapshotDate = null;
  let resolvedSnapshot = null;
  let quality = QUALITY_TIERS.UNAVAILABLE;
  let daysDiff = null;
  let reason = '';
  let sourceName = 'Historical Wealth Index';

  if (Array.isArray(snapshots) && snapshots.length > 0) {
    const lookup = findClosestHistoricalWealthSnapshot(snapshots, donationDate);
    resolvedSnapshot = lookup.snapshot;
    resolvedNetWorth = lookup.netWorth;
    resolvedSnapshotDate = lookup.snapshotDate;
    quality = lookup.quality;
    daysDiff = lookup.daysDiff;
    reason = lookup.reason;
    if (lookup.sourceName) sourceName = lookup.sourceName;
    if (lookup.currency) sourceCurrency = lookup.currency;
  } else if (historicalNetWorth !== null && historicalNetWorth !== undefined) {
    resolvedNetWorth = Number(historicalNetWorth);
    resolvedSnapshotDate = snapshotDate || donationDate;
    const classification = classifySnapshotQuality(resolvedSnapshotDate, donationDate, resolvedNetWorth);
    quality = classification.quality;
    daysDiff = classification.daysDiff;
    reason = classification.reason;
  } else {
    quality = QUALITY_TIERS.UNAVAILABLE;
    reason = 'No wealth data provided.';
  }

  // 3. Validate eligibility and availability
  if (fundingSource && !eligibility.isEligible) {
    const qualityMetadata = QUALITY_METADATA[quality] || QUALITY_METADATA.UNAVAILABLE;
    return {
      isAvailable: false,
      isEligible: false,
      eligibilityCode: eligibility.code,
      ineligibilityReason: eligibility.reason,
      quality,
      qualityMetadata,
      daysDiff,
      reason: eligibility.reason,
      donationAmount: numericDonation,
      donationDate: donationDate ? String(donationDate).split('T')[0] : null,
      fundingSourceType: fundingSource,
      fundingSourceMetadata: fundingSourceMeta,
      status: donationStatus,
      statusMetadata: statusMeta,
      historicalNetWorth: resolvedNetWorth,
      snapshotDate: resolvedSnapshotDate,
      sourceCurrency,
      historicalGenerosityRatio: null,
      formattedRatio: 'N/A',
      userNetWorth: numericUserNetWorth,
      hasNetWorth: hasExplicitNetWorth && numericUserNetWorth !== null,
      monthlyIncome: numericMonthlyIncome,
      hasMonthlyIncome: numericMonthlyIncome !== null && numericMonthlyIncome > 0,
      userIncome: numericMonthlyIncome || numericLegacyIncome,
      incomeFrequency: normalizedFrequency,
      userCurrency,
      userEquivalent: null,
      userEquivalentMonthly: null,
      userEquivalentAnnual: null,
      formattedUserEquivalent: 'N/A',
      incomeSharePercentage: null,
      formattedIncomeShare: null,
      incomeDaysEquivalent: null,
      incomeInterpretation: null,
      statementRatio: 'Historical wealth comparison unavailable.',
      statementEquivalent: 'Direct comparison requires verified personal giving eligibility.',
      statement_ratio: 'Historical wealth comparison unavailable.',
      statement_equivalent: 'Direct comparison requires verified personal giving eligibility.',
      humorCopy: 'Give yourself a rough net worth estimate — what you own minus what you owe.',
      explanation: eligibility.reason,
      sourceName
    };
  }

  const isAvailable = (
    quality !== QUALITY_TIERS.UNAVAILABLE &&
    isFinite(numericDonation) &&
    numericDonation >= 0 &&
    isFinite(resolvedNetWorth) &&
    resolvedNetWorth > 0
  );

  const qualityMetadata = QUALITY_METADATA[quality] || QUALITY_METADATA.UNAVAILABLE;

  if (!isAvailable) {
    return {
      isAvailable: false,
      isEligible: eligibility.isEligible,
      quality,
      qualityMetadata,
      daysDiff,
      reason,
      donationAmount: numericDonation,
      donationDate: donationDate ? String(donationDate).split('T')[0] : null,
      fundingSourceType: fundingSource,
      fundingSourceMetadata: fundingSourceMeta,
      status: donationStatus,
      statusMetadata: statusMeta,
      historicalNetWorth: null,
      snapshotDate: resolvedSnapshotDate,
      sourceCurrency,
      historicalGenerosityRatio: null,
      formattedRatio: 'N/A',
      userNetWorth: numericUserNetWorth,
      hasNetWorth: hasExplicitNetWorth && numericUserNetWorth !== null,
      monthlyIncome: numericMonthlyIncome,
      hasMonthlyIncome: numericMonthlyIncome !== null && numericMonthlyIncome > 0,
      userIncome: numericMonthlyIncome || numericLegacyIncome,
      incomeFrequency: normalizedFrequency,
      userCurrency,
      userEquivalent: null,
      userEquivalentMonthly: null,
      userEquivalentAnnual: null,
      formattedUserEquivalent: 'N/A',
      incomeSharePercentage: null,
      formattedIncomeShare: null,
      incomeDaysEquivalent: null,
      incomeInterpretation: null,
      statementRatio: 'Historical wealth comparison unavailable.',
      statementEquivalent: 'Direct comparison requires verified historical net worth and estimated user net worth.',
      statement_ratio: 'Historical wealth comparison unavailable.',
      statement_equivalent: 'Direct comparison requires verified historical net worth and estimated user net worth.',
      humorCopy: 'Give yourself a rough net worth estimate — what you own minus what you owe.',
      explanation: reason || 'Historical wealth comparison is unavailable for this donation.',
      sourceName
    };
  }

  // 4. Calculate historical generosity ratio (unrounded float)
  // Formula: historical_generosity_ratio = (donation_amount / historical_net_worth) * 100
  const historicalGenerosityRatio = (numericDonation / resolvedNetWorth) * 100;
  const formattedRatio = formatRatio(historicalGenerosityRatio);

  // 5. Primary Calculation (Wealth-to-Wealth Comparison)
  // Formula: user_equivalent = user's estimated net worth * (historical_generosity_ratio / 100)
  let userEquivalent = null;
  let formattedUserEquivalent = 'N/A';
  let isZeroOrNegativeNetWorth = false;
  let netWorthStatus = 'MISSING'; // 'POSITIVE' | 'ZERO' | 'NEGATIVE' | 'MISSING' | 'LEGACY_INCOME_FALLBACK'

  if (numericUserNetWorth !== null) {
    if (numericUserNetWorth < 0) {
      userEquivalent = 0;
      formattedUserEquivalent = formatCurrencyAmount(0, userCurrency);
      isZeroOrNegativeNetWorth = true;
      netWorthStatus = 'NEGATIVE';
    } else if (numericUserNetWorth === 0) {
      userEquivalent = 0;
      formattedUserEquivalent = formatCurrencyAmount(0, userCurrency);
      isZeroOrNegativeNetWorth = true;
      netWorthStatus = 'ZERO';
    } else {
      userEquivalent = numericUserNetWorth * (historicalGenerosityRatio / 100);
      formattedUserEquivalent = formatCurrencyAmount(userEquivalent, userCurrency);
      isZeroOrNegativeNetWorth = false;
      netWorthStatus = 'POSITIVE';
    }
  } else if (isLegacyMode) {
    userEquivalent = numericLegacyIncome * (historicalGenerosityRatio / 100);
    formattedUserEquivalent = formatCurrencyAmount(userEquivalent, userCurrency);
    netWorthStatus = 'LEGACY_INCOME_FALLBACK';
  } else {
    userEquivalent = null;
    formattedUserEquivalent = 'N/A';
    netWorthStatus = 'MISSING';
  }

  // 6. Contextual Monthly Income Interpretation
  // Monthly income translates the wealth-equivalent amount into an income-based interpretation
  let incomeSharePercentage = null;
  let formattedIncomeShare = null;
  let incomeDaysEquivalent = null;
  let incomeInterpretation = null;

  if (numericMonthlyIncome && numericMonthlyIncome > 0) {
    if (userEquivalent !== null && userEquivalent >= 0) {
      if (userEquivalent === 0) {
        incomeSharePercentage = 0;
        formattedIncomeShare = '0%';
        incomeDaysEquivalent = 0;
        if (netWorthStatus === 'NEGATIVE') {
          incomeInterpretation = `With debts exceeding assets, your estimated net worth is negative. Relinquishing ${formattedRatio} yields ${userCurrency}0 in deployable sacrifice.`;
        } else {
          incomeInterpretation = `At zero estimated net worth, your wealth equivalent is ${userCurrency}0. You have matched the billionaire's sacrifice without touching your monthly paycheck.`;
        }
      } else {
        incomeSharePercentage = (userEquivalent / numericMonthlyIncome) * 100;
        formattedIncomeShare = incomeSharePercentage >= 1
          ? `${Math.round(incomeSharePercentage)}%`
          : `${incomeSharePercentage.toFixed(1)}%`;

        incomeDaysEquivalent = userEquivalent / (numericMonthlyIncome / 30);
        const roundedDays = Math.round(incomeDaysEquivalent);
        const daysPhrase = roundedDays >= 1
          ? ` (roughly ${roundedDays} days of earnings)`
          : '';

        incomeInterpretation = `That's about ${formattedIncomeShare} of one month's take-home pay${daysPhrase}.`;
      }
    } else {
      // User only provided monthly income, no net worth
      const hypotheticalPaycheckEquivalent = numericMonthlyIncome * (historicalGenerosityRatio / 100);
      incomeSharePercentage = historicalGenerosityRatio;
      formattedIncomeShare = formattedRatio;
      incomeDaysEquivalent = hypotheticalPaycheckEquivalent / (numericMonthlyIncome / 30);
      incomeInterpretation = `Direct wealth comparison requires an estimated net worth. If compared directly against your monthly paycheck (for illustration only), ${formattedRatio} would be ${formatCurrencyAmount(hypotheticalPaycheckEquivalent, userCurrency)}. (Note: comparing wealth to income is conceptually mismatched.)`;
    }
  }

  // Exact Canonical & Natural Language Statements
  const statementRatio = `They gave approximately ${formattedRatio} of their documented wealth at the time.`;
  let statementEquivalent;
  if (userEquivalent !== null) {
    if (isLegacyMode) {
      const freqLabel = normalizedFrequency === 'annual' ? 'year' : 'month';
      statementEquivalent = `For an income of ${userCurrency}${Math.round(numericLegacyIncome).toLocaleString()}/${freqLabel}, that is equivalent to ${formattedUserEquivalent}.`;
    } else {
      statementEquivalent = `That would be ${formattedUserEquivalent} for you.`;
    }
  } else {
    statementEquivalent = 'Direct comparison requires an estimated net worth.';
  }

  let humorCopy;
  if (netWorthStatus === 'NEGATIVE') {
    humorCopy = 'Your debts have officially granted you immunity from philanthropic guilt.';
  } else if (netWorthStatus === 'ZERO') {
    humorCopy = "At zero net worth, you've matched the billionaire's sacrifice for free.";
  } else if (userEquivalent !== null) {
    humorCopy = 'Congratulations. You too can experience the billionaire donation lifestyle.';
  } else {
    humorCopy = 'Give yourself a rough net worth estimate — what you own minus what you owe.';
  }

  // Derive explicit monthly vs annual equivalents for backwards-compatibility
  let userEquivalentMonthly;
  let userEquivalentAnnual;

  if (isLegacyMode) {
    if (normalizedFrequency === 'monthly') {
      userEquivalentMonthly = userEquivalent;
      userEquivalentAnnual = (numericLegacyIncome * 12) * (historicalGenerosityRatio / 100);
    } else {
      userEquivalentAnnual = userEquivalent;
      userEquivalentMonthly = (numericLegacyIncome / 12) * (historicalGenerosityRatio / 100);
    }
  } else {
    userEquivalentMonthly = userEquivalent;
    userEquivalentAnnual = userEquivalent !== null ? userEquivalent : null;
  }

  // 7. Build display conversion object (never altering source calculations)
  let displayConversion = {
    applied: false,
    sourceCurrency,
    displayCurrency: userCurrency,
    rate: null,
    convertedDonationAmount: null,
    convertedHistoricalNetWorth: null,
    notice: 'Generosity ratio is calculated natively in source USD to prevent currency exchange distortion.'
  };

  if (displayExchangeRate && Number(displayExchangeRate) > 0) {
    const rate = Number(displayExchangeRate);
    displayConversion = {
      applied: true,
      sourceCurrency,
      displayCurrency: userCurrency,
      rate,
      convertedDonationAmount: numericDonation * rate,
      convertedHistoricalNetWorth: resolvedNetWorth * rate,
      notice: `Converted using display multiplier 1 ${sourceCurrency} = ${rate} ${userCurrency}. Generosity ratio remains purely historical.`
    };
  }

  const parsedD = parseCalendarDate(donationDate);
  const donationDateStr = parsedD ? parsedD.isoString : String(donationDate);

  return {
    isAvailable: true,
    isEligible: true,
    quality,
    qualityMetadata,
    daysDiff,
    reason,
    donationAmount: numericDonation,
    donationDate: donationDateStr,
    fundingSourceType: fundingSource,
    fundingSourceMetadata: fundingSourceMeta,
    status: donationStatus,
    statusMetadata: statusMeta,
    historicalNetWorth: resolvedNetWorth,
    snapshotDate: resolvedSnapshotDate,
    sourceCurrency,
    sourceName,
    historicalGenerosityRatio, // Raw, unrounded numeric calculation
    formattedRatio,
    userNetWorth: numericUserNetWorth,
    hasNetWorth: hasExplicitNetWorth && numericUserNetWorth !== null,
    netWorthStatus,
    isZeroOrNegativeNetWorth,
    monthlyIncome: numericMonthlyIncome,
    hasMonthlyIncome: numericMonthlyIncome !== null && numericMonthlyIncome > 0,
    userCurrency,
    userEquivalent, // Raw unrounded wealth-to-wealth equivalent
    formattedUserEquivalent,
    incomeSharePercentage,
    formattedIncomeShare,
    incomeDaysEquivalent,
    incomeInterpretation,
    statementRatio,
    statementEquivalent,
    statement_ratio: statementRatio,
    statement_equivalent: statementEquivalent,
    humorCopy,
    // Legacy fields preserved for complete backwards-compatibility
    userIncome: numericMonthlyIncome || numericLegacyIncome,
    incomeFrequency: normalizedFrequency,
    userEquivalentMonthly,
    userEquivalentAnnual,
    formattedUserEquivalentMonthly: formattedUserEquivalent,
    formattedUserEquivalentAnnual: formattedUserEquivalent,
    displayConversion,
    explanation: `${qualityMetadata.label}: ${reason}`
  };
}

/**
 * Enriches a batch of donations with historical parity calculations.
 */
export function enrichDonationsWithHistoricalParity(donations, wealthSnapshotsByPerson = {}, options = {}) {
  if (!Array.isArray(donations)) return [];

  return donations.map(donation => {
    const personId = donation.donor_person_id || donation.donorPersonId;
    const snapshots = (personId && wealthSnapshotsByPerson[personId]) ? wealthSnapshotsByPerson[personId] : null;
    const fundingSourceType = donation.funding_source_type || donation.fundingSourceType || 'UNKNOWN_SOURCE';
    const status = donation.status || donation.verification_status || 'UNVERIFIED';

    const eligibility = isPersonalParityEligible(fundingSourceType, status);
    const fundingSourceMeta = FUNDING_SOURCE_METADATA[fundingSourceType] || FUNDING_SOURCE_METADATA.UNKNOWN_SOURCE;
    const statusMeta = STATUS_METADATA[status] || STATUS_METADATA.UNVERIFIED;

    const parity = calculateHistoricalDonationParity({
      donationAmount: donation.amount,
      donationDate: donation.donation_date || donation.donationDate || donation.date,
      snapshots,
      historicalNetWorth: donation.historical_net_worth || donation.historicalNetWorth,
      snapshotDate: donation.snapshot_date || donation.snapshotDate,
      fundingSourceType,
      status,
      userNetWorth: options.userNetWorth !== undefined ? options.userNetWorth : options.user_net_worth,
      monthlyIncome: options.monthlyIncome !== undefined ? options.monthlyIncome : options.userMonthlyIncome,
      userIncome: options.userIncome !== undefined ? options.userIncome : 60000,
      incomeFrequency: options.incomeFrequency || 'monthly',
      sourceCurrency: donation.currency || 'USD',
      userCurrency: options.userCurrency || '₹',
      displayExchangeRate: options.displayExchangeRate
    });

    return {
      ...donation,
      funding_source_type: fundingSourceType,
      funding_source_metadata: fundingSourceMeta,
      status,
      status_metadata: statusMeta,
      is_personal_parity_eligible: eligibility.isEligible,
      eligibility_reason: eligibility.reason,
      parity
    };
  });
}
