/**
 * Serviço de Indicadores de Mercado
 * 
 * APIs gratuitas para dados de sentimento e dominância de mercado
 */

// Cache para evitar chamadas excessivas às APIs
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Verifica se o cache é válido
 */
function isCacheValid(key: string): boolean {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Obtém dados do cache
 */
function getFromCache<T>(key: string): T | null {
  if (!isCacheValid(key)) return null;
  return cache.get(key)?.data ?? null;
}

/**
 * Salva dados no cache
 */
function saveToCache<T>(key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

// ===== FEAR & GREED INDEX (Alternative.me) =====

export interface FearGreedData {
  value: number;
  valueClassification: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
  timestamp: number;
  timeSinceUpdate?: string;
  previousValue?: number; // Valor do dia anterior
  change?: number; // Variação (valor atual - valor anterior)
  changePercentage?: number; // Variação percentual
}

/**
 * Obtém o Fear & Greed Index da Alternative.me
 * API gratuita, sem necessidade de autenticação
 */
export async function getFearGreedIndex(): Promise<FearGreedData> {
  const cacheKey = 'fear_greed_index';
  
  // Tentar obter do cache primeiro
  const cached = getFromCache<FearGreedData>(cacheKey);
  if (cached) {
    console.log('Fear & Greed Index obtido do cache');
    return cached;
  }

  try {
    // Buscar os últimos 2 dias para calcular variação
    const response = await fetch('https://api.alternative.me/fng/?limit=2');
    
    if (!response.ok) {
      throw new Error(`Erro na API Alternative.me: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      throw new Error('Dados não disponíveis');
    }

    const latestData = data.data[0];
    const previousData = data.data[1]; // Dia anterior
    
    const value = parseInt(latestData.value);
    const previousValue = previousData ? parseInt(previousData.value) : value;
    const change = value - previousValue;
    const changePercentage = previousValue !== 0 ? (change / previousValue) * 100 : 0;
    
    const result: FearGreedData = {
      value,
      valueClassification: classifyFearGreed(value),
      timestamp: parseInt(latestData.timestamp) * 1000, // converter para ms
      timeSinceUpdate: latestData.time_until_update,
      previousValue,
      change,
      changePercentage
    };

    // Salvar no cache
    saveToCache(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Erro ao buscar Fear & Greed Index:', error);
    throw error;
  }
}

/**
 * Classifica o valor do Fear & Greed Index
 */
function classifyFearGreed(value: number): FearGreedData['valueClassification'] {
  if (value <= 25) return 'Extreme Fear';
  if (value <= 45) return 'Fear';
  if (value <= 55) return 'Neutral';
  if (value <= 75) return 'Greed';
  return 'Extreme Greed';
}

/**
 * Retorna emoji baseado no Fear & Greed
 */
export function getFearGreedEmoji(classification: string): string {
  const emojiMap: Record<string, string> = {
    'Extreme Fear': '😱',
    'Fear': '😰',
    'Neutral': '😐',
    'Greed': '🤑',
    'Extreme Greed': '🚀'
  };
  return emojiMap[classification] || '❓';
}

// ===== BTC DOMINANCE (CoinGecko) =====

export interface BTCDominanceData {
  btcDominance: number; // Porcentagem
  ethDominance: number; // Porcentagem
  totalMarketCap: number; // USD
  total24hVolume: number; // USD
  activeCryptocurrencies: number;
  markets: number;
  timestamp: number;
  btcDominanceChange?: number; // Variação de dominância BTC
  marketCapChange24h?: number; // Variação percentual do market cap em 24h
}

/**
 * Obtém dados globais de mercado do CoinGecko
 * Inclui BTC Dominance, market cap total, etc.
 * API gratuita com rate limit de 10-50 chamadas/minuto
 */
export async function getBTCDominance(): Promise<BTCDominanceData> {
  const cacheKey = 'btc_dominance';
  
  // Tentar obter do cache primeiro
  const cached = getFromCache<BTCDominanceData>(cacheKey);
  if (cached) {
    console.log('BTC Dominance obtido do cache');
    return cached;
  }

  try {
    const response = await fetch('https://api.coingecko.com/api/v3/global');
    
    if (!response.ok) {
      throw new Error(`Erro na API CoinGecko: ${response.status}`);
    }

    const json = await response.json();
    const data = json.data;
    
    const result: BTCDominanceData = {
      btcDominance: data.market_cap_percentage.btc || 0,
      ethDominance: data.market_cap_percentage.eth || 0,
      totalMarketCap: data.total_market_cap.usd || 0,
      total24hVolume: data.total_volume.usd || 0,
      activeCryptocurrencies: data.active_cryptocurrencies || 0,
      markets: data.markets || 0,
      timestamp: Date.now(),
      btcDominanceChange: data.market_cap_change_percentage_24h_usd || 0,
      marketCapChange24h: data.market_cap_change_percentage_24h_usd || 0
    };

    // Salvar no cache
    saveToCache(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Erro ao buscar BTC Dominance:', error);
    throw error;
  }
}

// ===== CRYPTO RANKING (CoinGecko) =====

export interface CryptoRankingData {
  id: string;
  symbol: string;
  name: string;
  rank: number;
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply: number;
  image?: string;
}

/**
 * Obtém ranking de criptomoedas do CoinGecko
 * @param symbols Array de símbolos (ex: ['bitcoin', 'ethereum', 'solana'])
 */
export async function getCryptoRanking(symbols: string[]): Promise<CryptoRankingData[]> {
  const cacheKey = `crypto_ranking_${symbols.join('_')}`;
  
  // Tentar obter do cache primeiro
  const cached = getFromCache<CryptoRankingData[]>(cacheKey);
  if (cached) {
    console.log('Crypto Ranking obtido do cache');
    return cached;
  }

  try {
    const ids = symbols.join(',');
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&sparkline=false`
    );
    
    if (!response.ok) {
      throw new Error(`Erro na API CoinGecko: ${response.status}`);
    }

    const data = await response.json();
    
    const result: CryptoRankingData[] = data.map((coin: any) => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      rank: coin.market_cap_rank,
      price: coin.current_price,
      priceChange24h: coin.price_change_percentage_24h || 0,
      marketCap: coin.market_cap,
      volume24h: coin.total_volume,
      circulatingSupply: coin.circulating_supply,
      image: coin.image
    }));

    // Salvar no cache
    saveToCache(cacheKey, result);
    
    return result;
  } catch (error) {
    console.error('Erro ao buscar Crypto Ranking:', error);
    throw error;
  }
}

// ===== COMBINED MARKET INDICATORS =====

export interface MarketIndicators {
  fearGreed: FearGreedData;
  btcDominance: BTCDominanceData;
  timestamp: Date;
}

/**
 * Obtém todos os indicadores de mercado em uma única chamada
 */
export async function getMarketIndicators(): Promise<MarketIndicators> {
  try {
    const [fearGreed, btcDominance] = await Promise.all([
      getFearGreedIndex(),
      getBTCDominance()
    ]);

    return {
      fearGreed,
      btcDominance,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Erro ao buscar indicadores de mercado:', error);
    throw error;
  }
}

/**
 * Limpa o cache (útil para testes ou forçar atualização)
 */
export function clearCache(): void {
  cache.clear();
  console.log('Cache de indicadores de mercado limpo');
}

/**
 * Formata valores grandes (market cap, volume)
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}
