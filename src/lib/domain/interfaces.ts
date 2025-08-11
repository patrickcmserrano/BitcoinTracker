/**
 * Domain interfaces for the Bitcoin Tracker application
 * These interfaces define the contracts that drive our clean architecture
 */

// Domain entities
export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
  volume24h: number;
  priceChange24h: number;
  priceChangePercent24h: number;
}

export interface HistoricalData {
  symbol: string;
  interval: string;
  data: CandlestickData[];
}

export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Extended data interface for backward compatibility
export interface ExtendedPriceData extends PriceData {
  // Additional fields for compatibility with existing CryptoData
  volumePerHour?: number;
  amplitude10m?: number;
  highPrice10m?: number;
  lowPrice10m?: number;
  volume10m?: number;
  percentChange10m?: number;
  amplitude1h?: number;
  highPrice1h?: number;
  lowPrice1h?: number;
  volume1h?: number;
  percentChange1h?: number;
  amplitude4h?: number;
  highPrice4h?: number;
  lowPrice4h?: number;
  volume4h?: number;
  percentChange4h?: number;
  amplitude1d?: number;
  highPrice1d?: number;
  lowPrice1d?: number;
  volume1d?: number;
  percentChange1d?: number;
  amplitude1w?: number;
  highPrice1w?: number;
  lowPrice1w?: number;
  volume1w?: number;
  percentChange1w?: number;
  recentPrices?: number[];
  atr14Daily?: number;
  atrLastUpdated?: Date;
}

// Port interfaces (business logic contracts)
export interface PriceDataPort {
  getCurrentPrice(symbol: string): Promise<PriceData>;
  getHistoricalData(symbol: string, interval: string, limit?: number): Promise<HistoricalData>;
  getExtendedData?(symbol: string, options?: any): Promise<ExtendedPriceData>;
  subscribeToRealTime(symbol: string, callback: (data: PriceData) => void): void;
  unsubscribeFromRealTime(symbol: string): void;
  healthCheck(): Promise<boolean>;
  getName(): string;
  getPriority(): number;
}

export interface ChartPort {
  initialize(container: HTMLElement): Promise<void>;
  setData(data: CandlestickData[]): void;
  updateRealTime(data: CandlestickData): void;
  resize(): void;
  destroy(): void;
  getType(): string;
}

// Provider health and status
export interface ProviderStatus {
  providerId: string;
  isHealthy: boolean;
  isActive: boolean;
  lastCheck: Date;
  responseTime: number;
  consecutiveFailures: number;
  priority: number;
}

// Error types
export class ProviderError extends Error {
  constructor(
    message: string,
    public providerId: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class DataFetchError extends Error {
  constructor(
    message: string,
    public symbol: string,
    public operation: string,
    public providerId?: string
  ) {
    super(message);
    this.name = 'DataFetchError';
  }
}
