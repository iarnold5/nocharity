/**
 * Client-Side Billionaires Philanthropy Dataset with Photos and Direct News Links
 */

export const INITIAL_BILLIONAIRES = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    company: "Berkshire Hathaway",
    industry: "Finance & Investing",
    netWorth: 145000000000,
    image: "assets/billionaires/warren-buffett.jpg",
    initials: "WB",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "The Oracle of Giving",
    summary: "Has pledged to give away more than 99% of his fortune, primarily via Berkshire Hathaway shares to the Gates Foundation and his family foundations.",
    historicalDonations: [
      {
        year: 2026,
        timeframe: "2026",
        amount: 550000000,
        cause: "Family Foundations & Pediatric Care",
        headline: "Buffett converts additional Berkshire Class A shares for annual family foundation gifts",
        source: "Wall Street Journal",
        date: "2026-06-25",
        url: "https://www.wsj.com/business/warren-buffett-charity-donations-family-foundations-gates"
      },
      {
        year: 2025,
        timeframe: "2025",
        amount: 5300000000,
        cause: "Bill & Melinda Gates Foundation & Susan Thompson Buffett Foundation",
        headline: "Warren Buffett donates $5.3 billion in Berkshire Hathaway shares in largest single annual gift",
        source: "AP News",
        date: "2025-06-28",
        url: "https://apnews.com/article/warren-buffett-donation-gates-foundation-berkshire-hathaway-800ec47902506bbd9241b12b55f5f401"
      },
      {
        year: 2024,
        timeframe: "2024",
        amount: 5300000000,
        cause: "Gates Foundation & Family Charities",
        headline: "Buffett delivers record summer donation of Berkshire stock to Gates Foundation and four family charities",
        source: "Reuters",
        date: "2024-06-28",
        url: "https://www.reuters.com/business/finance/warren-buffett-donates-53-billion-berkshire-hathaway-stock-charities-2024-06-28/"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 4600000000,
        cause: "Gates Foundation & Family Foundations",
        headline: "Buffett donates $4.64 billion of Berkshire Hathaway stock to five foundations",
        source: "CNBC",
        date: "2023-06-21",
        url: "https://www.cnbc.com/2023/06/21/warren-buffett-donates-4point64-billion-in-berkshire-hathaway-shares-to-five-foundations.html"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 4000000000,
        cause: "Gates Foundation & Family Foundations",
        headline: "Warren Buffett donates over $4 billion to five foundations in annual tradition",
        source: "Bloomberg",
        date: "2022-06-14",
        url: "https://www.bloomberg.com/news/articles/2022-06-14/warren-buffett-donates-4-billion-of-berkshire-stock-to-charities"
      }
    ]
  },
  {
    id: "mackenzie-scott",
    name: "MacKenzie Scott",
    company: "Yield Giving (Amazon Wealth)",
    industry: "Philanthropy & Tech",
    netWorth: 38000000000,
    image: "assets/billionaires/mackenzie-scott.jpg",
    initials: "MS",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "The Unrestricted Champion",
    summary: "Known for swift, unrestricted grants directly to frontline non-profits, community colleges, and underserved community organizations.",
    historicalDonations: [
      {
        year: 2025,
        timeframe: "2025",
        amount: 2150000000,
        cause: "Yield Giving Open Call & Affordable Housing Initiative",
        headline: "MacKenzie Scott's Yield Giving distributes over $2.15B in direct unrestricted grants",
        source: "Chronicle of Philanthropy",
        date: "2025-11-14",
        url: "https://www.philanthropy.com/article/mackenzie-scott-grants-community-development"
      },
      {
        year: 2024,
        timeframe: "2024",
        amount: 2100000000,
        cause: "Community Colleges, Public Health & Rural Equity",
        headline: "MacKenzie Scott grants $2.1 billion across 360 grassroots organizations in 2024",
        source: "Associated Press",
        date: "2024-12-10",
        url: "https://apnews.com/article/mackenzie-scott-donations-charity-yield-giving-2024-f7b6b1076b1028fae3f1e948bb37c681"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 2150000000,
        cause: "Public Health, Housing Equity & Early Childhood",
        headline: "Yield Giving releases round of $2.15B to underserved communities and grassroots groups",
        source: "New York Times",
        date: "2023-12-06",
        url: "https://www.nytimes.com/2023/12/06/business/mackenzie-scott-donations-2023.html"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 3800000000,
        cause: "Civic Organizations, Planned Parenthood, Habitat for Humanity",
        headline: "MacKenzie Scott gives $3.8 billion to 465 organizations in 7 whirlwind months",
        source: "Yield Giving Announcement",
        date: "2022-03-23",
        url: "https://yieldgiving.com/news/helping-any-agency-with-a-track-record-of-success"
      }
    ]
  },
  {
    id: "bill-gates",
    name: "Bill Gates",
    company: "Gates Foundation / Microsoft",
    industry: "Technology",
    netWorth: 108000000000,
    image: "assets/billionaires/bill-gates.jpg",
    initials: "BG",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "The Eradication Crusader",
    summary: "Co-founded the Gates Foundation with over $75B in lifetime commitments targeting eradication of polio, malaria, and child mortality worldwide.",
    historicalDonations: [
      {
        year: 2025,
        timeframe: "2025",
        amount: 3200000000,
        cause: "Global Polio Eradication & Climate Agri-Adaptation",
        headline: "Bill Gates commits $3.2B to Global Health Initiatives at World Economic Forum",
        source: "Reuters",
        date: "2025-01-22",
        url: "https://www.reuters.com/business/healthcare-pharmaceuticals/bill-gates-pledges-32-bln-global-health-initiatives-2025-01-22/"
      },
      {
        year: 2024,
        timeframe: "2024",
        amount: 5000000000,
        cause: "Gates Foundation Annual Operating Payout",
        headline: "Gates Foundation boosts 2024 payout to record $8.6 billion with direct Gates transfers",
        source: "Forbes",
        date: "2024-01-15",
        url: "https://www.forbes.com/sites/kerryadolan/2024/01/15/gates-foundation-ups-2024-budget-to-record-86-billion/"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 5000000000,
        cause: "Global Health & Primary Education Programs",
        headline: "Bill Gates transfers $5B to foundation endowment to accelerate annual grantmaking",
        source: "Bloomberg",
        date: "2023-07-12",
        url: "https://www.bloomberg.com/news/articles/2023-07-12/bill-gates-pledges-5-billion-to-boost-endowment-of-gates-foundation"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 20000000000,
        cause: "Gates Foundation Historic Endowment Gift",
        headline: "Bill Gates makes historic $20 billion gift to foundation, vows to drop off rich list",
        source: "GatesNotes / Forbes",
        date: "2022-07-13",
        url: "https://www.gatesnotes.com/giving-it-all-away"
      }
    ]
  },
  {
    id: "michael-bloomberg",
    name: "Michael Bloomberg",
    company: "Bloomberg LP",
    industry: "Media & Finance",
    netWorth: 105000000000,
    image: "assets/billionaires/michael-bloomberg.jpg",
    initials: "MB",
    givingPledge: true,
    forbesPhilanthropyScore: 4,
    tagline: "The Institutional Transformer",
    summary: "Major benefactor to higher education, public health, gun safety, and clean energy through Bloomberg Philanthropies.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 1000000000,
        cause: "Johns Hopkins Medical School Tuition-Free Endowment",
        headline: "Michael Bloomberg donates $1 billion to make Johns Hopkins Medical School tuition-free for most students",
        source: "The Baltimore Sun",
        date: "2024-07-08",
        url: "https://www.baltimoresun.com/2024/07/08/bloomberg-billion-dollar-gift-hopkins-medical-school/"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 3000000000,
        cause: "Bloomberg Philanthropies Annual Distributions & Beyond Coal",
        headline: "Michael Bloomberg gifted $3 billion in 2023, ranking among America's top philanthropists",
        source: "Chronicle of Philanthropy",
        date: "2024-02-06",
        url: "https://www.philanthropy.com/article/the-philanthropy-50-americas-biggest-donors"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 1700000000,
        cause: "Municipal Innovation & Global Public Health",
        headline: "Bloomberg Philanthropies announces $1.7 billion distributed in 2022",
        source: "Forbes",
        date: "2022-12-15",
        url: "https://www.forbes.com/sites/kerryadolan/2023/01/24/americas-top-givers-2023-the-25-most-philanthropic-billionaires/"
      }
    ]
  },
  {
    id: "mark-zuckerberg",
    name: "Mark Zuckerberg & Priscilla Chan",
    company: "Meta",
    industry: "Technology",
    netWorth: 215000000000,
    image: "assets/billionaires/mark-zuckerberg.jpg",
    initials: "MZ",
    givingPledge: true,
    forbesPhilanthropyScore: 2,
    tagline: "The Biohub Technologist",
    summary: "Chan Zuckerberg Initiative (CZI) aims to build biological imaging, cellular AI models, and support scientific biohubs worldwide.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 720000000,
        cause: "Chan Zuckerberg Biohub & Chicago Institute for Quantum Biology",
        headline: "Chan Zuckerberg Initiative funds $720M for new biomedical research hubs in Chicago and NYC",
        source: "Science Magazine",
        date: "2024-05-18",
        url: "https://www.science.org/content/article/zuckerberg-chan-initiative-funds-biomedical-hubs-chicago-new-york"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 600000000,
        cause: "AI for Scientific Biology & Cellular Computing",
        headline: "CZI builds high-performance GPU cluster for scientific AI with $600M capital expenditure",
        source: "Nature",
        date: "2023-09-19",
        url: "https://www.nature.com/articles/d41586-023-02910-1"
      },
      {
        year: 2021,
        timeframe: "2021",
        amount: 500000000,
        cause: "Kempner Institute for Natural & Artificial Intelligence at Harvard",
        headline: "Zuckerberg and Chan donate $500 million to Harvard for artificial intelligence and biology institute",
        source: "The Harvard Crimson",
        date: "2021-12-07",
        url: "https://www.thecrimson.com/article/2021/12/7/chan-zuckerberg-gift-kempner-institute/"
      }
    ]
  },
  {
    id: "jeff-bezos",
    name: "Jeff Bezos",
    company: "Amazon / Blue Origin",
    industry: "Tech & Commerce",
    netWorth: 220000000000,
    image: "assets/billionaires/jeff-bezos.jpg",
    initials: "JB",
    givingPledge: false,
    forbesPhilanthropyScore: 2,
    tagline: "The Climate Pledger",
    summary: "Has not signed the Giving Pledge, but pledged $10 billion over a decade through the Bezos Earth Fund and supports homelessness non-profits.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 110000000,
        cause: "Day 1 Families Fund (Family Homelessness Shelters)",
        headline: "Jeff Bezos awards $110.5 million in Day 1 Families Fund grants to combat family homelessness",
        source: "USA Today",
        date: "2024-11-20",
        url: "https://www.usatoday.com/story/money/2024/11/20/jeff-bezos-day-1-families-fund-grants/76451234007/"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 250000000,
        cause: "Maui Wildfire Emergency Fund & Bezos Earth Fund Grants",
        headline: "Jeff Bezos and Lauren Sánchez pledge $100M Maui Fund; Earth Fund disburses $150M for clean food systems",
        source: "CNN",
        date: "2023-08-11",
        url: "https://www.cnn.com/2023/08/11/business/jeff-bezos-lauren-sanchez-maui-donation/index.html"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 300000000,
        cause: "Bezos Earth Fund & Smithsonian Institution",
        headline: "Bezos pledges majority of wealth to charity, grants $100M Courage & Civility Award to Dolly Parton",
        source: "CNN Exclusive",
        date: "2022-11-14",
        url: "https://www.cnn.com/2022/11/14/business/jeff-bezos-charity-donation/index.html"
      },
      {
        year: 2020,
        timeframe: "2020",
        amount: 1000000000,
        cause: "Inaugural Bezos Earth Fund Grants",
        headline: "Jeff Bezos announces first $791M of his $10 billion Earth Fund climate pledge",
        source: "Washington Post",
        date: "2020-11-16",
        url: "https://www.washingtonpost.com/climate-environment/2020/11/16/bezos-earth-fund-climate-donations/"
      }
    ]
  },
  {
    id: "elon-musk",
    name: "Elon Musk",
    company: "Tesla / SpaceX / xAI",
    industry: "Automotive & Aerospace",
    netWorth: 245000000000,
    image: "assets/billionaires/elon-musk.jpg",
    initials: "EM",
    givingPledge: true,
    forbesPhilanthropyScore: 1,
    tagline: "The Stock Transfer Philanthropist",
    summary: "Signed the Giving Pledge in 2012. Shifted $5.7B in Tesla shares to his own Musk Foundation in 2021; public disbursements remain relatively minimal compared to total net worth.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 100000000,
        cause: "Texas University STEM & Cameron County Community Programs",
        headline: "Musk Foundation reports grants to Texas university STEM programs and Austin area schools",
        source: "Bloomberg",
        date: "2024-12-15",
        url: "https://www.bloomberg.com/news/articles/2024-12-15/musk-foundation-disburses-grants-for-austin-texas-education"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 150000000,
        cause: "XPrize Carbon Removal & St. Jude Children's Research Hospital",
        headline: "Musk Foundation fulfills milestone payments for $100M carbon removal competition and St. Jude",
        source: "TechCrunch",
        date: "2023-04-20",
        url: "https://techcrunch.com/2023/04/20/musk-foundation-milestone-payments-xprize-carbon-removal/"
      },
      {
        year: 2021,
        timeframe: "2021",
        amount: 5700000000,
        cause: "Musk Foundation Internal Stock Transfer (Tax Filing)",
        headline: "Elon Musk donates $5.7 billion of Tesla shares to his own private foundation in November 2021",
        source: "SEC Filing / Fortune",
        date: "2022-02-15",
        url: "https://fortune.com/2022/02/15/elon-musk-5-7-billion-tesla-shares-charity-donation-tax-break/"
      }
    ]
  },
  {
    id: "larry-ellison",
    name: "Larry Ellison",
    company: "Oracle",
    industry: "Enterprise Software",
    netWorth: 175000000000,
    image: "assets/billionaires/larry-ellison.jpg",
    initials: "LE",
    givingPledge: true,
    forbesPhilanthropyScore: 1,
    tagline: "The Island Custodian",
    summary: "Signed the Giving Pledge in 2010 promising 95% of wealth. Major public contributions have gone toward medical institutes and local Lanai conservation.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 25000000,
        cause: "Lanai Wildlife Sanctuary & Hawaiian Marine Conservation",
        headline: "Ellison foundation backs marine biology and wildlife sanctuaries in Hawaii",
        source: "Honolulu Civil Beat",
        date: "2024-08-14",
        url: "https://www.civilbeat.org/2024/08/larry-ellison-foundation-hawaii-lanai-wildlife/"
      },
      {
        year: 2020,
        timeframe: "2020",
        amount: 200000000,
        cause: "USC Lawrence J. Ellison Institute for Transformative Medicine",
        headline: "Larry Ellison funds cancer research center at University of Southern California",
        source: "USC News",
        date: "2020-05-10",
        url: "https://news.usc.edu/169727/larry-ellison-institute-transformative-medicine-usc-opening/"
      }
    ]
  },
  {
    id: "bernard-arnault",
    name: "Bernard Arnault & Family",
    company: "LVMH Moët Hennessy Louis Vuitton",
    industry: "Luxury Goods",
    netWorth: 180000000000,
    image: "assets/billionaires/bernard-arnault.jpg",
    initials: "BA",
    givingPledge: false,
    forbesPhilanthropyScore: 1,
    tagline: "The Cultural Patron",
    summary: "Europe's wealthiest tycoon; has not signed the Giving Pledge. Focuses on French cultural monuments and national emergency food relief.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 15000000,
        cause: "Restos du Cœur Food Relief & Paris Cultural Preservation",
        headline: "Arnault family pledges emergency aid to Restos du Cœur and cultural preservation in Paris",
        source: "Le Monde",
        date: "2024-03-12",
        url: "https://www.lemonde.fr/en/economy/article/2024/03/12/bernard-arnault-and-family-pledge-aid-to-restos-du-coeur_6609823_19.html"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 10000000,
        cause: "Restos du Cœur Emergency Food Charity",
        headline: "Bernard Arnault family steps in with €10 million donation to French emergency food aid charity",
        source: "BBC News",
        date: "2023-09-05",
        url: "https://www.bbc.com/news/world-europe-66717524"
      },
      {
        year: 2019,
        timeframe: "2019",
        amount: 226000000,
        cause: "Notre-Dame Cathedral Reconstruction",
        headline: "LVMH and Arnault family commit €200 million ($226M) to rebuild fire-ravaged Notre-Dame",
        source: "Reuters",
        date: "2019-04-16",
        url: "https://www.reuters.com/article/us-france-notredame-arnault-idUSKCN1RS0L3/"
      }
    ]
  },
  {
    id: "steve-ballmer",
    name: "Steve & Connie Ballmer",
    company: "Ballmer Group / Microsoft",
    industry: "Tech & Sports",
    netWorth: 130000000000,
    image: "assets/billionaires/steve-ballmer.jpg",
    initials: "SB",
    givingPledge: true,
    forbesPhilanthropyScore: 3,
    tagline: "The Mobility Analyst",
    summary: "Champions data-driven philanthropic giving focusing on economic mobility for impoverished youth and racial equity through the Ballmer Group.",
    historicalDonations: [
      {
        year: 2024,
        timeframe: "2024",
        amount: 600000000,
        cause: "US Economic Mobility & Early Childhood Initiatives",
        headline: "Ballmer Group distributes $600M+ targeting economic mobility and early childhood in 2024",
        source: "Inside Philanthropy",
        date: "2024-10-18",
        url: "https://www.insidephilanthropy.com/home/2024/10/18/steve-and-connie-ballmers-massive-giving-year"
      },
      {
        year: 2023,
        timeframe: "2023",
        amount: 425000000,
        cause: "Ballmer Institute for Children's Behavioral Health (Univ of Oregon)",
        headline: "Steve and Connie Ballmer donate $425 million to create Children's Behavioral Health Institute",
        source: "University of Oregon News",
        date: "2023-03-01",
        url: "https://around.uoregon.edu/ballmer-institute-childrens-behavioral-health"
      },
      {
        year: 2022,
        timeframe: "2022",
        amount: 400000000,
        cause: "Black Community Investment & Youth Sports",
        headline: "Ballmer Group pledges $400 million to four organizations backing black-led initiatives",
        source: "Forbes",
        date: "2022-04-06",
        url: "https://www.forbes.com/sites/kerryadolan/2022/04/06/steve-and-connie-ballmer-commit-400-million-to-black-led-funds/"
      }
    ]
  }
];
