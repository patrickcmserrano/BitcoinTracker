import { BaseProvider } from './base-provider';
import type { PriceData, HistoricalData, CandlestickData } from '../domain/interfaces';

/**
 * Coinbase provider implementation
 * Provides fallback data source using Coinbase Pro API
 */
export class CoinbaseProvider extends BaseProvider {
  private readonly baseUrl = 'https://api.exchange.coinbase.com';

  getName(): string {
    return 'coinbase';
  }

  getPriority(): number {
    return 2; // Second priority after Binance
  }

  async getCurrentPrice(symbol: string): Promise<PriceData> {
    this.validateSymbol(symbol);

    try {
      const coinbaseSymbol = this.convertToCoinbaseFormat(symbol);
      
      const [tickerUrl, statsUrl] = [
        `${this.baseUrl}/products/${coinbaseSymbol}/ticker`,
        `${this.baseUrl}/products/${coinbaseSymbol}/stats`
      ];

      const [tickerData, statsData] = await Promise.all([
        this.makeRequest<any>(tickerUrl),
        this.makeRequest<any>(statsUrl)
      ]);

      return this.transformCoinbaseData(symbol, tickerData, statsData);
    } catch (error) {
      console.error(`Coinbase: Error fetching current price for ${symbol}:`, error);
      throw this.createProviderError(`Failed to fetch current price for ${symbol}`, error as Error);
    }
  }

  async getHistoricalData(symbol: string, interval: string, limit = 100): Promise<HistoricalData> {
    this.validateSymbol(symbol);
    this.validateInterval(interval);

    try {
      const coinbaseSymbol = this.convertToCoinbaseFormat(symbol);
      const granularity = this.convertToCoinbaseGranularity(interval);
      
      const end = new Date();
      const start = new Date(end.getTime() - (limit * granularity * 1000));

      const url = `${this.baseUrl}/products/${coinbaseSymbol}/candles?` +
        `start=${start.toISOString()}&end=${end.toISOString()}&granularity=${granularity}`;

      const data = await this.makeRequest<number[][]>(url);
      
      const candlestickData: CandlestickData[] = data
        .reverse() // Coinbase returns newest first, we want oldest first
        .map((candle: number[]) => ({
          time: candle[0], // Coinbase already provides Unix timestamp in seconds
          open: candle[3],
          high: candle[2],
          low: candle[1],
          close: candle[4],
          volume: candle[5]
        }));

      return {
        symbol,
        interval,
        data: candlestickData
      };
    } catch (error) {
      console.error(`Coinbase: Error fetching historical data for ${symbol}:`, error);
      throw this.createProviderError(`Failed to fetch historical data for ${symbol}`, error as Error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/time`;
      await this.makeRequest(url);
      return true;
    } catch (error) {
      console.warn(`Coinbase: Health check failed:`, error);
      return false;
    }
  }

  protected getWebSocketUrl(symbol: string): string {
    return 'wss://ws-feed.exchange.coinbase.com';
  }

  protected parseWebSocketMessage(message: any): PriceData | null {
    try {
      if (message.type === 'ticker' && message.product_id) {
        const symbol = this.convertFromCoinbaseFormat(message.product_id);
        return {
          symbol,
          price: parseFloat(message.price),
          timestamp: new Date(message.time),
          volume24h: parseFloat(message.volume_24h) || 0,
          priceChange24h: parseFloat(message.price) - parseFloat(message.open_24h) || 0,
          priceChangePercent24h: message.open_24h ? 
            ((parseFloat(message.price) - parseFloat(message.open_24h)) / parseFloat(message.open_24h)) * 100 : 0
        };
      }
    } catch (error) {
      console.error('Coinbase: Error parsing WebSocket message:', error);
    }
    return null;
  }

  protected buildSubscribeMessage(symbol: string): any {
    const coinbaseSymbol = this.convertToCoinbaseFormat(symbol);
    return {
      type: 'subscribe',
      product_ids: [coinbaseSymbol],
      channels: ['ticker']
    };
  }

  private transformCoinbaseData(symbol: string, tickerData: any, statsData: any): PriceData {
    const currentPrice = parseFloat(tickerData.price);
    const openPrice = parseFloat(statsData.open);
    
    return {
      symbol,
      price: currentPrice,
      timestamp: new Date(tickerData.time),
      volume24h: parseFloat(statsData.volume) || 0,
      priceChange24h: currentPrice - openPrice,
      priceChangePercent24h: openPrice ? ((currentPrice - openPrice) / openPrice) * 100 : 0
    };
  }

  private convertToCoinbaseFormat(symbol: string): string {
    // Convert Binance format (BTCUSDT) to Coinbase format (BTC-USD)
    const conversions: { [key: string]: string } = {
      'BTCUSDT': 'BTC-USD',
      'ETHUSDT': 'ETH-USD',
      'ADAUSDT': 'ADA-USD',
      'SOLUSDT': 'SOL-USD',
      'XRPUSDT': 'XRP-USD',
      'DOTUSDT': 'DOT-USD',
      'LINKUSDT': 'LINK-USD',
      'LTCUSDT': 'LTC-USD',
      'BCHUSDT': 'BCH-USD',
      'XLMUSDT': 'XLM-USD'
    };

    const mapped = conversions[symbol];
    if (mapped) {
      return mapped;
    }

    // Fallback: try to convert automatically
    // Assume format is BASEUSDT -> BASE-USD
    if (symbol.endsWith('USDT')) {
      const base = symbol.replace('USDT', '');
      return `${base}-USD`;
    }

    // If no conversion possible, return as-is and let the API fail gracefully
    console.warn(`Coinbase: No conversion mapping for symbol ${symbol}`);
    return symbol;
  }

  private convertFromCoinbaseFormat(coinbaseSymbol: string): string {
    // Convert Coinbase format (BTC-USD) back to Binance format (BTCUSDT)
    const conversions: { [key: string]: string } = {
      'BTC-USD': 'BTCUSDT',
      'ETH-USD': 'ETHUSDT',
      'ADA-USD': 'ADAUSDT',
      'SOL-USD': 'SOLUSDT',
      'XRP-USD': 'XRPUSDT',
      'DOT-USD': 'DOTUSDT',
      'LINK-USD': 'LINKUSDT',
      'LTC-USD': 'LTCUSDT',
      'BCH-USD': 'BCHUSDT',
      'XLM-USD': 'XLMUSDT'
    };

    const mapped = conversions[coinbaseSymbol];
    if (mapped) {
      return mapped;
    }

    // Fallback: try to convert automatically
    // Assume format is BASE-USD -> BASEUSDT
    if (coinbaseSymbol.endsWith('-USD')) {
      const base = coinbaseSymbol.replace('-USD', '');
      return `${base}USDT`;
    }

    return coinbaseSymbol;
  }

  private convertToCoinbaseGranularity(interval: string): number {
    // Convert Binance intervals to Coinbase granularities (in seconds)
    const granularities: { [key: string]: number } = {
      '1m': 60,
      '3m': 180,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '2h': 7200,
      '4h': 14400,
      '6h': 21600,
      '8h': 28800,
      '12h': 43200,
      '1d': 86400,
      '3d': 259200,
      '1w': 604800
    };

    const granularity = granularities[interval];
    if (granularity) {
      return granularity;
    }

    // Default to 1 hour if interval not supported
    console.warn(`Coinbase: Unsupported interval ${interval}, defaulting to 1h`);
    return 3600;
  }
}
