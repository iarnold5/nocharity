-- ==============================================================================
-- NoCharity Advanced Mode — Phase 3: Historical Wealth-Aware Calculation Engine
-- Migration: 20261021000004_phase3_historical_parity.sql
-- ==============================================================================

-- 1. HISTORICAL PARITY LOOKUP FUNCTION (PHASE 3 STRICT RULES)
-- Strictly searches snapshots at or before donation date. Never uses future snapshots.
-- Stale snapshots older than 3 years (1095 days) return NULL / UNAVAILABLE.
CREATE OR REPLACE FUNCTION get_closest_net_worth(
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

    -- Look strictly at or before target date with positive net worth
    SELECT net_worth, snapshot_date, (p_target_date - snapshot_date)
    INTO v_net_worth, v_snapshot_date, v_days_diff
    FROM wealth_snapshots
    WHERE person_id = p_person_id
      AND snapshot_date <= p_target_date
      AND net_worth > 0
    ORDER BY snapshot_date DESC
    LIMIT 1;

    -- If no prior snapshot, or older than 3 years (1095 days), return NULL (Parity Unavailable)
    IF v_net_worth IS NULL OR v_days_diff > 1095 THEN
        RETURN NULL;
    END IF;

    RETURN v_net_worth;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2. COMPREHENSIVE HISTORICAL SNAPSHOT CLASSIFICATION FUNCTION
CREATE OR REPLACE FUNCTION get_historical_snapshot_details(
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

    -- Pick the closest prior snapshot
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
        -- Older than 3 years
        v_nw := NULL;
        v_sd := NULL;
        v_q := 'UNAVAILABLE';
    END IF;

    RETURN QUERY SELECT v_nw, v_sd, v_diff, v_q, v_sn;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3. RECREATE VIEW: v_donations_with_parity WITH QUALITY CLASSIFICATION
DROP VIEW IF EXISTS v_donations_with_parity CASCADE;

CREATE OR REPLACE VIEW v_donations_with_parity AS
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
    
    -- Attribution logic: true only for direct/confirmed individual giving
    (d.donor_person_id IS NOT NULL AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')) AS is_individual_attribution,
    
    -- Historical Net Worth Parity & Quality Classification (Phase 3 Engine)
    snap.net_worth AS historical_net_worth,
    snap.snapshot_date AS historical_snapshot_date,
    snap.days_diff AS snapshot_days_diff,
    snap.quality AS wealth_snapshot_quality,
    snap.source_name AS wealth_source_name,
    
    -- Generosity Ratio (Unrounded exact numeric & rounded compatibility field)
    CASE 
        WHEN snap.net_worth IS NOT NULL AND snap.net_worth > 0 
        THEN (d.amount / snap.net_worth) * 100 
        ELSE NULL 
    END AS historical_generosity_ratio,
    
    ROUND(
        CASE 
            WHEN snap.net_worth IS NOT NULL AND snap.net_worth > 0 
            THEN (d.amount / snap.net_worth) * 100 
            ELSE NULL 
        END, 
        4
    ) AS historical_percentage,
    
    -- Primary Source
    d.source_id,
    s.publisher AS source_publisher,
    s.title AS source_title,
    s.url AS source_url,
    s.source_type AS source_tier,
    
    d.created_at,
    d.updated_at
FROM donations d
LEFT JOIN people dp ON dp.id = d.donor_person_id
LEFT JOIN organizations doo ON doo.id = d.donor_organization_id
LEFT JOIN people rp ON rp.id = d.recipient_person_id
LEFT JOIN organizations ro ON ro.id = d.recipient_organization_id
LEFT JOIN sources s ON s.id = d.source_id
LEFT JOIN LATERAL get_historical_snapshot_details(d.donor_person_id, d.donation_date) snap ON true;

COMMENT ON VIEW v_donations_with_parity IS 'Phase 3: Donations enriched with strictly historical net worth parity, unrounded generosity ratios, and snapshot quality tiers (EXACT_DATE, NEAR_DATE, SAME_YEAR, APPROXIMATE, UNAVAILABLE).';
