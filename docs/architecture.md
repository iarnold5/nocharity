# 🏛️ NoCharity Architecture & Data Groundwork

> **Project Purpose:** A meme/product that provides a quick, truthful reality check about billionaire wealth and donations without bloating into an expensive financial intelligence platform.

---

## 1. Dual-Mode Architecture (Basic vs. Advanced)

NoCharity operates under a **strict dual-mode architecture**:

```
                                  [ User Entry ]
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
          [ Basic Meme Mode ]                         [ Advanced Mode ]
             Route: `/`                              Route: `/advanced`
                   │                                           │
  ┌────────────────┴────────────────┐         ┌────────────────┴────────────────┐
  │ • Fast, playful Soresi calculator│         │ • Truthful historical parity    │
  │ • Canonical Supabase dataset API│         │ • Attribution taxonomy          │
  │ • Verified offline snapshot     │         │ • Primary source verification   │
  │ • In-memory / client-side state │         │ • Supabase PostgreSQL store     │
  │ • Free Google News RSS scan     │         │ • Paginated, indexed queries    │
  │ • 100% backwards-compatible     │         │ • Verified leaderboards/rankings│
  └─────────────────────────────────┘         └─────────────────────────────────┘
```

### Key Principles:
1. **Zero Breaking Changes:** The basic meme calculator in `public/index.html` and `public/js/app.js` continues to function exactly as before with zero regressions.
2. **Settings Modal Entry Point:** Advanced Mode is accessed via a clean toggle switch in the existing Settings modal. Toggling it navigates to the dedicated `/advanced` view rather than radically warping the basic UI.
3. **Seamless Return:** Advanced Mode provides a dedicated "Return to Basic Meme Mode" button to switch back instantly.

---

## 2. Core Data Principles

### Principle 1: Attribution Taxonomy
We care primarily about donations attributable to the individual billionaire.

Foundation and corporate gifts provide context, but **do not automatically count as personal sacrifice**.

| Attribution Type | Counts as Personal? | Description |
| :--- | :---: | :--- |
| `PERSONAL_DIRECT` | **Yes** | Funds gifted directly from personal assets to end recipient. |
| `PERSONAL_FUNDS_CONFIRMED` | **Yes** | Transfer of personal capital/equity documented in regulatory filings (e.g. SEC Form 4). |
| `FOUNDATION` | **No** (Context only) | Disbursed by private/family foundation (tax-sheltered endowment). |
| `CORPORATE` | **No** (Context only) | Donated by a public corporation or business entity. |
| `DAF` | **No** (Context only) | Transferred to a Donor-Advised Fund; actual disbursement remains opaque. |
| `PLEDGE` | **No** (Context only) | Non-binding statement of future intention (e.g. Giving Pledge letter). |
| `UNKNOWN_SOURCE` | **No** | Attribution source is ambiguous or unverified. |

### Principle 2: Funding Source Principle
- Do **not** claim that a donation came from someone's income unless a primary source establishes that.
- A direct personal donation can be attributed to the person, but the exact source of personal funds remains **`UNKNOWN`** unless specifically documented (e.g., `STOCK_TRANSFER`, `INCOME`, `CAPITAL_GAINS`).

### Principle 3: Historical Parity Principle
Donation percentages **must use the billionaire's wealth at or around the date of the donation**, never their present-day net worth.

$$\text{Historical Generosity Ratio} = \left(\frac{\text{Donation Amount at Date } T}{\text{Billionaire Net Worth at Date } T}\right) \times 100$$

> **Example:**
> - Warren Buffett donates \$1 Billion in 2018 when his net worth was \$50 Billion.
> - **Correct historical ratio:** $\frac{\$1\text{B}}{\$50\text{B}} = 2.00\%$
> - **Incorrect ratio:** $\frac{\$1\text{B}}{\$145\text{B (2026)}} = 0.69\%$

---

## 3. Source & Verification Principles

Every financial claim must trace to a source URL with complete metadata.

### Source Tiers:
1. `PRIMARY_REGULATORY`: SEC Form 990, Form 4, statutory filings, court registries.
2. `PRIMARY_INSTITUTIONAL`: Verified institutional annual reports, audited non-profit filings.
3. `SECONDARY_NEWS`: Investigative reporting from reputable outlets (AP, Reuters, WSJ, Bloomberg).
4. `SECONDARY_DISCOVERY`: Automated Google News RSS scan or breaking news hits.

### Verification Lifecycle:
```
[ DISCOVERED ] ──► [ UNVERIFIED ] ──► [ PARTIALLY_VERIFIED ] ──► [ VERIFIED ]
                                                 │
                                                 └──► [ DISPUTED ]
```
- **`DISCOVERED`**: Ingested via RSS scraper or news scan.
- **`UNVERIFIED`**: Extracted headline without secondary corroboration.
- **`PARTIALLY_VERIFIED`**: Reported by a single news organization.
- **`VERIFIED`**: Corroborated by a primary filing (SEC, Form 990) or multiple independent outlets.
- **`DISPUTED`**: Retracted, unfulfilled pledge, or contested recipient statement.

---

## 4. Phase 1 Core Schema (`supabase/migrations/`)

The Phase 1 schema defines 10 core tables designed for lightweight, high-performance querying on free-tier PostgreSQL:

```
[ people ] ──────────┬──────────< [ person_organizations ] >──────────┬────────── [ organizations ]
   │                 │                                                │                 │
   │ (1:N)           │ (M:N)                                          │ (M:N)           │ (1:N)
   ▼                 ▼                                                ▼                 ▼
[ wealth_snapshots ] [ person_tags ]                                  [ donation_tags ] │
   │                       │                                                ▲           │
   │                       ▼                                                │           │
   │                    [ tags ] ───────────────────────────────────────────┤           │
   │                                                                        │           │
   └───────────────────────────────► [ donations ] ◄────────────────────────┴───────────┘
                                          │
                                          ▼ (M:N)
                                 [ donation_sources ] ──► [ sources ]
```

### The 10 Core Tables:

1. **`people`**: Individuals tracked (canonical name, aliases, country, birth date, occupation, industry, is_billionaire).
2. **`organizations`**: Legal entities, charities, corporations, DAFs (`organization_type`: `FOUNDATION`, `COMPANY`, `CHARITY`, `DAF`, `POLITICAL_COMMITTEE`, `OTHER`, `ein`, `cik`, `website`).
3. **`person_organizations`**: Person-organization affiliations (`relationship_type`: `FOUNDER`, `OWNER`, `BOARD_MEMBER`, `TRUSTEE`, `ASSOCIATED_WITH`, `FOUNDER_OF`, `ownership_percent`, dates).
4. **`wealth_snapshots`**: **Historical net worth tracking**. Never overwrites past values! Indexed by `(person_id, snapshot_date DESC)`.
5. **`donations`**: Philanthropic transactions with explicit donor & recipient entity tracking (`donor_person_id`, `donor_organization_id`, `recipient_person_id`, `recipient_organization_id`, `amount`, `donation_date`, `donation_type`, `funding_source_type`, `status`).
6. **`sources`**: Traceable evidence records (`publisher`, `title`, `url`, `source_type`: `PRIMARY`, `GOVERNMENT`, `TAX_FILING`, `SEC_FILING`, `FEC`, `NEWS`, `COMPANY`, `FOUNDATION`, `DATABASE`, `SECONDARY`).
7. **`donation_sources`**: Many-to-many junction allowing multiple corroborating sources per donation.
8. **`tags`**: Reusable taxonomy (`personal`, `foundation`, `corporate`, `daf`, `health`, `education`, `community`, `pledge`).
9. **`person_tags`**: Many-to-many junction connecting people to tags.
10. **`donation_tags`**: Many-to-many junction connecting donations to tags.

### Helper Functions & Performance Views:
- **`get_closest_net_worth(person_id, target_date)`**: Pl/pgSQL function selecting the nearest recorded historical net worth on or before the donation date.
- **`v_donations_with_parity`**: Pre-computed view joining donor person, donor organization, recipient, historical net worth, historical percentage, and attribution classification.
- **`v_person_giving_summary`**: Aggregates personal, foundation, DAF, corporate, and pledge amounts per person to eliminate N+1 queries.
- **`v_person_rankings`**: Pre-computes leaderboard rankings across personal giving, ratio, and wealth without expensive ad-hoc window sorting.
- **`get_sources_for_donation(donation_id)`**: RPC function returning primary and corroborating sources supporting a gift.

---

## 5. Phase 2: Data Access Layer (`server/data-access.js`)

A clean, modular data access layer provides 10 reusable services adhering strictly to free-tier constraints:

