/**
 * Advanced Mode State Store and Configuration Options
 * Preserves all state keys, default filter parameters, and filter option sets.
 */

export const state = {
  activeTab: 'calculator',
  dashboardMetrics: null,
  billionaires: [],
  billionaireFilters: {
    search: '',
    country: 'all',
    industry: 'all',
    wealth: 'all',
    giving: 'all',
    pledge: 'all',
    sortBy: 'name',
    sortOrder: 'asc',
    limit: 20,
    offset: 0
  },
  showBillionaireOrgGiving: false,
  donations: [],
  donationFilters: {
    search: '',
    billionaireId: 'all',
    fundingSourceType: 'all',
    status: 'all',
    sourceType: 'all',
    amountRange: 'all',
    startDate: '',
    endDate: '',
    includeAssociatedOrgGiving: false,
    sortBy: 'date',
    sortOrder: 'desc',
    limit: 20,
    offset: 0
  },
  rankingsMetric: 'largest_donation',
  rankings: [],
  rankingsLimit: 20,
  rankingsOffset: 0,
  activeProfileId: null,
  currency: localStorage.getItem('nocharity_currency') || '$',
  monthlyIncome: parseFloat(localStorage.getItem('nocharity_income')) || 4000,
  calculator: {
    userNetWorth: 1000000,
    monthlyIncome: 35000,
    userIncome: 35000,
    incomeFrequency: 'monthly',
    currency: localStorage.getItem('nocharity_currency') || '$',
    selectedBillionaireId: null,
    selectedDonationId: 'canonical',
    currentDonationsList: [],
    allBillionaires: [],
    compareFilter: 'all',
    isCanonicalExample: true
  }
};

export const BF_OPTIONS = {
  country: ['All Countries', 'United States', 'India', 'France', 'Germany', 'China', 'United Kingdom', 'Canada', 'Brazil', 'Switzerland', 'Russia', 'Israel', 'Mexico', 'Denmark', 'Italy', 'Spain'],
  industry: ['All Industries', 'Technology', 'Finance & Investments', 'Fashion & Retail', 'Healthcare', 'Automotive', 'Manufacturing', 'Energy', 'Real Estate', 'Diversified', 'Media & Entertainment', 'Food & Beverage', 'Metals & Mining'],
  wealth: [
    { label: 'All Net Worths', val: 'all' },
    { label: '> $200 Billion', val: '200B+' },
    { label: '$100B – $200B', val: '100B-200B' },
    { label: '$50B – $100B', val: '50B-100B' },
    { label: '< $50 Billion', val: 'under50B' }
  ],
  giving: [
    { label: 'All Giving Amounts', val: 'all' },
    { label: '> $10 Billion Personal', val: '10B+' },
    { label: '$1B – $10B Personal', val: '1B-10B' },
    { label: '$100M – $1B Personal', val: '100M-1B' },
    { label: '< $100M Personal', val: 'under100M' }
  ],
  pledge: [
    { label: 'All Signatories', val: 'all' },
    { label: '✍️ Signatories Only', val: 'true' },
    { label: 'Non-Signatories', val: 'false' }
  ],
  sortBy: [
    { label: 'Name (A-Z)', val: 'name' },
    { label: 'Net Worth (High to Low)', val: 'net_worth' },
    { label: 'Documented Personal Giving', val: 'personal_giving' },
    { label: 'Peak Donation / Wealth (%)', val: 'giving_ratio' }
  ]
};

export const DF_OPTIONS = {
  fundingSource: [
    { label: 'All Funding Sources', val: 'all' },
    { label: '👤 Direct Personal Gifts', val: 'PERSONAL_DIRECT' },
    { label: '🛡️ Personal Funds (Confirmed)', val: 'PERSONAL_FUNDS_CONFIRMED' },
    { label: '🏛️ Foundation Disbursements', val: 'FOUNDATION' },
    { label: '🏢 Corporate Giving', val: 'CORPORATE' },
    { label: '📦 Donor-Advised Funds (DAF)', val: 'DAF' },
    { label: '✍️ Non-binding Pledges', val: 'PLEDGE' }
  ],
  status: [
    { label: 'All Verification Statuses', val: 'all' },
    { label: '✅ Verified Filings Only', val: 'VERIFIED' },
    { label: '⚠️ Unverified Announcements', val: 'UNVERIFIED' }
  ],
  amount: [
    { label: 'All Amounts', val: 'all' },
    { label: '> $1 Billion', val: '1B+' },
    { label: '$100M – $1 Billion', val: '100M-1B' },
    { label: '$10M – $100M', val: '10M-100M' },
    { label: '< $10 Million', val: 'under10M' }
  ],
  sourceType: [
    { label: 'All Source Types', val: 'all' },
    { label: 'Tier 1: SEC / IRS Regulatory Filings', val: 'REGULATORY_FILING' },
    { label: 'Tier 2: Foundation Disclosures & Audits', val: 'FOUNDATION_DISCLOSURE' },
    { label: 'Tier 3: Verified Press Disclosures', val: 'NEWS_INVESTIGATIVE' }
  ],
  sortBy: [
    { label: 'Donation Date (Newest First)', val: 'date_desc' },
    { label: 'Donation Date (Oldest First)', val: 'date_asc' },
    { label: 'Amount (Largest First)', val: 'amount_desc' },
    { label: 'Amount (Smallest First)', val: 'amount_asc' },
    { label: 'Generosity Ratio (% of Wealth)', val: 'ratio_desc' },
    { label: 'Billionaire Name (A-Z)', val: 'billionaire_asc' }
  ]
};
