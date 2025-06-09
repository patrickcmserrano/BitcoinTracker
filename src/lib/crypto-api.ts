import axios from 'axios';
import { getTaapiService, initializeTaapiService } from './taapi-service';
import { getAppConfig, isTaapiConfigured } from './config';
import type { CryptoConfig, CryptoData } from './crypto-config';

const BASE_URL = 'https://api.binance.com';

interface Ticker24hr {
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

interface Kline {
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
  ignore: string;
}

/**
 * Busca dados de klines (candlesticks) para um símbolo específico
 */
const fetchKlines = async (symbol: string, interval: string, limit: number): Promise<any[]> => {
  const response = await axios.get<any[]>(`${BASE_URL}/api/v3/klines`, {
    params: {
      symbol,
      interval,
      limit
    }
  });
  return response.data;
};

/**
 * Mapeia dados de klines do formato da API para o formato interno
 */
const mapKlines = (data: any[]): Kline[] => data.map(kline => ({
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

/**
 * Processa dados de klines para calcular métricas de diferentes timeframes
 */
const processKlineData = (ticker24hr: Ticker24hr, klines10m: Kline[], klines1h: Kline[], klines4h: Kline[], klines1d: Kline[], klines1w: Kline[]) => {
  // Extrair dados relevantes
  const price = parseFloat(ticker24hr.lastPrice);
  const volume24h = parseFloat(ticker24hr.quoteVolume);
  const percentChange = parseFloat(ticker24hr.priceChangePercent);
  const volumePerHour = volume24h / 24;

  // Função auxiliar para calcular máximos, mínimos e amplitude
  const calculateAmplitude = (klines: Kline[]) => {
    const high = Math.max(...klines.map(k => parseFloat(k.high)));
    const low = Math.min(...klines.map(k => parseFloat(k.low)));
    return { high, low, amplitude: high - low };
  };

  // Função para calcular o volume total em um período
  const calculateVolume = (klines: Kline[]) => {
    return klines.reduce((sum, k) => sum + parseFloat(k.quoteAssetVolume), 0);
  };

  // Função para calcular a variação percentual em um período
  const calculatePercentChange = (klines: Kline[]) => {
    if (klines.length === 0) return 0;
    const firstPrice = parseFloat(klines[0].open);
    const lastPrice = parseFloat(klines[klines.length - 1].close);
    return ((lastPrice - firstPrice) / firstPrice) * 100;
  };

  // Calcular amplitudes, volumes e variações para diferentes períodos
  const { high: highPrice10m, low: lowPrice10m, amplitude: amplitude10m } = calculateAmplitude(klines10m);
  const volume10m = calculateVolume(klines10m);
  const percentChange10m = calculatePercentChange(klines10m);

  const { high: highPrice1h, low: lowPrice1h, amplitude: amplitude1h } = calculateAmplitude(klines1h);
  const volume1h = calculateVolume(klines1h);
  const percentChange1h = calculatePercentChange(klines1h);

  const { high: highPrice4h, low: lowPrice4h, amplitude: amplitude4h } = calculateAmplitude(klines4h);
  const volume4h = calculateVolume(klines4h);
  const percentChange4h = calculatePercentChange(klines4h);

  const { high: highPrice1d, low: lowPrice1d, amplitude: amplitude1d } = calculateAmplitude(klines1d);
  const volume1d = calculateVolume(klines1d);
  const percentChange1d = calculatePercentChange(klines1d);

  const { high: highPrice1w, low: lowPrice1w, amplitude: amplitude1w } = calculateAmplitude(klines1w);
  const volume1w = calculateVolume(klines1w);
  const percentChange1w = calculatePercentChange(klines1w);

  // Armazenar os últimos 10 preços
  const recentPrices = klines10m.map(k => parseFloat(k.close));

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
};

/**
 * Busca dados ATR para uma criptomoeda específica
 */
export const getATRData = async (config: CryptoConfig): Promise<{ atr14Daily: number; atrLastUpdated: Date } | null> => {
  try {
    if (!isTaapiConfigured()) {
      console.log(`TAAPI: Service not configured, skipping ATR fetch for ${config.name}`);
      return null;
    }

    const appConfig = getAppConfig();
    
    // Initialize TAAPI service if needed
    let taapiService;
    try {
      taapiService = getTaapiService();
    } catch {
      taapiService = initializeTaapiService(appConfig.taapiSecretKey);
    }

    const atrResponse = await taapiService.getATR({
      symbol: config.taapiSymbol,
      interval: '1d',
      exchange: 'binance',
      period: 14
    });

    return {
      atr14Daily: atrResponse.value,
      atrLastUpdated: new Date()
    };

  } catch (error) {
    console.error(`Error fetching ATR data for ${config.name}:`, error);
    return null;
  }
};

/**
 * Busca dados completos para uma criptomoeda específica
 */
export const getCryptoData = async (
  config: CryptoConfig, 
  options: { checkATR?: boolean } = {}
): Promise<CryptoData> => {
  const { checkATR = true } = options;
  
  try {
    console.log(`API: Iniciando busca de dados do ${config.name}...`);
    
    // Obter dados de 24 horas
    const ticker24hrResponse = await axios.get<Ticker24hr>(`${BASE_URL}/api/v3/ticker/24hr?symbol=${config.binanceSymbol}`);
    const ticker24hr = ticker24hrResponse.data;

    // Obter dados de candlesticks para diferentes intervalos
    const [klines10mResponse, klines1hResponse, klines4hResponse, klines1dResponse, klines1wResponse] = await Promise.all([
      fetchKlines(config.binanceSymbol, '1m', 10),
      fetchKlines(config.binanceSymbol, '1m', 60),
      fetchKlines(config.binanceSymbol, '1h', 4),
      fetchKlines(config.binanceSymbol, '1h', 24),
      fetchKlines(config.binanceSymbol, '1d', 7)
    ]);

    // Mapear os dados dos klines para o formato adequado
    const klines10m = mapKlines(klines10mResponse);
    const klines1h = mapKlines(klines1hResponse);
    const klines4h = mapKlines(klines4hResponse);
    const klines1d = mapKlines(klines1dResponse);
    const klines1w = mapKlines(klines1wResponse);

    // Processar dados usando a mesma lógica da API original
    const processedData = processKlineData(ticker24hr, klines10m, klines1h, klines4h, klines1d, klines1w);
    
    // Fetch ATR data only if requested (this will be cached and rate-limited)
    const atrData = checkATR ? await getATRData(config) : null;

    const result: CryptoData = {
      config,
      ...processedData,
      // Add ATR data if available
      ...(atrData && {
        atr14Daily: atrData.atr14Daily,
        atrLastUpdated: atrData.atrLastUpdated
      })
    };
    
    console.log(`API: Dados de ${config.name} obtidos com sucesso - Preço atual:`, result.price);
    return result;

  } catch (error) {
    console.error(`Erro ao obter dados do ${config.name}:`, error);
    if (axios.isAxiosError(error)) {
      console.error('Detalhes do erro de rede:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Dados:', error.response.data);
      }
    }
    throw error;
  }
};

// Exportar função legacy para manter compatibilidade
export const getBitcoinData = async (options: { checkATR?: boolean } = {}): Promise<any> => {
  const { CRYPTO_CONFIGS } = await import('./crypto-config');
  return getCryptoData(CRYPTO_CONFIGS.bitcoin, options);
};
