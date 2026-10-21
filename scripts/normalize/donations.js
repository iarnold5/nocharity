import { createNormalizedDonation, cleanUrl, FUNDING_SOURCE_TYPES } from './schemas.js';

/**
 * Rigorously infers funding_source_type based on explicit evidence
 * Rules:
 * 1. Do not infer PERSONAL_FUNDS_CONFIRMED simply because a billionaire is named in an article.
 * 2. Do not infer personal income as the source of a direct donation.
 * 3. Never confuse foundation or corporate giving with personal giving.
 */
export function inferFundingSourceType(raw = {}) {
  let explicit = raw.funding_source_type || raw.fundingSourceType;
  if (explicit && FUNDING_SOURCE_TYPES.includes(explicit)) {
    return explicit;
  }

  const desc = `${raw.description || ''} ${raw.headline || ''} ${raw.cause || ''} ${raw.source_title || ''}`.toLowerCase();
  const donorOrg = (raw.donor_organization_name || raw.donorOrgName || '').toLowerCase();
  const donorPerson = (raw.donor_person_name || raw.donorPersonName || raw.donor_name || raw.donor || '').toLowerCase();

  // 1. Explicitly established personal funds (e.g. SEC Form 4 personal share surrender, personal funds confirmed)
  const hasExplicitPersonalFundsConfirmation = (
    (desc.includes('form 4') || desc.includes('personal stock') || desc.includes('personal share') ||
     desc.includes('personal funds confirmed') || desc.includes('confirmed personal funds') ||
     desc.includes('from his personal funds') || desc.includes('from her personal funds') ||
     desc.includes('personal wealth surrender')) &&
    !desc.includes('foundation grant') && !desc.includes('corporate treasury')
  );

  if (hasExplicitPersonalFundsConfirmation) {
    return 'PERSONAL_FUNDS_CONFIRMED';
  }

  // 2. Foundation donation
  // The foundation / charitable organization / trust made the donation
  if (
    donorOrg.includes('foundation') || donorOrg.includes('trust') || donorOrg.includes('endowment') ||
    donorOrg.includes('fund') || donorPerson.includes('foundation') || donorPerson.includes('trust') ||
    desc.includes('foundation grant') || desc.includes('family foundation') || desc.includes('foundation distribution') ||
    desc.includes('trust grant')
  ) {
    return 'FOUNDATION';
  }

  // 3. Corporate donation
  // A company made the donation from corporate treasury
  if (
    donorOrg.includes('inc') || donorOrg.includes('corp') || donorOrg.includes('llc') || donorOrg.includes('ltd') ||
    donorOrg.includes('company') || donorOrg.includes('technologies') ||
    desc.includes('corporate donation') || desc.includes('company match') || desc.includes('corporate gift') ||
    desc.includes('company grant')
  ) {
    return 'CORPORATE';
  }

  // 4. DAF (Donor-Advised Fund)
  if (
    desc.includes('donor-advised') || desc.includes('donor advised') || desc.includes('daf') ||
    donorOrg.includes('donor-advised') || donorOrg.includes('charitable gift fund') ||
    donorOrg.includes('vanguard charitable') || donorOrg.includes('fidelity charitable') || donorOrg.includes('schwab charitable')
  ) {
    return 'DAF';
  }

  // 5. Pledge
  // A commitment rather than a completed transfer
  if (
    (desc.includes('pledge') || desc.includes('pledged') || desc.includes('promised to give') || desc.includes('committed to donate')) &&
    !desc.includes('disbursed') && !desc.includes('fulfilled') && !desc.includes('transferred')
  ) {
    return 'PLEDGE';
  }

  // 6. Direct personal attribution
  // A public source attributes the donation directly to the individual person
  if (donorPerson && !donorOrg) {
    return 'PERSONAL_DIRECT';
  }

  // 7. Unknown Source
  // Ambiguous attribution or unknown funding mechanism
  return 'UNKNOWN_SOURCE';
}

export function normalizeDonation(raw) {
  if (!raw) return null;

  const rawDate = raw.donation_date || raw.donationDate || raw.date;
  if (!rawDate) return null;

  const donationDate = String(rawDate).trim().split('T')[0];

  let amount = raw.amount;
  if (typeof amount === 'string') {
    const match = amount.match(/([\d.]+)\s*(billion|million|b|m|k)?/i);
    if (match) {
      const val = parseFloat(match[1]);
      const unit = (match[2] || '').toLowerCase();
      if (unit.startsWith('b')) {
        amount = val * 1_000_000_000;
      } else if (unit.startsWith('m')) {
        amount = val * 1_000_000;
      } else if (unit.startsWith('k')) {
        amount = val * 1_000;
      } else {
        amount = val;
      }
    } else {
      amount = parseFloat(amount.replace(/[^\d.-]/g, ''));
    }
  }

  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || numericAmount <= 0) return null;

  const fundingSourceType = inferFundingSourceType(raw);

  const corroboratingUrls = [];
  if (Array.isArray(raw.corroborating_source_urls)) {
    raw.corroborating_source_urls.forEach(u => u && corroboratingUrls.push(cleanUrl(u)));
  }
  if (Array.isArray(raw.sources)) {
    raw.sources.forEach(s => {
      const u = typeof s === 'string' ? s : (s.url || s.link);
      if (u) corroboratingUrls.push(cleanUrl(u));
    });
  }

  return createNormalizedDonation({
    donor_person_name: raw.donor_person_name || raw.donorPersonName || raw.donor_name || raw.donor || null,
    donor_person_id: raw.donor_person_id || raw.donorPersonId || null,
    donor_organization_name: raw.donor_organization_name || raw.donorOrgName || null,
    donor_organization_id: raw.donor_organization_id || null,
    recipient_person_name: raw.recipient_person_name || null,
    recipient_person_id: raw.recipient_person_id || null,
    recipient_organization_name: raw.recipient_organization_name || raw.recipient || raw.charity || null,
    recipient_organization_id: raw.recipient_organization_id || null,
    amount: numericAmount,
    currency: raw.currency || 'USD',
    donation_date: donationDate,
    donation_type: raw.donation_type || 'GIFT',
    funding_source_type: fundingSourceType,
    status: raw.status || 'VERIFIED',
    description: raw.description || raw.headline || raw.cause || null,
    cause_category: raw.cause_category || raw.cause || null,
    source_url: raw.source_url || raw.sourceUrl || raw.url || null,
    source_id: raw.source_id || raw.sourceId || null,
    corroborating_source_urls: corroboratingUrls
  });
}
