import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';

const FUTURES_BASE_URL = 'https://fapi.binance.com';

export interface BinanceFundingRate {
  symbol: string;
  fundingRate: string;
  fundingTime: number;
  nextFundingTime: number;
}

export interface BinanceOpenInterest {
  symbol: string;
  openInterest: string;
  time: number;
}

export interface BinanceLongShortRatio {
  symbol: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

export interface BinanceTopTraderRatio {
  symbol: string;
  longPosition: string;
  shortPosition: string;
  timestamp: number;
}

export class BinanceFuturesAdapter {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: FUTURES_BASE_URL,
      timeout: 10000,
    });
  }

  /**
   * Get current funding rate
   */
  async getFundingRate(symbol: string): Promise<BinanceFundingRate> {
    try {
      logger.debug(`Fetching Binance Futures funding rate for ${symbol}`);

      const response = await this.client.get<BinanceFundingRate>('/fapi/v1/premiumIndex', {
        params: { symbol },
      });

      return response.data;
    } catch (error) {
      logger.error(`Error fetching funding rate for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get funding rate history
   */
  async getFundingRateHistory(
    symbol: string,
    limit: number = 100
  ): Promise<Array<{ fundingRate: string; fundingTime: number }>> {
    try {
      logger.debug(`Fetching funding rate history for ${symbol}`);

      const response = await this.client.get('/fapi/v1/fundingRate', {
        params: { symbol, limit: Math.min(limit, 1000) },
      });

      return response.data.map((item: any) => ({
        fundingRate: item.fundingRate,
        fundingTime: item.fundingTime,
      }));
    } catch (error) {
      logger.error(`Error fetching funding rate history for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get current open interest
   */
  async getOpenInterest(symbol: string): Promise<BinanceOpenInterest> {
    try {
      logger.debug(`Fetching open interest for ${symbol}`);

      const [oiResponse, priceResponse] = await Promise.all([
        this.client.get<BinanceOpenInterest>('/fapi/v1/openInterest', {
          params: { symbol },
        }),
        this.client.get<{ symbol: string; price: string }>('/fapi/v1/ticker/price', {
          params: { symbol },
        }),
      ]);

      return {
        ...oiResponse.data,
        // Add current price for value calculation
        price: priceResponse.data.price,
      } as any;
    } catch (error) {
      logger.error(`Error fetching open interest for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get open interest history
   */
  async getOpenInterestHistory(
    symbol: string,
    period: string = '1h',
    limit: number = 30
  ): Promise<Array<{ openInterest: string; timestamp: number }>> {
    try {
      logger.debug(`Fetching OI history for ${symbol}`);

      const response = await this.client.get('/futures/data/openInterestHist', {
        params: { symbol, period, limit: Math.min(limit, 500) },
      });

      return response.data.map((item: any) => ({
        openInterest: item.sumOpenInterest,
        timestamp: item.timestamp,
      }));
    } catch (error) {
      logger.error(`Error fetching OI history for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get long/short ratio by accounts
   */
  async getLongShortAccountRatio(
    symbol: string,
    period: string = '1h',
    limit: number = 1
  ): Promise<BinanceLongShortRatio> {
    try {
      logger.debug(`Fetching long/short account ratio for ${symbol}`);

      const response = await this.client.get<BinanceLongShortRatio[]>(
        '/futures/data/globalLongShortAccountRatio',
        {
          params: { symbol, period, limit: Math.min(limit, 500) },
        }
      );

      if (!response.data || response.data.length === 0) {
        throw new Error('No long/short ratio data available');
      }

      return response.data[0];
    } catch (error) {
      logger.error(`Error fetching long/short account ratio for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get long/short ratio by top trader positions
   */
  async getTopTraderPositionRatio(
    symbol: string,
    period: string = '1h',
    limit: number = 1
  ): Promise<BinanceTopTraderRatio> {
    try {
      logger.debug(`Fetching top trader position ratio for ${symbol}`);

      const response = await this.client.get<BinanceTopTraderRatio[]>(
        '/futures/data/topLongShortPositionRatio',
        {
          params: { symbol, period, limit: Math.min(limit, 500) },
        }
      );

      if (!response.data || response.data.length === 0) {
        throw new Error('No top trader ratio data available');
      }

      return response.data[0];
    } catch (error) {
      logger.error(`Error fetching top trader ratio for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Test connectivity
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.get('/fapi/v1/ping');
      return true;
    } catch (error) {
      logger.error('Binance Futures ping failed:', error);
      return false;
    }
  }

  /**
   * Get server time
   */
  async getServerTime(): Promise<number> {
    try {
      const response = await this.client.get<{ serverTime: number }>('/fapi/v1/time');
      return response.data.serverTime;
    } catch (error) {
      logger.error('Error fetching Binance Futures server time:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const binanceFuturesAdapter = new BinanceFuturesAdapter();
