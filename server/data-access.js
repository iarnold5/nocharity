/**
 * NoCharity Advanced Mode — Data Access Layer (Phase 2)
 * 
 * Reusable, high-performance database service module backed by Supabase PostgreSQL.
 * Strictly adheres to free-tier constraints:
 * - Single-round-trip queries using SQL views (v_donations_with_parity, v_person_giving_summary, v_person_rankings)
 * - Zero N+1 query patterns
 * - Paginated queries with safe limits
 * - Attribution classification and historical parity enforcement
 * - Graceful fallback mode if Supabase is offline/unconfigured
 */

import { supabase, isConfigured, getSupabaseStatus } from './supabase.js';
import {
  calculateHistoricalDonationParity,
  findClosestHistoricalWealthSnapshot,
  classifySnapshotQuality,
  isPersonalParityEligible,
  QUALITY_TIERS,
  QUALITY_METADATA,
  FUNDING_SOURCE_TYPES,
  DONATION_STATUSES,
  FUNDING_SOURCE_METADATA,
  STATUS_METADATA
} from './parity-engine.js';
import { computeDataQualityScore } from './data-quality.js';
import { appCache } from './cache.js';

/**
 * 1. getPeople
 * Retrieves a paginated list of tracked individuals with their latest net worth and giving totals.
 * Uses v_person_giving_summary to eliminate N+1 queries.
 */
export async function getPeople({
  limit = 20,
  offset = 0,
  search = null,
  country = null,
  industry = null,
  minNetWorth = null,
  maxNetWorth = null,
  minGiving = null,
  maxGiving = null,
  givingPledge = null,
  isBillionaire = null,
  sortBy = 'name',
  sortOrder = 'asc',
  tag = null
} = {}) {
  if (!supabase) {
    return {
      source: 'offline_fallback',
      totalCount: 0,
      limit,
      offset,
      people: []
    };
  }

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  let query = supabase
    .from('v_person_giving_summary')
    .select(`
      person_id,
      canonical_name,
      first_name,
      last_name,
      aliases,
      country,
      occupation,
      industry,
      is_billionaire,
      giving_pledge,
      latest_net_worth,
      latest_snapshot_date,
      wealth_currency,
      total_donations_count,
      personal_donations_count,
      total_donated_all,
      total_personal_giving,
      total_foundation_giving,
      total_daf_transfers,
      total_corporate_giving,
      total_pledges,
      lifetime_personal_giving_ratio,
      avg_historical_percentage,
      peak_historical_percentage
    `, { count: 'exact' });

  if (search) {
    query = query.ilike('canonical_name', `%${search}%`);
  }

  if (country && country !== 'all') {
    query = query.ilike('country', `%${country}%`);
  }

  if (industry && industry !== 'all') {
    query = query.ilike('industry', `%${industry}%`);
  }

  if (minNetWorth !== null && minNetWorth !== undefined && minNetWorth !== '') {
    query = query.gte('latest_net_worth', parseFloat(minNetWorth));
  }

  if (maxNetWorth !== null && maxNetWorth !== undefined && maxNetWorth !== '') {
    query = query.lte('latest_net_worth', parseFloat(maxNetWorth));
  }

  if (minGiving !== null && minGiving !== undefined && minGiving !== '') {
    query = query.gte('total_personal_giving', parseFloat(minGiving));
  }

  if (maxGiving !== null && maxGiving !== undefined && maxGiving !== '') {
    query = query.lte('total_personal_giving', parseFloat(maxGiving));
  }

  if (givingPledge !== null && givingPledge !== undefined && givingPledge !== '' && givingPledge !== 'all') {
    query = query.eq('giving_pledge', givingPledge === true || givingPledge === 'true');
  }

  if (isBillionaire !== null && isBillionaire !== undefined) {
    query = query.eq('is_billionaire', isBillionaire === true || isBillionaire === 'true');
  }

  // Sorting
  const isAscending = String(sortOrder).toLowerCase() === 'asc';
  switch (sortBy) {
    case 'net_worth':
      query = query.order('latest_net_worth', { ascending: isAscending });
      break;
    case 'personal_giving':
      query = query.order('total_personal_giving', { ascending: isAscending });
      break;
    case 'giving_ratio':
    case 'peak_percentage':
      query = query.order('peak_historical_percentage', { ascending: isAscending, nullsFirst: false });
      break;
    case 'org_giving':
      query = query.order('total_foundation_giving', { ascending: isAscending });
      break;
    case 'name':
    default:
      query = query.order('canonical_name', { ascending: isAscending });
      break;
  }

  query = query.range(safeOffset, safeOffset + safeLimit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    source: 'supabase',
    totalCount: count,
    limit: safeLimit,
    offset: safeOffset,
    people: data
  };
}

/**
 * 2. getPersonById / getBillionaireProfile (Phase 7 Profile Engine)
 * Retrieves full individual billionaire profile:
 * - Header details (name, country, industry, latest net worth, snapshot date, data source)
 * - Wealth History (immutable snapshots for charting and table)
 * - Documented Personal Giving metrics (lifetime, count, largest, latest, average, giving % at donation)
 * - Associated Organization Giving (foundations, companies, DAFs, and their distinct donations)
 * - Detailed Donation History with historical wealth, snapshot proximity, and citation provenance
 */
