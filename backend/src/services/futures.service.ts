import { binanceFuturesAdapter } from '../adapters/binance/futures.adapter';
import { cacheService } from './cache.service';
import { logger } from '../config/logger';

export interface FuturesMetrics {
  symbol: string;
  fundingRate: {
    current: number;
    currentFormatted: string;
    nextFundingTime: Date;
    annualizedRate: number;
  };
  openInterest: {
    value: number;
    valueFormatted: string;
    price?: number;
  };
  longShortRatio: {
    longPercentage: number;
    shortPercentage: number;
    ratio: number;
    sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
  topTraderRatio: {
    longPercentage: number;
    shortPercentage: number;
    ratio: number;
  };
  timestamp: number;
}

export class FuturesService {
  private readonly CACHE_PREFIX = 'futures';
  private readonly FUNDING_RATE_TTL = 60; // 1 minute
  private readonly OPEN_INTEREST_TTL = 60; // 1 minute
  private readonly LONG_SHORT_TTL = 300; // 5 minutes

  /**
   * Get current funding rate
   */
  async getFundingRate(symbol: string) {
    const cacheKey = `funding-rate:${symbol}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching funding rate for ${symbol}`);
        const data = await binanceFuturesAdapter.getFundingRate(symbol);

        const rate = parseFloat(data.fundingRate);
        const annualized = rate * 3 * 365 * 100; // 3 times per day * 365 days * 100 for percentage

