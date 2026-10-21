/**
 * NoCharity Ingestion Framework — Conservative Upsert Engine (Phase 4)
 * 
 * Rules:
 * 1. Never blindly create duplicates.
 * 2. Conservative matching; flags potential duplicates for manual inspection.
 * 3. Never overwrite better existing data with lower-quality incoming data.
 * 4. Supports full dry-run mode (npm run ingest -- --dry-run).
 */

import {
  matchPerson,
  matchOrganization,
  matchSource,
  matchWealthSnapshot,
  matchDonation,
  canOverwriteField
} from '../normalize/deduplicate.js';
import { validateRecord } from '../validate/index.js';
import { cleanUrl } from '../normalize/schemas.js';

/**
 * Loads baseline dataset from Supabase if connected
 */
export async function fetchExistingDataset(supabase) {
  if (!supabase) {
    return {
      people: [],
      organizations: [],
      sources: [],
      wealthSnapshots: [],
      donations: []
    };
  }

  try {
    const [peopleRes, orgsRes, sourcesRes, snapshotsRes, donationsRes] = await Promise.all([
      supabase.from('people').select('*'),
      supabase.from('organizations').select('*'),
      supabase.from('sources').select('*'),
      supabase.from('wealth_snapshots').select('*'),
      supabase.from('donations').select('*')
    ]);

    return {
      people: peopleRes.data || [],
      organizations: orgsRes.data || [],
      sources: sourcesRes.data || [],
      wealthSnapshots: snapshotsRes.data || [],
      donations: donationsRes.data || []
    };
  } catch (err) {
    console.warn(`[Ingest] Could not fetch remote dataset: ${err.message}. Operating with local tracking.`);
    return {
      people: [],
      organizations: [],
      sources: [],
      wealthSnapshots: [],
      donations: []
    };
  }
}

/**
 * Plans the ingestion: validates, deduplicates, enforces quality protection, and prepares operations.
 */
