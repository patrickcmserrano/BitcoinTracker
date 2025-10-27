/**
 * Serviço Coinglass API
 * 
 * ⚠️ NOTA: Este serviço NÃO está sendo usado na aplicação atualmente.
 * 
 * Motivo: Requer API Key paga do Coinglass.
 * Status: Implementado mas desabilitado por padrão.
 * 
 * API para dados de derivativos: LSR, Open Interest, Liquidações e Heatmap
 * Requer API Key (plano pago)
 * 
 * Para habilitar:
 * 1. Obtenha uma API Key em: https://www.coinglass.com/
 * 2. Use: setCoinglassApiKey('sua_key_aqui')
 * 3. Importe e use as funções neste arquivo
 * 
 * Documentação: https://docs.coinglass.com/
 */

const COINGLASS_API_BASE = 'https://open-api-v4.coinglass.com';

// Configuração de API Key (armazenar no localStorage ou variável de ambiente)
let API_KEY: string | null = null;

/**
 * Define a API Key do Coinglass
 * @param key API Key obtida no painel do Coinglass
 */
export function setCoinglassApiKey(key: string): void {
  API_KEY = key;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('coinglass_api_key', key);
  }
}

/**
 * Obtém a API Key armazenada
 */
export function getCoinglassApiKey(): string | null {
  if (API_KEY) return API_KEY;
  
  if (typeof localStorage !== 'undefined') {
    API_KEY = localStorage.getItem('coinglass_api_key');
  }
  
  return API_KEY;
}

/**
 * Verifica se a API Key está configurada
 */
export function hasApiKey(): boolean {
  return getCoinglassApiKey() !== null;
}

// ===== INTERFACES =====

export interface LSRData {
  symbol: string;
  longRate: number;
  shortRate: number;
  longShortRatio: number;
  timestamp: number;
  exchange?: string;
}

export interface OpenInterestData {
  symbol: string;
  totalOpenInterest: number;
  openInterestUSD: number;
  change24h: number;
  change24hPercent: number;
  timestamp: number;
}

export interface LiquidationData {
  symbol: string;
  totalLiquidation24h: number;
  longLiquidation: number;
  shortLiquidation: number;
  timestamp: number;
}

export interface LiquidationHeatmapLevel {
  price: number;
  amount: number;
  leverage: number;
}

export interface LiquidationHeatmapData {
  symbol: string;
  levels: {
    '12h': LiquidationHeatmapLevel[];
    '24h': LiquidationHeatmapLevel[];
    '1w': LiquidationHeatmapLevel[];
    '1m': LiquidationHeatmapLevel[];
  };
  timestamp: number;
}

export interface CoinglassMarketData {
  lsr: LSRData | null;
  openInterest: OpenInterestData | null;
  liquidations: LiquidationData | null;
  heatmap: LiquidationHeatmapData | null;
}

// ===== HELPER FUNCTIONS =====

/**
 * Cria headers para requisição autenticada
 */