export async function getBillionaireProfile(personIdOrSlug) {
  if (!supabase) return null;

  // 1. Resolve person UUID
  let resolvedId = personIdOrSlug;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(personIdOrSlug);
  if (!isUuid) {
    const slugName = String(personIdOrSlug).replace(/-/g, ' ').trim();
    const { data: matched, error: matchErr } = await supabase
      .from('people')
      .select('id')
      .or(`canonical_name.ilike.%${slugName}%,first_name.ilike.%${slugName}%,last_name.ilike.%${slugName}%`)
      .limit(1)
      .maybeSingle();

    if (matchErr || !matched) return null;
    resolvedId = matched.id;
  }

  // 2. Fetch person summary, wealth snapshots, organizations, and tags in parallel
  const [summaryRes, snapshotsRes, orgsRes, tagsRes] = await Promise.all([
    supabase.from('v_person_giving_summary').select('*').eq('person_id', resolvedId).maybeSingle(),
    supabase.from('wealth_snapshots').select('*').eq('person_id', resolvedId).order('snapshot_date', { ascending: true }),
    getPersonOrganizations(resolvedId),
    supabase.from('person_tags').select('tag:tags(id, slug, name, description)').eq('person_id', resolvedId)
  ]);

  if (summaryRes.error) throw summaryRes.error;
  if (!summaryRes.data) return null;

  const summary = summaryRes.data;
  const snapshots = snapshotsRes.data || [];
  const organizations = orgsRes || [];
  const tags = (tagsRes.data || []).map(tl => tl.tag).filter(Boolean);

  // Determine latest benchmark data source
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const latestWealthSourceName = latestSnapshot?.source_name || 'Bloomberg Billionaires Index / Forbes';

  // 3. Fetch all donations attributed to this individual or their associated organizations
  const orgIds = organizations.map(o => o.organization?.id).filter(Boolean);
  let donQuery = supabase
    .from('v_donations_with_parity')
    .select('*')
    .order('donation_date', { ascending: false });

  if (orgIds.length > 0) {
    donQuery = donQuery.or(`donor_person_id.eq.${resolvedId},donor_organization_id.in.(${orgIds.join(',')})`);
  } else {
    donQuery = donQuery.eq('donor_person_id', resolvedId);
  }

  const { data: allDonations, error: donErr } = await donQuery;
  if (donErr) throw donErr;

  // Separate strictly into personal giving vs associated organization giving
  const personalDonations = [];
  const organizationDonations = [];

  for (const d of (allDonations || [])) {
    if (d.donor_person_id === resolvedId && 
        (d.funding_source_type === 'PERSONAL_DIRECT' || d.funding_source_type === 'PERSONAL_FUNDS_CONFIRMED') && 
        d.status !== 'DISPUTED') {
      personalDonations.push(d);
    } else {
      organizationDonations.push(d);
    }
  }

  // Compute Documented Personal Giving Metrics
  const qualifyingCount = personalDonations.length;
  const lifetimePersonalGiving = personalDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  // Largest donation
  let largestDonation = null;
  if (personalDonations.length > 0) {
    const sorted = [...personalDonations].sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
    const largest = sorted[0];
    largestDonation = {
      id: largest.id,
      amount: parseFloat(largest.amount),
      donation_date: largest.donation_date,
      recipient: largest.recipient_organization_name || largest.recipient_person_name || largest.cause_category || 'Charitable Grant',
      cause_category: largest.cause_category,
      historical_percentage: largest.historical_percentage,
      historical_net_worth: largest.historical_net_worth,
      source_publisher: largest.source_publisher,
      source_url: largest.source_url
    };
  }

  // Latest donation (already sorted by donation_date desc)
  let latestDonation = null;
  if (personalDonations.length > 0) {
    const latest = personalDonations[0];
    latestDonation = {
      id: latest.id,
      amount: parseFloat(latest.amount),
      donation_date: latest.donation_date,
      recipient: latest.recipient_organization_name || latest.recipient_person_name || latest.cause_category || 'Charitable Grant',
      cause_category: latest.cause_category,
      historical_percentage: latest.historical_percentage,
      historical_net_worth: latest.historical_net_worth,
      source_publisher: latest.source_publisher,
      source_url: latest.source_url
    };
  }

  // Average donation
  const averageDonation = qualifyingCount > 0 ? lifetimePersonalGiving / qualifyingCount : 0;

  // Giving as % of wealth at time of donation
  const eligibleRatios = personalDonations
    .map(d => parseFloat(d.historical_percentage))
    .filter(r => !isNaN(r) && r !== null && r !== undefined);
  const avgGivingPctAtDonation = eligibleRatios.length > 0
    ? eligibleRatios.reduce((a, b) => a + b, 0) / eligibleRatios.length
    : (summary.avg_historical_percentage || 0);

  return {
    ...summary,
    person_id: resolvedId,
    latest_wealth_source_name: latestWealthSourceName,
    tags,

    // Documented Personal Giving Metrics (Phase 7)
    personal_giving_metrics: {
      lifetime_personal_giving: lifetimePersonalGiving,
      qualifying_donations_count: qualifyingCount,
      largest_donation: largestDonation,
      latest_donation: latestDonation,
      average_donation: averageDonation,
      giving_as_pct_of_wealth_at_donation: Math.round(avgGivingPctAtDonation * 10000) / 10000,
      peak_donation_percentage: summary.peak_historical_percentage !== undefined ? parseFloat(summary.peak_historical_percentage) : (eligibleRatios.length > 0 ? Math.max(...eligibleRatios) : null),
      lifetime_personal_giving_ratio: null
    },

    // Associated Organization Giving (Separate section - MUST NOT be merged)
    associated_organization_giving: {
      total_foundation_giving: summary.total_foundation_giving || 0,
      total_corporate_giving: summary.total_corporate_giving || 0,
      total_daf_transfers: summary.total_daf_transfers || 0,
      total_pledges: summary.total_pledges || 0,
      organizations: organizations.map(o => ({
        id: o.organization?.id,
        display_name: o.organization?.display_name,
        legal_name: o.organization?.legal_name,
        organization_type: o.organization?.organization_type,
        relationship_type: o.relationship_type,
        ownership_percent: o.ownership_percent,
        ein: o.organization?.ein,
        cik: o.organization?.cik,
        country: o.organization?.country,
        website: o.organization?.website,
        description: o.organization?.description
      })),
      donations: organizationDonations
    },

    // Wealth History (Immutable Snapshots for simple historical chart)
    wealth_history: {
      total_count: snapshots.length,
      snapshots: snapshots // chronological for chart
    },

    // Personal and Organization Donations
    personal_donations: personalDonations,
    donations: personalDonations.concat(organizationDonations)
  };
}

