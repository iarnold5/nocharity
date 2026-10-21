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
  const monthlyIncome = parseFloat(req.query.monthlyIncome) || 4000;
  const currency = req.query.currency || '$';

  const processed = BILLIONAIRES_DATA.map(b => {
    const filteredDonations = filterDonationsByTimeframe(b.historicalDonations, timeframe);
    const totalDonatedInPeriod = filteredDonations.reduce((acc, curr) => acc + curr.amount, 0);
    const parity = calculateDonationParity(b.netWorth, totalDonatedInPeriod, monthlyIncome, currency);

    return {
      id: b.id,
      name: b.name,
      company: b.company,
      industry: b.industry,
      netWorth: b.netWorth,
      givingPledge: b.givingPledge,
      forbesPhilanthropyScore: b.forbesPhilanthropyScore,
      summary: b.summary,
      totalDonatedInPeriod,
      percentageOfNetWorth: parity.percentageOfNetWorth,
      percentageFormatted: parity.percentageFormatted,
      userEquivalentMonthly: parity.userEquivalentMonthly,
      userEquivalentAnnual: parity.userEquivalentAnnual,
      tangibleComparison: parity.tangibleComparison,
      comparisonIcon: parity.comparisonIcon,
      articlesCount: filteredDonations.length,
      donations: filteredDonations
    };
  });

  res.json({
    timeframe,
    monthlyIncome,
    currency,
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
  const { billionaire, timeframe } = req.query;

  if (!billionaire) {
    return res.status(400).json({ error: 'Missing billionaire parameter' });
  }

  try {
    const articles = await searchGoogleNews(billionaire, timeframe || 'all');
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
 * POST /api/calculate
 * Calculate parity dynamically for any custom input
 */
app.post('/api/calculate', (req, res) => {
  const { netWorth, donationAmount, monthlyIncome, currency } = req.body;
  if (!netWorth || donationAmount === undefined || !monthlyIncome) {
    return res.status(400).json({ error: 'netWorth, donationAmount, and monthlyIncome are required' });
  }

  const result = calculateDonationParity(
    parseFloat(netWorth),
    parseFloat(donationAmount),
    parseFloat(monthlyIncome),
    currency || '$'
  );

  res.json(result);
});

/**
 * GET /api/mcp-info
 * Returns specification of MCP tools and how they can be used locally or deployed to the web
 */
app.get('/api/mcp-info', (req, res) => {
  res.json({
    serverName: "billionaire-philanthropy-mcp",
    version: "1.0.0",
    protocol: "Model Context Protocol (v2024-11-05)",
    tools: [
      {
        name: "search_billionaire_news",
        description: "Scrapes real-time news headlines, publication dates, and extracted donation figures using free Google News RSS.",
        cost: "100% Free (Zero API key required)"
      },
      {
        name: "calculate_donation_parity",
        description: "Translates billionaire donation percentages into exact monthly and annual equivalents for an everyday user's income.",
        cost: "100% Free"
      },
      {
        name: "get_billionaires_list",
        description: "Curated registry of top billionaires, net worth, philanthropy track records, and Giving Pledge status.",
        cost: "100% Free"
      }
    ],
    freeDeploymentOptions: [
      {
        platform: "Render.com (Web Service Free Tier)",
        url: "https://render.com",
        how: "Connect your GitHub repository; Render detects Node.js and runs 'npm start'. Gives a free public https:// URL."
      },
      {
        platform: "Railway.app / Fly.io",
        url: "https://railway.app",
        how: "Deploy Dockerfile or Node.js container with free monthly credits."
      },
      {
        platform: "GitHub Pages (Static Mode)",
        url: "https://pages.github.com",
        how: "Host the public/ folder directly for 100% free with client-side fallback data."
      },
      {
        platform: "Hugging Face Spaces (Free Node/Docker Space)",
        url: "https://huggingface.co/spaces",
        how: "Create a free Docker space; runs 24/7 with a public web endpoint."
      }
    ]
  });
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`MCP tools ready. Open browser or connect via MCP client.`);
});
