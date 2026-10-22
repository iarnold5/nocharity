/**
 * NoCharity Advanced Mode — Phase 10: Modernized Model Context Protocol (MCP) Server
 * 
 * Central Architectural Principles:
 * 1. Data Source Decoupling: Primary data comes from Supabase PostgreSQL via the unified
 *    Advanced Mode data access layer rather than directly hard-coded in public/js/data.js.
 * 2. Seamless Legacy & Development Fallback: INITIAL_BILLIONAIRES is retained strictly as
 *    a fallback, development seed data, and backwards-compatibility mechanism.
 * 3. Zero Logic Duplication: Parity, ratios, and sacrifice metrics leverage the exact same
 *    historical wealth-aware calculation engine as the web application.
 * 4. Funding Source Isolation: Explicitly distinguishes PERSONAL, FOUNDATION, CORPORATE,
 *    DAF, and PLEDGE. Defaults to personal giving and strictly prevents silent inclusion of
 *    corporate or foundation disbursements in personal sacrifice calculations.
 * 5. Backwards Compatibility: Preserves legacy tools (search_billionaire_news, calculate_donation_parity,
 *    get_billionaires_list, calculate_historical_donation_parity) and module exports.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Legacy data retained ONLY as fallback, seed data, and compatibility mechanism
import { INITIAL_BILLIONAIRES } from './public/js/data.js';

// Unified Advanced Mode Data Access Layer & Parity Engine
import {
  isConfigured,
  getPeople,
  getPersonById,
  getBillionaireProfile,
  getWealthHistory,
  getDonations,
  getDonationById,
  getSourcesForDonation,
  getPersonOrganizations,
  getPersonGivingSummary,
  calculateHistoricalParity,
  calculateHistoricalDonationParity,
  compareBillionairesParity,
  findClosestHistoricalWealthSnapshot,
  classifySnapshotQuality,
  QUALITY_TIERS,
  QUALITY_METADATA
} from './server/supabase.js';

import {
  isPersonalParityEligible,
  FUNDING_SOURCE_TYPES,
  DONATION_STATUSES,
  FUNDING_SOURCE_METADATA,
  STATUS_METADATA
} from './server/parity-engine.js';

import {
  discoverDonationsFromNews,
  extractDiscoveredDonation,
  DISCOVERY_LABEL,
  DISCOVERY_STATUS
} from './server/discovery-engine.js';

import {
  evaluateEightQuestions,
  validateDonationQuality,
  checkTemporalWealthConsistency,
  checkSourceDiscrepancies,
  computeDataQualityScore,
  EIGHT_QUESTIONS,
  QUALITY_GRADES
} from './server/data-quality.js';
import { appCache } from './server/cache.js';

// Preserved exports for legacy imports & compatibility
export const BILLIONAIRES_DATA = INITIAL_BILLIONAIRES;
export {
  INITIAL_BILLIONAIRES,
  calculateHistoricalDonationParity,
  findClosestHistoricalWealthSnapshot,
  classifySnapshotQuality,
  QUALITY_TIERS,
  QUALITY_METADATA,
  discoverDonationsFromNews,
  extractDiscoveredDonation,
  DISCOVERY_LABEL,
  DISCOVERY_STATUS,
  evaluateEightQuestions,
  validateDonationQuality,
  checkTemporalWealthConsistency,
  checkSourceDiscrepancies,
  computeDataQualityScore,
  EIGHT_QUESTIONS,
  QUALITY_GRADES
};

// =============================================================================
// OFFLINE / DEVELOPMENT FALLBACK ADAPTER
// Guarantees MCP functionality in clean development environments without Supabase credentials
// =============================================================================

function fallbackFilterPeople(args = {}) {
  let list = [...INITIAL_BILLIONAIRES];

  if (args.query) {
    const q = args.query.toLowerCase();
    list = list.filter(b => 
      b.name.toLowerCase().includes(q) || 
      (b.company && b.company.toLowerCase().includes(q)) ||
      (b.summary && b.summary.toLowerCase().includes(q))
    );
  }

  if (args.country && args.country !== 'all') {
    list = list.filter(b => b.country && b.country.toLowerCase().includes(args.country.toLowerCase()));
  }

  if (args.industry && args.industry !== 'all') {
    list = list.filter(b => b.industry && b.industry.toLowerCase().includes(args.industry.toLowerCase()));
  }

  if (args.minNetWorth !== undefined && args.minNetWorth !== null) {
    list = list.filter(b => b.netWorth >= Number(args.minNetWorth));
  }

  if (args.maxNetWorth !== undefined && args.maxNetWorth !== null) {
    list = list.filter(b => b.netWorth <= Number(args.maxNetWorth));
  }

  if (args.givingPledge !== undefined && args.givingPledge !== null) {
    const isPledge = args.givingPledge === true || args.givingPledge === 'true';
    list = list.filter(b => Boolean(b.givingPledge) === isPledge);
  }

  // Sorting
  const isAsc = String(args.sortOrder).toLowerCase() === 'asc';
  if (args.sortBy === 'net_worth') {
    list.sort((a, b) => isAsc ? a.netWorth - b.netWorth : b.netWorth - a.netWorth);
  } else if (args.sortBy === 'name') {
    list.sort((a, b) => isAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));
  }

  const offset = Math.max(0, parseInt(args.offset, 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(args.limit, 10) || 20));
  const paged = list.slice(offset, offset + limit);

  return {
    source: 'legacy_fallback',
    totalCount: list.length,
    limit,
    offset,
    people: paged.map(b => ({
      person_id: b.id,
      id: b.id,
      canonical_name: b.name,
      country: b.country,
      industry: b.industry,
      occupation: b.tagline || 'Philanthropist',
      is_billionaire: true,
      giving_pledge: Boolean(b.givingPledge),
      latest_net_worth: b.netWorth,
      latest_snapshot_date: b.netWorthDate || '2026-01-01',
      wealth_currency: 'USD',
      source_name: b.netWorthSourceName || 'Bloomberg Billionaires Index'
    }))
  };
}

function fallbackGetPerson(idOrSlug) {
  if (!idOrSlug) return null;
  const normalized = String(idOrSlug).toLowerCase().trim();
  const b = INITIAL_BILLIONAIRES.find(item => 
    item.id.toLowerCase() === normalized || 
    item.name.toLowerCase() === normalized ||
    item.name.toLowerCase().replace(/\s+/g, '-') === normalized
  );

  if (!b) return null;

  const donations = (b.historicalDonations || []).map((d, idx) => ({
    id: `legacy-don-${b.id}-${idx}`,
    donation_date: d.date || `${d.year}-06-01`,
    amount: d.amount,
    recipient: d.cause,
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    historical_net_worth: b.netWorth,
    source_publisher: d.source || 'Public Disclosures',
    source_url: d.url || null
  }));

  const snapshots = b.historicalWealthSnapshots || [
    {
      snapshot_date: b.netWorthDate || '2026-01-01',
      net_worth: b.netWorth,
      currency: 'USD',
      source_name: b.netWorthSourceName || 'Bloomberg Billionaires Index'
    }
  ];

  const totalGiving = donations.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return {
    source: 'legacy_fallback',
    person_id: b.id,
    id: b.id,
    canonical_name: b.name,
    country: b.country,
    industry: b.industry,
    occupation: b.tagline || 'Philanthropist',
    description: b.summary || 'Biographical record.',
    giving_pledge: Boolean(b.givingPledge),
    latest_net_worth: b.netWorth,
    latest_snapshot_date: b.netWorthDate || '2026-01-01',
    latest_wealth_source_name: b.netWorthSourceName || 'Bloomberg Billionaires Index',
    personal_giving_metrics: {
      lifetime_personal_giving: totalGiving,
      qualifying_donations_count: donations.length,
      largest_donation: donations.length > 0 ? [...donations].sort((x, y) => y.amount - x.amount)[0] : null,
      latest_donation: donations.length > 0 ? donations[0] : null,
      average_donation: donations.length > 0 ? Math.round(totalGiving / donations.length) : 0,
      giving_as_pct_of_wealth_at_donation: b.netWorth > 0 ? parseFloat(((totalGiving / b.netWorth) * 100).toFixed(2)) : 0
    },
    wealth_history: {
      total_count: snapshots.length,
      snapshots
    },
    personal_donations: donations,
    donations
  };
}

function fallbackGetDonations(args = {}) {
  let all = [];
  INITIAL_BILLIONAIRES.forEach(b => {
    (b.historicalDonations || []).forEach((d, idx) => {
      all.push({
        id: `legacy-don-${b.id}-${idx}`,
        donor_person_id: b.id,
        donor_person_name: b.name,
        donation_date: d.date || `${d.year}-06-01`,
        amount: d.amount,
        recipient: d.cause,
        description: d.headline,
        funding_source_type: 'PERSONAL_DIRECT',
        status: 'VERIFIED',
        historical_net_worth: b.netWorth,
        source_publisher: d.source || 'Public Disclosures',
        source_url: d.url || null
      });
    });
  });

  if (args.billionaireId) {
    const bId = String(args.billionaireId).toLowerCase();
    all = all.filter(d => d.donor_person_id.toLowerCase() === bId || d.donor_person_name.toLowerCase().includes(bId));
  }

  if (args.query) {
    const q = args.query.toLowerCase();
    all = all.filter(d => 
      (d.recipient && d.recipient.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  }

  if (args.minAmount) {
    all = all.filter(d => d.amount >= Number(args.minAmount));
  }

  if (args.maxAmount) {
    all = all.filter(d => d.amount <= Number(args.maxAmount));
  }

  if (args.startDate) {
    all = all.filter(d => d.donation_date >= args.startDate);
  }

  if (args.endDate) {
    all = all.filter(d => d.donation_date <= args.endDate);
  }

  // Funding source filter (Default: personal donations only)
  const isPersonalOnly = !args.includeAssociatedOrgGiving && (!args.fundingSourceType || args.fundingSourceType === 'all' || args.fundingSourceType === 'PERSONAL');
  if (isPersonalOnly) {
    all = all.filter(d => d.funding_source_type === 'PERSONAL_DIRECT' || d.funding_source_type === 'PERSONAL_FUNDS_CONFIRMED');
  }

  const offset = Math.max(0, parseInt(args.offset, 10) || 0);
  const limit = Math.min(100, Math.max(1, parseInt(args.limit, 10) || 20));

  return {
    source: 'legacy_fallback',
    totalCount: all.length,
    limit,
    offset,
    donations: all.slice(offset, offset + limit)
  };
}

// =============================================================================
// LEGACY HELPER FUNCTIONS (PRESERVED FOR BACKWARDS COMPATIBILITY)
// =============================================================================

/**
 * Searches Google News RSS for real-time news regarding a billionaire's donations
 */
