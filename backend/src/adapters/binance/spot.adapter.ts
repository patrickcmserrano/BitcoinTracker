import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';

const BASE_URL = 'https://api.binance.com';

export interface BinanceTicker24hr {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  bidQty: string;
  askPrice: string;
  askQty: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export class BinanceSpotAdapter {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
    });
  }

  /**
   * Get 24-hour ticker price change statistics
   */
  async getTicker24hr(symbol: string): Promise<BinanceTicker24hr> {
    try {
      logger.debug(`Fetching Binance ticker for ${symbol}`);

      const response = await this.client.get<BinanceTicker24hr>('/api/v3/ticker/24hr', {
        params: { symbol },
      });

      return response.data;
    } catch (error) {
      logger.error(`Error fetching Binance ticker for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get Kline/Candlestick data
   */
  async getKlines(
    symbol: string,
    interval: string,
    limit: number = 200
  ): Promise<BinanceKline[]> {
    try {
      logger.debug(`Fetching Binance klines for ${symbol} ${interval} (limit: ${limit})`);

      const response = await this.client.get<any[]>('/api/v3/klines', {
        params: { symbol, interval, limit },
      });

      return response.data.map((kline: any) => ({
        openTime: kline[0],
        open: kline[1],
        high: kline[2],
        low: kline[3],
        close: kline[4],
        volume: kline[5],
        closeTime: kline[6],
        quoteAssetVolume: kline[7],
        numberOfTrades: kline[8],
        takerBuyBaseAssetVolume: kline[9],
        takerBuyQuoteAssetVolume: kline[10],
      }));
    } catch (error) {
      logger.error(`Error fetching Binance klines for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Test connectivity to the Binance API
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.get('/api/v3/ping');
      return true;
    } catch (error) {
      logger.error('Binance ping failed:', error);
      return false;
    }
  }

  /**
   * Get server time
   */
  async getServerTime(): Promise<number> {
    try {
      const response = await this.client.get<{ serverTime: number }>('/api/v3/time');
      return response.data.serverTime;
    } catch (error) {
      logger.error('Error fetching Binance server time:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const binanceSpotAdapter = new BinanceSpotAdapter();
