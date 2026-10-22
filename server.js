/**
 * Main Web Application Server
 * Serves the modern frontend and exposes REST / SSE endpoints
 * backed by the Billionaire Philanthropy MCP Server tools.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  BILLIONAIRES_DATA,
  searchGoogleNews,
  calculateDonationParity,
  filterDonationsByTimeframe
} from './mcp-server.js';
import {
  getSupabaseStatus,
  getPeople,
  getPersonById,
  getWealthHistory,
  getDonations,
  getDonationById,
  getSourcesForDonation,
  getPersonOrganizations,
  getPersonGivingSummary,
  getRankings,
  getTags,
  getDashboardMetrics,
  getAdvancedOrganizations,
  getAdvancedPeople,
  getAdvancedBillionaires,
  getAdvancedDonations,
  calculateHistoricalParity,
  compareBillionairesParity
} from './server/supabase.js';
import {
  discoverDonationsFromNews,
  DISCOVERY_LABEL,
  DISCOVERY_STATUS
} from './server/discovery-engine.js';
import { reviewAndVerifyCandidate } from './scripts/review-discovery.js';
import {
  computeDataQualityScore,
  validateDonationQuality,
  evaluateEightQuestions,
  checkTemporalWealthConsistency,
  checkSourceDiscrepancies
} from './server/data-quality.js';
import {
  PHASE13_BILLIONAIRES,
  DATA_QUALITY_STATUS
} from './server/phase13-dataset.js';
import {
  appCache,
  FREE_TIER_LIMITS
} from './server/cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * GET /api/billionaires
 * Returns list of billionaires with donation totals calculated for the requested timeframe
 */
app.get('/api/billionaires', (req, res) => {
  const timeframe = req.query.timeframe || 'all';
  const startDate = req.query.startDate;
  const endDate = req.query.endDate;
  const monthlyIncome = parseFloat(req.query.monthlyIncome) || 4000;
  const currency = req.query.currency || '$';
  const mode = req.query.mode || 'networth';

  const processed = BILLIONAIRES_DATA.map(b => {
    const filteredDonations = filterDonationsByTimeframe(b.historicalDonations, timeframe, startDate, endDate);
    const totalDonatedInPeriod = filteredDonations.reduce((acc, curr) => acc + curr.amount, 0);
    const parity = calculateDonationParity(b, totalDonatedInPeriod, monthlyIncome, currency, mode);

    return {
      id: b.id,
      name: b.name,
      company: b.company,
      country: b.country,
      industry: b.industry,
      netWorth: b.netWorth,
      netWorthSourceUrl: b.netWorthSourceUrl,
      netWorthSourceName: b.netWorthSourceName,
      image: b.image,
      givingPledge: b.givingPledge,
      forbesPhilanthropyScore: b.forbesPhilanthropyScore,
      tagline: b.tagline,
      summary: b.summary,
      totalDonatedInPeriod,
      percentage: parity.percentage,
      percentageFormatted: parity.percentageFormatted,
      userEquivalentMonthly: parity.userEquivalentMonthly,
      userEquivalentAnnual: parity.userEquivalentAnnual,
      baseMetricLabel: parity.baseMetricLabel,
      donations: filteredDonations
    };
  });

  res.json({
    timeframe,
    startDate,
    endDate,
    monthlyIncome,
    currency,
    mode,
    billionaires: processed,
    totalTrackedWealth: BILLIONAIRES_DATA.reduce((acc, b) => acc + b.netWorth, 0),
    totalDonatedAcrossAll: processed.reduce((acc, b) => acc + b.totalDonatedInPeriod, 0)
  });
});

/**
 * GET /api/news
 * Live news search for a specific billionaire and timeframe via Google News RSS scraper
 */
