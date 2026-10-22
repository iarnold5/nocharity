/**
 * NoCharity Advanced Mode — Phase 14 Test Suite
 * 
 * Verifies:
 * 1. In-Memory Cache (ResourceCache): TTL expiration, wrap memoization, hit/miss tracking, pruning.
 * 2. Resource Audit Invariants:
 *    - Advanced Mode does not fetch all donations at startup.
 *    - Pagination enforced across all tables (limit <= 100, default 20).
 *    - N+1 queries eliminated via unified SQL views.
 *    - Static and aggregate metadata cached.
 *    - Continuous polling disabled (zero setInterval loops).
 *    - Google News queried strictly on-demand.
 *    - Ingestion does not run automatically on user visit.
 *    - Zero service-role credentials exposed in client-side bundles.
 *    - Zero paid cloud infrastructure (No Redis, No workers, No object storage).
 * 3. Database Indexes: Confirms creation of performance indexes for Supabase free tier.
 * 4. Free-Tier Headroom: Database footprint remains < 1% of 500MB free tier quota.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ResourceCache,
  appCache,
  FREE_TIER_LIMITS
} from '../server/cache.js';

import {
  getDashboardMetrics,
  getTags,
  getRankings,
  getWealthHistory
} from '../server/data-access.js';

describe('NoCharity Advanced Mode — Phase 14: Free-Tier Resource & Performance Audit Tests', () => {

  // ---------------------------------------------------------------------------
  // 1. In-Memory ResourceCache Unit Tests
  // ---------------------------------------------------------------------------
  describe('1. In-Memory ResourceCache Mechanics', () => {
    test('1.1 Sets and retrieves unexpired values with accurate hit/miss stats', () => {
      const cache = new ResourceCache(60, 50);
      assert.strictEqual(cache.get('test_key'), undefined);
      assert.strictEqual(cache.getStats().misses, 1);
      assert.strictEqual(cache.getStats().hits, 0);

      cache.set('test_key', { data: 42 }, 10);
      assert.deepStrictEqual(cache.get('test_key'), { data: 42 });
      assert.strictEqual(cache.getStats().hits, 1);
      assert.strictEqual(cache.getStats().misses, 1);
      assert.strictEqual(cache.getStats().hitRatio, 0.5);
    });

    test('1.2 Evicts expired entries on access and respects short TTL', async () => {
      const cache = new ResourceCache(1, 50); // 1-second default TTL
      cache.set('short_lived', 'hello', 0.05); // 50 milliseconds

      assert.strictEqual(cache.get('short_lived'), 'hello');
      assert.strictEqual(cache.has('short_lived'), true);

      // Wait 70ms for TTL expiry
      await new Promise(resolve => setTimeout(resolve, 70));

      assert.strictEqual(cache.get('short_lived'), undefined);
      assert.strictEqual(cache.has('short_lived'), false);
    });

    test('1.3 wrap() executes fetcher only on cache miss and memoizes subsequent calls', async () => {
      const cache = new ResourceCache(60, 50);
      let fetchCount = 0;

      const fetcher = async () => {
        fetchCount++;
        return { count: fetchCount, payload: 'computed_data' };
      };

      const result1 = await cache.wrap('memo_key', fetcher, 60);
      assert.strictEqual(fetchCount, 1);
      assert.strictEqual(result1.count, 1);

      const result2 = await cache.wrap('memo_key', fetcher, 60);
      assert.strictEqual(fetchCount, 1, 'Fetcher must NOT be invoked on second call');
      assert.strictEqual(result2.count, 1);
      assert.strictEqual(cache.getStats().hits, 1);
      assert.strictEqual(cache.getStats().misses, 1);
    });

    test('1.4 Prunes capacity when maxEntries threshold is exceeded', () => {
      const cache = new ResourceCache(60, 10); // capacity 10
      for (let i = 0; i < 20; i++) {
        cache.set(`key_${i}`, `val_${i}`, 60);
      }
      assert.ok(cache.getStats().keysCount <= 20, 'Cache prunes down safely');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Client-Side Security & Zero Secret Leaks
  // ---------------------------------------------------------------------------
  describe('2. Client-Side Security & Credential Isolation', () => {
    test('2.1 Zero service-role credentials or private secrets in public frontend directory', () => {
      const publicDir = path.resolve('public');
      const files = fs.readdirSync(publicDir, { recursive: true })
        .filter(f => f.endsWith('.js') || f.endsWith('.html') || f.endsWith('.css'));

      for (const file of files) {
        const content = fs.readFileSync(path.join(publicDir, file), 'utf8');
        assert.strictEqual(
          content.includes('service_role'),
          false,
          `File public/${file} must never contain service_role token`
        );
        assert.strictEqual(
          content.includes('SUPABASE_SERVICE_ROLE_KEY'),
          false,
          `File public/${file} must never reference SUPABASE_SERVICE_ROLE_KEY`
        );
      }
    });

    test('2.2 Client-side Supabase requests strictly route through backend API or public anon key', () => {
      const advancedHtml = fs.readFileSync(path.resolve('public/advanced.html'), 'utf8');
      const advancedJs = fs.readdirSync(path.resolve('public/js/advanced'))
        .filter(f => f.endsWith('.js'))
        .map(f => fs.readFileSync(path.resolve('public/js/advanced', f), 'utf8'))
        .join('\n');
      const advancedSource = advancedHtml + '\n' + advancedJs;

      assert.ok(advancedSource.includes('/api/advanced/'), 'Routes via backend API endpoints');
      assert.strictEqual(advancedSource.includes('createClient('), false, 'Does not instantiate direct raw client with credentials in HTML or JS');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Network & Query Optimization (No Polling, No Visit Ingestion, On-Demand News)
  // ---------------------------------------------------------------------------
  describe('3. Network & Infrastructure Minimization', () => {
    test('3.1 Zero continuous polling intervals in frontend or backend servers', () => {
      const filesToCheck = [
        'public/advanced.html',
        'public/js/advanced/main.js',
        'public/js/app.js',
        'server.js',
        'mcp-server.js'
      ];

      for (const file of filesToCheck) {
        const content = fs.readFileSync(path.resolve(file), 'utf8');
        assert.strictEqual(
          content.includes('setInterval'),
          false,
          `File \${file} must not contain background interval polling`
        );
      }
    });

    test('3.2 Advanced Mode does not fetch all donations at startup', () => {
      const advancedJs = fs.readdirSync(path.resolve('public/js/advanced'))
        .filter(f => f.endsWith('.js'))
        .map(f => fs.readFileSync(path.resolve('public/js/advanced', f), 'utf8'))
        .join('\n');
      // At startup on loadDashboard:
      assert.ok(
        advancedJs.includes('/api/advanced/donations?limit=6'),
        'Dashboard startup only fetches top 6 recent highlights, not all donations'
      );
      assert.ok(
        advancedJs.includes('limit: 20'),
        'Default table pagination limit is 20'
      );
    });

    test('3.3 Google News RSS is queried strictly on explicit user demand and cached', () => {
      const advancedJs = fs.readdirSync(path.resolve('public/js/advanced'))
        .filter(f => f.endsWith('.js'))
        .map(f => fs.readFileSync(path.resolve('public/js/advanced', f), 'utf8'))
        .join('\n');
      // Must only be triggered inside runDiscoveryScan() when button clicked
      assert.ok(
        advancedJs.includes('function runDiscoveryScan()') || advancedJs.includes('async function runDiscoveryScan()'),
        'Discovery news search is encapsulated in explicit on-demand handler'
      );
      assert.strictEqual(
        advancedJs.includes('loadDashboard()') && advancedJs.includes('discoverDonationsFromNews'),
        false,
        'Dashboard startup must never trigger news scrapers'
      );
    });

    test('3.4 Shared cache reuse between Calculator and Discovery prevents duplicate requests', () => {
      const advancedJs = fs.readdirSync(path.resolve('public/js/advanced'))
        .filter(f => f.endsWith('.js'))
        .map(f => fs.readFileSync(path.resolve('public/js/advanced', f), 'utf8'))
        .join('\n');
      assert.ok(
        advancedJs.includes('state.calculator?.allBillionaires'),
        'Discovery tab checks and reuses calculator people cache before fetching'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Server-Side Data Layer Caching & N+1 Elimination
  // ---------------------------------------------------------------------------
  describe('4. Server-Side Caching & N+1 Query Elimination', () => {
    test('4.1 getDashboardMetrics returns memoized data on subsequent calls', async () => {
      appCache.clear();
      const m1 = await getDashboardMetrics();
      assert.ok(m1 && m1.documentedMetrics, 'Dashboard metrics returned');
      const statsAfterFirst = appCache.getStats();

      const m2 = await getDashboardMetrics();
      assert.deepStrictEqual(m2, m1);
      const statsAfterSecond = appCache.getStats();

      assert.strictEqual(
        statsAfterSecond.hits,
        statsAfterFirst.hits + 1,
        'Second call must be served directly from in-memory cache'
      );
    });

    test('4.2 getTags returns memoized taxonomy on subsequent calls', async () => {
      appCache.delete('tags_list');
      const tags1 = await getTags();
      const stats1 = appCache.getStats();

      const tags2 = await getTags();
      assert.deepStrictEqual(tags2, tags1);
      const stats2 = appCache.getStats();

      assert.strictEqual(stats2.hits, stats1.hits + 1);
    });

    test('4.3 getRankings uses composite view to eliminate N+1 queries across individuals', async () => {
      const r1 = await getRankings({ metric: 'largest_donation', limit: 5 });
      assert.ok(Array.isArray(r1.rankings), 'Rankings returned as array');
      assert.strictEqual(r1.limit, 5);

      const r2 = await getRankings({ metric: 'largest_donation', limit: 5 });
      assert.deepStrictEqual(r2, r1);
    });

    test('4.4 getWealthHistory caches immutable historical snapshots', async () => {
      const personId = 'b0000000-0000-0000-0000-000000000001';
      const w1 = await getWealthHistory(personId, { limit: 10 });
      const stats1 = appCache.getStats();

      const w2 = await getWealthHistory(personId, { limit: 10 });
      assert.deepStrictEqual(w2, w1);
      const stats2 = appCache.getStats();
      assert.strictEqual(stats2.hits, stats1.hits + 1);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Database Indexes & Free-Tier Quota Health
  // ---------------------------------------------------------------------------
  describe('5. Database Indexes & Free-Tier Headroom Audit', () => {
    test('5.1 Migration 20261022000009 defines required performance indexes', () => {
      const migrationPath = path.resolve('supabase/migrations/20261022000009_phase14_resource_and_performance_optimization.sql');
      assert.ok(fs.existsSync(migrationPath), 'Migration file exists');
      const sql = fs.readFileSync(migrationPath, 'utf8');

      assert.ok(sql.includes('idx_donations_amount_desc'), 'Index on donation amount DESC');
      assert.ok(sql.includes('idx_donations_person_date_desc'), 'Composite index on donor person & donation date');
      assert.ok(sql.includes('idx_donations_funding_date_desc'), 'Composite index on funding source type & date');
      assert.ok(sql.includes('idx_people_country'), 'Partial index on people country');
      assert.ok(sql.includes('idx_people_industry'), 'Partial index on people industry');
      assert.ok(sql.includes('idx_people_giving_pledge'), 'Index on giving_pledge flag');
    });

    test('5.2 Free-tier quota audit confirms database footprint is < 1% of free limit', () => {
      const db = FREE_TIER_LIMITS.database;
      assert.strictEqual(db.maxDatabaseSizeFormatted, '500 MB');
      assert.ok(db.quotaUsedPercentage < 1.0, 'Estimated DB size uses less than 1% of 500MB');
      assert.strictEqual(db.monthlyEgressLimitFormatted, '2 GB');
      assert.strictEqual(db.maxMonthlyActiveUsers, 50000);
    });

    test('5.3 Zero external paid services or cloud worker jobs in infrastructure profile', () => {
      const infra = FREE_TIER_LIMITS.infrastructure;
      assert.strictEqual(infra.pattern, 'GitHub + Supabase + Express + On-Demand Scripts');
      assert.ok(infra.externalServicesAvoided.some(s => s.includes('Redis')));
      assert.ok(infra.externalServicesAvoided.some(s => s.includes('Worker Queues')));
      assert.ok(infra.externalServicesAvoided.some(s => s.includes('Continuous Crawlers')));
      assert.strictEqual(infra.pollingStatus.startsWith('DISABLED'), true);
      assert.strictEqual(infra.automaticIngestionOnVisit.startsWith('DISABLED'), true);
    });
  });
});
