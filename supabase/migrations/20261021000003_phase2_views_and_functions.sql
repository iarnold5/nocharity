-- ==============================================================================
-- NoCharity Supabase Migration: 20261021000003_phase2_views_and_functions.sql
-- Phase 2 Performance Views & Aggregation RPC Functions
-- ==============================================================================
-- Purpose:
--   High-efficiency SQL views and RPC functions to eliminate N+1 queries,
--   pre-compute giving totals, historical wealth lookup, and ranking calculations
--   under Supabase free-tier resource limits.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. VIEW: v_person_giving_summary
-- Aggregates personal, foundation, DAF, corporate, and pledge amounts per person
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_person_giving_summary AS
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
        COUNT(*) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED'))::INT AS personal_donations_count,
        COALESCE(SUM(amount), 0) AS total_donated_all,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')), 0) AS total_personal_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'FOUNDATION'), 0) AS total_foundation_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'DAF'), 0) AS total_daf_transfers,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'CORPORATE'), 0) AS total_corporate_giving,
        COALESCE(SUM(amount) FILTER (WHERE funding_source_type = 'PLEDGE'), 0) AS total_pledges
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
    CASE 
        WHEN lw.latest_net_worth > 0 THEN 
            ROUND((COALESCE(da.total_personal_giving, 0) / lw.latest_net_worth) * 100, 4)
        ELSE 0 
    END AS lifetime_personal_giving_ratio,
    COALESCE(hpa.avg_historical_percentage, 0) AS avg_historical_percentage,
    COALESCE(hpa.peak_historical_percentage, 0) AS peak_historical_percentage
FROM people p
LEFT JOIN latest_wealth lw ON lw.person_id = p.id
LEFT JOIN donation_agg da ON da.person_id = p.id
LEFT JOIN historical_parity_agg hpa ON hpa.person_id = p.id;

-- ------------------------------------------------------------------------------
-- 2. VIEW: v_person_rankings
-- Pre-computes leaderboard rankings across personal giving, ratio, and wealth
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_person_rankings AS
SELECT 
    s.*,
    DENSE_RANK() OVER (ORDER BY s.total_personal_giving DESC) AS rank_by_personal_giving,
    DENSE_RANK() OVER (ORDER BY s.lifetime_personal_giving_ratio DESC) AS rank_by_giving_ratio,
    DENSE_RANK() OVER (ORDER BY COALESCE(s.latest_net_worth, 0) DESC) AS rank_by_net_worth
FROM v_person_giving_summary s;

-- ------------------------------------------------------------------------------
-- 3. FUNCTION: get_sources_for_donation
-- Returns both direct primary source and corroborating secondary citations
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_sources_for_donation(p_donation_id UUID)
RETURNS TABLE (
    id UUID,
    publisher TEXT,
    title TEXT,
    url TEXT,
    source_type TEXT,
    published_at DATE,
    accessed_at DATE,
    notes TEXT,
    is_primary BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    -- 1. Primary source specified directly on the donation
    SELECT 
        s.id,
        s.publisher,
        s.title,
        s.url,
        s.source_type,
        s.published_at,
        s.accessed_at,
        s.notes,
        TRUE AS is_primary
    FROM donations d
    JOIN sources s ON s.id = d.source_id
    WHERE d.id = p_donation_id

    UNION

    -- 2. Corroborating sources linked in junction table
    SELECT 
        s.id,
        s.publisher,
        s.title,
        s.url,
        s.source_type,
        s.published_at,
        s.accessed_at,
        s.notes,
        FALSE AS is_primary
    FROM donation_sources ds
    JOIN sources s ON s.id = ds.source_id
    WHERE ds.donation_id = p_donation_id
      AND (ds.source_id != (SELECT d2.source_id FROM donations d2 WHERE d2.id = p_donation_id) OR (SELECT d3.source_id FROM donations d3 WHERE d3.id = p_donation_id) IS NULL);
END;
$$ LANGUAGE plpgsql STABLE;
