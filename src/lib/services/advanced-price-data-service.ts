import { ProviderFactory } from '../providers/provider-factory';
import { ProviderChain } from './provider-chain';
import { CircuitBreaker, CircuitState, type CircuitBreakerConfig, type CircuitBreakerStats } from './circuit-breaker';
import type { 
  PriceDataPort, 
  PriceData, 
  HistoricalData, 
  ExtendedPriceData 
} from '../domain/interfaces';

export interface ProviderStatus {
  providerId: string;
  isHealthy: boolean;
  isActive: boolean;
  lastCheck: Date;
  consecutiveFailures: number;
  responseTime: number;
  priority: number;
  circuitState: CircuitState;
  circuitStats: CircuitBreakerStats;
}

export interface AdvancedPriceDataServiceConfig {
  enableCircuitBreaker: boolean;
  enableChainFailover: boolean;
  healthCheckInterval: number;
  circuitBreakerConfig: CircuitBreakerConfig;
  maxProviderAttempts: number;
  operationTimeout: number;
}

/**
 * Advanced Price Data Service with Circuit Breaker and Chain of Responsibility patterns
 * Provides intelligent failover, health monitoring, and cascade failure prevention
 */
export class AdvancedPriceDataService {
  private providers: PriceDataPort[] = [];
  private activeProvider: PriceDataPort | null = null;
  private providerStatuses = new Map<string, ProviderStatus>();
  private providerChain: ProviderChain;
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private statusChangeListeners: Array<(statuses: Map<string, ProviderStatus>) => void> = [];

  private readonly config: AdvancedPriceDataServiceConfig = {
    enableCircuitBreaker: true,
    enableChainFailover: true,
    healthCheckInterval: 30000, // 30 seconds
    maxProviderAttempts: 3,
    operationTimeout: 10000, // 10 seconds
    circuitBreakerConfig: {
      failureThreshold: 5,        // 5 failures before opening
      recoveryTimeout: 60000,     // 1 minute recovery time
      successThreshold: 3,        // 3 successes to close circuit
      monitoringWindow: 300000    // 5 minute monitoring window
    }
  };

  constructor(config?: Partial<AdvancedPriceDataServiceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.providerChain = new ProviderChain();
    this.initializeProviders();
    this.startHealthMonitoring();

    console.log('AdvancedPriceDataService: Initialized with advanced failover patterns');
  }

  /**
   * Initialize providers and set up chain and circuit breakers
   */
  private initializeProviders(): void {
    try {
      this.providers = ProviderFactory.createAll();
      console.log(`AdvancedPriceDataService: Created ${this.providers.length} providers`);

      // Sort by priority and set up chain
      this.providers.sort((a, b) => a.getPriority() - b.getPriority());
      
      this.providers.forEach(provider => {
        // Add to chain
        this.providerChain.addProvider(provider);
        
        // Set up circuit breaker
        if (this.config.enableCircuitBreaker) {
          const circuitBreaker = new CircuitBreaker(
            provider.getName(),
            this.config.circuitBreakerConfig
          );
          this.circuitBreakers.set(provider.getName(), circuitBreaker);
        }

        // Initialize status
        this.providerStatuses.set(provider.getName(), {
          providerId: provider.getName(),
          isHealthy: true,
          isActive: false,
          lastCheck: new Date(),
          consecutiveFailures: 0,
          responseTime: 0,
          priority: provider.getPriority(),
          circuitState: CircuitState.CLOSED,
          circuitStats: {
            state: CircuitState.CLOSED,
            failureCount: 0,
            successCount: 0,
            lastFailureTime: null,
            lastSuccessTime: null,
            totalRequests: 0,
            totalFailures: 0,
            totalSuccesses: 0,
            uptime: 100
          }
        });
      });

      // Set first available provider as active
      if (this.providers.length > 0) {
        this.activeProvider = this.providers[0];
        this.updateProviderStatus(this.activeProvider.getName(), true, 0, true);
        console.log(`AdvancedPriceDataService: Active provider set to ${this.activeProvider.getName()}`);
      } else {
        console.warn('AdvancedPriceDataService: No providers available');
      }

    } catch (error) {
      console.error('AdvancedPriceDataService: Failed to initialize providers:', error);
    }
  }

