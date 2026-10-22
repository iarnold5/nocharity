/**
 * NoCharity Advanced Mode — Phase 12: Data Quality & Consistency Layer
 * 
 * Central Mandate:
 * "The goal is not academic perfection. The goal is preventing NoCharity from
 * confidently displaying nonsense."
 * 
 * Core Capabilities:
 * 1. The 8 Essential Questions Evaluator (WHO, WHAT, WHEN, HOW MUCH, FROM WHOM, TO WHOM, SOURCE, HOW CERTAIN).
 * 2. Hard Invariant Validation Rules:
 *    - donation amount must be positive (> 0)
 *    - donation date cannot be invalid
 *    - source should exist for verified records
 *    - personal donation should have a person donor
 *    - corporate donation should have an organization donor
 *    - foundation donation should have an organization donor
 *    - pledge must not count as completed giving
 *    - disputed records must not count in default rankings
 *    - wealth must be positive (> 0)
 *    - currency must be specified
 * 3. Consistency Checks:
 *    - Temporal wealth consistency (e.g. 2018 donation vs 2026 snapshot explicitly marked approximate/unavailable)
 *    - Multi-source disagreement preservation (never silently pick one; preserve and flag)
 * 4. Transparent Quality Scoring & Grading (Grade A, B, C, D / Flagged).
 */

import { parseCalendarDate } from './parity-engine.js';

export const EIGHT_QUESTIONS = Object.freeze({
  WHO: {
    key: 'who',
    label: 'WHO?',
    description: 'Donor identity (person or associated legal entity)'
  },
  WHAT: {
    key: 'what',
    label: 'WHAT?',
    description: 'Nature of gift (monetary, equity, real estate) and stated cause'
  },
  WHEN: {
    key: 'when',
    label: 'WHEN?',
    description: 'Transaction date (ISO YYYY-MM-DD)'
  },
  HOW_MUCH: {
    key: 'how_much',
    label: 'HOW MUCH?',
    description: 'Quantified amount and explicit ISO currency'
  },
  FROM_WHOM: {
    key: 'from_whom',
    label: 'FROM WHOM?',
    description: 'Funding vehicle: personal, private foundation, corporate treasury, DAF, or pledge'
  },
  TO_WHOM: {
    key: 'to_whom',
    label: 'TO WHOM?',
    description: 'Recipient charity, institution, university, or fund'
  },
  SOURCE: {
    key: 'source',
    label: 'SOURCE?',
    description: 'Verifiable regulatory filing (SEC Form 4, 990-PF), official release, or investigative audit'
  },
  HOW_CERTAIN: {
    key: 'how_certain',
    label: 'HOW CERTAIN?',
    description: 'Verification status tier (VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED, DISCOVERED, DISPUTED)'
  }
});

export const QUALITY_GRADES = Object.freeze({
  GRADE_A: {
    grade: 'A',
    label: 'Audited & Complete',
    badgeColor: 'green',
    minScore: 85,
    description: 'Fully audited against primary regulatory filings, meets all 8 questions, zero discrepancies.'
  },
  GRADE_B: {
    grade: 'B',
    label: 'Well-Documented',
    badgeColor: 'blue',
    minScore: 70,
    description: 'Credible public documentation with recipient cross-reference; high data completeness.'
  },
  GRADE_C: {
    grade: 'C',
    label: 'Preliminary / Unverified',
    badgeColor: 'amber',
    minScore: 50,
    description: 'Preliminary media disclosure or approximate valuation benchmark; verification required.'
  },
  GRADE_D: {
    grade: 'D',
    label: 'Flagged / Disputed',
    badgeColor: 'red',
    minScore: 0,
    description: 'Contains source disagreements, contested figures, or fails core validation rules.'
  }
});

/**
 * Evaluates whether a donation record possesses enough metadata to answer the 8 Essential Questions.
 */
