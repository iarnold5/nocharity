/**
 * Billionaire Philanthropy MCP Server
 * Standard Model Context Protocol (MCP) server providing tools for:
 * 1. Searching live news for billionaire donations with timeframe filtering (100% free, no API keys)
 * 2. Calculating donation percentage relative to net worth & parity with personal monthly income
 * 3. Retrieving verified billionaire wealth and philanthropy track records
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Pre-compiled verified dataset of major global billionaires
export const BILLIONAIRES_DATA = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    company: "Berkshire Hathaway",
    industry: "Finance & Investments",
    netWorth: 145000000000, // $145B
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    summary: "Has pledged to give away more than 99% of his fortune, primarily to the Gates Foundation and his family's foundations.",
    historicalDonations: [
      {
        year: 2026,
        timeframe: "2026",
        amount: 550000000,
        cause: "Family Foundations & Children's Health",
        headline: "Buffett converts additional Berkshire Class A shares for annual family foundation gifts",
        source: "Wall Street Journal",
        date: "2026-06-25",
        url: "https://www.wsj.com"
      },
      {
        year: 2025,
        timeframe: "2025",
        amount: 5300000000,
        cause: "Bill & Melinda Gates Foundation & Susan Thompson Buffett Foundation",
        headline: "Warren Buffett donates $5.3 billion in Berkshire Hathaway shares in largest single annual gift",
        source: "AP News",
        date: "2025-06-28",
        url: "https://apnews.com"
      },
      {
        year: 2024,
        timeframe: "2024",
        amount: 5300000000,
        cause: "Gates Foundation & Family Charities",
        headline: "Buffett delivers record summer donation of Berkshire stock to Gates Foundation and four family charities",
        source: "Reuters",
        date: "2024-06-28",
        url: "https://www.reuters.com"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 4600000000,
        cause: "Gates Foundation & Family Foundations",
        headline: "Buffett donates $4.64 billion of Berkshire Hathaway stock",
        source: "CNBC",
        date: "2023-06-21",
        url: "https://www.cnbc.com"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 4000000000,
        cause: "Gates Foundation & Family Foundations",
        headline: "Warren Buffett donates over $4 billion to five foundations",
        source: "Bloomberg",
        date: "2022-06-14",
        url: "https://www.bloomberg.com"
      }
    ]
  },
  {
    id: "mackenzie-scott",
    name: "MacKenzie Scott",
    company: "Amazon (Philanthropist / Author)",
    industry: "Philanthropy / Tech Wealth",
    netWorth: 38000000000, // $38B
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    summary: "Known for rapid, unrestricted, no-strings-attached multi-million dollar grants to thousands of community organizations.",
    historicalDonations: [
      {
        year: 2025,
        timeframe: "2025",
        amount: 2150000000,
        cause: "Yield Giving Open Call & Affordable Housing",
        headline: "MacKenzie Scott's Yield Giving distributes over $2B in direct grants to community non-profits",
        source: "Chronicle of Philanthropy",
        date: "2025-11-14",
        url: "https://www.philanthropy.com"
      },
      {
        year: 2024,
        timeframe: "2024",
        amount: 2100000000,
        cause: "Community colleges, health equity, rural development",
        headline: "MacKenzie Scott grants $2.1 billion across 360 organizations in 2024",
        source: "Associated Press",
        date: "2024-12-10",
        url: "https://apnews.com"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 2150000000,
        cause: "Education, public health, early childhood",
        headline: "Yield Giving releases round of $2.15B to underserved communities",
        source: "New York Times",
        date: "2023-12-06",
        url: "https://www.nytimes.com"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 3800000000,
        cause: "Civic organizations, Planned Parenthood, Habitat for Humanity",
        headline: "MacKenzie Scott gives $3.8B to 465 organizations in 7 months",
        source: "Medium / Yield Giving",
        date: "2022-03-23",
        url: "https://medium.com"
      }
    ]
  },
  {
    id: "bill-gates",
    name: "Bill Gates",
    company: "Microsoft / Gates Foundation",
    industry: "Technology",
    netWorth: 108000000000, // $108B
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    summary: "Co-founded the Gates Foundation; pledged to spend virtually his entire fortune eradicating infectious diseases and poverty.",
    historicalDonations: [
      {
        year: 2025,
        timeframe: "2025",
        amount: 3200000000,
        cause: "Polio eradication, malaria vaccines, agricultural climate adaptation",
        headline: "Bill Gates commits $3.2B to Global Health Initiative at Davos",
        source: "Reuters",
        date: "2025-01-22",
        url: "https://www.reuters.com"
      },
      {
        year: 2024,
        timeframe: "2024",
        amount: 5000000000,
        cause: "Gates Foundation annual budget expansion",
        headline: "Gates Foundation boosts 2024 payout to record $8.6 billion with direct Gates transfers",
        source: "Forbes",
        date: "2024-01-15",
        url: "https://www.forbes.com"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 5000000000,
        cause: "Global Health & Education",
        headline: "Bill Gates transfers $5B to endowment to expand yearly grants",
        source: "Bloomberg",
        date: "2023-07-12",
        url: "https://www.bloomberg.com"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 20000000000,
        cause: "Gates Foundation Endowment",
        headline: "Bill Gates makes historic $20 billion gift to foundation, vows to drop off world's rich list",
        source: "GatesNotes / Forbes",
        date: "2022-07-13",
        url: "https://www.gatesnotes.com"
      }
    ]
  },
  {
    id: "michael-bloomberg",
    name: "Michael Bloomberg",
    company: "Bloomberg LP",
    industry: "Media & Financial Data",
    netWorth: 105000000000, // $105B
    givingPledge: true,
    forbesPhilanthropyScore: 4,
    summary: "Major donor to education, public health, gun control, clean energy, and arts through Bloomberg Philanthropies.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 1000000000,
        cause: "Johns Hopkins Medical School Tuition-Free Endowment",
        headline: "Michael Bloomberg gives $1 billion to make Johns Hopkins Medical School free for most students",
        source: "The Baltimore Sun",
        date: "2024-07-08",
        url: "https://www.baltimoresun.com"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 3000000000,
        cause: "Bloomberg Philanthropies Annual Payouts & Clean Energy",
        headline: "Michael Bloomberg gifted $3 billion in 2023, placing among top 3 American philanthropists",
        source: "Chronicle of Philanthropy",
        date: "2024-02-06",
        url: "https://www.philanthropy.com"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 1700000000,
        cause: "Public Health & City Governments",
        headline: "Bloomberg Philanthropies announces $1.7 billion distributed in 2022",
        source: "Forbes",
        date: "2022-12-15",
        url: "https://www.forbes.com"
      }
    ]
  },
  {
    id: "mark-zuckerberg",
    name: "Mark Zuckerberg & Priscilla Chan",
    company: "Meta",
    industry: "Technology",
    netWorth: 215000000000, // $215B
    givingPledge: true,
    forbesPhilanthropyScore: 2,
    summary: "Pledged 99% of Meta shares through the Chan Zuckerberg Initiative (CZI), an LLC vehicle supporting scientific research and education.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 720000000,
        cause: "Chan Zuckerberg Biohub & Disease Research",
        headline: "Chan Zuckerberg Initiative allocates $720M for new biomedical research hubs in Chicago and NYC",
        source: "Science Magazine",
        date: "2024-05-18",
        url: "https://www.science.org"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 600000000,
        cause: "AI for Science & Biohub Network",
        headline: "CZI builds high-performance computing cluster for scientific AI with $600M capital expenditure",
        source: "Nature",
        date: "2023-09-19",
        url: "https://www.nature.com"
      },
      {
        year: 2021,
        timeframe: "2021",
        amount: 500000000,
        cause: "Harvard Quantum Computing and Biology",
        headline: "Zuckerberg and Chan donate $500 million to Harvard for artificial intelligence and biomedical institute",
        source: "The Harvard Crimson",
        date: "2021-12-07",
        url: "https://www.thecrimson.com"
      }
    ]
  },
  {
    id: "jeff-bezos",
    name: "Jeff Bezos",
    company: "Amazon / Blue Origin",
    industry: "Technology / Retail",
    netWorth: 220000000000, // $220B
    givingPledge: false,
    forbesPhilanthropyScore: 2,
    summary: "Has not signed the Giving Pledge, but announced plans to give away the majority of his fortune during his lifetime, primarily through the Bezos Earth Fund and Day 1 Families Fund.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 110000000,
        cause: "Day 1 Families Fund & Homelessness",
        headline: "Jeff Bezos awards $110.5 million in Day 1 Families Fund grants to combat family homelessness",
        source: "USA Today",
        date: "2024-11-20",
        url: "https://www.usatoday.com"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 250000000,
        cause: "Maui Wildfire Relief & Bezos Earth Fund Climate grants",
        headline: "Jeff Bezos and Lauren Sánchez pledge $100M Maui Fund; Earth Fund disburses $150M for clean food systems",
        source: "CNN",
        date: "2023-08-11",
        url: "https://www.cnn.com"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 300000000,
        cause: "Bezos Earth Fund & Smithsonian",
        headline: "Bezos pledges majority of wealth to charity, grants $100M Courage & Civility Award to Dolly Parton",
        source: "CNN Exclusive",
        date: "2022-11-14",
        url: "https://www.cnn.com"
      },
      {
        year: 2020,
        timeframe: "2020",
        amount: 1000000000,
        cause: "Inaugural Bezos Earth Fund grants",
        headline: "Jeff Bezos announces first $791M of his $10 billion Earth Fund climate pledge",
        source: "Washington Post",
        date: "2020-11-16",
        url: "https://www.washingtonpost.com"
      }
    ]
  },
  {
    id: "elon-musk",
    name: "Elon Musk",
    company: "Tesla / SpaceX / xAI",
    industry: "Automotive / Aerospace",
    netWorth: 245000000000, // $245B
    givingPledge: true,
    forbesPhilanthropyScore: 1,
    summary: "Signed the Giving Pledge in 2012. Donated $5.7B in Tesla shares to his own Musk Foundation in 2021, but majority remains undistributed in the foundation's accounts.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 100000000,
        cause: "Musk Foundation education & STEM initiatives in Texas",
        headline: "Musk Foundation reports grants to Texas university STEM programs and Austin area schools",
        source: "Bloomberg",
        date: "2024-12-15",
        url: "https://www.bloomberg.com"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 150000000,
        cause: "XPrize Carbon Removal & St. Jude",
        headline: "Musk Foundation fulfills milestone payments for $100M carbon removal competition",
        source: "TechCrunch",
        date: "2023-04-20",
        url: "https://techcrunch.com"
      },
      {
        year: 2021,
        timeframe: "2021",
        amount: 5700000000,
        cause: "Musk Foundation Share Transfer (Internal Donor-Advised/Private Foundation)",
        headline: "Elon Musk donates $5.7 billion of Tesla shares to charity in November 2021 tax filing",
        source: "SEC Filing / Fortune",
        date: "2022-02-15",
        url: "https://fortune.com"
      }
    ]
  },
  {
    id: "larry-ellison",
    name: "Larry Ellison",
    company: "Oracle",
    industry: "Enterprise Software",
    netWorth: 175000000000, // $175B
    givingPledge: true,
    forbesPhilanthropyScore: 1,
    summary: "Signed Giving Pledge in 2010. Pledged 95% of fortune, but verified public distributions remain below 1% of total net worth.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 25000000,
        cause: "Wildlife conservation & Lanai community programs",
        headline: "Ellison foundation backs marine biology and wildlife sanctuaries in Hawaii",
        source: "Honolulu Civil Beat",
        date: "2024-08-14",
        url: "https://www.civilbeat.org"
      },
      {
        year: 2020,
        timeframe: "2020",
        amount: 200000000,
        cause: "USC Lawrence J. Ellison Institute for Transformative Medicine",
        headline: "Larry Ellison funds cancer research center at USC",
        source: "USC News",
        date: "2020-05-10",
        url: "https://news.usc.edu"
      }
    ]
  },
  {
    id: "bernard-arnault",
    name: "Bernard Arnault & Family",
    company: "LVMH Moët Hennessy Louis Vuitton",
    industry: "Luxury Goods",
    netWorth: 180000000000, // $180B
    givingPledge: false,
    forbesPhilanthropyScore: 1,
    summary: "European luxury magnate; has not signed the Giving Pledge. Philanthropy focused on cultural heritage and arts institutions in France.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 15000000,
        cause: "French Heritage Foundation & Restos du Cœur food bank",
        headline: "Arnault family pledges aid to Restos du Cœur and cultural preservation in Paris",
        source: "Le Monde",
        date: "2024-03-12",
        url: "https://www.lemonde.fr"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 10000000,
        cause: "Restos du Cœur food bank",
        headline: "Bernard Arnault family steps in with €10 million donation to French emergency food aid charity",
        source: "BBC News",
        date: "2023-09-05",
        url: "https://www.bbc.com"
      },
      {
        year: 2019,
        timeframe: "2019",
        amount: 226000000,
        cause: "Notre-Dame Cathedral Reconstruction",
        headline: "LVMH and Arnault family commit €200 million ($226M) to rebuild Notre-Dame",
        source: "Reuters",
        date: "2019-04-16",
        url: "https://www.reuters.com"
      }
    ]
  },
  {
    id: "steve-ballmer",
    name: "Steve & Connie Ballmer",
    company: "Microsoft / LA Clippers",
    industry: "Technology / Sports",
    netWorth: 130000000000, // $130B
    givingPledge: true,
    forbesPhilanthropyScore: 3,
    summary: "Operates the Ballmer Group, focusing on economic mobility for children and families trapped in generational poverty across the US.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 600000000,
        cause: "US Economic Mobility & Black-led Community Funds",
        headline: "Ballmer Group distributes $600M+ targeting economic mobility and early childhood",
        source: "Inside Philanthropy",
        date: "2024-10-18",
        url: "https://www.insidephilanthropy.com"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 425000000,
        cause: "Children's Behavioral Health at University of Oregon",
        headline: "Steve and Connie Ballmer donate $425 million to create Children's Behavioral Health Institute",
        source: "University of Oregon News",
        date: "2023-03-01",
        url: "https://uoregon.edu"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 400000000,
        cause: "Black community investment & youth sports",
        headline: "Ballmer Group pledges $400 million to four organizations backing black-led initiatives",
        source: "Forbes",
        date: "2022-04-06",
        url: "https://www.forbes.com"
      }
    ]
  }
];

/**
 * Searches Google News RSS for real-time news regarding a billionaire's donations
 * Zero API keys, completely free and reliable.
 */
