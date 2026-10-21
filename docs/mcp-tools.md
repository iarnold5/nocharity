# NoCharity Advanced Mode — Model Context Protocol (MCP) Tools Reference

This document provides a comprehensive reference for the modernized Model Context Protocol (MCP) server in NoCharity Advanced Mode (**Phase 10**).

---

## 1. Architectural Overview & Design Principles

The NoCharity MCP server (`mcp-server.js`) connects AI assistants (Claude Desktop, Cursor, Antigravity IDE, etc.) directly to audited billionaire philanthropy data and historical wealth-aware parity calculations.

```
┌────────────────────────────────────────────────────────┐
│                   AI Assistant Client                  │
│       (Claude Desktop, Cursor, Antigravity IDE)        │
└───────────────────────────▲────────────────────────────┘
                            │ Stdio Transport (JSON-RPC)
┌───────────────────────────▼────────────────────────────┐
│                  nocharity-mcp (v2.0.0)                │
│                     (mcp-server.js)                    │
└──────┬──────────────────────┬────────────────────┬─────┘
       │                      │                    │
┌──────▼─────────────┐ ┌──────▼─────────────┐ ┌────▼──────────────┐
│  Primary Data Layer│ │  Shared Parity     │ │ Offline / Dev     │
│   (Supabase DB)    │ │  Calculation Engine│ │ Fallback Adapter  │
│  - SQL Views       │ │  - Historical NW   │ │ - Seed Data       │
│  - RPC Functions   │ │  - Attribution Rule│ │ - Zero-config     │
│  - Provenance Cit. │ │  - No Logic Dup    │ │   Execution       │
└────────────────────┘ └────────────────────┘ └───────────────────┘
```

### Core Architectural Mandates:
1. **Data Source Modernization:** Advanced Mode data originates primarily from Supabase PostgreSQL rather than hard-coded client files.
2. **Decoupled Architecture:** `INITIAL_BILLIONAIRES` is retained strictly as a development seed, backwards-compatibility mechanism, and offline fallback when Supabase credentials are not present.
3. **Zero Logic Duplication:** The MCP server executes calculations using the exact same calculation engine (`server/parity-engine.js` and `server/data-access.js`) as the web application.
4. **Attribution Guardrails:** Explicitly distinguishes 5 funding source categories (`PERSONAL`, `FOUNDATION`, `CORPORATE`, `DAF`, `PLEDGE`). Defaults strictly to personal donations and rejects company or foundation disbursements from personal parity calculations.
5. **Zero-Breakage Backwards Compatibility:** Preserves all 4 legacy tools and module exports (`search_billionaire_news`, `calculate_donation_parity`, `get_billionaires_list`, `calculate_historical_donation_parity`, `BILLIONAIRES_DATA`).
6. **Zero-Config Clean Development Support:** Functions seamlessly without Supabase credentials in clean development environments.

---

## 2. Tool Summary Matrix

