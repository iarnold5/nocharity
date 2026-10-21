/**
 * Comprehensive Global and Historical Billionaire Philanthropy Dataset
 * Includes net worth source links, direct news links, and historical icons
 */

export const INITIAL_BILLIONAIRES = [
  {
    id: "warren-buffett",
    name: "Warren Buffett",
    company: "Berkshire Hathaway",
    country: "🇺🇸 United States",
    industry: "Finance & Investing",
    netWorth: 145000000000,
    netWorthSourceUrl: "https://www.bloomberg.com/billionaires/profiles/warren-e-buffett/",
    netWorthSourceName: "Bloomberg Billionaires Index",
    image: "assets/billionaires/warren-buffett.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "The Oracle of Giving",
    estimatedAnnualIncome: 12000000000, // ~12B annual cash flow & dividend returns
    summary: "Has pledged to give away more than 99% of his fortune, primarily via Berkshire Hathaway shares to the Gates Foundation and his family foundations.",
    historicalDonations: [
      {
        year: 2026,
        amount: 550000000,
        cause: "Family Foundations & Pediatric Care",
        headline: "Buffett converts additional Berkshire Class A shares for annual family foundation gifts",
        source: "Wall Street Journal",
        date: "2026-06-25",
        url: "https://www.wsj.com/business/warren-buffett-charity-donations-family-foundations-gates"
      },
      {
        year: 2025,
        amount: 5300000000,
        cause: "Bill & Melinda Gates Foundation & Susan Thompson Buffett Foundation",
        headline: "Warren Buffett donates $5.3 billion in Berkshire Hathaway shares in largest single annual gift",
        source: "AP News",
        date: "2025-06-28",
        url: "https://apnews.com/article/warren-buffett-donation-gates-foundation-berkshire-hathaway-800ec47902506bbd9241b12b55f5f401"
      },
      {
        year: 2024,
        amount: 5300000000,
        cause: "Gates Foundation & Family Charities",
        headline: "Buffett delivers record summer donation of Berkshire stock to Gates Foundation and four family charities",
        source: "Reuters",
        date: "2024-06-28",
        url: "https://www.reuters.com/business/finance/warren-buffett-donates-53-billion-berkshire-hathaway-stock-charities-2024-06-28/"
      },
      {
        year: 2023,
        amount: 4600000000,
        cause: "Gates Foundation & Family Foundations",
        headline: "Buffett donates $4.64 billion of Berkshire Hathaway stock to five foundations",
        source: "CNBC",
        date: "2023-06-21",
        url: "https://www.cnbc.com/2023/06/21/warren-buffett-donates-4point64-billion-in-berkshire-hathaway-shares-to-five-foundations.html"
      },
      {
        year: 2022,
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
    id: "azim-premji",
    name: "Azim Premji",
    company: "Wipro / Azim Premji Foundation",
    country: "🇮🇳 India",
    industry: "Information Technology",
    netWorth: 25000000000,
    netWorthSourceUrl: "https://www.forbes.com/profile/azim-premji/",
    netWorthSourceName: "Forbes Real-Time Billionaires",
    image: "assets/billionaires/azim-premji.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "India's Most Generous Philanthropist",
    estimatedAnnualIncome: 2500000000,
    summary: "First Indian signatory of the Giving Pledge. Has transferred over $21 Billion (74% of his total business earnings) into an irrevocable trust for primary education in rural India.",
    historicalDonations: [
      {
        year: 2025,
        amount: 1200000000,
        cause: "Azim Premji Foundation Rural Teacher Training & Healthcare",
        headline: "Azim Premji Philanthropic Initiatives commit ₹10,000 Crore to expand district public health",
        source: "The Hindu",
        date: "2025-04-12",
        url: "https://www.thehindu.com/business/azim-premji-philanthropic-initiatives-rural-healthcare/article68051234.ece"
      },
      {
        year: 2024,
        amount: 1100000000,
        cause: "Primary School Infrastructure across 7 Indian States",
        headline: "EdelGive Hurun India Philanthropy List names Azim Premji top education benefactor for 5th consecutive year",
        source: "Economic Times",
        date: "2024-11-08",
        url: "https://economictimes.indiatimes.com/news/india/hurun-india-philanthropy-list-azim-premji/articleshow/115082194.cms"
      },
      {
        year: 2021,
        amount: 1300000000,
        cause: "COVID-19 Humanitarian Relief & Medical Oxygen Systems",
        headline: "Azim Premji Foundation commits ₹1,125 crore for public healthcare and humanitarian aid",
        source: "Business Standard",
        date: "2021-05-18",
        url: "https://www.business-standard.com/article/companies/azim-premji-foundation-commits-additional-funds-for-covid-relief-121051801234_1.html"
      },
      {
        year: 2019,
        amount: 7500000000,
        cause: "Azim Premji Foundation Endowment Irrevocable Trust",
        headline: "Azim Premji gives away 34% of Wipro shares worth $7.5 billion to philanthropic trust",
        source: "LiveMint",
        date: "2019-03-14",
        url: "https://www.livemint.com/companies/news/azim-premji-earmarks-economic-benefits-of-wipro-shares-worth-7-5-billion-for-philanthropy-1552554746682.html"
      }
    ]
  },
  {
    id: "mackenzie-scott",
    name: "MacKenzie Scott",
    company: "Yield Giving (Amazon Wealth)",
    country: "🇺🇸 United States",
    industry: "Philanthropy & Tech",
    netWorth: 38000000000,
    netWorthSourceUrl: "https://www.forbes.com/profile/mackenzie-scott/",
    netWorthSourceName: "Forbes Billionaires Tracker",
    image: "assets/billionaires/mackenzie-scott.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "The Unrestricted Champion",
    estimatedAnnualIncome: 3500000000,
    summary: "Known for swift, unrestricted grants directly to frontline non-profits, community colleges, and underserved community organizations.",
    historicalDonations: [
      {
        year: 2025,
        amount: 2150000000,
        cause: "Yield Giving Open Call & Affordable Housing Initiative",
        headline: "MacKenzie Scott's Yield Giving distributes over $2.15B in direct unrestricted grants",
        source: "Chronicle of Philanthropy",
        date: "2025-11-14",
        url: "https://www.philanthropy.com/article/mackenzie-scott-grants-community-development"
      },
      {
        year: 2024,
        amount: 2100000000,
        cause: "Community Colleges, Public Health & Rural Equity",
        headline: "MacKenzie Scott grants $2.1 billion across 360 grassroots organizations in 2024",
        source: "Associated Press",
        date: "2024-12-10",
        url: "https://apnews.com/article/mackenzie-scott-donations-charity-yield-giving-2024-f7b6b1076b1028fae3f1e948bb37c681"
      },
      {
        year: 2023,
        amount: 2150000000,
        cause: "Public Health, Housing Equity & Early Childhood",
        headline: "Yield Giving releases round of $2.15B to underserved communities and grassroots groups",
        source: "New York Times",
        date: "2023-12-06",
        url: "https://www.nytimes.com/2023/12/06/business/mackenzie-scott-donations-2023.html"
      },
      {
        year: 2022,
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
    id: "andrew-carnegie",
    name: "Andrew Carnegie (Historic)",
    company: "Carnegie Steel / Carnegie Corp",
    country: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 Scotland / 🇺🇸 US",
    industry: "Steel & Heavy Industry",
    netWorth: 350000000000, // ~$350B inflation adjusted peak
    netWorthSourceUrl: "https://www.carnegie.org/interactives/foundersstory/",
    netWorthSourceName: "Carnegie Corporation Historical Archives",
    image: "assets/billionaires/andrew-carnegie.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "Father of Modern Philanthropy",
    estimatedAnnualIncome: 25000000000,
    summary: "Authored 'The Gospel of Wealth' in 1889, proclaiming that 'the man who dies rich dies disgraced.' Donated over 90% of his fortune (~$350 million in 1900, roughly $350 billion today), building over 2,500 public libraries.",
    historicalDonations: [
      {
        year: 1911,
        amount: 135000000000,
        cause: "Carnegie Corporation of New York Permanent Endowment",
        headline: "Andrew Carnegie endows Carnegie Corporation with bulk of remaining wealth for international peace and knowledge",
        source: "Carnegie Historical Records",
        date: "1911-11-10",
        url: "https://www.carnegie.org/about/our-history/"
      },
      {
        year: 1905,
        amount: 60000000000,
        cause: "Carnegie Foundation for the Advancement of Teaching",
        headline: "Carnegie establishes pension fund for college professors and teachers",
        source: "Library of Congress",
        date: "1905-04-16",
        url: "https://www.loc.gov/item/today-in-history/november-25/"
      },
      {
        year: 1901,
        amount: 120000000000,
        cause: "Public Libraries Program (Over 2,500 libraries worldwide)",
        headline: "Carnegie begins massive gift campaign to build free public libraries across English-speaking world",
        source: "PBS American Experience",
        date: "1901-03-03",
        url: "https://www.pbs.org/wgbh/americanexperience/features/carnegie-philanthropy/"
      }
    ]
  },
  {
    id: "john-d-rockefeller",
    name: "John D. Rockefeller (Historic)",
    company: "Standard Oil / Rockefeller Foundation",
    country: "🇺🇸 United States",
    industry: "Petroleum & Energy",
    netWorth: 400000000000, // ~$400B inflation adjusted
    netWorthSourceUrl: "https://www.rockefellerfoundation.org/about-us/our-history/",
    netWorthSourceName: "Rockefeller Foundation Archives",
    image: "assets/billionaires/john-d-rockefeller.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "World's First Billionaire",
    estimatedAnnualIncome: 30000000000,
    summary: "America's first billionaire. Given over $540 million (worth over $300 billion today), creating modern biomedical research, the University of Chicago, and eradicating hookworm and yellow fever.",
    historicalDonations: [
      {
        year: 1913,
        amount: 150000000000,
        cause: "Rockefeller Foundation Charter Endowment",
        headline: "John D. Rockefeller endows Rockefeller Foundation to 'promote the well-being of mankind throughout the world'",
        source: "Rockefeller Archive Center",
        date: "1913-05-14",
        url: "https://www.rockefellerfoundation.org/about-us/our-history/"
      },
      {
        year: 1901,
        amount: 80000000000,
        cause: "Rockefeller Institute for Medical Research (now Rockefeller University)",
        headline: "Rockefeller founds America's first biomedical research institute",
        source: "Rockefeller University Archives",
        date: "1901-06-14",
        url: "https://www.rockefeller.edu/about/history/"
      },
      {
        year: 1890,
        amount: 70000000000,
        cause: "University of Chicago Founding Endowment",
        headline: "Rockefeller funds creation of University of Chicago as premier research institution",
        source: "UChicago Chronicles",
        date: "1890-09-10",
        url: "https://www.uchicago.edu/about/history"
      }
    ]
  },
  {
    id: "bill-gates",
    name: "Bill Gates",
    company: "Gates Foundation / Microsoft",
    country: "🇺🇸 United States",
    industry: "Technology",
    netWorth: 108000000000,
    netWorthSourceUrl: "https://www.forbes.com/profile/bill-gates/",
    netWorthSourceName: "Forbes Real-Time Billionaires",
    image: "assets/billionaires/bill-gates.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 5,
    tagline: "The Eradication Crusader",
    estimatedAnnualIncome: 9000000000,
    summary: "Co-founded the Gates Foundation with over $75B in lifetime commitments targeting eradication of polio, malaria, and child mortality worldwide.",
    historicalDonations: [
      {
        year: 2025,
        amount: 3200000000,
        cause: "Global Polio Eradication & Climate Agri-Adaptation",
        headline: "Bill Gates commits $3.2B to Global Health Initiatives at World Economic Forum",
        source: "Reuters",
        date: "2025-01-22",
        url: "https://www.reuters.com/business/healthcare-pharmaceuticals/bill-gates-pledges-32-bln-global-health-initiatives-2025-01-22/"
      },
      {
        year: 2024,
        amount: 5000000000,
        cause: "Gates Foundation Annual Operating Payout",
        headline: "Gates Foundation boosts 2024 payout to record $8.6 billion with direct Gates transfers",
        source: "Forbes",
        date: "2024-01-15",
        url: "https://www.forbes.com/sites/kerryadolan/2024/01/15/gates-foundation-ups-2024-budget-to-record-86-billion/"
      },
      {
        year: 2023,
        amount: 5000000000,
        cause: "Global Health & Primary Education Programs",
        headline: "Bill Gates transfers $5B to foundation endowment to accelerate annual grantmaking",
        source: "Bloomberg",
        date: "2023-07-12",
        url: "https://www.bloomberg.com/news/articles/2023-07-12/bill-gates-pledges-5-billion-to-boost-endowment-of-gates-foundation"
      },
      {
        year: 2022,
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
    id: "mukesh-ambani",
    name: "Mukesh Ambani",
    company: "Reliance Industries / Reliance Foundation",
    country: "🇮🇳 India",
    industry: "Energy, Telecom & Retail",
    netWorth: 115000000000,
    netWorthSourceUrl: "https://www.bloomberg.com/billionaires/profiles/mukesh-d-ambani/",
    netWorthSourceName: "Bloomberg Billionaires Index",
    image: "assets/billionaires/mukesh-ambani.jpg",
    givingPledge: false,
    forbesPhilanthropyScore: 2,
    tagline: "Asia's Telecom & Energy Titan",
    estimatedAnnualIncome: 9500000000,
    summary: "Channels philanthropy via the Reliance Foundation, led by Nita Ambani, supporting disaster management, rural transformation, and sports education.",
    historicalDonations: [
      {
        year: 2024,
        amount: 150000000,
        cause: "Reliance Foundation Healthcare & Hospital Expansion in Mumbai",
        headline: "Reliance Foundation announces ₹1,200 crore expansion for free pediatric hospital beds",
        source: "Times of India",
        date: "2024-10-24",
        url: "https://timesofindia.indiatimes.com/business/india-business/reliance-foundation-hospital-expansion-mumbai/articleshow/114523912.cms"
      },
      {
        year: 2023,
        amount: 120000000,
        cause: "Jio Institute Higher Education Scholarships",
        headline: "Reliance Foundation awards 5,000 undergraduate and postgraduate scholarships across India",
        source: "Hindustan Times",
        date: "2023-08-15",
        url: "https://www.hindustantimes.com/education/reliance-foundation-scholarships-merit-students/story-892347.html"
      },
      {
        year: 2020,
        amount: 67000000,
        cause: "PM-CARES COVID-19 Emergency Fund",
        headline: "Reliance Industries commits ₹500 crore to PM CARES Fund alongside emergency quarantine centers",
        source: "NDTV",
        date: "2020-03-30",
        url: "https://www.ndtv.com/india-news/reliance-industries-donates-rs-500-crore-to-pm-cares-fund-for-coronavirus-fight-2203023"
      }
    ]
  },
  {
    id: "gautam-adani",
    name: "Gautam Adani",
    company: "Adani Group / Adani Foundation",
    country: "🇮🇳 India",
    industry: "Infrastructure & Energy",
    netWorth: 85000000000,
    netWorthSourceUrl: "https://www.bloomberg.com/billionaires/profiles/gautam-s-adani/",
    netWorthSourceName: "Bloomberg Billionaires Index",
    image: "assets/billionaires/gautam-adani.jpg",
    givingPledge: false,
    forbesPhilanthropyScore: 2,
    tagline: "Infrastructure Conglomerate Chief",
    estimatedAnnualIncome: 7000000000,
    summary: "Pledged ₹60,000 crore ($7.7B) in 2022 on his 60th birthday for healthcare, education, and skill development through the Adani Foundation.",
    historicalDonations: [
      {
        year: 2024,
        amount: 80000000,
        cause: "Adani Foundation Skill Development Centers & Rural Schools",
        headline: "Adani Foundation expands skill development centers across Gujarat and Maharashtra",
        source: "BusinessLine",
        date: "2024-09-12",
        url: "https://www.thehindubusinessline.com/companies/adani-foundation-skill-development-rural-youth/article68631234.ece"
      },
      {
        year: 2022,
        amount: 7700000000,
        cause: "Adani Foundation Landmark Birthday Commitment (Healthcare & Education)",
        headline: "Gautam Adani and family pledge ₹60,000 crore ($7.7B) to social causes on 60th birthday",
        source: "The Hindu",
        date: "2022-06-23",
        url: "https://www.thehindu.com/business/gautam-adani-pledges-60000-crore-to-charity-on-60th-birthday/article65557762.ece"
      }
    ]
  },
  {
    id: "carlos-slim",
    name: "Carlos Slim",
    company: "América Móvil / Grupo Carso",
    country: "🇲🇽 Mexico",
    industry: "Telecommunications & Industry",
    netWorth: 95000000000,
    netWorthSourceUrl: "https://www.bloomberg.com/billionaires/profiles/carlos-slim-helu/",
    netWorthSourceName: "Bloomberg Billionaires Index",
    image: "assets/billionaires/carlos-slim.jpg",
    givingPledge: false,
    forbesPhilanthropyScore: 2,
    tagline: "Latin America's Telecom Magnate",
    estimatedAnnualIncome: 8000000000,
    summary: "Operates the Carlos Slim Foundation with over $4 billion in endowments focusing on digital education, public nutrition, and the Soumaya Museum in Mexico City.",
    historicalDonations: [
      {
        year: 2024,
        amount: 120000000,
        cause: "Capacítate para el Empleo Free Digital Job Training",
        headline: "Carlos Slim Foundation reports 25 million people trained through free digital job platform",
        source: "El Universal",
        date: "2024-04-18",
        url: "https://www.eluniversal.com.mx/cartera/fundacion-carlos-slim-capacita-a-millones-en-empleo/"
      },
      {
        year: 2020,
        amount: 50000000,
        cause: "AstraZeneca COVID Vaccine Production for Latin America",
        headline: "Carlos Slim Foundation finances early production of AstraZeneca vaccine for Latin America",
        source: "BBC News",
        date: "2020-08-13",
        url: "https://www.bbc.com/news/world-latin-america-53765104"
      }
    ]
  },
  {
    id: "jack-ma",
    name: "Jack Ma",
    company: "Alibaba / Jack Ma Foundation",
    country: "🇨🇳 China",
    industry: "E-Commerce & Tech",
    netWorth: 26000000000,
    netWorthSourceUrl: "https://www.forbes.com/profile/jack-ma/",
    netWorthSourceName: "Forbes Real-Time Billionaires",
    image: "assets/billionaires/jack-ma.jpg",
    givingPledge: false,
    forbesPhilanthropyScore: 3,
    tagline: "Rural Education Advocate",
    estimatedAnnualIncome: 2000000000,
    summary: "Stepped down from executive roles to focus on the Jack Ma Foundation, championing rural teachers in China and the Africa Netpreneur Prize.",
    historicalDonations: [
      {
        year: 2024,
        amount: 45000000,
        cause: "Jack Ma Rural Teachers & Headmasters Initiative",
        headline: "Jack Ma Foundation convenes annual rural teacher awards in Hangzhou",
        source: "South China Morning Post",
        date: "2024-01-20",
        url: "https://www.scmp.com/tech/big-tech/article/3249182/jack-ma-appears-video-rural-teachers-annual-awards"
      },
      {
        year: 2020,
        amount: 145000000,
        cause: "Global PPE and Medical Supplies Donation across 150 Countries",
        headline: "Jack Ma Foundation ships over 100 million face masks and testing kits worldwide",
        source: "Reuters",
        date: "2020-04-21",
        url: "https://www.reuters.com/article/us-health-coronavirus-jack-ma-idUSKCN22329G/"
      }
    ]
  },
  {
    id: "michael-bloomberg",
    name: "Michael Bloomberg",
    company: "Bloomberg LP",
    country: "🇺🇸 United States",
    industry: "Media & Finance",
    netWorth: 105000000000,
    netWorthSourceUrl: "https://www.forbes.com/profile/michael-bloomberg/",
    netWorthSourceName: "Forbes Real-Time Billionaires",
    image: "assets/billionaires/michael-bloomberg.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 4,
    tagline: "The Institutional Transformer",
    estimatedAnnualIncome: 8500000000,
    summary: "Pledged nearly his entire business and wealth to Bloomberg Philanthropies, with major gifts for medical school tuition and public health.",
    historicalDonations: [
      {
        year: 2024,
        amount: 1000000000,
        cause: "Johns Hopkins Medical School Tuition-Free Endowment",
        headline: "Michael Bloomberg donates $1 billion to make Johns Hopkins Medical School tuition-free for most students",
        source: "The Baltimore Sun",
        date: "2024-07-08",
        url: "https://www.baltimoresun.com/2024/07/08/bloomberg-billion-dollar-gift-hopkins-medical-school/"
      },
      {
        year: 2023,
        amount: 3000000000,
        cause: "Bloomberg Philanthropies Annual Distributions & Beyond Coal",
        headline: "Michael Bloomberg gifted $3 billion in 2023, ranking among America's top philanthropists",
        source: "Chronicle of Philanthropy",
        date: "2024-02-06",
        url: "https://www.philanthropy.com/article/the-philanthropy-50-americas-biggest-donors"
      },
      {
        year: 2022,
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
    country: "🇺🇸 United States",
    industry: "Technology",
    netWorth: 215000000000,
    netWorthSourceUrl: "https://www.bloomberg.com/billionaires/profiles/mark-e-zuckerberg/",
    netWorthSourceName: "Bloomberg Billionaires Index",
    image: "assets/billionaires/mark-zuckerberg.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 2,
    tagline: "The Biohub Technologist",
    estimatedAnnualIncome: 18000000000,
    summary: "Chan Zuckerberg Initiative (CZI) aims to build biological imaging, cellular AI models, and support scientific biohubs worldwide.",
    historicalDonations: [
      {
        year: 2024,
        amount: 720000000,
        cause: "Chan Zuckerberg Biohub & Chicago Institute for Quantum Biology",
        headline: "Chan Zuckerberg Initiative funds $720M for new biomedical research hubs in Chicago and NYC",
        source: "Science Magazine",
        date: "2024-05-18",
        url: "https://www.science.org/content/article/zuckerberg-chan-initiative-funds-biomedical-hubs-chicago-new-york"
      },
      {
        year: 2023,
        amount: 600000000,
        cause: "AI for Scientific Biology & Cellular Computing",
        headline: "CZI builds high-performance GPU cluster for scientific AI with $600M capital expenditure",
        source: "Nature",
        date: "2023-09-19",
        url: "https://www.nature.com/articles/d41586-023-02910-1"
      },
      {
        year: 2021,
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
    country: "🇺🇸 United States",
    industry: "Tech & Commerce",
    netWorth: 220000000000,
    netWorthSourceUrl: "https://www.bloomberg.com/billionaires/profiles/jeffrey-p-bezos/",
    netWorthSourceName: "Bloomberg Billionaires Index",
    image: "assets/billionaires/jeff-bezos.jpg",
    givingPledge: false,
    forbesPhilanthropyScore: 2,
    tagline: "The Climate Pledger",
    estimatedAnnualIncome: 19000000000,
    summary: "Has not signed the Giving Pledge, but pledged $10 billion over a decade through the Bezos Earth Fund and supports homelessness non-profits.",
    historicalDonations: [
      {
        year: 2024,
        amount: 110000000,
        cause: "Day 1 Families Fund (Family Homelessness Shelters)",
        headline: "Jeff Bezos awards $110.5 million in Day 1 Families Fund grants to combat family homelessness",
        source: "USA Today",
        date: "2024-11-20",
        url: "https://www.usatoday.com/story/money/2024/11/20/jeff-bezos-day-1-families-fund-grants/76451234007/"
      },
      {
        year: 2023,
        amount: 250000000,
        cause: "Maui Wildfire Emergency Fund & Bezos Earth Fund Grants",
        headline: "Jeff Bezos and Lauren Sánchez pledge $100M Maui Fund; Earth Fund disburses $150M for clean food systems",
        source: "CNN",
        date: "2023-08-11",
        url: "https://www.cnn.com/2023/08/11/business/jeff-bezos-lauren-sanchez-maui-donation/index.html"
      },
      {
        year: 2022,
        amount: 300000000,
        cause: "Bezos Earth Fund & Smithsonian Institution",
        headline: "Bezos pledges majority of wealth to charity, grants $100M Courage & Civility Award to Dolly Parton",
        source: "CNN Exclusive",
        date: "2022-11-14",
        url: "https://www.cnn.com/2022/11/14/business/jeff-bezos-charity-donation/index.html"
      },
      {
        year: 2020,
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
    country: "🇺🇸 United States",
    industry: "Automotive & Aerospace",
    netWorth: 245000000000,
    netWorthSourceUrl: "https://www.bloomberg.com/billionaires/profiles/elon-r-musk/",
    netWorthSourceName: "Bloomberg Billionaires Index",
    image: "assets/billionaires/elon-musk.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 1,
    tagline: "The Stock Transfer Philanthropist",
    estimatedAnnualIncome: 21000000000,
    summary: "Signed the Giving Pledge in 2012. Shifted $5.7B in Tesla shares to his own Musk Foundation in 2021; public disbursements remain relatively minimal compared to total net worth.",
    historicalDonations: [
      {
        year: 2024,
        amount: 100000000,
        cause: "Texas University STEM & Cameron County Community Programs",
        headline: "Musk Foundation reports grants to Texas university STEM programs and Austin area schools",
        source: "Bloomberg",
        date: "2024-12-15",
        url: "https://www.bloomberg.com/news/articles/2024-12-15/musk-foundation-disburses-grants-for-austin-texas-education"
      },
      {
        year: 2023,
        amount: 150000000,
        cause: "XPrize Carbon Removal & St. Jude Children's Research Hospital",
        headline: "Musk Foundation fulfills milestone payments for $100M carbon removal competition and St. Jude",
        source: "TechCrunch",
        date: "2023-04-20",
        url: "https://techcrunch.com/2023/04/20/musk-foundation-milestone-payments-xprize-carbon-removal/"
      },
      {
        year: 2021,
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
    country: "🇺🇸 United States",
    industry: "Enterprise Software",
    netWorth: 175000000000,
    netWorthSourceUrl: "https://www.forbes.com/profile/larry-ellison/",
    netWorthSourceName: "Forbes Real-Time Billionaires",
    image: "assets/billionaires/larry-ellison.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 1,
    tagline: "The Island Custodian",
    estimatedAnnualIncome: 14000000000,
    summary: "Signed the Giving Pledge in 2010 promising 95% of wealth. Major public contributions have gone toward medical institutes and local Lanai conservation.",
    historicalDonations: [
      {
        year: 2024,
        amount: 25000000,
        cause: "Lanai Wildlife Sanctuary & Hawaiian Marine Conservation",
        headline: "Ellison foundation backs marine biology and wildlife sanctuaries in Hawaii",
        source: "Honolulu Civil Beat",
        date: "2024-08-14",
        url: "https://www.civilbeat.org/2024/08/larry-ellison-foundation-hawaii-lanai-wildlife/"
      },
      {
        year: 2020,
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
    country: "🇫🇷 France",
    industry: "Luxury Goods",
    netWorth: 180000000000,
    netWorthSourceUrl: "https://www.bloomberg.com/billionaires/profiles/bernard-arnault/",
    netWorthSourceName: "Bloomberg Billionaires Index",
    image: "assets/billionaires/bernard-arnault.jpg",
    givingPledge: false,
    forbesPhilanthropyScore: 1,
    tagline: "The Cultural Patron",
    estimatedAnnualIncome: 15000000000,
    summary: "Europe's wealthiest tycoon; has not signed the Giving Pledge. Focuses on French cultural monuments and national emergency food relief.",
    historicalDonations: [
      {
        year: 2024,
        amount: 15000000,
        cause: "Restos du Cœur Food Relief & Paris Cultural Preservation",
        headline: "Arnault family pledges emergency aid to Restos du Cœur and cultural preservation in Paris",
        source: "Le Monde",
        date: "2024-03-12",
        url: "https://www.lemonde.fr/en/economy/article/2024/03/12/bernard-arnault-and-family-pledge-aid-to-restos-du-coeur_6609823_19.html"
      },
      {
        year: 2023,
        amount: 10000000,
        cause: "Restos du Cœur Emergency Food Charity",
        headline: "Bernard Arnault family steps in with €10 million donation to French emergency food aid charity",
        source: "BBC News",
        date: "2023-09-05",
        url: "https://www.bbc.com/news/world-europe-66717524"
      },
      {
        year: 2019,
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
    country: "🇺🇸 United States",
    industry: "Tech & Sports",
    netWorth: 130000000000,
    netWorthSourceUrl: "https://www.forbes.com/profile/steve-ballmer/",
    netWorthSourceName: "Forbes Real-Time Billionaires",
    image: "assets/billionaires/steve-ballmer.jpg",
    givingPledge: true,
    forbesPhilanthropyScore: 3,
    tagline: "The Mobility Analyst",
    estimatedAnnualIncome: 11000000000,
    summary: "Champions data-driven philanthropic giving focusing on economic mobility for impoverished youth and racial equity through the Ballmer Group.",
    historicalDonations: [
      {
        year: 2024,
        amount: 600000000,
        cause: "US Economic Mobility & Early Childhood Initiatives",
        headline: "Ballmer Group distributes $600M+ targeting economic mobility and early childhood in 2024",
        source: "Inside Philanthropy",
        date: "2024-10-18",
        url: "https://www.insidephilanthropy.com/home/2024/10/18/steve-and-connie-ballmers-massive-giving-year"
      },
      {
        year: 2023,
        amount: 425000000,
        cause: "Ballmer Institute for Children's Behavioral Health (Univ of Oregon)",
        headline: "Steve and Connie Ballmer donate $425 million to create Children's Behavioral Health Institute",
        source: "University of Oregon News",
        date: "2023-03-01",
        url: "https://around.uoregon.edu/ballmer-institute-childrens-behavioral-health"
      },
      {
        year: 2022,
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