export async function getPersonById(personIdOrSlug) {
  return getBillionaireProfile(personIdOrSlug);
}

/**
 * 3. getWealthHistory
 * Retrieves chronological historical net worth valuations for a person.
 * Historical valuations are immutable.
 */
export async function getWealthHistory(personId, { limit = 50, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const cacheKey = `wealth_${personId}_${safeLimit}_${safeOffset}`;

  return appCache.wrap(cacheKey, async () => {
    if (!supabase) return { snapshots: [], totalCount: 0 };

    const { data, error, count } = await supabase
      .from('wealth_snapshots')
      .select(`
        id,
        snapshot_date,
        net_worth,
        currency,
        source_name,
        source_id,
        confidence,
        created_at
      `, { count: 'exact' })
      .eq('person_id', personId)
      .order('snapshot_date', { ascending: false })
      .range(safeOffset, safeOffset + safeLimit - 1);

    if (error) throw error;

    return {
      personId,
      totalCount: count,
      limit: safeLimit,
      offset: safeOffset,
      snapshots: data
    };
  }, 120);
}

/**
 * 4. getDonations
 * Paginated query on v_donations_with_parity supporting multi-dimensional filters.
 */
export async function getDonations({
  personId = null,
  organizationId = null,
  fundingSourceType = null,
  status = null,
  causeCategory = null,
  sourceType = null,
  minAmount = null,
  maxAmount = null,
  startDate = null,
  endDate = null,
  countsAsPersonalOnly = false,
  includeAssociatedOrgGiving = false,
  sortBy = 'date',
  sortOrder = 'desc',
  limit = 20,
  offset = 0
} = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

  if (!supabase) {
    return {
      source: 'offline_fallback',
      totalCount: 0,
      limit: safeLimit,
      offset: safeOffset,
      sortBy,
      sortOrder,
      includeAssociatedOrgGiving: Boolean(includeAssociatedOrgGiving),
      donations: []
    };
  }

  let query = supabase
    .from('v_donations_with_parity')
    .select(`
      id,
      amount,
      currency,
      donation_date,
      donation_year,
      donation_type,
      funding_source_type,
      status,
      description,
      cause_category,
      donor_person_id,
      donor_person_name,
      donor_person_country,
      donor_person_is_billionaire,
      donor_organization_id,
      donor_organization_name,
      donor_organization_type,
      recipient_person_id,
      recipient_person_name,
      recipient_organization_id,
      recipient_organization_name,
      recipient_organization_type,
      is_individual_attribution,
      historical_net_worth,
      historical_percentage,
      historical_snapshot_date,
      snapshot_days_diff,
      wealth_snapshot_quality,
      wealth_source_name,
      historical_generosity_ratio,
      source_id,
      source_publisher,
      source_title,
      source_url,
      source_tier,
      created_at
    `, { count: 'exact' });

  if (personId) {
    query = query.or(`donor_person_id.eq.${personId},recipient_person_id.eq.${personId}`);
  }

  if (organizationId) {
    query = query.or(`donor_organization_id.eq.${organizationId},recipient_organization_id.eq.${organizationId}`);
  }

  if (fundingSourceType && fundingSourceType !== 'all') {
    query = query.eq('funding_source_type', fundingSourceType);
  } else if (!includeAssociatedOrgGiving || countsAsPersonalOnly) {
    // Default Phase 5 & Phase 8 Rule: Personal giving calculations MUST NOT include money donated by a company or foundation
    query = query.eq('is_individual_attribution', true);
  }

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (sourceType && sourceType !== 'all') {
    query = query.eq('source_tier', sourceType);
  }

  if (causeCategory && causeCategory !== 'all') {
    query = query.ilike('cause_category', `%${causeCategory}%`);
  }

  if (minAmount !== null && minAmount !== undefined && minAmount !== '') {
    query = query.gte('amount', parseFloat(minAmount));
  }

  if (maxAmount !== null && maxAmount !== undefined && maxAmount !== '') {
    query = query.lte('amount', parseFloat(maxAmount));
  }

  if (startDate) {
    query = query.gte('donation_date', startDate);
  }

  if (endDate) {
    query = query.lte('donation_date', endDate);
  }

  // Phase 8 Sorting
  let sortCol = 'donation_date';
  const isAsc = String(sortOrder).toLowerCase() === 'asc';

  switch (String(sortBy).toLowerCase()) {
    case 'amount':
      sortCol = 'amount';
      break;
    case 'percentage':
    case 'pct_wealth':
    case 'percent':
    case 'giving_ratio':
    case 'historical_percentage':
      sortCol = 'historical_percentage';
      break;
    case 'billionaire':
    case 'donor':
    case 'name':
      sortCol = 'donor_person_name';
      break;
    case 'status':
    case 'confidence':
      sortCol = 'status';
      break;
    case 'date':
    default:
      sortCol = 'donation_date';
      break;
  }

  query = query
    .order(sortCol, { ascending: isAsc, nullsFirst: false })
    .order('id', { ascending: true })
    .range(safeOffset, safeOffset + safeLimit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  // Enrich with Phase 5 & Phase 8 metadata and explicit badges
  const enriched = (data || []).map(d => {
    const fType = d.funding_source_type || 'UNKNOWN_SOURCE';
    const st = d.status || 'UNVERIFIED';
    const eligibility = isPersonalParityEligible(fType, st);

    let badgeText = 'PERSONAL';
    let badgeClass = 'badge-personal';
    if (fType === 'FOUNDATION') {
      badgeText = 'FOUNDATION';
      badgeClass = 'badge-foundation';
    } else if (fType === 'CORPORATE') {
      badgeText = 'CORPORATE';
      badgeClass = 'badge-corporate';
    } else if (fType === 'DAF') {
      badgeText = 'DAF';
      badgeClass = 'badge-daf';
    } else if (fType === 'PLEDGE') {
      badgeText = 'PLEDGE';
      badgeClass = 'badge-pledge';
    } else if (fType === 'UNKNOWN_SOURCE') {
      badgeText = 'UNKNOWN';
      badgeClass = 'badge-unverified';
    }

    const snapshotDate = d.historical_snapshot_date || d.historical_wealth_snapshot_date;
    const quality = computeDataQualityScore(d, {
      snapshotDate,
      sources: d.source_url ? [{ url: d.source_url, publisher: d.source_publisher }] : []
    });

    return {
      ...d,
      historical_snapshot_date: snapshotDate,
      historical_wealth_snapshot_date: snapshotDate,
      historical_wealth_days_diff: d.snapshot_days_diff,
      historical_wealth_quality_tier: d.wealth_snapshot_quality,
      generosity_ratio: d.historical_generosity_ratio,
      data_quality_score: quality.score,
      quality_score: quality.score,
      data_quality_grade: quality.grade,
      data_quality_factors: {
        eight_questions_answered: quality.answered_questions_count,
        eight_questions_total: 8,
        verification_status: st,
        source_quality: d.source_tier || 'PRIMARY',
        temporal_confidence: d.wealth_snapshot_quality || 'UNAVAILABLE',
        attribution: fType
      },
      funding_source_badge: badgeText,
      funding_source_badge_class: badgeClass,
      funding_source_metadata: FUNDING_SOURCE_METADATA[fType] || FUNDING_SOURCE_METADATA.UNKNOWN_SOURCE,
      status_metadata: STATUS_METADATA[st] || STATUS_METADATA.UNVERIFIED,
      is_personal_parity_eligible: eligibility.isEligible,
      eligibility_reason: eligibility.reason
    };
  });

  return {
    source: 'supabase',
    totalCount: count,
    limit: safeLimit,
    offset: safeOffset,
    sortBy,
    sortOrder: isAsc ? 'asc' : 'desc',
    includeAssociatedOrgGiving: Boolean(includeAssociatedOrgGiving),
    donations: enriched
  };
}

/**
 * 5. getDonationById
 * Retrieves a single donation record with full parity data, tags, and corroborating citations.
 */
export async function getDonationById(donationId) {
  if (!supabase) return null;

  const { data: donation, error: donationErr } = await supabase
    .from('v_donations_with_parity')
    .select('*')
    .eq('id', donationId)
    .maybeSingle();

  if (donationErr) throw donationErr;
  if (!donation) return null;

  // Fetch corroborating sources and tags in parallel
  const [sourcesRes, tagsRes] = await Promise.all([
    getSourcesForDonation(donationId),
    supabase
      .from('donation_tags')
      .select('tag:tags(id, slug, name, description)')
      .eq('donation_id', donationId)
  ]);

  const tags = (tagsRes.data || []).map(t => t.tag).filter(Boolean);

  return {
    ...donation,
    sources: sourcesRes,
    tags
  };
}

/**
 * 6. getSourcesForDonation
 * Retrieves primary and corroborating sources supporting a donation.
 */
export async function getSourcesForDonation(donationId) {
  if (!supabase) return [];

  // Try RPC function first
  try {
    const { data, error } = await supabase.rpc('get_sources_for_donation', {
      p_donation_id: donationId
    });

    if (!error && data) return data;
  } catch (e) {
    // Fall back to direct query if RPC is unavailable
  }

  // Fallback: Query donation_sources join sources
  const { data: dsLinks, error: dsErr } = await supabase
    .from('donation_sources')
    .select(`
      source:sources(
        id,
        publisher,
        title,
        url,
        source_type,
        published_at,
        accessed_at,
        notes
      )
    `)
    .eq('donation_id', donationId);

  if (dsErr) throw dsErr;
  return (dsLinks || []).map(l => l.source).filter(Boolean);
}

/**
 * 7. getPersonOrganizations
 * Retrieves organizational affiliations, leadership roles, and ownership percentages.
 */
export async function getPersonOrganizations(personId) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('person_organizations')
    .select(`
      id,
      relationship_type,
      ownership_percent,
      start_date,
      end_date,
      organization:organizations(
        id,
        legal_name,
        display_name,
        organization_type,
        ein,
        cik,
        country,
        website,
        description
      ),
      source:sources(id, publisher, title, url)
    `)
    .eq('person_id', personId)
    .order('relationship_type');

  if (error) throw error;
  return data;
}

/**
 * 8. getPersonGivingSummary
 * Fetches pre-computed aggregated giving metrics for a single person.
 */
export async function getPersonGivingSummary(personId) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('v_person_giving_summary')
    .select('*')
    .eq('person_id', personId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * getDashboardMetrics
 * Returns documented summary metrics from v_advanced_dashboard_metrics.
 */
export async function getDashboardMetrics() {
  return appCache.wrap('dashboard_metrics', async () => {
    if (!supabase) {
      return {
        source: 'offline_fallback',
        documentedMetrics: {
          trackedBillionairesCount: 17,
          documentedPersonalDonationsCount: 18,
          documentedPersonalGivingTotal: 421915000000,
          verifiedDonationsCount: 41,
          sourcesCount: 45,
          latestDataDate: '2025-06-28',
          totalFoundationGiving: 236661000000,
          totalCorporateGiving: 250000000,
          totalDafTransfers: 5740000000,
          totalPledges: 11632000000
        },
        notice: "All metrics represent strictly verified, publicly documented regulatory filings (SEC Form 4, 990-PF) and investigative records. They do not claim to represent complete or unverified real-world financial activity."
      };
    }

    const { data, error } = await supabase
      .from('v_advanced_dashboard_metrics')
      .select('*')
      .maybeSingle();

    if (error) throw error;

    return {
      source: 'supabase',
      documentedMetrics: {
        trackedBillionairesCount: data?.tracked_billionaires_count || 0,
        documentedPersonalDonationsCount: data?.documented_personal_donations_count || 0,
        documentedPersonalGivingTotal: parseFloat(data?.documented_personal_giving_total || 0),
        verifiedDonationsCount: data?.verified_donations_count || 0,
        sourcesCount: data?.sources_count || 0,
        latestDataDate: data?.latest_data_date || 'N/A',
        totalFoundationGiving: parseFloat(data?.total_foundation_giving || 0),
        totalCorporateGiving: parseFloat(data?.total_corporate_giving || 0),
        totalDafTransfers: parseFloat(data?.total_daf_transfers || 0),
        totalPledges: parseFloat(data?.total_pledges || 0)
      },
      notice: "All metrics represent strictly verified, publicly documented regulatory filings (SEC Form 4, 990-PF) and investigative records. They do not claim to represent complete or unverified real-world financial activity."
    };
  }, 60);
}

/**
 * 9. getRankings
 * Returns a documented leaderboard ranking people across 6 core metrics:
 * 1. largest_donation: Largest documented personal donation
 * 2. personal_giving: Highest documented personal giving total
 * 3. giving_ratio: Highest giving as percentage of wealth at time of donation (donation amount / wealth at donation date)
 * 4. average_donation: Highest average personal donation
 * 5. most_donations: Most documented personal donations
 * 6. giving_per_year: Giving per year, where sufficient historical data exists (span >= 2 years)
 * (Legacy fallback: net_worth)
 */
export async function getRankings({
  metric = 'personal_giving',
  limit = 20,
  offset = 0
} = {}) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);
  const cacheKey = `rankings_${metric}_${safeLimit}_${safeOffset}`;

  return appCache.wrap(cacheKey, async () => {
    if (!supabase) {
      const fallbackPeople = [
      {
        person_id: 'b0000000-0000-0000-0000-000000000006',
        canonical_name: 'Andrew Carnegie (Historic)',
        country: '🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland / 🇺🇸 US',
        industry: 'Steel & Heavy Industry',
        occupation: 'Industrialist & Philanthropist',
        latest_net_worth: 350000000,
        wealth_note: 'Nominal historical USD (1901 peak fortune of $350 million after sale of Carnegie Steel)',
        giving_pledge: true,
        qualifying_donations_count: 2,
        total_personal_giving: 135000000,
        avg_personal_donation: 67500000,
        largest_personal_donation: {
          amount: 125000000,
          donation_date: '1911-06-09',
          recipient: 'Carnegie Corporation of New York',
          historical_net_worth: null,
          historical_percentage: null
        },
        peak_donation_percentage: {
          percentage: 2.8571,
          amount: 10000000,
          donation_date: '1901-11-15',
          recipient: 'Carnegie Technical Schools (Carnegie Mellon)',
          historical_net_worth: 350000000
        },
        coverage_years: '1901–1911',
        coverage_span: 11,
        active_years_count: 2,
        has_sufficient_data: true,
        annualized_giving: 12272727.27,
        coverage_indicator: '1901–1911 (2 active yrs)'
      },
      {
        person_id: 'b0000000-0000-0000-0000-000000000001',
        canonical_name: 'Warren Buffett',
        country: '🇺🇸 United States',
        industry: 'Finance & Investing',
        occupation: 'Chairman & CEO, Berkshire Hathaway',
        latest_net_worth: 145000000000,
        giving_pledge: true,
        qualifying_donations_count: 4,
        total_personal_giving: 19240000000,
        avg_personal_donation: 4810000000,
        largest_personal_donation: {
          amount: 5300000000,
          donation_date: '2025-06-28',
          recipient: 'Gates Foundation & Family Foundations',
          historical_net_worth: 135000000000,
          historical_percentage: 3.9259
        },
        peak_donation_percentage: {
          percentage: 4.4167,
          amount: 5300000000,
          donation_date: '2024-06-28',
          recipient: 'Gates Foundation & Family Charities',
          historical_net_worth: 120000000000
        },
        coverage_years: '2022–2025',
        coverage_span: 4,
        active_years_count: 4,
        has_sufficient_data: true,
        annualized_giving: 4810000000,
        coverage_indicator: '2022–2025 (4 active yrs)'
      },
      {
        person_id: 'b0000000-0000-0000-0000-000000000003',
        canonical_name: 'MacKenzie Scott',
        country: '🇺🇸 United States',
        industry: 'Philanthropy',
        occupation: 'Author & Philanthropist',
        latest_net_worth: 32000000000,
        giving_pledge: true,
        qualifying_donations_count: 5,
        total_personal_giving: 15060000000,
        avg_personal_donation: 3012000000,
        largest_personal_donation: {
          amount: 4160000000,
          donation_date: '2020-12-15',
          recipient: '384 Community & COVID Relief Organizations',
          historical_net_worth: 36000000000,
          historical_percentage: 11.5556
        },
        peak_donation_percentage: {
          percentage: 11.5556,
          amount: 4160000000,
          donation_date: '2020-12-15',
          recipient: '384 Community & COVID Relief Organizations',
          historical_net_worth: 36000000000
        },
        coverage_years: '2020–2024',
        coverage_span: 5,
        active_years_count: 5,
        has_sufficient_data: true,
        annualized_giving: 3012000000,
        coverage_indicator: '2020–2024 (5 active yrs)'
      }
    ];

    return formatRankingsResult(fallbackPeople, metric, safeOffset, safeLimit, 'offline_fallback');
  }

  // 1. Fetch people summary and personal qualifying donations in parallel
  const [summaryRes, personalDonationsRes] = await Promise.all([
    supabase.from('v_person_giving_summary').select('*'),
    supabase
      .from('v_donations_with_parity')
      .select(`
        id,
        amount,
        currency,
        donation_date,
        funding_source_type,
        status,
        recipient_person_name,
        recipient_organization_name,
        cause_category,
        donor_person_id,
        donor_person_name,
        historical_net_worth,
        historical_percentage,
        source_id,
        source_publisher,
        source_title,
        source_url
      `)
      .in('funding_source_type', ['PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'])
      .neq('status', 'DISPUTED')
      .order('donation_date', { ascending: false })
  ]);

  if (summaryRes.error) throw summaryRes.error;
  if (personalDonationsRes.error) throw personalDonationsRes.error;

  const people = summaryRes.data || [];
  const personalDonations = personalDonationsRes.data || [];

  // 2. Build full profiles with data coverage indicators and personal metrics
  const enriched = people.map(p => {
    const pDonations = personalDonations.filter(d => d.donor_person_id === p.person_id);
    const count = pDonations.length;
    const total = pDonations.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);
    const avg = count > 0 ? total / count : 0;

    // Largest personal donation
    let largest = null;
    if (count > 0) {
      const sortedByAmt = [...pDonations].sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
      const top = sortedByAmt[0];
      largest = {
        id: top.id,
        amount: parseFloat(top.amount),
        donation_date: top.donation_date,
        recipient: top.recipient_organization_name || top.recipient_person_name || top.cause_category || 'Charitable Grant',
        cause_category: top.cause_category,
        historical_net_worth: top.historical_net_worth,
        historical_percentage: top.historical_percentage,
        source_publisher: top.source_publisher,
        source_url: top.source_url
      };
    }

    // Peak giving percentage at time of donation
    // (Uses donation amount / wealth at donation date, NOT total donations / current net worth)
    let peakPct = null;
    const withPct = pDonations.filter(d => d.historical_percentage !== null && !isNaN(d.historical_percentage));
    if (withPct.length > 0) {
      const sortedByPct = [...withPct].sort((a, b) => parseFloat(b.historical_percentage) - parseFloat(a.historical_percentage));
      const topPct = sortedByPct[0];
      peakPct = {
        id: topPct.id,
        percentage: parseFloat(topPct.historical_percentage),
        amount: parseFloat(topPct.amount),
        donation_date: topPct.donation_date,
        recipient: topPct.recipient_organization_name || topPct.recipient_person_name || topPct.cause_category || 'Charitable Grant',
        cause_category: topPct.cause_category,
        historical_net_worth: topPct.historical_net_worth,
        source_publisher: topPct.source_publisher,
        source_url: topPct.source_url
      };
    }

    // Data coverage calculation
    const years = Array.from(new Set(
      pDonations.map(d => parseInt(String(d.donation_date).slice(0, 4), 10)).filter(y => !isNaN(y))
    )).sort((a, b) => a - b);

    const minYear = years.length > 0 ? years[0] : null;
    const maxYear = years.length > 0 ? years[years.length - 1] : null;
    const coverageSpan = years.length > 0 ? (maxYear - minYear + 1) : 0;
    const activeYearsCount = years.length;
    const hasSufficientData = coverageSpan >= 2;
    const coverageYears = minYear ? (minYear === maxYear ? String(minYear) : `${minYear}–${maxYear}`) : 'N/A';
    const coverageIndicator = minYear 
      ? (minYear === maxYear 
          ? `${minYear} (${count} gift${count !== 1 ? 's' : ''} on record)` 
          : `${minYear}–${maxYear} (${activeYearsCount} active yr${activeYearsCount !== 1 ? 's' : ''})`)
      : 'No verified personal gifts';

    // Giving per year: only computed when multi-year data exists (span >= 2)
    const annualizedGiving = (hasSufficientData && coverageSpan > 0) ? (total / coverageSpan) : null;

    return {
      person_id: p.person_id,
      canonical_name: p.canonical_name,
      first_name: p.first_name,
      last_name: p.last_name,
      country: p.country,
      occupation: p.occupation,
      industry: p.industry,
      is_billionaire: p.is_billionaire,
      giving_pledge: p.giving_pledge,
      latest_net_worth: parseFloat(p.latest_net_worth || 0),
      total_foundation_giving: parseFloat(p.total_foundation_giving || 0),
      qualifying_donations_count: count,
      total_personal_giving: total,
      avg_personal_donation: avg,
      largest_personal_donation: largest,
      peak_donation_percentage: peakPct,
      avg_historical_percentage: parseFloat(p.avg_historical_percentage || 0),
      peak_historical_percentage: parseFloat(p.peak_historical_percentage || (peakPct?.percentage || 0)),
      lifetime_personal_giving_ratio: null,
      coverage_years: coverageYears,
      coverage_span: coverageSpan,
      active_years_count: activeYearsCount,
      has_sufficient_data: hasSufficientData,
      annualized_giving: annualizedGiving,
      coverage_indicator: coverageIndicator
    };
  });

    return formatRankingsResult(enriched, metric, safeOffset, safeLimit, 'supabase');
  }, 60);
}