        return {
          symbol: data.symbol,
          fundingRate: rate,
          fundingRateFormatted: `${(rate * 100).toFixed(4)}%`,
          annualizedRate: annualized,
          annualizedRateFormatted: `${annualized.toFixed(2)}%`,
          nextFundingTime: new Date(data.nextFundingTime),
          timestamp: Date.now(),
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.FUNDING_RATE_TTL }
    );
  }

  /**
   * Get funding rate history
   */
  async getFundingRateHistory(symbol: string, limit: number = 30) {
    const cacheKey = `funding-rate-history:${symbol}:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching funding rate history for ${symbol}`);
        const history = await binanceFuturesAdapter.getFundingRateHistory(symbol, limit);

        return history.map((item) => ({
          fundingRate: parseFloat(item.fundingRate),
          fundingRateFormatted: `${(parseFloat(item.fundingRate) * 100).toFixed(4)}%`,
          fundingTime: new Date(item.fundingTime),
          timestamp: item.fundingTime,
        }));
      },
      { prefix: this.CACHE_PREFIX, ttl: 3600 } // 1 hour for history
    );
  }

  /**
   * Get open interest
   */
  async getOpenInterest(symbol: string) {
    const cacheKey = `open-interest:${symbol}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching open interest for ${symbol}`);
        const data = await binanceFuturesAdapter.getOpenInterest(symbol);

        const oi = parseFloat(data.openInterest);
        const price = (data as any).price ? parseFloat((data as any).price) : undefined;
        const oiValue = price ? oi * price : oi;

        return {
          symbol: data.symbol,
          openInterest: oi,
          openInterestFormatted: this.formatNumber(oi),
          price,
          valueUSD: price ? oiValue : undefined,
          valueUSDFormatted: price ? this.formatUSD(oiValue) : undefined,
          timestamp: Date.now(),
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.OPEN_INTEREST_TTL }
    );
  }

  /**
   * Get open interest history
   */
  async getOpenInterestHistory(symbol: string, period: string = '1h', limit: number = 30) {
    const cacheKey = `open-interest-history:${symbol}:${period}:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching OI history for ${symbol}`);
        return binanceFuturesAdapter.getOpenInterestHistory(symbol, period, limit);
      },
      { prefix: this.CACHE_PREFIX, ttl: 3600 }
    );
  }

  /**
   * Get long/short ratio by accounts
   */
  async getLongShortRatio(symbol: string, period: string = '1h') {
    const cacheKey = `long-short-ratio:${symbol}:${period}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching long/short ratio for ${symbol}`);
        const data = await binanceFuturesAdapter.getLongShortAccountRatio(symbol, period, 1);

        const longAccount = parseFloat(data.longAccount);
        const shortAccount = parseFloat(data.shortAccount);
        const ratio = longAccount / shortAccount;

        const longPercentage = (longAccount / (longAccount + shortAccount)) * 100;
        const shortPercentage = (shortAccount / (longAccount + shortAccount)) * 100;

        let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
        if (ratio > 1.2) sentiment = 'BULLISH';
        else if (ratio < 0.8) sentiment = 'BEARISH';

        return {
          symbol: data.symbol,
          longAccount,
          shortAccount,
          ratio,
          ratioFormatted: ratio.toFixed(2),
          longPercentage,
          shortPercentage,
          longPercentageFormatted: `${longPercentage.toFixed(2)}%`,
          shortPercentageFormatted: `${shortPercentage.toFixed(2)}%`,
          sentiment,
          timestamp: data.timestamp,
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.LONG_SHORT_TTL }
    );
  }

  /**
   * Get top trader position ratio
   */
  async getTopTraderRatio(symbol: string, period: string = '1h') {
    const cacheKey = `top-trader-ratio:${symbol}:${period}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching top trader ratio for ${symbol}`);
        const data = await binanceFuturesAdapter.getTopTraderPositionRatio(symbol, period, 1);

        const longPosition = parseFloat(data.longPosition);
        const shortPosition = parseFloat(data.shortPosition);
        const ratio = longPosition / shortPosition;

        const longPercentage = (longPosition / (longPosition + shortPosition)) * 100;
        const shortPercentage = (shortPosition / (longPosition + shortPosition)) * 100;

        return {
          symbol: data.symbol,
          longPosition,
          shortPosition,
          ratio,
          ratioFormatted: ratio.toFixed(2),
          longPercentage,
          shortPercentage,
          longPercentageFormatted: `${longPercentage.toFixed(2)}%`,
          shortPercentageFormatted: `${shortPercentage.toFixed(2)}%`,
          timestamp: data.timestamp,
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.LONG_SHORT_TTL }
    );
  }

  /**
   * Get all futures metrics for a symbol
   */
  async getAllMetrics(symbol: string): Promise<FuturesMetrics> {
    const cacheKey = `all-metrics:${symbol}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching all futures metrics for ${symbol}`);

        const [fundingRate, openInterest, longShortRatio, topTraderRatio] = await Promise.all([
          this.getFundingRate(symbol),
          this.getOpenInterest(symbol),
          this.getLongShortRatio(symbol),
          this.getTopTraderRatio(symbol),
        ]);

        return {
          symbol,
          fundingRate: {
            current: fundingRate.fundingRate,
            currentFormatted: fundingRate.fundingRateFormatted,
            nextFundingTime: fundingRate.nextFundingTime,
            annualizedRate: fundingRate.annualizedRate,
          },
          openInterest: {
            value: openInterest.openInterest,
            valueFormatted: openInterest.openInterestFormatted,
            price: openInterest.price,
          },
          longShortRatio: {
            longPercentage: longShortRatio.longPercentage,
            shortPercentage: longShortRatio.shortPercentage,
            ratio: longShortRatio.ratio,
            sentiment: longShortRatio.sentiment,
          },
          topTraderRatio: {
            longPercentage: topTraderRatio.longPercentage,
            shortPercentage: topTraderRatio.shortPercentage,
            ratio: topTraderRatio.ratio,
          },
          timestamp: Date.now(),
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.LONG_SHORT_TTL }
    );
  }

  /**
   * Format large numbers (K, M, B)
   */
  private formatNumber(value: number): string {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  }

  /**
   * Format USD values
   */
  private formatUSD(value: number): string {
    return `$${this.formatNumber(value)}`;
  }

  /**
   * Test connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      return await binanceFuturesAdapter.ping();
    } catch (error) {
      logger.error('Error testing Binance Futures connection:', error);
      return false;
    }
  }

  /**
   * Clear all futures-related cache
   */
  async clearCache(): Promise<void> {
    await cacheService.delPattern(`${this.CACHE_PREFIX}:*`);
    logger.info('Cleared all futures cache');
  }
}

// Export singleton instance
export const futuresService = new FuturesService();