| Function | Parameters | Return / Description |
| :--- | :--- | :--- |
| `getPeople()` | `{ limit, offset, search, isBillionaire, tag }` | Paginated people list with latest net worth and giving totals in a single query. |
| `getPersonById()` | `personId` | Full individual profile, verified tags, and aggregated giving summary. |
| `getWealthHistory()` | `personId, { limit, offset }` | Chronological immutable net worth snapshots. |
| `getDonations()` | `filters` (`personId`, `organizationId`, `fundingSourceType`, `status`, `causeCategory`, `startDate`, `endDate`, `countsAsPersonalOnly`, `limit`, `offset`) | Paginated donations with historical parity and multi-dimensional filters. |
| `getDonationById()` | `donationId` | Single donation record with corroborating citations and tags. |
| `getSourcesForDonation()` | `donationId` | Array of primary and secondary sources corroborating a donation. |
| `getPersonOrganizations()` | `personId` | Affiliated companies, foundations, and DAFs with ownership percentages and leadership roles. |
| `getPersonGivingSummary()` | `personId` | Aggregated giving totals (personal, foundation, DAF, corporate) and lifetime generosity ratio. |
| `getRankings()` | `{ metric, limit, offset }` | Leaderboard ranked by `'personal_giving'`, `'giving_ratio'`, or `'net_worth'`. |
| `getTags()` | — | Reusable taxonomy tags ordered by slug. |

---

## 6. Security & Row Level Security (RLS)

1. **No Secret Leaks:**
   - The browser and client JavaScript **never** receive the Supabase `service_role` key.
   - Only the public/anon key (`SUPABASE_ANON_KEY`) is used for client or API read access.
2. **Strict RLS Policies:**
   - Every table (`people`, `organizations`, `sources`, `person_organizations`, `wealth_snapshots`, `donations`, `donation_sources`, `tags`, `person_tags`, `donation_tags`) has RLS enabled.
   - Public policies allow read-only `SELECT` operations.
   - Write/insert/update operations are restricted and rejected for anonymous callers.

---

## 7. Free-Tier Optimization Strategy

To guarantee **100% free-tier compatibility** on Supabase and Render:
1. **Low Database Footprint:** Store source URLs and metadata; never store entire raw article HTML or binary files.
2. **Low Query Count & Indexing:**
   - Composite index `(person_id, snapshot_date DESC)`
   - Indexes on donor/recipient person and organization IDs
   - Single-column indexes on `funding_source_type` and `status`
3. **Pre-computed SQL Views:** `v_person_giving_summary` and `v_person_rankings` compute aggregate totals and rankings inside PostgreSQL, completely avoiding N+1 roundtrips.
4. **Enforced Pagination:** All donation and people listings require `limit` (max 100, default 20) and `offset`.
5. **No Unnecessary Infrastructure:**
   - ❌ No Redis caching layer
   - ❌ No Elasticsearch or Vector DBs
   - ❌ No Kafka or background job queues
   - ❌ No continuous scraping workers
6. **Graceful Fallback Mode:** `server/supabase.js` detects if Supabase credentials are missing or unconfigured and operates smoothly in offline groundwork mode without throwing uncaught exceptions.

---

## 8. Migration Guide & Applying Database Schema

### Option A: Using Supabase CLI (Recommended for Local/CI)
The migration files are structured in standard Supabase CLI format inside `supabase/migrations/`:
```bash
# Apply migrations sequentially
supabase db push
# Or run with local Supabase stack
supabase start
```

### Option B: Using Supabase Web Dashboard (Zero Install)
1. Open your **Supabase Dashboard** → **SQL Editor**.
2. Run [`supabase/migrations/20261021000001_phase1_core_schema.sql`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/supabase/migrations/20261021000001_phase1_core_schema.sql).
3. Run [`supabase/migrations/20261021000002_phase1_seed_data.sql`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/supabase/migrations/20261021000002_phase1_seed_data.sql).
4. Run [`supabase/migrations/20261021000003_phase2_views_and_functions.sql`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/supabase/migrations/20261021000003_phase2_views_and_functions.sql).

---

## 9. API Reference (Advanced Mode Endpoints)

| Method & Route | Purpose |
| :--- | :--- |
| `GET /api/advanced/status` | Diagnostic health check for Supabase connectivity and schema status. |
| `GET /api/advanced/people` | Paginated people roster with giving totals and latest net worth. |
| `GET /api/advanced/people/:id` | Individual person profile with tags and giving summary. |
| `GET /api/advanced/people/:id/wealth` | Historical immutable wealth snapshots. |
| `GET /api/advanced/people/:id/organizations` | Associated companies, foundations, and DAFs. |
| `GET /api/advanced/people/:id/summary` | Aggregated giving metrics (personal vs foundation/DAF totals). |
| `GET /api/advanced/donations` | Filtered donations with historical net worth and parity percentages. |
| `GET /api/advanced/donations/:id` | Donation details with corroborating sources and tags. |
| `GET /api/advanced/donations/:id/sources` | Direct and secondary corroborating citations. |
| `GET /api/advanced/rankings` | Leaderboard ranked by personal giving, giving ratio, or net worth. |
| `GET /api/advanced/tags` | Reusable taxonomy tags. |
| `GET /api/advanced/organizations` | Tracked philanthropic organizations and corporate entities. |
| `GET /api/advanced/parity/calculate` | Compute historical parity using query parameters. |
| `POST /api/advanced/parity/calculate` | Compute historical parity using JSON payload. |

---

## 10. Phase 3: Historical Wealth-Aware Calculation Engine

### 10.1 Core Principle
A donation must be compared against the billionaire's estimated wealth at the **time of the donation**, never against their current wealth.

### 10.2 Mathematical Specifications
1. **Historical Generosity Ratio:**
   $$\text{historical\_generosity\_ratio} = \frac{\text{donation\_amount}}{\text{historical\_net\_worth}} \times 100$$
2. **User Equivalent Sacrifice:**
   $$\text{user\_equivalent} = \text{user\_income} \times \frac{\text{historical\_generosity\_ratio}}{100}$$
   - Where $\text{user\_income}$ is explicitly declared as either **monthly** or **annual**.
   - If monthly income is selected:
     $$\text{user\_equivalent\_monthly} = \text{user\_equivalent}, \quad \text{user\_equivalent\_annual} = \text{user\_equivalent} \times 12$$
   - If annual income is selected:
     $$\text{user\_equivalent\_annual} = \text{user\_equivalent}, \quad \text{user\_equivalent\_monthly} = \frac{\text{user\_equivalent}}{12}$$
3. **Precision Rule:** All calculations remain completely unrounded internally using full double-precision floating-point arithmetic. Display rounding is performed only at the presentation boundary.

### 10.3 Wealth Snapshot Quality Classification Tiers
Historical snapshots are evaluated strictly on or before the donation date ($\text{snapshot\_date} \le \text{donation\_date}$):

| Quality Code | Delta Boundary | Classification Rule & Behavior |
| :--- | :--- | :--- |
| `EXACT_DATE` | $0\text{ days}$ | Snapshot calendar date exactly matches donation date. Highest confidence. |
| `NEAR_DATE` | $1 \text{ to } 90\text{ days}$ | Snapshot recorded within 90 days before donation date. |
| `SAME_YEAR` | $> 90\text{ days}$ | Snapshot recorded in the same calendar year as donation (> 90 days prior). |
| `APPROXIMATE` | $> 1\text{ year} \le 3\text{ years}$ | Snapshot recorded 1 to 3 years before donation (up to 1,095 days). Disclosed as historical approximation. |
| `UNAVAILABLE` | $> 3\text{ years}$, future, or missing | No qualifying snapshot exists within 3 years prior to donation, net worth $\le 0$, or snapshot is in the future. **Never silently fall back to today's wealth.** |

> [!IMPORTANT]
> **Strict Temporal Directionality:** Future wealth snapshots are strictly rejected for historical donations. If no snapshot exists on or before the donation date, the comparison is classified as `UNAVAILABLE`.

### 10.4 Currency Handling & Conversion Guard
- **Canonical Dataset Currency:** USD ($) is the canonical evaluation currency for all billionaire valuations and recorded donations.
- **Ratio Dimensionless Invariance:** Because the generosity ratio is dimensionless ($\% = \frac{\text{USD}}{\text{USD}} \times 100$), applying this percentage to a user's income in their local currency ($\text{₹}, \$, €, £$) calculates their equivalent sacrifice directly without exchange-rate distortions.
- **Display Separation:** Any presentation currency conversion uses explicit user-selected multipliers and is clearly labeled as display-only. Historical transactions are never silently converted using modern exchange rates.

