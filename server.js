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

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`MCP tools ready. Open browser or connect via MCP client.`);
});
