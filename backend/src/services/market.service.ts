import { alternativeAdapter, FearGreedData } from '../adapters/alternative/alternative.adapter';
import { coinGeckoAdapter, BTCDominanceData } from '../adapters/coingecko/coingecko.adapter';
import { cacheService } from './cache.service';
import { logger } from '../config/logger';

export interface MarketIndicators {
  fearGreed: FearGreedData;
  btcDominance: BTCDominanceData;
  timestamp: number;
}

export class MarketService {
  private readonly CACHE_PREFIX = 'market';
  private readonly FEAR_GREED_TTL = 3600; // 1 hour (updates once a day)
  private readonly BTC_DOMINANCE_TTL = 300; // 5 minutes

  /**
   * Get Fear & Greed Index
   */
  async getFearGreedIndex(): Promise<FearGreedData> {
    const cacheKey = 'fear-greed';

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug('Fetching Fear & Greed Index');
        return alternativeAdapter.getFearGreedIndex();
      },
      { prefix: this.CACHE_PREFIX, ttl: this.FEAR_GREED_TTL }
    );
  }

  /**
   * Get Fear & Greed history
   */
  async getFearGreedHistory(limit: number = 30): Promise<FearGreedData[]> {
    const cacheKey = `fear-greed-history:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching Fear & Greed history (${limit} days)`);
        return alternativeAdapter.getFearGreedHistory(limit);
      },
      { prefix: this.CACHE_PREFIX, ttl: this.FEAR_GREED_TTL }
    );
  }

  /**
   * Get BTC Dominance from CoinGecko
   */
  async getBTCDominance(): Promise<BTCDominanceData> {
    const cacheKey = 'btc-dominance';

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug('Fetching BTC Dominance');
        return coinGeckoAdapter.getGlobalMarketData();
      },
      { prefix: this.CACHE_PREFIX, ttl: this.BTC_DOMINANCE_TTL }
    );
  }

  /**
   * Get all market indicators
   */
  async getAllMarketIndicators(): Promise<MarketIndicators> {
    const cacheKey = 'all-indicators';

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug('Fetching all market indicators');

        const [fearGreed, btcDominance] = await Promise.all([
          this.getFearGreedIndex(),
          this.getBTCDominance(),
        ]);

        return {
          fearGreed,
          btcDominance,
          timestamp: Date.now(),
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.BTC_DOMINANCE_TTL }
    );
  }

  /**
   * Get market sentiment score (0-100)
   * Combines Fear & Greed with BTC Dominance
   */
  async getMarketSentiment(): Promise<{
    score: number;
    classification: string;
    factors: {
      fearGreed: number;
      btcDominance: number;
      altcoinSeason: boolean;
    };
  }> {
    const cacheKey = 'market-sentiment';

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        const indicators = await this.getAllMarketIndicators();

        const fearGreedScore = indicators.fearGreed.value;
        const btcDomScore = indicators.btcDominance.btcDominance;

        // Weighted sentiment calculation
        // Fear & Greed: 70%
        // BTC Dominance (inverted): 30%
        const sentimentScore =
          fearGreedScore * 0.7 + (100 - btcDomScore) * 0.3;

        // Altcoin season indicator (BTC dominance < 40%)
        const altcoinSeason = btcDomScore < 40;

        let classification = 'Neutral';
        if (sentimentScore >= 75) classification = 'Extreme Greed';
        else if (sentimentScore >= 60) classification = 'Greed';
        else if (sentimentScore >= 40) classification = 'Neutral';
        else if (sentimentScore >= 25) classification = 'Fear';
        else classification = 'Extreme Fear';

        return {
          score: Math.round(sentimentScore),
          classification,
          factors: {
            fearGreed: fearGreedScore,
            btcDominance: btcDomScore,
            altcoinSeason,
          },
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.BTC_DOMINANCE_TTL }
    );
  }

  /**
   * Get market overview with formatted data
   */
  async getMarketOverview(): Promise<{
    fearGreed: {
      value: number;
      classification: string;
      change: number;
      emoji: string;
    };
    btcDominance: {
      value: number;
      formatted: string;
      ethDominance: number;
      totalMarketCap: string;
      change24h: number;
    };
    sentiment: {
      score: number;
      classification: string;
      altcoinSeason: boolean;
    };
  }> {
    const [fearGreed, btcDom, sentiment] = await Promise.all([
      this.getFearGreedIndex(),
      this.getBTCDominance(),
      this.getMarketSentiment(),
    ]);

    return {
      fearGreed: {
        value: fearGreed.value,
        classification: fearGreed.classification,
        change: fearGreed.change || 0,
        emoji: alternativeAdapter.getEmoji(fearGreed.classification),
      },
      btcDominance: {
        value: btcDom.btcDominance,
        formatted: `${btcDom.btcDominance.toFixed(2)}%`,
        ethDominance: btcDom.ethDominance,
        totalMarketCap: coinGeckoAdapter.formatLargeNumber(btcDom.totalMarketCap),
        change24h: btcDom.marketCapChange24h,
      },
      sentiment: {
        score: sentiment.score,
        classification: sentiment.classification,
        altcoinSeason: sentiment.factors.altcoinSeason,
      },
    };
  }

  /**
   * Test connectivity to external APIs
   */
  async testConnections(): Promise<{
    alternative: boolean;
    coingecko: boolean;
  }> {
    try {
      const [alternativeOk, coingeckoOk] = await Promise.all([
        alternativeAdapter
          .getFearGreedIndex()
          .then(() => true)
          .catch(() => false),
        coinGeckoAdapter.ping(),
      ]);

      logger.info(
        `Market API connectivity - Alternative: ${alternativeOk}, CoinGecko: ${coingeckoOk}`
      );

      return {
        alternative: alternativeOk,
        coingecko: coingeckoOk,
      };
    } catch (error) {
      logger.error('Error testing market API connections:', error);
      return {
        alternative: false,
        coingecko: false,
      };
    }
  }

  /**
   * Clear all market-related cache
   */
  async clearCache(): Promise<void> {
    await cacheService.delPattern(`${this.CACHE_PREFIX}:*`);
    logger.info('Cleared all market cache');
  }
}

// Export singleton instance
export const marketService = new MarketService();
