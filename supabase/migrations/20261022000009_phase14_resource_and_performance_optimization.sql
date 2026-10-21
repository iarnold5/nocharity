-- ==============================================================================
-- NoCharity Supabase Migration: 20261022000009_phase14_resource_and_performance_optimization.sql
-- Phase 14: Resource & Performance Optimization for Supabase Free Tier
-- ==============================================================================

-- 1. Index on donation amounts for fast sorting and threshold filtering
CREATE INDEX IF NOT EXISTS idx_donations_amount_desc 
    ON donations(amount DESC);

-- 2. Composite index on donor_person_id and donation_date for instant personal timeline queries
CREATE INDEX IF NOT EXISTS idx_donations_person_date_desc 
    ON donations(donor_person_id, donation_date DESC);

-- 3. Composite index on funding_source_type and donation_date for attribution explorer queries
CREATE INDEX IF NOT EXISTS idx_donations_funding_date_desc 
    ON donations(funding_source_type, donation_date DESC);

-- 4. Partial index on people country for geolocation filtering
CREATE INDEX IF NOT EXISTS idx_people_country 
    ON people(country) 
    WHERE country IS NOT NULL;

-- 5. Partial index on people industry for sector filtering
CREATE INDEX IF NOT EXISTS idx_people_industry 
    ON people(industry) 
    WHERE industry IS NOT NULL;

-- 6. Index on giving_pledge flag for Giving Pledge filter
CREATE INDEX IF NOT EXISTS idx_people_giving_pledge 
    ON people(giving_pledge);