### 10.5 Reusable Architecture & Exposure
The engine is structured as an isomorphic reusable module:
- `server/parity-engine.js`: Pure Node.js/ES module used by Express routes, services, and tests.
- `public/js/parity-engine.js`: Client-side ES module powering real-time UI interactivity without network roundtrips.
- `mcp-server.js`: Exposes `calculate_historical_donation_parity` tool over standard Model Context Protocol.
- `server.js`: Exposes `GET` and `POST /api/advanced/parity/calculate`.
- `tests/parity-engine.test.js`: Comprehensive 16-test unit suite covering edge cases, large numbers, precision, and basic mode preservation.

---

## 11. Phase 4: Data Ingestion Framework & Quality Protection

Full detailed architecture is documented in [`docs/ingestion.md`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/docs/ingestion.md).

### 11.1 Architectural Guardrails
- **Maintainer CLI Only:** Strictly local manual Node scripts. No continuous scrapers, background daemons, or scheduled cloud crawlers.
- **5-Stage Pipeline:** Source Ingest → Source Validation → Normalization → Deduplication → Schema Validation → Supabase Upsert.
- **Identity Resolution:**
  - Stable Identifiers: EIN, CIK, canonical URLs, Wikidata IDs.
  - Conservative Matching: Levenshtein distance $\le 2$, suffix stripping without EIN, 14-day temporal window for duplicate transactions.
  - **No Autonomous AI Decisions:** Strict, deterministic rules prevent identity hallucination.
- **Quality Protection Guard:** Incoming lower-quality data can never overwrite higher-quality existing data without an explicit rule (e.g. `PRIMARY_REGULATORY` > `SECONDARY_NEWS`, `HIGH` > `ESTIMATE`, `VERIFIED` > `PENDING`). Existing non-null fields cannot be overwritten by empty or null values.
- **Dry-Run Support:** `npm run ingest -- --dry-run` calculates a full ingestion plan with exact statistics (`New people`, `Updated people`, `New donations`, `Potential duplicates`, `Invalid records`) without writing to the database.

---

## 12. Phase 5: Donation Classification & Verification System

### 12.1 The Non-Negotiable Core Principle
> **NOCHARITY'S PERSONAL GIVING CALCULATIONS MUST NOT AUTOMATICALLY INCLUDE MONEY DONATED BY A COMPANY OR FOUNDATION ASSOCIATED WITH A BILLIONAIRE.**

Corporate treasuries, private foundation endowments, donor-advised funds, and public pledges represent distinct economic mechanisms with tax, legal, and personal sacrifice profiles that differ fundamentally from direct individual giving.

### 12.2 Funding Source Taxonomy (`funding_source_type`)
Every donation in NoCharity requires a canonical `funding_source_type` chosen from 7 supported values:

| Value | UI Label | Counts as Personal? | Definition & Source Interpretation |
| :--- | :--- | :---: | :--- |
| `PERSONAL_DIRECT` | Direct Gift | **Yes** | A public source attributes the donation directly to the individual without intermediary entities. |
| `PERSONAL_FUNDS_CONFIRMED` | Personal Funds (Verified) | **Yes** | The source explicitly establishes that the individual's personal funds/equity were used (e.g., SEC Form 4 personal stock gift). |
| `FOUNDATION` | Foundation Grant | **No** (Contextual) | Disbursed from a private or family charitable foundation/endowment. |
| `CORPORATE` | Corporate Contribution | **No** (Contextual) | Contributed from a company or corporate treasury. |
| `DAF` | Donor-Advised Fund | **No** (Contextual) | Disbursed through a Donor-Advised Fund (sponsoring entity holds legal title). |
| `PLEDGE` | Public Pledge | **No** (Contextual) | A public commitment, intention, or Giving Pledge rather than a completed financial transfer. |
| `UNKNOWN_SOURCE` | Unknown / Unattributed | **No** (Excluded) | The donor relationship is known or suspected, but the actual funding source cannot be established. |

### 12.3 Strict Negative Inference Guardrails
The system strictly enforces conservative attribution heuristics:
1. **Never infer `PERSONAL_FUNDS_CONFIRMED` merely because a billionaire is named in an article:** An article headline stating *"Elon Musk Donates \$5.7B"* or *"Bill Gates Donates \$20B"* does not automatically prove personal funds. If an affiliated foundation or holding company executes the gift, it is classified as `FOUNDATION` or `CORPORATE`.
2. **Never infer personal income as the source of a direct donation:** Personal gifts are attributed as `PERSONAL_DIRECT` with underlying fund source `UNKNOWN` unless regulatory filings (e.g. SEC Form 4) explicitly establish equity or cash disposition.
3. **Never classify pledges as fulfilled giving:** Pledges remain classified as `PLEDGE` until a separate, verified transaction proves completion.

### 12.4 Verification Statuses (`status`)
Every donation tracks a five-stage verification lifecycle:
- `DISCOVERED`: Ingested via news scan or RSS feed, awaiting initial review.
- `UNVERIFIED`: Extracted headline without secondary corroboration or document citations.
- `PARTIALLY_VERIFIED`: Corroborated by a single reputable journalistic outlet.
- `VERIFIED`: Confirmed by primary regulatory filings (SEC, Form 990) or multiple independent corroborating sources.
- `DISPUTED`: Publicly contested, retracted, unfulfilled, or disputed by recipients.

### 12.5 Eligibility for Personal Parity Calculations
A donation is eligible for personal parity comparison **if and only if all three conditions are satisfied**:
1. `funding_source_type` $\in$ {`PERSONAL_DIRECT`, `PERSONAL_FUNDS_CONFIRMED`}
2. `funding_source_type` $\ne$ `PLEDGE`
3. `status` $\ne$ `DISPUTED`

Any donation failing any of these conditions is immediately marked:
- `isAvailable: false`
- `isEligible: false`
- An explicit user-facing explanation (`ineligibilityReason`) detailing why the gift is excluded from personal sacrifice calculations.

### 12.6 User Interface & Presentation Layer
1. **Clear Visual Distinction:** Distinct visual badges and colors across UI cards:
   - Personal donations: Green badge with verified shield.
   - Foundation donations: Purple badge.
   - Corporate donations: Amber badge.
   - DAF donations: Cyan badge.
   - Pledges: Light blue badge.
   - Unknown/Disputed: Gray / Red badges.
2. **"Show associated organization giving" Filter:**
   - Available in Advanced Mode as an explicit toggle switch (`id="toggleOrgGiving"`).
   - **Default: OFF (unchecked)** — by default, users only see personal individual giving.
   - When enabled, foundation, corporate, and DAF donations appear as contextual exploration data with prominent badges, without ever corrupting the personal generosity calculations.
3. **Source Provenance Drawer:**
   - Every donation exposes its underlying citations:
     - **Publisher** (e.g., *SEC Edgar*, *Associated Press*, *Gates Foundation Annual Report*)
     - **Source Type** (`PRIMARY`, `SEC_FILING`, `NEWS`, etc.)
     - **Publication Date**
     - **Direct External URL Link** (with secure `rel="noopener noreferrer"`)
   - Expandable source details keep the primary cards clean and uncluttered.

### 12.7 Comprehensive Testing Matrix
Unit tests in [`tests/classification.test.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/tests/classification.test.js) validate:
- **7 $\times$ 5 Combinatorial Matrix:** Evaluates all 35 combinations of funding source types and verification statuses against the eligibility rules.
- **Negative Inference Suite:** Confirms that billionaire mentions do not trigger `PERSONAL_FUNDS_CONFIRMED` without regulatory proof.
- **Strict Parity Engine Enforcement:** Verifies that the calculation engine rejects corporate, foundation, DAF, pledge, and disputed gifts with appropriate error payloads.
- **Data Access & API Filtering:** Verifies that `includeAssociatedOrgGiving` correctly gates organization records.

---

## 13. Phase 6: Advanced Mode Multi-View Architecture & Interactive Explorers

### 13.1 Dedicated Multi-View Architecture (`/` vs. `/advanced`)
Phase 6 establishes a dedicated, data-dense page (`public/advanced.html`) served at `/advanced`, cleanly decoupled from the basic meme calculator at `/`.

```
                              Settings Modal
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
          [ Basic Mode (Default) ]            [ Advanced Mode ]
          • Fast viral calculator             • Data-dense research portal
          • Local storage income              • 5 modular views / tabs
          • Route: `/`                        • Route: `/advanced`
```

1. **Zero Breaking Changes to Basic Mode:**
   - The basic calculator in [`public/index.html`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/public/index.html) and [`public/js/app.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/public/js/app.js) remains 100% operational with identical meme dynamics and income parity sliders.
   - The Settings modal introduces an explicit mode selector with instant visual feedback and smooth navigation to `/advanced`.
2. **Visual Consistency & High Data Density:**
   - Advanced Mode inherits NoCharity's aesthetic tokens: deep obsidian background (`#0b0f19`), sleek slate card containers (`#111827`), emerald success indicators (`#10b981`), and amber pledge badges (`#f59e0b`).
   - Density is achieved through compact typography, tabular layouts, badge indicators, source provenance accordions, and multi-dimensional filter ribbons.

