import axios from 'axios';

/**
 * Calculates time until next day (next candle close for daily timeframe)
 * For daily ATR, we want to cache until the next daily candle closes (UTC midnight)
 * This prevents unnecessary API calls since ATR14 daily only changes once per day
 */
function getTimeUntilNextDay(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0); // Next UTC midnight
  
  const timeUntilNextDay = tomorrow.getTime() - now.getTime();
  
  // Minimum cache of 1 hour to avoid too frequent requests even if near midnight
  const minimumCache = 60 * 60 * 1000; // 1 hour
  
  return Math.max(timeUntilNextDay, minimumCache);
}

export interface TaapiATRResponse {
  value: number;
  timestamp?: number;
}

export interface CacheEntry {
  data: TaapiATRResponse;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface TaapiConfig {
  baseUrl: string;
  secretKey: string;
  cacheTTL: number; // Cache time-to-live in milliseconds
  rateLimitDelay: number; // Minimum delay between requests
}

class TaapiService {
  private cache = new Map<string, CacheEntry>();
  private lastRequestTime = 0;
  private config: TaapiConfig;

  constructor(config: TaapiConfig) {
    this.config = config;
  }

  /**
   * Generates a cache key for the given parameters
   */
  private generateCacheKey(params: {
    symbol: string;
    interval: string;
    exchange: string;
    period?: number;
    backtrack?: number;
  }): string {
    return `atr_${params.symbol}_${params.interval}_${params.exchange}_${params.period || 14}_${params.backtrack || 0}`;
  }

  /**
   * Checks if cached data is still valid
   */
  private isCacheValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Enforces rate limiting between requests
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.config.rateLimitDelay) {
      const delay = this.config.rateLimitDelay - timeSinceLastRequest;
      console.log(`TAAPI: Rate limiting - waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Fetches ATR data from TAAPI.IO with caching and rate limiting
   */
  async getATR(params: {
    symbol: string;
    interval: string;
    exchange: string;
    period?: number;
    backtrack?: number;
  }): Promise<TaapiATRResponse> {
    const cacheKey = this.generateCacheKey(params);
    
    // Check cache first
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && this.isCacheValid(cachedEntry)) {
      const timeRemaining = cachedEntry.ttl - (Date.now() - cachedEntry.timestamp);
      const hoursRemaining = Math.floor(timeRemaining / (1000 * 60 * 60));
      console.log(`TAAPI: Returning cached ATR data for ${params.symbol} ${params.interval} (expires in ~${hoursRemaining}h)`);
      return cachedEntry.data;
    }

    // Enforce rate limiting
    await this.enforceRateLimit();

    try {
      console.log('TAAPI: Fetching ATR data for', params.symbol, params.interval);
      
      const queryParams = new URLSearchParams({
        secret: this.config.secretKey,
        exchange: params.exchange,
        symbol: params.symbol,
        interval: params.interval,
        ...(params.period && { period: params.period.toString() }),
        ...(params.backtrack && { backtrack: params.backtrack.toString() })
      });

      const response = await axios.get<TaapiATRResponse>(
        `${this.config.baseUrl}/atr?${queryParams.toString()}`,
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
            // Note: Accept-Encoding is automatically handled by the browser
          }
        }
      );

      const data = response.data;
      
      // Cache the result with dynamic TTL
      const cacheTTL = getTimeUntilNextDay();
      const cacheEntry: CacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: cacheTTL // Dynamic TTL until next day
      };
      
      this.cache.set(cacheKey, cacheEntry);
      
      // Clean up old cache entries
      this.cleanupCache();
      
      const hoursToCache = Math.floor(cacheTTL / (1000 * 60 * 60));
      console.log(`TAAPI: ATR data cached for ~${hoursToCache}h until next daily candle closes`);
      console.log('TAAPI: ATR data fetched successfully:', data.value);
      return data;

    } catch (error) {
      console.error('TAAPI: Error fetching ATR data:', error);
      
      // Handle specific error types
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          console.error('TAAPI: Invalid API key - Please check your TAAPI.IO secret key');
        } else if (error.response?.status === 429) {
          console.error('TAAPI: Rate limit exceeded - Too many requests');
        } else if (error.response && error.response.status >= 500) {
          console.error('TAAPI: Server error - TAAPI.IO service may be down');
        }
      }
      
      // Return stale cache data if available as fallback
      if (cachedEntry) {
        console.log('TAAPI: Returning stale cached data as fallback');
        return cachedEntry.data;
      }
      
      throw error;
    }
  }

  /**
   * Removes expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheValid(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clears all cached data
   */
  clearCache(): void {
    this.cache.clear();
    console.log('TAAPI: Cache cleared');
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance with default configuration
let taapiService: TaapiService | null = null;

export function initializeTaapiService(secretKey: string): TaapiService {
  const config: TaapiConfig = {
    baseUrl: 'https://api.taapi.io',
    secretKey,
    cacheTTL: getTimeUntilNextDay(), // Cache until next day for daily ATR
    rateLimitDelay: 2000 // 2 seconds between requests
  };
  
  taapiService = new TaapiService(config);
  return taapiService;
}

export function getTaapiService(): TaapiService {
  if (!taapiService) {
    throw new Error('TAAPI service not initialized. Call initializeTaapiService() first.');
  }
  return taapiService;
}

export { TaapiService };
