/**
 * NoCharity Ingestion Source — SEC Form 4 Filings
 * 
 * Source Type: PRIMARY_REGULATORY
 * Focus: High-confidence personal equity transfers to foundations & DAFs.
 */

import {
  createNormalizedPerson,
  createNormalizedOrganization,
  createNormalizedSource,
  createNormalizedWealthSnapshot,
  createNormalizedDonation
} from '../normalize/schemas.js';

export const sourceName = 'sec-form4';

export async function fetchRecords() {
  const people = [
    createNormalizedPerson({
      canonical_name: 'Warren Buffett',
      first_name: 'Warren',
      last_name: 'Buffett',
      aliases: ['Warren E. Buffett', 'Oracle of Omaha'],
      country: 'United States',
      birth_date: '1930-08-30',
      occupation: 'Chairman & CEO, Berkshire Hathaway',
      industry: 'Finance & Investing',
      description: 'Pledged more than 99% of wealth to philanthropy; executes annual summer Berkshire stock donations.',
      is_billionaire: true,
      identifiers: {
        wikidata_id: 'Q47213',
        cik: '0001092657'
      }
    }),
    createNormalizedPerson({
      canonical_name: 'Elon Musk',
      first_name: 'Elon',
      last_name: 'Musk',
      aliases: ['Elon Reeve Musk'],
      country: 'United States',
      birth_date: '1971-06-28',
      occupation: 'CEO, Tesla & SpaceX',
      industry: 'Technology & Automotive',
      description: 'Tech entrepreneur and founder with sporadic stock donations to private foundation and DAF accounts.',
      is_billionaire: true,
      identifiers: {
        wikidata_id: 'Q317521',
        cik: '0001494730'
      }
    })
  ];

  const organizations = [
    createNormalizedOrganization({
      legal_name: 'Bill & Melinda Gates Foundation Trust',
      display_name: 'Gates Foundation Trust',
      organization_type: 'FOUNDATION',
      ein: '91-1909341',
      cik: '0001092657',
      country: 'United States',
      website: 'https://www.gatesfoundation.org',
      description: 'Endowment trust managing assets funding the Bill & Melinda Gates Foundation grantmaking.'
    }),
    createNormalizedOrganization({
      legal_name: 'The Musk Foundation',
      display_name: 'Musk Foundation',
      organization_type: 'FOUNDATION',
      ein: '20-0017992',
      country: 'United States',
      website: 'https://www.muskfoundation.org',
      description: 'Private family foundation focused on renewable energy, space exploration, and pediatric research.'
    })
  ];

  const sources = [
    createNormalizedSource({
      url: 'https://www.sec.gov/edgar/data/1067983/000119312525150992/buffett-form4.htm',
      publisher: 'U.S. Securities and Exchange Commission',
      title: 'SEC Form 4: Statement of Changes in Beneficial Ownership for Warren E. Buffett',
      source_type: 'PRIMARY_REGULATORY',
      published_at: '2025-06-28',
      notes: 'Direct regulatory disclosure of 13,000,000 Class B share conversion and transfer.'
    }),
    createNormalizedSource({
      url: 'https://www.sec.gov/edgar/data/1318605/000089924322006322/musk-form4.htm',
      publisher: 'U.S. Securities and Exchange Commission',
      title: 'SEC Form 4: Statement of Changes in Beneficial Ownership for Elon Musk',
      source_type: 'PRIMARY_REGULATORY',
      published_at: '2021-11-19',
      notes: 'Gift of 5,044,000 common shares of Tesla, Inc. to undisclosed DAF accounts.'
    })
  ];

  const wealthSnapshots = [
    createNormalizedWealthSnapshot({
      person_name: 'Warren Buffett',
      snapshot_date: '2025-06-28',
      net_worth: 135_000_000_000,
      currency: 'USD',
      source_name: 'Bloomberg Billionaires Index',
      source_url: 'https://www.bloomberg.com/billionaires/profiles/warren-e-buffett/',
      confidence: 'HIGH'
    }),
    createNormalizedWealthSnapshot({
      person_name: 'Elon Musk',
      snapshot_date: '2021-11-19',
      net_worth: 300_000_000_000,
      currency: 'USD',
      source_name: 'Bloomberg Billionaires Index',
      source_url: 'https://www.bloomberg.com/billionaires/profiles/elon-r-musk/',
      confidence: 'HIGH'
    })
  ];

  const donations = [
    createNormalizedDonation({
      donor_person_name: 'Warren Buffett',
      recipient_organization_name: 'Gates Foundation Trust',
      amount: 5_300_000_000,
      currency: 'USD',
      donation_date: '2025-06-28',
      donation_type: 'STOCK_TRANSFER',
      funding_source_type: 'PERSONAL_FUNDS_CONFIRMED',
      status: 'VERIFIED',
      description: 'Annual summer distribution: Warren Buffett converted and donated 13,000,000 Berkshire Class B shares.',
      cause_category: 'Global Health & Education',
      source_url: 'https://www.sec.gov/edgar/data/1067983/000119312525150992/buffett-form4.htm'
    }),
    createNormalizedDonation({
      donor_person_name: 'Elon Musk',
      recipient_organization_name: 'The Musk Foundation',
      amount: 5_740_000_000,
      currency: 'USD',
      donation_date: '2021-11-19',
      donation_type: 'STOCK_TRANSFER',
      funding_source_type: 'DAF',
      status: 'PARTIALLY_VERIFIED',
      description: 'Transferred 5,044,000 Tesla shares to a donor-advised fund and the Musk Foundation.',
      cause_category: 'Undisclosed Philanthropic DAF',
      source_url: 'https://www.sec.gov/edgar/data/1318605/000089924322006322/musk-form4.htm'
    })
  ];

  return {
    sourceName,
    people,
    organizations,
    sources,
    wealthSnapshots,
    donations
  };
}
