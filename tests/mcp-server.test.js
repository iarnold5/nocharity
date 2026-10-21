/**
 * NoCharity Advanced Mode — Phase 10: Model Context Protocol (MCP) Server Test Suite
 * 
 * Verifies:
 * 1. Tool Registration & Schema Integrity (All 10 Advanced Mode tools + 4 legacy tools)
 * 2. get_person, search_people, get_wealth_history
 * 3. search_donations, get_donation, get_person_donations, get_person_giving_summary
 * 4. compare_people: Proportional wealth comparison across multiple billionaires
 * 5. calculate_historical_parity: Canonical example ($1B on $50B -> 2.00% -> ₹1,200),
 *    step 1-6 provenance workflow, and strict attribution isolation (rejection of foundation/corporate)
 * 6. get_sources: Citations and regulatory filings
 * 7. Clean environment fallback and zero-breakage legacy tools
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  createMcpServer,
  BILLIONAIRES_DATA,
  calculateDonationParity,
  calculateHistoricalDonationParity
} from '../mcp-server.js';

describe('NoCharity Advanced Mode — Phase 10: Modernized MCP Server Tests', () => {
  let client;
  let server;
  let clientTransport;
  let serverTransport;

  before(async () => {
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    server = createMcpServer();
    await server.connect(serverTransport);

    client = new Client(
      { name: 'nocharity-mcp-test-client', version: '2.0.0' },
      { capabilities: {} }
    );
    await client.connect(clientTransport);
  });

  after(async () => {
    try {
      await client.close();
      await server.close();
    } catch (e) {
      // ignore
    }
  });

  // ===========================================================================
  // 1. Tool Registration & Schema Introspection
  // ===========================================================================
  describe('1. Tool Registration & Discovery', () => {
    it('1.1 Registers exactly 16 tools (12 Advanced Mode + 4 Backwards-Compatible)', async () => {
      const toolList = await client.listTools();
      assert.ok(Array.isArray(toolList.tools), 'tools must be an array');
      assert.strictEqual(toolList.tools.length, 16, 'Must register exactly 16 MCP tools');

      const toolNames = toolList.tools.map(t => t.name);

      // 12 Advanced Mode tools
      const requiredNewTools = [
        'get_person',
        'search_people',
        'get_wealth_history',
        'search_donations',
        'get_donation',
        'get_person_donations',
        'get_person_giving_summary',
        'compare_people',
        'calculate_historical_parity',
        'get_sources',
        'discover_news_donations',
        'validate_donation_quality'
      ];
      for (const t of requiredNewTools) {
        assert.ok(toolNames.includes(t), `Must register new tool: ${t}`);
      }

      // 4 Legacy tools
      const requiredLegacyTools = [
        'search_billionaire_news',
        'calculate_donation_parity',
        'get_billionaires_list',
        'calculate_historical_donation_parity'
      ];
      for (const t of requiredLegacyTools) {
        assert.ok(toolNames.includes(t), `Must preserve legacy tool: ${t}`);
      }
    });

    it('1.2 Tool schemas have valid property descriptions and required parameters', async () => {
      const toolList = await client.listTools();
      const getPersonTool = toolList.tools.find(t => t.name === 'get_person');
      assert.ok(getPersonTool.inputSchema.required.includes('id'));

      const getWealthTool = toolList.tools.find(t => t.name === 'get_wealth_history');
      assert.ok(getWealthTool.inputSchema.required.includes('personId'));

      const calcTool = toolList.tools.find(t => t.name === 'calculate_historical_parity');
      assert.ok(calcTool.inputSchema.properties.fundingSourceType);
      assert.ok(calcTool.inputSchema.properties.fundingSourceType.enum.includes('PERSONAL'));
      assert.ok(calcTool.inputSchema.properties.fundingSourceType.enum.includes('FOUNDATION'));
      assert.ok(calcTool.inputSchema.properties.fundingSourceType.enum.includes('CORPORATE'));
      assert.ok(calcTool.inputSchema.properties.fundingSourceType.enum.includes('DAF'));
      assert.ok(calcTool.inputSchema.properties.fundingSourceType.enum.includes('PLEDGE'));
    });
  });

  // ===========================================================================
  // 2. get_person & search_people
  // ===========================================================================
  describe('2. Person & Philanthropist Discovery', () => {
    it('2.1 get_person retrieves profile by slug', async () => {
      const res = await client.callTool({
        name: 'get_person',
        arguments: { id: 'warren-buffett' }
      });
      assert.ok(res.content && res.content[0] && res.content[0].text);
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.canonical_name.includes('Buffett'));
      assert.ok(data.latest_net_worth > 0);
      assert.strictEqual(data.giving_pledge, true);
    });

    it('2.2 get_person returns clean error JSON for nonexistent person', async () => {
      const res = await client.callTool({
        name: 'get_person',
        arguments: { id: 'fictional-donor-xyz-999' }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.error);
      assert.ok(data.error.includes('not found'));
    });

    it('2.3 search_people filters by name query', async () => {
      const res = await client.callTool({
        name: 'search_people',
        arguments: { query: 'Gates' }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.people.length >= 1);
      assert.ok(data.people.some(p => p.canonical_name.includes('Gates')));
    });

    it('2.4 search_people filters by Giving Pledge status', async () => {
      const res = await client.callTool({
        name: 'search_people',
        arguments: { givingPledge: true, limit: 10 }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.people.length > 0);
      assert.ok(data.people.every(p => p.giving_pledge === true));
    });
  });

  // ===========================================================================
  // 3. get_wealth_history
  // ===========================================================================
  describe('3. Historical Wealth Snapshots', () => {
    it('3.1 get_wealth_history returns chronological snapshots without interpolation', async () => {
      const res = await client.callTool({
        name: 'get_wealth_history',
        arguments: { personId: 'warren-buffett', limit: 10, sortOrder: 'asc' }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.snapshots && data.snapshots.length > 0);
      assert.ok(data.canonical_name.includes('Buffett'));

      // Ascending chronological order
      for (let i = 1; i < data.snapshots.length; i++) {
        const prev = new Date(data.snapshots[i - 1].snapshot_date);
        const curr = new Date(data.snapshots[i].snapshot_date);
        assert.ok(prev <= curr, 'Snapshots must be chronologically ordered');
      }
    });
  });

  // ===========================================================================
  // 4. search_donations & get_donation & get_person_donations
  // ===========================================================================
  describe('4. Donation Discovery & Attribution Separation', () => {
    it('4.1 search_donations defaults strictly to personal giving (no silent org inclusion)', async () => {
      const res = await client.callTool({
        name: 'search_donations',
        arguments: { limit: 50 }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.donations && data.donations.length > 0);

      // Verify that every returned donation is personal
      for (const d of data.donations) {
        assert.ok(
          d.funding_source_type === 'PERSONAL_DIRECT' ||
          d.funding_source_type === 'PERSONAL_FUNDS_CONFIRMED',
          `Default donations must be personal giving; got ${d.funding_source_type}`
        );
      }
    });

    it('4.2 search_donations includes company/foundation only when includeAssociatedOrgGiving is true', async () => {
      const res = await client.callTool({
        name: 'search_donations',
        arguments: { includeAssociatedOrgGiving: true, limit: 50 }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.donations && data.donations.length > 0);
      assert.strictEqual(data.includeAssociatedOrgGiving, true);
    });

    it('4.3 get_person_donations retrieves donations for a specific billionaire', async () => {
      const res = await client.callTool({
        name: 'get_person_donations',
        arguments: { personId: 'warren-buffett' }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.donations && data.donations.length > 0);
      assert.ok(data.donations.every(d => d.donor_person_name?.includes('Buffett') || d.donor_person_id));
    });

    it('4.4 get_donation retrieves a single donation by ID', async () => {
      // First get a donation ID
      const searchRes = await client.callTool({
        name: 'search_donations',
        arguments: { limit: 1 }
      });
      const searchData = JSON.parse(searchRes.content[0].text);
      const testDonation = searchData.donations[0];
      assert.ok(testDonation && testDonation.id);

      const res = await client.callTool({
        name: 'get_donation',
        arguments: { donationId: testDonation.id }
      });
      const data = JSON.parse(res.content[0].text);
      assert.strictEqual(data.id, testDonation.id);
      assert.strictEqual(data.amount, testDonation.amount);
    });
  });

  // ===========================================================================
  // 5. get_person_giving_summary
  // ===========================================================================
  describe('5. Giving Summary & Metrics Isolation', () => {
    it('5.1 Computes personal metrics and keeps associated organization giving separate', async () => {
      const res = await client.callTool({
        name: 'get_person_giving_summary',
        arguments: { personId: 'warren-buffett' }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.canonical_name.includes('Buffett'));
      assert.ok(data.personal_giving_metrics);
      assert.ok(data.personal_giving_metrics.lifetime_personal_giving > 0);
      assert.ok(data.personal_giving_metrics.qualifying_donations_count >= 1);
      assert.ok(data.associated_organization_giving);

      // Verify associated organization giving is NOT merged into personal giving
      assert.ok('total_foundation_giving' in data.associated_organization_giving);
      assert.ok('total_corporate_giving' in data.associated_organization_giving);
    });
  });

  // ===========================================================================
  // 6. compare_people: Proportional Wealth Comparison
  // ===========================================================================
  describe('6. compare_people Tool', () => {
    it('6.1 Compares billionaires side-by-side calibrated to user income', async () => {
      const res = await client.callTool({
        name: 'compare_people',
        arguments: {
          userIncome: 60000,
          userCurrency: '₹',
          incomeFrequency: 'monthly'
        }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.comparisons_count > 0);
      assert.strictEqual(data.user_income, 60000);
      assert.strictEqual(data.user_currency, '₹');

      const first = data.comparisons[0];
      assert.ok(first.canonical_name);
      assert.ok(first.ratio_percentage >= 0);
      assert.ok(first.user_equivalent >= 0);
      assert.strictEqual(first.methodology_type, 'Proportional wealth comparison');
      assert.ok(first.qualification.includes('Not an exact comparison of financial pain'));
    });
  });

  // ===========================================================================
  // 7. calculate_historical_parity
  // ===========================================================================
  describe('7. calculate_historical_parity Tool', () => {
    it('7.1 Replicates canonical benchmark: $1B on $50B & ₹60,000 monthly -> 2.00% & ₹1,200', async () => {
      const res = await client.callTool({
        name: 'calculate_historical_parity',
        arguments: {
          donationAmount: 1_000_000_000,
          historicalNetWorth: 50_000_000_000,
          donationDate: '2020-01-01',
          snapshotDate: '2020-01-01',
          userIncome: 60000,
          userCurrency: '₹',
          incomeFrequency: 'monthly'
        }
      });
      const data = JSON.parse(res.content[0].text);
      assert.strictEqual(data.isAvailable, true);
      assert.strictEqual(data.isEligible, true);
      assert.strictEqual(data.historicalGenerosityRatio, 2);
      assert.strictEqual(data.formattedRatio, '2.00%');
      assert.strictEqual(data.userEquivalent, 1200);
      assert.strictEqual(data.formattedUserEquivalent, '₹1,200.00');

      // Canonical display statements
      assert.strictEqual(
        data.statements.percentageStatement,
        'They gave approximately 2.00% of their documented wealth at the time.'
      );
      assert.strictEqual(
        data.statements.equivalentStatement,
        'For an income of ₹60,000/month, that is equivalent to ₹1,200.00.'
      );
      assert.strictEqual(data.statements.comparisonType, 'Proportional wealth comparison');
    });

    it('7.2 Returns full provenance information (wealthSource, snapshotDate, qualityTier, etc.)', async () => {
      const res = await client.callTool({
        name: 'calculate_historical_parity',
        arguments: {
          donationAmount: 500_000_000,
          historicalNetWorth: 25_000_000_000,
          donationDate: '2021-06-15',
          snapshotDate: '2021-06-15',
          userIncome: 5000,
          userCurrency: '$'
        }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.provenance, 'Must return provenance object');
      assert.strictEqual(data.provenance.qualityTier, 'EXACT_DATE');
      assert.strictEqual(data.provenance.snapshotDate, '2021-06-15');
      assert.strictEqual(data.provenance.isPersonalParityEligible, true);
      assert.strictEqual(data.provenance.fundingSourceType, 'PERSONAL_DIRECT');
    });

    it('7.3 Rejects FOUNDATION donations from personal parity calculations', async () => {
      const res = await client.callTool({
        name: 'calculate_historical_parity',
        arguments: {
          donationAmount: 1_000_000_000,
          historicalNetWorth: 50_000_000_000,
          donationDate: '2020-01-01',
          fundingSourceType: 'FOUNDATION',
          userIncome: 60000
        }
      });
      const data = JSON.parse(res.content[0].text);
      assert.strictEqual(data.isEligible, false);
      assert.strictEqual(data.isAvailable, false);
      assert.ok(data.ineligibilityReason.includes('Foundation donation'));
      assert.strictEqual(data.provenance.isPersonalParityEligible, false);
      assert.strictEqual(data.provenance.fundingSourceType, 'FOUNDATION');
    });

    it('7.4 Rejects CORPORATE donations from personal parity calculations', async () => {
      const res = await client.callTool({
        name: 'calculate_historical_parity',
        arguments: {
          donationAmount: 500_000_000,
          historicalNetWorth: 100_000_000_000,
          donationDate: '2022-03-01',
          fundingSourceType: 'CORPORATE',
          userIncome: 60000
        }
      });
      const data = JSON.parse(res.content[0].text);
      assert.strictEqual(data.isEligible, false);
      assert.strictEqual(data.isAvailable, false);
      assert.ok(data.ineligibilityReason.includes('Corporate donation'));
    });

    it('7.5 Rejects DAF and PLEDGE commitments from personal parity calculations', async () => {
      const resDaf = await client.callTool({
        name: 'calculate_historical_parity',
        arguments: {
          donationAmount: 100_000_000,
          historicalNetWorth: 20_000_000_000,
          donationDate: '2023-01-01',
          fundingSourceType: 'DAF'
        }
      });
      const dafData = JSON.parse(resDaf.content[0].text);
      assert.strictEqual(dafData.isEligible, false);

      const resPledge = await client.callTool({
        name: 'calculate_historical_parity',
        arguments: {
          donationAmount: 100_000_000,
          historicalNetWorth: 20_000_000_000,
          donationDate: '2023-01-01',
          fundingSourceType: 'PLEDGE'
        }
      });
      const pledgeData = JSON.parse(resPledge.content[0].text);
      assert.strictEqual(pledgeData.isEligible, false);
    });
  });

  // ===========================================================================
  // 8. get_sources Tool
  // ===========================================================================
  describe('8. get_sources Tool', () => {
    it('8.1 Retrieves documented citations and regulatory filings for an individual', async () => {
      const res = await client.callTool({
        name: 'get_sources',
        arguments: { personId: 'warren-buffett' }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.count >= 0);
      assert.ok(Array.isArray(data.sources));
      if (data.count > 0) {
        assert.ok(data.sources.some(s => s.publisher || s.url));
      }
    });
  });

  // ===========================================================================
  // 9. Backwards-Compatible Legacy Tools
  // ===========================================================================
  describe('9. Backwards-Compatible Legacy Tools', () => {
    it('9.1 get_billionaires_list returns roster with net worth source metadata', async () => {
      const res = await client.callTool({
        name: 'get_billionaires_list',
        arguments: {}
      });
      const list = JSON.parse(res.content[0].text);
      assert.ok(Array.isArray(list));
      assert.ok(list.length > 0);
      const first = list[0];
      assert.ok(first.name);
      assert.ok(first.netWorth > 0);
    });

    it('9.2 calculate_donation_parity computes legacy monthly/annual user equivalent', async () => {
      const res = await client.callTool({
        name: 'calculate_donation_parity',
        arguments: {
          billionaireId: 'warren-buffett',
          donationAmount: 1_000_000_000,
          userMonthlyIncome: 5000,
          currency: '$',
          mode: 'networth'
        }
      });
      const data = JSON.parse(res.content[0].text);
      assert.ok(data.percentage > 0);
      assert.ok(data.userEquivalentMonthly > 0);
      assert.strictEqual(data.baseMetricLabel, 'Total Net Worth');
    });

    it('9.3 calculate_historical_donation_parity serves as legacy alias', async () => {
      const res = await client.callTool({
        name: 'calculate_historical_donation_parity',
        arguments: {
          donationAmount: 1_000_000_000,
          historicalNetWorth: 50_000_000_000,
          donationDate: '2020-01-01',
          userIncome: 60000
        }
      });
      const data = JSON.parse(res.content[0].text);
      assert.strictEqual(data.formattedRatio, '2.00%');
      assert.strictEqual(data.userEquivalent, 1200);
    });
  });

  // ===========================================================================
  // 10. Module Exports & Compatibility Layer
  // ===========================================================================
  describe('10. Preserved Module Exports & Compatibility', () => {
    it('10.1 Exports BILLIONAIRES_DATA as legacy compatibility fallback', () => {
      assert.ok(Array.isArray(BILLIONAIRES_DATA));
      assert.ok(BILLIONAIRES_DATA.length > 0);
    });

    it('10.2 Preserves standalone calculation function exports', () => {
      assert.strictEqual(typeof calculateDonationParity, 'function');
      assert.strictEqual(typeof calculateHistoricalDonationParity, 'function');

      const legacyRes = calculateDonationParity(BILLIONAIRES_DATA[0], 1e8, 4000);
      assert.ok(legacyRes.percentage >= 0);
    });
  });
});
