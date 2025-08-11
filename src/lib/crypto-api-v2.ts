/**
 * Backward-compatible API wrapper
 * This file maintains the existing API surface while using the new provider architecture internally
 */

import { BitcoinTrackingService } from './services/bitcoin-tracking-service';
import type { CryptoConfig, CryptoData } from './crypto-config';

// Create a singleton instance for backward compatibility
let trackingServiceInstance: BitcoinTrackingService | null = null;

function getTrackingService(): BitcoinTrackingService {
  if (!trackingServiceInstance) {
    trackingServiceInstance = new BitcoinTrackingService();
  }
  return trackingServiceInstance;
}

/**
 * Get comprehensive crypto data for a specific configuration
 * This is the new preferred method that replaces getBitcoinData
 */
export const getCryptoData = async (
  config: CryptoConfig, 
  options: { checkATR?: boolean } = {}
): Promise<CryptoData> => {
  return getTrackingService().getCryptoData(config, options);
};

/**
 * Legacy Bitcoin data method - maintained for backward compatibility
 * @deprecated Use getCryptoData with CRYPTO_CONFIGS.bitcoin instead
 */
export const getBitcoinData = async (options: { checkATR?: boolean } = {}): Promise<CryptoData> => {
  return getTrackingService().getBitcoinData(options);
};

/**
 * Subscribe to real-time price updates
 */
export const subscribeToRealTime = (symbol: string, callback: (data: any) => void): void => {
  getTrackingService().subscribeToRealTime(symbol, callback);
};

/**
 * Unsubscribe from real-time price updates
 */
export const unsubscribeFromRealTime = (symbol: string): void => {
  getTrackingService().unsubscribeFromRealTime(symbol);
};

/**
 * Get information about the currently active data provider
 */
export const getActiveProvider = (): { name: string; priority: number } | null => {
  return getTrackingService().getActiveProvider();
};

/**
 * Get information about all available data providers
 */
export const getAvailableProviders = (): Array<{ name: string; priority: number; isHealthy: boolean }> => {
  return getTrackingService().getAvailableProviders();
};

/**
 * Manually switch to a different data provider
 */
export const switchProvider = async (providerId: string): Promise<boolean> => {
  return getTrackingService().switchProvider(providerId);
};

/**
 * Perform health check on all providers
 */
export const performHealthCheck = async (): Promise<Map<string, boolean>> => {
  return getTrackingService().performHealthCheck();
};

/**
 * Get the tracking service instance for advanced usage
 */
export const getTrackingServiceInstance = (): BitcoinTrackingService => {
  return getTrackingService();
};

/**
 * Legacy ATR method - maintained for existing components
 * Note: This is a simplified version that may not have full ATR functionality
 */
export const getATRData = async (config: CryptoConfig): Promise<{ atr14Daily: number; atrLastUpdated: Date } | null> => {
  try {
    // Try to get ATR data through the extended data method
    const data = await getTrackingService().getCryptoData(config, { checkATR: true });
    
    if (data.atr14Daily && data.atrLastUpdated) {
      return {
        atr14Daily: data.atr14Daily,
        atrLastUpdated: data.atrLastUpdated
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching ATR data:', error);
    return null;
  }
};

// For debugging and development
export const __internal = {
  getTrackingService: () => trackingServiceInstance,
  resetService: () => {
    trackingServiceInstance?.destroy();
    trackingServiceInstance = null;
  }
};
