import type { PriceDataPort, PriceData, HistoricalData, ExtendedPriceData, ProviderStatus } from '../domain/interfaces';
import { ProviderFactory } from '../providers/provider-factory';

/**
 * Service layer for coordinating price data providers
 * This is the main entry point for the application to access price data
 * Implements Service Layer pattern with basic provider coordination
 */
export class PriceDataService {
  private providers: PriceDataPort[] = [];
  private activeProvider: PriceDataPort | null = null;
  private providerStatuses: Map<string, ProviderStatus> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize all available providers sorted by priority
   */
  private initializeProviders(): void {
    try {
      this.providers = ProviderFactory.createAll();
      
      // Set the first provider (highest priority) as active
      if (this.providers.length > 0) {
        this.activeProvider = this.providers[0];
        console.log(`PriceDataService: Active provider set to ${this.activeProvider.getName()}`);
      } else {
        console.warn('PriceDataService: No providers available');
      }

      // Initialize provider statuses
      this.providers.forEach(provider => {
        this.providerStatuses.set(provider.getName(), {
          providerId: provider.getName(),
          isHealthy: true, // Assume healthy initially
          isActive: provider === this.activeProvider,
          lastCheck: new Date(),
          responseTime: 0,
          consecutiveFailures: 0,
          priority: provider.getPriority()
        });
      });

    } catch (error) {
      console.error('PriceDataService: Error initializing providers:', error);
      throw error;
    }
  }

  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol: string): Promise<PriceData> {
    if (!this.activeProvider) {
      throw new Error('No active provider available');
    }

    try {
      const startTime = performance.now();
      const result = await this.activeProvider.getCurrentPrice(symbol);
      const responseTime = performance.now() - startTime;

      // Update provider status
      this.updateProviderStatus(this.activeProvider.getName(), true, responseTime);
      
      return result;
    } catch (error) {
      console.error(`PriceDataService: Current price fetch failed with ${this.activeProvider.getName()}:`, error);
      this.updateProviderStatus(this.activeProvider.getName(), false, 0);
      throw error;
    }
  }

  /**
   * Get historical data for a symbol
   */
  async getHistoricalData(symbol: string, interval: string, limit?: number): Promise<HistoricalData> {
    if (!this.activeProvider) {
      throw new Error('No active provider available');
    }

    try {
      const startTime = performance.now();
      const result = await this.activeProvider.getHistoricalData(symbol, interval, limit);
      const responseTime = performance.now() - startTime;

      // Update provider status
      this.updateProviderStatus(this.activeProvider.getName(), true, responseTime);

      return result;
    } catch (error) {
      console.error(`PriceDataService: Historical data fetch failed with ${this.activeProvider.getName()}:`, error);
      this.updateProviderStatus(this.activeProvider.getName(), false, 0);
      throw error;
    }
  }

  /**
   * Get extended data (for backward compatibility with existing API)
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
        result = await this.activeProvider.getExtendedData(symbol, options);
      } else {
        // Fallback: construct extended data from basic price data
        const basicData = await this.activeProvider.getCurrentPrice(symbol);
        result = {
          ...basicData,
          // Set default values for extended fields
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
      console.error(`PriceDataService: Extended data fetch failed with ${this.activeProvider.getName()}:`, error);
      this.updateProviderStatus(this.activeProvider.getName(), false, 0);
      throw error;
    }
  }

  /**
   * Subscribe to real-time price updates
   */
  subscribeToRealTime(symbol: string, callback: (data: PriceData) => void): void {
    if (this.activeProvider) {
      this.activeProvider.subscribeToRealTime(symbol, callback);
      console.log(`PriceDataService: Subscribed to real-time updates for ${symbol} via ${this.activeProvider.getName()}`);
    } else {
      console.warn('PriceDataService: No active provider for real-time subscription');
    }
  }

  /**
   * Unsubscribe from real-time price updates
   */
  unsubscribeFromRealTime(symbol: string): void {
    if (this.activeProvider) {
      this.activeProvider.unsubscribeFromRealTime(symbol);
      console.log(`PriceDataService: Unsubscribed from real-time updates for ${symbol} via ${this.activeProvider.getName()}`);
    }
  }

  /**
   * Manually switch to a different provider
   */
  async switchProvider(providerId: string): Promise<boolean> {
    const targetProvider = this.providers.find(p => p.getName() === providerId);
    
    if (!targetProvider) {
      console.error(`PriceDataService: Provider ${providerId} not found`);
      return false;
    }

    // Test the provider health first
    try {
      const isHealthy = await targetProvider.healthCheck();
      if (!isHealthy) {
        console.warn(`PriceDataService: Provider ${providerId} is not healthy`);
        return false;
      }

      // Update active provider
      if (this.activeProvider) {
        this.updateProviderStatus(this.activeProvider.getName(), true, 0, false);
      }

      this.activeProvider = targetProvider;
      this.updateProviderStatus(providerId, true, 0, true);
      
      console.log(`PriceDataService: Switched to provider ${providerId}`);
      return true;

    } catch (error) {
      console.error(`PriceDataService: Error switching to provider ${providerId}:`, error);
      return false;
    }
  }

  /**
   * Get the currently active provider
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
   * Get provider statuses
   */
  getProviderStatuses(): Map<string, ProviderStatus> {
    return new Map(this.providerStatuses);
  }

  /**
   * Get provider status by ID
   */
  getProviderStatus(providerId: string): ProviderStatus | undefined {
    return this.providerStatuses.get(providerId);
  }

  /**
   * Update provider status
   */
  private updateProviderStatus(
    providerId: string, 
    isHealthy: boolean, 
    responseTime: number, 
    isActive?: boolean
  ): void {
    const status = this.providerStatuses.get(providerId);
    if (status) {
      status.isHealthy = isHealthy;
      status.lastCheck = new Date();
      status.responseTime = responseTime;
      
      if (isHealthy) {
        status.consecutiveFailures = 0;
      } else {
        status.consecutiveFailures++;
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
    }
  }

  /**
   * Perform health check on all providers
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
        console.error(`PriceDataService: Health check failed for ${provider.getName()}:`, error);
        this.updateProviderStatus(provider.getName(), false, 0);
        results.set(provider.getName(), false);
        return { providerId: provider.getName(), isHealthy: false, responseTime: 0 };
      }
    });

    const healthResults = await Promise.all(healthChecks);
    
    console.log('PriceDataService: Health check results:', 
      healthResults.map(r => `${r.providerId}: ${r.isHealthy ? '✓' : '✗'}`).join(', ')
    );

    return results;
  }

  /**
   * Clean up all providers
   */
  destroy(): void {
    console.log('PriceDataService: Destroying service and cleaning up providers');
    
    this.providers.forEach(provider => {
      if ('destroy' in provider && typeof provider.destroy === 'function') {
        provider.destroy();
      }
    });

    this.providers = [];
    this.activeProvider = null;
    this.providerStatuses.clear();
  }
}