  /**
   * Get current price using advanced failover
   */
  async getCurrentPrice(symbol: string): Promise<PriceData> {
    if (this.config.enableChainFailover) {
      return this.executeWithChain(symbol, 'getCurrentPrice');
    } else {
      return this.executeWithSingleProvider(
        symbol,
        (provider) => provider.getCurrentPrice(symbol)
      );
    }
  }

  /**
   * Get historical data using advanced failover
   */
  async getHistoricalData(symbol: string, interval: string, limit?: number): Promise<HistoricalData> {
    if (this.config.enableChainFailover) {
      return this.executeWithChain(symbol, 'getHistoricalData', interval, limit);
    } else {
      return this.executeWithSingleProvider(
        symbol,
        (provider) => provider.getHistoricalData(symbol, interval, limit)
      );
    }
  }

  /**
   * Execute getCurrentPrice using chain of responsibility
   */
  private async executeWithChain(symbol: string, operation: 'getCurrentPrice'): Promise<PriceData>;
  private async executeWithChain(symbol: string, operation: 'getHistoricalData', interval: string, limit?: number): Promise<HistoricalData>;
  private async executeWithChain(symbol: string, operation: string, ...args: any[]): Promise<any> {
    try {
      let result;
      
      if (operation === 'getCurrentPrice') {
        const chainResult = await this.providerChain.getCurrentPrice(symbol, {
          maxAttempts: this.config.maxProviderAttempts,
          skipUnhealthyProviders: true,
          timeout: this.config.operationTimeout
        });
        result = chainResult.result;
        
        // Update active provider based on successful provider
        const successfulProvider = this.providers.find(p => p.getName() === chainResult.providerId);
        if (successfulProvider) {
          this.setActiveProvider(successfulProvider);
        }
        
        console.log(`AdvancedPriceDataService: ${operation} succeeded with ${chainResult.providerId} after ${chainResult.attempts} attempts`);
        
      } else if (operation === 'getHistoricalData') {
        const [interval, limit] = args;
        const chainResult = await this.providerChain.getHistoricalData(symbol, interval, limit, {
          maxAttempts: this.config.maxProviderAttempts,
          skipUnhealthyProviders: true,
          timeout: this.config.operationTimeout
        });
        result = chainResult.result;
        
        // Update active provider based on successful provider
        const successfulProvider = this.providers.find(p => p.getName() === chainResult.providerId);
        if (successfulProvider) {
          this.setActiveProvider(successfulProvider);
        }
        
        console.log(`AdvancedPriceDataService: ${operation} succeeded with ${chainResult.providerId} after ${chainResult.attempts} attempts`);
      }

      return result;
      
    } catch (error) {
      console.error(`AdvancedPriceDataService: Chain execution failed for ${operation}:`, error);
      throw error;
    }
  }

  /**
   * Execute operation with single provider (fallback mode)
   */
  private async executeWithSingleProvider<T>(
    symbol: string,
    operation: (provider: PriceDataPort) => Promise<T>
  ): Promise<T> {
    if (!this.activeProvider) {
      throw new Error('No active provider available');
    }

    const providerId = this.activeProvider.getName();
    
    try {
      let result: T;
      
      if (this.config.enableCircuitBreaker) {
        const circuitBreaker = this.circuitBreakers.get(providerId);
        if (circuitBreaker) {
          result = await circuitBreaker.execute(() => operation(this.activeProvider!));
        } else {
          result = await operation(this.activeProvider);
        }
      } else {
        result = await operation(this.activeProvider);
      }

      // Update success status
      this.updateProviderStatus(providerId, true, 0);
      return result;
      
    } catch (error) {
      console.error(`AdvancedPriceDataService: Operation failed with ${providerId}:`, error);
      this.updateProviderStatus(providerId, false, 0);
      throw error;
    }
  }

  /**
   * Set active provider
   */
  private setActiveProvider(provider: PriceDataPort): void {
    if (this.activeProvider?.getName() !== provider.getName()) {
      // Deactivate current provider
      if (this.activeProvider) {
        this.updateProviderStatus(this.activeProvider.getName(), undefined, 0, false);
      }
      
      // Set new active provider
      this.activeProvider = provider;
      this.updateProviderStatus(provider.getName(), true, 0, true);
      
      console.log(`AdvancedPriceDataService: Active provider changed to ${provider.getName()}`);
    }
  }

