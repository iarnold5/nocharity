-- ==============================================================================
-- NoCharity Supabase Schema: Core Phase 1 DDL
-- ==============================================================================
-- Purpose:
--   Lightweight, highly-indexed PostgreSQL schema for NoCharity Advanced Mode.
--   Enforces personal vs organizational attribution, historical net worth parity,
--   multi-source verification, and reusable tagging.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PEOPLE TABLE
-- Individuals tracked by NoCharity (billionaires, philanthropists, founders).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    canonical_name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    aliases TEXT[] DEFAULT '{}'::TEXT[],
    country TEXT,
    birth_date DATE,
    occupation TEXT,
    industry TEXT,
    description TEXT,
    is_billionaire BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_people_canonical_name ON people(canonical_name);
CREATE INDEX IF NOT EXISTS idx_people_is_billionaire ON people(is_billionaire);

-- ------------------------------------------------------------------------------
-- 2. ORGANIZATIONS TABLE
-- Legal entities, corporate foundations, DAFs, and charities.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    legal_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    organization_type TEXT NOT NULL CHECK (
        organization_type IN (
            'FOUNDATION',
            'COMPANY',
            'CHARITY',
            'DAF',
            'POLITICAL_COMMITTEE',
            'OTHER'
        )
    ),
    ein TEXT,                                  -- US IRS Employer Identification Number (e.g. Form 990)
    cik TEXT,                                  -- SEC Central Index Key
    country TEXT,
    website TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_display_name ON organizations(display_name);
CREATE INDEX IF NOT EXISTS idx_organizations_org_type ON organizations(organization_type);
CREATE INDEX IF NOT EXISTS idx_organizations_ein ON organizations(ein) WHERE ein IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. SOURCES TABLE
-- Verifiable documentation, regulatory filings, and journalism records.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    publisher TEXT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (
        source_type IN (
            'PRIMARY',
            'GOVERNMENT',
            'TAX_FILING',
            'SEC_FILING',
            'FEC',
            'NEWS',
            'COMPANY',
            'FOUNDATION',
            'DATABASE',
            'SECONDARY'
        )
    ),
    published_at DATE,
    accessed_at DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_url ON sources(url);
CREATE INDEX IF NOT EXISTS idx_sources_source_type ON sources(source_type);
CREATE INDEX IF NOT EXISTS idx_sources_publisher ON sources(publisher);

