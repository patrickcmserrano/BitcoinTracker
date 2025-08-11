import type { PriceDataPort } from '../domain/interfaces';
import { BinanceProvider } from './binance-provider';
import { CoinbaseProvider } from './coinbase-provider';

export type ProviderType = 'binance' | 'coinbase' | 'coingecko';

/**
 * Factory class for creating price data providers
 * Implements Factory pattern for clean provider instantiation
 */
export class ProviderFactory {
  private static providers: Map<ProviderType, () => PriceDataPort> = new Map();

  // Initialize providers in static block
  static {
    this.providers.set('binance', () => new BinanceProvider());
    this.providers.set('coinbase', () => new CoinbaseProvider());
  }

  /**
   * Create a single provider instance by type
   */
  static create(providerType: ProviderType): PriceDataPort {
    const factory = this.providers.get(providerType);
    if (!factory) {
      throw new Error(`Unknown provider type: ${providerType}`);
    }
    return factory();
  }

  /**
   * Get list of all available provider types
   */
  static getAvailableProviders(): ProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Create all available providers, sorted by priority
   */
  static createAll(): PriceDataPort[] {
    return this.getAvailableProviders()
      .map(type => this.create(type))
      .sort((a, b) => a.getPriority() - b.getPriority());
  }

  /**
   * Create providers by priority order
   */
  static createByPriority(types?: ProviderType[]): PriceDataPort[] {
    const typesToCreate = types || this.getAvailableProviders();
    return typesToCreate
      .map(type => this.create(type))
      .sort((a, b) => a.getPriority() - b.getPriority());
  }

  /**
   * Register a new provider type (for extensibility)
   */
  static register(providerType: ProviderType, factory: () => PriceDataPort): void {
    this.providers.set(providerType, factory);
  }

  /**
   * Check if a provider type is supported
   */
  static isSupported(providerType: string): providerType is ProviderType {
    return this.providers.has(providerType as ProviderType);
  }

  /**
   * Get provider info without creating instances
   */
  static getProviderInfo(): Array<{
    type: ProviderType;
    name: string;
    priority: number;
  }> {
    return this.getAvailableProviders().map(type => {
      const provider = this.create(type);
      const info = {
        type,
        name: provider.getName(),
        priority: provider.getPriority()
      };
      // Clean up the temporary instance
      if ('destroy' in provider && typeof provider.destroy === 'function') {
        provider.destroy();
      }
      return info;
    });
  }
}