export function planIngestion({ incomingData, existingDataset, options = {} }) {
  const { dryRun = true, verbose = false } = options;

  const plan = {
    dryRun,
    verbose,
    stats: {
      newPeople: 0,
      updatedPeople: 0,
      newOrganizations: 0,
      updatedOrganizations: 0,
      newSources: 0,
      updatedSources: 0,
      newWealthSnapshots: 0,
      updatedWealthSnapshots: 0,
      newDonations: 0,
      updatedDonations: 0,
      potentialDuplicates: 0,
      invalidRecords: 0
    },
    operations: {
      peopleToInsert: [],
      peopleToUpdate: [],
      orgsToInsert: [],
      orgsToUpdate: [],
      sourcesToInsert: [],
      sourcesToUpdate: [],
      snapshotsToInsert: [],
      snapshotsToUpdate: [],
      donationsToInsert: [],
      donationsToUpdate: []
    },
    potentialDuplicatesList: [],
    invalidRecordsList: [],
    // In-memory maps for resolving foreign keys across entities
    personIdByName: new Map(),
    orgIdByName: new Map(),
    sourceIdByUrl: new Map()
  };

  // Seed existing lookup maps
  (existingDataset.people || []).forEach(p => {
    if (p.canonical_name && p.id) {
      plan.personIdByName.set(p.canonical_name.toLowerCase(), p.id);
    }
  });

  (existingDataset.organizations || []).forEach(o => {
    if (o.legal_name && o.id) {
      plan.orgIdByName.set(o.legal_name.toLowerCase(), o.id);
    }
    if (o.display_name && o.id) {
      plan.orgIdByName.set(o.display_name.toLowerCase(), o.id);
    }
  });

function registerSourceUrl(plan, rawUrl, id) {
  if (!rawUrl || !id) return;
  const cleaned = cleanUrl(rawUrl);
  if (cleaned) {
    plan.sourceIdByUrl.set(cleaned, id);
    plan.sourceIdByUrl.set(cleaned.replace(/\/$/, ''), id);
  }
}

function lookupSourceId(plan, rawUrl) {
  if (!rawUrl) return null;
  const cleaned = cleanUrl(rawUrl);
  if (!cleaned) return null;
  return plan.sourceIdByUrl.get(cleaned) || plan.sourceIdByUrl.get(cleaned.replace(/\/$/, '')) || null;
}

  (existingDataset.sources || []).forEach(s => {
    if (s.url && s.id) {
      registerSourceUrl(plan, s.url, s.id);
    }
  });

  // Current working datasets (including existing + newly planned)
  const workingPeople = [...(existingDataset.people || [])];
  const workingOrgs = [...(existingDataset.organizations || [])];
  const workingSources = [...(existingDataset.sources || [])];
  const workingSnapshots = [...(existingDataset.wealthSnapshots || [])];
  const workingDonations = [...(existingDataset.donations || [])];

  // 1. PROCESS PEOPLE
  for (const person of incomingData.people || []) {
    const val = validateRecord(person);
    if (!val.isValid) {
      plan.stats.invalidRecords++;
      plan.invalidRecordsList.push({ entity: 'PERSON', record: person, errors: val.errors });
      continue;
    }

    const match = matchPerson(person, workingPeople);
    if (match.matchType === 'EXACT') {
      // Check if update is needed & quality protection
      const existing = match.existing;
      const updates = {};
      let hasUpdates = false;

      ['occupation', 'industry', 'description', 'birth_date', 'country'].forEach(field => {
        if (!existing[field] && person[field]) {
          updates[field] = person[field];
          hasUpdates = true;
        }
      });

      // Merge aliases
      if (person.aliases && person.aliases.length > 0) {
        const mergedAliases = Array.from(new Set([...(existing.aliases || []), ...person.aliases]));
        if (mergedAliases.length > (existing.aliases || []).length) {
          updates.aliases = mergedAliases;
          hasUpdates = true;
        }
      }

      if (hasUpdates) {
        plan.stats.updatedPeople++;
        plan.operations.peopleToUpdate.push({ id: existing.id, updates });
      }
      plan.personIdByName.set(person.canonical_name.toLowerCase(), existing.id);
    } else if (match.matchType === 'POTENTIAL_DUPLICATE') {
      plan.stats.potentialDuplicates++;
      plan.potentialDuplicatesList.push({
        entity: 'PERSON',
        incoming: person.canonical_name,
        existing: match.existing.canonical_name,
        reason: match.reason
      });
      // Conservative rule: Do not auto-insert potential duplicates
    } else {
      // New Person
      const generatedId = person.id || crypto.randomUUID();
      const newPersonRecord = { ...person, id: generatedId };
      plan.stats.newPeople++;
      plan.operations.peopleToInsert.push(newPersonRecord);
      workingPeople.push(newPersonRecord);
      plan.personIdByName.set(person.canonical_name.toLowerCase(), generatedId);
    }
  }

  // 2. PROCESS ORGANIZATIONS
  for (const org of incomingData.organizations || []) {
    const val = validateRecord(org);
    if (!val.isValid) {
      plan.stats.invalidRecords++;
      plan.invalidRecordsList.push({ entity: 'ORGANIZATION', record: org, errors: val.errors });
      continue;
    }

    const match = matchOrganization(org, workingOrgs);
    if (match.matchType === 'EXACT') {
      const existing = match.existing;
      const updates = {};
      let hasUpdates = false;

      ['ein', 'cik', 'website', 'country', 'description'].forEach(field => {
        if (!existing[field] && org[field]) {
          updates[field] = org[field];
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        plan.stats.updatedOrganizations++;
        plan.operations.orgsToUpdate.push({ id: existing.id, updates });
      }
      plan.orgIdByName.set(org.legal_name.toLowerCase(), existing.id);
      if (org.display_name) plan.orgIdByName.set(org.display_name.toLowerCase(), existing.id);
    } else if (match.matchType === 'POTENTIAL_DUPLICATE') {
      plan.stats.potentialDuplicates++;
      plan.potentialDuplicatesList.push({
        entity: 'ORGANIZATION',
        incoming: org.legal_name,
        existing: match.existing.legal_name,
        reason: match.reason
      });
    } else {
      const generatedId = org.id || crypto.randomUUID();
      const newOrgRecord = { ...org, id: generatedId };
      plan.stats.newOrganizations++;
      plan.operations.orgsToInsert.push(newOrgRecord);
      workingOrgs.push(newOrgRecord);
      plan.orgIdByName.set(org.legal_name.toLowerCase(), generatedId);
      if (org.display_name) plan.orgIdByName.set(org.display_name.toLowerCase(), generatedId);
    }
  }

  // 3. PROCESS SOURCES
  for (const source of incomingData.sources || []) {
    const val = validateRecord(source);
    if (!val.isValid) {
      plan.stats.invalidRecords++;
      plan.invalidRecordsList.push({ entity: 'SOURCE', record: source, errors: val.errors });
      continue;
    }

    const match = matchSource(source, workingSources);
    if (match.matchType === 'EXACT') {
      const existing = match.existing;
      const updates = {};
      let hasUpdates = false;

      // Quality Protection on source_type
      if (canOverwriteField(existing.source_type, source.source_type, 'SOURCE_TIER')) {
        if (existing.source_type !== source.source_type) {
          updates.source_type = source.source_type;
          hasUpdates = true;
        }
      }

      ['publisher', 'title', 'published_at', 'notes'].forEach(field => {
        if (!existing[field] && source[field]) {
          updates[field] = source[field];
          hasUpdates = true;
        }
      });

      if (hasUpdates) {
        plan.stats.updatedSources++;
        plan.operations.sourcesToUpdate.push({ id: existing.id, updates });
      }
      registerSourceUrl(plan, source.url, existing.id);
    } else if (match.matchType === 'POTENTIAL_DUPLICATE') {
      plan.stats.potentialDuplicates++;
      plan.potentialDuplicatesList.push({
        entity: 'SOURCE',
        incoming: source.url,
        existing: match.existing.url,
        reason: match.reason
      });
    } else {
      const generatedId = source.id || crypto.randomUUID();
      const newSourceRecord = { ...source, id: generatedId };
      plan.stats.newSources++;
      plan.operations.sourcesToInsert.push(newSourceRecord);
      workingSources.push(newSourceRecord);
      registerSourceUrl(plan, source.url, generatedId);
    }
  }

  // 4. PROCESS WEALTH SNAPSHOTS
  for (const snapshot of incomingData.wealthSnapshots || []) {
    const val = validateRecord(snapshot);
    if (!val.isValid) {
      plan.stats.invalidRecords++;
      plan.invalidRecordsList.push({ entity: 'WEALTH_SNAPSHOT', record: snapshot, errors: val.errors });
      continue;
    }

    // Resolve person_id
    let personId = snapshot.person_id;
    if (!personId && snapshot.person_name) {
      personId = plan.personIdByName.get(snapshot.person_name.toLowerCase()) || null;
    }

    if (!personId) {
      plan.stats.invalidRecords++;
      plan.invalidRecordsList.push({
        entity: 'WEALTH_SNAPSHOT',
        record: snapshot,
        errors: [`Could not link wealth snapshot to person: "${snapshot.person_name}"`]
      });
      continue;
    }

    // Resolve source_id
    let sourceId = snapshot.source_id;
    if (!sourceId && snapshot.source_url) {
      sourceId = lookupSourceId(plan, snapshot.source_url);
    }

    const match = matchWealthSnapshot(snapshot, workingSnapshots, personId);
    if (match.matchType === 'EXACT') {
      const existing = match.existing;
      // Quality Protection on wealth confidence
      if (canOverwriteField(existing.confidence, snapshot.confidence, 'WEALTH_CONFIDENCE')) {
        const updates = {
          net_worth: snapshot.net_worth,
          confidence: snapshot.confidence,
          source_name: snapshot.source_name || existing.source_name,
          source_id: sourceId || existing.source_id
        };
        plan.stats.updatedWealthSnapshots++;
        plan.operations.snapshotsToUpdate.push({ id: existing.id, updates });
      } else {
        // Lower confidence cannot overwrite higher confidence
        if (verbose) {
          console.log(`[Quality Guard] Skipped overwriting snapshot for person ${personId} on ${snapshot.snapshot_date}: existing confidence (${existing.confidence}) > incoming (${snapshot.confidence})`);
        }
      }
    } else {
      const generatedId = snapshot.id || crypto.randomUUID();
      const newSnapshotRecord = {
        ...snapshot,
        id: generatedId,
        person_id: personId,
        source_id: sourceId
      };
      plan.stats.newWealthSnapshots++;
      plan.operations.snapshotsToInsert.push(newSnapshotRecord);
      workingSnapshots.push(newSnapshotRecord);
    }
  }

  // 5. PROCESS DONATIONS
  for (const donation of incomingData.donations || []) {
    const val = validateRecord(donation);
    if (!val.isValid) {
      plan.stats.invalidRecords++;
      plan.invalidRecordsList.push({ entity: 'DONATION', record: donation, errors: val.errors });
      continue;
    }

    // Resolve donor ID
    let donorPersonId = donation.donor_person_id;
    if (!donorPersonId && donation.donor_person_name) {
      donorPersonId = plan.personIdByName.get(donation.donor_person_name.toLowerCase()) || null;
    }

    let donorOrgId = donation.donor_organization_id;
    if (!donorOrgId && donation.donor_organization_name) {
      donorOrgId = plan.orgIdByName.get(donation.donor_organization_name.toLowerCase()) || null;
    }

    // Resolve recipient ID
    let recipientOrgId = donation.recipient_organization_id;
    if (!recipientOrgId && donation.recipient_organization_name) {
      recipientOrgId = plan.orgIdByName.get(donation.recipient_organization_name.toLowerCase()) || null;
    }

    // Resolve primary source ID
    let sourceId = donation.source_id;
    if (!sourceId && donation.source_url) {
      sourceId = lookupSourceId(plan, donation.source_url);
    }

    const resolvedDonorId = donorPersonId || donorOrgId;
    const match = matchDonation(donation, workingDonations, resolvedDonorId, recipientOrgId);

    if (match.matchType === 'EXACT') {
      const existing = match.existing;
      // Quality Protection on donation status
      if (canOverwriteField(existing.status, donation.status, 'DONATION_STATUS')) {
        const updates = {
          status: donation.status,
          funding_source_type: donation.funding_source_type || existing.funding_source_type,
          description: donation.description || existing.description,
          cause_category: donation.cause_category || existing.cause_category,
          source_id: sourceId || existing.source_id
        };
        plan.stats.updatedDonations++;
        plan.operations.donationsToUpdate.push({ id: existing.id, updates });
      }
    } else if (match.matchType === 'POTENTIAL_DUPLICATE') {
      plan.stats.potentialDuplicates++;
      plan.potentialDuplicatesList.push({
        entity: 'DONATION',
        incoming: `${donation.donor_person_name || donation.donor_organization_name} $${donation.amount} on ${donation.donation_date}`,
        existing: `$${match.existing.amount} on ${match.existing.donation_date}`,
        reason: match.reason
      });
    } else {
      const generatedId = donation.id || crypto.randomUUID();
      const newDonationRecord = {
        ...donation,
        id: generatedId,
        donor_person_id: donorPersonId,
        donor_organization_id: donorOrgId,
        recipient_organization_id: recipientOrgId,
        source_id: sourceId
      };
      plan.stats.newDonations++;
      plan.operations.donationsToInsert.push(newDonationRecord);
      workingDonations.push(newDonationRecord);
    }
  }

  return plan;
}

/**
 * Executes or prints the ingestion plan
 */
export async function executeIngestion(plan, supabase) {
  const { dryRun, stats, operations, potentialDuplicatesList, invalidRecordsList } = plan;

  console.log('\n============================================================');
  console.log(dryRun ? '🔍 NOCHARITY INGESTION PLAN (DRY-RUN MODE)' : '🚀 EXECUTING NOCHARITY INGESTION');
  console.log('============================================================');

  // Print Validation Output
  console.log(`New people: ${stats.newPeople}`);
  console.log(`Updated people: ${stats.updatedPeople}`);
  console.log(`New organizations: ${stats.newOrganizations}`);
  console.log(`Updated organizations: ${stats.updatedOrganizations}`);
  console.log(`New sources: ${stats.newSources}`);
  console.log(`Updated sources: ${stats.updatedSources}`);
  console.log(`New wealth snapshots: ${stats.newWealthSnapshots}`);
  console.log(`Updated wealth snapshots: ${stats.updatedWealthSnapshots}`);
  console.log(`New donations: ${stats.newDonations}`);
  console.log(`Updated donations: ${stats.updatedDonations}`);
  console.log(`Potential duplicates: ${stats.potentialDuplicates}`);
  console.log(`Invalid records: ${stats.invalidRecords}`);
  console.log('------------------------------------------------------------');

  if (potentialDuplicatesList.length > 0) {
    console.log(`\n⚠️  POTENTIAL DUPLICATES (${potentialDuplicatesList.length} flagged for manual review):`);
    potentialDuplicatesList.forEach((pd, idx) => {
      console.log(`  ${idx + 1}. [${pd.entity}] Incoming: "${pd.incoming}" vs Existing: "${pd.existing}" -> Reason: ${pd.reason}`);
    });
  }

  if (invalidRecordsList.length > 0) {
    console.log(`\n❌ INVALID RECORDS (${invalidRecordsList.length} rejected):`);
    invalidRecordsList.forEach((inv, idx) => {
      console.log(`  ${idx + 1}. [${inv.entity}] Errors: ${inv.errors.join('; ')}`);
    });
  }

  if (dryRun) {
    console.log('\n✅ Dry run completed successfully. Zero database writes performed.');
    console.log('   Run without --dry-run to commit changes to Supabase.');
    return { success: true, plan };
  }

  // Live execution against Supabase
  if (!supabase) {
    throw new Error('Cannot execute live ingestion: Supabase client is unconfigured or credentials missing.');
  }

  console.log('\n💾 Committing changes to Supabase PostgreSQL...');

  // 1. Insert People
  if (operations.peopleToInsert.length > 0) {
    const { error } = await supabase.from('people').upsert(
      operations.peopleToInsert.map(p => ({
        id: p.id,
        canonical_name: p.canonical_name,
        first_name: p.first_name,
        last_name: p.last_name,
        aliases: p.aliases,
        country: p.country,
        birth_date: p.birth_date,
        occupation: p.occupation,
        industry: p.industry,
        description: p.description,
        is_billionaire: p.is_billionaire
      }))
    );
    if (error) {
      if (error.message.includes('row-level security')) {
        throw new Error(`Row-Level Security (RLS) rejected insert on people. To write live data to Supabase, provide SUPABASE_SERVICE_ROLE_KEY in your local .env file. (Current connection uses anon key: public read-only).`);
      }
      throw new Error(`Error inserting people: ${error.message}`);
    }
  }

  // 2. Insert Organizations
  if (operations.orgsToInsert.length > 0) {
    const { error } = await supabase.from('organizations').upsert(
      operations.orgsToInsert.map(o => ({
        id: o.id,
        legal_name: o.legal_name,
        display_name: o.display_name,
        organization_type: o.organization_type,
        ein: o.ein,
        cik: o.cik,
        country: o.country,
        website: o.website,
        description: o.description
      }))
    );
    if (error) throw new Error(`Error inserting organizations: ${error.message}`);
  }

  // 3. Insert Sources
  if (operations.sourcesToInsert.length > 0) {
    const { error } = await supabase.from('sources').upsert(
      operations.sourcesToInsert.map(s => ({
        id: s.id,
        url: s.url,
        publisher: s.publisher,
        title: s.title,
        source_type: s.source_type,
        published_at: s.published_at,
        accessed_at: s.accessed_at,
        notes: s.notes
      }))
    );
    if (error) throw new Error(`Error inserting sources: ${error.message}`);
  }

  // 4. Insert Wealth Snapshots
  if (operations.snapshotsToInsert.length > 0) {
    const { error } = await supabase.from('wealth_snapshots').upsert(
      operations.snapshotsToInsert.map(ws => ({
        id: ws.id,
        person_id: ws.person_id,
        snapshot_date: ws.snapshot_date,
        net_worth: ws.net_worth,
        currency: ws.currency,
        source_id: ws.source_id,
        source_name: ws.source_name,
        confidence: ws.confidence
      }))
    );
    if (error) throw new Error(`Error inserting wealth snapshots: ${error.message}`);
  }

  // 5. Insert Donations
  if (operations.donationsToInsert.length > 0) {
    const { error } = await supabase.from('donations').upsert(
      operations.donationsToInsert.map(d => ({
        id: d.id,
        donor_person_id: d.donor_person_id,
        donor_organization_id: d.donor_organization_id,
        recipient_organization_id: d.recipient_organization_id,
        amount: d.amount,
        currency: d.currency,
        donation_date: d.donation_date,
        donation_type: d.donation_type,
        funding_source_type: d.funding_source_type,
        status: d.status,
        description: d.description,
        cause_category: d.cause_category,
        source_id: d.source_id
      }))
    );
    if (error) throw new Error(`Error inserting donations: ${error.message}`);
  }

  console.log('✅ Ingestion successfully committed to Supabase database!');
  return { success: true, plan };
}