export function evaluateEightQuestions(donation) {
  if (!donation || typeof donation !== 'object') {
    return {
      answers: {},
      answered_count: 0,
      total_count: 8,
      completeness_ratio: 0,
      is_complete: false,
      missing_questions: Object.keys(EIGHT_QUESTIONS).map(k => EIGHT_QUESTIONS[k].key)
    };
  }

  // 1. WHO?
  const whoVal = donation.donor_person_name ||
    donation.donor_person?.canonical_name ||
    donation.donor_person?.name ||
    donation.donor_organization_name ||
    donation.donor_organization?.legal_name ||
    donation.donor_organization?.name ||
    donation.billionaireName ||
    donation.billionaire_name ||
    donation.detected_donor?.name ||
    null;

  // 2. WHAT?
  const whatVal = donation.description ||
    donation.donation_type ||
    donation.purpose ||
    donation.headline ||
    (donation.amount ? `Monetary gift of $${Number(donation.amount).toLocaleString()}` : null);

  // 3. WHEN?
  let whenVal = donation.donation_date || donation.donationDate || donation.date || donation.published_at || null;
  if (whenVal && typeof whenVal === 'string') {
    whenVal = whenVal.split('T')[0];
  }

  // 4. HOW MUCH?
  const rawAmt = donation.amount !== undefined ? donation.amount : donation.extracted_amount;
  const numAmt = Number(rawAmt);
  const currency = donation.currency || 'USD';
  const howMuchVal = (isFinite(numAmt) && numAmt > 0) ? `${currency} ${numAmt.toLocaleString()}` : null;

  // 5. FROM WHOM?
  const fromWhomVal = donation.funding_source_type ||
    donation.fundingSourceType ||
    donation.possible_funding_source ||
    null;

  // 6. TO WHOM?
  const toWhomVal = donation.recipient_name ||
    donation.recipient ||
    donation.recipient_organization_name ||
    donation.recipient_person_name ||
    donation.detected_recipient ||
    donation.cause ||
    donation.cause_category ||
    null;

  // 7. SOURCE?
  const sourceVal = donation.source_url ||
    donation.source?.url ||
    donation.citation_url ||
    (Array.isArray(donation.sources) && donation.sources.length > 0 ? (donation.sources[0].url || donation.sources[0].publisher) : null) ||
    donation.source_publisher ||
    donation.source?.publisher ||
    donation.netWorthSourceUrl ||
    null;

  // 8. HOW CERTAIN?
  const howCertainVal = donation.status ||
    donation.verification_status ||
    donation.verificationStatus ||
    (donation.verification_badge ? 'DISCOVERED' : null);

  const answers = {
    who: whoVal ? String(whoVal).trim() : null,
    what: whatVal ? String(whatVal).trim() : null,
    when: whenVal ? String(whenVal).trim() : null,
    how_much: howMuchVal,
    from_whom: fromWhomVal ? String(fromWhomVal).trim() : null,
    to_whom: toWhomVal ? String(toWhomVal).trim() : null,
    source: sourceVal ? String(sourceVal).trim() : null,
    how_certain: howCertainVal ? String(howCertainVal).trim() : null
  };

  const answeredKeys = Object.keys(answers).filter(k => answers[k] !== null && answers[k] !== '');
  const missingKeys = Object.keys(answers).filter(k => answers[k] === null || answers[k] === '');
  const answered_count = answeredKeys.length;
  const completeness_ratio = answered_count / 8;
  const is_complete = answered_count === 8;

  return {
    answers,
    answered_count,
    total_count: 8,
    completeness_ratio,
    is_complete,
    missing_questions: missingKeys
  };
}

/**
 * Validates hard validation rules and anti-nonsense constraints.
 */