### 13.2 The Five Core Views
Rather than rendering all data simultaneously, Advanced Mode is segmented into 5 focused tabs accessible via navigation ribbon and client URL hash routing:

#### 1. Advanced Dashboard (`#dashboard`)
Provides an executive overview with 6 core Key Performance Indicators (KPIs):
- **Tracked Billionaires:** 17 individuals tracked with historical wealth snapshots.
- **Documented Personal Donations:** Count of direct personal donations (18 gifts).
- **Documented Personal Giving Total:** Total personal philanthropic capital ($141.01B).
- **Verified Donations:** Count of citations confirmed by regulatory or journalistic evidence (32 gifts).
- **Primary & Secondary Sources:** Count of distinct citations backing the data (45 sources).
- **Latest Documented Data Date:** Date of most recent documented snapshot/gift (2024-06-28).

> [!IMPORTANT]
> **Documented Disclaimer Banner:** Prominently states: *"Data represents documented, publicly verifiable philanthropy from public filings, regulatory records, and reputable journalistic investigations. These figures do not represent complete real-world giving, private anonymous gifts, or non-public transfers."*

#### 2. Billionaire Explorer (`#billionaires`)
A filterable, searchable directory of tracked billionaires featuring:
- **Search Query Filter:** Canonical name, aliases, or occupations.
- **Country & Industry Dropdowns:** Multi-country (US, France, India, Mexico) and sector selection (Tech, Retail, Conglomerate, etc.).
- **Giving Pledge Filter:** Filter by pledge signatories vs. non-signatories.
- **Wealth & Giving Range Sliders:** Minimum and maximum net worth and personal giving filters.
- **Sorting Dimensions:** Sort by Personal Giving, Generosity Ratio, Net Worth, or Organization Giving.
- **Direct Profile Deep-Dive:** One-click transition to the individual's full profile.

#### 3. Donation Explorer (`#donations`)
An interactive transaction-level browser with strict attribution isolation:
- **Attribution Isolation Default:** Defaults strictly to `PERSONAL_DIRECT` and `PERSONAL_FUNDS_CONFIRMED`.
- **"Include Foundations and Companies" Toggle:** Explicit toggle switch (`#donations-include-orgs`) to reveal contextual foundation, corporate, and DAF records without silently corrupting personal totals.
- **Multi-Dimensional Filters:** Filter by billionaire donor, start/end dates, minimum/maximum amount, funding source type, verification status, cause category, and source tier.
- **Inline Parity Calculation:** Displays historical wealth at donation date, percentage of historical net worth, and user equivalent sacrifice for eligible donations.
- **Source Drawer:** Expandable inline drawers showing publisher, document type, publication date, and external link.
- **Server/Client Pagination:** 10 records per page to prevent large database dumps.

#### 4. Leaderboard Rankings (`#rankings`)
A comparative ranking matrix supporting three distinct lenses:
- **By Documented Personal Giving:** Total verified personal capital gifted.
- **By Generosity Ratio (% of Net Worth):** Lifetime documented personal giving as a percentage of current net worth.
- **By Net Worth:** Ranked by current estimated net worth.
- Highlights Giving Pledge badges and top 3 podium indicators.

#### 5. Individual Billionaire Profile (`#profile`)
A deep-dive analytical view for an individual billionaire featuring:
- **Philanthropic Snapshot:** Documented personal giving vs. contextual organization giving, generosity ratio, Giving Pledge status, and net worth.
- **Associated Organizations:** Direct cards for foundations, holding companies, and corporations, complete with EIN/CIK numbers and relationship roles.
- **Historical Net Worth Timeline:** Year-by-year tracked net worth snapshots and valuation dates.
- **Documented Transaction History:** Detailed list of all documented donations for that person with full citation provenance.

### 13.3 Backend API Enhancements
Advanced Mode endpoints in [`server.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/server.js) and [`server/data-access.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/server/data-access.js):
- `GET /api/advanced/dashboard`: Returns KPI statistics, attribution breakdown, and methodology notice.
- `GET /api/advanced/people`: Multi-parameter filtered query for billionaire explorer.
- `GET /api/advanced/donations`: Paginated, filtered transactions with attribution isolation.
- `GET /api/advanced/rankings`: Sorted leaderboard view.
- `GET /api/advanced/people/:id`: Profile aggregate view combining bio, giving summary, organizations, wealth history, and donations.