function createHeaders(): HeadersInit {
  const apiKey = getCoinglassApiKey();
  if (!apiKey) {
    throw new Error('API Key do Coinglass não configurada. Use setCoinglassApiKey() primeiro.');
  }

  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Faz uma requisição autenticada para a API Coinglass
 */
async function coinglassRequest<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${COINGLASS_API_BASE}${endpoint}`, {
      headers: createHeaders()
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('API Key inválida ou expirada');
      }
      if (response.status === 429) {
        throw new Error('Rate limit excedido. Tente novamente em alguns minutos.');
      }
      throw new Error(`Erro na API Coinglass: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Erro ao acessar ${endpoint}:`, error);
    throw error;
  }
}

// ===== API METHODS =====

/**
 * Obtém o Long/Short Ratio de um símbolo
 * @param symbol Símbolo da criptomoeda (ex: 'BTC', 'ETH')
 */
export async function getLongShortRatio(symbol: string = 'BTC'): Promise<LSRData> {
  if (!hasApiKey()) {
    throw new Error('API Key não configurada');
  }

  try {
    const data = await coinglassRequest<any>(`/public/v2/long_short_ratio?symbol=${symbol}`);
    
    return {
      symbol,
      longRate: data.longRate || 0,
      shortRate: data.shortRate || 0,
      longShortRatio: data.longRate / data.shortRate || 0,
      timestamp: Date.now(),
      exchange: data.exchange
    };
  } catch (error) {
    console.error('Erro ao buscar LSR:', error);
    throw error;
  }
}

/**
 * Obtém o Open Interest de um símbolo
 * @param symbol Símbolo da criptomoeda (ex: 'BTC', 'ETH')
 */
export async function getOpenInterest(symbol: string = 'BTC'): Promise<OpenInterestData> {
  if (!hasApiKey()) {
    throw new Error('API Key não configurada');
  }

  try {
    const data = await coinglassRequest<any>(`/public/v2/open_interest?symbol=${symbol}`);
    
    return {
      symbol,
      totalOpenInterest: data.totalOpenInterest || 0,
      openInterestUSD: data.openInterestUSD || 0,
      change24h: data.change24h || 0,
      change24hPercent: data.change24hPercent || 0,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Erro ao buscar Open Interest:', error);
    throw error;
  }
}

/**
 * Obtém dados de liquidação das últimas 24h
 * @param symbol Símbolo da criptomoeda (ex: 'BTC', 'ETH')
 */
export async function getLiquidations(symbol: string = 'BTC'): Promise<LiquidationData> {
  if (!hasApiKey()) {
    throw new Error('API Key não configurada');
  }

  try {
    const data = await coinglassRequest<any>(`/reference/liquidation-history?symbol=${symbol}&timeframe=24h`);
    
    return {
      symbol,
      totalLiquidation24h: data.totalLiquidation || 0,
      longLiquidation: data.longLiquidation || 0,
      shortLiquidation: data.shortLiquidation || 0,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Erro ao buscar liquidações:', error);
    throw error;
  }
}

/**
 * Obtém o heatmap de liquidação
 * @param symbol Símbolo da criptomoeda (ex: 'BTC', 'ETH')
 */
export async function getLiquidationHeatmap(symbol: string = 'BTC'): Promise<LiquidationHeatmapData> {
  if (!hasApiKey()) {
    throw new Error('API Key não configurada');
  }

  try {
    // Nota: O endpoint exato pode variar conforme a documentação oficial
    const data = await coinglassRequest<any>(`/public/v2/liquidation_heatmap?symbol=${symbol}`);
    
    return {
      symbol,
      levels: {
        '12h': data.levels_12h || [],
        '24h': data.levels_24h || [],
        '1w': data.levels_1w || [],
        '1m': data.levels_1m || []
      },
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Erro ao buscar heatmap de liquidação:', error);
    throw error;
  }
}

/**
 * Obtém todos os dados de mercado do Coinglass
 * @param symbol Símbolo da criptomoeda (ex: 'BTC', 'ETH')
 */
export async function getCoinglassMarketData(symbol: string = 'BTC'): Promise<CoinglassMarketData> {
  if (!hasApiKey()) {
    console.warn('API Key do Coinglass não configurada. Os dados de derivativos não estarão disponíveis.');
    return {
      lsr: null,
      openInterest: null,
      liquidations: null,
      heatmap: null
    };
  }

  try {
    // Buscar todos os dados em paralelo
    const [lsr, openInterest, liquidations, heatmap] = await Promise.allSettled([
      getLongShortRatio(symbol),
      getOpenInterest(symbol),
      getLiquidations(symbol),
      getLiquidationHeatmap(symbol)
    ]);

    return {
      lsr: lsr.status === 'fulfilled' ? lsr.value : null,
      openInterest: openInterest.status === 'fulfilled' ? openInterest.value : null,
      liquidations: liquidations.status === 'fulfilled' ? liquidations.value : null,
      heatmap: heatmap.status === 'fulfilled' ? heatmap.value : null
    };
  } catch (error) {
    console.error('Erro ao buscar dados do Coinglass:', error);
    throw error;
  }
}

// ===== MOCK DATA (para desenvolvimento sem API Key) =====

/**
 * Retorna dados mock para desenvolvimento
 * Útil para testar a interface sem ter API Key
 */
export function getMockCoinglassData(): CoinglassMarketData {
  return {
    lsr: {
      symbol: 'BTC',
      longRate: 52.3,
      shortRate: 47.7,
      longShortRatio: 1.096,
      timestamp: Date.now()
    },
    openInterest: {
      symbol: 'BTC',
      totalOpenInterest: 535000,
      openInterestUSD: 35500000000,
      change24h: 2500000000,
      change24hPercent: 7.58,
      timestamp: Date.now()
    },
    liquidations: {
      symbol: 'BTC',
      totalLiquidation24h: 125000000,
      longLiquidation: 78000000,
      shortLiquidation: 47000000,
      timestamp: Date.now()
    },
    heatmap: {
      symbol: 'BTC',
      levels: {
        '12h': [
          { price: 67500, amount: 50000000, leverage: 10 },
          { price: 68000, amount: 75000000, leverage: 20 },
          { price: 68500, amount: 100000000, leverage: 50 }
        ],
        '24h': [
          { price: 66500, amount: 120000000, leverage: 10 },
          { price: 67000, amount: 150000000, leverage: 20 }
        ],
        '1w': [],
        '1m': []
      },
      timestamp: Date.now()
    }
  };
}

/**
 * Formata valores de liquidação
 */
export function formatLiquidation(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

/**
 * Formata LSR para exibição
 */
export function formatLSR(lsr: LSRData): string {
  return `Long: ${lsr.longRate.toFixed(1)}% | Short: ${lsr.shortRate.toFixed(1)}% (Ratio: ${lsr.longShortRatio.toFixed(2)})`;
}
