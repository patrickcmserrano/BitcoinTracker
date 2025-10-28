/**
 * Serviço Binance Futures API
 * 
 * ✅ GRATUITO - Não requer API Key
 * 
 * API para dados de derivativos de Futures:
 * - Funding Rate (taxa de financiamento)
 * - Open Interest (juros em aberto)
 * - Long/Short Ratio parcial (top traders accounts)
 * 
 * Documentação: https://binance-docs.github.io/apidocs/futures/en/
 */

import axios from 'axios';
import { cacheService } from './cache-service';

const FUTURES_BASE_URL = 'https://fapi.binance.com';

// ===== INTERFACES =====

export interface FundingRateData {
  symbol: string;
  fundingRate: number;
  fundingRatePercent: number;
  fundingTime: number;
  nextFundingTime: number;
  timestamp: number;
}

export interface OpenInterestData {
  symbol: string;
  openInterest: number;        // Quantidade em contratos
  openInterestValue: number;   // Valor em USDT
  timestamp: number;
}

export interface LongShortRatioData {
  symbol: string;
  longAccount: number;         // Percentual de contas em long
  shortAccount: number;        // Percentual de contas em short
  longShortRatio: number;      // Proporção long/short
  timestamp: number;
}

export interface TopTraderPositionRatioData {
  symbol: string;
  longPosition: number;        // Percentual de posição long dos top traders
  shortPosition: number;       // Percentual de posição short dos top traders
  timestamp: number;
}

export interface BinanceFuturesData {
  fundingRate: FundingRateData | null;
  openInterest: OpenInterestData | null;
  longShortRatio: LongShortRatioData | null;
  topTraderRatio: TopTraderPositionRatioData | null;
}

// ===== API METHODS =====

/**
 * Obtém o Funding Rate atual e próximo
 * @param symbol Símbolo do par (ex: 'BTCUSDT')
 */
