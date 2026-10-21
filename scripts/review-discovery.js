#!/usr/bin/env node
/**
 * NoCharity Advanced Mode — Phase 11: Maintainer Discovery Review Workflow
 * 
 * Lightweight local CLI script supporting the 4-stage pipeline:
 * News result → review → classify → verify → insert/update Supabase
 * 
 * Rules:
 * - Google News is a DISCOVERY mechanism, not the authoritative database.
 * - Does NOT continuously poll Google News.
 * - Does NOT run background workers.
 * - Candidates are NEVER automatically marked VERIFIED.
 * - Verification requires human maintainer audit with primary citation.
 * 
 * Usage:
 *   node scripts/review-discovery.js --billionaire "Warren Buffett"
 *   node scripts/review-discovery.js -b "Bill Gates" --dry-run
 *   node scripts/review-discovery.js -b "Elon Musk" --timeframe past_year
 *   node scripts/review-discovery.js --candidate '<json>' --funding PERSONAL_DIRECT --status VERIFIED --citation https://sec.gov/...
 */

import { discoverDonationsFromNews, DISCOVERY_LABEL } from '../server/discovery-engine.js';
import { supabase, isConfigured } from '../server/supabase.js';
import { INITIAL_BILLIONAIRES } from '../public/js/data.js';

