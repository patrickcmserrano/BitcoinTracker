import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

export interface CoinGeckoGlobal {
  data: {
    active_cryptocurrencies: number;
    markets: number;
    market_cap_percentage: {
      btc: number;
      eth: number;
      [key: string]: number;
    };
    total_market_cap: {
      usd: number;
      [key: string]: number;
    };
    total_volume: {
      usd: number;
      [key: string]: number;
    };
    market_cap_change_percentage_24h_usd: number;
  };
}

export interface BTCDominanceData {
  btcDominance: number;
  ethDominance: number;
  totalMarketCap: number;
  total24hVolume: number;
  activeCryptocurrencies: number;
  markets: number;
  marketCapChange24h: number;
  timestamp: number;
}

export interface CryptoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h: number;
  circulating_supply: number;
  image?: string;
}

export class CoinGeckoAdapter {
  private client: AxiosInstance;
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 1200; // 1.2s between requests (50 req/min limit)

  constructor() {
    this.client = axios.create({
      baseURL: COINGECKO_BASE_URL,
      timeout: 10000,
    });
  }

  /**
   * Rate limiting helper
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      logger.debug(`Rate limiting CoinGecko: waiting ${waitTime}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Get global market data (includes BTC dominance)
   */
  async getGlobalMarketData(): Promise<BTCDominanceData> {
    try {
      await this.rateLimit();

      logger.debug('Fetching global market data from CoinGecko');

      const response = await this.client.get<CoinGeckoGlobal>('/global');
      const data = response.data.data;

      return {
        btcDominance: data.market_cap_percentage.btc || 0,
        ethDominance: data.market_cap_percentage.eth || 0,
        totalMarketCap: data.total_market_cap.usd || 0,
        total24hVolume: data.total_volume.usd || 0,
        activeCryptocurrencies: data.active_cryptocurrencies || 0,
        markets: data.markets || 0,
        marketCapChange24h: data.market_cap_change_percentage_24h_usd || 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      logger.error('Error fetching global market data from CoinGecko:', error);
      throw error;
    }
  }

  /**
   * Get specific cryptocurrencies market data
   */
  async getCryptoMarkets(
    ids: string[],
    vsCurrency: string = 'usd'
  ): Promise<CryptoMarketData[]> {
    try {
      await this.rateLimit();

      logger.debug(`Fetching market data for: ${ids.join(', ')}`);

      const response = await this.client.get<CryptoMarketData[]>('/coins/markets', {
        params: {
          vs_currency: vsCurrency,
          ids: ids.join(','),
          order: 'market_cap_desc',
          per_page: ids.length,
          page: 1,
          sparkline: false,
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching crypto markets from CoinGecko:', error);
      throw error;
    }
  }

  /**
   * Get simple price for cryptocurrencies
   */
  async getSimplePrice(
    ids: string[],
    vsCurrencies: string[] = ['usd']
  ): Promise<Record<string, Record<string, number>>> {
    try {
      await this.rateLimit();

      logger.debug(`Fetching simple price for: ${ids.join(', ')}`);

      const response = await this.client.get('/simple/price', {
        params: {
          ids: ids.join(','),
          vs_currencies: vsCurrencies.join(','),
        },
      });

      return response.data;
    } catch (error) {
      logger.error('Error fetching simple price from CoinGecko:', error);
      throw error;
    }
  }

  /**
   * Ping to check API availability
   */
  async ping(): Promise<boolean> {
    try {
      await this.rateLimit();
      await this.client.get('/ping');
      return true;
    } catch (error) {
      logger.error('CoinGecko ping failed:', error);
      return false;
    }
  }

  /**
   * Format large numbers (market cap, volume)
   */
  formatLargeNumber(value: number): string {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  }
}

// Export singleton instance
export const coinGeckoAdapter = new CoinGeckoAdapter();
