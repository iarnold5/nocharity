-- ==============================================================================
-- NoCharity Advanced Mode — Phase 5: Donation Classification & Verification
-- Migration: 20261021000005_phase5_classification_verification.sql
-- ==============================================================================

-- 1. Ensure check constraints on donations table allow all 7 funding source types
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_funding_source_type_check;
ALTER TABLE donations ADD CONSTRAINT donations_funding_source_type_check CHECK (
    funding_source_type IN (
        'PERSONAL_DIRECT',          -- A public source attributes the donation directly to the individual
        'PERSONAL_FUNDS_CONFIRMED', -- The source explicitly establishes that personal funds were used
        'FOUNDATION',               -- The foundation / charitable organization made the donation
        'CORPORATE',                -- A company made the donation
        'DAF',                      -- Donation was made through a donor-advised fund
        'PLEDGE',                   -- A commitment rather than a completed transfer
        'UNKNOWN_SOURCE'            -- Ambiguous attribution / unknown source
    )
);

-- 2. Ensure check constraints on donations table allow all 5 verification statuses
ALTER TABLE donations DROP CONSTRAINT IF EXISTS donations_status_check;
ALTER TABLE donations ADD CONSTRAINT donations_status_check CHECK (
    status IN (
        'DISCOVERED',         -- Ingested / discovered from source, pending audit
        'UNVERIFIED',         -- Publicly reported but uncorroborated by primary documentation
        'PARTIALLY_VERIFIED', -- Cross-referenced with recipient disclosure or secondary citation
        'VERIFIED',           -- Audited against primary regulatory filing (SEC Form 4, 990)
        'DISPUTED'            -- Contested or repudiated claim
    )
);

-- 3. Cleanly drop dependent views to update column signatures
DROP VIEW IF EXISTS v_person_rankings CASCADE;
DROP VIEW IF EXISTS v_person_giving_summary CASCADE;
DROP VIEW IF EXISTS v_donations_with_parity CASCADE;

