import { BaseProvider } from './base-provider';
import type { PriceData, HistoricalData, CandlestickData, ExtendedPriceData } from '../domain/interfaces';

/**
 * Binance provider implementation
 * Refactored from existing crypto-api.ts to follow clean architecture principles
 */
export class BinanceProvider extends BaseProvider {
  private readonly baseUrl = 'https://api.binance.com/api/v3';

  getName(): string {
    return 'binance';
  }

  getPriority(): number {
    return 1; // Highest priority (primary provider)
  }

  async getCurrentPrice(symbol: string): Promise<PriceData> {
    this.validateSymbol(symbol);

    try {
      const url = `${this.baseUrl}/ticker/24hr?symbol=${symbol}`;
      const data = await this.makeRequest<any>(url);
      
      return this.transformTickerData(data);
    } catch (error) {
      console.error(`Binance: Error fetching current price for ${symbol}:`, error);
      throw this.createProviderError(`Failed to fetch current price for ${symbol}`, error as Error);
    }
  }

  async getHistoricalData(symbol: string, interval: string, limit = 100): Promise<HistoricalData> {
    this.validateSymbol(symbol);
    this.validateInterval(interval);

    try {
      const url = `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      const data = await this.makeRequest<any[]>(url);
      
      const candlestickData: CandlestickData[] = data.map((kline: any[]) => ({
        time: Math.floor(kline[0] / 1000), // Convert ms to seconds
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));

      return {
        symbol,
        interval,
        data: candlestickData
      };
    } catch (error) {
      console.error(`Binance: Error fetching historical data for ${symbol}:`, error);
      throw this.createProviderError(`Failed to fetch historical data for ${symbol}`, error as Error);
    }
  }

  async getExtendedData(symbol: string, options: { checkATR?: boolean } = {}): Promise<ExtendedPriceData> {
    this.validateSymbol(symbol);
    const { checkATR = false } = options;

    try {
      console.log(`Binance: Fetching extended data for ${symbol}...`);
      
      // Get 24hr ticker data
      const tickerUrl = `${this.baseUrl}/ticker/24hr?symbol=${symbol}`;
      const ticker24hr = await this.makeRequest<any>(tickerUrl);

      // Get klines data for different timeframes
      const [klines10m, klines1h, klines4h, klines1d, klines1w] = await Promise.all([
        this.fetchKlines(symbol, '1m', 10),
        this.fetchKlines(symbol, '1m', 60),
        this.fetchKlines(symbol, '1h', 4),
        this.fetchKlines(symbol, '1h', 24),
        this.fetchKlines(symbol, '1d', 7)
      ]);

      // Process the data using the same logic as the original API
      const processedData = this.processKlineData(
        ticker24hr, 
        klines10m, 
        klines1h, 
        klines4h, 
        klines1d, 
        klines1w
      );

      // Transform to extended format
      const result: ExtendedPriceData = {
        symbol,
        price: processedData.price,
        timestamp: processedData.lastUpdate,
        volume24h: processedData.volume24h,
        priceChange24h: parseFloat(ticker24hr.priceChange),
        priceChangePercent24h: processedData.percentChange,
        ...processedData // Include all the processed timeframe data
      };

      // Add ATR data if requested and available
      if (checkATR) {
        // This would integrate with TAAPI service if available
        // For now, we'll skip ATR to avoid external dependency
        console.log(`Binance: ATR data skipped for ${symbol} in fallback implementation`);
      }

      console.log(`Binance: Extended data for ${symbol} obtained successfully - Current price:`, result.price);
      return result;

    } catch (error) {
      console.error(`Binance: Error fetching extended data for ${symbol}:`, error);
      throw this.createProviderError(`Failed to fetch extended data for ${symbol}`, error as Error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/ping`;
      await this.makeRequest(url);
      return true;
    } catch (error) {
      console.warn(`Binance: Health check failed:`, error);
      return false;
    }
  }

  protected getWebSocketUrl(symbol: string): string {
    return `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`;
  }

  protected parseWebSocketMessage(message: any): PriceData | null {
    try {
      if (message.e === '24hrTicker') {
        return {
          symbol: message.s,
          price: parseFloat(message.c),
          timestamp: new Date(message.E),
          volume24h: parseFloat(message.q),
          priceChange24h: parseFloat(message.P),
          priceChangePercent24h: parseFloat(message.p)
        };
      }
    } catch (error) {
      console.error('Binance: Error parsing WebSocket message:', error);
    }
    return null;
  }