  /**
   * Get extended data with fallback support
   */
  async getExtendedData(symbol: string, options: any = {}): Promise<ExtendedPriceData> {
    if (!this.activeProvider) {
      throw new Error('No active provider available');
    }

    try {
      const startTime = performance.now();
      let result: ExtendedPriceData;

      // Check if provider supports getExtendedData method
      if ('getExtendedData' in this.activeProvider && 
          typeof this.activeProvider.getExtendedData === 'function') {
        
        if (this.config.enableCircuitBreaker) {
          const circuitBreaker = this.circuitBreakers.get(this.activeProvider.getName());
          if (circuitBreaker) {
            result = await circuitBreaker.execute(() => 
              (this.activeProvider as any).getExtendedData(symbol, options)
            );
          } else {
            result = await (this.activeProvider as any).getExtendedData(symbol, options);
          }
        } else {
          result = await (this.activeProvider as any).getExtendedData(symbol, options);
        }
      } else {
        // Fallback: construct extended data from basic price data
        const basicData = await this.getCurrentPrice(symbol);
        result = {
          ...basicData,
          volumePerHour: basicData.volume24h / 24,
          amplitude10m: 0,
          highPrice10m: basicData.price,
          lowPrice10m: basicData.price,
          volume10m: 0,
          percentChange10m: 0,
          amplitude1h: 0,
          highPrice1h: basicData.price,
          lowPrice1h: basicData.price,
          volume1h: 0,
          percentChange1h: 0,
          amplitude4h: 0,
          highPrice4h: basicData.price,
          lowPrice4h: basicData.price,
          volume4h: 0,
          percentChange4h: 0,
          amplitude1d: 0,
          highPrice1d: basicData.price,
          lowPrice1d: basicData.price,
          volume1d: 0,
          percentChange1d: 0,
          amplitude1w: 0,
          highPrice1w: basicData.price,
          lowPrice1w: basicData.price,
          volume1w: 0,
          percentChange1w: 0,
          recentPrices: [basicData.price]
        };
      }

      const responseTime = performance.now() - startTime;
      this.updateProviderStatus(this.activeProvider.getName(), true, responseTime);
      return result;
      
    } catch (error) {
      console.error(`AdvancedPriceDataService: Extended data fetch failed with ${this.activeProvider.getName()}:`, error);
      this.updateProviderStatus(this.activeProvider.getName(), false, 0);
      throw error;
    }
  }