| # | Tool Name | Mode | Primary Purpose | Default Funding Scope |
| :-: | :--- | :---: | :--- | :--- |
| **1** | [`get_person`](#1-get_person) | Advanced | Biographical profile, latest net worth, giving metrics | Isolated Personal vs Org |
| **2** | [`search_people`](#2-search_people) | Advanced | Filter billionaires by wealth, country, industry, pledge | All Tracked Donors |
| **3** | [`get_wealth_history`](#3-get_wealth_history) | Advanced | Chronological wealth snapshots without interpolation | Verified Estimates |
| **4** | [`search_donations`](#4-search_donations) | Advanced | Filter donations with explicit attribution separation | **Personal Only** (Default) |
| **5** | [`get_donation`](#5-get_donation) | Advanced | Single donation detail with historical NW and citations | Exact Recorded Type |
| **6** | [`get_person_donations`](#6-get_person_donations) | Advanced | List all donations by a specific billionaire | **Personal Only** (Default) |
| **7** | [`get_person_giving_summary`](#7-get_person_giving_summary) | Advanced | Core giving totals, qualifying counts, and ratios | Strict Separation |
| **8** | [`compare_people`](#8-compare_people) | Advanced | Multi-billionaire proportional wealth comparison | **Proportional Scale** |
| **9** | [`calculate_historical_parity`](#9-calculate_historical_parity) | Advanced | Historical wealth-aware parity engine (Steps 1–6) | **Personal Only** (Default) |
| **10** | [`get_sources`](#10-get_sources) | Advanced | SEC Form 4, IRS 990-PF, and news citations | Primary Audit Trail |
| **11** | [`discover_news_donations`](#11-discover_news_donations) | Advanced | Google News RSS on-demand discovery (Not authoritative) | Candidate Pipeline (Unverified) |
| **12** | [`validate_donation_quality`](#12-validate_donation_quality) | Advanced | 8 Questions, validation rules, temporal & discrepancy audit | Data Quality Layer |
| **13** | [`search_billionaire_news`](#13-search_billionaire_news) | Legacy | Real-time Google News RSS scraper for donations | Unfiltered Raw News |
| **14** | [`calculate_donation_parity`](#14-calculate_donation_parity) | Legacy | Basic Mode net worth / annual income percentage | Unweighted Legacy |
| **15** | [`get_billionaires_list`](#15-get_billionaires_list) | Legacy | Legacy billionaire roster with source URLs | Backwards Compatible |
| **16** | [`calculate_historical_donation_parity`](#16-calculate_historical_donation_parity) | Legacy | Backwards-compatible alias for historical parity | Personal Parity |

---

## 3. Tool Specifications & Usage Examples

### 1. `get_person`
Retrieves complete biographical details, latest net worth, Giving Pledge status, and personal giving summary for a specific individual by UUID or kebab-case slug.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Person UUID or kebab-case slug (e.g. 'warren-buffett', 'bill-gates', 'elon-musk')"
    }
  },
  "required": ["id"]
}
```

#### Example Response:
```json
{
  "source": "supabase",
  "person_id": "b0000000-0000-0000-0000-000000000001",
  "canonical_name": "Warren Buffett",
  "country": "🇺🇸 United States",
  "industry": "Finance & Investments",
  "occupation": "Chairman & CEO, Berkshire Hathaway",
  "latest_net_worth": 145000000000,
  "latest_snapshot_date": "2026-01-01",
  "giving_pledge": true,
  "personal_giving_metrics": {
    "lifetime_personal_giving": 19240000000,
    "qualifying_donations_count": 4,
    "average_donation": 4810000000,
    "giving_as_pct_of_wealth_at_donation": 4.11
  }
}
```

---

### 2. `search_people`
Searches and filters tracked billionaires across net worth ranges, country, industry, and Giving Pledge status.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Search query for name, company, or keywords" },
    "country": { "type": "string", "description": "Filter by country (e.g. 'United States', 'India')" },
    "industry": { "type": "string", "description": "Filter by industry (e.g. 'Technology', 'Finance')" },
    "minNetWorth": { "type": "number", "description": "Minimum net worth in USD" },
    "maxNetWorth": { "type": "number", "description": "Maximum net worth in USD" },
    "givingPledge": { "type": "boolean", "description": "Filter by Giving Pledge signatory" },
    "limit": { "type": "number", "description": "Max results (default 20, max 100)" },
    "offset": { "type": "number", "description": "Pagination offset" },
    "sortBy": { "type": "string", "enum": ["name", "net_worth", "personal_giving", "giving_ratio"] },
    "sortOrder": { "type": "string", "enum": ["asc", "desc"] }
  }
}
```

---

### 3. `get_wealth_history`
Retrieves chronologically ordered historical wealth snapshots for an individual without fabricated interpolation.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "personId": { "type": "string", "description": "Person UUID or slug" },
    "limit": { "type": "number", "description": "Maximum snapshots (default 50)" },
    "sortOrder": { "type": "string", "enum": ["asc", "desc"], "description": "Order (default 'asc')" }
  },
  "required": ["personId"]
}
```

#### Snapshot Quality Tiers:
- `EXACT_DATE`: Recorded on the same calendar day (0 days diff).
- `NEAR_DATE`: Recorded 1–90 days prior to donation.
- `SAME_YEAR`: Recorded earlier in the same calendar year.
- `APPROXIMATE`: Recorded 1–3 years prior.
- `UNAVAILABLE`: Outside 3 years or no prior snapshot. Future snapshots are **strictly excluded**.

---

### 4. `search_donations`
Searches and filters verified philanthropic donations. **By default, returns strictly personal donations (`PERSONAL_DIRECT`, `PERSONAL_FUNDS_CONFIRMED`).** Does not include corporate or foundation disbursements unless `includeAssociatedOrgGiving` is explicitly set to `true`.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "query": { "type": "string", "description": "Recipient or cause search" },
    "billionaireId": { "type": "string", "description": "Filter by donor person UUID or slug" },
    "fundingSourceType": {
      "type": "string",
      "enum": ["all", "PERSONAL", "PERSONAL_DIRECT", "PERSONAL_FUNDS_CONFIRMED", "FOUNDATION", "CORPORATE", "DAF", "PLEDGE", "UNKNOWN_SOURCE"],
      "description": "Funding source attribution classification"
    },
    "status": {
      "type": "string",
      "enum": ["all", "VERIFIED", "PARTIALLY_VERIFIED", "DISPUTED", "UNVERIFIED"],
      "description": "Verification tier"
    },
    "minAmount": { "type": "number", "description": "Minimum amount in USD" },
    "maxAmount": { "type": "number", "description": "Maximum amount in USD" },
    "startDate": { "type": "string", "description": "Earliest date YYYY-MM-DD" },
    "endDate": { "type": "string", "description": "Latest date YYYY-MM-DD" },
    "includeAssociatedOrgGiving": {
      "type": "boolean",
      "description": "Whether to include foundation/corporate disbursements. Defaults to false (personal giving only)."
    },
    "limit": { "type": "number", "description": "Max results (default 20, max 100)" },
    "offset": { "type": "number", "description": "Pagination offset" },
    "sortBy": { "type": "string", "enum": ["date", "amount", "percentage", "billionaire", "status"] },
    "sortOrder": { "type": "string", "enum": ["desc", "asc"] }
  }
}
```

---

### 5. `get_donation`
Retrieves a detailed donation record by UUID, including historical net worth at the donation date, parity metrics, and regulatory citations.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "donationId": { "type": "string", "description": "Donation UUID" }
  },
  "required": ["donationId"]
}
```

---

### 6. `get_person_donations`
Retrieves all documented donations associated with a specific billionaire. Defaults to personal donations only.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "personId": { "type": "string", "description": "Person UUID or slug" },
    "includeAssociatedOrgGiving": {
      "type": "boolean",
      "description": "Whether to include associated foundation and corporate gifts. Defaults to false."
    },
    "limit": { "type": "number", "description": "Maximum donations (default 50)" },
    "offset": { "type": "number", "description": "Pagination offset" }
  },
  "required": ["personId"]
}
```

---

### 7. `get_person_giving_summary`
Computes core personal giving metrics: lifetime personal giving total, qualifying gift count, largest donation, latest donation, average donation, and giving as percentage of wealth at donation date. **Maintains strict separation between personal giving and associated organizations.**

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "personId": { "type": "string", "description": "Person UUID or slug" }
  },
  "required": ["personId"]
}
```

---

### 8. `compare_people`
Calculates side-by-side proportional wealth comparisons across multiple billionaires calibrated to a user's income. Computes equivalent sacrifice based on historical wealth at the time of each gift.

#### Strict Methodology & Language:
- **Concept:** Proportional wealth comparison.
- **Tagline:** *"Equivalent by percentage of wealth. Not an exact comparison of financial pain."*
- Prohibits claiming equal subjective sacrifice.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "personIds": { "type": "array", "items": { "type": "string" }, "description": "Optional subset of person UUIDs or slugs" },
    "userIncome": { "type": "number", "description": "User's baseline income amount (default 60000)" },
    "incomeFrequency": { "type": "string", "enum": ["monthly", "annual"], "description": "Income frequency (default 'monthly')" },
    "userCurrency": { "type": "string", "description": "Display currency symbol (e.g. '₹', '$', '€', default '₹')" },
    "displayExchangeRate": { "type": "number", "description": "Optional display multiplier" }
  }
}
```

#### Example Response:
```json
{
  "source": "supabase",
  "user_income": 60000,
  "income_frequency": "monthly",
  "user_currency": "₹",
  "comparisons_count": 17,
  "comparisons": [
    {
      "canonical_name": "Warren Buffett",
      "ratio_percentage": 3.93,
      "formatted_ratio": "3.93%",
      "user_equivalent": 2355.56,
      "formatted_equivalent": "₹2,356",
      "statement_ratio": "They gave approximately 3.93% of their documented wealth at the time.",
      "statement_equivalent": "For an income of ₹60,000/month, that is equivalent to ₹2,356.",
      "methodology_type": "Proportional wealth comparison",
      "qualification": "Equivalent by percentage of wealth. Not an exact comparison of financial pain."
    }
  ]
}
```

---

### 9. `calculate_historical_parity`
The core Historical Wealth-Aware Parity calculation engine. Calculates what percentage of documented wealth at the time of a donation was given, and translates that to an everyday earner's income equivalent.

#### Calculation Engine Workflow:
1. **Receive person/donation information:** Accepts `donationId`, `personId`, or explicit parameters (`donationAmount`, `donationDate`, `historicalNetWorth`).
2. **Identify donation date:** Parses calendar date.
3. **Retrieve historical wealth:** Queries nearest prior snapshot on or before the donation date.
4. **Calculate ratio:** $\text{ratio} = \frac{\text{amount}}{\text{historical net worth}} \times 100$.
5. **Calculate user equivalent:** $\text{equivalent} = \text{user income} \times \frac{\text{ratio}}{100}$.
6. **Return source/provenance information:** Wealth snapshot provenance, quality tier, funding source metadata, verification tier, regulatory citations, and Phase 9 display statements.

#### Strict Attribution Enforcement:
- Supported values: `PERSONAL`, `PERSONAL_DIRECT`, `PERSONAL_FUNDS_CONFIRMED`, `FOUNDATION`, `CORPORATE`, `DAF`, `PLEDGE`.
- **Defaults to personal giving:** If omitted, defaults to `PERSONAL_DIRECT`.
- **Rejection of non-personal funds:** If `FOUNDATION`, `CORPORATE`, `DAF`, or `PLEDGE` is passed, returns `isEligible: false`, `isAvailable: false`, and an explicit explanation (e.g. *"Foundation donation. Disbursed from foundation assets; corporate and foundation gifts are excluded from personal giving calculations."*).

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "donationId": { "type": "string", "description": "Optional UUID of an existing database donation record" },
    "personId": { "type": "string", "description": "Optional person UUID or slug to look up historical wealth snapshots" },
    "donationAmount": { "type": "number", "description": "Donation amount in USD" },
    "donationDate": { "type": "string", "description": "Donation date in YYYY-MM-DD format" },
    "historicalNetWorth": { "type": "number", "description": "Optional explicit historical net worth in USD at time of donation" },
    "snapshotDate": { "type": "string", "description": "Optional date of explicit historical wealth snapshot in YYYY-MM-DD format" },
    "fundingSourceType": {
      "type": "string",
      "enum": ["PERSONAL", "PERSONAL_DIRECT", "PERSONAL_FUNDS_CONFIRMED", "FOUNDATION", "CORPORATE", "DAF", "PLEDGE", "UNKNOWN_SOURCE"],
      "description": "Attribution type. Defaults to PERSONAL_DIRECT."
    },
    "status": {
      "type": "string",
      "enum": ["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED", "DISPUTED"],
      "description": "Verification tier. Defaults to VERIFIED."
    },
    "userIncome": { "type": "number", "description": "User's personal income (default 60000)" },
    "incomeFrequency": { "type": "string", "enum": ["monthly", "annual"], "description": "monthly or annual (default 'monthly')" },
    "userCurrency": { "type": "string", "description": "Display currency symbol (default '₹')" },
    "displayExchangeRate": { "type": "number", "description": "Optional display exchange multiplier" }
  }
}
```

#### Canonical Benchmark Example:
- **Donation:** $1,000,000,000 ($1B)
- **Historical Net Worth:** $50,000,000,000 ($50B)
- **User Monthly Income:** ₹60,000
- **Output Ratio:** `2.00%`
- **Equivalent Sacrifice:** `₹1,200.00`
- **Generated Statements:**
  > *"They gave approximately 2.00% of their documented wealth at the time."*  
  > *"For an income of ₹60,000/month, that is equivalent to ₹1,200.00."*  
  > *"Proportional wealth comparison based on documented wealth at donation date."*

---

### 10. `get_sources`
Retrieves documented primary sources, regulatory filings (SEC Form 4, IRS Form 990-PF), and news citations corroborating donations.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "donationId": { "type": "string", "description": "Donation UUID to retrieve citations for" },
    "personId": { "type": "string", "description": "Optional person UUID or slug to retrieve all citations for" }
  }
}
```

---

### 11. `discover_news_donations` (Advanced Mode — Phase 11)
Executes on-demand scanning of Google News RSS as an unauthoritative **DISCOVERY mechanism** to detect potential billionaire donations.

> [!IMPORTANT]
> **Discovery vs. Authoritative Database Principle:**
> News results are **never** automatically marked `VERIFIED` and **never** automatically inserted as confirmed personal giving. Discovered items are designated with status `DISCOVERED` and label `"Potential donation — verification required"`.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "billionaireName": { "type": "string", "description": "Billionaire donor name to scan for potential donations" },
    "timeframe": { "type": "string", "enum": ["all", "past_month", "past_year", "custom"], "description": "Timeframe filter (default 'all')" },
    "startDate": { "type": "string", "description": "Start date YYYY-MM-DD for custom timeframe" },
    "endDate": { "type": "string", "description": "End date YYYY-MM-DD for custom timeframe" }
  },
  "required": ["billionaireName"]
}
```

#### Output Fields:
- `candidate_id`: Unique tracking ID for maintainer review.
- `headline`: Media headline.
- `url`: Source article URL.
- `source_publisher`: News organization / publisher.
- `published_at`: Publication date.
- `detected_donor`: Extracted donor name & database match status.
- `detected_recipient`: Extracted recipient charity, foundation, or cause.
- `extracted_amount`: Numeric dollar amount (with `amount_confidence` score: `HIGH` or `MEDIUM`).
- `possible_funding_source`: Inferred attribution (`PERSONAL_DIRECT`, `FOUNDATION`, `CORPORATE`, `DAF`, `PLEDGE`, `UNKNOWN_SOURCE`).
- `status`: Always `DISCOVERED`.
- `verification_badge`: `"Potential donation — verification required"`.
- `is_confirmed_personal_giving`: Always `false`.
- `is_authoritative`: Always `false`.

---

### 12. `validate_donation_quality` (Phase 12 Data Quality Layer)
Audits a donation against NoCharity's Data Quality Layer to prevent confidently displaying nonsense. Evaluates the 8 Essential Questions, 10 hard validation rules, temporal wealth consistency checks, and multi-source discrepancy detection. Returns a transparent quality score (0–100) and grade (Grade A, B, C, D/Flagged).

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "donation": {
      "type": "object",
      "description": "Donation record payload or object containing fields like donor, amount, date, status, sources."
    },
    "wealthSnapshot": {
      "type": "object",
      "description": "Optional historical wealth snapshot to evaluate for temporal consistency."
    },
    "donationId": {
      "type": "string",
      "description": "Optional ID of an existing donation to retrieve and evaluate."
    },
    "snapshotDate": {
      "type": "string",
      "description": "Optional snapshot valuation date (YYYY-MM-DD)."
    }
  }
}
```

#### Example Response:
```json
{
  "score": 90,
  "quality_score": 90,
  "grade": "A",
  "quality_grade": "A",
  "status_label": "Audited & Complete",
  "answers_all_8_questions": true,
  "answered_questions_count": 8,
  "is_valid": true,
  "has_source_discrepancy": false,
  "temporal_consistency": {
    "isConsistent": true,
    "classification": "EXACT_DATE"
  },
  "is_authoritative_display_safe": true
}
```

---

### 13. `search_billionaire_news` (Legacy Backwards-Compatible)
Fetches raw live news articles regarding billionaire donations using Google News RSS without structured entity extraction.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "billionaireName": { "type": "string" },
    "timeframe": { "type": "string", "enum": ["all", "past_month", "past_year", "custom"] },
    "startDate": { "type": "string" },
    "endDate": { "type": "string" }
  },
  "required": ["billionaireName"]
}
```

---

### 14. `calculate_donation_parity` (Legacy Backwards-Compatible)
Calculates legacy basic-mode parity against current net worth or estimated annual income.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "billionaireId": { "type": "string" },
    "donationAmount": { "type": "number" },
    "userMonthlyIncome": { "type": "number" },
    "mode": { "type": "string", "enum": ["networth", "income"] },
    "currency": { "type": "string" }
  },
  "required": ["billionaireId", "donationAmount", "userMonthlyIncome"]
}
```

---

### 15. `get_billionaires_list` (Legacy Backwards-Compatible)
Returns the roster of global and historic billionaires, including traceable net worth source URLs.

#### Input Schema:
```json
{
  "type": "object",
  "properties": {
    "timeframe": { "type": "string" }
  }
}
```

---

### 16. `calculate_historical_donation_parity` (Legacy Alias)
Preserved alias for `calculate_historical_parity`.

---

## 4. Client Integration Guides

### Claude Desktop Configuration
Add the server to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "nocharity": {
      "command": "node",
      "args": ["e:/PersonalProjects/ProjectFiles/AI Slop/nocharity/mcp-server.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key"
      }
    }
  }
}
```

### Cursor & Antigravity IDE Configuration
In `.cursor/mcp.json` or your IDE settings:

```json
{
  "mcpServers": {
    "nocharity-advanced": {
      "command": "node",
      "args": ["mcp-server.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

---

## 5. Offline Fallback Guarantees

When running in an offline development environment without Supabase credentials (`SUPABASE_URL` / `SUPABASE_ANON_KEY` missing):
- All 16 tools function without throwing connection errors.
- Biographical records and donations are served from `INITIAL_BILLIONAIRES`.
- Parity calculations run through the exact same mathematical engine.
- Responses transparently indicate `"source": "legacy_fallback"`.
- When Supabase credentials are configured, the MCP automatically promotes to live PostgreSQL views with `"source": "supabase"`.