-- ------------------------------------------------------------------------------
-- 4. PERSON_ORGANIZATIONS TABLE
-- Relationships linking people with corporate & philanthropic organizations.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS person_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    relationship_type TEXT NOT NULL,           -- e.g. 'FOUNDER', 'OWNER', 'BOARD_MEMBER', 'TRUSTEE', 'ASSOCIATED_WITH', 'FOUNDER_OF'
    ownership_percent NUMERIC(5, 2),
    start_date DATE,
    end_date DATE,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_person_org_rel UNIQUE (person_id, organization_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_person_org_person ON person_organizations(person_id);
CREATE INDEX IF NOT EXISTS idx_person_org_org ON person_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_person_org_source ON person_organizations(source_id);

-- ------------------------------------------------------------------------------
-- 5. WEALTH_SNAPSHOTS TABLE
-- Historical wealth valuations. Must never overwrite past snapshots!
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wealth_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    net_worth NUMERIC(16, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    source_name TEXT,
    confidence TEXT DEFAULT 'HIGH' CHECK (confidence IN ('HIGH', 'MEDIUM', 'ESTIMATE', 'DISPUTED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_person_snapshot_date UNIQUE (person_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_wealth_snapshots_person_date 
    ON wealth_snapshots(person_id, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_wealth_snapshots_date 
    ON wealth_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_wealth_snapshots_source 
    ON wealth_snapshots(source_id);

-- ------------------------------------------------------------------------------
-- 6. DONATIONS TABLE
-- Philanthropic transactions with explicit donor & recipient entity tracking.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    donor_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    donor_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    recipient_person_id UUID REFERENCES people(id) ON DELETE SET NULL,
    recipient_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    amount NUMERIC(16, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    donation_date DATE NOT NULL,
    donation_type TEXT DEFAULT 'GIFT',
    funding_source_type TEXT NOT NULL CHECK (
        funding_source_type IN (
            'PERSONAL_DIRECT',          -- Direct personal gift from individual
            'PERSONAL_FUNDS_CONFIRMED', -- Verified transfer of personal capital / stock
            'FOUNDATION',               -- Disbursed by family / private foundation
            'CORPORATE',                -- Donated by corporate treasury
            'DAF',                      -- Transferred to Donor-Advised Fund
            'PLEDGE',                   -- Non-binding promise / intention
            'UNKNOWN_SOURCE'            -- Ambiguous attribution
        )
    ),
    status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
        status IN (
            'DISCOVERED',
            'UNVERIFIED',
            'PARTIALLY_VERIFIED',
            'VERIFIED',
            'DISPUTED'
        )
    ),
    description TEXT,
    cause_category TEXT,
    source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_has_donor CHECK (donor_person_id IS NOT NULL OR donor_organization_id IS NOT NULL)
);

-- Essential Performance Indexes for Free-Tier Queries
CREATE INDEX IF NOT EXISTS idx_donations_donor_person ON donations(donor_person_id);
CREATE INDEX IF NOT EXISTS idx_donations_donor_org ON donations(donor_organization_id);
CREATE INDEX IF NOT EXISTS idx_donations_recipient_person ON donations(recipient_person_id);
CREATE INDEX IF NOT EXISTS idx_donations_recipient_org ON donations(recipient_organization_id);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_donations_funding_source_type ON donations(funding_source_type);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_source_id ON donations(source_id);

-- ------------------------------------------------------------------------------
-- 7. DONATION_SOURCES TABLE
-- Many-to-many relationship supporting multiple corroborating sources.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donation_sources (
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
    PRIMARY KEY (donation_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_donation_sources_source ON donation_sources(source_id);

-- ------------------------------------------------------------------------------
-- 8. TAGS TABLE
-- Lightweight reusable taxonomy system.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- ------------------------------------------------------------------------------
-- 9. PERSON_TAGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS person_tags (
    person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (person_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_person_tags_tag ON person_tags(tag_id);

-- ------------------------------------------------------------------------------
-- 10. DONATION_TAGS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donation_tags (
    donation_id UUID NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (donation_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_donation_tags_tag ON donation_tags(tag_id);

-- ------------------------------------------------------------------------------
-- 11. HISTORICAL PARITY LOOKUP FUNCTION
-- Finds nearest net worth for a person on or before target date.
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_closest_net_worth(
    p_person_id UUID,
    p_target_date DATE
)
RETURNS NUMERIC AS $$
DECLARE
    v_net_worth NUMERIC;
BEGIN
    -- 1. Snapshot on or closest before the target date
    SELECT net_worth INTO v_net_worth
    FROM wealth_snapshots
    WHERE person_id = p_person_id
      AND snapshot_date <= p_target_date
    ORDER BY snapshot_date DESC
    LIMIT 1;

    -- 2. Earliest snapshot fallback if donation predates records
    IF v_net_worth IS NULL THEN
        SELECT net_worth INTO v_net_worth
        FROM wealth_snapshots
        WHERE person_id = p_person_id
        ORDER BY snapshot_date ASC
        LIMIT 1;
    END IF;

    RETURN v_net_worth;
END;
$$ LANGUAGE plpgsql STABLE;

-- ------------------------------------------------------------------------------
-- 12. VIEW: DONATIONS WITH HISTORICAL PARITY
-- Pre-computed historical net-worth parity and attribution flags.
-- ------------------------------------------------------------------------------
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
    
    -- Historical Net Worth Parity
    COALESCE(get_closest_net_worth(d.donor_person_id, d.donation_date), NULL) AS historical_net_worth,
    ROUND(
        (d.amount / NULLIF(get_closest_net_worth(d.donor_person_id, d.donation_date), 0)) * 100, 
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
LEFT JOIN sources s ON s.id = d.source_id;

-- ------------------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- Safe for public read-heavy deployment without exposing service role key.
-- ------------------------------------------------------------------------------
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_tags ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read People') THEN
        CREATE POLICY "Public Read People" ON people FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Organizations') THEN
        CREATE POLICY "Public Read Organizations" ON organizations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Sources') THEN
        CREATE POLICY "Public Read Sources" ON sources FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Person Organizations') THEN
        CREATE POLICY "Public Read Person Organizations" ON person_organizations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Wealth Snapshots') THEN
        CREATE POLICY "Public Read Wealth Snapshots" ON wealth_snapshots FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Donations') THEN
        CREATE POLICY "Public Read Donations" ON donations FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Donation Sources') THEN
        CREATE POLICY "Public Read Donation Sources" ON donation_sources FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Tags') THEN
        CREATE POLICY "Public Read Tags" ON tags FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Person Tags') THEN
        CREATE POLICY "Public Read Person Tags" ON person_tags FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Donation Tags') THEN
        CREATE POLICY "Public Read Donation Tags" ON donation_tags FOR SELECT USING (true);
    END IF;
END $$;
