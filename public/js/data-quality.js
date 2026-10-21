/**
 * NoCharity Advanced Mode — Phase 12: Data Quality & Consistency Layer (Client ES Module)
 */

import { parseCalendarDate } from './parity-engine.js';

export const EIGHT_QUESTIONS = Object.freeze({
  WHO: { key: 'who', label: 'WHO?', description: 'Donor identity (person or legal entity)' },
  WHAT: { key: 'what', label: 'WHAT?', description: 'Nature of gift and stated cause' },
  WHEN: { key: 'when', label: 'WHEN?', description: 'Transaction date (ISO YYYY-MM-DD)' },
  HOW_MUCH: { key: 'how_much', label: 'HOW MUCH?', description: 'Quantified amount and ISO currency' },
  FROM_WHOM: { key: 'from_whom', label: 'FROM WHOM?', description: 'Funding vehicle: personal, foundation, corporate, DAF, pledge' },
  TO_WHOM: { key: 'to_whom', label: 'TO WHOM?', description: 'Recipient charity, institution, or cause' },
  SOURCE: { key: 'source', label: 'SOURCE?', description: 'Verifiable regulatory filing, official release, or citation' },
  HOW_CERTAIN: { key: 'how_certain', label: 'HOW CERTAIN?', description: 'Verification tier (VERIFIED, PARTIALLY_VERIFIED, UNVERIFIED, DISCOVERED, DISPUTED)' }
});

export const QUALITY_GRADES = Object.freeze({
  GRADE_A: { grade: 'A', label: 'Audited & Complete', badgeColor: 'green', minScore: 85, description: 'Audited against primary regulatory filings; meets all 8 questions.' },
  GRADE_B: { grade: 'B', label: 'Well-Documented', badgeColor: 'blue', minScore: 70, description: 'Credible public documentation with recipient cross-reference.' },
  GRADE_C: { grade: 'C', label: 'Preliminary / Unverified', badgeColor: 'amber', minScore: 50, description: 'Preliminary disclosure; verification required.' },
  GRADE_D: { grade: 'D', label: 'Flagged / Disputed', badgeColor: 'red', minScore: 0, description: 'Contains source disagreements, contested figures, or fails core rules.' }
});

export function evaluateEightQuestions(donation) {
  if (!donation || typeof donation !== 'object') {
    return { answers: {}, answered_count: 0, total_count: 8, completeness_ratio: 0, is_complete: false };
  }

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

  const whatVal = donation.description ||
    donation.donation_type ||
    donation.purpose ||
    donation.headline ||
    (donation.amount ? `Monetary gift of $${Number(donation.amount).toLocaleString()}` : null);

  let whenVal = donation.donation_date || donation.donationDate || donation.published_at || null;
  if (whenVal && typeof whenVal === 'string') whenVal = whenVal.split('T')[0];

  const rawAmt = donation.amount !== undefined ? donation.amount : donation.extracted_amount;
  const numAmt = Number(rawAmt);
  const currency = donation.currency || 'USD';
  const howMuchVal = (isFinite(numAmt) && numAmt > 0) ? `${currency} ${numAmt.toLocaleString()}` : null;

  const fromWhomVal = donation.funding_source_type || donation.fundingSourceType || donation.possible_funding_source || null;
  const toWhomVal = donation.recipient_name || donation.recipient || donation.detected_recipient || donation.cause || null;

  const sourceVal = donation.source_url ||
    donation.source?.url ||
    donation.citation_url ||
    (Array.isArray(donation.sources) && donation.sources.length > 0 ? (donation.sources[0].url || donation.sources[0].publisher) : null) ||
    donation.source_publisher ||
    donation.source?.publisher ||
    null;

  const howCertainVal = donation.status || donation.verification_status || donation.verificationStatus || null;

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

  const answered_count = Object.keys(answers).filter(k => answers[k] !== null && answers[k] !== '').length;
  return {
    answers,
    answered_count,
    total_count: 8,
    completeness_ratio: answered_count / 8,
    is_complete: answered_count === 8
  };
}

export function computeDataQualityScore(donation, options = {}) {
  const eightQuestions = evaluateEightQuestions(donation);
  let score = Math.round(eightQuestions.completeness_ratio * 40);

  const status = donation.status || donation.verification_status || 'UNVERIFIED';
  if (status === 'VERIFIED') score += 30;
  else if (status === 'PARTIALLY_VERIFIED') score += 20;
  else if (status === 'UNVERIFIED') score += 10;
  else if (status === 'DISCOVERED') score += 5;

  if (donation.source_url || (Array.isArray(donation.sources) && donation.sources.length > 0)) {
    score += 20;
  } else if (donation.source_publisher) {
    score += 10;
  }

  if (donation.discrepancy?.has_discrepancy || donation.has_discrepancy) {
    score -= 15;
  }

  score = Math.max(0, Math.min(100, score));

  let grade = QUALITY_GRADES.GRADE_D;
  if (score >= 85 && status !== 'DISPUTED') grade = QUALITY_GRADES.GRADE_A;
  else if (score >= 70 && status !== 'DISPUTED') grade = QUALITY_GRADES.GRADE_B;
  else if (score >= 50 && status !== 'DISPUTED') grade = QUALITY_GRADES.GRADE_C;

  return {
    score,
    grade: grade.grade,
    status_label: grade.label,
    badge_color: grade.badgeColor,
    answers_all_8_questions: eightQuestions.is_complete,
    eight_questions: eightQuestions
  };
}
