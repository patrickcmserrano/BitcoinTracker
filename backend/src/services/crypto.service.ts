import { binanceSpotAdapter } from '../adapters/binance/spot.adapter';
import { binanceFuturesAdapter } from '../adapters/binance/futures.adapter';
import { taapiAdapter } from '../adapters/taapi/taapi.adapter';
import { cacheService } from './cache.service';
import { technicalIndicatorsService, OHLCVData } from './technical-indicators.service';
import { logger } from '../config/logger';

export interface CryptoSymbolData {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  timestamp: number;
}

export interface CryptoWithIndicators extends CryptoSymbolData {
  indicators: {
    sma20?: number | null;
    sma50?: number | null;
    ema9?: number | null;
    ema21?: number | null;
    macd?: {
      MACD: number;
      signal: number;
      histogram: number;
    } | null;
    rsi?: number | null;
    bollingerBands?: {
      upper: number;
      middle: number;
      lower: number;
    } | null;
    stochastic?: {
      k: number;
      d: number;
    } | null;
    atr?: number | null;
  };
  trend?: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
}

export class CryptoService {
  private readonly CACHE_PREFIX = 'crypto';
  private readonly TICKER_TTL = 15; // 15 seconds
  private readonly KLINES_TTL = 60; // 1 minute
  private readonly INDICATORS_TTL = 60; // 1 minute

  /**
   * Get 24h ticker data for a symbol
   */
  async getTicker24h(symbol: string): Promise<CryptoSymbolData> {
    const cacheKey = `ticker:${symbol}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching ticker for ${symbol}`);
        const ticker = await binanceSpotAdapter.getTicker24hr(symbol);

        return {
          symbol: ticker.symbol,
          currentPrice: parseFloat(ticker.lastPrice),
          priceChange24h: parseFloat(ticker.priceChange),
          priceChangePercentage24h: parseFloat(ticker.priceChangePercent),
          high24h: parseFloat(ticker.highPrice),
          low24h: parseFloat(ticker.lowPrice),
          volume24h: parseFloat(ticker.volume),
          quoteVolume24h: parseFloat(ticker.quoteVolume),
          timestamp: Date.now(),
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.TICKER_TTL }
    );
  }

  /**
   * Get OHLCV data (klines/candles)
   */
  async getKlines(
    symbol: string,
    interval: string = '1h',
    limit: number = 100
  ): Promise<OHLCVData[]> {
    const cacheKey = `klines:${symbol}:${interval}:${limit}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Fetching klines for ${symbol} ${interval}`);
        const klines = await binanceSpotAdapter.getKlines(symbol, interval, limit);

        return klines.map((k) => ({
          timestamp: k.openTime,
          open: parseFloat(k.open),
          high: parseFloat(k.high),
          low: parseFloat(k.low),
          close: parseFloat(k.close),
          volume: parseFloat(k.volume),
        }));
      },
      { prefix: this.CACHE_PREFIX, ttl: this.KLINES_TTL }
    );
  }

  /**
   * Get crypto data with technical indicators
   */
  async getCryptoWithIndicators(
    symbol: string,
    interval: string = '1h',
    limit: number = 100
  ): Promise<CryptoWithIndicators> {
    const cacheKey = `indicators:${symbol}:${interval}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Calculating indicators for ${symbol} ${interval}`);

        // Fetch ticker and klines in parallel
        const [ticker, klines] = await Promise.all([
          this.getTicker24h(symbol),
          this.getKlines(symbol, interval, limit),
        ]);

        // Calculate all indicators
        const indicators = technicalIndicatorsService.calculateAll(klines);

        // Determine trend
        let trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' | undefined;
        if (indicators.ema9 && indicators.ema21) {
          trend = technicalIndicatorsService.determineTrend(
            indicators.ema9,
            indicators.ema21,
            ticker.currentPrice
          );
        }

        return {
          ...ticker,
          indicators,
          trend,
        };
      },
      { prefix: this.CACHE_PREFIX, ttl: this.INDICATORS_TTL }
    );
  }

  /**
   * Get multiple cryptos with indicators
   */
  async getMultipleCryptos(
    symbols: string[],
    interval: string = '1h'
  ): Promise<CryptoWithIndicators[]> {
    const promises = symbols.map((symbol) =>
      this.getCryptoWithIndicators(symbol, interval).catch((error) => {
        logger.error(`Error fetching data for ${symbol}:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((r): r is CryptoWithIndicators => r !== null);
  }

  /**
   * Get ATR from TAAPI (if configured) or calculate locally
   */
  async getATR(symbol: string, interval: string = '1d', period: number = 14): Promise<number> {
    const cacheKey = `atr:${symbol}:${interval}:${period}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        // Try TAAPI first if configured
        if (taapiAdapter.isConfigured()) {
          try {
            logger.debug(`Fetching ATR from TAAPI for ${symbol}`);
            const result = await taapiAdapter.getATR({
              symbol,
              interval,
              period,
            });
            return result.value;
          } catch (error) {
            logger.warn(`TAAPI ATR failed for ${symbol}, falling back to local calculation`);
          }
        }

        // Fallback to local calculation
        logger.debug(`Calculating ATR locally for ${symbol}`);
        const klines = await this.getKlines(symbol, interval, Math.max(period * 2, 100));

        const highs = klines.map((k) => k.high);
        const lows = klines.map((k) => k.low);
        const closes = klines.map((k) => k.close);

        const atr = technicalIndicatorsService.calculateATR(highs, lows, closes, period);

        if (!atr) {
          throw new Error(`Failed to calculate ATR for ${symbol}`);
        }

        return atr;
      },
      {
        prefix: this.CACHE_PREFIX,
        ttl: taapiAdapter.isConfigured() ? taapiAdapter.getTimeUntilNextDay() / 1000 : 3600,
      }
    );
  }

  /**
   * Get triple screen analysis for a symbol
   */
  async getTripleScreen(symbol: string) {
    const cacheKey = `triple-screen:${symbol}`;

    return cacheService.getOrSet(
      cacheKey,
      async () => {
        logger.debug(`Calculating triple screen for ${symbol}`);

        // Fetch data for all timeframes in parallel
        const [dailyKlines, fourHourKlines, oneHourKlines] = await Promise.all([
          this.getKlines(symbol, '1d', 50),
          this.getKlines(symbol, '4h', 100),
          this.getKlines(symbol, '1h', 100),
        ]);

        return technicalIndicatorsService.calculateTripleScreen(
          dailyKlines,
          fourHourKlines,
          oneHourKlines
        );
      },
      { prefix: this.CACHE_PREFIX, ttl: 300 } // 5 minutes
    );
  }

  /**
   * Test connectivity to Binance
   */
  async testConnection(): Promise<boolean> {
    try {
      const spotOk = await binanceSpotAdapter.ping();
      const futuresOk = await binanceFuturesAdapter.ping();

      logger.info(`Binance connectivity - Spot: ${spotOk}, Futures: ${futuresOk}`);
      return spotOk && futuresOk;
    } catch (error) {
      logger.error('Error testing Binance connection:', error);
      return false;
    }
  }

  /**
   * Clear all crypto-related cache
   */
  async clearCache(): Promise<void> {
    await cacheService.delPattern(`${this.CACHE_PREFIX}:*`);
    logger.info('Cleared all crypto cache');
  }
}

// Export singleton instance
export const cryptoService = new CryptoService();