-- 4. Rebuild v_donations_with_parity with Phase 5 eligibility and source provenance
CREATE VIEW v_donations_with_parity AS
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
    
    -- Donor Details
    d.donor_person_id,
    dp.canonical_name AS donor_person_name,
    dp.country AS donor_person_country,
    dp.is_billionaire AS donor_person_is_billionaire,
    d.donor_organization_id,
    doo.display_name AS donor_organization_name,
    doo.organization_type AS donor_organization_type,
    
    -- Recipient Details
    d.recipient_person_id,
    rp.canonical_name AS recipient_person_name,
    d.recipient_organization_id,
    ro.display_name AS recipient_organization_name,
    ro.organization_type AS recipient_organization_type,
    
    -- Attribution & Eligibility: true only for individual giving that is not disputed
    (d.donor_person_id IS NOT NULL 
     AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')
     AND d.status != 'DISPUTED') AS is_individual_attribution,

    -- Explicit Phase 5 Parity Eligibility
    (d.donor_person_id IS NOT NULL 
     AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')
     AND d.funding_source_type != 'PLEDGE'
     AND d.status != 'DISPUTED'
     AND snap.quality IS NOT NULL 
     AND snap.quality != 'UNAVAILABLE') AS is_personal_parity_eligible,
    
    -- Historical Net Worth Parity & Quality Classification (Phase 3 Engine)
    snap.net_worth AS historical_net_worth,
    snap.snapshot_date AS historical_snapshot_date,
    snap.days_diff AS snapshot_days_diff,
    snap.quality AS wealth_snapshot_quality,
    snap.source_name AS wealth_source_name,
    
    -- Generosity Ratio (computed only for eligible individual gifts)
    CASE 
        WHEN snap.quality IS NOT NULL 
             AND snap.quality != 'UNAVAILABLE' 
             AND snap.net_worth > 0 
             AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')
             AND d.status != 'DISPUTED'
        THEN (d.amount / snap.net_worth) * 100.0
        ELSE NULL
    END AS historical_generosity_ratio,

    -- Rounded compatibility column
    CASE 
        WHEN snap.quality IS NOT NULL 
             AND snap.quality != 'UNAVAILABLE' 
             AND snap.net_worth > 0 
             AND d.funding_source_type IN ('PERSONAL_DIRECT', 'PERSONAL_FUNDS_CONFIRMED')
             AND d.status != 'DISPUTED'
        THEN ROUND((d.amount / snap.net_worth) * 100.0, 4)
        ELSE NULL
    END AS historical_percentage,

    -- Source Provenance
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
LEFT JOIN people dp ON d.donor_person_id = dp.id
LEFT JOIN organizations doo ON d.donor_organization_id = doo.id
LEFT JOIN people rp ON d.recipient_person_id = rp.id
LEFT JOIN organizations ro ON d.recipient_organization_id = ro.id
LEFT JOIN sources s ON d.source_id = s.id
LEFT JOIN LATERAL (
    SELECT 
        ws.net_worth,
        ws.snapshot_date,
        ws.source_name,
        (d.donation_date - ws.snapshot_date)::INT AS days_diff,
        CASE
            WHEN (d.donation_date - ws.snapshot_date) = 0 THEN 'EXACT_DATE'
            WHEN (d.donation_date - ws.snapshot_date) BETWEEN 1 AND 90 THEN 'NEAR_DATE'
            WHEN (d.donation_date - ws.snapshot_date) > 90 
                 AND EXTRACT(YEAR FROM ws.snapshot_date) = EXTRACT(YEAR FROM d.donation_date) THEN 'SAME_YEAR'
            WHEN (d.donation_date - ws.snapshot_date) <= 1095 THEN 'APPROXIMATE'
            ELSE 'UNAVAILABLE'
        END AS quality
    FROM wealth_snapshots ws
    WHERE ws.person_id = d.donor_person_id
      AND ws.snapshot_date <= d.donation_date
      AND ws.net_worth > 0
    ORDER BY ws.snapshot_date DESC
    LIMIT 1
) snap ON true;

-- 5. Rebuild v_person_giving_summary with strict personal vs organization separation
CREATE VIEW v_person_giving_summary AS
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
        COALESCE(SUM(amount) FILTER (WHERE status = 'DISPUTED'), 0) AS total_disputed_giving
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
    COALESCE(da.total_unknown_giving, 0) AS total_unknown_giving,
    COALESCE(da.total_disputed_giving, 0) AS total_disputed_giving,
    CASE 
        WHEN lw.latest_net_worth > 0 
        THEN ROUND((COALESCE(da.total_personal_giving, 0) / lw.latest_net_worth) * 100.0, 4)
        ELSE 0 
    END AS personal_giving_ratio_pct,
    hpa.avg_historical_percentage,
    hpa.peak_historical_percentage
FROM people p
LEFT JOIN latest_wealth lw ON p.id = lw.person_id
LEFT JOIN donation_agg da ON p.id = da.person_id
LEFT JOIN historical_parity_agg hpa ON p.id = hpa.person_id;

-- 6. Rebuild v_person_rankings based strictly on verified personal giving
CREATE VIEW v_person_rankings AS
SELECT 
    person_id,
    canonical_name,
    first_name,
    last_name,
    country,
    industry,
    latest_net_worth,
    latest_snapshot_date,
    personal_donations_count,
    total_personal_giving,
    total_foundation_giving,
    total_corporate_giving,
    total_donated_all,
    personal_giving_ratio_pct,
    avg_historical_percentage,
    peak_historical_percentage,
    RANK() OVER (ORDER BY total_personal_giving DESC) AS rank_by_personal_giving,
    RANK() OVER (ORDER BY personal_giving_ratio_pct DESC) AS rank_by_giving_ratio,
    RANK() OVER (ORDER BY latest_net_worth DESC) AS rank_by_net_worth
FROM v_person_giving_summary
WHERE is_billionaire = true;
