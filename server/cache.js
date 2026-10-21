/**
 * NoCharity Advanced Mode — Phase 14: In-Memory Resource & Cache Layer
 * 
 * Central Mandate:
 * Open-source, free-tier optimization. Keeps NoCharity ultra-inexpensive to operate:
 * 1. Zero external infrastructure dependencies (No Redis, No Memcached, No workers).
 * 2. Caches static & aggregate metadata (dashboard metrics, tags, rankings, wealth history).
 * 3. Prevents repeated identical queries and redundant N+1 roundtrips.
 * 4. Automatic TTL expiration and bounded memory footprint (max 500 entries).
 * 5. Transparent cache statistics reporting for resource audits.
 */

export class ResourceCache {
  /**
   * @param {number} defaultTtlSeconds Default time-to-live in seconds
   * @param {number} maxEntries Maximum items allowed before pruning
   */
  constructor(defaultTtlSeconds = 60, maxEntries = 500) {
    this.defaultTtl = defaultTtlSeconds;
    this.maxEntries = maxEntries;
    this.store = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }

  /**
   * Retrieves a value from the cache if present and unexpired.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      this.stats.misses++;
      return undefined;
    }
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Stores a value in the cache with a specified TTL.
   */
  set(key, value, ttlSeconds = this.defaultTtl) {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.store.set(key, { value, expiry });
    this.stats.sets++;

    if (this.store.size > this.maxEntries) {
      this.prune();
    }
    return value;
  }

  /**
   * Wraps an async fetcher function: returns cached data or computes, caches, and returns.
   */
  async wrap(key, fetcherFn, ttlSeconds = this.defaultTtl) {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const fresh = await fetcherFn();
    this.set(key, fresh, ttlSeconds);
    return fresh;
  }

  /**
   * Checks if an unexpired key exists.
   */
  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Deletes a specific key.
   */
  delete(key) {
    const deleted = this.store.delete(key);
    if (deleted) this.stats.deletes++;
    return deleted;
  }

  /**
   * Clears the entire cache.
   */
  clear() {
    this.store.clear();
  }

  /**
   * Prunes expired entries, and evicts oldest items if capacity exceeded.
   */
  prune() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
    if (this.store.size > this.maxEntries) {
      const keysToDelete = Array.from(this.store.keys()).slice(0, Math.floor(this.maxEntries * 0.2));
      for (const k of keysToDelete) {
        this.store.delete(k);
      }
    }
  }

  /**
   * Returns live operational cache metrics for resource auditing.
   */
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRatio = totalRequests > 0 ? (this.stats.hits / totalRequests) : 0;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      deletes: this.stats.deletes,
      totalRequests,
      hitRatio: Number(hitRatio.toFixed(4)),
      keysCount: this.store.size,
      maxEntries: this.maxEntries,
      defaultTtlSeconds: this.defaultTtl
    };
  }
}

// Global shared cache instance
export const appCache = new ResourceCache(60, 500);

/**
 * Free-Tier Quota & Footprint Audit Profile
 */
export const FREE_TIER_LIMITS = Object.freeze({
  database: {
    service: 'Supabase Free Tier (PostgreSQL)',
    maxDatabaseSizeBytes: 500 * 1024 * 1024, // 500 MB
    maxDatabaseSizeFormatted: '500 MB',
    estimatedCurrentDatabaseSizeBytes: 2.8 * 1024 * 1024, // ~2.8 MB
    estimatedCurrentDatabaseSizeFormatted: '2.8 MB',
    quotaUsedPercentage: 0.56, // < 1%
    maxConnectionsPooled: 60,
    maxConnectionsDirect: 15,
    maxMonthlyActiveUsers: 50000,
    monthlyEgressLimitBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    monthlyEgressLimitFormatted: '2 GB'
  },
  infrastructure: {
    stackType: 'Minimalist Open-Source Architecture',
    pattern: 'GitHub + Supabase + Express + On-Demand Scripts',
    externalServicesAvoided: [
      'Redis Cache Cluster (Replaced by In-Memory ResourceCache)',
      'Background Worker Queues (e.g. BullMQ / Celery)',
      'Continuous Crawlers (Replaced by On-Demand News Discovery)',
      'Object Storage (Using clean public source URLs & SVGs)',
      'Heavy Analytics Server (Replaced by zero-storage SQL views)'
    ],
    pollingStatus: 'DISABLED (Zero continuous interval timers)',
    automaticIngestionOnVisit: 'DISABLED (Ingestion is strictly on-demand via CLI)',
    clientServiceRoleKey: 'NONE (Client uses public anon key or Express proxy)'
  },
  paginationStandards: {
    defaultLimit: 20,
    maxLimit: 100,
    startupDonationFetchLimit: 6,
    donationsFetchMode: 'Paginated On-Demand',
    avoidNPlusOne: 'Enforced via SQL Views (v_donations_with_parity, v_person_giving_summary)'
  }
});