function formatRankingsResult(people, metric, safeOffset, safeLimit, source = 'supabase') {
  let metricTitle = 'Highest Documented Personal Giving Total';
  let metricDesc = 'Ranked by cumulative personal giving documented in regulatory filings.';
  let primaryColumn = 'total_personal_giving';
  let sorted = [...people];

  switch (metric) {
    case 'largest_donation':
      metricTitle = 'Largest Documented Personal Donation';
      metricDesc = 'Ranked by single largest gift verified to originate from individual personal funds (excludes foundation and corporate disbursements).';
      primaryColumn = 'largest_donation';
      sorted.sort((a, b) => {
        const amtA = a.largest_personal_donation?.amount || 0;
        const amtB = b.largest_personal_donation?.amount || 0;
        return amtB - amtA || b.total_personal_giving - a.total_personal_giving;
      });
      break;

    case 'giving_ratio':
    case 'peak_percentage':
    case 'percentage_at_donation':
      metricTitle = 'Highest Giving as % of Wealth at Time of Donation';
      metricDesc = 'Ranked by single-donation generosity ratio: (donation amount / historical net worth on donation date). Total donations divided by current wealth is strictly avoided.';
      primaryColumn = 'peak_percentage';
      sorted.sort((a, b) => {
        const pctA = a.peak_donation_percentage?.percentage || 0;
        const pctB = b.peak_donation_percentage?.percentage || 0;
        return pctB - pctA || (b.avg_historical_percentage || 0) - (a.avg_historical_percentage || 0);
      });
      break;

    case 'average_donation':
      metricTitle = 'Highest Average Personal Donation';
      metricDesc = 'Ranked by mean value per qualifying personal donation on public record.';
      primaryColumn = 'average_donation';
      sorted.sort((a, b) => {
        return (b.avg_personal_donation || 0) - (a.avg_personal_donation || 0) || b.total_personal_giving - a.total_personal_giving;
      });
      break;

    case 'most_donations':
    case 'donations_count':
      metricTitle = 'Most Documented Personal Donations';
      metricDesc = 'Ranked by total number of qualifying personal gift transactions verified on record.';
      primaryColumn = 'donations_count';
      sorted.sort((a, b) => {
        return b.qualifying_donations_count - a.qualifying_donations_count || b.total_personal_giving - a.total_personal_giving;
      });
      break;

    case 'giving_per_year':
    case 'annualized_giving':
      metricTitle = 'Giving Per Year (Where Sufficient Historical Data Exists)';
      metricDesc = 'Annualized personal giving rate over verified historical observation windows. Individuals with only single-year data are clearly demarcated to prevent short-term events from skewing annualized baselines.';
      primaryColumn = 'annualized_giving';
      sorted.sort((a, b) => {
        // Multi-year baseline individuals first, ordered by annualized rate
        if (a.has_sufficient_data && b.has_sufficient_data) {
          return (b.annualized_giving || 0) - (a.annualized_giving || 0);
        }
        if (a.has_sufficient_data && !b.has_sufficient_data) return -1;
        if (!a.has_sufficient_data && b.has_sufficient_data) return 1;
        // Among single-year individuals, order by total personal giving
        return b.total_personal_giving - a.total_personal_giving;
      });
      break;

    case 'net_worth':
      metricTitle = 'Estimated Net Worth';
      metricDesc = 'Ranked by latest documented net worth valuation.';
      primaryColumn = 'latest_net_worth';
      sorted.sort((a, b) => (b.latest_net_worth || 0) - (a.latest_net_worth || 0));
      break;

    case 'personal_giving':
    default:
      metric = 'personal_giving';
      metricTitle = 'Highest Documented Personal Giving Total';
      metricDesc = 'Ranked by cumulative personal giving documented in regulatory filings.';
      primaryColumn = 'total_personal_giving';
      sorted.sort((a, b) => b.total_personal_giving - a.total_personal_giving);
      break;
  }

  // Assign dense ranks
  const ranked = sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));

  const paginated = ranked.slice(safeOffset, safeOffset + safeLimit);

  return {
    source,
    metric,
    metric_title: metricTitle,
    metric_description: metricDesc,
    metric_primary_column: primaryColumn,
    coverage_notice: 'Rankings are based strictly on publicly verified regulatory filings (SEC Form 4, 990-PF). Coverage varies by individual and does not imply complete real-world lifetime giving. Differences in totals often reflect documentation availability rather than real-world generosity.',
    totalCount: ranked.length,
    limit: safeLimit,
    offset: safeOffset,
    rankings: paginated
  };
}

