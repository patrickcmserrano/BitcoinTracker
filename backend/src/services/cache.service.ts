import { getRedisClient } from '../config/redis';
import { logger } from '../config/logger';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
}

export class CacheService {
  /**
   * Get cached value
   */
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    try {
      const redis = getRedisClient();
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const value = await redis.get(fullKey);

      if (!value) {
        logger.debug(`Cache miss for key: ${fullKey}`);
        return null;
      }

      logger.debug(`Cache hit for key: ${fullKey}`);
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set cached value
   */
  async set(key: string, value: any, options?: CacheOptions): Promise<void> {
    try {
      const redis = getRedisClient();
      const fullKey = options?.prefix ? `${options.prefix}:${key}` : key;
      const serialized = JSON.stringify(value);

      if (options?.ttl) {
        await redis.setex(fullKey, options.ttl, serialized);
        logger.debug(`Cached ${fullKey} with TTL ${options.ttl}s`);
      } else {
        await redis.set(fullKey, serialized);
        logger.debug(`Cached ${fullKey} (no expiration)`);
      }
    } catch (error) {
      logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete cached value
   */
  async del(key: string, prefix?: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const fullKey = prefix ? `${prefix}:${key}` : key;
      await redis.del(fullKey);
      logger.debug(`Deleted cache key: ${fullKey}`);
    } catch (error) {
      logger.error(`Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys by pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.error(`Error deleting cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const exists = await redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      logger.error(`Error checking cache existence for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get remaining TTL for a key
   */
  async ttl(key: string, prefix?: string): Promise<number> {
    try {
      const redis = getRedisClient();
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const ttl = await redis.ttl(fullKey);
      return ttl;
    } catch (error) {
      logger.error(`Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, prefix?: string): Promise<number> {
    try {
      const redis = getRedisClient();
      const fullKey = prefix ? `${prefix}:${key}` : key;
      const value = await redis.incr(fullKey);
      return value;
    } catch (error) {
      logger.error(`Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Set expiration on existing key
   */
  async expire(key: string, seconds: number, prefix?: string): Promise<void> {
    try {
      const redis = getRedisClient();
      const fullKey = prefix ? `${prefix}:${key}` : key;
      await redis.expire(fullKey, seconds);
      logger.debug(`Set expiration of ${seconds}s on key: ${fullKey}`);
    } catch (error) {
      logger.error(`Error setting expiration for key ${key}:`, error);
    }
  }

  /**
   * Get or set pattern: get cached value or compute and cache it
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key, options?.prefix);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch and store
    logger.debug(`Cache miss for ${key}, fetching...`);
    const value = await fetchFn();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Clear all cache (use with caution!)
   */
  async clearAll(): Promise<void> {
    try {
      const redis = getRedisClient();
      await redis.flushDb();
      logger.warn('Cleared all cache');
    } catch (error) {
      logger.error('Error clearing all cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    memoryUsed: string;
    hitRate?: number;
  }> {
    try {
      const redis = getRedisClient();
      const dbsize = await redis.dbSize();
      const info = await redis.info('memory');

      // Parse memory usage from info string
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsed = memoryMatch ? memoryMatch[1] : 'Unknown';

      return {
        totalKeys: dbsize,
        memoryUsed,
      };
    } catch (error) {
      logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsed: 'Unknown',
      };
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
