-- =============================================================================
-- Migration: 20261022000011_security_hardening_and_least_privilege.sql
-- Description:
--   1. Fix Security Advisor findings for public views by explicitly setting
--      security_invoker = true on v_donations_with_parity, v_person_giving_summary,
--      v_person_rankings, and v_advanced_dashboard_metrics.
--   2. Fix mutable search_path warnings on public read functions by setting
--      SET search_path = '' and schema-qualifying all table references.
--   3. Restrict and neutralize obsolete test/maintenance functions (fn_clean_tables,
--      test_cleanup, test_cleanup2, rls_auto_enable) by revoking EXECUTE from
--      PUBLIC, anon, and authenticated roles, pinning search_path, and disabling
--      destructive operations.
--   4. Apply strict least privilege: revoke INSERT, UPDATE, DELETE, TRUNCATE on
--      all public tables and views from anon and authenticated roles. Ensure
--      read-only access (SELECT) for public visitor and application queries.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. RECREATE PUBLIC READ FUNCTIONS WITH SECURITY INVOKER & EMPTY SEARCH_PATH
-- -----------------------------------------------------------------------------

-- 1.1 get_closest_net_worth
CREATE OR REPLACE FUNCTION public.get_closest_net_worth(p_person_id uuid, p_target_date date)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_net_worth NUMERIC;
    v_snapshot_date DATE;
    v_days_diff INT;
BEGIN
    IF p_person_id IS NULL OR p_target_date IS NULL THEN
        RETURN NULL;
    END IF;

    -- Strictly search snapshots on or before target date with positive net worth
    SELECT ws.net_worth, ws.snapshot_date, (p_target_date - ws.snapshot_date)
    INTO v_net_worth, v_snapshot_date, v_days_diff
    FROM public.wealth_snapshots ws
    WHERE ws.person_id = p_person_id
      AND ws.snapshot_date <= p_target_date
      AND ws.net_worth > 0
    ORDER BY ws.snapshot_date DESC
    LIMIT 1;

    -- If no prior snapshot, or older than 3 years (1095 days), return NULL (Parity Unavailable)
    -- NEVER fall back forward in time!
    IF v_net_worth IS NULL OR v_days_diff > 1095 THEN
        RETURN NULL;
    END IF;

    RETURN v_net_worth;
END;
$$;

-- 1.2 get_historical_snapshot_details
CREATE OR REPLACE FUNCTION public.get_historical_snapshot_details(p_person_id uuid, p_target_date date)
RETURNS TABLE(net_worth numeric, snapshot_date date, days_diff integer, quality text, source_name text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
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
    FROM public.wealth_snapshots ws
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
$$;

-- 1.3 get_sources_for_donation
CREATE OR REPLACE FUNCTION public.get_sources_for_donation(p_donation_id uuid)
RETURNS TABLE(id uuid, publisher text, title text, url text, source_type text, published_at date, accessed_at date, notes text, is_primary boolean)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
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
    FROM public.donations d
    JOIN public.sources s ON s.id = d.source_id
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
    FROM public.donation_sources ds
    JOIN public.sources s ON s.id = ds.source_id
    WHERE ds.donation_id = p_donation_id
      AND (ds.source_id != (SELECT d2.source_id FROM public.donations d2 WHERE d2.id = p_donation_id) 
           OR (SELECT d3.source_id FROM public.donations d3 WHERE d3.id = p_donation_id) IS NULL);
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. NEUTER OBSOLETE TEST / MAINTENANCE FUNCTIONS & PIN SEARCH PATHS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_clean_tables()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN 'disabled';
END;
$$;

CREATE OR REPLACE FUNCTION public.test_cleanup()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN 'disabled';
END;
$$;

CREATE OR REPLACE FUNCTION public.test_cleanup2()
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    RETURN 'disabled';
END;
$$;

-- Revoke all execution privileges on maintenance functions from untrusted roles
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_clean_tables() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.test_cleanup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.test_cleanup2() FROM PUBLIC, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. CONFIGURE SECURITY INVOKER ON PUBLIC VIEWS
-- -----------------------------------------------------------------------------

ALTER VIEW public.v_donations_with_parity SET (security_invoker = true);
ALTER VIEW public.v_person_giving_summary SET (security_invoker = true);
ALTER VIEW public.v_person_rankings SET (security_invoker = true);
ALTER VIEW public.v_advanced_dashboard_metrics SET (security_invoker = true);

-- -----------------------------------------------------------------------------
-- 4. HARDEN TABLE AND VIEW PERMISSIONS (LEAST PRIVILEGE)
-- -----------------------------------------------------------------------------

-- Revoke all modifying privileges on public tables from untrusted/public roles
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE 
  public.people, 
  public.organizations, 
  public.person_organizations, 
  public.sources, 
  public.donations, 
  public.donation_sources, 
  public.wealth_snapshots, 
  public.tags, 
  public.person_tags, 
  public.donation_tags 
FROM anon, authenticated, public;

-- Revoke all modifying privileges on public views
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE 
  public.v_donations_with_parity, 
  public.v_person_giving_summary, 
  public.v_person_rankings, 
  public.v_advanced_dashboard_metrics 
FROM anon, authenticated, public;

-- Explicitly grant SELECT on public tables to application roles (anon, authenticated)
GRANT SELECT ON TABLE 
  public.people, 
  public.organizations, 
  public.person_organizations, 
  public.sources, 
  public.donations, 
  public.donation_sources, 
  public.wealth_snapshots, 
  public.tags, 
  public.person_tags, 
  public.donation_tags 
TO anon, authenticated;

-- Explicitly grant SELECT on public views to application roles (anon, authenticated)
GRANT SELECT ON TABLE 
  public.v_donations_with_parity, 
  public.v_person_giving_summary, 
  public.v_person_rankings, 
  public.v_advanced_dashboard_metrics 
TO anon, authenticated;

-- Function execution privileges: Revoke from PUBLIC, grant to anon, authenticated, service_role
REVOKE ALL ON FUNCTION public.get_closest_net_worth(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_closest_net_worth(uuid, date) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_historical_snapshot_details(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_historical_snapshot_details(uuid, date) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_sources_for_donation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_sources_for_donation(uuid) TO anon, authenticated, service_role;