/**
 * 10. getTags
 * Retrieves all reusable classification tags.
 */
export async function getTags() {
  return appCache.wrap('tags_list', async () => {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('tags')
      .select('id, slug, name, description')
      .order('slug', { ascending: true });

    if (error) throw error;
    return data;
  }, 300);
}

/**
  * 11. calculateHistoricalParity
  * Calculates historical wealth-aware donation parity using the Phase 3 engine.
  * Dynamically queries historical wealth snapshots for a person or donation.
  */
export async function calculateHistoricalParity({
  personId = null,
  donationId = null,
  donationAmount = null,
  donationDate = null,
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
  incomeFrequency = 'monthly',
  userCurrency = '₹',
  displayExchangeRate = null
} = {}) {
  let snapshots = null;
  let targetAmount = donationAmount;
  let targetDate = donationDate;
  let targetPersonId = personId;
  let targetFundingSourceType = fundingSourceType || funding_source_type;
  let targetStatus = status || verificationStatus;
  let donorName = null;

  if (donationId) {
    const donation = await getDonationById(donationId);
    if (!donation) {
      return {
        isAvailable: false,
        quality: QUALITY_TIERS.UNAVAILABLE,
        qualityMetadata: QUALITY_METADATA.UNAVAILABLE,
        reason: `Donation with ID ${donationId} was not found.`
      };
    }
    targetAmount = donation.amount;
    targetDate = donation.donation_date;
    targetPersonId = donation.donor_person_id;
    donorName = donation.donor_person_name;
    if (!targetFundingSourceType) {
      targetFundingSourceType = donation.funding_source_type;
    }
    if (!targetStatus) {
      targetStatus = donation.status;
    }
  }

  if (targetPersonId) {
    const wealthData = await getWealthHistory(targetPersonId, { limit: 100 });
    snapshots = wealthData.snapshots || [];
  }

  const result = calculateHistoricalDonationParity({
    donationAmount: targetAmount,
    donationDate: targetDate,
    snapshots,
    historicalNetWorth,
    snapshotDate,
    fundingSourceType: targetFundingSourceType,
    status: targetStatus,
    userNetWorth,
    user_net_worth,
    monthlyIncome,
    userMonthlyIncome,
    userIncome,
    incomeFrequency,
    userCurrency,
    displayExchangeRate
  });

  if (donorName && !result.donorName) {
    result.donorName = donorName;
  }
  if (targetPersonId && !result.personId) {
    result.personId = targetPersonId;
  }
  if (donationId && !result.donationId) {
    result.donationId = donationId;
  }

  return result;
}