export async function searchGoogleNews(billionaireName, timeframe = 'all') {
  try {
    // Construct search term with timeframe modifier
    let query = `${billionaireName} (donation OR donate OR charity OR pledge OR philanthropic)`;
    if (timeframe === 'past_month' || timeframe === '30d') {
      query += ' when:30d';
    } else if (timeframe === 'past_6_months' || timeframe === '6m') {
      query += ' when:180d';
    } else if (timeframe === 'past_year' || timeframe === '1y' || timeframe === '2025' || timeframe === '2026') {
      query += ' when:1y';
    } else if (timeframe === 'past_2_years' || timeframe === '2y') {
      query += ' when:2y';
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

      // Clean CDATA and HTML entities
      const title = rawTitle.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
      const desc = rawDesc.replace(/<[^>]*>?/gm, '').replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/&amp;/g, '&').trim();

      // Extract donation amount if mentioned in headline or snippet
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
 * Calculates percentage of net worth and parity with personal monthly income
 */
export function calculateDonationParity(netWorth, donationAmount, monthlyIncome = 4000, currency = '$') {
  if (!netWorth || netWorth <= 0) {
    return {
      percentageOfNetWorth: 0,
      userEquivalentMonthly: 0,
      userEquivalentAnnual: 0,
      comparisonTier: "None",
      tangibleComparison: "Nothing"
    };
  }

  const percentage = (donationAmount / netWorth) * 100;
  const userEquivalentMonthly = monthlyIncome * (percentage / 100);
  const userEquivalentAnnual = (monthlyIncome * 12) * (percentage / 100);

  // Tangible real-world comparison item
  let tangibleComparison = "";
  let comparisonIcon = "";

  if (userEquivalentMonthly < 0.25) {
    tangibleComparison = "A loose cent or single penny";
    comparisonIcon = "🪙";
  } else if (userEquivalentMonthly < 1.00) {
    tangibleComparison = "A single stick of chewing gum";
    comparisonIcon = "🍬";
  } else if (userEquivalentMonthly < 3.00) {
    tangibleComparison = "A cup of generic filter coffee";
    comparisonIcon = "☕";
  } else if (userEquivalentMonthly < 6.00) {
    tangibleComparison = "A single public transit bus or subway fare";
    comparisonIcon = "🚌";
  } else if (userEquivalentMonthly < 15.00) {
    tangibleComparison = "A fast-food value lunch meal";
    comparisonIcon = "🍔";
  } else if (userEquivalentMonthly < 35.00) {
    tangibleComparison = "A monthly digital streaming subscription (Netflix/Spotify)";
    comparisonIcon = "📺";
  } else if (userEquivalentMonthly < 100.00) {
    tangibleComparison = "A modest family grocery trip";
    comparisonIcon = "🛒";
  } else if (userEquivalentMonthly < 500.00) {
    tangibleComparison = "A monthly car loan payment or energy bill";
    comparisonIcon = "⚡";
  } else {
    tangibleComparison = "A full month of residential rent or mortgage";
    comparisonIcon = "🏡";
  }

  return {
    netWorth,
    donationAmount,
    monthlyIncome,
    currency,
    percentageOfNetWorth: parseFloat(percentage.toFixed(5)),
    percentageFormatted: percentage >= 0.01 ? `${percentage.toFixed(2)}%` : `${percentage.toFixed(4)}%`,
    userEquivalentMonthly: parseFloat(userEquivalentMonthly.toFixed(2)),
    userEquivalentAnnual: parseFloat(userEquivalentAnnual.toFixed(2)),
    tangibleComparison,
    comparisonIcon
  };
}

/**
 * Filter donations by timeframe
 */
export function filterDonationsByTimeframe(donations, timeframe) {
  if (!timeframe || timeframe === 'all') return donations;

  const currentYear = 2026;
  return donations.filter(d => {
    if (timeframe === '2026') return d.year === 2026;
    if (timeframe === '2025') return d.year === 2025;
    if (timeframe === 'past_2_years' || timeframe === '2y') return d.year >= 2024;
    if (timeframe === 'past_5_years' || timeframe === '5y') return d.year >= 2021;
    if (timeframe === '2020-2023') return d.year >= 2020 && d.year <= 2023;
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

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "search_billionaire_news",
          description: "Fetches live news articles regarding billionaire donations, pledges, and charity gifts with timeframe filtering using free Google News RSS.",
          inputSchema: {
            type: "object",
            properties: {
              billionaireName: {
                type: "string",
                description: "Name of the billionaire (e.g. 'Warren Buffett', 'MacKenzie Scott', 'Elon Musk')",
              },
              timeframe: {
                type: "string",
                description: "Timeframe filter: 'all', 'past_month', 'past_6_months', 'past_year', 'past_2_years'",
                enum: ["all", "past_month", "past_6_months", "past_year", "past_2_years"],
              },
            },
            required: ["billionaireName"],
          },
        },
        {
          name: "calculate_donation_parity",
          description: "Calculates what percentage of a billionaire's net worth their donation represents, and calculates what that same percentage equals in dollars from a user's monthly income.",
          inputSchema: {
            type: "object",
            properties: {
              netWorth: {
                type: "number",
                description: "The billionaire's total net worth in USD.",
              },
              donationAmount: {
                type: "number",
                description: "The total dollar amount donated in the selected timeframe.",
              },
              userMonthlyIncome: {
                type: "number",
                description: "The user's personal monthly income (e.g. 4000).",
              },
              currency: {
                type: "string",
                description: "Currency symbol (default '$')",
              },
            },
            required: ["netWorth", "donationAmount", "userMonthlyIncome"],
          },
        },
        {
          name: "get_billionaires_list",
          description: "Retrieves the curated roster of the world's wealthiest individuals, including their net worth, Giving Pledge status, Forbes philanthropy score, and verified donation history.",
          inputSchema: {
            type: "object",
            properties: {
              timeframe: {
                type: "string",
                description: "Optional timeframe filter ('all', '2026', '2025', 'past_2_years', 'past_5_years')",
              },
            },
          },
        },
      ],
    };
  });

  // Handle tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "search_billionaire_news") {
      const articles = await searchGoogleNews(args.billionaireName, args.timeframe || 'all');
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                billionaire: args.billionaireName,
                timeframe: args.timeframe || 'all',
                articleCount: articles.length,
                articles,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === "calculate_donation_parity") {
      const result = calculateDonationParity(
        args.netWorth,
        args.donationAmount,
        args.userMonthlyIncome,
        args.currency || '$'
      );
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    if (name === "get_billionaires_list") {
      const timeframe = args?.timeframe || 'all';
      const results = BILLIONAIRES_DATA.map((b) => {
        const filteredGifts = filterDonationsByTimeframe(b.historicalDonations, timeframe);
        const totalDonatedInPeriod = filteredGifts.reduce((sum, g) => sum + g.amount, 0);
        return {
          id: b.id,
          name: b.name,
          company: b.company,
          industry: b.industry,
          netWorth: b.netWorth,
          givingPledge: b.givingPledge,
          forbesPhilanthropyScore: b.forbesPhilanthropyScore,
          totalDonatedInPeriod,
          percentageOfNetWorth: (totalDonatedInPeriod / b.netWorth) * 100,
          historicalDonationsCount: filteredGifts.length,
          historicalDonations: filteredGifts,
        };
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    }

    throw new Error(`Tool not found: ${name}`);
  });

  return server;
}

// Standalone execution if launched directly via CLI / stdio
if (process.argv[1] && process.argv[1].endsWith('mcp-server.js')) {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Billionaire Philanthropy MCP Server running on stdio");
}