  /**
   * Update provider status and circuit breaker stats
   */
  private updateProviderStatus(
    providerId: string, 
    isHealthy: boolean | undefined, 
    responseTime: number, 
    isActive?: boolean
  ): void {
    const status = this.providerStatuses.get(providerId);
    if (status) {
      if (isHealthy !== undefined) {
        status.isHealthy = isHealthy;
        status.lastCheck = new Date();
        status.responseTime = responseTime;
        
        if (isHealthy) {
          status.consecutiveFailures = 0;
        } else {
          status.consecutiveFailures++;
        }
      }

      if (isActive !== undefined) {
        status.isActive = isActive;
        
        // Update all other providers to not active
        if (isActive) {
          this.providerStatuses.forEach((otherStatus, otherProviderId) => {
            if (otherProviderId !== providerId) {
              otherStatus.isActive = false;
            }
          });
        }
      }

      // Update circuit breaker stats
      const circuitBreaker = this.circuitBreakers.get(providerId);
      if (circuitBreaker) {
        status.circuitState = circuitBreaker.getState();
        status.circuitStats = circuitBreaker.getStats();
      }

      // Notify listeners
      this.notifyStatusChange();
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log(`AdvancedPriceDataService: Health monitoring started (${this.config.healthCheckInterval}ms interval)`);
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    const healthChecks = this.providers.map(async (provider) => {
      try {
        const startTime = performance.now();
        const isHealthy = await provider.healthCheck();
        const responseTime = performance.now() - startTime;
        
        this.updateProviderStatus(provider.getName(), isHealthy, responseTime);
        results.set(provider.getName(), isHealthy);
        
        return { providerId: provider.getName(), isHealthy, responseTime };
      } catch (error) {
        console.error(`AdvancedPriceDataService: Health check failed for ${provider.getName()}:`, error);
        this.updateProviderStatus(provider.getName(), false, 0);
        results.set(provider.getName(), false);
        return { providerId: provider.getName(), isHealthy: false, responseTime: 0 };
      }
    });

    const healthResults = await Promise.all(healthChecks);
    
    console.log('AdvancedPriceDataService: Health check results:', 
      healthResults.map(r => `${r.providerId}: ${r.isHealthy ? '✓' : '✗'} (${Math.round(r.responseTime)}ms)`).join(', ')
    );

    return results;
  }

  /**
   * Get provider statuses with circuit breaker information
   */
  getProviderStatuses(): Map<string, ProviderStatus> {
    return new Map(this.providerStatuses);
  }

  /**
   * Get chain status
   */
  async getChainStatus(): Promise<Array<{
    providerId: string;
    priority: number;
    isHealthy: boolean;
    responseTime?: number;
    position: number;
  }>> {
    return this.providerChain.getChainStatus();
  }

  /**
   * Switch to specific provider
   */
  async switchProvider(providerId: string): Promise<boolean> {
    const targetProvider = this.providers.find(p => p.getName() === providerId);
    
    if (!targetProvider) {
      console.error(`AdvancedPriceDataService: Provider ${providerId} not found`);
      return false;
    }

    try {
      // Check if provider is healthy
      const isHealthy = await targetProvider.healthCheck();
      if (!isHealthy) {
        console.error(`AdvancedPriceDataService: Provider ${providerId} is not healthy`);
        return false;
      }

      // Update active provider
      this.setActiveProvider(targetProvider);
      console.log(`AdvancedPriceDataService: Switched to provider ${providerId}`);
      return true;
      
    } catch (error) {
      console.error(`AdvancedPriceDataService: Failed to switch to provider ${providerId}:`, error);
      return false;
    }
  }

  /**
   * Force circuit breaker state
   */
  forceCircuitBreaker(providerId: string, state: 'open' | 'closed'): boolean {
    const circuitBreaker = this.circuitBreakers.get(providerId);
    if (!circuitBreaker) {
      return false;
    }

    if (state === 'open') {
      circuitBreaker.forceOpen();
    } else {
      circuitBreaker.forceClose();
    }

    this.updateProviderStatus(providerId, undefined, 0);
    return true;
  }

  /**
   * Add status change listener
   */
  onStatusChange(listener: (statuses: Map<string, ProviderStatus>) => void): void {
    this.statusChangeListeners.push(listener);
  }

  /**
   * Remove status change listener
   */
  removeStatusChangeListener(listener: (statuses: Map<string, ProviderStatus>) => void): void {
    const index = this.statusChangeListeners.indexOf(listener);
    if (index > -1) {
      this.statusChangeListeners.splice(index, 1);
    }
  }

  /**
   * Notify status change listeners
   */
  private notifyStatusChange(): void {
    const statuses = this.getProviderStatuses();
    this.statusChangeListeners.forEach(listener => {
      try {
        listener(statuses);
      } catch (error) {
        console.error('AdvancedPriceDataService: Status change listener error:', error);
      }
    });
  }

  /**
   * Get active provider
   */
  getActiveProvider(): PriceDataPort | null {
    return this.activeProvider;
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): PriceDataPort[] {
    return [...this.providers];
  }

  /**
   * Subscribe to real-time updates
   */
  subscribeToRealTime(symbol: string, callback: (data: PriceData) => void): void {
    if (this.activeProvider) {
      this.activeProvider.subscribeToRealTime(symbol, callback);
      console.log(`AdvancedPriceDataService: Subscribed to real-time updates for ${symbol} via ${this.activeProvider.getName()}`);
    } else {
      console.warn('AdvancedPriceDataService: No active provider for real-time subscription');
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromRealTime(symbol: string): void {
    if (this.activeProvider) {
      this.activeProvider.unsubscribeFromRealTime(symbol);
      console.log(`AdvancedPriceDataService: Unsubscribed from real-time updates for ${symbol} via ${this.activeProvider.getName()}`);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    console.log('AdvancedPriceDataService: Destroying service and cleaning up resources');
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Clean up providers
    this.providers.forEach(provider => {
      if ('destroy' in provider && typeof provider.destroy === 'function') {
        provider.destroy();
      }
    });

    // Clear state
    this.providers = [];
    this.activeProvider = null;
    this.providerStatuses.clear();
    this.circuitBreakers.clear();
    this.providerChain.clear();
    this.statusChangeListeners = [];
  }
}