app.get('/api/news', async (req, res) => {
  const { billionaire, timeframe, startDate, endDate } = req.query;

  if (!billionaire) {
    return res.status(400).json({ error: 'Missing billionaire parameter' });
  }

  try {
    const articles = await searchGoogleNews(billionaire, timeframe || 'all', startDate, endDate);
    res.json({
      billionaire,
      timeframe: timeframe || 'all',
      count: articles.length,
      articles
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * ADVANCED MODE ROUTES (Supabase Integration)
 */

// Advanced Mode HTML entry point
app.get('/advanced', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'advanced.html'));
});

// GET /api/advanced/status - Diagnostic health check for Supabase connection
app.get('/api/advanced/status', async (req, res) => {
  try {
    const status = await getSupabaseStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/dashboard - Documented summary KPI metrics
app.get('/api/advanced/dashboard', async (req, res) => {
  try {
    const data = await getDashboardMetrics();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/people - Paginated list of people with giving totals
app.get('/api/advanced/people', async (req, res) => {
  try {
    const {
      limit,
      offset,
      search,
      country,
      industry,
      minNetWorth,
      maxNetWorth,
      minGiving,
      maxGiving,
      givingPledge,
      isBillionaire,
      sortBy,
      sortOrder,
      tag
    } = req.query;

    const data = await getPeople({
      limit,
      offset,
      search,
      country,
      industry,
      minNetWorth,
      maxNetWorth,
      minGiving,
      maxGiving,
      givingPledge,
      isBillionaire,
      sortBy,
      sortOrder,
      tag
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/people/:id - Person profile, tags, and summary
app.get(['/api/advanced/people/:id', '/api/advanced/people/:id/profile', '/api/advanced/profile/:id'], async (req, res) => {
  try {
    const data = await getPersonById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Person not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/people/:id/wealth - Historical wealth snapshots (immutable)
app.get('/api/advanced/people/:id/wealth', async (req, res) => {
  try {
    const { limit, offset } = req.query;
    const data = await getWealthHistory(req.params.id, { limit, offset });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/people/:id/organizations - Person affiliations and ownerships
app.get('/api/advanced/people/:id/organizations', async (req, res) => {
  try {
    const data = await getPersonOrganizations(req.params.id);
    res.json({ personId: req.params.id, count: data.length, organizations: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/people/:id/summary - Aggregated giving metrics
app.get('/api/advanced/people/:id/summary', async (req, res) => {
  try {
    const data = await getPersonGivingSummary(req.params.id);
    if (!data) return res.status(404).json({ error: 'Person summary not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/donations - Filtered & paginated donations with historical parity
app.get('/api/advanced/donations', async (req, res) => {
  try {
    const {
      personId,
      billionaireId,
      organizationId,
      fundingSourceType,
      attributionType,
      status,
      verificationStatus,
      causeCategory,
      sourceType,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      isIndividualOnly,
      countsAsPersonalOnly,
      includeAssociatedOrgGiving,
      showOrgGiving,
      sortBy,
      sortOrder,
      limit,
      offset
    } = req.query;

    const data = await getDonations({
      personId: personId || billionaireId,
      organizationId,
      fundingSourceType: fundingSourceType || attributionType,
      status: status || verificationStatus,
      causeCategory,
      sourceType,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      countsAsPersonalOnly: countsAsPersonalOnly === 'true' || isIndividualOnly === 'true',
      includeAssociatedOrgGiving: includeAssociatedOrgGiving === 'true' || showOrgGiving === 'true',
      sortBy,
      sortOrder,
      limit,
      offset
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/donations/:id - Single donation with corroborating sources and tags
app.get('/api/advanced/donations/:id', async (req, res) => {
  try {
    const data = await getDonationById(req.params.id);
    if (!data) return res.status(404).json({ error: 'Donation not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/donations/:id/sources - Primary and corroborating sources
app.get('/api/advanced/donations/:id/sources', async (req, res) => {
  try {
    const data = await getSourcesForDonation(req.params.id);
    res.json({ donationId: req.params.id, count: data.length, sources: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/parity/calculate & /api/advanced/parity - Calculate historical wealth-aware parity
app.get(['/api/advanced/parity', '/api/advanced/parity/calculate'], async (req, res) => {
  try {
    const {
      personId,
      billionaireId,
      donationId,
      donationAmount,
      donationDate,
      historicalNetWorth,
      snapshotDate,
      fundingSourceType,
      funding_source_type,
      status,
      verificationStatus,
      userIncome,
      incomeFrequency,
      currency,
      userCurrency,
      displayExchangeRate
    } = req.query;

    const result = await calculateHistoricalParity({
      personId: personId || billionaireId,
      donationId,
      donationAmount: donationAmount !== undefined ? parseFloat(donationAmount) : undefined,
      donationDate,
      historicalNetWorth: historicalNetWorth !== undefined ? parseFloat(historicalNetWorth) : undefined,
      snapshotDate,
      fundingSourceType: fundingSourceType || funding_source_type,
      status: status || verificationStatus,
      userIncome: userIncome !== undefined ? parseFloat(userIncome) : 60000,
      incomeFrequency: incomeFrequency || 'monthly',
      userCurrency: userCurrency || currency || '₹',
      displayExchangeRate: displayExchangeRate ? parseFloat(displayExchangeRate) : null
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advanced/parity/calculate - Calculate historical wealth-aware parity with JSON body
app.post('/api/advanced/parity/calculate', async (req, res) => {
  try {
    const {
      personId,
      billionaireId,
      donationId,
      donationAmount,
      donationDate,
      historicalNetWorth,
      snapshotDate,
      fundingSourceType,
      funding_source_type,
      status,
      verificationStatus,
      userIncome,
      incomeFrequency,
      currency,
      userCurrency,
      displayExchangeRate
    } = req.body || {};

    const result = await calculateHistoricalParity({
      personId: personId || billionaireId,
      donationId,
      donationAmount: donationAmount !== undefined ? parseFloat(donationAmount) : undefined,
      donationDate,
      historicalNetWorth: historicalNetWorth !== undefined ? parseFloat(historicalNetWorth) : undefined,
      snapshotDate,
      fundingSourceType: fundingSourceType || funding_source_type,
      status: status || verificationStatus,
      userIncome: userIncome !== undefined ? parseFloat(userIncome) : 60000,
      incomeFrequency: incomeFrequency || 'monthly',
      userCurrency: userCurrency || currency || '₹',
      displayExchangeRate: displayExchangeRate ? parseFloat(displayExchangeRate) : null
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/parity/compare - Multi-billionaire side-by-side proportional comparison
app.get('/api/advanced/parity/compare', async (req, res) => {
  try {
    const {
      personIds,
      userIncome,
      incomeFrequency,
      currency,
      userCurrency,
      displayExchangeRate
    } = req.query;

    const ids = personIds ? (Array.isArray(personIds) ? personIds : String(personIds).split(',').map(s => s.trim())) : null;

    const data = await compareBillionairesParity({
      personIds: ids,
      userIncome: userIncome !== undefined ? parseFloat(userIncome) : 60000,
      incomeFrequency: incomeFrequency || 'monthly',
      userCurrency: userCurrency || currency || '₹',
      displayExchangeRate: displayExchangeRate ? parseFloat(displayExchangeRate) : null
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advanced/parity/compare - Multi-billionaire side-by-side comparison with JSON body
app.post('/api/advanced/parity/compare', async (req, res) => {
  try {
    const {
      personIds,
      userIncome,
      incomeFrequency,
      currency,
      userCurrency,
      displayExchangeRate
    } = req.body || {};

    const data = await compareBillionairesParity({
      personIds,
      userIncome: userIncome !== undefined ? parseFloat(userIncome) : 60000,
      incomeFrequency: incomeFrequency || 'monthly',
      userCurrency: userCurrency || currency || '₹',
      displayExchangeRate: displayExchangeRate ? parseFloat(displayExchangeRate) : null
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/rankings - Leaderboard pre-computed rankings
app.get('/api/advanced/rankings', async (req, res) => {
  try {
    const { metric, limit, offset } = req.query;
    const data = await getRankings({ metric, limit, offset });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/tags - Reusable classification tags
app.get('/api/advanced/tags', async (req, res) => {
  try {
    const data = await getTags();
    res.json({ count: data.length, tags: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/organizations - Tracked organizations
app.get('/api/advanced/organizations', async (req, res) => {
  try {
    const data = await getAdvancedOrganizations();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/billionaires - Backwards compatibility alias for people
app.get('/api/advanced/billionaires', async (req, res) => {
  try {
    const data = await getPeople(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/discover - Phase 11: News Discovery Mechanism
app.get('/api/advanced/discover', async (req, res) => {
  try {
    const { billionaire, timeframe, startDate, endDate } = req.query;
    if (!billionaire) {
      return res.status(400).json({ error: 'Missing billionaire parameter' });
    }
    const result = await discoverDonationsFromNews(billionaire, {
      timeframe: timeframe || 'all',
      startDate,
      endDate
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/advanced/discover/verify - Protected Maintainer Verification Route
// Authoritative workflow: node scripts/review-discovery.js (CLI)
app.post('/api/advanced/discover/verify', async (req, res) => {
  try {
    const maintainerToken = process.env.MAINTAINER_TOKEN;
    const authHeader = req.headers['authorization'];
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const providedToken = req.headers['x-maintainer-token'] || bearerToken;

    if (!maintainerToken || !providedToken || providedToken !== maintainerToken) {
      return res.status(401).json({
        error: 'Unauthorized: Public dataset mutations are disabled. Maintainers must supply a valid MAINTAINER_TOKEN via X-Maintainer-Token header, or use the authoritative local CLI review workflow: node scripts/review-discovery.js'
      });
    }

    const {
      candidate,
      fundingSourceType,
      status,
      citationUrl,
      citationPublisher,
      citationTitle,
      notes,
      dryRun
    } = req.body;

    if (!candidate) {
      return res.status(400).json({ error: 'Missing candidate record in request body' });
    }

    const result = await reviewAndVerifyCandidate({
      candidate,
      fundingSourceType: fundingSourceType || 'PERSONAL_DIRECT',
      status: status || 'VERIFIED',
      citationUrl,
      citationPublisher,
      citationTitle,
      notes,
      dryRun: Boolean(dryRun)
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /methodology - Dedicated methodology page
app.get('/methodology', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'methodology.html'));
});

// POST /api/advanced/quality/validate - Phase 12: Evaluate donation data quality & consistency
app.post('/api/advanced/quality/validate', (req, res) => {
  try {
    const donation = req.body || {};
    const qualityReport = computeDataQualityScore(donation, {
      snapshotDate: donation.snapshot_date || donation.snapshotDate,
      sources: donation.sources || []
    });
    res.json(qualityReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/seed-dataset - Phase 13: High-Quality Initial Dataset
app.get('/api/advanced/seed-dataset', (req, res) => {
  try {
    const verified = PHASE13_BILLIONAIRES.filter(b => b.data_quality_status === DATA_QUALITY_STATUS.VERIFIED).length;
    const approximate = PHASE13_BILLIONAIRES.filter(b => b.data_quality_status === DATA_QUALITY_STATUS.APPROXIMATE).length;
    const incomplete = PHASE13_BILLIONAIRES.filter(b => b.data_quality_status === DATA_QUALITY_STATUS.INCOMPLETE).length;

    res.json({
      totalCount: PHASE13_BILLIONAIRES.length,
      statusBreakdown: {
        verified,
        approximate,
        incomplete
      },
      billionaires: PHASE13_BILLIONAIRES
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/advanced/resource-audit - Phase 14: Free-Tier Resource & Performance Audit
app.get('/api/advanced/resource-audit', (req, res) => {
  try {
    const cacheStats = appCache.getStats();
    res.json({
      auditStatus: 'HEALTHY',
      timestamp: new Date().toISOString(),
      architecture: FREE_TIER_LIMITS.infrastructure,
      database: FREE_TIER_LIMITS.database,
      pagination: FREE_TIER_LIMITS.paginationStandards,
      cache: cacheStats,
      invariants: {
        allDonationsFetchedAtStartup: false,
        paginationEnforced: true,
        nPlusOneEliminatedViaViews: true,
        staticMetadataCached: true,
        continuousPollingEnabled: false,
        googleNewsOnDemandOnly: true,
        automaticIngestionOnVisit: false,
        clientExposedServiceRole: false,
        externalPaidServices: []
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA routing (or advanced.html / methodology.html if prefixed)
app.get('*', (req, res) => {
  if (req.path.startsWith('/advanced')) {
    res.sendFile(path.join(__dirname, 'public', 'advanced.html'));
  } else if (req.path.startsWith('/methodology')) {
    res.sendFile(path.join(__dirname, 'public', 'methodology.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`MCP tools ready. Open browser or connect via MCP client.`);
});