export async function getFundingRate(symbol: string = 'BTCUSDT'): Promise<FundingRateData> {
  try {
    const response = await axios.get(`${FUTURES_BASE_URL}/fapi/v1/premiumIndex`, {
      params: { symbol }
    });

    const data = response.data;
    const fundingRate = parseFloat(data.lastFundingRate);
    
    return {
      symbol,
      fundingRate,
      fundingRatePercent: fundingRate * 100,
      fundingTime: data.fundingTime,
      nextFundingTime: data.nextFundingTime,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Erro ao buscar Funding Rate de ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém o histórico do Funding Rate
 * @param symbol Símbolo do par (ex: 'BTCUSDT')
 * @param limit Número de registros (máximo 1000, padrão 100)
 */
export async function getFundingRateHistory(
  symbol: string = 'BTCUSDT',
  limit: number = 100
): Promise<Array<{ fundingRate: number; fundingTime: number }>> {
  try {
    const response = await axios.get(`${FUTURES_BASE_URL}/fapi/v1/fundingRate`, {
      params: {
        symbol,
        limit: Math.min(limit, 1000)
      }
    });

    return response.data.map((item: any) => ({
      fundingRate: parseFloat(item.fundingRate),
      fundingTime: item.fundingTime
    }));
  } catch (error) {
    console.error(`Erro ao buscar histórico de Funding Rate de ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém o Open Interest atual
 * @param symbol Símbolo do par (ex: 'BTCUSDT')
 */
export async function getOpenInterest(symbol: string = 'BTCUSDT'): Promise<OpenInterestData> {
  try {
    // Buscar Open Interest e preço atual em paralelo
    const [oiResponse, priceResponse] = await Promise.all([
      axios.get(`${FUTURES_BASE_URL}/fapi/v1/openInterest`, {
        params: { symbol }
      }),
      axios.get(`${FUTURES_BASE_URL}/fapi/v1/ticker/price`, {
        params: { symbol }
      })
    ]);

    const openInterest = parseFloat(oiResponse.data.openInterest);
    const price = parseFloat(priceResponse.data.price);
    const openInterestValue = openInterest * price;

    return {
      symbol,
      openInterest,
      openInterestValue,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error(`Erro ao buscar Open Interest de ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém o histórico do Open Interest
 * @param symbol Símbolo do par (ex: 'BTCUSDT')
 * @param period Período: '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'
 * @param limit Número de registros (máximo 500, padrão 30)
 */
export async function getOpenInterestHistory(
  symbol: string = 'BTCUSDT',
  period: string = '1h',
  limit: number = 30
): Promise<Array<{ openInterest: number; timestamp: number }>> {
  try {
    const response = await axios.get(`${FUTURES_BASE_URL}/futures/data/openInterestHist`, {
      params: {
        symbol,
        period,
        limit: Math.min(limit, 500)
      }
    });

    return response.data.map((item: any) => ({
      openInterest: parseFloat(item.sumOpenInterest),
      timestamp: item.timestamp
    }));
  } catch (error) {
    console.error(`Erro ao buscar histórico de Open Interest de ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém o Long/Short Ratio (proporção de contas)
 * @param symbol Símbolo do par (ex: 'BTCUSDT')
 * @param period Período: '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'
 * @param limit Número de registros (máximo 500, padrão 1)
 */
export async function getLongShortAccountRatio(
  symbol: string = 'BTCUSDT',
  period: string = '1h',
  limit: number = 1
): Promise<LongShortRatioData> {
  try {
    const response = await axios.get(`${FUTURES_BASE_URL}/futures/data/globalLongShortAccountRatio`, {
      params: {
        symbol,
        period,
        limit: Math.min(limit, 500)
      }
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Nenhum dado de Long/Short Ratio disponível');
    }

    const latest = response.data[0];
    const longAccount = parseFloat(latest.longAccount) * 100;
    const shortAccount = parseFloat(latest.shortAccount) * 100;
    
    return {
      symbol,
      longAccount,
      shortAccount,
      longShortRatio: longAccount / shortAccount,
      timestamp: latest.timestamp
    };
  } catch (error) {
    console.error(`Erro ao buscar Long/Short Account Ratio de ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém o histórico do Long/Short Ratio (proporção de contas)
 * @param symbol Símbolo do par (ex: 'BTCUSDT')
 * @param period Período: '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'
 * @param limit Número de registros (máximo 500, padrão 30)
 */
export async function getLongShortAccountRatioHistory(
  symbol: string = 'BTCUSDT',
  period: string = '1h',
  limit: number = 30
): Promise<Array<{ longAccount: number; shortAccount: number; timestamp: number }>> {
  try {
    const response = await axios.get(`${FUTURES_BASE_URL}/futures/data/globalLongShortAccountRatio`, {
      params: {
        symbol,
        period,
        limit: Math.min(limit, 500)
      }
    });

    return response.data.map((item: any) => ({
      longAccount: parseFloat(item.longAccount) * 100,
      shortAccount: parseFloat(item.shortAccount) * 100,
      timestamp: item.timestamp
    }));
  } catch (error) {
    console.error(`Erro ao buscar histórico de Long/Short Account Ratio de ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém a proporção de posições dos Top Traders
 * @param symbol Símbolo do par (ex: 'BTCUSDT')
 * @param period Período: '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'
 * @param limit Número de registros (máximo 500, padrão 1)
 */
export async function getTopTraderPositionRatio(
  symbol: string = 'BTCUSDT',
  period: string = '1h',
  limit: number = 1
): Promise<TopTraderPositionRatioData> {
  try {
    const response = await axios.get(`${FUTURES_BASE_URL}/futures/data/topLongShortPositionRatio`, {
      params: {
        symbol,
        period,
        limit: Math.min(limit, 500)
      }
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('Nenhum dado de Top Trader Position Ratio disponível');
    }

    const latest = response.data[0];
    const longPosition = parseFloat(latest.longPosition);
    const shortPosition = parseFloat(latest.shortPosition);
    
    // Validar se os valores são números válidos
    if (isNaN(longPosition) || isNaN(shortPosition)) {
      console.warn('Valores inválidos de Top Trader Position:', { longPosition, shortPosition, latest });
      throw new Error('Dados de Top Trader Position inválidos');
    }
    
    return {
      symbol,
      longPosition: longPosition * 100,
      shortPosition: shortPosition * 100,
      timestamp: latest.timestamp
    };
  } catch (error) {
    console.error(`Erro ao buscar Top Trader Position Ratio de ${symbol}:`, error);
    throw error;
  }
}

/**
 * Obtém todos os dados de Futures da Binance
 * @param symbol Símbolo do par (ex: 'BTCUSDT')
 */
export async function getBinanceFuturesData(symbol: string = 'BTCUSDT'): Promise<BinanceFuturesData> {
  const cacheKey = `binance_futures_${symbol}`;
  
  return cacheService.get(
    cacheKey,
    async () => {
      try {
        console.log(`Binance Futures: Buscando dados de ${symbol}...`);

        // Buscar todos os dados em paralelo com tratamento individual de erros
        const results = await Promise.allSettled([
          getFundingRate(symbol),
          getOpenInterest(symbol),
          getLongShortAccountRatio(symbol, '1h'),
          getTopTraderPositionRatio(symbol, '1h')
        ]);

        // Log dos resultados para debug
        results.forEach((result, index) => {
          const names = ['FundingRate', 'OpenInterest', 'LongShortRatio', 'TopTraderRatio'];
          if (result.status === 'rejected') {
            console.error(`Binance Futures ${names[index]} falhou:`, result.reason);
          } else {
            console.log(`Binance Futures ${names[index]} sucesso:`, result.value);
          }
        });

        const [fundingRate, openInterest, longShortRatio, topTraderRatio] = results;

        const resultData = {
          fundingRate: fundingRate.status === 'fulfilled' ? fundingRate.value : null,
          openInterest: openInterest.status === 'fulfilled' ? openInterest.value : null,
          longShortRatio: longShortRatio.status === 'fulfilled' ? longShortRatio.value : null,
          topTraderRatio: topTraderRatio.status === 'fulfilled' ? topTraderRatio.value : null
        };

        console.log('Binance Futures: Dados finais:', resultData);
        return resultData;

      } catch (error) {
        console.error(`Erro ao buscar dados de Futures de ${symbol}:`, error);
        // Retornar estrutura vazia em caso de erro
        return {
          fundingRate: null,
          openInterest: null,
          longShortRatio: null,
          topTraderRatio: null
        };
      }
    },
    {
      ttl: 60000, // 1 minuto para dados de Futures
      apiType: 'binance'
    }
  );
}

// ===== FORMATAÇÃO E UTILIDADES =====

/**
 * Formata Funding Rate para exibição
 * @param rate Taxa de funding (ex: 0.0001 = 0.01%)
 * @param showSign Se deve mostrar o sinal +/-
 */
export function formatFundingRate(rate: number, showSign: boolean = true): string {
  const percent = rate * 100;
  const sign = showSign && percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(4)}%`;
}

/**
 * Formata Open Interest para exibição
 * @param value Valor em USDT
 */
export function formatOpenInterest(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Formata Long/Short Ratio para exibição
 */
export function formatLongShortRatio(data: LongShortRatioData): string {
  return `Long: ${data.longAccount.toFixed(1)}% | Short: ${data.shortAccount.toFixed(1)}% (${data.longShortRatio.toFixed(2)})`;
}

/**
 * Determina o sentimento do mercado baseado no Funding Rate
 * @param rate Taxa de funding
 * @returns 'bullish' | 'neutral' | 'bearish'
 */
export function getFundingRateSentiment(rate: number): 'bullish' | 'neutral' | 'bearish' {
  if (rate > 0.001) return 'bullish';      // > 0.1%
  if (rate < -0.001) return 'bearish';     // < -0.1%
  return 'neutral';
}

/**
 * Determina o sentimento do mercado baseado no Long/Short Ratio
 * @param ratio Proporção long/short
 * @returns 'bullish' | 'neutral' | 'bearish'
 */
export function getLongShortSentiment(ratio: number): 'bullish' | 'neutral' | 'bearish' {
  if (ratio > 1.2) return 'bullish';       // Mais de 55% em long
  if (ratio < 0.8) return 'bearish';       // Mais de 55% em short
  return 'neutral';
}

/**
 * Calcula a variação percentual do Open Interest
 */
export function calculateOpenInterestChange(
  current: number,
  previous: number
): { change: number; changePercent: number } {
  const change = current - previous;
  const changePercent = (change / previous) * 100;
  return { change, changePercent };
}

/**
 * Formata timestamp para data legível
 */
export function formatFundingTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calcula o tempo restante até o próximo funding
 */
export function getTimeUntilNextFunding(nextFundingTime: number): string {
  const now = Date.now();
  const diff = nextFundingTime - now;
  
  if (diff <= 0) return 'Em breve';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Verifica se o sistema de Futures está disponível
 */
export async function checkFuturesHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${FUTURES_BASE_URL}/fapi/v1/ping`);
    return response.status === 200;
  } catch (error) {
    console.error('Binance Futures API não está disponível:', error);
    return false;
  }
}

/**
 * Obtém informações do servidor de Futures
 */
export async function getFuturesServerTime(): Promise<number> {
  try {
    const response = await axios.get(`${FUTURES_BASE_URL}/fapi/v1/time`);
    return response.data.serverTime;
  } catch (error) {
    console.error('Erro ao obter tempo do servidor de Futures:', error);
    return Date.now();
  }
}
