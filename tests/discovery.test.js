/**
 * NoCharity Advanced Mode — Phase 11: News Discovery Engine & Candidate Review Tests
 * 
 * Verifies:
 * 1. Google News is a DISCOVERY mechanism, not the authoritative database.
 * 2. News results are NEVER automatically marked VERIFIED.
 * 3. News results are NEVER automatically counted as confirmed personal giving.
 * 4. Extracted candidate records carry explicit verification badge:
 *    "Potential donation — verification required"
 * 5. Extraction engine: amount parsing with confidence, recipient detection, donor matching.
 * 6. Funding source classifier distinguishes: PERSONAL_DIRECT, FOUNDATION, CORPORATE, DAF, PLEDGE, UNKNOWN_SOURCE.
 * 7. Lightweight Maintainer Workflow: review → classify → verify → insert (dry-run and live).
 * 8. MCP server tools: discover_news_donations vs search_billionaire_news (backwards compatibility).
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import {
  createMcpServer,
  BILLIONAIRES_DATA
} from '../mcp-server.js';
import {
  extractDonationAmount,
  extractRecipient,
  classifyCandidateFundingSource,
  matchTrackedDonor,
  extractDiscoveredDonation,
  discoverDonationsFromNews,
  DISCOVERY_LABEL,
  DISCOVERY_STATUS
} from '../server/discovery-engine.js';
import { reviewAndVerifyCandidate } from '../scripts/review-discovery.js';

describe('NoCharity Advanced Mode — Phase 11: News Discovery Engine & Workflow Tests', () => {

  // ===========================================================================
  // 1. Amount Extraction Engine & Confidence Scoring
  // ===========================================================================
  describe('1. Amount Extraction Engine & Confidence Scoring', () => {
    it('1.1 Accurately parses billions with HIGH confidence on donation verbs', () => {
      const text = 'Warren Buffett donates $5.3 billion of Berkshire stock to five charities';
      const result = extractDonationAmount(text);
      assert.strictEqual(result.amount, 5300000000);
      assert.strictEqual(result.formatted, '$5.3 Billion');
      assert.strictEqual(result.confidence, 'HIGH');
    });

    it('1.2 Accurately parses millions shorthand ($100M)', () => {
      const text = 'Tech entrepreneur gives $100M to university medical center';
      const result = extractDonationAmount(text);
      assert.strictEqual(result.amount, 100000000);
      assert.strictEqual(result.formatted, '$100 Million');
      assert.strictEqual(result.confidence, 'HIGH');
    });

    it('1.3 Accurately parses thousands and commas ($500,000)', () => {
      const text = 'Local billionaire gifts $500 thousand to community food bank';
      const result = extractDonationAmount(text);
      assert.strictEqual(result.amount, 500000);
      assert.strictEqual(result.formatted, '$500 Thousand');
    });

    it('1.4 Assigns MEDIUM confidence when amount appears without donation verbs', () => {
      const text = 'Company valued at $1.5 billion according to market report';
      const result = extractDonationAmount(text);
      assert.strictEqual(result.amount, 1500000000);
      assert.strictEqual(result.confidence, 'MEDIUM');
    });

    it('1.5 Gracefully handles headlines without explicit numeric amounts', () => {
      const text = 'Philanthropist signs Giving Pledge and pledges majority of fortune';
      const result = extractDonationAmount(text);
      assert.strictEqual(result.amount, null);
      assert.strictEqual(result.formatted, 'Unspecified Amount');
      assert.strictEqual(result.confidence, 'NONE');
    });
  });

  // ===========================================================================
  // 2. Candidate Funding Source Classifier
  // ===========================================================================
  describe('2. Candidate Funding Source Classifier', () => {
    it('2.1 Classifies commitments as PLEDGE rather than completed transfers', () => {
      const text = 'Billionaire pledges $1 billion to climate change over next decade';
      assert.strictEqual(classifyCandidateFundingSource(text), 'PLEDGE');
    });

    it('2.2 Classifies foundation grants as FOUNDATION', () => {
      const text = 'Bill & Melinda Gates Foundation awards $250M for global vaccine initiative';
      assert.strictEqual(classifyCandidateFundingSource(text), 'FOUNDATION');
    });

    it('2.3 Classifies company treasury gifts as CORPORATE', () => {
      const text = 'Microsoft announced corporate donation of $50M for AI education';
      assert.strictEqual(classifyCandidateFundingSource(text), 'CORPORATE');
    });

    it('2.4 Classifies DAF transfers as DAF', () => {
      const text = 'Billionaire directs $20M gift through Fidelity Charitable donor-advised fund';
      assert.strictEqual(classifyCandidateFundingSource(text), 'DAF');
    });

    it('2.5 Classifies explicit individual giving as PERSONAL_DIRECT', () => {
      const text = 'Investor contributes $100M from his personal wealth to cancer research';
      assert.strictEqual(classifyCandidateFundingSource(text), 'PERSONAL_DIRECT');
    });

    it('2.6 Defaults to UNKNOWN_SOURCE for ambiguous or unverified media text', () => {
      const text = 'Philanthropy update: new initiatives launched across education sector';
      assert.strictEqual(classifyCandidateFundingSource(text), 'UNKNOWN_SOURCE');
    });
  });

  // ===========================================================================
  // 3. Recipient and Donor Extraction
  // ===========================================================================
  describe('3. Recipient and Donor Extraction', () => {
    it('3.1 Extracts recipient following "to [Recipient]" syntax', () => {
      const text = 'MacKenzie Scott donates $640 million to Small Nonprofits Across US';
      const recipient = extractRecipient(text, 'MacKenzie Scott');
      assert.ok(recipient.toLowerCase().includes('small nonprofits'), `Expected Small Nonprofits, got: ${recipient}`);
    });

    it('3.2 Detects well-known institutional foundations as recipients', () => {
      const text = 'Buffett gifts annual Berkshire shares to Gates Foundation';
      const recipient = extractRecipient(text, 'Warren Buffett');
      assert.strictEqual(recipient, 'Bill & Melinda Gates Foundation');
    });

    it('3.3 Accurately matches tracked billionaires from text', () => {
      const text = 'Warren Buffett details new philanthropic distribution plan';
      const donor = matchTrackedDonor(text);
      assert.ok(donor);
      assert.strictEqual(donor.name, 'Warren Buffett');
      assert.strictEqual(donor.matched, true);
    });
  });

  // ===========================================================================
  // 4. Candidate Record Guarantees (The User\'s Core Invariants)
  // ===========================================================================
  describe('4. Candidate Record Guarantees (User-Defined Invariants)', () => {
    const sampleArticle = {
      title: 'Elon Musk gifts $1.9 billion in Tesla shares to charity',
      snippet: 'SEC filing shows Tesla CEO donated approximately 11.6 million shares in late 2022.',
      link: 'https://news.example.com/musk-donation-2022',
      source: 'Reuters',
      pubDate: '2023-02-14'
    };

    it('4.1 Candidate record status is DISCOVERED, NEVER VERIFIED', () => {
      const candidate = extractDiscoveredDonation(sampleArticle);
      assert.strictEqual(candidate.status, DISCOVERY_STATUS.DISCOVERED);
      assert.notStrictEqual(candidate.status, DISCOVERY_STATUS.VERIFIED);
    });

    it('4.2 Candidate is NEVER automatically marked as confirmed personal giving', () => {
      const candidate = extractDiscoveredDonation(sampleArticle);
      assert.strictEqual(candidate.is_confirmed_personal_giving, false);
      assert.strictEqual(candidate.is_authoritative, false);
    });

    it('4.3 Displays mandatory verification badge: "Potential donation — verification required"', () => {
      const candidate = extractDiscoveredDonation(sampleArticle);
      assert.strictEqual(candidate.verification_badge, "Potential donation — verification required");
      assert.strictEqual(DISCOVERY_LABEL, "Potential donation — verification required");
    });

    it('4.4 Preserves all required audit fields (source, date, amount, donor, recipient, funding source)', () => {
      const candidate = extractDiscoveredDonation(sampleArticle);
      assert.strictEqual(candidate.source_publisher, 'Reuters');
      assert.strictEqual(candidate.published_at, '2023-02-14');
      assert.strictEqual(candidate.url, 'https://news.example.com/musk-donation-2022');
      assert.strictEqual(candidate.detected_donor.name, 'Elon Musk');
      assert.strictEqual(candidate.extracted_amount, 1900000000);
      assert.ok(candidate.possible_funding_source);
      assert.ok(candidate.review_workflow);
      assert.strictEqual(candidate.review_workflow.step_1_discovered, true);
      assert.strictEqual(candidate.review_workflow.step_3_verified, false);
    });
  });

  // ===========================================================================
  // 5. Lightweight Maintainer Workflow Pipeline (Review → Classify → Verify → Insert)
  // ===========================================================================
  describe('5. Lightweight Maintainer Workflow (Review → Classify → Verify → Insert)', () => {
    const candidate = {
      candidate_id: 'discovered-test-123',
      headline: 'Warren Buffett donates $5.3 billion to five foundations',
      url: 'https://www.reuters.com/business/buffett-donates-53-billion-2024-06-28/',
      source_publisher: 'Reuters',
      published_at: '2024-06-28',
      detected_donor: { name: 'Warren Buffett', person_id: 'b-warren-buffett' },
      detected_recipient: 'Bill & Melinda Gates Foundation',
      extracted_amount: 5300000000,
      possible_funding_source: 'PERSONAL_DIRECT',
      status: 'DISCOVERED'
    };

    it('5.1 Executes dry-run verification without requiring live database access', async () => {
      const result = await reviewAndVerifyCandidate({
        candidate,
        fundingSourceType: 'PERSONAL_DIRECT',
        status: 'VERIFIED',
        citationUrl: 'https://www.sec.gov/edgar/buffett-form-4',
        citationPublisher: 'SEC EDGAR',
        citationTitle: 'Form 4 Statement of Changes in Beneficial Ownership',
        dryRun: true
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.action, 'simulated_upsert');
      assert.strictEqual(result.verified_record.amount, 5300000000);
      assert.strictEqual(result.verified_record.funding_source_type, 'PERSONAL_DIRECT');
      assert.strictEqual(result.verified_record.status, 'VERIFIED');
      assert.strictEqual(result.verified_record.source.source_type, 'PRIMARY');
      assert.strictEqual(result.verified_record.source.url, 'https://www.sec.gov/edgar/buffett-form-4');
    });

    it('5.2 Allows maintainer to reclassify candidate funding source to FOUNDATION', async () => {
      const result = await reviewAndVerifyCandidate({
        candidate,
        fundingSourceType: 'FOUNDATION',
        status: 'PARTIALLY_VERIFIED',
        citationUrl: 'https://gatesfoundation.org/annual-report',
        dryRun: true
      });

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.verified_record.funding_source_type, 'FOUNDATION');
      assert.strictEqual(result.verified_record.status, 'PARTIALLY_VERIFIED');
    });

    it('5.3 Fails cleanly when candidate record is missing', async () => {
      await assert.rejects(
        async () => {
          await reviewAndVerifyCandidate({ candidate: null });
        },
        /Missing candidate record/
      );
    });
  });

  // ===========================================================================
  // 6. MCP Server Integration: discover_news_donations vs Legacy
  // ===========================================================================
  describe('6. MCP Server discover_news_donations Integration', () => {
    let client;
    let server;
    let clientTransport;
    let serverTransport;

    before(async () => {
      [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      server = createMcpServer();
      await server.connect(serverTransport);

      client = new Client(
        { name: 'nocharity-phase11-test-client', version: '2.0.0' },
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

    it('6.1 discover_news_donations tool is discoverable in tool list', async () => {
      const list = await client.listTools();
      const tool = list.tools.find(t => t.name === 'discover_news_donations');
      assert.ok(tool, 'discover_news_donations must be registered');
      assert.ok(tool.inputSchema.required.includes('billionaireName'));
      assert.ok(tool.description.includes('DISCOVERY mechanism'));
      assert.ok(tool.description.includes('verification required'));
    });

    it('6.2 discover_news_donations executes on-demand and returns structured candidates', async () => {
      const res = await client.callTool({
        name: 'discover_news_donations',
        arguments: {
          billionaireName: 'Warren Buffett',
          timeframe: 'all'
        }
      });

      assert.ok(res.content && res.content[0], 'Result must have text content');
      const data = JSON.parse(res.content[0].text);

      assert.strictEqual(data.source, 'google_news_rss_discovery');
      assert.strictEqual(data.donor_query, 'Warren Buffett');
      assert.strictEqual(data.is_authoritative, false);
      assert.strictEqual(data.status_label, 'Potential donation — verification required');
      assert.ok(Array.isArray(data.candidates));

      // If RSS results were returned, verify each candidate upholds Phase 11 invariants
      if (data.candidates.length > 0) {
        const candidate = data.candidates[0];
        assert.strictEqual(candidate.status, 'DISCOVERED');
        assert.strictEqual(candidate.is_confirmed_personal_giving, false);
        assert.strictEqual(candidate.verification_badge, 'Potential donation — verification required');
        assert.ok(candidate.source_publisher);
      }
    });

    it('6.3 Preserves legacy search_billionaire_news with raw article list', async () => {
      const res = await client.callTool({
        name: 'search_billionaire_news',
        arguments: {
          billionaireName: 'Warren Buffett',
          timeframe: 'past_month'
        }
      });

      assert.ok(res.content && res.content[0]);
      const data = JSON.parse(res.content[0].text);
      assert.strictEqual(data.billionaire, 'Warren Buffett');
      assert.ok(Array.isArray(data.articles), 'Legacy tool returns articles array');
    });
  });

});
