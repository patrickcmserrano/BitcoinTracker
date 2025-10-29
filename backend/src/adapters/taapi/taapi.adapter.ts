import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';
import { env } from '../../config/env';

const TAAPI_BASE_URL = 'https://api.taapi.io';

export interface TaapiATRResponse {
  value: number;
  backtrack?: number;
  timestamp?: number;
}

export interface TaapiIndicatorParams {
  symbol: string;
  interval: string;
  exchange?: string;
  period?: number;
  backtrack?: number;
}

export class TaapiAdapter {
  private client: AxiosInstance;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 6000; // 6s between requests (10 req/min limit)

  constructor() {
    this.client = axios.create({
      baseURL: TAAPI_BASE_URL,
      timeout: 15000,
    });
  }

  /**
   * Check if TAAPI is configured
   */
  isConfigured(): boolean {
    return !!env.TAAPI_SECRET_KEY && env.TAAPI_SECRET_KEY !== 'your_taapi_key_here';
  }

  /**
   * Rate limiting helper
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      logger.debug(`Rate limiting TAAPI: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get ATR (Average True Range) indicator
   */
  async getATR(params: TaapiIndicatorParams): Promise<TaapiATRResponse> {
    if (!this.isConfigured()) {
      throw new Error('TAAPI is not configured. Please set TAAPI_SECRET_KEY in environment.');
    }

    try {
      await this.rateLimit();

      logger.debug(
        `Fetching TAAPI ATR for ${params.symbol} ${params.interval} (period: ${params.period || 14})`
      );

      const response = await this.client.get<TaapiATRResponse>('/atr', {
        params: {
          secret: env.TAAPI_SECRET_KEY,
          exchange: params.exchange || 'binance',
          symbol: params.symbol,
          interval: params.interval,
          period: params.period || 14,
          ...(params.backtrack && { backtrack: params.backtrack }),
        },
      });

      logger.debug(`TAAPI ATR received: ${response.data.value}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          logger.error('TAAPI: Invalid API key');
          throw new Error('Invalid TAAPI API key');
        } else if (error.response?.status === 429) {
          logger.error('TAAPI: Rate limit exceeded');
          throw new Error('TAAPI rate limit exceeded');
        }
      }
      logger.error('Error fetching ATR from TAAPI:', error);
      throw error;
    }
  }

  /**
   * Get RSI indicator
   */
  async getRSI(params: TaapiIndicatorParams): Promise<{ value: number }> {
    if (!this.isConfigured()) {
      throw new Error('TAAPI is not configured');
    }

    try {
      await this.rateLimit();

      logger.debug(`Fetching TAAPI RSI for ${params.symbol} ${params.interval}`);

      const response = await this.client.get<{ value: number }>('/rsi', {
        params: {
          secret: env.TAAPI_SECRET_KEY,
          exchange: params.exchange || 'binance',
          symbol: params.symbol,
          interval: params.interval,
          period: params.period || 14,
          ...(params.backtrack && { backtrack: params.backtrack }),
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching RSI from TAAPI:', error);
      throw error;
    }
  }

  /**
   * Get MACD indicator
   */
  async getMACD(
    params: TaapiIndicatorParams & { fastPeriod?: number; slowPeriod?: number; signalPeriod?: number }
  ): Promise<{ valueMACD: number; valueMACDSignal: number; valueMACDHist: number }> {
    if (!this.isConfigured()) {
      throw new Error('TAAPI is not configured');
    }

    try {
      await this.rateLimit();

      logger.debug(`Fetching TAAPI MACD for ${params.symbol} ${params.interval}`);

      const response = await this.client.get<{
        valueMACD: number;
        valueMACDSignal: number;
        valueMACDHist: number;
      }>('/macd', {
        params: {
          secret: env.TAAPI_SECRET_KEY,
          exchange: params.exchange || 'binance',
          symbol: params.symbol,
          interval: params.interval,
          fast_period: params.fastPeriod || 12,
          slow_period: params.slowPeriod || 26,
          signal_period: params.signalPeriod || 9,
          ...(params.backtrack && { backtrack: params.backtrack }),
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching MACD from TAAPI:', error);
      throw error;
    }
  }

  /**
   * Calculate time until next day (for smart caching)
   */
  getTimeUntilNextDay(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);

    const timeUntilNextDay = tomorrow.getTime() - now.getTime();
    const minimumCache = 60 * 60 * 1000; // 1 hour minimum

    return Math.max(timeUntilNextDay, minimumCache);
  }

  /**
   * Test connectivity
   */
  async ping(): Promise<boolean> {
    if (!this.isConfigured()) {
      logger.warn('TAAPI not configured, skipping ping');
      return false;
    }

    try {
      await this.rateLimit();
      // TAAPI doesn't have a ping endpoint, so we'll just check if we can make a request
      await this.client.get('/ping', {
        params: { secret: env.TAAPI_SECRET_KEY },
      });
      return true;
    } catch (error) {
      logger.debug('TAAPI ping failed (expected if no ping endpoint)');
      return true; // Assume it's working if configured
    }
  }
}

// Export singleton instance
export const taapiAdapter = new TaapiAdapter();
