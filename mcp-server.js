/**
 * Billionaire Philanthropy MCP Server
 * Model Context Protocol (MCP) server providing tools for:
 * 1. Searching live news for billionaire donations with timeframe filtering
 * 2. Calculating donation percentage relative to Net Worth OR Monthly Income parity
 * 3. Retrieving global & historic billionaire philanthropy profiles with verified sources
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { INITIAL_BILLIONAIRES } from './public/js/data.js';

export const BILLIONAIRES_DATA = INITIAL_BILLIONAIRES;

/**
 * Searches Google News RSS for real-time news regarding a billionaire's donations
 */
export async function searchGoogleNews(billionaireName, timeframe = 'all', startDate = null, endDate = null) {
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
}

/**
 * Calculates parity percentage based on Net Worth OR Monthly Income mode
 */
export function calculateDonationParity(billionaire, donationAmount, userMonthlyIncome = 4000, currency = '$', mode = 'networth') {
  const netWorth = billionaire.netWorth || 1;
  const annualIncome = billionaire.estimatedAnnualIncome || (netWorth * 0.08);

  let percentage = 0;
  let baseMetricLabel = "Net Worth";

  if (mode === 'income') {
    // Percentage of billionaire's annual earnings/income
    percentage = (donationAmount / annualIncome) * 100;
    baseMetricLabel = "Estimated Annual Earnings";
  } else {
    // Percentage of billionaire's total net worth (Gianmarco Soresi original concept)
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

/**
 * Filter donations by timeframe: all, past_month, past_year, or custom
 */
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

/**
 * Creates and starts the MCP Server
 */
export function createMcpServer() {
  const server = new Server(
    {
      name: "billionaire-philanthropy-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
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
          description: "Calculates what percentage of a billionaire's net worth or income their donation represents, and translates that to personal monthly income parity.",
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
          description: "Returns the roster of global and historic billionaires, including traceable net worth source URLs.",
          inputSchema: {
            type: "object",
            properties: {
              timeframe: { type: "string" },
            },
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

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
      return {
        content: [{ type: "text", text: JSON.stringify(BILLIONAIRES_DATA, null, 2) }],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  });

  return server;
}

if (process.argv[1] && process.argv[1].endsWith('mcp-server.js')) {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Billionaire Philanthropy MCP Server running on stdio");
}
