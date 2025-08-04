// In-memory cache implementation for development
// In production, consider using Redis or similar

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired items every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Global cache instance
export const cache = new MemoryCache();

// Cache key generators
export const CacheKeys = {
  // User-specific caches
  userProfile: (userId: string) => `user:profile:${userId}`,
  userOrganization: (userId: string) => `user:org:${userId}`,
  
  // Analytics caches
  dashboardStats: (orgId: string, period: string) => `analytics:dashboard:${orgId}:${period}`,
  revenueAnalytics: (orgId: string, period: string, year: string) => 
    `analytics:revenue:${orgId}:${period}:${year}`,
  
  // Invoice caches
  invoiceList: (orgId: string, page: number, filters: string) => 
    `invoices:list:${orgId}:${page}:${filters}`,
  invoiceDetail: (invoiceId: string) => `invoice:detail:${invoiceId}`,
  
  // Customer caches
  customerList: (orgId: string, page: number, filters: string) => 
    `customers:list:${orgId}:${page}:${filters}`,
  customerDetail: (customerId: string) => `customer:detail:${customerId}`,
  
  // PDF caches
  invoicePdf: (invoiceId: string) => `pdf:invoice:${invoiceId}`,
};

// Cache TTL constants (in seconds)
export const CacheTTL = {
  SHORT: 60,        // 1 minute
  MEDIUM: 300,      // 5 minutes
  LONG: 1800,       // 30 minutes
  VERY_LONG: 3600,  // 1 hour
  DAY: 86400,       // 24 hours
};

// Utility functions for common caching patterns
export class CacheUtils {
  /**
   * Get or set cache with a fallback function
   */
  static async getOrSet<T>(
    key: string,
    fallback: () => Promise<T>,
    ttlSeconds: number = CacheTTL.MEDIUM
  ): Promise<T> {
    // Try to get from cache first
    const cached = cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, execute fallback and cache the result
    const data = await fallback();
    cache.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  static invalidatePattern(pattern: string): number {
    const keys = cache.getStats().keys;
    let invalidated = 0;

    for (const key of keys) {
      if (key.includes(pattern)) {
        cache.delete(key);
        invalidated++;
      }
    }

    return invalidated;
  }

  /**
   * Invalidate user-specific caches
   */
  static invalidateUserCache(userId: string): void {
    this.invalidatePattern(`user:${userId}`);
  }

  /**
   * Invalidate organization-specific caches
   */
  static invalidateOrgCache(orgId: string): void {
    this.invalidatePattern(orgId);
  }

  /**
   * Warm up cache with commonly accessed data
   */
  static async warmupCache(orgId: string, userId: string): Promise<void> {
    try {
      // This would typically fetch and cache commonly accessed data
      // Implementation depends on your specific use case
      console.log(`Warming up cache for org: ${orgId}, user: ${userId}`);
    } catch (error) {
      console.error("Cache warmup failed:", error);
    }
  }
}

// React hook for client-side caching
export function useClientCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    enabled?: boolean;
    onError?: (error: Error) => void;
  } = {}
) {
  const { ttl = CacheTTL.MEDIUM, enabled = true, onError } = options;

  const getCachedData = async (): Promise<T | null> => {
    if (!enabled) return null;

    try {
      return await CacheUtils.getOrSet(key, fetcher, ttl);
    } catch (error) {
      if (onError) {
        onError(error as Error);
      }
      throw error;
    }
  };

  const invalidate = () => {
    cache.delete(key);
  };

  const refresh = async (): Promise<T> => {
    cache.delete(key);
    return await CacheUtils.getOrSet(key, fetcher, ttl);
  };

  return {
    getCachedData,
    invalidate,
    refresh,
    isInCache: () => cache.has(key),
  };
}

// Performance monitoring
export class CacheMetrics {
  private static hits = 0;
  private static misses = 0;
  private static startTime = Date.now();

  static recordHit(): void {
    this.hits++;
  }

  static recordMiss(): void {
    this.misses++;
  }

  static getStats(): {
    hits: number;
    misses: number;
    hitRate: number;
    uptime: number;
    cacheSize: number;
  } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0,
      uptime: Date.now() - this.startTime,
      cacheSize: cache.getStats().size,
    };
  }

  static reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.startTime = Date.now();
  }
}