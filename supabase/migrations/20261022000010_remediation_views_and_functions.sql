-- ==============================================================================
-- NoCharity Supabase Migration: 20261022000010_remediation_views_and_functions.sql
-- Remediation Pass:
-- 1. Strictly enforce snapshot_date <= donation_date (never use future snapshots)
-- 2. Enforce 3-year (1095-day) historical parity horizon (older -> UNAVAILABLE)
-- 3. Eliminate invalid lifetime_personal_giving_ratio
-- 4. Expose peak_historical_percentage and avg_historical_percentage
-- 5. Add database-side rankings for personal giving, peak percentage, largest donation, net worth
-- ==============================================================================

-- 1. HISTORICAL PARITY LOOKUP (NEVER SEARCH FORWARD IN TIME)
CREATE OR REPLACE FUNCTION public.get_closest_net_worth(
    p_person_id UUID,
    p_target_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
    v_net_worth NUMERIC;
    v_snapshot_date DATE;
    v_days_diff INT;
BEGIN
    IF p_person_id IS NULL OR p_target_date IS NULL THEN
        RETURN NULL;
    END IF;

    -- Strictly search snapshots on or before target date with positive net worth
    SELECT net_worth, snapshot_date, (p_target_date - snapshot_date)
    INTO v_net_worth, v_snapshot_date, v_days_diff
    FROM wealth_snapshots
    WHERE person_id = p_person_id
      AND snapshot_date <= p_target_date
      AND net_worth > 0
    ORDER BY snapshot_date DESC
    LIMIT 1;

    -- If no prior snapshot, or older than 3 years (1095 days), return NULL (Parity Unavailable)
    -- NEVER fall back forward in time!
    IF v_net_worth IS NULL OR v_days_diff > 1095 THEN
        RETURN NULL;
    END IF;

    RETURN v_net_worth;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. COMPREHENSIVE HISTORICAL SNAPSHOT CLASSIFICATION
CREATE OR REPLACE FUNCTION public.get_historical_snapshot_details(
    p_person_id UUID,
    p_target_date DATE
)
RETURNS TABLE (
    net_worth NUMERIC,
    snapshot_date DATE,
    days_diff INT,
    quality TEXT,
    source_name TEXT
) AS $$
DECLARE
    v_nw NUMERIC;
    v_sd DATE;
    v_diff INT;
    v_sn TEXT;
    v_q TEXT;
BEGIN
    IF p_person_id IS NULL OR p_target_date IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC, NULL::DATE, NULL::INT, 'UNAVAILABLE'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Look strictly on or before target date with positive net worth
    SELECT ws.net_worth, ws.snapshot_date, (p_target_date - ws.snapshot_date), ws.source_name
    INTO v_nw, v_sd, v_diff, v_sn
    FROM wealth_snapshots ws
    WHERE ws.person_id = p_person_id
      AND ws.snapshot_date <= p_target_date
      AND ws.net_worth > 0
    ORDER BY ws.snapshot_date DESC
    LIMIT 1;

    IF v_nw IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC, NULL::DATE, NULL::INT, 'UNAVAILABLE'::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    -- Classify snapshot quality
    IF v_diff = 0 THEN
        v_q := 'EXACT_DATE';
    ELSIF v_diff <= 90 THEN
        v_q := 'NEAR_DATE';
    ELSIF EXTRACT(YEAR FROM v_sd) = EXTRACT(YEAR FROM p_target_date) THEN
        v_q := 'SAME_YEAR';
    ELSIF v_diff <= 1095 THEN
        v_q := 'APPROXIMATE';
    ELSE
        -- Older than 3 years (1095 days)
        v_nw := NULL;
        v_sd := NULL;
        v_q := 'UNAVAILABLE';
    END IF;

    RETURN QUERY SELECT v_nw, v_sd, v_diff, v_q, v_sn;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. DROP DEPENDENT VIEWS TO PERMIT CLEAN SIGNATURE UPDATES
DROP VIEW IF EXISTS public.v_advanced_dashboard_metrics CASCADE;
DROP VIEW IF EXISTS public.v_person_rankings CASCADE;
DROP VIEW IF EXISTS public.v_person_giving_summary CASCADE;
DROP VIEW IF EXISTS public.v_donations_with_parity CASCADE;

-- 4. RECREATE VIEW: v_donations_with_parity
CREATE VIEW public.v_donations_with_parity AS
SELECT 
    d.id,
    d.amount,
    d.currency,
    d.donation_date,
    EXTRACT(YEAR FROM d.donation_date)::INT AS donation_year,
    d.donation_type,
    d.funding_source_type,
    d.status,
    d.description,
    d.cause_category,
    
    -- Donor Person Details
    d.donor_person_id,
    dp.canonical_name AS donor_person_name,
    dp.country AS donor_person_country,
    dp.is_billionaire AS donor_person_is_billionaire,
    
    -- Donor Organization Details
    d.donor_organization_id,
    doo.display_name AS donor_organization_name,
    doo.organization_type AS donor_organization_type,
    
    -- Recipient Details
    d.recipient_person_id,
    rp.canonical_name AS recipient_person_name,
    d.recipient_organization_id,
    ro.display_name AS recipient_organization_name,
    ro.organization_type AS recipient_organization_type,
    
    -- Attribution & Eligibility: true only for individual giving that is not disputed or pledge
    (d.donor_person_id IS NOT NULL 
     AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')
     AND d.status != 'DISPUTED') AS is_individual_attribution,

    (d.donor_person_id IS NOT NULL 
     AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')
     AND d.funding_source_type != 'PLEDGE'
     AND d.status != 'DISPUTED'
     AND snap.quality IS NOT NULL 
     AND snap.quality != 'UNAVAILABLE') AS is_personal_parity_eligible,
    
    -- Historical Net Worth Parity & Quality Classification
    snap.net_worth AS historical_net_worth,
    snap.snapshot_date AS historical_snapshot_date,
    snap.days_diff AS snapshot_days_diff,
    snap.quality AS wealth_snapshot_quality,
    snap.source_name AS wealth_source_name,
    
    -- Generosity Ratio (computed strictly against historical wealth on or before donation date)
    CASE 
        WHEN snap.quality IS NOT NULL 
             AND snap.quality != 'UNAVAILABLE' 
             AND snap.net_worth > 0 
             AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')
             AND d.status != 'DISPUTED'
        THEN (d.amount / snap.net_worth) * 100.0
        ELSE NULL
    END AS historical_generosity_ratio,
    
    CASE 
        WHEN snap.quality IS NOT NULL 
             AND snap.quality != 'UNAVAILABLE' 
             AND snap.net_worth > 0 
             AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')
             AND d.status != 'DISPUTED'
        THEN ROUND((d.amount / snap.net_worth) * 100.0, 4)
        ELSE NULL
    END AS historical_percentage,
    
    -- Primary Source
    d.source_id,
    s.publisher AS source_publisher,
    s.title AS source_title,
    s.url AS source_url,
    s.source_type AS source_tier,
    s.source_type,
    s.published_at AS source_published_at,
    
    d.created_at,
    d.updated_at
FROM donations d
LEFT JOIN people dp ON dp.id = d.donor_person_id
LEFT JOIN organizations doo ON doo.id = d.donor_organization_id
LEFT JOIN people rp ON rp.id = d.recipient_person_id
LEFT JOIN organizations ro ON ro.id = d.recipient_organization_id
LEFT JOIN sources s ON s.id = d.source_id
LEFT JOIN LATERAL get_historical_snapshot_details(d.donor_person_id, d.donation_date) snap ON true;

-- 5. RECREATE VIEW: v_person_giving_summary
-- Removes conceptually invalid lifetime_personal_giving_ratio
-- Replaces with peak_historical_percentage and avg_historical_percentage
CREATE VIEW public.v_person_giving_summary AS
WITH latest_wealth AS (
    SELECT DISTINCT ON (person_id)
        person_id,
        net_worth AS latest_net_worth,
        snapshot_date AS latest_snapshot_date,
        currency AS wealth_currency
    FROM wealth_snapshots
    ORDER BY person_id, snapshot_date DESC
),
donation_agg AS (
    SELECT
        donor_person_id AS person_id,
        COUNT(*)::INT AS total_donations_count,
        COUNT(*) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED') AND status != 'DISPUTED')::INT AS personal_donations_count,
        COALESCE(SUM(amount), 0) AS total_donated_all,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED') AND status != 'DISPUTED'), 0) AS total_personal_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'FOUNDATION'), 0) AS total_foundation_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'DAF'), 0) AS total_daf_transfers,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'CORPORATE'), 0) AS total_corporate_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'PLEDGE'), 0) AS total_pledges,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'UNKNOWN_SOURCE'), 0) AS total_unknown_giving,
        COALESCE(SUM(amount) FILTER (WHERE status = 'DISPUTED'), 0) AS total_disputed_giving,
        COALESCE(MAX(amount) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED') AND status != 'DISPUTED'), 0) AS largest_personal_donation_amount,
        MIN(EXTRACT(YEAR FROM donation_date)::INT) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED') AND status != 'DISPUTED') AS min_donation_year,
        MAX(EXTRACT(YEAR FROM donation_date)::INT) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED') AND status != 'DISPUTED') AS max_donation_year
    FROM donations
    WHERE donor_person_id IS NOT NULL
    GROUP BY donor_person_id
),
historical_parity_agg AS (
    SELECT
        donor_person_id AS person_id,
        ROUND(AVG(historical_percentage), 4) AS avg_historical_percentage,
        MAX(historical_percentage) AS peak_historical_percentage
    FROM v_donations_with_parity
    WHERE donor_person_id IS NOT NULL
      AND is_individual_attribution = true
      AND wealth_snapshot_quality != 'UNAVAILABLE'
    GROUP BY donor_person_id
)
SELECT 
    p.id AS person_id,
    p.canonical_name,
    p.first_name,
    p.last_name,
    p.aliases,
    p.country,
    p.occupation,
    p.industry,
    p.is_billionaire,
    COALESCE(p.giving_pledge, false) AS giving_pledge,
    lw.latest_net_worth,
    lw.latest_snapshot_date,
    COALESCE(lw.wealth_currency, 'USD') AS wealth_currency,
    COALESCE(da.total_donations_count, 0) AS total_donations_count,
    COALESCE(da.personal_donations_count, 0) AS personal_donations_count,
    COALESCE(da.total_donated_all, 0) AS total_donated_all,
    COALESCE(da.total_personal_giving, 0) AS total_personal_giving,
    COALESCE(da.total_foundation_giving, 0) AS total_foundation_giving,
    COALESCE(da.total_daf_transfers, 0) AS total_daf_transfers,
    COALESCE(da.total_corporate_giving, 0) AS total_corporate_giving,
    COALESCE(da.total_pledges, 0) AS total_pledges,
    COALESCE(da.total_unknown_giving, 0) AS total_unknown_giving,
    COALESCE(da.total_disputed_giving, 0) AS total_disputed_giving,
    COALESCE(da.largest_personal_donation_amount, 0) AS largest_personal_donation_amount,
    COALESCE(hpa.peak_historical_percentage, 0) AS peak_historical_percentage,
    COALESCE(hpa.avg_historical_percentage, 0) AS avg_historical_percentage,
    da.min_donation_year,
    da.max_donation_year
FROM people p
LEFT JOIN latest_wealth lw ON p.id = lw.person_id
LEFT JOIN donation_agg da ON p.id = da.person_id
LEFT JOIN historical_parity_agg hpa ON p.id = hpa.person_id;

-- 6. RECREATE VIEW: v_person_rankings
-- Database-side dense ranks for core observable metrics
CREATE VIEW public.v_person_rankings AS
SELECT 
    person_id,
    canonical_name,
    first_name,
    last_name,
    country,
    industry,
    occupation,
    latest_net_worth,
    latest_snapshot_date,
    giving_pledge,
    personal_donations_count,
    total_personal_giving,
    largest_personal_donation_amount,
    total_foundation_giving,
    total_corporate_giving,
    total_donated_all,
    peak_historical_percentage,
    avg_historical_percentage,
    min_donation_year,
    max_donation_year,
    DENSE_RANK() OVER (ORDER BY total_personal_giving DESC) AS rank_by_personal_giving,
    DENSE_RANK() OVER (ORDER BY largest_personal_donation_amount DESC) AS rank_by_largest_donation,
    DENSE_RANK() OVER (ORDER BY peak_historical_percentage DESC) AS rank_by_peak_percentage,
    DENSE_RANK() OVER (ORDER BY COALESCE(latest_net_worth, 0) DESC) AS rank_by_net_worth,
    DENSE_RANK() OVER (ORDER BY personal_donations_count DESC) AS rank_by_donations_count
FROM v_person_giving_summary
WHERE is_billionaire = true;

-- 7. RECREATE VIEW: v_advanced_dashboard_metrics
CREATE VIEW public.v_advanced_dashboard_metrics AS
SELECT 
    COUNT(DISTINCT p.id)::INT AS tracked_billionaires_count,
    COUNT(d.id) FILTER (WHERE d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED') AND d.status != 'DISPUTED')::INT AS documented_personal_donations_count,
    COALESCE(SUM(d.amount) FILTER (WHERE d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED') AND d.status != 'DISPUTED'), 0)::NUMERIC AS documented_personal_giving_total,
    COUNT(d.id) FILTER (WHERE d.status = 'VERIFIED')::INT AS verified_donations_count,
    (SELECT COUNT(*)::INT FROM sources) AS sources_count,
    MAX(d.donation_date) AS latest_data_date,
    COALESCE(SUM(d.amount) FILTER (WHERE d.funding_source_type = 'FOUNDATION'), 0)::NUMERIC AS total_foundation_giving,
    COALESCE(SUM(d.amount) FILTER (WHERE d.funding_source_type = 'CORPORATE'), 0)::NUMERIC AS total_corporate_giving,
    COALESCE(SUM(d.amount) FILTER (WHERE d.funding_source_type = 'DAF'), 0)::NUMERIC AS total_daf_transfers,
    COALESCE(SUM(d.amount) FILTER (WHERE d.funding_source_type = 'PLEDGE'), 0)::NUMERIC AS total_pledges
FROM people p
LEFT JOIN donations d ON d.donor_person_id = p.id
WHERE p.is_billionaire = true;
