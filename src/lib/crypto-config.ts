// Configuração das criptomoedas suportadas pela aplicação
export interface CryptoConfig {
  id: string;                    // 'bitcoin', 'ethereum', 'solana'
  name: string;                  // 'Bitcoin', 'Ethereum', 'Solana'
  symbol: string;                // 'BTC', 'ETH', 'SOL'
  binanceSymbol: string;         // 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'
  taapiSymbol: string;          // 'BTC/USDT', 'ETH/USDT', 'SOL/USDT'
  icon: string;                  // '₿', 'Ξ', '◎'
  color: string;                 // Cor primária para UI
  precision: number;             // Casas decimais para preço
}

export interface CryptoData {
  config: CryptoConfig;
  price: number;
  volume24h: number;
  percentChange: number;
  volumePerHour: number;
  
  // Dados por timeframe
  amplitude10m: number;
  highPrice10m: number;
  lowPrice10m: number;
  volume10m: number;
  percentChange10m: number;
  
  amplitude1h: number;
  highPrice1h: number;
  lowPrice1h: number;
  volume1h: number;
  percentChange1h: number;
  
  amplitude4h: number;
  highPrice4h: number;
  lowPrice4h: number;
  volume4h: number;
  percentChange4h: number;
  
  amplitude1d: number;
  highPrice1d: number;
  lowPrice1d: number;
  volume1d: number;
  percentChange1d: number;
  
  amplitude1w: number;
  highPrice1w: number;
  lowPrice1w: number;
  volume1w: number;
  percentChange1w: number;
  
  lastUpdate: Date;
  recentPrices: number[];
  
  // Indicadores TAAPI
  atr14Daily?: number;
  atrLastUpdated?: Date;
}

export const CRYPTO_CONFIGS: Record<string, CryptoConfig> = {
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    binanceSymbol: 'BTCUSDT',
    taapiSymbol: 'BTC/USDT',
    icon: '₿',
    color: '#f7931a',
    precision: 0
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    binanceSymbol: 'ETHUSDT',
    taapiSymbol: 'ETH/USDT',
    icon: 'Ξ',
    color: '#627eea',
    precision: 0
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    binanceSymbol: 'SOLUSDT',
    taapiSymbol: 'SOL/USDT',
    icon: '◎',
    color: '#9945ff',
    precision: 2
  },
  xrp: {
    id: 'xrp',
    name: 'XRP',
    symbol: 'XRP',
    binanceSymbol: 'XRPUSDT',
    taapiSymbol: 'XRP/USDT',
    icon: '◯',
    color: '#23292f',
    precision: 4
  },
  paxg: {
    id: 'paxg',
    name: 'PAX Gold',
    symbol: 'PAXG',
    binanceSymbol: 'PAXGUSDT',
    taapiSymbol: 'PAXG/USDT',
    icon: '🥇',
    color: '#ffd700',
    precision: 0
  },
  trx: {
    id: 'trx',
    name: 'TRON',
    symbol: 'TRX',
    binanceSymbol: 'TRXUSDT',
    taapiSymbol: 'TRX/USDT',
    icon: '⚡',
    color: '#ff060a',
    precision: 6
  },
  usdtbrl: {
    id: 'usdtbrl',
    name: 'USDT/BRL',
    symbol: 'USDT/BRL',
    binanceSymbol: 'USDTBRL',
    taapiSymbol: 'USDT/BRL',
    icon: '💱',
    color: '#26a17b',
    precision: 2
  }
};

// Funções utilitárias
export const getDefaultCrypto = (): CryptoConfig => CRYPTO_CONFIGS.bitcoin;

export const getCryptoById = (id: string): CryptoConfig | undefined => CRYPTO_CONFIGS[id];

export const getAllCryptos = (): CryptoConfig[] => Object.values(CRYPTO_CONFIGS);

export const getCryptoIds = (): string[] => Object.keys(CRYPTO_CONFIGS);

// Validação
export const isValidCryptoId = (id: string): boolean => id in CRYPTO_CONFIGS;
