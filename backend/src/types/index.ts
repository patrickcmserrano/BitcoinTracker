export interface CryptoConfig {
  id: string;
  symbol: string; // BTC, ETH, SOL
  name: string; // Bitcoin, Ethereum
  binanceSymbol: string; // BTCUSDT
  taapiSymbol: string; // BTC/USDT
  icon: string;
  color: string;
  precision: number;
}

export interface TimeframeData {
  amplitude: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  percentChange: number;
}

export interface CryptoData {
  config: CryptoConfig;
  price: number;
  volume24h: number;
  percentChange: number;
  volumePerHour: number;

  // Timeframes
  timeframes: {
    '10m': TimeframeData;
    '1h': TimeframeData;
    '4h': TimeframeData;
    '1d': TimeframeData;
    '1w': TimeframeData;
  };

  lastUpdate: Date;
  recentPrices: number[];

  // Optional ATR
  atr14Daily?: number;
  atrLastUpdated?: Date;
}

export interface OHLCVData {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

export interface TechnicalAnalysis {
  macd: {
    MACD: number;
    signal: number;
    histogram: number;
  } | null;
  rsi: number | null;
  atr: number | null;
  sma20: number | null;
  sma50: number | null;
  ema9: number | null;
  ema21: number | null;
  stochastic: {
    k: number;
    d: number;
  } | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  trend: 'bullish' | 'bearish' | 'neutral';
  timestamp: Date;
}

export interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingRatePercent: number;
  fundingTime: number;
  nextFundingTime: number;
  sentiment: 'bullish' | 'neutral' | 'bearish';
  timestamp: number;
}

export interface OpenInterestData {
  symbol: string;
  openInterest: number;
  openInterestValue: number;
  timestamp: number;
}

export interface LongShortRatioData {
  symbol: string;
  longAccount: number;
  shortAccount: number;
  longShortRatio: number;
  timestamp: number;
}

export interface TopTraderPositionRatioData {
  symbol: string;
  longPosition: number;
  shortPosition: number;
  timestamp: number;
}

export interface FuturesData {
  fundingRate: FundingRateData | null;
  openInterest: OpenInterestData | null;
  longShortRatio: LongShortRatioData | null;
  topTraderRatio: TopTraderPositionRatioData | null;
}

export interface FearGreedData {
  value: number;
  classification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  timestamp: number;
}

export interface BTCDominanceData {
  btcDominance: number;
  ethDominance: number;
  totalMarketCap: number;
  total24hVolume: number;
  activeCryptocurrencies: number;
  timestamp: number;
}

export interface MarketIndicators {
  fearGreed: FearGreedData;
  btcDominance: BTCDominanceData;
  timestamp: Date;
}

export interface TripleScreenAnalysis {
  symbol: string;
  screens: {
    screen1: {
      interval: string;
      trend: 'bullish' | 'bearish' | 'neutral';
      indicators: any;
    };
    screen2: {
      interval: string;
      trend: 'bullish' | 'bearish' | 'neutral';
      indicators: any;
    };
    screen3: {
      interval: string;
      trend: 'bullish' | 'bearish' | 'neutral';
      indicators: any;
    };
  };
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  timestamp: Date;
}
