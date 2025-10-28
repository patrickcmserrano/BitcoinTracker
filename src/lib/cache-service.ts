/**
 * Serviço de Cache Centralizado
 * Gerencia cache de requisições de API com controle de TTL e rate limiting
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

class CacheService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private requestLog: Map<string, RequestRecord[]> = new Map();
  private defaultTTL: number = 60000; // 1 minuto padrão

  // Configurações de rate limiting por tipo de API
  private rateLimits: Record<string, RateLimitConfig> = {
    binance: { maxRequests: 20, windowMs: 60000 }, // 20 requisições por minuto
    taapi: { maxRequests: 10, windowMs: 60000 }, // 10 requisições por minuto (API paga)
    coinglass: { maxRequests: 15, windowMs: 60000 }, // 15 requisições por minuto
    default: { maxRequests: 30, windowMs: 60000 } // 30 requisições por minuto
  };

  constructor() {
    // Limpar cache expirado a cada minuto
    setInterval(() => this.cleanExpiredCache(), 60000);
    // Limpar log de requisições antigas a cada 5 minutos
    setInterval(() => this.cleanRequestLog(), 300000);
  }

  /**
   * Obtém dados do cache ou executa a função de busca
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number;
      apiType?: string;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL, apiType = 'default', forceRefresh = false } = options;

    // Verificar se há dados em cache válidos
    if (!forceRefresh) {
      const cached = this.getCached<T>(key);
      if (cached !== null) {
        console.log(`✅ Cache hit: ${key}`);
        return cached;
      }
    }

    // Verificar rate limiting antes de fazer requisição
    if (!this.canMakeRequest(key, apiType)) {
      console.warn(`⚠️ Rate limit reached for ${apiType}, using stale cache if available`);
      
      // Tentar retornar cache mesmo se expirado
      const staleCache = this.getStaleCache<T>(key);
      if (staleCache !== null) {
        console.log(`📦 Returning stale cache: ${key}`);
        return staleCache;
      }

      // Se não houver cache, aguardar antes de tentar novamente
      await this.waitForRateLimit(apiType);
    }

    // Fazer requisição e registrar
    console.log(`🔄 Fetching fresh data: ${key}`);
    this.recordRequest(key, apiType);

    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      // Em caso de erro, tentar retornar cache expirado
      const staleCache = this.getStaleCache<T>(key);
      if (staleCache !== null) {
        console.log(`📦 Error fetching data, returning stale cache: ${key}`);
        return staleCache;
      }
      throw error;
    }
  }

  /**
   * Armazena dados no cache
   */
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + ttl
    });
    console.log(`💾 Cached: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Obtém dados do cache se ainda válidos
   */
  getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now > entry.expiresAt) {
      console.log(`⏰ Cache expired: ${key}`);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Obtém dados do cache mesmo se expirados (para fallback)
   */
  getStaleCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? (entry.data as T) : null;
  }

  /**
   * Verifica se pode fazer uma requisição baseado no rate limit
   */
  canMakeRequest(key: string, apiType: string): boolean {
    const limit = this.rateLimits[apiType] || this.rateLimits.default;
    const records = this.requestLog.get(key) || [];
    const now = Date.now();

    // Filtrar apenas requisições dentro da janela de tempo
    const recentRequests = records.filter(
      record => now - record.timestamp < limit.windowMs
    );

    return recentRequests.length < limit.maxRequests;
  }

  /**
   * Registra uma requisição para controle de rate limiting
   */
  recordRequest(key: string, apiType: string): void {
    const now = Date.now();
    const records = this.requestLog.get(key) || [];
    
    records.push({
      timestamp: now,
      count: 1
    });

    this.requestLog.set(key, records);
  }

  /**
   * Aguarda antes de tentar fazer requisição quando rate limit é atingido
   */
  async waitForRateLimit(apiType: string): Promise<void> {
    const limit = this.rateLimits[apiType] || this.rateLimits.default;
    const waitTime = limit.windowMs / limit.maxRequests;
    console.log(`⏳ Waiting ${waitTime}ms due to rate limit...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  /**
   * Limpa cache expirado
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  /**
   * Limpa log de requisições antigas
   */
  cleanRequestLog(): void {
    const now = Date.now();
    const maxAge = 600000; // 10 minutos
    let cleaned = 0;

    for (const [key, records] of this.requestLog.entries()) {
      const filteredRecords = records.filter(
        record => now - record.timestamp < maxAge
      );

      if (filteredRecords.length === 0) {
        this.requestLog.delete(key);
        cleaned++;
      } else if (filteredRecords.length < records.length) {
        this.requestLog.set(key, filteredRecords);
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} old request log entries`);
    }
  }

  /**
   * Invalida cache por chave específica
   */
  invalidate(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Invalidated cache: ${key}`);
  }

  /**
   * Invalida cache por padrão (ex: todos os dados de uma cripto)
   */
  invalidatePattern(pattern: string): void {
    let invalidated = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        invalidated++;
      }
    }
    console.log(`🗑️ Invalidated ${invalidated} cache entries matching: ${pattern}`);
  }

  /**
   * Limpa todo o cache
   */
  clearAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.requestLog.clear();
    console.log(`🗑️ Cleared all cache (${size} entries)`);
  }

  /**
   * Obtém estatísticas do cache
   */
  getStats(): {
    cacheSize: number;
    requestLogSize: number;
    hitRate?: number;
  } {
    return {
      cacheSize: this.cache.size,
      requestLogSize: this.requestLog.size
    };
  }
}

// Singleton instance
export const cacheService = new CacheService();