  protected buildSubscribeMessage(symbol: string): any {
    // Binance WebSocket doesn't require subscription messages for ticker streams
    // The connection URL already specifies the stream we want
    return null;
  }

  private transformTickerData(data: any): PriceData {
    return {
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      timestamp: new Date(),
      volume24h: parseFloat(data.quoteVolume),
      priceChange24h: parseFloat(data.priceChange),
      priceChangePercent24h: parseFloat(data.priceChangePercent)
    };
  }

  // Helper methods from original crypto-api.ts
  private async fetchKlines(symbol: string, interval: string, limit: number): Promise<any[]> {
    const url = `${this.baseUrl}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    return this.makeRequest<any[]>(url);
  }

  private mapKlines(data: any[]): any[] {
    return data.map(kline => ({
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
      ignore: kline[11]
    }));
  }

  private processKlineData(ticker24hr: any, klines10m: any[], klines1h: any[], klines4h: any[], klines1d: any[], klines1w: any[]) {
    const mappedKlines10m = this.mapKlines(klines10m);
    const mappedKlines1h = this.mapKlines(klines1h);
    const mappedKlines4h = this.mapKlines(klines4h);
    const mappedKlines1d = this.mapKlines(klines1d);
    const mappedKlines1w = this.mapKlines(klines1w);

    // Extract relevant data
    const price = parseFloat(ticker24hr.lastPrice);
    const volume24h = parseFloat(ticker24hr.quoteVolume);
    const percentChange = parseFloat(ticker24hr.priceChangePercent);
    const volumePerHour = volume24h / 24;

    // Helper functions
    const calculateAmplitude = (klines: any[]) => {
      const high = Math.max(...klines.map(k => parseFloat(k.high)));
      const low = Math.min(...klines.map(k => parseFloat(k.low)));
      return { high, low, amplitude: high - low };
    };

    const calculateVolume = (klines: any[]) => {
      return klines.reduce((sum, k) => sum + parseFloat(k.quoteAssetVolume), 0);
    };

    const calculatePercentChange = (klines: any[]) => {
      if (klines.length === 0) return 0;
      const firstPrice = parseFloat(klines[0].open);
      const lastPrice = parseFloat(klines[klines.length - 1].close);
      return ((lastPrice - firstPrice) / firstPrice) * 100;
    };

    // Calculate for different timeframes
    const { high: highPrice10m, low: lowPrice10m, amplitude: amplitude10m } = calculateAmplitude(mappedKlines10m);
    const volume10m = calculateVolume(mappedKlines10m);
    const percentChange10m = calculatePercentChange(mappedKlines10m);

    const { high: highPrice1h, low: lowPrice1h, amplitude: amplitude1h } = calculateAmplitude(mappedKlines1h);
    const volume1h = calculateVolume(mappedKlines1h);
    const percentChange1h = calculatePercentChange(mappedKlines1h);

    const { high: highPrice4h, low: lowPrice4h, amplitude: amplitude4h } = calculateAmplitude(mappedKlines4h);
    const volume4h = calculateVolume(mappedKlines4h);
    const percentChange4h = calculatePercentChange(mappedKlines4h);

    const { high: highPrice1d, low: lowPrice1d, amplitude: amplitude1d } = calculateAmplitude(mappedKlines1d);
    const volume1d = calculateVolume(mappedKlines1d);
    const percentChange1d = calculatePercentChange(mappedKlines1d);

    const { high: highPrice1w, low: lowPrice1w, amplitude: amplitude1w } = calculateAmplitude(mappedKlines1w);
    const volume1w = calculateVolume(mappedKlines1w);
    const percentChange1w = calculatePercentChange(mappedKlines1w);

    // Store recent prices
    const recentPrices = mappedKlines10m.map(k => parseFloat(k.close));

    return {
      price,
      volume24h,
      percentChange,
      volumePerHour,
      amplitude10m,
      highPrice10m,
      lowPrice10m,
      volume10m,
      percentChange10m,
      amplitude1h,
      highPrice1h,
      lowPrice1h,
      volume1h,
      percentChange1h,
      amplitude4h,
      highPrice4h,
      lowPrice4h,
      volume4h,
      percentChange4h,
      amplitude1d,
      highPrice1d,
      lowPrice1d,
      volume1d,
      percentChange1d,
      amplitude1w,
      highPrice1w,
      lowPrice1w,
      volume1w,
      percentChange1w,
      lastUpdate: new Date(),
      recentPrices
    };
  }
}
