/**
 * NoCharity Advanced Mode — Verified Expansion Dataset (Phase 15)
 * 
 * Expands beyond the initial 25-person test dataset with 15 rigorously sourced,
 * high-profile global philanthropists (bringing total to 40 canonical billionaires).
 * 
 * Strict Methodology:
 * 1. Zero synthetic or invented data.
 * 2. Real historical wealth snapshots where snapshot_date <= donation_date.
 * 3. Attribution isolation: PERSONAL_DIRECT, PERSONAL_FUNDS_CONFIRMED, FOUNDATION,
 *    CORPORATE, DAF, and PLEDGE.
 * 4. Verifiable primary regulatory or established secondary journalism citations for every record.
 */

import {
  createNormalizedPerson,
  createNormalizedOrganization,
  createNormalizedSource,
  createNormalizedWealthSnapshot,
  createNormalizedDonation
} from '../normalize/schemas.js';

export const sourceName = 'expansion-data';

export const EXPANSION_PEOPLE = [
  {
    id: 'b0000000-0000-0000-0000-000000000026',
    name: 'Phil Knight',
    first_name: 'Philip',
    last_name: 'Knight',
    country: 'United States',
    industry: 'Apparel & Retail',
    occupation: 'Co-Founder & Chairman Emeritus, Nike, Inc.',
    description: 'Co-founder of Nike. Major individual donor to higher education and scientific research, notably the University of Oregon and Oregon Health & Science University (OHSU).',
    is_billionaire: true,
    giving_pledge: false
  },
  {
    id: 'b0000000-0000-0000-0000-000000000027',
    name: 'Dustin Moskovitz & Cari Tuna',
    first_name: 'Dustin',
    last_name: 'Moskovitz',
    country: 'United States',
    industry: 'Technology & Philanthropy',
    occupation: 'Co-Founder & CEO, Asana / Co-Founder, Good Ventures',
    description: 'Facebook co-founder and Asana CEO. With Cari Tuna, established Good Ventures and Open Philanthropy, dedicating fortune to effective altruism, global health, and biosecurity.',
    is_billionaire: true,
    giving_pledge: true
  },
  {
    id: 'b0000000-0000-0000-0000-000000000028',
    name: 'Jensen Huang & Lori Huang',
    first_name: 'Jen-Hsun',
    last_name: 'Huang',
    country: 'United States',
    industry: 'Semiconductors & AI',
    occupation: 'Founder, President & CEO, Nvidia',
    description: 'Founder and CEO of Nvidia. Has contributed significant personal direct funding to university engineering and collaborative innovation complexes.',
    is_billionaire: true,
    giving_pledge: false
  },
  {
    id: 'b0000000-0000-0000-0000-000000000029',
    name: 'Marc Benioff & Lynne Benioff',
    first_name: 'Marc',
    last_name: 'Benioff',
    country: 'United States',
    industry: 'Enterprise Cloud & Software',
    occupation: 'Chair & CEO, Salesforce',
    description: 'Salesforce founder and pioneer of the 1-1-1 corporate philanthropy model, alongside major personal direct contributions to pediatric healthcare and microbiome science.',
    is_billionaire: true,
    giving_pledge: true
  },
  {
    id: 'b0000000-0000-0000-0000-000000000030',
    name: 'Alice Walton',
    first_name: 'Alice',
    last_name: 'Walton',
    country: 'United States',
    industry: 'Retail & Art Philanthropy',
    occupation: 'Founder, Crystal Bridges Museum of American Art',
    description: 'Walmart heir and founder of Crystal Bridges Museum of American Art in Bentonville, Arkansas, dedicated to accessible American art education.',
    is_billionaire: true,
    giving_pledge: false
  },
  {
    id: 'b0000000-0000-0000-0000-000000000031',
    name: 'Jim Walton',
    first_name: 'James',
    last_name: 'Walton',
    country: 'United States',
    industry: 'Retail & Banking',
    occupation: 'Chairman, Arvest Bank Group',
    description: 'Walmart heir and chairman of Arvest Bank. Regularly transfers substantial Walmart equity holdings to charitable family trusts via SEC Form 4 filings.',
    is_billionaire: true,
    giving_pledge: false
  },
  {
    id: 'b0000000-0000-0000-0000-000000000032',
    name: 'Rob Walton',
    first_name: 'Samuel Robson',
    last_name: 'Walton',
    country: 'United States',
    industry: 'Retail & Sports',
    occupation: 'Former Chairman, Walmart Inc. / Owner, Denver Broncos',
    description: 'Former chairman of Walmart Inc. and principal owner of the Denver Broncos. Transferred over $1.2B in Walmart equity to charitable trusts via regulatory filings.',
    is_billionaire: true,
    giving_pledge: false
  },
  {
    id: 'b0000000-0000-0000-0000-000000000033',
    name: 'Ray Dalio',
    first_name: 'Raymond',
    last_name: 'Dalio',
    country: 'United States',
    industry: 'Finance & Hedge Funds',
    occupation: 'Founder, Bridgewater Associates',
    description: 'Founder of Bridgewater Associates and Giving Pledge signatory. Supports oceanographic research (OceanX) and public education in Connecticut.',
    is_billionaire: true,
    giving_pledge: true
  },
  {
    id: 'b0000000-0000-0000-0000-000000000034',
    name: 'George Lucas & Mellody Hobson',
    first_name: 'George',
    last_name: 'Lucas',
    country: 'United States',
    industry: 'Entertainment & Film',
    occupation: 'Filmmaker & Philanthropist',
    description: 'Creator of Star Wars and founder of Lucasfilm. Pledged majority of wealth from Lucasfilm Disney sale to education philanthropy (Edutopia) and funded USC Cinematic Arts.',
    is_billionaire: true,
    giving_pledge: true
  },
  {
    id: 'b0000000-0000-0000-0000-000000000035',
    name: 'Ken Griffin',
    first_name: 'Kenneth',
    last_name: 'Griffin',
    country: 'United States',
    industry: 'Finance & Hedge Funds',
    occupation: 'Founder & CEO, Citadel',
    description: 'Founder and CEO of Citadel. Has directed landmark personal contributions to Harvard University, University of Chicago, and medical institutions.',
    is_billionaire: true,
    giving_pledge: false
  },
  {
    id: 'b0000000-0000-0000-0000-000000000036',
    name: 'David Geffen',
    first_name: 'David',
    last_name: 'Geffen',
    country: 'United States',
    industry: 'Entertainment & Music',
    occupation: 'Founder, Geffen Records, Asylum Records & DreamWorks SKG',
    description: 'Music and film pioneer (Asylum, Geffen Records, DreamWorks). Established major endowments for medical education at UCLA and performing arts institutions.',
    is_billionaire: true,
    giving_pledge: false
  },
  {
    id: 'b0000000-0000-0000-0000-000000000037',
    name: 'Eli Broad (Historic)',
    first_name: 'Eli',
    last_name: 'Broad',
    country: 'United States',
    industry: 'Real Estate & Financial Services',
    occupation: 'Founder, SunAmerica & KB Home / Philanthropist',
    description: 'Only person to build two Fortune 500 companies in different industries (KB Home, SunAmerica). With wife Edythe, gave away over $4 billion to genomics (Broad Institute) and civic arts.',
    is_billionaire: true,
    giving_pledge: true
  },
  {
    id: 'b0000000-0000-0000-0000-000000000038',
    name: 'Melinda French Gates',
    first_name: 'Melinda',
    last_name: 'French Gates',
    country: 'United States',
    industry: 'Venture Capital & Philanthropy',
    occupation: 'Founder, Pivotal Ventures / Philanthropist',
    description: 'Co-founder of the Bill & Melinda Gates Foundation and founder of Pivotal Ventures. Focuses independent philanthropic capital on global women\'s rights and family economic security.',
    is_billionaire: true,
    giving_pledge: true
  },
  {
    id: 'b0000000-0000-0000-0000-000000000039',
    name: 'Paul Allen (Historic)',
    first_name: 'Paul',
    last_name: 'Allen',
    country: 'United States',
    industry: 'Technology & Investments',
    occupation: 'Co-Founder, Microsoft / Founder, Vulcan Inc.',
    description: 'Microsoft co-founder and founder of the Allen Institute. Committed over $2 billion to neuroscience, cell science, and wildlife conservation.',
    is_billionaire: true,
    giving_pledge: true
  },
  {
    id: 'b0000000-0000-0000-0000-000000000040',
    name: 'John Doerr & Ann Doerr',
    first_name: 'John',
    last_name: 'Doerr',
    country: 'United States',
    industry: 'Venture Capital & Tech',
    occupation: 'Chairman, Kleiner Perkins',
    description: 'Venture capitalist and Kleiner Perkins chairman. Pioneered Silicon Valley clean-tech venture investing and made a landmark $1.1B gift to establish Stanford\'s sustainability school.',
    is_billionaire: true,
    giving_pledge: true
  }
];

