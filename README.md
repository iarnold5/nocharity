# ⚖️ NoCharity — Billionaire Philanthropy & Reality Check Platform

> A dual-mode open-source web application and Model Context Protocol (MCP) server that brings truthful perspective to billionaire philanthropy. Compare billionaire giving ratios against everyday household budgets using verified historical net worth and regulatory disclosures.

---

## 🏛️ Dual-Mode Architecture

NoCharity operates with a strict dual-mode model to preserve simplicity and prevent breaking changes:

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
  │ • Hardcoded public/js/data.js   │         │ • Attribution taxonomy          │
  │ • 100% Client-side state        │         │ • Primary regulatory sources    │
  │ • Zero database required        │         │ • Supabase PostgreSQL store     │
  │ • Live Google News RSS scan     │         │ • Donation & Person Explorers   │
  │ • 100% backwards-compatible     │         │ • Verified leaderboards/rankings│
  └─────────────────────────────────┘         └─────────────────────────────────┘
```

1. **Basic Meme Mode (`/`):** Instant, zero-friction Gianmarco Soresi-style calculator comparing billionaire net worth percentages to your monthly take-home pay. Runs anywhere with zero configuration.
2. **Advanced Mode (`/advanced`):** Backed by Supabase PostgreSQL, separating personal gifts from foundation/corporate disbursements, pairing gifts with dated historical wealth snapshots, and enforcing a strict 8-question data quality audit.
3. **Settings Toggle:** Switch between modes seamlessly via the Settings modal (⚙️) on the top bar or dedicated buttons. Users are never forced into Advanced Mode.

---

## 🔬 Core Principles & Methodological Boundaries

1. **Documented Giving vs. Real-World Giving:** NoCharity indexes **publicly documented qualifying donations**, not all philanthropy. Figures represent documented minimums from public records, not total real-world giving. Rankings must never be interpreted as proof that an individual with fewer public records gave less in reality.
2. **Attribution Taxonomy:** Only `PERSONAL_DIRECT` and `PERSONAL_FUNDS_CONFIRMED` count toward individual generosity calculations. Foundation disbursements (`FOUNDATION`), corporate treasury giving (`CORPORATE`), and donor-advised fund transfers (`DAF`) are categorized as separate organizational context.
3. **Historical Wealth Parity (No Future Snapshots):** A donation is compared against the billionaire's estimated wealth **at the time of the donation** (`snapshot_date <= donation_date`). Future snapshots are strictly rejected. Denominators older than 3 years are marked `UNAVAILABLE`.
   $$\text{Historical Percentage} = \left(\frac{\text{Donation Amount at Date } T}{\text{Historical Wealth at or before Date } T}\right) \times 100$$
4. **No Cumulative "Lifetime Giving Ratio":** Cumulative historical donations cannot validly share one current or latest wealth denominator. NoCharity uses **Peak Donation / Wealth** or dated historical percentages rather than invalid lifetime ratios.
5. **Pledges & Disputes Excluded:** Non-binding commitments (`PLEDGE`) and contested claims (`DISPUTED`) are strictly quarantined and never count toward completed personal giving or default rankings.
6. **Source Hierarchy:** Records follow a strict 3-tier hierarchy:
   - **Tier 1: Primary Regulatory** (SEC Form 4, IRS Form 990-PF, foundation charters, deeds)
   - **Tier 2: Reputable Secondary Reporting** (Reuters, Bloomberg, AP, ProPublica investigative reporting)
   - **Tier 3: Discovery / Unverified** (Google News RSS candidates requiring maintainer review)
7. **Historical Figures (Nominal Historical USD):** For historical titans like Andrew Carnegie ($350M net worth in 1901) and John D. Rockefeller ($900M in 1913), values are recorded strictly in **nominal historical USD**. Arbitrary inflation multipliers are forbidden.
8. **Maintainer Authorization:** Dataset mutations (`POST /api/advanced/discover/verify`) require maintainer token authorization (`MAINTAINER_TOKEN`). The authoritative mutation workflow is the local CLI: `node scripts/review-discovery.js`. Public web visits are 100% read-only.
9. **Graceful Degradation:** If Supabase is offline or unconfigured, Advanced Mode falls back to a verified offline snapshot with clear notices.

---

## 🤖 Model Context Protocol (MCP) Server

NoCharity includes a standard **Model Context Protocol (MCP)** server ([`mcp-server.js`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/mcp-server.js)) running over standard I/O (`stdio`).

### MCP Tools Roster (16 Tools)

| Tool Name | Type | Description |
| :--- | :--- | :--- |
| `get_person` | Database | Retrieve canonical profile, wealth, and giving summary by name or ID. |
| `search_people` | Database | Search billionaires by query, country, industry, or giving pledge status. |
| `get_wealth_history` | Database | Multi-year historical net worth snapshots with citations. |
| `search_donations` | Database | Filter donations by donor, recipient, cause, funding source, or status. |
| `get_donation` | Database | Fetch full metadata for a specific donation ID. |
| `get_person_donations` | Database | Retrieve all documented donations for a specific individual. |
| `get_person_giving_summary`| Database | Aggregated personal vs foundation vs corporate giving breakdown. |
| `compare_people` | Database | Compare multiple billionaires side-by-side on verified metrics. |
| `calculate_historical_parity` | Engine | Compute parity between a donation, historical wealth, and user income. |
| `get_sources` | Database | Primary regulatory filings and media citations for a donation. |
| `discover_news_donations` | Discovery | Scan Google News RSS for candidate donations (flags unverified). |
| `validate_donation_quality` | Quality | Evaluate a donation against the 8 Questions and invariant rules. |
| `search_billionaire_news` | Legacy | Query Google News RSS for headlines and extracted figures. |
| `calculate_donation_parity` | Legacy | Basic mode parity calculator against current net worth. |
| `get_billionaires_list` | Legacy | List tracked billionaires with legacy structure. |
| `calculate_historical_donation_parity` | Legacy | Backwards-compatible historical parity calculation tool. |

### Connecting to AI Clients (Claude Desktop / Antigravity)

Add to your `mcp_config.json`:
```json
{
  "mcpServers": {
    "nocharity": {
      "command": "node",
      "args": ["<PATH_TO_REPO>/mcp-server.js"]
    }
  }
}
```

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional for Advanced Mode)
Basic Mode runs without any configuration. To enable live Supabase data in Advanced Mode:
```bash
cp .env.example .env
# Edit .env and set SUPABASE_URL and SUPABASE_ANON_KEY
```

### 3. Run Web Application
```bash
npm start
# Server listens at http://localhost:3000
```
- Open `http://localhost:3000` for Basic Mode.
- Open `http://localhost:3000/advanced` for Advanced Mode.
- Open `http://localhost:3000/methodology` for the transparent research methodology.