export function validateDonationQuality(donation, options = {}) {
  const errors = [];
  const warnings = [];

  if (!donation || typeof donation !== 'object') {
    return {
      isValid: false,
      errors: ['Donation record is null or not an object'],
      warnings: []
    };
  }

  // Rule 1: Donation amount must be positive
  const amount = donation.amount !== undefined ? donation.amount : donation.extracted_amount;
  if (amount === undefined || amount === null || !isFinite(Number(amount)) || Number(amount) <= 0) {
    errors.push(`Donation amount must be a finite positive number. Received: ${amount}`);
  }

  // Rule 2: Donation date cannot be invalid
  const rawDate = donation.donation_date || donation.donationDate || donation.date || donation.published_at;
  const parsedDate = parseCalendarDate(rawDate);
  if (!rawDate || !parsedDate) {
    errors.push(`Donation date is missing or invalid: "${rawDate}". Expected YYYY-MM-DD.`);
  } else {
    const currentYear = new Date().getFullYear();
    if (parsedDate.year < 1800) {
      errors.push(`Donation date (${rawDate}) cannot precede year 1800.`);
    } else if (parsedDate.year > currentYear + 1) {
      errors.push(`Donation date (${rawDate}) cannot be in the distant future.`);
    }
  }

  // Rule 3: Source should exist for verified records
  const status = donation.status || donation.verification_status || donation.verificationStatus;
  const hasSource = Boolean(
    donation.source_url ||
    donation.source?.url ||
    donation.citation_url ||
    (Array.isArray(donation.sources) && donation.sources.length > 0 && (donation.sources[0].url || donation.sources[0].publisher)) ||
    (donation.source_publisher && donation.source_publisher !== 'News Media')
  );
  if (status === 'VERIFIED' && !hasSource) {
    errors.push('Source citation is strictly required for verified donation records.');
  } else if (status === 'PARTIALLY_VERIFIED' && !hasSource) {
    warnings.push('Partially verified donation lacks direct citation URL.');
  }

  // Rule 4: Personal donation should have a person donor
  const fundingSource = donation.funding_source_type || donation.fundingSourceType || donation.possible_funding_source;
  const hasPersonDonor = Boolean(
    donation.donor_person_id ||
    donation.donor_person_name ||
    donation.donor_person ||
    donation.person_id ||
    donation.billionaireId ||
    donation.billionaire_name ||
    (donation.detected_donor && donation.detected_donor.person_id)
  );

  const hasOrgDonor = Boolean(
    donation.donor_organization_id ||
    donation.donor_organization_name ||
    donation.donor_organization ||
    donation.organization_id ||
    donation.disbursing_entity
  );

  if (['PERSONAL', 'PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'].includes(fundingSource)) {
    if (!hasPersonDonor) {
      errors.push(`Personal donation (${fundingSource}) must specify a verified individual person as donor.`);
    }
  }

  // Rule 5: Corporate donation should have an organization donor
  if (fundingSource === 'CORPORATE') {
    if (!hasOrgDonor && !hasPersonDonor) {
      errors.push('Corporate donation must specify a company or corporate organization as donor.');
    } else if (!hasOrgDonor && hasPersonDonor) {
      warnings.push('Corporate donation linked to individual without explicit corporate organization entity.');
    }
  }

  // Rule 6: Foundation donation should have an organization donor
  if (fundingSource === 'FOUNDATION') {
    if (!hasOrgDonor && !hasPersonDonor) {
      errors.push('Foundation donation must specify a private foundation entity as donor.');
    } else if (!hasOrgDonor && hasPersonDonor) {
      warnings.push('Foundation disbursement linked to individual without explicit foundation organization entity.');
    }
  }

  // Rule 7: Pledge must not count as completed giving
  if (fundingSource === 'PLEDGE') {
    if (donation.is_completed_giving === true) {
      errors.push('Pledge commitments are non-binding commitments and must not be marked as completed giving.');
    }
    if (donation.counts_as_personal_giving === true || donation.is_confirmed_personal_giving === true) {
      errors.push('Pledge commitments must not be counted toward confirmed personal giving totals.');
    }
  }

  // Rule 8: Disputed records must not count in default rankings
  if (status === 'DISPUTED') {
    if (donation.is_default_ranking_eligible === true) {
      errors.push('Disputed records must not be eligible for default philanthropy rankings.');
    }
    if (donation.is_personal_parity_eligible === true) {
      errors.push('Disputed records must not be eligible for personal parity calculations.');
    }
  }

  // Rule 9: Wealth must be positive if provided for parity calculations
  const historicalWealth = donation.historical_net_worth !== undefined ? donation.historical_net_worth : donation.historicalNetWorth;
  if (historicalWealth !== undefined && historicalWealth !== null) {
    if (!isFinite(Number(historicalWealth)) || Number(historicalWealth) <= 0) {
      errors.push(`Historical net worth must be a positive finite number. Received: ${historicalWealth}`);
    }
  }

  // Rule 10: Currency must be specified
  const currency = donation.currency;
  if (currency !== undefined && currency !== null && (typeof currency !== 'string' || !currency.trim())) {
    errors.push('Currency must be a non-empty string when provided.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Consistency Check: Temporal Wealth Alignment
 * 
 * Enforces rule:
 * "If donation date is 2018, don't use a 2026 wealth snapshot without explicitly marking it as unavailable/approximate."
 */
export function checkTemporalWealthConsistency(donationDate, snapshotDate, thresholdYears = 3) {
  if (!donationDate || !snapshotDate) {
    return {
      isConsistent: false,
      isApproximate: false,
      isUnavailable: true,
      gapYears: null,
      gapDays: null,
      classification: 'UNAVAILABLE',
      warning: 'Missing donation date or wealth snapshot date for temporal consistency evaluation.'
    };
  }

  const d = parseCalendarDate(donationDate);
  const s = parseCalendarDate(snapshotDate);

  if (!d || !s) {
    return {
      isConsistent: false,
      isApproximate: false,
      isUnavailable: true,
      gapYears: null,
      gapDays: null,
      classification: 'UNAVAILABLE',
      warning: 'Invalid calendar date format for temporal comparison.'
    };
  }

  // daysDiff: positive means snapshot is BEFORE donation; negative means snapshot is in the FUTURE relative to donation
  const daysDiff = Math.round((d.utcTimestamp - s.utcTimestamp) / 86400000);
  const gapYears = Math.abs(daysDiff) / 365.25;

  // Case A: Future Snapshot (e.g. donation date is 2018, snapshot is 2026)
  if (daysDiff < 0) {
    return {
      isConsistent: false,
      isApproximate: true,
      isUnavailable: true,
      gapYears: Number(gapYears.toFixed(2)),
      gapDays: daysDiff,
      classification: 'FUTURE_SNAPSHOT_MISMATCH',
      warning: `Valuation snapshot (${s.isoString}) is in the future relative to donation date (${d.isoString}). Future wealth cannot be used for historical parity without explicitly marking it unavailable/approximate.`
    };
  }

  // Case B: Same date or very close (<= 90 days prior)
  if (daysDiff <= 90) {
    return {
      isConsistent: true,
      isApproximate: false,
      isUnavailable: false,
      gapYears: Number(gapYears.toFixed(2)),
      gapDays: daysDiff,
      classification: daysDiff === 0 ? 'EXACT_DATE' : 'NEAR_DATE',
      warning: null
    };
  }

  // Case C: Same calendar year
  if (s.year === d.year) {
    return {
      isConsistent: true,
      isApproximate: false,
      isUnavailable: false,
      gapYears: Number(gapYears.toFixed(2)),
      gapDays: daysDiff,
      classification: 'SAME_YEAR',
      warning: null
    };
  }

  // Case D: Gap <= thresholdYears (default 3 years / 1095 days)
  if (gapYears <= thresholdYears) {
    return {
      isConsistent: true,
      isApproximate: true,
      isUnavailable: false,
      gapYears: Number(gapYears.toFixed(2)),
      gapDays: daysDiff,
      classification: 'APPROXIMATE_HISTORICAL',
      warning: `Wealth snapshot is ${Number(gapYears.toFixed(1))} years prior to donation date. Ratio is an approximate historical estimate.`
    };
  }

  // Case E: Gap exceeds threshold (> 3 years prior)
  return {
    isConsistent: false,
    isApproximate: true,
    isUnavailable: true,
    gapYears: Number(gapYears.toFixed(2)),
    gapDays: daysDiff,
    classification: 'EXCESSIVE_TEMPORAL_GAP',
    warning: `Wealth snapshot date (${s.isoString}) is ${Number(gapYears.toFixed(1))} years prior to donation (${d.isoString}), exceeding the ${thresholdYears}-year credibility threshold. Marked unavailable / approximate.`
  };
}

/**
 * Consistency Check: Multi-Source Discrepancies
 * 
 * Enforces rule:
 * "If multiple sources disagree on amount:
 *  - preserve the disagreement
 *  - do not silently pick one
 *  - flag the record"
 */
export function checkSourceDiscrepancies(donation, sources = []) {
  if (!donation || typeof donation !== 'object') {
    return {
      has_discrepancy: false,
      discrepancy_type: null,
      discrepancy_details: null
    };
  }

  const primaryAmount = Number(donation.amount !== undefined ? donation.amount : donation.extracted_amount);
  const reportedAmounts = [];

  if (isFinite(primaryAmount) && primaryAmount > 0) {
    reportedAmounts.push({
      amount: primaryAmount,
      source: donation.source_publisher || 'Primary Document',
      url: donation.source_url || null
    });
  }

  // Check alternative amounts preserved on the donation record
  if (Array.isArray(donation.alternative_amounts)) {
    donation.alternative_amounts.forEach(item => {
      const amt = typeof item === 'object' ? Number(item.amount) : Number(item);
      const src = typeof item === 'object' ? (item.source || item.publisher || 'Alternative Citation') : 'Alternative Citation';
      const u = typeof item === 'object' ? (item.url || null) : null;
      if (isFinite(amt) && amt > 0) {
        reportedAmounts.push({ amount: amt, source: src, url: u });
      }
    });
  }

  // Check sources attached to the donation
  const sourceList = Array.isArray(sources) && sources.length > 0 ? sources : (Array.isArray(donation.sources) ? donation.sources : []);
  sourceList.forEach(s => {
    if (s && s.reported_amount !== undefined && isFinite(Number(s.reported_amount))) {
      const amt = Number(s.reported_amount);
      if (amt > 0) {
        reportedAmounts.push({
          amount: amt,
          source: s.publisher || s.title || 'Attached Source',
          url: s.url || null
        });
      }
    }
  });

  // Unique amounts within a 1% floating-point tolerance
  const uniqueFigures = [];
  reportedAmounts.forEach(r => {
    const exists = uniqueFigures.some(u => Math.abs(u.amount - r.amount) / Math.max(u.amount, r.amount) < 0.01);
    if (!exists) {
      uniqueFigures.push(r);
    }
  });

  if (uniqueFigures.length <= 1) {
    return {
      has_discrepancy: false,
      discrepancy_type: null,
      discrepancy_details: null
    };
  }

  // Discrepancy detected: preserve all figures, calculate spread, and flag
  const amounts = uniqueFigures.map(u => u.amount);
  const minAmt = Math.min(...amounts);
  const maxAmt = Math.max(...amounts);
  const spread = maxAmt - minAmt;
  const spreadPercent = ((spread / minAmt) * 100).toFixed(1);

  const formattedDisagreement = uniqueFigures
    .map(u => `$${(u.amount / 1e6).toFixed(1)}M (${u.source})`)
    .join(' vs. ');

  return {
    has_discrepancy: true,
    discrepancy_type: 'AMOUNT_DISAGREEMENT',
    discrepancy_details: {
      primary_amount: primaryAmount,
      reported_amounts: reportedAmounts,
      unique_figures: uniqueFigures,
      min_amount: minAmt,
      max_amount: maxAmt,
      spread_amount: spread,
      spread_percentage: `${spreadPercent}%`,
      disagreement_summary: `Multiple sources disagree on donation amount: ${formattedDisagreement}. Disagreement is preserved; neither figure was silently chosen.`,
      recommended_action: 'Flagged for maintainer regulatory filing verification (Form 990 / SEC Form 4).'
    }
  };
}

/**
 * Computes transparent Data Quality Score (0–100) and Quality Grade.
 */
export function computeDataQualityScore(donation, options = {}) {
  const eightQuestions = evaluateEightQuestions(donation);
  const validation = validateDonationQuality(donation, options);
  const discrepancy = checkSourceDiscrepancies(donation, options.sources);

  let temporalConsistency = null;
  const snapDate = options.snapshotDate ||
    options.wealthSnapshot?.snapshot_date ||
    options.wealthSnapshot?.snapshotDate ||
    donation.snapshot_date ||
    donation.snapshotDate ||
    donation.historical_wealth?.snapshot_date;
  const donDate = donation.donation_date || donation.donationDate || donation.published_at;
  if (snapDate && donDate) {
    temporalConsistency = checkTemporalWealthConsistency(donDate, snapDate);
  }

  let score = 0;
  const flags = [];

  // 1. Eight Questions Completeness (Up to 40 points: 5 pts per answered question)
  score += Math.round(eightQuestions.completeness_ratio * 40);

  // 2. Verification Status Quality (Up to 30 points)
  const status = donation.status || donation.verification_status || donation.verificationStatus || 'UNVERIFIED';
  if (status === 'VERIFIED') {
    score += 30;
  } else if (status === 'PARTIALLY_VERIFIED') {
    score += 20;
  } else if (status === 'UNVERIFIED') {
    score += 10;
  } else if (status === 'DISCOVERED') {
    score += 5;
  } else if (status === 'DISPUTED') {
    score += 0;
    flags.push('STATUS_DISPUTED');
  }

  // 3. Source Provenance (Up to 20 points)
  const source = donation.source || (Array.isArray(donation.sources) ? donation.sources[0] : null);
  const sourceType = source?.source_type || donation.source_tier;
  if (sourceType === 'PRIMARY' || status === 'VERIFIED') {
    score += 20;
  } else if (sourceType === 'SECONDARY' || donation.source_url) {
    score += 12;
  } else if (donation.source_publisher) {
    score += 6;
  } else {
    flags.push('MISSING_PRIMARY_SOURCE');
  }

  // 4. Temporal Wealth Consistency (Up to 10 points)
  if (temporalConsistency) {
    if (temporalConsistency.isConsistent && !temporalConsistency.isApproximate) {
      score += 10;
    } else if (temporalConsistency.isConsistent && temporalConsistency.isApproximate) {
      score += 5;
      flags.push('APPROXIMATE_TEMPORAL_BENCHMARK');
    } else {
      score -= 10;
      flags.push('TEMPORAL_WEALTH_GAP');
    }
  }

  // 5. Deductions for Discrepancies and Invalidation
  if (discrepancy.has_discrepancy) {
    score -= 15;
    flags.push('DISCREPANT_SOURCE_AMOUNTS');
  }

  if (!validation.isValid) {
    score -= 20;
    validation.errors.forEach(err => flags.push(`VALIDATION_ERROR: ${err}`));
  }

  // Clamp score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Determine Grade
  let qualityGrade = QUALITY_GRADES.GRADE_D;
  if (score >= QUALITY_GRADES.GRADE_A.minScore && validation.isValid && !discrepancy.has_discrepancy && status !== 'DISPUTED') {
    qualityGrade = QUALITY_GRADES.GRADE_A;
  } else if (score >= QUALITY_GRADES.GRADE_B.minScore && validation.isValid && status !== 'DISPUTED') {
    qualityGrade = QUALITY_GRADES.GRADE_B;
  } else if (score >= QUALITY_GRADES.GRADE_C.minScore && status !== 'DISPUTED') {
    qualityGrade = QUALITY_GRADES.GRADE_C;
  } else {
    qualityGrade = QUALITY_GRADES.GRADE_D;
  }

  return {
    score,
    quality_score: score,
    grade: qualityGrade.grade,
    quality_grade: qualityGrade.grade,
    status: status,
    status_label: qualityGrade.label,
    badge_color: qualityGrade.badgeColor,
    description: qualityGrade.description,
    answers_all_8_questions: eightQuestions.is_complete,
    is_complete: eightQuestions.is_complete,
    eight_questions: eightQuestions,
    answered_questions_count: eightQuestions.answered_count,
    is_valid: validation.isValid,
    validation,
    validation_errors: validation.errors.map(msg => ({ rule: 'VALIDATION_RULE', message: msg })),
    temporal_consistency: temporalConsistency,
    discrepancy,
    has_source_discrepancy: discrepancy.has_discrepancy,
    discrepancy_details: discrepancy.discrepancy_details,
    flags,
    is_authoritative_display_safe: validation.isValid && score >= 50 && status !== 'DISPUTED'
  };
}
