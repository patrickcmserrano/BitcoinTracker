import { PriceDataService } from './price-data-service';
import type { CryptoConfig, CryptoData } from '../crypto-config';
import type { ExtendedPriceData } from '../domain/interfaces';

/**
 * Bitcoin tracking service that maintains backward compatibility
 * while using the new provider architecture
 * This service bridges the gap between the new clean architecture and existing components
 */
export class BitcoinTrackingService {
  private priceDataService: PriceDataService;

  constructor() {
    this.priceDataService = new PriceDataService();
  }

  /**
   * Get crypto data in the legacy format for backward compatibility
   * This method transforms the new ExtendedPriceData to the existing CryptoData format
   */
  async getCryptoData(config: CryptoConfig, options: { checkATR?: boolean } = {}): Promise<CryptoData> {
    try {
      console.log(`BitcoinTrackingService: Fetching data for ${config.name}...`);
      
      const extendedData = await this.priceDataService.getExtendedData(config.binanceSymbol, options);
      
      // Transform to legacy CryptoData format
      const legacyData: CryptoData = {
        config,
        price: extendedData.price,
        volume24h: extendedData.volume24h,
        percentChange: extendedData.priceChangePercent24h,
        volumePerHour: extendedData.volumePerHour || extendedData.volume24h / 24,
        amplitude10m: extendedData.amplitude10m || 0,
        highPrice10m: extendedData.highPrice10m || extendedData.price,
        lowPrice10m: extendedData.lowPrice10m || extendedData.price,
        volume10m: extendedData.volume10m || 0,
        percentChange10m: extendedData.percentChange10m || 0,
        amplitude1h: extendedData.amplitude1h || 0,
        highPrice1h: extendedData.highPrice1h || extendedData.price,
        lowPrice1h: extendedData.lowPrice1h || extendedData.price,
        volume1h: extendedData.volume1h || 0,
        percentChange1h: extendedData.percentChange1h || 0,
        amplitude4h: extendedData.amplitude4h || 0,
        highPrice4h: extendedData.highPrice4h || extendedData.price,
        lowPrice4h: extendedData.lowPrice4h || extendedData.price,
        volume4h: extendedData.volume4h || 0,
        percentChange4h: extendedData.percentChange4h || 0,
        amplitude1d: extendedData.amplitude1d || 0,
        highPrice1d: extendedData.highPrice1d || extendedData.price,
        lowPrice1d: extendedData.lowPrice1d || extendedData.price,
        volume1d: extendedData.volume1d || 0,
        percentChange1d: extendedData.percentChange1d || 0,
        amplitude1w: extendedData.amplitude1w || 0,
        highPrice1w: extendedData.highPrice1w || extendedData.price,
        lowPrice1w: extendedData.lowPrice1w || extendedData.price,
        volume1w: extendedData.volume1w || 0,
        percentChange1w: extendedData.percentChange1w || 0,
        lastUpdate: extendedData.timestamp,
        recentPrices: extendedData.recentPrices || [extendedData.price],
        
        // ATR data if available
        ...(extendedData.atr14Daily && {
          atr14Daily: extendedData.atr14Daily,
          atrLastUpdated: extendedData.atrLastUpdated
        })
      };

      console.log(`BitcoinTrackingService: Data for ${config.name} obtained successfully - Price: ${legacyData.price}`);
      return legacyData;

    } catch (error) {
      console.error(`BitcoinTrackingService: Error fetching crypto data for ${config.name}:`, error);
      throw error;
    }
  }

  /**
   * Legacy method for Bitcoin data (maintains existing API)
   */
  async getBitcoinData(options: { checkATR?: boolean } = {}): Promise<CryptoData> {
    // Import crypto config dynamically to avoid circular dependencies
    const { CRYPTO_CONFIGS } = await import('../crypto-config');
    return this.getCryptoData(CRYPTO_CONFIGS.bitcoin, options);
  }

  /**
   * Subscribe to real-time updates for a crypto symbol
   */
  subscribeToRealTime(symbol: string, callback: (data: any) => void): void {
    this.priceDataService.subscribeToRealTime(symbol, callback);
  }

  /**
   * Unsubscribe from real-time updates
   */
  unsubscribeFromRealTime(symbol: string): void {
    this.priceDataService.unsubscribeFromRealTime(symbol);
  }

  /**
   * Get the active data provider information
   */
  getActiveProvider(): { name: string; priority: number } | null {
    const provider = this.priceDataService.getActiveProvider();
    return provider ? {
      name: provider.getName(),
      priority: provider.getPriority()
    } : null;
  }

  /**
   * Get all available providers information
   */
  getAvailableProviders(): Array<{ name: string; priority: number; isHealthy: boolean }> {
    const providers = this.priceDataService.getAvailableProviders();
    const statuses = this.priceDataService.getProviderStatuses();

    return providers.map(provider => {
      const status = statuses.get(provider.getName());
      return {
        name: provider.getName(),
        priority: provider.getPriority(),
        isHealthy: status?.isHealthy ?? false
      };
    });
  }

  /**
   * Manually switch to a different provider
   */
  async switchProvider(providerId: string): Promise<boolean> {
    const success = await this.priceDataService.switchProvider(providerId);
    if (success) {
      console.log(`BitcoinTrackingService: Successfully switched to provider: ${providerId}`);
    }
    return success;
  }

  /**
   * Perform health check on all providers
   */
  async performHealthCheck(): Promise<Map<string, boolean>> {
    return this.priceDataService.performHealthCheck();
  }

  /**
   * Get provider statuses
   */
  getProviderStatuses() {
    return this.priceDataService.getProviderStatuses();
  }

  /**
   * Clean up service
   */
  destroy(): void {
    this.priceDataService.destroy();
  }
}