### 4. Available NPM Scripts
```bash
npm start              # Start production server
npm run dev            # Start development server with file watch
npm run mcp            # Start MCP server via stdio
npm test               # Run all automated test suites (269 tests across 15 suites)
npm run test:audit     # Run resource & performance audit tests
npm run test:integration # Run full integration and regression test suite
npm run seed           # Seed high-quality Phase 13 dataset (--dry-run or --commit)
npm run review         # Run interactive CLI discovery review queue
npm run ingest         # Run discovery ingestion pipeline
```

---

## 🗄️ Database Architecture & Migrations

All schema definitions, functions, views, and security configurations are managed via idempotent SQL migrations in [`supabase/migrations/`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/supabase/migrations):

1. `20261021000001_phase1_core_schema.sql` — Core tables (`people`, `organizations`, `sources`, `wealth_snapshots`, `donations`, etc.).
2. `20261021000002_phase1_seed_data.sql` — Initial schema seed data.
3. `20261021000003_phase2_views_and_functions.sql` — Views (`v_donations_with_parity`, `v_person_giving_summary`).
4. `20261021000004_phase3_historical_parity.sql` — Historical snapshot matching procedures.
5. `20261021000005_phase5_classification_verification.sql` — Attribution classification and verification statuses.
6. `20261022000006_phase6_advanced_mode_views_and_seed.sql` — Advanced Mode dashboard views.
7. `20261022000007_phase8_rankings_and_donation_explorer.sql` — Leaderboard and explorer composite views.
8. `20261022000008_phase13_high_quality_seed.sql` — 25 verified billionaires, 46 organizations, 131 snapshots, 68 donations, 1 disputed test fixture.
9. `20261022000009_phase14_resource_and_performance_optimization.sql` — Performance B-Tree and partial indexes.
10. `20261022000010_remediation_views_and_functions.sql` — Eliminates invalid cumulative lifetime ratio, enforces `snapshot_date <= donation_date`, and establishes Peak Donation / Wealth ranking.
11. `20261022000011_security_hardening_and_least_privilege.sql` — Zero Supabase Security Advisor lints: enables `security_invoker = true` on all 4 public views, pins `search_path = ''` on all functions, revokes write permissions on tables/views from `anon` and `authenticated`, and restricts maintenance procedures.

---

## 🔒 Security & Supabase Least Privilege (Zero Findings)

NoCharity enforces strict defense-in-depth security audited via the Supabase Security Advisor (0 errors, 0 warnings):
- **Security-Invoker Views:** Public read views (`v_donations_with_parity`, `v_person_giving_summary`, `v_person_rankings`, `v_advanced_dashboard_metrics`) run with `security_invoker = true`. Anonymous visitors query underlying tables strictly according to active Row-Level Security (RLS) policies.
- **Immutable Search Paths:** All database functions (`get_closest_net_worth`, `get_historical_snapshot_details`, `get_sources_for_donation`) run with `SET search_path = ''` and schema-qualified references, preventing search path hijacking.
- **Read-Only Public Surface:** Modifying privileges (`INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`) are revoked from `anon`, `authenticated`, and `public`. Public visitors cannot mutate data.
- **Maintenance Procedure Isolation:** Administrative, test, and DDL functions (`rls_auto_enable`, `fn_clean_tables`, `test_cleanup`) have execution revoked from `PUBLIC`, `anon`, and `authenticated`.

---

## 🌿 Free-Tier & Resource Considerations

NoCharity is engineered to operate at **$0.00/month** on developer free tiers:
- **Database Size:** ~3.0 MB total footprint (< 1% of Supabase 500 MB limit).
- **Outbound Egress:** Bounded LRU in-memory caching (`server/cache.js`) reduces monthly bandwidth to < 100 MB at 10k visits.
- **Connection Safety:** Max pooled connections ≤ 5 (Supavisor pool limit is 60).
- **Zero Polling & Zero Visit Ingestion:** No continuous `setInterval` polling loops; user visits are 100% read-only.
- **Detailed Audit Documentation:** [`docs/free-tier-audit.md`](file:///e:/PersonalProjects/ProjectFiles/AI%20Slop/nocharity/docs/free-tier-audit.md).

---

## 📄 License

MIT Open Source License. Built for public transparency and civic education.