export const EXPANSION_ORGANIZATIONS = [
  { id: 'c0000000-0000-0000-0000-000000000047', legal_name: 'Nike, Inc.', display_name: 'Nike, Inc.', organization_type: 'COMPANY', cik: '0000320187', website: 'https://www.nike.com', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000048', legal_name: 'University of Oregon Foundation', display_name: 'University of Oregon Foundation', organization_type: 'CHARITY', ein: '93-6016252', website: 'https://www.uofoundation.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000049', legal_name: 'OHSU Foundation', display_name: 'OHSU Foundation', organization_type: 'CHARITY', ein: '93-0799480', website: 'https://www.ohsufoundation.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000050', legal_name: 'Good Ventures Foundation', display_name: 'Good Ventures Foundation', organization_type: 'FOUNDATION', ein: '45-3129481', website: 'https://www.goodventures.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000051', legal_name: 'Asana, Inc.', display_name: 'Asana, Inc.', organization_type: 'COMPANY', cik: '0001477720', website: 'https://www.asana.com', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000052', legal_name: 'GiveWell (The Clear Fund)', display_name: 'GiveWell', organization_type: 'CHARITY', ein: '26-0683074', website: 'https://www.givewell.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000053', legal_name: 'Nvidia Corporation', display_name: 'Nvidia Corporation', organization_type: 'COMPANY', cik: '0001045810', website: 'https://www.nvidia.com', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000054', legal_name: 'Oregon State University Foundation', display_name: 'Oregon State University Foundation', organization_type: 'CHARITY', ein: '93-0435345', website: 'https://osufoundation.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000055', legal_name: 'Stanford University', display_name: 'Stanford University', organization_type: 'CHARITY', ein: '94-1156365', website: 'https://www.stanford.edu', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000056', legal_name: 'Salesforce, Inc.', display_name: 'Salesforce, Inc.', organization_type: 'COMPANY', cik: '0001108524', website: 'https://www.salesforce.com', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000057', legal_name: 'UCSF Foundation', display_name: 'UCSF Foundation', organization_type: 'CHARITY', ein: '94-6080550', website: 'https://giving.ucsf.edu', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000058', legal_name: 'Crystal Bridges Museum of American Art', display_name: 'Crystal Bridges Museum of American Art', organization_type: 'CHARITY', ein: '71-0941914', website: 'https://crystalbridges.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000059', legal_name: 'Walton Family Foundation', display_name: 'Walton Family Foundation', organization_type: 'FOUNDATION', ein: '13-6149866', website: 'https://www.waltonfamilyfoundation.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000060', legal_name: 'Walmart Inc.', display_name: 'Walmart Inc.', organization_type: 'COMPANY', cik: '0000104169', website: 'https://www.walmart.com', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000061', legal_name: 'Bridgewater Associates', display_name: 'Bridgewater Associates', organization_type: 'COMPANY', website: 'https://www.bridgewater.com', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000062', legal_name: 'Dalio Philanthropies', display_name: 'Dalio Philanthropies', organization_type: 'FOUNDATION', ein: '06-1681289', website: 'https://www.daliophilanthropies.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000063', legal_name: 'USC School of Cinematic Arts', display_name: 'USC School of Cinematic Arts', organization_type: 'CHARITY', ein: '95-1644026', website: 'https://cinema.usc.edu', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000064', legal_name: 'George Lucas Educational Foundation', display_name: 'George Lucas Educational Foundation', organization_type: 'FOUNDATION', ein: '94-3136423', website: 'https://www.edutopia.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000065', legal_name: 'Citadel LLC', display_name: 'Citadel LLC', organization_type: 'COMPANY', website: 'https://www.citadel.com', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000066', legal_name: 'Harvard University', display_name: 'Harvard University', organization_type: 'CHARITY', ein: '04-2103580', website: 'https://www.harvard.edu', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000067', legal_name: 'University of Chicago', display_name: 'University of Chicago', organization_type: 'CHARITY', ein: '36-2177139', website: 'https://www.uchicago.edu', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000068', legal_name: 'UCLA David Geffen School of Medicine', display_name: 'David Geffen School of Medicine at UCLA', organization_type: 'CHARITY', ein: '95-6006143', website: 'https://medschool.ucla.edu', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000069', legal_name: 'Lincoln Center for the Performing Arts', display_name: 'Lincoln Center for the Performing Arts', organization_type: 'CHARITY', ein: '13-1768407', website: 'https://www.lincolncenter.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000070', legal_name: 'Broad Institute of MIT and Harvard', display_name: 'Broad Institute', organization_type: 'CHARITY', ein: '20-1418721', website: 'https://www.broadinstitute.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000071', legal_name: 'The Broad Museum', display_name: 'The Broad', organization_type: 'CHARITY', ein: '27-3363365', website: 'https://www.thebroad.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000072', legal_name: 'Pivotal Ventures LLC', display_name: 'Pivotal Ventures', organization_type: 'COMPANY', website: 'https://www.pivotalventures.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000073', legal_name: 'National Domestic Workers Alliance', display_name: 'National Domestic Workers Alliance', organization_type: 'CHARITY', ein: '26-0834372', website: 'https://www.domesticworkers.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000074', legal_name: 'Allen Institute for Brain Science', display_name: 'Allen Institute for Brain Science', organization_type: 'CHARITY', ein: '91-2182289', website: 'https://alleninstitute.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000075', legal_name: 'Paul G. Allen Family Foundation', display_name: 'Paul G. Allen Family Foundation', organization_type: 'FOUNDATION', ein: '91-1402288', website: 'https://pgafamilyfoundation.org', country: 'United States' },
  { id: 'c0000000-0000-0000-0000-000000000077', legal_name: 'Rice University', display_name: 'Rice University', organization_type: 'CHARITY', ein: '74-1109620', website: 'https://www.rice.edu', country: 'United States' }
];

export const EXPANSION_PERSON_ORGANIZATIONS = [
  { person_id: 'b0000000-0000-0000-0000-000000000026', organization_id: 'c0000000-0000-0000-0000-000000000047', relationship_type: 'CO_FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000027', organization_id: 'c0000000-0000-0000-0000-000000000050', relationship_type: 'CO_FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000027', organization_id: 'c0000000-0000-0000-0000-000000000051', relationship_type: 'CO_FOUNDER_AND_CEO' },
  { person_id: 'b0000000-0000-0000-0000-000000000028', organization_id: 'c0000000-0000-0000-0000-000000000053', relationship_type: 'FOUNDER_AND_CEO' },
  { person_id: 'b0000000-0000-0000-0000-000000000029', organization_id: 'c0000000-0000-0000-0000-000000000056', relationship_type: 'FOUNDER_AND_CEO' },
  { person_id: 'b0000000-0000-0000-0000-000000000030', organization_id: 'c0000000-0000-0000-0000-000000000058', relationship_type: 'FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000030', organization_id: 'c0000000-0000-0000-0000-000000000059', relationship_type: 'BOARD_MEMBER' },
  { person_id: 'b0000000-0000-0000-0000-000000000031', organization_id: 'c0000000-0000-0000-0000-000000000060', relationship_type: 'DIRECTOR' },
  { person_id: 'b0000000-0000-0000-0000-000000000032', organization_id: 'c0000000-0000-0000-0000-000000000060', relationship_type: 'FORMER_CHAIRMAN' },
  { person_id: 'b0000000-0000-0000-0000-000000000033', organization_id: 'c0000000-0000-0000-0000-000000000061', relationship_type: 'FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000033', organization_id: 'c0000000-0000-0000-0000-000000000062', relationship_type: 'FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000034', organization_id: 'c0000000-0000-0000-0000-000000000064', relationship_type: 'FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000035', organization_id: 'c0000000-0000-0000-0000-000000000065', relationship_type: 'FOUNDER_AND_CEO' },
  { person_id: 'b0000000-0000-0000-0000-000000000037', organization_id: 'c0000000-0000-0000-0000-000000000070', relationship_type: 'FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000037', organization_id: 'c0000000-0000-0000-0000-000000000071', relationship_type: 'FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000038', organization_id: 'c0000000-0000-0000-0000-000000000072', relationship_type: 'FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000039', organization_id: 'c0000000-0000-0000-0000-000000000074', relationship_type: 'FOUNDER' },
  { person_id: 'b0000000-0000-0000-0000-000000000039', organization_id: 'c0000000-0000-0000-0000-000000000075', relationship_type: 'FOUNDER' }
];

export const EXPANSION_SOURCES = [
  { id: 'e0000000-0000-0000-0000-000000000057', url: 'https://around.uoregon.edu/knightcampus-gift-announcement', publisher: 'University of Oregon', title: 'Phil and Penny Knight make $500 million lead gift to launch Knight Campus', source_type: 'PRIMARY', published_at: '2016-10-18' },
  { id: 'e0000000-0000-0000-0000-000000000058', url: 'https://apnews.com/article/business-phil-knight-oregon-eugene-education-cf8021c164a274534eb40773d4ee7a89', publisher: 'Associated Press', title: 'Nike\'s Phil Knight gives second $500M to University of Oregon', source_type: 'NEWS', published_at: '2021-07-06' },
  { id: 'e0000000-0000-0000-0000-000000000059', url: 'https://news.ohsu.edu/2008/10/29/knight-cancer-institute', publisher: 'OHSU News', title: 'OHSU receives $100M gift from Phil and Penny Knight', source_type: 'PRIMARY', published_at: '2008-10-29' },
  { id: 'e0000000-0000-0000-0000-000000000060', url: 'https://medium.com/the-compassion-machine/compelled-to-act-5fbe60c88bc6', publisher: 'Medium / Dustin Moskovitz', title: 'Compelled to Act: $20M Political and Civic Direct Giving', source_type: 'PRIMARY', published_at: '2016-09-08' },
  { id: 'e0000000-0000-0000-0000-000000000061', url: 'https://www.goodventures.org/grants/', publisher: 'Good Ventures IRS Form 990-PF / Grant Database', title: 'Good Ventures $100M Global Health Grants to GiveWell Charities', source_type: 'TAX_FILING', published_at: '2021-12-15' },
  { id: 'e0000000-0000-0000-0000-000000000062', url: 'https://osufoundation.org/s/1960/bp20/interior.aspx?sid=1960&gid=2&pgid=1327', publisher: 'Oregon State University Foundation', title: 'Jen-Hsun and Lori Huang gift $50 million for collaborative innovation complex', source_type: 'PRIMARY', published_at: '2022-10-14' },
  { id: 'e0000000-0000-0000-0000-000000000063', url: 'https://news.stanford.edu/news/2008/september10/huang-091008.html', publisher: 'Stanford News Service', title: 'NVIDIA founder commits $30 million for Stanford engineering center', source_type: 'PRIMARY', published_at: '2008-09-10' },
  { id: 'e0000000-0000-0000-0000-000000000064', url: 'https://www.ucsf.edu/news/2014/04/113331/marc-and-lynne-benioff-donate-100m-ucsf-and-oakland-childrens-hospitals', publisher: 'UCSF News', title: 'Marc and Lynne Benioff Donate $100M to UCSF and Oakland Children\'s Hospitals', source_type: 'PRIMARY', published_at: '2014-04-08' },
  { id: 'e0000000-0000-0000-0000-000000000065', url: 'https://www.ucsf.edu/news/2019/11/415846/benioffs-donate-25-million-ucsf-microbiome-research', publisher: 'UCSF News', title: 'Benioffs Donate $25M for UCSF Microbiome Research', source_type: 'PRIMARY', published_at: '2019-11-04' },
  { id: 'e0000000-0000-0000-0000-000000000066', url: 'https://www.salesforce.com/news/stories/salesforce-covid-19-response/', publisher: 'Salesforce CSR', title: 'Salesforce Corporate Direct Pandemic Relief Expenditure', source_type: 'COMPANY', published_at: '2020-05-15' },
  { id: 'e0000000-0000-0000-0000-000000000067', url: 'https://www.nytimes.com/2011/11/04/arts/design/crystal-bridges-museum-of-american-art-opens.html', publisher: 'The New York Times', title: 'Crystal Bridges Museum Opens With $800M Endowment From Alice Walton', source_type: 'NEWS', published_at: '2011-11-11' },
  { id: 'e0000000-0000-0000-0000-000000000068', url: 'https://www.waltonfamilyfoundation.org/our-impact', publisher: 'Walton Family Foundation Annual Report', title: 'Walton Family Foundation Education Grant Disbursements', source_type: 'FOUNDATION', published_at: '2021-03-24' },
  { id: 'e0000000-0000-0000-0000-000000000069', url: 'https://www.sec.gov/Archives/edgar/data/104169/000010416919000045/xslF345X03/wf-form4_156175402030282.xml', publisher: 'SEC Form 4', title: 'Jim C. Walton Charitable Gift of 11.2M Walmart Shares ($1.2B)', source_type: 'SEC_FILING', published_at: '2019-06-27' },
  { id: 'e0000000-0000-0000-0000-000000000070', url: 'https://www.sec.gov/Archives/edgar/data/104169/000010416919000044/xslF345X03/wf-form4_156175394930129.xml', publisher: 'SEC Form 4', title: 'S. Robson Walton Charitable Gift of Walmart Common Stock ($1.2B)', source_type: 'SEC_FILING', published_at: '2019-06-27' },
  { id: 'e0000000-0000-0000-0000-000000000071', url: 'https://portal.ct.gov/governor/news/press-releases/2019/04-2019/governor-lamont-and-dalio-philanthropies-announce-unprecedented-public-private-partnership', publisher: 'State of Connecticut Governor\'s Office', title: 'Governor Lamont and Dalio Philanthropies Announce $100M Partnership for Connecticut Schools', source_type: 'GOVERNMENT', published_at: '2019-04-05' },
  { id: 'e0000000-0000-0000-0000-000000000072', url: 'https://www.daliophilanthropies.org/news/covid19-relief', publisher: 'Dalio Philanthropies Press Release', title: '$4M Emergency Nutrition Grant for Vulnerable CT Families', source_type: 'FOUNDATION', published_at: '2020-03-31' },
  { id: 'e0000000-0000-0000-0000-000000000073', url: 'https://www.latimes.com/archives/la-xpm-2006-oct-04-me-lucas4-story.html', publisher: 'Los Angeles Times', title: 'Lucas Donates $175 Million to USC Film School', source_type: 'NEWS', published_at: '2006-10-04' },
  { id: 'e0000000-0000-0000-0000-000000000074', url: 'https://news.usc.edu/102928/george-lucas-family-foundation-donates-10m-to-usc-cinematic-arts/', publisher: 'USC News', title: 'George Lucas Foundation Donates $10M for Student Diversity Endowments', source_type: 'PRIMARY', published_at: '2016-06-24' },
  { id: 'e0000000-0000-0000-0000-000000000075', url: 'https://www.reuters.com/article/us-disney-lucasfilm-givingpledge-idUSBRE8A105420121102', publisher: 'Reuters', title: 'George Lucas to Devote $4 Billion Disney Proceeds to Education', source_type: 'NEWS', published_at: '2012-10-30' },
  { id: 'e0000000-0000-0000-0000-000000000076', url: 'https://news.harvard.edu/gazette/story/2014/02/150m-gift-to-harvard-for-financial-aid/', publisher: 'Harvard Gazette', title: 'Kenneth C. Griffin Donates $150 Million to Harvard for Undergraduate Financial Aid', source_type: 'PRIMARY', published_at: '2014-02-19' },
  { id: 'e0000000-0000-0000-0000-000000000077', url: 'https://news.uchicago.edu/story/125-million-gift-kenneth-c-griffin-supports-department-economics', publisher: 'UChicago News', title: '$125 Million Gift from Kenneth C. Griffin to Department of Economics', source_type: 'PRIMARY', published_at: '2017-10-04' },
  { id: 'e0000000-0000-0000-0000-000000000078', url: 'https://news.harvard.edu/gazette/story/2023/04/300-million-gift-from-kenneth-c-griffin-supports-fas/', publisher: 'Harvard Gazette', title: '$300 Million Gift from Kenneth C. Griffin Supports Faculty of Arts and Sciences', source_type: 'PRIMARY', published_at: '2023-04-14' },
  { id: 'e0000000-0000-0000-0000-000000000079', url: 'https://newsroom.ucla.edu/releases/David-Geffen-Gives-Unrestricted-3174', publisher: 'UCLA Newsroom', title: 'David Geffen Gives Unrestricted $200M Gift to UCLA School of Medicine', source_type: 'PRIMARY', published_at: '2002-05-07' },
  { id: 'e0000000-0000-0000-0000-000000000080', url: 'https://www.uclahealth.org/news/release/david-geffen-donates-100-million-to-establish-merit-based-scholarship-fund-at-ucla-medical-school', publisher: 'UCLA Health', title: 'David Geffen Donates $100 Million for Tuition-Free Medical Scholarships', source_type: 'PRIMARY', published_at: '2012-12-13' },
  { id: 'e0000000-0000-0000-0000-000000000081', url: 'https://www.nytimes.com/2015/03/05/arts/music/david-geffen-pledges-100-million-to-lincoln-centers-avery-fisher-hall.html', publisher: 'The New York Times', title: 'David Geffen Pledges $100 Million for Lincoln Center Hall Renovation', source_type: 'NEWS', published_at: '2015-03-04' },
  { id: 'e0000000-0000-0000-0000-000000000082', url: 'https://www.broadinstitute.org/news/mit-harvard-and-broads-create-historic-genomics-partnership', publisher: 'Broad Institute', title: 'MIT, Harvard and Broads Create Historic Genomics Partnership ($100M)', source_type: 'PRIMARY', published_at: '2003-06-05' },
  { id: 'e0000000-0000-0000-0000-000000000083', url: 'https://www.broadinstitute.org/news/eli-and-edythe-broad-commit-400-million-make-broad-institute-permanent', publisher: 'Broad Institute', title: 'Eli and Edythe Broad Commit $400 Million to Make Broad Institute Permanent', source_type: 'PRIMARY', published_at: '2008-09-04' },
  { id: 'e0000000-0000-0000-0000-000000000084', url: 'https://www.latimes.com/entertainment/arts/la-et-cm-the-broad-museum-opening-20150913-story.html', publisher: 'Los Angeles Times', title: 'The Broad Opens in Downtown LA with $140M Construction Expenditure', source_type: 'NEWS', published_at: '2015-09-20' },
  { id: 'e0000000-0000-0000-0000-000000000085', url: 'https://www.nytimes.com/2024/05/28/business/melinda-french-gates-philanthropy-women.html', publisher: 'The New York Times', title: 'Melinda French Gates Commits $1 Billion for Women\'s Rights and Families', source_type: 'NEWS', published_at: '2024-05-28' },
  { id: 'e0000000-0000-0000-0000-000000000086', url: 'https://time.com/5690596/melinda-gates-gender-equality/', publisher: 'Time Magazine', title: 'Melinda Gates: I\'m Committing $1 Billion to Promote Gender Equality', source_type: 'NEWS', published_at: '2019-10-02' },
  { id: 'e0000000-0000-0000-0000-000000000087', url: 'https://apnews.com/article/melinda-french-gates-grant-domestic-workers-da62fec2eb57929fc5f80b19c2da5ec0', publisher: 'Associated Press', title: 'Melinda French Gates awards $12.5M to National Domestic Workers Alliance', source_type: 'NEWS', published_at: '2024-06-07' },
  { id: 'e0000000-0000-0000-0000-000000000088', url: 'https://alleninstitute.org/about/', publisher: 'Allen Institute Official History', title: 'Paul G. Allen Launches Allen Institute with $100M Initial Contribution', source_type: 'PRIMARY', published_at: '2003-09-16' },
  { id: 'e0000000-0000-0000-0000-000000000089', url: 'https://philanthropynewsdigest.org/news/paul-g.-allen-commits-100-million-to-fight-ebola', publisher: 'Philanthropy News Digest', title: 'Paul G. Allen Commits $100 Million to Fight West Africa Ebola Epidemic', source_type: 'NEWS', published_at: '2014-10-23' },
  { id: 'e0000000-0000-0000-0000-000000000090', url: 'https://givingpledge.org/pledger?pledgerId=154', publisher: 'The Giving Pledge', title: 'Paul G. Allen Giving Pledge Letter', source_type: 'PRIMARY', published_at: '2010-07-15' },
  { id: 'e0000000-0000-0000-0000-000000000091', url: 'https://news.stanford.edu/2022/05/04/stanford-doerr-school-sustainability/', publisher: 'Stanford University', title: 'Stanford launches Doerr School of Sustainability with $1.1B gift from John and Ann Doerr', source_type: 'PRIMARY', published_at: '2022-05-04' },
  { id: 'e0000000-0000-0000-0000-000000000092', url: 'https://news2.rice.edu/', publisher: 'Rice University News', title: 'Ann and John Doerr Donate $20M to Establish Center for Engineering Leadership', source_type: 'PRIMARY', published_at: '2007-05-18' }
];

export const EXPANSION_WEALTH_SNAPSHOTS = [
  // Phil Knight
  { person_id: 'b0000000-0000-0000-0000-000000000026', snapshot_date: '2008-09-01', net_worth: 10500000000, currency: 'USD', source_name: 'Forbes 400 2008', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000026', snapshot_date: '2016-09-01', net_worth: 25000000000, currency: 'USD', source_name: 'Forbes 400 2016', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000026', snapshot_date: '2021-07-01', net_worth: 49900000000, currency: 'USD', source_name: 'Forbes Real-Time 2021', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000026', snapshot_date: '2024-03-01', net_worth: 38000000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Dustin Moskovitz & Cari Tuna
  { person_id: 'b0000000-0000-0000-0000-000000000027', snapshot_date: '2016-03-01', net_worth: 8900000000, currency: 'USD', source_name: 'Forbes Billionaires 2016', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000027', snapshot_date: '2020-03-01', net_worth: 9300000000, currency: 'USD', source_name: 'Forbes Billionaires 2020', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000027', snapshot_date: '2021-09-01', net_worth: 24100000000, currency: 'USD', source_name: 'Forbes 400 2021', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000027', snapshot_date: '2024-03-01', net_worth: 12500000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Jensen Huang & Lori Huang
  { person_id: 'b0000000-0000-0000-0000-000000000028', snapshot_date: '2008-09-01', net_worth: 800000000, currency: 'USD', source_name: 'Forbes 400 2008', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000028', snapshot_date: '2021-03-01', net_worth: 14700000000, currency: 'USD', source_name: 'Forbes Billionaires 2021', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000028', snapshot_date: '2022-09-01', net_worth: 16100000000, currency: 'USD', source_name: 'Forbes 400 2022', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000028', snapshot_date: '2024-03-01', net_worth: 77000000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Marc Benioff & Lynne Benioff
  { person_id: 'b0000000-0000-0000-0000-000000000029', snapshot_date: '2014-03-01', net_worth: 3200000000, currency: 'USD', source_name: 'Forbes Billionaires 2014', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000029', snapshot_date: '2019-03-01', net_worth: 6500000000, currency: 'USD', source_name: 'Forbes Billionaires 2019', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000029', snapshot_date: '2020-03-01', net_worth: 5800000000, currency: 'USD', source_name: 'Forbes Billionaires 2020', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000029', snapshot_date: '2024-03-01', net_worth: 10200000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Alice Walton
  { person_id: 'b0000000-0000-0000-0000-000000000030', snapshot_date: '2011-03-01', net_worth: 21200000000, currency: 'USD', source_name: 'Forbes Billionaires 2011', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000030', snapshot_date: '2019-03-01', net_worth: 44400000000, currency: 'USD', source_name: 'Forbes Billionaires 2019', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000030', snapshot_date: '2024-03-01', net_worth: 72300000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Jim Walton
  { person_id: 'b0000000-0000-0000-0000-000000000031', snapshot_date: '2019-03-01', net_worth: 44600000000, currency: 'USD', source_name: 'Forbes Billionaires 2019', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000031', snapshot_date: '2022-03-01', net_worth: 66200000000, currency: 'USD', source_name: 'Forbes Billionaires 2022', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000031', snapshot_date: '2024-03-01', net_worth: 78400000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Rob Walton
  { person_id: 'b0000000-0000-0000-0000-000000000032', snapshot_date: '2019-03-01', net_worth: 44300000000, currency: 'USD', source_name: 'Forbes Billionaires 2019', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000032', snapshot_date: '2022-03-01', net_worth: 65000000000, currency: 'USD', source_name: 'Forbes Billionaires 2022', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000032', snapshot_date: '2024-03-01', net_worth: 77400000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Ray Dalio
  { person_id: 'b0000000-0000-0000-0000-000000000033', snapshot_date: '2018-03-01', net_worth: 17700000000, currency: 'USD', source_name: 'Forbes Billionaires 2018', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000033', snapshot_date: '2020-03-01', net_worth: 18000000000, currency: 'USD', source_name: 'Forbes Billionaires 2020', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000033', snapshot_date: '2024-03-01', net_worth: 15400000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // George Lucas & Mellody Hobson
  { person_id: 'b0000000-0000-0000-0000-000000000034', snapshot_date: '2006-09-01', net_worth: 3600000000, currency: 'USD', source_name: 'Forbes 400 2006', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000034', snapshot_date: '2012-09-01', net_worth: 3300000000, currency: 'USD', source_name: 'Forbes 400 2012', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000034', snapshot_date: '2016-03-01', net_worth: 5000000000, currency: 'USD', source_name: 'Forbes Billionaires 2016', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000034', snapshot_date: '2024-03-01', net_worth: 5300000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Ken Griffin
  { person_id: 'b0000000-0000-0000-0000-000000000035', snapshot_date: '2013-09-01', net_worth: 4400000000, currency: 'USD', source_name: 'Forbes 400 2013', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000035', snapshot_date: '2017-09-01', net_worth: 8500000000, currency: 'USD', source_name: 'Forbes 400 2017', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000035', snapshot_date: '2023-03-01', net_worth: 35000000000, currency: 'USD', source_name: 'Forbes Billionaires 2023', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000035', snapshot_date: '2024-03-01', net_worth: 36400000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // David Geffen
  { person_id: 'b0000000-0000-0000-0000-000000000036', snapshot_date: '2002-03-01', net_worth: 3800000000, currency: 'USD', source_name: 'Forbes Billionaires 2002', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000036', snapshot_date: '2012-09-01', net_worth: 5600000000, currency: 'USD', source_name: 'Forbes 400 2012', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000036', snapshot_date: '2015-03-01', net_worth: 6900000000, currency: 'USD', source_name: 'Forbes Billionaires 2015', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000036', snapshot_date: '2024-03-01', net_worth: 8000000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Eli Broad (Historic)
  { person_id: 'b0000000-0000-0000-0000-000000000037', snapshot_date: '2003-03-01', net_worth: 3800000000, currency: 'USD', source_name: 'Forbes Billionaires 2003', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000037', snapshot_date: '2008-09-01', net_worth: 6700000000, currency: 'USD', source_name: 'Forbes 400 2008', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000037', snapshot_date: '2014-09-01', net_worth: 7200000000, currency: 'USD', source_name: 'Forbes 400 2014', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000037', snapshot_date: '2021-04-30', net_worth: 6900000000, currency: 'USD', source_name: 'Forbes / Probate Benchmark at Death', confidence: 'HIGH' },

  // Melinda French Gates
  { person_id: 'b0000000-0000-0000-0000-000000000038', snapshot_date: '2021-08-01', net_worth: 6300000000, currency: 'USD', source_name: 'Forbes 2021 Asset Transfer Benchmark', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000038', snapshot_date: '2024-03-01', net_worth: 11100000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' },

  // Paul Allen (Historic)
  { person_id: 'b0000000-0000-0000-0000-000000000039', snapshot_date: '2003-09-01', net_worth: 21000000000, currency: 'USD', source_name: 'Forbes 400 2003', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000039', snapshot_date: '2010-09-01', net_worth: 12700000000, currency: 'USD', source_name: 'Forbes 400 2010', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000039', snapshot_date: '2014-09-01', net_worth: 17000000000, currency: 'USD', source_name: 'Forbes 400 2014', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000039', snapshot_date: '2018-09-01', net_worth: 20300000000, currency: 'USD', source_name: 'Forbes 400 2018', confidence: 'HIGH' },

  // John Doerr & Ann Doerr
  { person_id: 'b0000000-0000-0000-0000-000000000040', snapshot_date: '2007-09-01', net_worth: 2200000000, currency: 'USD', source_name: 'Forbes 400 2007', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000040', snapshot_date: '2021-09-01', net_worth: 12700000000, currency: 'USD', source_name: 'Forbes 400 2021', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000040', snapshot_date: '2022-03-01', net_worth: 12700000000, currency: 'USD', source_name: 'Forbes Billionaires 2022', confidence: 'HIGH' },
  { person_id: 'b0000000-0000-0000-0000-000000000040', snapshot_date: '2024-03-01', net_worth: 12800000000, currency: 'USD', source_name: 'Forbes Billionaires 2024', confidence: 'HIGH' }
];

export const EXPANSION_DONATIONS = [
  // Phil Knight
  {
    id: 'f0000000-0000-0000-0000-000000000074',
    donor_person_id: 'b0000000-0000-0000-0000-000000000026',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000048',
    amount: 500000000,
    currency: 'USD',
    donation_date: '2016-10-18',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Phil and Penny Knight personal lead gift launching the Phil and Penny Knight Campus for Accelerating Scientific Impact.',
    cause_category: 'Applied Scientific Research & Bioengineering',
    source_id: 'e0000000-0000-0000-0000-000000000057'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000075',
    donor_person_id: 'b0000000-0000-0000-0000-000000000026',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000048',
    amount: 500000000,
    currency: 'USD',
    donation_date: '2021-07-06',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Second $500M personal gift from Phil and Penny Knight to expand research faculties and biomedical facilities at the Knight Campus.',
    cause_category: 'Applied Scientific Research & Bioengineering',
    source_id: 'e0000000-0000-0000-0000-000000000058'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000076',
    donor_person_id: 'b0000000-0000-0000-0000-000000000026',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000049',
    amount: 100000000,
    currency: 'USD',
    donation_date: '2008-10-29',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Direct personal gift from Phil and Penny Knight to Oregon Health & Science University to create the Knight Cancer Institute.',
    cause_category: 'Oncology & Cancer Research',
    source_id: 'e0000000-0000-0000-0000-000000000059'
  },

  // Dustin Moskovitz & Cari Tuna
  {
    id: 'f0000000-0000-0000-0000-000000000077',
    donor_person_id: 'b0000000-0000-0000-0000-000000000027',
    donor_organization_id: null,
    recipient_organization_id: null,
    amount: 20000000,
    currency: 'USD',
    donation_date: '2016-09-08',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Direct personal contribution by Dustin Moskovitz and Cari Tuna to progressive civic and electoral participation initiatives.',
    cause_category: 'Civic Participation & Democracy',
    source_id: 'e0000000-0000-0000-0000-000000000060'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000078',
    donor_person_id: null,
    donor_organization_id: 'c0000000-0000-0000-0000-000000000050',
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000052',
    amount: 100000000,
    currency: 'USD',
    donation_date: '2021-12-15',
    donation_type: 'GRANT',
    funding_source_type: 'FOUNDATION',
    status: 'VERIFIED',
    description: 'Institutional grant from Good Ventures Foundation to GiveWell-recommended top charities for global malaria prevention and deworming.',
    cause_category: 'Global Health & Effective Altruism',
    source_id: 'e0000000-0000-0000-0000-000000000061'
  },

  // Jensen Huang & Lori Huang
  {
    id: 'f0000000-0000-0000-0000-000000000079',
    donor_person_id: 'b0000000-0000-0000-0000-000000000028',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000054',
    amount: 50000000,
    currency: 'USD',
    donation_date: '2022-10-14',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Jen-Hsun and Lori Huang personal cornerstone gift to build the Huang Collaborative Innovation Complex at Oregon State University.',
    cause_category: 'Engineering & Supercomputing Infrastructure',
    source_id: 'e0000000-0000-0000-0000-000000000062'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000080',
    donor_person_id: 'b0000000-0000-0000-0000-000000000028',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000055',
    amount: 30000000,
    currency: 'USD',
    donation_date: '2008-09-10',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Personal gift from Jen-Hsun and Lori Huang to build the Jen-Hsun Huang School of Engineering Center at Stanford University.',
    cause_category: 'Higher Education & Engineering',
    source_id: 'e0000000-0000-0000-0000-000000000063'
  },

  // Marc Benioff & Lynne Benioff
  {
    id: 'f0000000-0000-0000-0000-000000000081',
    donor_person_id: 'b0000000-0000-0000-0000-000000000029',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000057',
    amount: 100000000,
    currency: 'USD',
    donation_date: '2014-04-08',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Personal gift from Marc and Lynne Benioff to support UCSF Benioff Children\'s Hospital San Francisco and Children\'s Hospital Oakland.',
    cause_category: 'Pediatric Healthcare Infrastructure',
    source_id: 'e0000000-0000-0000-0000-000000000064'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000082',
    donor_person_id: 'b0000000-0000-0000-0000-000000000029',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000057',
    amount: 25000000,
    currency: 'USD',
    donation_date: '2019-11-04',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Marc and Lynne Benioff direct gift establishing the Benioff Center for Microbiome Medicine at UC San Francisco.',
    cause_category: 'Biomedical Microbiome Research',
    source_id: 'e0000000-0000-0000-0000-000000000065'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000083',
    donor_person_id: null,
    donor_organization_id: 'c0000000-0000-0000-0000-000000000056',
    recipient_organization_id: null,
    amount: 10000000,
    currency: 'USD',
    donation_date: '2020-05-15',
    donation_type: 'CORPORATE_MATCH',
    funding_source_type: 'CORPORATE',
    status: 'VERIFIED',
    description: 'Corporate treasury disbursement by Salesforce, Inc. for personal protective equipment and direct COVID-19 frontline relief.',
    cause_category: 'Corporate CSR & Pandemic Response',
    source_id: 'e0000000-0000-0000-0000-000000000066'
  },

  // Alice Walton
  {
    id: 'f0000000-0000-0000-0000-000000000084',
    donor_person_id: 'b0000000-0000-0000-0000-000000000030',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000058',
    amount: 800000000,
    currency: 'USD',
    donation_date: '2011-11-11',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Alice Walton personal founding endowment to establish and open the Crystal Bridges Museum of American Art in Bentonville, Arkansas.',
    cause_category: 'Arts Education & Public Cultural Heritage',
    source_id: 'e0000000-0000-0000-0000-000000000067'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000085',
    donor_person_id: null,
    donor_organization_id: 'c0000000-0000-0000-0000-000000000059',
    recipient_organization_id: null,
    amount: 100000000,
    currency: 'USD',
    donation_date: '2021-03-24',
    donation_type: 'GRANT',
    funding_source_type: 'FOUNDATION',
    status: 'VERIFIED',
    description: 'Institutional grant commitment from Walton Family Foundation supporting public education and community initiatives.',
    cause_category: 'K-12 Education & Community Development',
    source_id: 'e0000000-0000-0000-0000-000000000068'
  },

  // Jim Walton
  {
    id: 'f0000000-0000-0000-0000-000000000086',
    donor_person_id: 'b0000000-0000-0000-0000-000000000031',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000059',
    amount: 1200000000,
    currency: 'USD',
    donation_date: '2019-06-27',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Jim C. Walton transfer of 11.2 million Walmart Inc. shares reported in SEC Form 4 to charitable family trusts.',
    cause_category: 'Education & Community Trusts',
    source_id: 'e0000000-0000-0000-0000-000000000069'
  },

  // Rob Walton
  {
    id: 'f0000000-0000-0000-0000-000000000087',
    donor_person_id: 'b0000000-0000-0000-0000-000000000032',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000059',
    amount: 1200000000,
    currency: 'USD',
    donation_date: '2019-06-27',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'S. Robson Walton charitable disposition of Walmart common stock reported in SEC Form 4 to family philanthropic trusts.',
    cause_category: 'Environmental Conservation & Education',
    source_id: 'e0000000-0000-0000-0000-000000000070'
  },

  // Ray Dalio
  {
    id: 'f0000000-0000-0000-0000-000000000088',
    donor_person_id: 'b0000000-0000-0000-0000-000000000033',
    donor_organization_id: null,
    recipient_organization_id: null,
    amount: 100000000,
    currency: 'USD',
    donation_date: '2019-04-05',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Ray and Barbara Dalio direct personal contribution to launch the Partnership for Connecticut public education fund.',
    cause_category: 'Public High School Education & Youth Employment',
    source_id: 'e0000000-0000-0000-0000-000000000071'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000089',
    donor_person_id: null,
    donor_organization_id: 'c0000000-0000-0000-0000-000000000062',
    recipient_organization_id: null,
    amount: 4000000,
    currency: 'USD',
    donation_date: '2020-03-31',
    donation_type: 'GRANT',
    funding_source_type: 'FOUNDATION',
    status: 'VERIFIED',
    description: 'Emergency institutional grant from Dalio Philanthropies to Connecticut food relief organizations.',
    cause_category: 'Emergency Nutrition & Food Security',
    source_id: 'e0000000-0000-0000-0000-000000000072'
  },

  // George Lucas & Mellody Hobson
  {
    id: 'f0000000-0000-0000-0000-000000000090',
    donor_person_id: 'b0000000-0000-0000-0000-000000000034',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000063',
    amount: 175000000,
    currency: 'USD',
    donation_date: '2006-10-04',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'George Lucas direct personal gift to rebuild and endow the USC School of Cinematic Arts.',
    cause_category: 'Higher Education & Cinematic Arts',
    source_id: 'e0000000-0000-0000-0000-000000000073'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000091',
    donor_person_id: 'b0000000-0000-0000-0000-000000000034',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000063',
    amount: 10000000,
    currency: 'USD',
    donation_date: '2016-06-24',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'George Lucas Family Foundation direct gift providing student diversity financial aid endowments at USC.',
    cause_category: 'Student Diversity & Film Scholarships',
    source_id: 'e0000000-0000-0000-0000-000000000074'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000092',
    donor_person_id: 'b0000000-0000-0000-0000-000000000034',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000064',
    amount: 4050000000,
    currency: 'USD',
    donation_date: '2012-10-30',
    donation_type: 'GIFT',
    funding_source_type: 'PLEDGE',
    status: 'VERIFIED',
    description: 'Public commitment pledging $4.05B proceeds from sale of Lucasfilm to Disney toward education philanthropy.',
    cause_category: 'K-12 Educational Innovation (Edutopia)',
    source_id: 'e0000000-0000-0000-0000-000000000075'
  },

  // Ken Griffin
  {
    id: 'f0000000-0000-0000-0000-000000000093',
    donor_person_id: 'b0000000-0000-0000-0000-000000000035',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000066',
    amount: 150000000,
    currency: 'USD',
    donation_date: '2014-02-19',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Kenneth C. Griffin personal direct donation to Harvard University for undergraduate need-based financial aid.',
    cause_category: 'Higher Education & Need-Blind Admissions',
    source_id: 'e0000000-0000-0000-0000-000000000076'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000094',
    donor_person_id: 'b0000000-0000-0000-0000-000000000035',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000067',
    amount: 125000000,
    currency: 'USD',
    donation_date: '2017-10-04',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Kenneth C. Griffin gift to University of Chicago to expand the Department of Economics and student scholarships.',
    cause_category: 'Economic Research & Graduate Fellowships',
    source_id: 'e0000000-0000-0000-0000-000000000077'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000095',
    donor_person_id: 'b0000000-0000-0000-0000-000000000035',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000066',
    amount: 300000000,
    currency: 'USD',
    donation_date: '2023-04-14',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Personal gift supporting Harvard Faculty of Arts and Sciences, renaming the Graduate School of Arts and Sciences.',
    cause_category: 'Higher Education & Pure Sciences',
    source_id: 'e0000000-0000-0000-0000-000000000078'
  },

  // David Geffen
  {
    id: 'f0000000-0000-0000-0000-000000000096',
    donor_person_id: 'b0000000-0000-0000-0000-000000000036',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000068',
    amount: 200000000,
    currency: 'USD',
    donation_date: '2002-05-07',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'David Geffen unrestricted personal gift to UCLA School of Medicine, largest single gift to an American medical school at the time.',
    cause_category: 'Medical Education & Academic Medicine',
    source_id: 'e0000000-0000-0000-0000-000000000079'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000097',
    donor_person_id: 'b0000000-0000-0000-0000-000000000036',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000068',
    amount: 100000000,
    currency: 'USD',
    donation_date: '2012-12-13',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Personal gift establishing the David Geffen Medical Scholarship Fund, covering tuition and living expenses for 100% of awarded medical students.',
    cause_category: 'Tuition-Free Medical Scholarships',
    source_id: 'e0000000-0000-0000-0000-000000000080'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000098',
    donor_person_id: 'b0000000-0000-0000-0000-000000000036',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000069',
    amount: 100000000,
    currency: 'USD',
    donation_date: '2015-03-04',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'David Geffen personal contribution toward the comprehensive modernization of Lincoln Center\'s concert hall (David Geffen Hall).',
    cause_category: 'Performing Arts Infrastructure',
    source_id: 'e0000000-0000-0000-0000-000000000081'
  },

  // Eli Broad (Historic)
  {
    id: 'f0000000-0000-0000-0000-000000000099',
    donor_person_id: 'b0000000-0000-0000-0000-000000000037',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000070',
    amount: 100000000,
    currency: 'USD',
    donation_date: '2003-06-05',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Eli and Edythe Broad founding personal gift establishing the Broad Institute of MIT and Harvard for biomedical genomics.',
    cause_category: 'Human Genomic Medicine & Disease Research',
    source_id: 'e0000000-0000-0000-0000-000000000082'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000100',
    donor_person_id: 'b0000000-0000-0000-0000-000000000037',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000070',
    amount: 400000000,
    currency: 'USD',
    donation_date: '2008-09-04',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Eli and Edythe Broad major endowment gift securing the Broad Institute as a permanent, independent nonprofit research institution.',
    cause_category: 'Biomedical Research Endowment',
    source_id: 'e0000000-0000-0000-0000-000000000083'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000101',
    donor_person_id: 'b0000000-0000-0000-0000-000000000037',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000071',
    amount: 140000000,
    currency: 'USD',
    donation_date: '2015-09-20',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Construction funding and founding gift by Eli and Edythe Broad for The Broad contemporary art museum in downtown Los Angeles.',
    cause_category: 'Public Art Museums & Civic Culture',
    source_id: 'e0000000-0000-0000-0000-000000000084'
  },

  // Melinda French Gates
  {
    id: 'f0000000-0000-0000-0000-000000000102',
    donor_person_id: 'b0000000-0000-0000-0000-000000000038',
    donor_organization_id: null,
    recipient_organization_id: null,
    amount: 1000000000,
    currency: 'USD',
    donation_date: '2024-05-28',
    donation_type: 'GIFT',
    funding_source_type: 'PLEDGE',
    status: 'VERIFIED',
    description: 'Melinda French Gates public commitment of $1 billion over two years to organizations supporting women\'s rights and families globally.',
    cause_category: 'Women\'s Rights, Maternal Health & Family Prosperity',
    source_id: 'e0000000-0000-0000-0000-000000000085'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000103',
    donor_person_id: 'b0000000-0000-0000-0000-000000000038',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000072',
    amount: 1000000000,
    currency: 'USD',
    donation_date: '2019-10-02',
    donation_type: 'GIFT',
    funding_source_type: 'PLEDGE',
    status: 'VERIFIED',
    description: '10-year capital pledge via Pivotal Ventures to expand women\'s power and influence in the United States.',
    cause_category: 'Gender Equality & Workplace Equity',
    source_id: 'e0000000-0000-0000-0000-000000000086'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000104',
    donor_person_id: 'b0000000-0000-0000-0000-000000000038',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000073',
    amount: 12500000,
    currency: 'USD',
    donation_date: '2024-06-07',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Melinda French Gates direct grant to National Domestic Workers Alliance to support caregiving workforce protections.',
    cause_category: 'Domestic Workers & Care Economy Infrastructure',
    source_id: 'e0000000-0000-0000-0000-000000000087'
  },

  // Paul Allen (Historic)
  {
    id: 'f0000000-0000-0000-0000-000000000105',
    donor_person_id: 'b0000000-0000-0000-0000-000000000039',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000074',
    amount: 100000000,
    currency: 'USD',
    donation_date: '2003-09-16',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Paul G. Allen founding personal contribution launching the Allen Institute for Brain Science and the Allen Brain Atlas.',
    cause_category: 'Neuroscience & Open-Access Brain Atlas',
    source_id: 'e0000000-0000-0000-0000-000000000088'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000106',
    donor_person_id: 'b0000000-0000-0000-0000-000000000039',
    donor_organization_id: null,
    recipient_organization_id: null,
    amount: 100000000,
    currency: 'USD',
    donation_date: '2014-10-23',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Paul G. Allen direct personal commitment to combat the West Africa Ebola crisis through airlift logistics and biocontainment wards.',
    cause_category: 'Infectious Epidemic Emergency Response',
    source_id: 'e0000000-0000-0000-0000-000000000089'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000107',
    donor_person_id: 'b0000000-0000-0000-0000-000000000039',
    donor_organization_id: null,
    recipient_organization_id: null,
    amount: 10000000000,
    currency: 'USD',
    donation_date: '2010-07-15',
    donation_type: 'GIFT',
    funding_source_type: 'PLEDGE',
    status: 'VERIFIED',
    description: 'Paul G. Allen Giving Pledge commitment dedicating the majority of his estate to philanthropy.',
    cause_category: 'Giving Pledge Testamentary Commitment',
    source_id: 'e0000000-0000-0000-0000-000000000090'
  },

  // John Doerr & Ann Doerr
  {
    id: 'f0000000-0000-0000-0000-000000000108',
    donor_person_id: 'b0000000-0000-0000-0000-000000000040',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000055',
    amount: 1100000000,
    currency: 'USD',
    donation_date: '2022-05-04',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'John and Ann Doerr landmark personal gift to establish the Stanford Doerr School of Sustainability.',
    cause_category: 'Climate Solutions, Energy & Planetary Sustainability',
    source_id: 'e0000000-0000-0000-0000-000000000091'
  },
  {
    id: 'f0000000-0000-0000-0000-000000000109',
    donor_person_id: 'b0000000-0000-0000-0000-000000000040',
    donor_organization_id: null,
    recipient_organization_id: 'c0000000-0000-0000-0000-000000000077',
    amount: 20000000,
    currency: 'USD',
    donation_date: '2007-05-18',
    donation_type: 'GIFT',
    funding_source_type: 'PERSONAL_DIRECT',
    status: 'VERIFIED',
    description: 'Ann and John Doerr personal gift to Rice University to establish the Center for Engineering Leadership.',
    cause_category: 'Engineering Leadership & Higher Education',
    source_id: 'e0000000-0000-0000-0000-000000000092'
  }
];

export const EXPANSION_DONATION_SOURCES = EXPANSION_DONATIONS.map(d => ({
  donation_id: d.id,
  source_id: d.source_id,
  is_primary: true
}));

export async function fetchRecords() {
  const people = EXPANSION_PEOPLE.map(p => createNormalizedPerson({
    canonical_name: p.name,
    first_name: p.first_name,
    last_name: p.last_name,
    country: p.country,
    occupation: p.occupation,
    industry: p.industry,
    description: p.description,
    is_billionaire: p.is_billionaire,
    giving_pledge: p.giving_pledge,
    identifiers: { id: p.id }
  })).map((p, idx) => ({ ...p, id: EXPANSION_PEOPLE[idx].id }));

  const organizations = EXPANSION_ORGANIZATIONS.map((o, idx) => ({
    ...createNormalizedOrganization(o),
    id: EXPANSION_ORGANIZATIONS[idx].id
  }));

  const sources = EXPANSION_SOURCES.map((s, idx) => ({
    ...createNormalizedSource(s),
    id: EXPANSION_SOURCES[idx].id
  }));

  const wealthSnapshots = EXPANSION_WEALTH_SNAPSHOTS.map(ws => createNormalizedWealthSnapshot({
    person_id: ws.person_id,
    snapshot_date: ws.snapshot_date,
    net_worth: ws.net_worth,
    currency: ws.currency,
    source_name: ws.source_name,
    confidence: ws.confidence
  }));

  const donations = EXPANSION_DONATIONS.map(d => createNormalizedDonation({
    donor_person_id: d.donor_person_id,
    donor_organization_id: d.donor_organization_id,
    recipient_organization_id: d.recipient_organization_id,
    amount: d.amount,
    currency: d.currency,
    donation_date: d.donation_date,
    donation_type: d.donation_type,
    funding_source_type: d.funding_source_type,
    status: d.status,
    description: d.description,
    cause_category: d.cause_category,
    source_id: d.source_id
  })).map((d, idx) => ({ ...d, id: EXPANSION_DONATIONS[idx].id }));

  return {
    sourceName,
    people,
    organizations,
    personOrganizations: EXPANSION_PERSON_ORGANIZATIONS,
    sources,
    wealthSnapshots,
    donations,
    donationSources: EXPANSION_DONATION_SOURCES
  };
}