### 13.4 Automated Integration Testing
[`tests/advanced-mode.test.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/tests/advanced-mode.test.js) validates 19 integration tests covering all 6 functional areas, ensuring complete correctness, attribution isolation, and zero regressions in Basic Mode.

---

## 14. Phase 7: Individual Billionaire Profile View & Historical Parity Deep-Dive

### 14.1 Architecture & Separation Principle
Phase 7 creates the comprehensive **Individual Billionaire Profile** page (`#profile` and `#profile/:id`), delivering deep forensic transparency into billionaire giving while strictly maintaining attribution boundaries:

```
                          Individual Profile View
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
[ Documented Personal Giving ]                    [ Associated Organization Giving ]
• Strictly PERSONAL_DIRECT &                       • FOUNDATION, CORPORATE, DAF grants
  PERSONAL_FUNDS_CONFIRMED                         • Legally separate tax-sheltered entities
• 6 core giving metrics                            • Context only — EXCLUDED from personal parity
• Compared against historical wealth at donation   • Shows entity details, CIK/EIN, and grants
```

### 14.2 Five Core Profile Sections

#### 1. Header & Benchmark Metadata
- **Canonical Identity:** Name, primary nationality flag, occupation, industry sector, and Giving Pledge signatory status.
- **Latest Documented Net Worth:** Formatted in billions USD (e.g. `$145.0B`).
- **Valuation Date:** Explicit snapshot date of the benchmark valuation (e.g. `2026-01-01`).
- **Data Source:** Prominently identifies the originating financial index (`Bloomberg Billionaires Index`, `Forbes Billionaires`).
- **Biographical Context:** Brief biographical description from public records.

#### 2. Documented Personal Giving (6 Core Metrics)
Strictly aggregates verified direct personal sacrifices (excluding foundation and corporate funds):
1. **Lifetime Documented Personal Giving:** Total capital gifted directly from personal assets (`PERSONAL_DIRECT`, `PERSONAL_FUNDS_CONFIRMED`).
2. **Number of Qualifying Donations:** Count of non-disputed personal gifts.
3. **Largest Personal Gift:** Amount, recipient, and date of peak personal transaction.
4. **Latest Personal Gift:** Amount, recipient, and date of most recent personal transfer.
5. **Average Donation:** Average amount per qualifying personal gift.
6. **Giving % at Time of Donation:** Mean historical generosity ratio calculated against the billionaire's wealth at the time of each gift.

#### 3. Wealth History (Zero Fabricated Interpolation)
- **Simple Historical Chart:**
  - Built with pure SVG (`<svg viewBox="0 0 760 180">`) with zero external charting library bloat.
  - Plots discrete point-in-time valuation snapshots chronologically.
  - **No Fabricated Interpolation:** Avoids smoothed spline curves or artificial daily interpolation between sparse annual snapshots.
  - Nodes display exact formatted valuations (e.g. `$108B`, `$120B`, `$135B`, `$145B`) and dates, with interactive hover tooltips identifying the benchmark publisher.
- **Historical Snapshots Table:**
  - Tabular breakdown of each immutable snapshot: Valuation Date, Net Worth (USD), Benchmark Source, and Confidence Tier (`HIGH`).
- **Estimates Disclaimer:** Prominently notes that valuations are historical estimates compiled from public benchmarks.

#### 4. Associated Organization Giving (Strict Separation)
- **Attribution Boundary Notice:** Explicit disclaimer explaining that foundations, companies, and DAFs are legally distinct from the individual and do not count as personal sacrifice.
- **Organizational Totals:** Separate stat tiles for Foundation Grants, Corporate Giving, DAF Transfers, and Public Pledges.
- **Associated Legal Entities Table:** Lists foundations, operating companies, and DAFs with their relationship role (e.g., Chairman & CEO, Co-Founder, Trustee), ownership percentage, country, EIN/CIK identifiers, and website links.
- **Grants Made by Associated Organizations Table:** Transaction-level list of grants disbursed by these entities (Date, Disbursing Organization, Recipient, Amount, Type, Status, and Source link).

#### 5. Donation History & Historical Parity
- **Interactive User Parity Baseline Ribbon:**
  - Real-time controls for currency (`₹`, `$`, `€`, `£`), monthly/annual income baseline, and instant recalculation without page reload.
  - Synchronizes with `localStorage` defaults.
- **Dense Transaction Table:**
  - **Date:** ISO transaction date.
  - **Amount:** Formatted donation amount.
  - **Recipient / Cause:** Primary recipient entity or cause category.
  - **Funding Source:** Typed badge (`👤 Personal Direct`, `🛡️ Personal Funds (Confirmed)`, `🏛️ Foundation Grant`, etc.).
  - **Status:** Verification status (`Verified`, `Partially Verified`, `Disputed`).
  - **Wealth at Donation & Proximity Note:** Displays historical net worth at donation and explicitly notes estimation proximity:
    - *Exact-date benchmark* (0 days)
    - *Within N days of donation* (1–90 days)
    - *Same calendar year estimate* (>90 days in same year)
    - *Based on nearest available YYYY wealth estimate* (1–3 years prior)
    - *Historical wealth estimate unavailable*
  - **Giving Ratio (% of Wealth):** Historical generosity ratio for personal gifts (or *"Contextual Org Grant"* for non-personal funds).
  - **User Equivalent:** The user's proportional financial sacrifice calculated as $\text{User Income} \times (\text{Giving Ratio} / 100)$.
  - **Source Evidence:** Direct publisher link with secure `rel="noopener noreferrer"` and expandable citation drawer.

### 14.3 Backend Service Layer & Performance
- **`getBillionaireProfile(personIdOrSlug)` in [`server/data-access.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/server/data-access.js):**
  - Resolves both UUIDs and kebab-case slugs (`'warren-buffett'`, `'bill-gates'`).
  - Fetches summary, snapshots, organizations, and donations in parallel indexed queries.
  - Computes all 6 personal giving statistics and organizational separations on the server in a single round-trip.
- **Endpoints:**
  - `GET /api/advanced/people/:id`
  - `GET /api/advanced/people/:id/profile`
  - `GET /api/advanced/profile/:id`

### 14.4 Automated Integration Testing
[`tests/profile.test.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/tests/profile.test.js) validates:
- Complete header and benchmark metadata retrieval.
- Exact computation of all 6 personal giving metrics.
- Handling of billionaires with zero qualifying personal gifts (e.g. Elon Musk).
- Strict separation of organization grants (Gates Foundation, Tesla corporate gift) without merging into personal sacrifice.
- Chronological ordering of historical snapshots.
- Proximity classification and citation provenance.

---

## 15. Phase 8: Donation Explorer & Comprehensive Ranking System

### 15.1 Core Philosophy: Documented Regulatory Evidence vs Unverified Claims
The ranking system and Donation Explorer are anchored to a non-negotiable principle: **rankings must reflect documented primary data (regulatory filings, tax disclosures, corroborated news records), not unverified claims of complete lifetime giving.**

Because public documentation varies in historical depth across individuals, aggregate rankings must never treat disparate coverage as equivalent. A donor with records spanning 2025–2026 cannot be concluded to be less generous than an individual with filings tracked from 2006–2024.

### 15.2 The 6 Documented Philanthropy Rankings
The ranking system implements 6 distinct metrics in [`server/data-access.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/server/data-access.js) via `getRankings({ metric, limit, offset })`:

1. **Largest Documented Personal Donation (`largest_donation`):**
   - Ranks by single highest gift transaction verified to originate from individual personal funds.
   - Foundation grants and corporate balance-sheet giving are strictly excluded.
2. **Highest Documented Personal Giving Total (`personal_giving`):**
   - Ranks by cumulative documented personal giving.
   - Displays clear data coverage indicators (e.g. `Coverage: 2022–2025 (4 active yrs)`) to contextualize observation spans.
3. **Highest Giving as % of Wealth at Time of Donation (`giving_ratio`):**
   - **Strict Mathematical Rule:** Calculated strictly as:
     $$\text{Giving Ratio} = \frac{\text{Donation Amount}}{\text{Historical Net Worth at Donation Date}} \times 100$$
   - **Prohibited:** Never divides total lifetime donations by present-day net worth ($\frac{\sum \text{Donations}}{\text{Current Wealth}}$).
4. **Highest Average Personal Donation (`average_donation`):**
   - Ranks by mean value per qualifying personal donation: $\frac{\text{Total Personal Giving}}{\text{Qualifying Donations Count}}$.
5. **Most Documented Personal Donations (`most_donations`):**
   - Ranks by total count of distinct verified personal transactions on public record.
6. **Giving Per Year Where Sufficient Historical Data Exists (`giving_per_year`):**
   - Calculates annualized giving velocity over verified historical observation windows:
     $$\text{Annualized Rate} = \frac{\text{Total Personal Giving}}{\text{Coverage Span in Years}}$$
   - **Partitioning:** Prioritizes individuals with **multi-year baselines** ($\text{span} \ge 2\text{ years}$), badged as `✅ Multi-Year Baseline`. Single-year records are badged as `⚠️ Single-Year Record` to prevent one-off gifts from skewing annual run-rates.

### 15.3 Transparent Data Coverage Indicators
Every aggregate ranking record provides:
- `coverage_years`: Earliest to latest documented transaction year (e.g., `2020–2024`).
- `coverage_span`: Total calendar span in years ($\text{Max Year} - \text{Min Year} + 1$).
- `active_years_count`: Number of distinct calendar years with verified transactions.
- `has_sufficient_data`: Boolean flag indicating whether $\text{coverage\_span} \ge 2$.
- `coverage_indicator`: Formatted string (e.g., `2020–2024 (5 active yrs)`).

### 15.4 Verified Donation Explorer
The Donation Explorer in [`public/advanced.html`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/public/advanced.html) enables multi-dimensional discovery:
- **Default Mode:** Strict personal giving only (`PERSONAL_DIRECT`, `PERSONAL_FUNDS_CONFIRMED`).
- **Explicit Toggle:** `"Include foundation/company donations"`. When checked, displays contextual disbursements without merging them into personal sacrifice.
- **5 Explicit Badges (No Invisible Merging):**
  - `PERSONAL` (`badge-personal`, green)
  - `FOUNDATION` (`badge-foundation`, purple)
  - `CORPORATE` (`badge-corporate`, orange)
  - `DAF` (`badge-daf`, cyan)
  - `PLEDGE` (`badge-pledge`, indigo)
- **Multi-Dimensional Sorting (`sortBy` & `sortOrder`):**
  - `amount`: Gift value (highest/lowest first).
  - `date`: ISO timestamp (newest/oldest first).
  - `percentage`: % of wealth at donation date (highest/lowest first).
  - `billionaire`: Donor canonical name (A-Z, Z-A).
  - `status`: Verification tier (verified first).
  - Interactive clickable column headers (`th.th-sortable`) with directional arrow indicators (`▲`/`▼`).
- **Citation Provenance Drawer:** Collapsible citation breakdown showing publisher, source tier (`PRIMARY`), document title, and verified external URL.

### 15.5 Performance & Infrastructure Constraints
- **Zero Heavy Analytics Overhead:** Runs entirely on standard Postgres indexed queries, Supabase relational views (`v_donations_with_parity`, `v_person_giving_summary`), and lightweight in-memory aggregations for small datasets.
- **Offline Fallback Resilience:** When Supabase environment variables are missing, `getRankings` and `getDonations` gracefully serve normalized mock records without crashing.
- **Dual-Mode Preservation:** Basic Meme Mode (`public/index.html` and `public/js/app.js`) remains completely untouched and operational.

---

## 16. Phase 9: Advanced "Reality Check" Calculator (Centerpiece Architecture)

### 16.1 Design Philosophy: Proportional Wealth Comparison vs. Subjective Financial Pain
The **Reality Check Calculator** serves as the centerpiece of NoCharity Advanced Mode. Its central premise is calculating personal philanthropic sacrifice based on the billionaire's documented wealth **at the exact historical time of the donation**, rather than relying on current inflated net worth or treating foundation disbursements as individual sacrifice.

#### Strict Language Guardrails & Non-Misleading Phrasing
- **Not an Exact Comparison of Financial Pain:**
  Relinquishing 2% of a $50B fortune leaves tens of billions in residual capital, creating zero material disruption to personal comfort or generational security. Conversely, sacrificing 2% of a household income directly impacts housing, nutrition, healthcare, or emergency reserves.
- **Strict Phrasing Mandate:**
  - Standard term: **"Proportional wealth comparison"**
  - Qualification tagline: **"Equivalent by percentage of wealth."**
  - Misleading phrases like *"this is exactly what they sacrificed"* or claims of equal pain are strictly prohibited.

---

### 16.2 Mathematical Model & Canonical Benchmarks

#### 1. Historical Generosity Ratio
$$\text{Historical Generosity Ratio (\%)} = \frac{\text{Donation Amount (USD)}}{\text{Historical Net Worth at Donation (USD)}} \times 100$$

#### 2. User Equivalent Financial Sacrifice
$$\text{User Equivalent Sacrifice} = \text{User Baseline Income} \times \left(\frac{\text{Historical Generosity Ratio}}{100}\right)$$

#### 3. Canonical Benchmark Verification
- **Billionaire Wealth at Donation:** $\$50,000,000,000$ ($\$50\text{B}$)
- **Donation Amount:** $\$1,000,000,000$ ($\$1\text{B}$)
- **Proportional Wealth Ratio:** $2.00\%$
- **User Monthly Income:** $₹60,000$
- **Equivalent User Sacrifice:** $₹1,200$

#### Canonical Statements Formatted by the Engine:
> *"They gave approximately 2.00% of their documented wealth at the time."*  
> *"For an income of ₹60,000/month, that is equivalent to ₹1,200."*

#### 4. Explicit Income Frequency Scaling
The engine supports both **Monthly** and **Annual** income inputs:
- If Monthly: `₹60,000/month` $\to$ `₹1,200/month`
- If Annual: `₹720,000/year` $\to$ `₹14,400/year`
- The statement dynamically reflects the chosen interval:
  > *"For an income of [Currency][Income]/[month|year], that is equivalent to [Currency][Equivalent]."*

---

### 16.3 Visual Explanation & Dual Scale Representation

To ensure intuitive comprehension of scale, the Reality Check Calculator provides dual representations:

#### 1. Animated CSS Gradient Bars
- **Their Documented Wealth:** Continuous 100% baseline track.
- **Donation Slice:** Highlighted slice calibrated to the exact ratio percentage (with an enforced minimum visible sliver of 0.4% so micro-donations remain clearly visible).
- **Your Baseline Income:** Continuous 100% baseline track in user's currency.
- **Equivalent Sacrifice:** Proportional slice matching the billionaire's percentage.

#### 2. Monospace High-Contrast ASCII Block Diagram
```text
Their wealth
████████████████████ $50,000,000,000 (100.0%)

Donation
▌ $1,000,000,000 (2.00%)

Your income
████████████████████ ₹60,000/month (100.0%)

Equivalent
▌ ₹1,200 (2.00%)
```

---

### 16.4 Multi-Billionaire Side-by-Side Comparison

The calculator provides a multi-billionaire side-by-side comparison grid in [`public/advanced.html`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/public/advanced.html) powered by `compareBillionairesParity` in [`server/data-access.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/server/data-access.js).

#### Side-by-Side Example (Calibrated to ₹60,000/month income):
| Billionaire | Documented Historical Ratio | Equivalent Sacrifice |
| :--- | :---: | :---: |
| **Billionaire A** | `5.2%` | `₹3,120` |
| **Billionaire B** | `1.1%` | `₹660` |
| **Billionaire C** | `0.3%` | `₹180` |

#### Key Capabilities:
- **Interactive Multi-Currency Support:** Dynamically computes in `₹`, `$`, `€`, `£`, `¥`, `C$`, `A$`, and `CHF`.
- **Category Filter Chips:** Instant client-side filtering for *All Tracked (17)*, *Top Givers*, *Tech Giants*, *🇮🇳 Indian Donors*, and *🇺🇸 US Donors*.
- **Interactive "Deep Dive" Trigger:** Clicking "Deep Dive" on any comparison card instantly switches the single donation calculator to that donor and smoothly scrolls into focus.
- **Transparent Data Coverage Badges:** Each card highlights the historical observation span (e.g. `2018–2025`) and giving pledge status.

---

### 16.5 Compact 3-Card Methodology Reference
1. **Historical Wealth Proximity:**
   Donations are measured against the donor's net worth **at the time of the transaction**, not today's inflated valuations. Snapshots are chronologically anchored and audited to eliminate temporal distortion.
2. **Strict Attribution Isolation:**
   Only direct personal capital and verified out-of-pocket donations qualify. Corporate charitable marketing, private foundation grants, and unfulfilled pledges are strictly isolated from personal sacrifice.
3. **Scale vs. Marginal Utility:**
   This tool computes mathematical parity, not subjective pain. A 2% sacrifice from an everyday earner affects basic household necessities; 2% from an ultra-wealthy fortune leaves lavish generational security intact.

---

### 16.6 Backend Endpoints & API Surface

- **`GET /api/advanced/parity`:**
  Calculates single-donation parity given `donationId` or custom parameters (`donationAmount`, `historicalNetWorth`, `userIncome`, `incomeFrequency`, `userCurrency`).
- **`GET /api/advanced/parity/compare`:**
  Computes side-by-side proportional comparisons across all or selected billionaires:
  - Query parameters: `personIds`, `userIncome`, `incomeFrequency`, `userCurrency`.
- **`POST /api/advanced/parity/compare`:**
  Accepts a JSON payload for side-by-side comparison calculations.

---

## 17. Phase 10: Model Context Protocol (MCP) Modernization & Supabase Decoupling

### 17.1 Architectural Decoupling from `public/js/data.js`
In earlier iterations, the Model Context Protocol server imported `INITIAL_BILLIONAIRES` directly from `public/js/data.js` as its primary data store. Phase 10 modernizes `mcp-server.js` by connecting it directly to the unified Supabase PostgreSQL data access layer (`server/supabase.js` and `server/data-access.js`):

```
MCP Tool Request ──> mcp-server.js ──> server/supabase.js (Data Access Layer)
                                           │
                        ┌──────────────────┴──────────────────┐
                        ▼                                     ▼
                Supabase PostgreSQL                  Offline Fallback Adapter
                (Live Views & RPC)                   (INITIAL_BILLIONAIRES)
                        │                                     │
                        └──────────────────┬──────────────────┘
                                           ▼
                             server/parity-engine.js
                          (Zero-Duplication Engine)
```

1. **Supabase When Configured:** When `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured, all MCP tool invocations query live PostgreSQL database views (`v_person_giving_summary`, `v_donations_with_parity`, `v_person_rankings`).
2. **Fallback Isolation:** `INITIAL_BILLIONAIRES` is retained strictly as:
   - Development seed data
   - Offline fallback when Supabase credentials are not present
   - Backwards-compatibility mechanism for legacy imports
3. **Zero Calculation Duplication:** The MCP server invokes `calculateHistoricalParity` and `compareBillionairesParity` directly from the core engine, guaranteeing 100% mathematical and nuance parity with the web application.

---

### 17.2 Strict Attribution Isolation
Consistent with Phase 5 and Phase 8 standards:
- The MCP server distinguishes 5 funding source categories: `PERSONAL`, `FOUNDATION`, `CORPORATE`, `DAF`, and `PLEDGE`.
- **Default Behavior:** `search_donations`, `get_person_donations`, and `calculate_historical_parity` default strictly to personal gifts (`PERSONAL_DIRECT`, `PERSONAL_FUNDS_CONFIRMED`).
- **Rejection of Non-Personal Funds:** Company donations, private foundation disbursements, donor-advised funds, and pledges are rejected from personal parity calculations with transparent ineligibility reasons (`isPersonalParityEligible = false`).
- Company and foundation disbursements are never silently included.

---

### 17.3 The 10 Modernized MCP Tools
1. **`get_person`**: Biographical details, latest net worth, Giving Pledge status, and personal giving metrics.
2. **`search_people`**: Multi-dimensional search across wealth, country, industry, and pledge status.
3. **`get_wealth_history`**: Chronological historical wealth snapshots without fabricated interpolation.
4. **`search_donations`**: Verified donation search with default personal giving filtering.
5. **`get_donation`**: Detailed single donation record with historical net worth, ratio, and citations.
6. **`get_person_donations`**: All documented donations by a specific billionaire (personal isolated from org giving).
7. **`get_person_giving_summary`**: Lifetime personal giving total, qualifying gift count, average donation, and wealth percentage.
8. **`compare_people`**: Proportional wealth comparison across multiple billionaires calibrated to user income.
9. **`calculate_historical_parity`**: Steps 1–6 historical wealth parity calculation with provenance and Phase 9 display statements.
10. **`get_sources`**: SEC Form 4, IRS Form 990-PF, and primary news citations.

---

### 17.4 Backwards-Compatible Legacy Tools
All existing legacy MCP tools remain fully functional:
- **`search_billionaire_news`**: Google News RSS scraper.
- **`calculate_donation_parity`**: Legacy unweighted basic mode calculation.
- **`get_billionaires_list`**: Legacy billionaire roster with source URLs.
- **`calculate_historical_donation_parity`**: Preserved legacy alias for `calculate_historical_parity`.

---

### 17.5 Complete Reference
For exhaustive JSON schemas, request/response examples, and client configuration snippets, see [`docs/mcp-tools.md`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/docs/mcp-tools.md).

---

## 18. Phase 11: News Discovery Mechanism & Maintainer Review Workflow

### 18.1 Core Principle: Discovery vs. Authoritative Database

In NoCharity Advanced Mode, Google News RSS is designated strictly as an unauthoritative **DISCOVERY mechanism** rather than an authoritative database.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Google News RSS Feed                            │
│                        (Early Warning Radar)                           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ On-demand scan (No background polling)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        server/discovery-engine.js                      │
│ - Entity Extraction: Donor, Recipient, Amount ($5.3B -> 5,300,000,000) │
│ - Confidence Scoring: HIGH (donation verbs) / MEDIUM                   │
│ - Attribution Classifier: PERSONAL_DIRECT, FOUNDATION, CORPORATE, etc. │
│ - Phase 11 Invariant: status = DISCOVERED, is_authoritative = false    │
│ - Mandatory Badge: "Potential donation — verification required"        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Discovered Candidate Record
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                Lightweight Maintainer Review Workflow                  │
│               (Local CLI & Advanced Mode Audit Modal)                  │
│                                                                        │
│   Step 1: News Result   (Inspect headline, publisher, date)            │
│          │                                                             │
│   Step 2: Classify      (Confirm PERSONAL_DIRECT vs FOUNDATION/CORP)   │
│          │                                                             │
│   Step 3: Verify        (Audit against primary filing: SEC Form 4, 990)│
│          │                                                             │
│   Step 4: Upsert        (Commit audited record to Supabase database)   │
└────────────────────────────────────────────────────────────────────────┘
```

### 18.2 Invariants for Discovered Donations

When a media headline or snippet appears to describe a donation:
1. **Never Automatically Marked Verified:** Status is initialized to `DISCOVERED` (or `UNVERIFIED`). It is **never** automatically promoted to `VERIFIED`.
2. **Never Automatically Inserted as Confirmed Personal Giving:** `is_confirmed_personal_giving` is strictly set to `false`. Discovered items are excluded from personal parity calculations, giving totals, and rankings.
3. **Mandatory Explicit Badge:** Every discovered candidate carries the exact badge:
   `"Potential donation — verification required"`
4. **Structured Candidate Fields:**
   - Source publisher (e.g. *Reuters*, *Associated Press*, *Bloomberg*)
   - Publication date (ISO format)
   - Article URL
   - Detected donor (name and matched database entity)
   - Detected recipient (charity, university, or cause)
   - Extracted amount (numeric USD value with `HIGH` or `MEDIUM` confidence)
   - Possible funding source (`PERSONAL_DIRECT`, `FOUNDATION`, `CORPORATE`, `DAF`, `PLEDGE`, `UNKNOWN_SOURCE`)
   - Audit trail workflow state

### 18.3 Architectural Constraints Upmast
- **No Background Workers:** News scanning is strictly on-demand. There are no cron jobs, queue workers, or continuous polling loops hitting Google News.
- **No Admin SaaS:** Maintainer review is implemented via:
  - A lightweight local CLI script: `node scripts/review-discovery.js` (also `npm run review`)
  - A client-side audit modal in `public/advanced.html` calling `POST /api/advanced/discover/verify`.
- **Zero Breakage of Legacy Systems:**
  - `/api/news` remains fully available and unmodified for Basic Mode.
---

## 19. Data Quality & Consistency Layer (Phase 12)

### 19.1 Philosophy & Core Mandate
> **"The goal is not academic perfection. The goal is preventing NoCharity from confidently displaying nonsense."**

Public philanthropic reporting is plagued by press release exaggerations, conflation of personal wealth with corporate donations, multi-year pledge double-counting, and temporal mismatching (e.g. evaluating an old donation against a recent post-bubble fortune). The Phase 12 Data Quality Layer acts as an automated anti-nonsense validation boundary.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RAW DONATION PAYLOAD                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    ▼                                                               ▼
┌──────────────────────────┐                                    ┌──────────────────────────┐
│  8 ESSENTIAL QUESTIONS   │                                    │  10 INVARIANT RULES      │
│  - WHO?                  │                                    │  - Positive amount (>0)  │
│  - WHAT?                 │                                    │  - Valid calendar date   │
│  - WHEN?                 │                                    │  - Source for verified   │
│  - HOW MUCH?             │                                    │  - Personal has person   │
│  - FROM WHOM?            │                                    │  - Org for corp/found.   │
│  - TO WHOM?              │                                    │  - Pledges excluded      │
│  - SOURCE?               │                                    │  - Disputed quarantined │
│  - HOW CERTAIN?          │                                    │  - Wealth positive (>0)  │
└───────────┬──────────────┘                                    └────────────┬─────────────┘
            │                                                                │
            └───────────────────────────────┬────────────────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │              CONSISTENCY CHECKS               │
                    │  1. Temporal Wealth Consistency:              │
                    │     - Reject 2018 donation vs 2026 snapshot   │
                    │     - Mark approximate if 1–3 year gap        │
                    │     - Flag unavailable if >3 year gap         │
                    │  2. Multi-Source Discrepancy Preservation:    │
                    │     - Never silently pick one figure          │
                    │     - Preserve all amounts & calculate spread │
                    │     - Flag record with Grade D                │
                    └───────────────────────┬───────────────────────┘
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │         DATA QUALITY REPORT & SCORING         │
                    │  - Score: 0 to 100                            │
                    │  - Quality Grades:                            │
                    │    * Grade A (85–100): Audited & Complete     │
                    │    * Grade B (70–84):  Well-Documented        │
                    │    * Grade C (50–69):  Preliminary / Approx   │
                    │    * Grade D (0–49):   Flagged / Disputed     │
                    │  - Status: VERIFIED, PARTIAL, UNVERIFIED      │
                    └───────────────────────────────────────────────┘
```

### 19.2 The 8 Essential Questions
Every donation in NoCharity must contain sufficient metadata to answer:
1. **WHO?** Canonical donor identity (person or legal entity).
2. **WHAT?** Precise nature of gift (shares, cash, property) and stated cause.
3. **WHEN?** Transaction date in ISO YYYY-MM-DD format.
4. **HOW MUCH?** Quantified valuation (> 0) and explicit currency (USD).
5. **FROM WHOM?** Exact funding vehicle (Personal Direct, Foundation, Corporate, DAF, Pledge).
6. **TO WHOM?** Verified recipient charity, university, or non-profit trust.
7. **SOURCE?** Primary regulatory filing (SEC Form 4, IRS 990-PF) or investigative journalism citation.
8. **HOW CERTAIN?** Verification status tier (`VERIFIED`, `PARTIALLY_VERIFIED`, `UNVERIFIED`, `DISPUTED`).

### 19.3 Invariant Validation Rules
- **Amount Positivity:** `amount > 0` and finite. Zero, negative, and non-numeric values are rejected.
- **Date Validity:** Must parse to a valid calendar date between year 1800 and current calendar year + 1.
- **Source Citation:** `VERIFIED` status requires at least one primary or secondary citation URL/document.
- **Attribution Alignment:** Personal gifts must specify a person donor. Foundation and corporate gifts must specify an organizational entity.
- **Pledge Exclusion:** Pledges cannot count toward completed giving or confirmed personal giving totals.
- **Dispute Quarantine:** Disputed records are strictly barred from default rankings and personal parity calculations.
- **Wealth Sanity:** Historical net worth benchmarks used for parity calculations must be strictly positive (`> 0`).
- **Currency Specification:** Non-empty ISO currency code required.

### 19.4 Consistency Checks
- **Temporal Wealth Alignment:** If a donation occurred in 2018, a 2026 valuation snapshot cannot be used without explicitly marking it as unavailable/approximate. Future snapshots relative to the donation date are classified as `FUTURE_SNAPSHOT_MISMATCH` with `isConsistent: false` and `isUnavailable: true`.
- **Preservation of Disagreements:** When credible sources report conflicting gift amounts (e.g. $50M in a press release vs $80M in IRS filings), NoCharity preserves all figures, computes the spread, logs a transparent disagreement summary, and flags the record with Grade D. The system **never** silently picks one figure.

### 19.5 Methodology Documentation
NoCharity provides a comprehensive standalone methodology document at `/methodology` (`public/methodology.html`) and an interactive in-app auditor tab in Advanced Mode (`public/advanced.html#methodology`). The documentation covers:
1. Historical wealth benchmark pairing.
2. Personal direct giving vs organizational endowments.
3. Primary regulatory verification standards.
4. Source limitations and private non-disclosure boundaries.
5. Incomplete public records and coverage horizons.
6. Why "documented giving" is not equivalent to total real-world giving.

---

## 20. Phase 13: High-Quality Initial Dataset & Seeding Architecture

### 20.1 Purpose & Guiding Principles
The purpose of Phase 13 is to **prove the system architecture with a small, high-quality dataset**, rather than attempting to maximize record count or prematurely scrape 1,000 billionaires with low-confidence or synthetic estimates.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   PHASE 13 INITIAL DATASET ARCHITECTURE                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│  1. TARGET SCOPE: 25 High-Profile Billionaires with Rigorous Public Documentation │
│  2. CANONICAL IDENTITY:                                                           │
│     - Canonical Name, UUID, First/Last Name, Aliases                              │
│     - Country, Industry, Primary Occupation, Summary                              │
│  3. AFFILIATED ORGANIZATIONS (46 Entities):                                       │
│     - Commercial Companies (e.g. Berkshire Hathaway, Microsoft, Tesla, LVMH)      │
│     - Private Foundations (e.g. Gates Foundation, Azim Premji Foundation)         │
│     - Donor-Advised Funds (e.g. Fidelity Investments Charitable Gift Fund)        │
│  4. HISTORICAL WEALTH SNAPSHOTS (131 Snapshots):                                  │
│     - Multi-year dated valuations with regulatory/index citations                 │
│  5. ATTRIBUTION SEPARATION (68 Documented Donations):                             │
│     - Documented Personal Donations (SEC Form 4 stock transfers, direct cash)     │
│     - Associated Foundation Grants (IRS Form 990-PF grants)                       │
│     - Corporate Giving (Statutory CSR, corporate matches)                         │
│     - DAF Transfers & Pledges (Explicitly tagged INCOMPLETE)                      │
│  6. RE-RUNNABLE IDEMPOTENT SEEDING ENGINE:                                        │
│     - scripts/seed/seed-phase13.js (--dry-run / --commit)                        │
│     - supabase/migrations/20261022000008_phase13_high_quality_seed.sql           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 20.2 Strict Quality Invariants Enforced
1. **No Invented Data:** Missing fields remain explicit `null` rather than fabricated placeholders.
2. **No Inferring Personal Giving from Foundation Disbursements:** Foundation grants (e.g., Gates Foundation distributions) are credited strictly to the foundation organization entity, never conflated with personal gifts.
3. **No Inferring Income from Net Worth:** Net worth snapshots and income are never conflated or synthetically derived from one another.
4. **No Current Net Worth for Historical Ratios:** Historical donation parity ratios strictly compare against the closest historical net worth snapshot on or before the donation date.
5. **Universal Provenance:** Every single seed record has an explicit source citation (SEC Form 4, IRS Form 990-PF, corporate annual reports, or primary press releases).
6. **Transparent Quality Status:**
   - `VERIFIED`: Regulatory filing or audited institutional registry.
   - `APPROXIMATE`: Validated historical benchmark with temporal approximation.
   - `INCOMPLETE`: Non-binding pledge or opaque DAF transfer with unverified end recipients.

### 20.3 Dataset Status Breakdown (25 Billionaires)
- **Verified Donors (23):** Warren Buffett, Bill Gates, MacKenzie Scott, Azim Premji, Andrew Carnegie, John D. Rockefeller, Carlos Slim, Jack Ma, Michael Bloomberg, Mark Zuckerberg & Priscilla Chan, Jeff Bezos, Larry Ellison, Bernard Arnault & Family, Steve & Connie Ballmer, Chuck Feeney, George Soros, Gordon Moore, Pierre Omidyar, Shiv Nadar, Michael Dell, Sergey Brin, Larry Page, Mukesh Ambani.
- **Incomplete / Opaque Transfers (2):**
  - **Elon Musk:** 2021 Tesla stock transfer to a Donor-Advised Fund (DAF) flagged `INCOMPLETE` due to unverified end recipients.
  - **Gautam Adani:** 2022 non-binding ₹60,000 Crore birthday pledge flagged `INCOMPLETE` and excluded from completed giving totals.

### 20.4 Seeding Workflow
To inspect or apply the Phase 13 dataset:
```bash
# Dry-run inspection (validates 100% of invariants and 8 Questions without database writes):
npm run seed:phase13 -- --dry-run

# Commit idempotent upserts to live Supabase:
npm run seed:phase13 -- --commit

# Run automated test suite:
npm test
```

---

## 21. Phase 14: Free-Tier Resource & Performance Optimization Audit

### 21.1 Core Mandate
NoCharity is an open-source, non-commercial public good. The application must **remain 100% within free-tier resource limits** and avoid complex, billable infrastructure:
- Prefer: **GitHub + Supabase Free + In-Memory Node Caching + On-Demand Scripts + Public Source URLs**
- Reject: **Redis / Memcached clusters, Celery/BullMQ workers, S3 buckets, background crawler daemons, analytics clusters**

### 21.2 Ten Operational Requirements & Invariants
1. **Startup Donation Fetching:** Advanced Mode never fetches all donations on initialization. Only top 6 highlights are fetched on dashboard startup.
2. **Pagination Enforcement:** Explorer queries enforce strict pagination (default 20, max 100 records per page).
3. **N+1 Query Elimination:** Summary views (`v_person_giving_summary`, `v_organization_giving_summary`) aggregate totals inside Postgres rather than looping across N records in application code.
4. **In-Memory Caching (`server/cache.js`):** Bounded 500-item LRU cache memoizes high-frequency, slow-changing endpoints:
   - Dashboard metrics (60s TTL)
   - Taxonomy tags (300s TTL)
   - Rankings (60s TTL)
   - Historical wealth snapshots (120s TTL)
   - Google News RSS scans (600s TTL)
5. **Zero Continuous Polling:** No `setInterval` loops exist in frontend or backend code. All data requests are strictly user-driven.
6. **On-Demand Google News RSS:** News queries execute only when explicitly triggered by a user or maintainer. Zero automated web crawling.
7. **Zero Ingestion on User Visits:** User visits are 100% read-only. Ingestion is triggered exclusively by maintainers via CLI scripts.
8. **Client-Side Credential Safety:** `SUPABASE_SERVICE_ROLE_KEY` is strictly confined to server-side scripts; client-side code interacts via API proxies or the public anon key.
9. **Zero New Paid Infrastructure:** No external SaaS dependencies or paid cloud tiers.
10. **Zero Scheduled Cloud Jobs:** No continuous cron jobs, cloud triggers, or background daemons.

### 21.3 Database Optimization Migration
Migration `supabase/migrations/20261022000009_phase14_resource_and_performance_optimization.sql` establishes performance indexes:
- `idx_donations_amount_desc` on `donations(amount DESC)`
- `idx_donations_person_date_desc` on `donations(donor_person_id, donation_date DESC)`
- `idx_donations_funding_date_desc` on `donations(funding_source_type, donation_date DESC)`
- `idx_people_country` on `people(country) WHERE country IS NOT NULL`
- `idx_people_industry` on `people(industry) WHERE industry IS NOT NULL`
- `idx_people_giving_pledge` on `people(giving_pledge)`

### 21.4 Resource Capacity Summary
- Current Database Footprint: **~2.8 MB (< 1% of 500 MB limit)**
- Headroom: **178x database capacity remaining**
- Outbound Data Egress: **~60–250 MB / month at 10k visits (3–12.5% of 2 GB limit)**
- Detailed audit documentation: [`docs/free-tier-audit.md`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/docs/free-tier-audit.md)

---

## 22. Dataset Unification Across Basic and Advanced Modes

### 22.1 Canonical Dataset as Single Source of Truth
Historically, Basic Mode relied on `public/js/data.js` while Advanced Mode queried Supabase PostgreSQL. This risk of divergence is eliminated by unifying both modes under the canonical Supabase dataset:
1. **Canonical Public API (`GET /api/billionaires`):** Powered by `server/data-access.js` (`getCanonicalBillionaires`), querying `v_person_giving_summary` and `v_donations_with_parity`. Returns canonical net worth, verified peak donation percentage, and personal parity equivalent.
2. **Preserved Basic Mode UX:** Basic Mode retains its fast, playful "Pick billionaire → see donation → see ridiculous comparison" experience. Advanced database mechanics remain behind progressive disclosure.
3. **Bundled Verified Offline Snapshot:** `public/js/data.js` is generated directly from the canonical dataset via `scripts/generate-offline-snapshot.js`. It is not an independently maintained second dataset.
4. **Resilient Offline Fallback & Status Badging:** If Supabase is offline or unconfigured, the application gracefully loads the verified snapshot and displays a subtle status badge (`#dataSourceBadge`) indicating whether data is live or from the verified offline snapshot.
5. **Exact Data Parity:** Both modes share identical facts for people, wealth, donations, dates, amounts, and currencies.
6. **Zero Performance Overhead:** Backed by 1-hour in-memory cache TTL (`appCache`). Zero polling, zero per-visitor database writes, and zero new infrastructure.