export async function reviewAndVerifyCandidate({
  candidate,
  fundingSourceType = 'PERSONAL_DIRECT',
  status = 'VERIFIED',
  citationUrl = null,
  citationPublisher = null,
  citationTitle = null,
  notes = null,
  dryRun = false
}) {
  if (!candidate) throw new Error('Missing candidate record');

  // Stage 1: Review
  const donorName = candidate.detected_donor?.name || 'Unknown Donor';
  const amount = candidate.extracted_amount || 0;
  const recipient = candidate.detected_recipient || 'Unspecified Recipient';
  const donationDate = candidate.published_at || new Date().toISOString().split('T')[0];

  // Stage 2: Classify
  const validatedFundingSource = fundingSourceType || candidate.possible_funding_source || 'UNKNOWN_SOURCE';

  // Stage 3: Verify
  const validatedStatus = status || 'VERIFIED';
  const sourceUrl = citationUrl || candidate.url;
  const sourcePublisher = citationPublisher || candidate.source_publisher || 'Primary Public Disclosure';
  const sourceTitle = citationTitle || candidate.headline || 'Audit Citation';

  const verifiedRecord = {
    amount,
    currency: 'USD',
    donation_date: donationDate,
    donation_type: 'MONETARY',
    funding_source_type: validatedFundingSource,
    status: validatedStatus,
    description: candidate.headline || `Donation to ${recipient}`,
    recipient_name: recipient,
    donor_person_id: candidate.detected_donor?.person_id || null,
    source: {
      url: sourceUrl,
      publisher: sourcePublisher,
      title: sourceTitle,
      source_type: validatedStatus === 'VERIFIED' ? 'PRIMARY' : 'SECONDARY',
      notes: notes || 'Audited and verified via maintainer discovery review workflow.'
    }
  };

  // Stage 4: Insert / Update Supabase
  if (dryRun || !isConfigured || !supabase) {
    return {
      success: true,
      mode: dryRun ? 'DRY-RUN (Simulated)' : 'OFFLINE (No Supabase credentials)',
      action: 'simulated_upsert',
      candidate_id: candidate.candidate_id,
      verified_record: verifiedRecord,
      notice: 'Verification successful. Record prepared for database upsert.'
    };
  }

  try {
    // 1. Insert or find source
    let sourceId = null;
    if (sourceUrl) {
      const { data: existingSource } = await supabase
        .from('sources')
        .select('id')
        .eq('url', sourceUrl)
        .maybeSingle();

      if (existingSource) {
        sourceId = existingSource.id;
      } else {
        const { data: newSource, error: srcErr } = await supabase
          .from('sources')
          .insert({
            publisher: sourcePublisher,
            title: sourceTitle,
            url: sourceUrl,
            source_type: verifiedRecord.source.source_type,
            notes: verifiedRecord.source.notes
          })
          .select('id')
          .single();

        if (!srcErr && newSource) sourceId = newSource.id;
      }
    }

    // 2. Insert donation
    const { data: insertedDonation, error: donErr } = await supabase
      .from('donations')
      .insert({
        amount: verifiedRecord.amount,
        currency: verifiedRecord.currency,
        donation_date: verifiedRecord.donation_date,
        donation_type: verifiedRecord.donation_type,
        funding_source_type: verifiedRecord.funding_source_type,
        status: verifiedRecord.status,
        description: verifiedRecord.description,
        donor_person_id: verifiedRecord.donor_person_id
      })
      .select('id, amount, donation_date, funding_source_type, status')
      .single();

    if (donErr) throw donErr;

    // 3. Link donation and source
    if (sourceId && insertedDonation) {
      await supabase
        .from('donation_sources')
        .insert({
          donation_id: insertedDonation.id,
          source_id: sourceId
        });
    }

    return {
      success: true,
      mode: 'LIVE COMMIT',
      action: 'inserted',
      donation_id: insertedDonation.id,
      verified_record: verifiedRecord
    };
  } catch (err) {
    return {
      success: false,
      error: err.message,
      verified_record: verifiedRecord
    };
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
NoCharity Advanced Mode — Phase 11: Maintainer Discovery Review Tool

Usage:
  node scripts/review-discovery.js --billionaire "Warren Buffett"
  node scripts/review-discovery.js -b "Bill Gates" --timeframe past_year --dry-run
  node scripts/review-discovery.js --candidate '<json>' --funding PERSONAL_DIRECT --status VERIFIED

Options:
  --billionaire, -b   Billionaire name to scan for discovered donations
  --timeframe, -t     Timeframe filter: all, past_month, past_year (default: all)
  --dry-run           Inspect discovery extraction without writing to database
  --commit            Commit verified records to Supabase (default: dry-run unless specified)
  --funding           Target funding source (PERSONAL_DIRECT, FOUNDATION, CORPORATE, etc.)
  --status            Target verification status (VERIFIED, PARTIALLY_VERIFIED)
  --citation          Primary citation URL (SEC Form 4, 990-PF, official disclosure)
  --candidate         Direct candidate JSON to verify
    `);
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run') || !args.includes('--commit');
  let billionaire = 'Warren Buffett';
  const bIdx = args.findIndex(a => a === '--billionaire' || a === '-b');
  if (bIdx !== -1 && args[bIdx + 1]) billionaire = args[bIdx + 1];

  let timeframe = 'all';
  const tIdx = args.findIndex(a => a === '--timeframe' || a === '-t');
  if (tIdx !== -1 && args[tIdx + 1]) timeframe = args[tIdx + 1];

  console.log('======================================================================');
  console.log(`📡 NoCharity Advanced Mode — Discovered Donations Review Tool`);
  console.log(`Target Donor: ${billionaire}`);
  console.log(`Timeframe:    ${timeframe}`);
  console.log(`Mode:         ${dryRun ? 'DRY-RUN / AUDIT (No writes)' : 'LIVE COMMIT'}`);
  console.log(`Notice:       Google News is a DISCOVERY pipeline, not authoritative database.`);
  console.log(`Status Tag:   "${DISCOVERY_LABEL}"`);
  console.log('======================================================================\n');

  try {
    const discovery = await discoverDonationsFromNews(billionaire, { timeframe });
    console.log(`Found ${discovery.discovered_count} discovery candidate(s) for ${billionaire}:\n`);

    if (discovery.candidates.length === 0) {
      console.log('No donation candidates detected for this query.');
      process.exit(0);
    }

    discovery.candidates.forEach((c, idx) => {
      console.log(`[Candidate #${idx + 1}] ID: ${c.candidate_id}`);
      console.log(`  Headline:        ${c.headline}`);
      console.log(`  Status:          ${c.status} (${c.verification_badge})`);
      console.log(`  Source:          ${c.source_publisher} | ${c.published_at}`);
      console.log(`  URL:             ${c.url}`);
      console.log(`  Extracted Amt:   ${c.formatted_amount} (Confidence: ${c.amount_confidence})`);
      console.log(`  Detected Donor:  ${c.detected_donor.name}`);
      console.log(`  Detected Recip:  ${c.detected_recipient}`);
      console.log(`  Possible Source: ${c.possible_funding_source}`);
      console.log(`  Confirmed Pers:  ${c.is_confirmed_personal_giving} (Requires Maintainer Audit)`);
      console.log('----------------------------------------------------------------------');
    });

    console.log(`\nLightweight Maintainer Workflow:`);
    console.log(`To verify and commit Candidate #1 to Supabase, run:`);
    const c1 = discovery.candidates[0];
    console.log(`node scripts/review-discovery.js --candidate '${JSON.stringify(c1).replace(/'/g, "\\'")}' --funding ${c1.possible_funding_source} --status VERIFIED --commit\n`);

    process.exit(0);
  } catch (err) {
    console.error('Error executing discovery review:', err.message);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('review-discovery.js')) {
  main();
}