export async function searchGoogleNews(billionaireName, timeframe = 'all', startDate = null, endDate = null) {
  const cacheKey = `gnews_${String(billionaireName).toLowerCase()}_${timeframe}_${startDate || ''}_${endDate || ''}`;

  return appCache.wrap(cacheKey, async () => {
    try {
      let query = `${billionaireName} (donation OR donate OR charity OR pledge OR philanthropic)`;
      
      if (timeframe === 'past_month' || timeframe === 'month') {
        query += ' when:30d';
      } else if (timeframe === 'past_year' || timeframe === 'year') {
        query += ' when:1y';
      } else if (timeframe === 'custom' && startDate && endDate) {
        query += ` after:${startDate} before:${endDate}`;
      }

      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Google News RSS returned status ${response.status}`);
      }

      const xml = await response.text();
      const items = [];
      const itemRegex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?(?:<source[^>]*>([\s\S]*?)<\/source>)?[\s\S]*?<\/item>/gi;

      let match;
      let count = 0;
      while ((match = itemRegex.exec(xml)) !== null && count < 10) {
        count++;
        let rawTitle = match[1] || '';
        let link = match[2] || '';
        let pubDate = match[3] || '';
        let rawDesc = match[4] || '';
        let source = match[5] || 'News Outlet';

        const title = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
        const desc = rawDesc.replace(/<[^>]*>?/gm, '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim();

        const amountMatch = title.match(/\$(\d+(?:\.\d+)?)\s*(billion|million|B|M|k)?/i) || desc.match(/\$(\d+(?:\.\d+)?)\s*(billion|million|B|M|k)?/i);
        let detectedAmount = null;
        let detectedAmountStr = null;

        if (amountMatch) {
          const val = parseFloat(amountMatch[1]);
          const unit = (amountMatch[2] || '').toLowerCase();
          if (unit.startsWith('b')) {
            detectedAmount = val * 1_000_000_000;
            detectedAmountStr = `$${val} Billion`;
          } else if (unit.startsWith('m')) {
            detectedAmount = val * 1_000_000;
            detectedAmountStr = `$${val} Million`;
          } else if (unit.startsWith('k')) {
            detectedAmount = val * 1_000;
            detectedAmountStr = `$${val} Thousand`;
          } else {
            detectedAmount = val;
            detectedAmountStr = `$${val}`;
          }
        }

        items.push({
          title,
          link,
          pubDate: new Date(pubDate).toISOString().split('T')[0] || pubDate,
          snippet: desc,
          source: source.replace(/<[^>]*>?/gm, '').trim(),
          detectedAmount,
          detectedAmountStr
        });
      }

      return items;
    } catch (error) {
      console.error('Error fetching Google News:', error.message);
      return [];
    }
  }, 600); // 10 minutes cache
}

/**
 * Legacy Basic Mode parity calculation
 */
export function calculateDonationParity(billionaire, donationAmount, userMonthlyIncome = 4000, currency = '$', mode = 'networth') {
  const netWorth = billionaire.netWorth || 1;
  const annualIncome = billionaire.estimatedAnnualIncome || (netWorth * 0.08);

  let percentage = 0;
  let baseMetricLabel = "Net Worth";

  if (mode === 'income') {
    percentage = (donationAmount / annualIncome) * 100;
    baseMetricLabel = "Estimated Annual Earnings";
  } else {
    percentage = (donationAmount / netWorth) * 100;
    baseMetricLabel = "Total Net Worth";
  }

  const userEquivalentMonthly = userMonthlyIncome * (percentage / 100);
  const userEquivalentAnnual = (userMonthlyIncome * 12) * (percentage / 100);

  return {
    netWorth,
    donationAmount,
    userMonthlyIncome,
    currency,
    mode,
    baseMetricLabel,
    percentage: parseFloat(percentage.toFixed(4)),
    percentageFormatted: percentage >= 0.01 ? `${percentage.toFixed(2)}%` : `${percentage.toFixed(4)}%`,
    userEquivalentMonthly: parseFloat(userEquivalentMonthly.toFixed(2)),
    userEquivalentAnnual: parseFloat(userEquivalentAnnual.toFixed(2)),
  };
}

export function filterDonationsByTimeframe(donations, timeframe, startDate = null, endDate = null) {
  if (!timeframe || timeframe === 'all') return donations;

  const now = new Date();

  return donations.filter(d => {
    if (!d.date) return timeframe === 'all';
    const donationDate = new Date(d.date);

    if (timeframe === 'past_month') {
      const monthAgo = new Date();
      monthAgo.setDate(now.getDate() - 30);
      return donationDate >= monthAgo;
    }
    if (timeframe === 'past_year') {
      const yearAgo = new Date();
      yearAgo.setDate(now.getDate() - 365);
      return donationDate >= yearAgo;
    }
    if (timeframe === 'custom' && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      return donationDate >= start && donationDate <= end;
    }
    return true;
  });
}

// =============================================================================
// MAIN MCP SERVER FACTORY
// =============================================================================

export function createMcpServer() {
  const server = new Server(
    {
      name: "nocharity-mcp",
      version: "2.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 1. Tool Definitions
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // -------------------------------------------------------------------
        // 1. get_person
        // -------------------------------------------------------------------
        {
          name: "get_person",
          description: "Retrieves complete biographical details, latest net worth, Giving Pledge status, and personal giving summary for a specific individual by UUID or slug (e.g. 'warren-buffett', 'bill-gates').",
          inputSchema: {
            type: "object",
            properties: {
              id: { type: "string", description: "Person UUID or kebab-case slug (e.g. 'warren-buffett', 'bill-gates')" }
            },
            required: ["id"],
          },
        },

        // -------------------------------------------------------------------
        // 2. search_people
        // -------------------------------------------------------------------
        {
          name: "search_people",
          description: "Searches and filters tracked billionaires and philanthropists across wealth, country, industry, and giving pledge status.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search query for name, company, or biographical keywords" },
              country: { type: "string", description: "Filter by country (e.g. 'United States', 'India')" },
              industry: { type: "string", description: "Filter by industry (e.g. 'Technology', 'Finance & Investing')" },
              minNetWorth: { type: "number", description: "Minimum documented net worth in USD" },
              maxNetWorth: { type: "number", description: "Maximum documented net worth in USD" },
              givingPledge: { type: "boolean", description: "Filter by Giving Pledge signatory status" },
              limit: { type: "number", description: "Maximum number of results to return (default 20, max 100)" },
              offset: { type: "number", description: "Pagination offset (default 0)" },
              sortBy: { type: "string", enum: ["name", "net_worth", "personal_giving", "giving_ratio"], description: "Sort field" },
              sortOrder: { type: "string", enum: ["asc", "desc"], description: "Sort direction" }
            },
          },
        },

        // -------------------------------------------------------------------
        // 3. get_wealth_history
        // -------------------------------------------------------------------
        {
          name: "get_wealth_history",
          description: "Retrieves chronologically ordered historical wealth snapshots for an individual, including benchmark sources (Bloomberg, Forbes) and confidence tiers without fabricated interpolation.",
          inputSchema: {
            type: "object",
            properties: {
              personId: { type: "string", description: "Person UUID or kebab-case slug" },
              limit: { type: "number", description: "Maximum number of snapshots to return (default 50)" },
              sortOrder: { type: "string", enum: ["asc", "desc"], description: "Chronological sort order (default 'asc')" }
            },
            required: ["personId"],
          },
        },

        // -------------------------------------------------------------------
        // 4. search_donations
        // -------------------------------------------------------------------
        {
          name: "search_donations",
          description: "Searches and filters verified philanthropic donations. By default, returns strictly personal donations (PERSONAL_DIRECT, PERSONAL_FUNDS_CONFIRMED). Does NOT silently include corporate or foundation donations unless includeAssociatedOrgGiving is explicitly set to true.",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Search recipient or cause keywords" },
              billionaireId: { type: "string", description: "Filter by donor person UUID or slug" },
              fundingSourceType: { type: "string", enum: ["all", "PERSONAL", "PERSONAL_DIRECT", "PERSONAL_FUNDS_CONFIRMED", "FOUNDATION", "CORPORATE", "DAF", "PLEDGE", "UNKNOWN_SOURCE"], description: "Funding source attribution classification" },
              status: { type: "string", enum: ["all", "VERIFIED", "PARTIALLY_VERIFIED", "DISPUTED", "UNVERIFIED"], description: "Verification tier" },
              minAmount: { type: "number", description: "Minimum donation amount in USD" },
              maxAmount: { type: "number", description: "Maximum donation amount in USD" },
              startDate: { type: "string", description: "Earliest donation date in YYYY-MM-DD format" },
              endDate: { type: "string", description: "Latest donation date in YYYY-MM-DD format" },
              includeAssociatedOrgGiving: { type: "boolean", description: "Whether to include foundation/corporate disbursements. Defaults to false (personal giving only)." },
              limit: { type: "number", description: "Maximum donations to return (default 20, max 100)" },
              offset: { type: "number", description: "Pagination offset (default 0)" },
              sortBy: { type: "string", enum: ["date", "amount", "percentage", "billionaire", "status"], description: "Sort column" },
              sortOrder: { type: "string", enum: ["desc", "asc"], description: "Sort direction" }
            },
          },
        },

        // -------------------------------------------------------------------
        // 5. get_donation
        // -------------------------------------------------------------------
        {
          name: "get_donation",
          description: "Retrieves a detailed record for a specific donation by ID, including its verified funding source type, verification status, historical net worth at donation date, parity metrics, and citations.",
          inputSchema: {
            type: "object",
            properties: {
              donationId: { type: "string", description: "Donation UUID" }
            },
            required: ["donationId"],
          },
        },

        // -------------------------------------------------------------------
        // 6. get_person_donations
        // -------------------------------------------------------------------
        {
          name: "get_person_donations",
          description: "Retrieves all documented donations associated with a specific individual, clearly isolating personal gifts from associated organization disbursements.",
          inputSchema: {
            type: "object",
            properties: {
              personId: { type: "string", description: "Person UUID or slug" },
              includeAssociatedOrgGiving: { type: "boolean", description: "Whether to include associated foundation and corporate gifts (clearly badged). Defaults to false (personal sacrifice only)." },
              limit: { type: "number", description: "Maximum donations to return (default 50)" },
              offset: { type: "number", description: "Pagination offset (default 0)" }
            },
            required: ["personId"],
          },
        },

        // -------------------------------------------------------------------
        // 7. get_person_giving_summary
        // -------------------------------------------------------------------
        {
          name: "get_person_giving_summary",
          description: "Computes core documented personal giving metrics for an individual: lifetime personal giving total, qualifying gift count, largest donation, latest donation, average donation, and giving as percentage of wealth at donation date. Strictly isolates personal giving from associated organizations.",
          inputSchema: {
            type: "object",
            properties: {
              personId: { type: "string", description: "Person UUID or slug" }
            },
            required: ["personId"],
          },
        },

        // -------------------------------------------------------------------
        // 8. compare_people
        // -------------------------------------------------------------------
        {
          name: "compare_people",
          description: "Calculates side-by-side proportional wealth comparisons across multiple billionaires calibrated to a user's income. Computes equivalent sacrifice based on historical wealth at the time of each gift. Strictly distinguishes proportional comparison from subjective financial pain.",
          inputSchema: {
            type: "object",
            properties: {
              personIds: { type: "array", items: { type: "string" }, description: "Optional list of person UUIDs or slugs to compare. If omitted, compares all tracked billionaires." },
              userIncome: { type: "number", description: "User's personal income amount (default 60000)" },
              incomeFrequency: { type: "string", enum: ["monthly", "annual"], description: "Income frequency interval (default 'monthly')" },
              userCurrency: { type: "string", description: "Display currency symbol (e.g. '₹', '$', '€', '£', default '₹')" },
              displayExchangeRate: { type: "number", description: "Optional display currency multiplier" }
            },
          },
        },

        // -------------------------------------------------------------------
        // 9. calculate_historical_parity
        // -------------------------------------------------------------------
        {
          name: "calculate_historical_parity",
          description: "The core Historical Wealth-Aware Parity calculation engine. Calculates what percentage of documented wealth at the time of a donation was given, and translates that to an everyday earner's income equivalent. Evaluates: 1. person/donation info, 2. donation date, 3. historical wealth, 4. ratio, 5. user equivalent, 6. source provenance. Distinguishes PERSONAL, FOUNDATION, CORPORATE, DAF, and PLEDGE. Defaults to personal donations and rejects non-personal funds from personal parity calculations.",
          inputSchema: {
            type: "object",
            properties: {
              donationId: { type: "string", description: "Optional UUID of an existing database donation record" },
              personId: { type: "string", description: "Optional billionaire person UUID or slug to look up historical wealth snapshots" },
              donationAmount: { type: "number", description: "Donation amount in USD" },
              donationDate: { type: "string", description: "Donation date in YYYY-MM-DD format" },
              historicalNetWorth: { type: "number", description: "Optional explicit historical net worth in USD at time of donation" },
              snapshotDate: { type: "string", description: "Optional date of explicit historical wealth snapshot in YYYY-MM-DD format" },
              fundingSourceType: { type: "string", enum: ["PERSONAL", "PERSONAL_DIRECT", "PERSONAL_FUNDS_CONFIRMED", "FOUNDATION", "CORPORATE", "DAF", "PLEDGE", "UNKNOWN_SOURCE"], description: "Attribution type. Defaults to PERSONAL_DIRECT." },
              status: { type: "string", enum: ["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED", "DISPUTED"], description: "Verification tier. Defaults to VERIFIED." },
              userNetWorth: { type: "number", description: "User's estimated net worth (rough estimate: what you own minus what you owe)" },
              monthlyIncome: { type: "number", description: "User's monthly take-home income (translates wealth sacrifice to paycheck interpretation)" },
              userIncome: { type: "number", description: "Legacy personal income (default 60000)" },
              incomeFrequency: { type: "string", enum: ["monthly", "annual"], description: "Whether userIncome is 'monthly' or 'annual' (default 'monthly')" },
              userCurrency: { type: "string", description: "Display currency symbol (default '₹')" },
              displayExchangeRate: { type: "number", description: "Optional display exchange multiplier" }
            },
          },
        },

        // -------------------------------------------------------------------
        // 10. get_sources
        // -------------------------------------------------------------------
        {
          name: "get_sources",
          description: "Retrieves documented source evidence, citations, regulatory filings (SEC, IRS 990-PF), and news provenance for a specific donation or individual.",
          inputSchema: {
            type: "object",
            properties: {
              donationId: { type: "string", description: "Donation UUID to retrieve citations for" },
              personId: { type: "string", description: "Optional person UUID or slug to retrieve all citations for" }
            },
          },
        },

        // -------------------------------------------------------------------
        // 11. discover_news_donations (Phase 11)
        // -------------------------------------------------------------------
        {
          name: "discover_news_donations",
          description: "Scans Google News RSS as a DISCOVERY mechanism to identify potential billionaire donations. Crucially, news results are NOT authoritative: they are NEVER automatically marked VERIFIED and are NEVER automatically counted as confirmed personal giving. Returns structured candidate records with status 'DISCOVERED', badge 'Potential donation — verification required', detected donor, detected recipient, extracted amount with confidence, and possible funding source.",
          inputSchema: {
            type: "object",
            properties: {
              billionaireName: { type: "string", description: "Billionaire donor name to scan for potential donations" },
              timeframe: { type: "string", enum: ["all", "past_month", "past_year", "custom"], description: "Timeframe filter (default 'all')" },
              startDate: { type: "string", description: "Start date YYYY-MM-DD for custom timeframe" },
              endDate: { type: "string", description: "End date YYYY-MM-DD for custom timeframe" }
            },
            required: ["billionaireName"],
          },
        },

        // -------------------------------------------------------------------
        // 12. validate_donation_quality (Phase 12)
        // -------------------------------------------------------------------
        {
          name: "validate_donation_quality",
          description: "Phase 12 Data Quality & Consistency Layer. Evaluates whether a donation record possesses enough metadata to answer the 8 Essential Questions (WHO, WHAT, WHEN, HOW MUCH, FROM WHOM, TO WHOM, SOURCE, HOW CERTAIN), validates anti-nonsense rules (positive amount, date validity, source for verified, personal/org donor match, pledge non-completion, disputed ranking disqualification, positive wealth, specified currency), performs temporal consistency checks (e.g. 2018 donation vs 2026 snapshot), preserves multi-source disagreements without silently picking one, and returns a 0–100 quality score and Grade (A, B, C, D/Flagged).",
          inputSchema: {
            type: "object",
            properties: {
              donationId: { type: "string", description: "Optional donation UUID to evaluate from database" },
              amount: { type: "number", description: "Donation amount in currency" },
              donationDate: { type: "string", description: "Donation date in YYYY-MM-DD format" },
              currency: { type: "string", description: "Currency symbol or code (e.g. 'USD', '₹')" },
              fundingSourceType: { type: "string", enum: ["PERSONAL_DIRECT", "PERSONAL_FUNDS_CONFIRMED", "FOUNDATION", "CORPORATE", "DAF", "PLEDGE", "UNKNOWN_SOURCE"], description: "Funding source attribution" },
              status: { type: "string", enum: ["VERIFIED", "PARTIALLY_VERIFIED", "UNVERIFIED", "DISCOVERED", "DISPUTED"], description: "Verification tier" },
              donorPersonId: { type: "string", description: "Person donor UUID or name" },
              donorOrgId: { type: "string", description: "Organization donor UUID or name" },
              recipient: { type: "string", description: "Recipient organization, charity, or cause" },
              sourceUrl: { type: "string", description: "Primary source or citation URL" },
              sourcePublisher: { type: "string", description: "Publisher name" },
              snapshotDate: { type: "string", description: "Historical wealth snapshot date for temporal consistency check" },
              historicalNetWorth: { type: "number", description: "Historical net worth at snapshot date" },
              alternativeAmounts: { type: "array", items: { type: "number" }, description: "Alternative amounts reported by differing sources" }
            }
          }
        },

        // -------------------------------------------------------------------
        // BACKWARDS-COMPATIBLE LEGACY TOOLS
        // -------------------------------------------------------------------
        {
          name: "search_billionaire_news",
          description: "Fetches live news articles regarding billionaire donations with timeframe filtering using free Google News RSS.",
          inputSchema: {
            type: "object",
            properties: {
              billionaireName: { type: "string" },
              timeframe: { type: "string", enum: ["all", "past_month", "past_year", "custom"] },
              startDate: { type: "string" },
              endDate: { type: "string" }
            },
            required: ["billionaireName"],
          },
        },
        {
          name: "calculate_donation_parity",
          description: "Calculates what percentage of a billionaire's net worth or income their donation represents, and translates that to personal monthly income parity (legacy basic mode).",
          inputSchema: {
            type: "object",
            properties: {
              billionaireId: { type: "string" },
              donationAmount: { type: "number" },
              userMonthlyIncome: { type: "number" },
              mode: { type: "string", enum: ["networth", "income"] },
              currency: { type: "string" }
            },
            required: ["billionaireId", "donationAmount", "userMonthlyIncome"],
          },
        },
        {
          name: "get_billionaires_list",
          description: "Returns the roster of global and historic billionaires, including traceable net worth source URLs (legacy compatibility).",
          inputSchema: {
            type: "object",
            properties: {
              timeframe: { type: "string" },
            },
          },
        },
        {
          name: "calculate_historical_donation_parity",
          description: "Legacy alias for calculate_historical_parity. Compares a donation against the billionaire's estimated net worth at the time of the donation.",
          inputSchema: {
            type: "object",
            properties: {
              donationAmount: { type: "number", description: "Donation amount in USD" },
              donationDate: { type: "string", description: "Date of donation in YYYY-MM-DD format" },
              billionaireId: { type: "string", description: "Optional billionaire identifier" },
              historicalNetWorth: { type: "number", description: "Optional explicit historical net worth" },
              snapshotDate: { type: "string", description: "Optional snapshot date" },
              userIncome: { type: "number", description: "User's personal income amount" },
              incomeFrequency: { type: "string", enum: ["monthly", "annual"], description: "monthly or annual" },
              userCurrency: { type: "string", description: "Display currency symbol" },
              displayExchangeRate: { type: "number", description: "Optional presentation exchange multiplier" }
            },
            required: ["donationAmount", "donationDate", "userIncome"],
          },
        },
      ],
    };
  });

  // 2. Tool Execution Handlers
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      // ---------------------------------------------------------------------
      // 1. get_person
      // ---------------------------------------------------------------------
      if (name === "get_person") {
        if (!args.id) throw new Error("Missing required argument: 'id'");
        
        let person = null;
        if (isConfigured) {
          try {
            person = await getPersonById(args.id);
          } catch (e) {
            console.error("Supabase getPersonById error:", e.message);
          }
        }

        if (!person) {
          person = fallbackGetPerson(args.id);
        }

        if (!person) {
          return {
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ error: `Person with ID/slug '${args.id}' was not found.` }, null, 2) }]
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(person, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 2. search_people
      // ---------------------------------------------------------------------
      if (name === "search_people") {
        let result = null;
        if (isConfigured) {
          try {
            result = await getPeople({
              search: args.query,
              country: args.country,
              industry: args.industry,
              minNetWorth: args.minNetWorth,
              maxNetWorth: args.maxNetWorth,
              givingPledge: args.givingPledge,
              limit: args.limit,
              offset: args.offset,
              sortBy: args.sortBy,
              sortOrder: args.sortOrder
            });
          } catch (e) {
            console.error("Supabase getPeople error:", e.message);
          }
        }

        if (!result || (result.people && result.people.length === 0 && result.source === 'offline_fallback')) {
          result = fallbackFilterPeople(args);
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 3. get_wealth_history
      // ---------------------------------------------------------------------
      if (name === "get_wealth_history") {
        if (!args.personId) throw new Error("Missing required argument: 'personId'");

        let wealthHistory = null;
        if (isConfigured) {
          try {
            const p = await getPersonById(args.personId);
            if (p) {
              const res = await getWealthHistory(p.person_id || p.id, { limit: args.limit || 50 });
              wealthHistory = {
                source: 'supabase',
                person_id: p.person_id || p.id,
                canonical_name: p.canonical_name,
                count: res.snapshots ? res.snapshots.length : 0,
                totalCount: res.totalCount || 0,
                snapshots: res.snapshots || []
              };
            }
          } catch (e) {
            console.error("Supabase getWealthHistory error:", e.message);
          }
        }

        if (!wealthHistory || wealthHistory.snapshots.length === 0) {
          const fb = fallbackGetPerson(args.personId);
          if (fb && fb.wealth_history) {
            wealthHistory = {
              source: 'legacy_fallback',
              person_id: fb.person_id,
              canonical_name: fb.canonical_name,
              count: fb.wealth_history.snapshots.length,
              totalCount: fb.wealth_history.total_count,
              snapshots: fb.wealth_history.snapshots
            };
          }
        }

        if (!wealthHistory) {
          return {
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ error: `Wealth history for '${args.personId}' not found.` }, null, 2) }]
          };
        }

        if (args.sortOrder === 'desc') {
          wealthHistory.snapshots.sort((a, b) => new Date(b.snapshot_date) - new Date(a.snapshot_date));
        } else {
          wealthHistory.snapshots.sort((a, b) => new Date(a.snapshot_date) - new Date(b.snapshot_date));
        }

        return {
          content: [{ type: "text", text: JSON.stringify(wealthHistory, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 4. search_donations
      // ---------------------------------------------------------------------
      if (name === "search_donations") {
        let result = null;
        if (isConfigured) {
          try {
            let pid = args.billionaireId;
            if (pid && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pid)) {
              const person = await getPersonById(pid);
              if (person) pid = person.person_id || person.id;
            }

            const isPersonalShortHand = args.fundingSourceType === 'PERSONAL';
            result = await getDonations({
              billionaireId: pid,
              fundingSourceType: isPersonalShortHand ? null : args.fundingSourceType,
              countsAsPersonalOnly: isPersonalShortHand || (!args.includeAssociatedOrgGiving && !args.fundingSourceType),
              status: args.status,
              minAmount: args.minAmount,
              maxAmount: args.maxAmount,
              startDate: args.startDate,
              endDate: args.endDate,
              includeAssociatedOrgGiving: Boolean(args.includeAssociatedOrgGiving),
              limit: args.limit,
              offset: args.offset,
              sortBy: args.sortBy,
              sortOrder: args.sortOrder
            });
          } catch (e) {
            console.error("Supabase search_donations error:", e.message);
          }
        }

        if (!result || (result.donations && result.donations.length === 0 && result.source === 'offline_fallback')) {
          result = fallbackGetDonations(args);
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 5. get_donation
      // ---------------------------------------------------------------------
      if (name === "get_donation") {
        const targetId = args.donationId || args.donation_id;
        if (!targetId) throw new Error("Missing required argument: 'donationId'");

        let donation = null;
        if (isConfigured) {
          try {
            donation = await getDonationById(targetId);
          } catch (e) {
            console.error("Supabase getDonationById error:", e.message);
          }
        }

        if (!donation) {
          const fb = fallbackGetDonations();
          donation = fb.donations.find(d => d.id === targetId || d.donation_id === targetId);
        }

        if (!donation) {
          return {
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ error: `Donation with ID '${targetId}' not found.` }, null, 2) }]
          };
        }

        const qualityReport = computeDataQualityScore(donation, {
          snapshotDate: donation.snapshot_date,
          sources: donation.sources || []
        });

        return {
          content: [{ type: "text", text: JSON.stringify({ ...donation, data_quality: qualityReport }, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 6. get_person_donations
      // ---------------------------------------------------------------------
      if (name === "get_person_donations") {
        if (!args.personId) throw new Error("Missing required argument: 'personId'");

        let result = null;
        if (isConfigured) {
          try {
            let pid = args.personId;
            const person = await getPersonById(pid);
            if (person) pid = person.person_id || person.id;

            result = await getDonations({
              billionaireId: pid,
              includeAssociatedOrgGiving: Boolean(args.includeAssociatedOrgGiving),
              limit: args.limit || 50,
              offset: args.offset || 0
            });
          } catch (e) {
            console.error("Supabase get_person_donations error:", e.message);
          }
        }

        if (!result || (result.donations && result.donations.length === 0 && result.source === 'offline_fallback')) {
          result = fallbackGetDonations({
            billionaireId: args.personId,
            includeAssociatedOrgGiving: Boolean(args.includeAssociatedOrgGiving),
            limit: args.limit,
            offset: args.offset
          });
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 7. get_person_giving_summary
      // ---------------------------------------------------------------------
      if (name === "get_person_giving_summary") {
        if (!args.personId) throw new Error("Missing required argument: 'personId'");

        let summary = null;
        if (isConfigured) {
          try {
            const profile = await getPersonById(args.personId);
            if (profile) {
              summary = {
                source: 'supabase',
                person_id: profile.person_id || profile.id,
                canonical_name: profile.canonical_name,
                latest_net_worth: profile.latest_net_worth,
                latest_snapshot_date: profile.latest_snapshot_date,
                giving_pledge: profile.giving_pledge,
                personal_giving_metrics: profile.personal_giving_metrics || {},
                associated_organization_giving: profile.associated_organization_giving || {
                  total_foundation_giving: 0,
                  total_corporate_giving: 0,
                  total_daf_transfers: 0,
                  total_pledges: 0,
                  organizations: []
                }
              };
            }
          } catch (e) {
            console.error("Supabase get_person_giving_summary error:", e.message);
          }
        }

        if (!summary) {
          const fb = fallbackGetPerson(args.personId);
          if (fb) {
            summary = {
              source: 'legacy_fallback',
              person_id: fb.person_id,
              canonical_name: fb.canonical_name,
              latest_net_worth: fb.latest_net_worth,
              latest_snapshot_date: fb.latest_snapshot_date,
              giving_pledge: fb.giving_pledge,
              personal_giving_metrics: fb.personal_giving_metrics,
              associated_organization_giving: {
                total_foundation_giving: 0,
                total_corporate_giving: 0,
                total_daf_transfers: 0,
                total_pledges: 0,
                organizations: []
              }
            };
          }
        }

        if (!summary) {
          return {
            isError: true,
            content: [{ type: "text", text: JSON.stringify({ error: `Person '${args.personId}' not found.` }, null, 2) }]
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(summary, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 8. compare_people
      // ---------------------------------------------------------------------
      if (name === "compare_people") {
        const result = await compareBillionairesParity({
          personIds: args.personIds,
          userIncome: args.userIncome !== undefined ? parseFloat(args.userIncome) : 60000,
          incomeFrequency: args.incomeFrequency || 'monthly',
          userCurrency: args.userCurrency || '₹',
          displayExchangeRate: args.displayExchangeRate ? parseFloat(args.displayExchangeRate) : null
        });

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 9. calculate_historical_parity
      // ---------------------------------------------------------------------
      if (name === "calculate_historical_parity" || name === "calculate_historical_donation_parity") {
        // Enforce Phase 5 Attribution default: PERSONAL_DIRECT
        // Does NOT silently include corporate or foundation donations
        let fundingSource = args.fundingSourceType;
        if (fundingSource === 'PERSONAL') {
          fundingSource = 'PERSONAL_DIRECT';
        }
        // If donationId is not provided, default to PERSONAL_DIRECT
        if (!fundingSource && !args.donationId) {
          fundingSource = 'PERSONAL_DIRECT';
        }
        const defaultStatus = args.status || 'VERIFIED';

        let targetPersonId = args.personId || args.billionaireId;
        let snapshots = null;

        // If personId provided, fetch real snapshots from Supabase or fallback
        if (targetPersonId) {
          if (isConfigured) {
            try {
              const p = await getPersonById(targetPersonId);
              if (p) {
                targetPersonId = p.person_id || p.id;
                const wh = await getWealthHistory(targetPersonId, { limit: 100 });
                snapshots = wh.snapshots || [];
              }
            } catch (e) {
              console.error("Supabase snapshots lookup error:", e.message);
            }
          }

          if (!snapshots || snapshots.length === 0) {
            const fb = fallbackGetPerson(targetPersonId);
            if (fb && fb.wealth_history) {
              snapshots = fb.wealth_history.snapshots;
            }
          }
        }

        // Run through the exact same Calculation Engine as Advanced Mode
        const result = await calculateHistoricalParity({
          donationId: args.donationId,
          personId: targetPersonId,
          donationAmount: args.donationAmount !== undefined ? parseFloat(args.donationAmount) : undefined,
          donationDate: args.donationDate,
          snapshots,
          historicalNetWorth: args.historicalNetWorth !== undefined ? parseFloat(args.historicalNetWorth) : undefined,
          snapshotDate: args.snapshotDate,
          fundingSourceType: fundingSource,
          status: defaultStatus,
          userNetWorth: args.userNetWorth !== undefined ? args.userNetWorth : args.user_net_worth,
          monthlyIncome: args.monthlyIncome !== undefined ? args.monthlyIncome : args.userMonthlyIncome,
          userIncome: args.userIncome !== undefined ? parseFloat(args.userIncome) : undefined,
          incomeFrequency: args.incomeFrequency || 'monthly',
          userCurrency: args.userCurrency || args.currency || '₹',
          displayExchangeRate: args.displayExchangeRate ? parseFloat(args.displayExchangeRate) : null
        });

        // Step 6: Return source/provenance information and Phase 9 statements
        let citations = [];
        const donationTargetId = args.donationId || result.donationId;
        if (donationTargetId && isConfigured) {
          try {
            citations = await getSourcesForDonation(donationTargetId);
          } catch (e) {
            // ignore
          }
        }
        if (citations.length === 0 && (donationTargetId || targetPersonId)) {
          const fb = fallbackGetDonations({ billionaireId: targetPersonId });
          const match = donationTargetId ? fb.donations.filter(d => d.id === donationTargetId) : fb.donations;
          match.forEach(d => {
            if (d.source_url) {
              citations.push({
                publisher: d.source_publisher || 'Public Source',
                title: d.description || 'Public Document',
                url: d.source_url,
                source_type: 'PRIMARY'
              });
            }
          });
        }

        const enrichedResult = {
          ...result,
          provenance: {
            wealthSource: result.sourceName || 'Historical Wealth Index',
            snapshotDate: result.snapshotDate,
            qualityTier: result.quality,
            qualityDescription: result.qualityMetadata?.description || null,
            fundingSourceType: result.fundingSourceType,
            fundingSourceCategory: result.fundingSourceMetadata?.category || (isPersonalParityEligible(result.fundingSourceType).isEligible ? 'PERSONAL' : 'ORGANIZATION'),
            isPersonalParityEligible: result.isEligible,
            verificationStatus: result.status,
            sources: citations
          },
          statements: {
            percentageStatement: result.isAvailable ? `They gave approximately ${result.formattedRatio} of their documented wealth at the time.` : null,
            equivalentStatement: result.isAvailable ? `For an income of ${result.userCurrency}${Number(result.userIncome).toLocaleString()}/${result.incomeFrequency === 'annual' ? 'year' : 'month'}, that is equivalent to ${result.formattedUserEquivalent}.` : null,
            comparisonType: "Proportional wealth comparison",
            nuanceNotice: "Proportional wealth comparison based on documented wealth at donation date. This is an illustration of relative proportional scale, not an assertion of identical subjective financial sacrifice."
          }
        };

        return {
          content: [{ type: "text", text: JSON.stringify(enrichedResult, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 10. get_sources
      // ---------------------------------------------------------------------
      if (name === "get_sources") {
        let sources = [];

        if (args.donationId && isConfigured) {
          try {
            sources = await getSourcesForDonation(args.donationId);
          } catch (e) {
            console.error("Supabase getSourcesForDonation error:", e.message);
          }
        }

        if (sources.length === 0 && args.personId && isConfigured) {
          try {
            const p = await getPersonById(args.personId);
            if (p && p.donations) {
              p.donations.forEach(d => {
                if (d.source_url) {
                  sources.push({
                    publisher: d.source_publisher || 'Primary Public Source',
                    title: d.source_title || 'Regulatory Filing',
                    url: d.source_url,
                    source_type: d.source_tier || 'PRIMARY'
                  });
                }
              });
            }
          } catch (e) {
            console.error("Supabase person sources error:", e.message);
          }
        }

        // Fallback citations
        if (sources.length === 0 && (args.donationId || args.personId)) {
          const fb = fallbackGetDonations({ billionaireId: args.personId });
          const match = args.donationId ? fb.donations.filter(d => d.id === args.donationId) : fb.donations;
          match.forEach(d => {
            if (d.source_url) {
              sources.push({
                publisher: d.source_publisher || 'Public Source',
                title: d.description || 'Public Document',
                url: d.source_url,
                source_type: 'PRIMARY'
              });
            }
          });
        }

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              donationId: args.donationId || null,
              personId: args.personId || null,
              count: sources.length,
              sources
            }, null, 2)
          }]
        };
      }

      // ---------------------------------------------------------------------
      // 11. discover_news_donations (Phase 11)
      // ---------------------------------------------------------------------
      if (name === "discover_news_donations") {
        if (!args.billionaireName) throw new Error("Missing required argument: 'billionaireName'");
        const result = await discoverDonationsFromNews(args.billionaireName, {
          timeframe: args.timeframe || 'all',
          startDate: args.startDate,
          endDate: args.endDate
        });
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // 12. validate_donation_quality (Phase 12)
      // ---------------------------------------------------------------------
      if (name === "validate_donation_quality") {
        let donation = args.donation ? { ...args.donation } : { ...args };
        const donId = args.donationId || args.donation_id || donation.id || donation.donation_id;
        if (donId && isConfigured) {
          try {
            const fetched = await getDonationById(donId);
            if (fetched) donation = { ...fetched, ...donation };
          } catch (e) {
            // ignore
          }
        } else if (donId) {
          const fb = fallbackGetDonations();
          const match = fb.donations.find(d => d.id === donId || d.donation_id === donId);
          if (match) donation = { ...match, ...donation };
        }

        const report = computeDataQualityScore(donation, {
          snapshotDate: args.snapshotDate || args.wealthSnapshot?.snapshot_date || donation.snapshot_date,
          wealthSnapshot: args.wealthSnapshot || donation.historical_wealth,
          sources: donation.sources || []
        });

        return {
          content: [{ type: "text", text: JSON.stringify(report, null, 2) }]
        };
      }

      // ---------------------------------------------------------------------
      // BACKWARDS-COMPATIBLE LEGACY TOOLS
      // ---------------------------------------------------------------------
      if (name === "search_billionaire_news") {
        const articles = await searchGoogleNews(args.billionaireName, args.timeframe || 'all', args.startDate, args.endDate);
        return {
          content: [{ type: "text", text: JSON.stringify({ billionaire: args.billionaireName, articles }, null, 2) }],
        };
      }

      if (name === "calculate_donation_parity") {
        const billionaire = BILLIONAIRES_DATA.find(b => b.id === args.billionaireId) || BILLIONAIRES_DATA[0];
        const result = calculateDonationParity(billionaire, args.donationAmount, args.userMonthlyIncome, args.currency || '$', args.mode || 'networth');
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      if (name === "get_billionaires_list") {
        let peopleList = null;
        if (isConfigured) {
          try {
            const res = await getPeople({ limit: 100 });
            if (res && res.people && res.people.length > 0) {
              peopleList = res.people.map(p => ({
                id: p.person_id || p.id,
                name: p.canonical_name,
                country: p.country,
                industry: p.industry,
                netWorth: p.latest_net_worth,
                netWorthDate: p.latest_snapshot_date,
                netWorthSourceName: p.wealth_currency || 'USD',
                givingPledge: p.giving_pledge,
                totalPersonalGiving: p.total_personal_giving
              }));
            }
          } catch (e) {
            console.error("Supabase get_billionaires_list error:", e.message);
          }
        }

        if (!peopleList) {
          peopleList = BILLIONAIRES_DATA;
        }

        return {
          content: [{ type: "text", text: JSON.stringify(peopleList, null, 2) }],
        };
      }

      throw new Error(`Tool not found: ${name}`);
    } catch (err) {
      return {
        isError: true,
        content: [{ type: "text", text: JSON.stringify({ error: err.message }, null, 2) }]
      };
    }
  });

  return server;
}

if (process.argv[1] && process.argv[1].endsWith('mcp-server.js')) {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("NoCharity Advanced Mode MCP Server running on stdio");
}
