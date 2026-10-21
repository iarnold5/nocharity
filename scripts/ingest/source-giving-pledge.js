/**
 * NoCharity Ingestion Source — Giving Pledge & Direct Grantees
 * 
 * Source Type: OFFICIAL_PRESS_RELEASE / SECONDARY_NEWS
 * Focus: Direct grants, community endowments, and irrevocable trusts.
 */

import {
  createNormalizedPerson,
  createNormalizedOrganization,
  createNormalizedSource,
  createNormalizedWealthSnapshot,
  createNormalizedDonation
} from '../normalize/schemas.js';

export const sourceName = 'giving-pledge';

export async function fetchRecords() {
  const people = [
    createNormalizedPerson({
      canonical_name: 'MacKenzie Scott',
      first_name: 'MacKenzie',
      last_name: 'Scott',
      aliases: ['MacKenzie Bezos'],
      country: 'United States',
      birth_date: '1970-04-07',
      occupation: 'Author & Philanthropist',
      industry: 'Technology & Media',
      description: 'Philanthropist utilizing rapid, direct, unrestricted grants to hundreds of grassroots non-profits.',
      is_billionaire: true,
      identifiers: {
        wikidata_id: 'Q6724390'
      }
    }),
    createNormalizedPerson({
      canonical_name: 'Azim Premji',
      first_name: 'Azim',
      last_name: 'Premji',
      aliases: ['Azim Hashim Premji'],
      country: 'India',
      birth_date: '1945-07-24',
      occupation: 'Founder & Chairman, Wipro',
      industry: 'Information Technology',
      description: 'First Indian signatory of the Giving Pledge; transferred over $21B to an irrevocable education trust.',
      is_billionaire: true,
      identifiers: {
        wikidata_id: 'Q793836'
      }
    })
  ];

  const organizations = [
    createNormalizedOrganization({
      legal_name: 'Azim Premji Philanthropic Initiatives Pvt Ltd',
      display_name: 'Azim Premji Foundation',
      organization_type: 'FOUNDATION',
      country: 'India',
      website: 'https://azimpremjifoundation.org',
      description: 'Not-for-profit organisation working towards improving education and healthcare across rural India.'
    })
  ];

  const sources = [
    createNormalizedSource({
      url: 'https://yieldgiving.com/essays/open-call-awardees',
      publisher: 'Yield Giving',
      title: 'Yield Giving Open Call: Direct Unrestricted Awards to 360 Organizations',
      source_type: 'OFFICIAL_PRESS_RELEASE',
      published_at: '2024-12-10',
      notes: 'Direct announcement of $2.15B in open call awards.'
    }),
    createNormalizedSource({
      url: 'https://www.livemint.com/companies/news/azim-premji-earmarks-economic-benefits-of-wipro-shares-worth-7-5-billion-for-philanthropy-1552554746682.html',
      publisher: 'LiveMint',
      title: 'Azim Premji earmarks economic benefits of Wipro shares worth $7.5 billion for philanthropy',
      source_type: 'INVESTIGATIVE_REPORT',
      published_at: '2019-03-14',
      notes: 'Transfer of 34% of Wipro equity into irrevocable educational trust.'
    })
  ];

  const wealthSnapshots = [
    createNormalizedWealthSnapshot({
      person_name: 'MacKenzie Scott',
      snapshot_date: '2024-12-10',
      net_worth: 35_600_000_000,
      currency: 'USD',
      source_name: 'Forbes Real-Time Billionaires',
      source_url: 'https://www.forbes.com/profile/mackenzie-scott/',
      confidence: 'HIGH'
    }),
    createNormalizedWealthSnapshot({
      person_name: 'Azim Premji',
      snapshot_date: '2019-03-14',
      net_worth: 22_600_000_000,
      currency: 'USD',
      source_name: 'Bloomberg Billionaires Index',
      confidence: 'HIGH'
    })
  ];

  const donations = [
    createNormalizedDonation({
      donor_person_name: 'MacKenzie Scott',
      amount: 2_150_000_000,
      currency: 'USD',
      donation_date: '2024-12-10',
      donation_type: 'DIRECT_GRANT',
      funding_source_type: 'PERSONAL_DIRECT',
      status: 'VERIFIED',
      description: 'Direct unrestricted grants to 360 grassroots community non-profit organizations.',
      cause_category: 'Grassroots & Community Resilience',
      source_url: 'https://yieldgiving.com/essays/open-call-awardees'
    }),
    createNormalizedDonation({
      donor_person_name: 'Azim Premji',
      recipient_organization_name: 'Azim Premji Philanthropic Initiatives Pvt Ltd',
      amount: 7_500_000_000,
      currency: 'USD',
      donation_date: '2019-03-14',
      donation_type: 'STOCK_TRANSFER',
      funding_source_type: 'PERSONAL_FUNDS_CONFIRMED',
      status: 'VERIFIED',
      description: 'Transferred economic benefits of 34% of Wipro shares ($7.5B) to philanthropic trust endowment.',
      cause_category: 'Primary Education & Rural Public Health',
      source_url: 'https://www.livemint.com/companies/news/azim-premji-earmarks-economic-benefits-of-wipro-shares-worth-7-5-billion-for-philanthropy-1552554746682.html'
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