/**
 * 12. compareBillionairesParity
 * Phase 9 Centerpiece Service:
 * Calculates side-by-side proportional wealth comparisons for multiple billionaires
 * based on each individual's documented wealth at the time of their peak personal donation.
 * 
 * Strict Language & Nuance:
 * - Proportional wealth comparison, NOT an exact comparison of financial pain.
 * - Language: "Equivalent by percentage of wealth."
 */
export async function compareBillionairesParity({
  personIds = null,
  userNetWorth = undefined,
  user_net_worth = undefined,
  monthlyIncome = undefined,
  userMonthlyIncome = undefined,
  userIncome = 60000,
  incomeFrequency = 'monthly',
  userCurrency = '₹',
  displayExchangeRate = null
} = {}) {
  const rawNetWorth = userNetWorth !== undefined ? userNetWorth : user_net_worth;
  const hasNetWorth = rawNetWorth !== undefined && rawNetWorth !== null;
  const numericNetWorth = hasNetWorth ? parseFloat(rawNetWorth) : null;

  const rawMonthly = monthlyIncome !== undefined ? monthlyIncome : (userMonthlyIncome !== undefined ? userMonthlyIncome : undefined);
  const numericMonthlyIncome = rawMonthly !== undefined && rawMonthly !== null ? parseFloat(rawMonthly) : null;

  const numericIncome = parseFloat(userIncome) || 60000;
  const normalizedFreq = String(incomeFrequency || 'monthly').toLowerCase() === 'annual' ? 'annual' : 'monthly';
  const currencySymbol = String(userCurrency || '₹').trim();

  // Fetch rankings by giving_ratio to obtain peak qualifying personal donations
  const rankingsRes = await getRankings({ metric: 'giving_ratio', limit: 100 });
  let people = rankingsRes.rankings || [];

  if (Array.isArray(personIds) && personIds.length > 0) {
    const idSet = new Set(personIds.map(String));
    people = people.filter(p => idSet.has(String(p.person_id)));
  }

  const comparisons = people.map(p => {
    const peak = p.peak_donation_percentage;
    const ratio = peak?.percentage !== null && peak?.percentage !== undefined ? parseFloat(peak.percentage) : 0;
    
    let equivalentSacrifice = null;
    let statementEquivalent;
    let formattedEquivalent;
    let incomeInterpretation = null;

    if (numericNetWorth !== null) {
      if (numericNetWorth <= 0) {
        equivalentSacrifice = 0;
        formattedEquivalent = `${currencySymbol}0`;
        statementEquivalent = `That would be ${currencySymbol}0 for you.`;
      } else {
        equivalentSacrifice = (numericNetWorth * ratio) / 100;
        formattedEquivalent = `${currencySymbol}${Math.round(equivalentSacrifice).toLocaleString()}`;
        statementEquivalent = `That would be ${formattedEquivalent} for you.`;
      }

      if (numericMonthlyIncome && numericMonthlyIncome > 0) {
        const share = (equivalentSacrifice / numericMonthlyIncome) * 100;
        const days = equivalentSacrifice / (numericMonthlyIncome / 30);
        const daysPhrase = Math.round(days) >= 1 ? ` (roughly ${Math.round(days)} days of earnings)` : '';
        incomeInterpretation = `That's about ${Math.round(share)}% of one month's take-home pay${daysPhrase}.`;
      }
    } else {
      // Legacy income fallback
      equivalentSacrifice = (numericIncome * ratio) / 100;
      const freqLabel = normalizedFreq === 'annual' ? 'year' : 'month';
      formattedEquivalent = `${currencySymbol}${Math.round(equivalentSacrifice).toLocaleString()}`;
      statementEquivalent = `For an income of ${currencySymbol}${numericIncome.toLocaleString()}/${freqLabel}, that is equivalent to ${formattedEquivalent}.`;
    }

    const statementRatio = `They gave approximately ${ratio.toFixed(2)}% of their documented wealth at the time.`;

    return {
      person_id: p.person_id,
      canonical_name: p.canonical_name,
      country: p.country,
      industry: p.industry,
      occupation: p.occupation,
      giving_pledge: p.giving_pledge,
      latest_net_worth: p.latest_net_worth,
      coverage_years: p.coverage_years,
      coverage_indicator: p.coverage_indicator,
      has_sufficient_data: p.has_sufficient_data,
      donation: peak ? {
        id: peak.id,
        amount: peak.amount,
        donation_date: peak.donation_date,
        recipient: peak.recipient,
        cause_category: peak.cause_category,
        historical_net_worth: peak.historical_net_worth,
        source_publisher: peak.source_publisher,
        source_url: peak.source_url
      } : null,
      ratio_percentage: ratio,
      formatted_ratio: `${ratio.toFixed(2)}%`,
      user_net_worth: numericNetWorth,
      user_monthly_income: numericMonthlyIncome,
      user_income: numericIncome,
      income_frequency: normalizedFreq,
      user_currency: currencySymbol,
      user_equivalent: equivalentSacrifice,
      formatted_equivalent: formattedEquivalent,
      income_interpretation: incomeInterpretation,
      statement_ratio: statementRatio,
      statement_equivalent: statementEquivalent,
      methodology_type: 'Proportional wealth comparison',
      qualification: 'Equivalent by percentage of wealth. Not an exact comparison of financial pain.'
    };
  });

  return {
    source: rankingsRes.source || 'supabase',
    user_income: numericIncome,
    income_frequency: normalizedFreq,
    user_currency: currencySymbol,
    comparisons_count: comparisons.length,
    comparisons,
    methodology: {
      concept: "Proportional wealth comparison",
      tagline: "Equivalent by percentage of wealth",
      disclaimer: "This tool calculates equivalent financial sacrifice based on the billionaire's estimated wealth at the exact time of donation. It demonstrates relative mathematical scale, not subjective financial pain: giving 2% of a $50B fortune causes virtually no reduction in living standard, whereas 2% of an everyday income directly impacts housing, food, or emergency savings."
    }
  };
}

// Re-export parity engine constants and functions
export {
  calculateHistoricalDonationParity,
  findClosestHistoricalWealthSnapshot,
  classifySnapshotQuality,
  isPersonalParityEligible,
  QUALITY_TIERS,
  QUALITY_METADATA,
  FUNDING_SOURCE_TYPES,
  DONATION_STATUSES,
  FUNDING_SOURCE_METADATA,
  STATUS_METADATA
};
