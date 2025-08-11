import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProviderChain } from '../provider-chain';
import type { PriceDataPort } from '../../domain/interfaces';

// Mock provider implementation
class MockProvider implements PriceDataPort {
  private _healthy = true;

  constructor(
    private name: string,
    private priority: number,
    healthy = true
  ) {
    this._healthy = healthy;
  }

  getName(): string {
    return this.name;
  }

  getPriority(): number {
    return this.priority;
  }

  async getCurrentPrice(symbol: string) {
    if (!this._healthy) {
      throw new Error(`${this.name} is down`);
    }
    return {
      symbol,
      price: 50000,
      volume24h: 1000000,
      priceChange24h: 1000,
      priceChangePercent24h: 2.0,
      timestamp: new Date()
    };
  }

  async getHistoricalData(symbol: string, interval: string, limit?: number) {
    if (!this._healthy) {
      throw new Error(`${this.name} is down`);
    }
    return {
      symbol,
      interval,
      data: []
    };
  }

  async healthCheck(): Promise<boolean> {
    return this._healthy;
  }

  subscribeToRealTime() {}
  unsubscribeFromRealTime() {}
  getActiveSubscriptions() { return 0; }
  getSubscribedSymbols() { return []; }
  destroy() {}

  // Test helper
  setHealthy(healthy: boolean) {
    this._healthy = healthy;
  }
}

describe('ProviderChain', () => {
  let chain: ProviderChain;
  let provider1: MockProvider;
  let provider2: MockProvider;
  let provider3: MockProvider;

  beforeEach(() => {
    chain = new ProviderChain();
    provider1 = new MockProvider('provider1', 1);
    provider2 = new MockProvider('provider2', 2);
    provider3 = new MockProvider('provider3', 3);
  });

  describe('Chain Management', () => {
    it('should start empty', () => {
      expect(chain.isEmpty()).toBe(true);
      expect(chain.getProviderCount()).toBe(0);
      expect(chain.getProviders()).toEqual([]);
    });

    it('should add providers to chain', () => {
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      expect(chain.isEmpty()).toBe(false);
      expect(chain.getProviderCount()).toBe(2);

      const providers = chain.getProviders();
      expect(providers).toHaveLength(2);
      expect(providers[0].getName()).toBe('provider1');
      expect(providers[1].getName()).toBe('provider2');
    });

    it('should remove providers from chain', () => {
      chain.addProvider(provider1);
      chain.addProvider(provider2);
      chain.addProvider(provider3);

      // Remove middle provider
      const removed = chain.removeProvider('provider2');
      
      expect(removed).toBe(true);
      expect(chain.getProviderCount()).toBe(2);
      
      const providers = chain.getProviders();
      expect(providers.map(p => p.getName())).toEqual(['provider1', 'provider3']);
    });

    it('should remove head provider', () => {
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const removed = chain.removeProvider('provider1');
      
      expect(removed).toBe(true);
      expect(chain.getProviderCount()).toBe(1);
      expect(chain.getProviders()[0].getName()).toBe('provider2');
    });

    it('should handle removing non-existent provider', () => {
      chain.addProvider(provider1);

      const removed = chain.removeProvider('nonexistent');
      
      expect(removed).toBe(false);
      expect(chain.getProviderCount()).toBe(1);
    });

    it('should clear all providers', () => {
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      chain.clear();
      
      expect(chain.isEmpty()).toBe(true);
      expect(chain.getProviderCount()).toBe(0);
    });

    it('should get provider by ID', () => {
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const found = chain.getProvider('provider2');
      expect(found?.getName()).toBe('provider2');

      const notFound = chain.getProvider('nonexistent');
      expect(notFound).toBeUndefined();
    });
  });

  describe('Chain Execution - getCurrentPrice', () => {
    it('should succeed with first provider when healthy', async () => {
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const result = await chain.getCurrentPrice('BTCUSDT');
      
      expect(result.result.symbol).toBe('BTCUSDT');
      expect(result.result.price).toBe(50000);
      expect(result.providerId).toBe('provider1');
      expect(result.attempts).toBe(1);
      expect(result.failedProviders).toEqual([]);
    });

    it('should failover to second provider when first fails', async () => {
      provider1.setHealthy(false); // Make first provider fail
      
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const result = await chain.getCurrentPrice('BTCUSDT');
      
      expect(result.result.symbol).toBe('BTCUSDT');
      expect(result.providerId).toBe('provider2');
      expect(result.attempts).toBe(2);
      expect(result.failedProviders).toEqual(['provider1']);
    });

    it('should fail when all providers fail', async () => {
      provider1.setHealthy(false);
      provider2.setHealthy(false);
      
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      await expect(chain.getCurrentPrice('BTCUSDT'))
        .rejects.toThrow('All providers failed for getCurrentPrice');
    });

    it('should respect maxAttempts option', async () => {
      provider1.setHealthy(false);
      provider2.setHealthy(false);
      provider3.setHealthy(false);
      
      chain.addProvider(provider1);
      chain.addProvider(provider2);
      chain.addProvider(provider3);

      await expect(chain.getCurrentPrice('BTCUSDT', { maxAttempts: 2 }))
        .rejects.toThrow('All providers failed for getCurrentPrice');
    });

    it('should skip unhealthy providers when option is set', async () => {
      provider1.setHealthy(false);
      provider2.setHealthy(true);
      
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const result = await chain.getCurrentPrice('BTCUSDT', { 
        skipUnhealthyProviders: true 
      });
      
      expect(result.providerId).toBe('provider2');
      expect(result.attempts).toBe(1); // Should skip provider1, only try provider2
      expect(result.failedProviders).toEqual(['provider1']);
    });
  });

  describe('Chain Execution - getHistoricalData', () => {
    it('should succeed with first provider when healthy', async () => {
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const result = await chain.getHistoricalData('BTCUSDT', '1h', 100);
      
      expect(result.result.symbol).toBe('BTCUSDT');
      expect(result.result.interval).toBe('1h');
      expect(result.providerId).toBe('provider1');
      expect(result.attempts).toBe(1);
    });

    it('should failover to second provider when first fails', async () => {
      provider1.setHealthy(false);
      
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const result = await chain.getHistoricalData('BTCUSDT', '1h');
      
      expect(result.providerId).toBe('provider2');
      expect(result.attempts).toBe(2);
      expect(result.failedProviders).toEqual(['provider1']);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout operations that take too long', async () => {
      const slowProvider = new MockProvider('slow', 1);
      // Mock slow response
      vi.spyOn(slowProvider, 'getCurrentPrice').mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          symbol: 'BTCUSDT',
          price: 50000,
          volume24h: 1000000,
          priceChange24h: 1000,
          priceChangePercent24h: 2.0,
          timestamp: new Date()
        }), 200))
      );

      chain.addProvider(slowProvider);
      chain.addProvider(provider2);

      const result = await chain.getCurrentPrice('BTCUSDT', { 
        timeout: 100 // Short timeout
      });
      
      // Should fail over to provider2 due to timeout
      expect(result.providerId).toBe('provider2');
      expect(result.failedProviders).toEqual(['slow']);
    });
  });

  describe('Chain Status', () => {
    it('should return status for all providers in chain', async () => {
      provider1.setHealthy(true);
      provider2.setHealthy(false);
      
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const status = await chain.getChainStatus();
      
      expect(status).toHaveLength(2);
      expect(status[0].providerId).toBe('provider1');
      expect(status[0].isHealthy).toBe(true);
      expect(status[0].position).toBe(1);
      expect(status[0].priority).toBe(1);
      
      expect(status[1].providerId).toBe('provider2');
      expect(status[1].isHealthy).toBe(false);
      expect(status[1].position).toBe(2);
      expect(status[1].priority).toBe(2);
    });

    it('should measure health check response times', async () => {
      chain.addProvider(provider1);

      const status = await chain.getChainStatus();
      
      expect(status[0].responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof status[0].responseTime).toBe('number');
    });
  });

  describe('Priority Reordering', () => {
    it('should reorder providers by priority', () => {
      const highPriority = new MockProvider('high', 1);
      const mediumPriority = new MockProvider('medium', 5);
      const lowPriority = new MockProvider('low', 10);

      // Add in wrong order
      chain.addProvider(lowPriority);
      chain.addProvider(highPriority);
      chain.addProvider(mediumPriority);

      // Check initial order
      let providers = chain.getProviders();
      expect(providers.map(p => p.getName())).toEqual(['low', 'high', 'medium']);

      // Reorder by priority
      chain.reorderByPriority();

      // Check new order
      providers = chain.getProviders();
      expect(providers.map(p => p.getName())).toEqual(['high', 'medium', 'low']);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty chain', async () => {
      await expect(chain.getCurrentPrice('BTCUSDT'))
        .rejects.toThrow('No providers available in chain');
        
      await expect(chain.getHistoricalData('BTCUSDT', '1h'))
        .rejects.toThrow('No providers available in chain');
    });

    it('should provide detailed error messages', async () => {
      provider1.setHealthy(false);
      provider2.setHealthy(false);
      
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      try {
        await chain.getCurrentPrice('BTCUSDT');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toContain('All providers failed for getCurrentPrice');
        expect(error.message).toContain('Attempted: 2');
        expect(error.message).toContain('Failed providers: provider1, provider2');
        expect(error.message).toContain('Execution time:');
      }
    });

    it('should handle health check failures gracefully', async () => {
      const faultyProvider = new MockProvider('faulty', 1);
      vi.spyOn(faultyProvider, 'healthCheck').mockRejectedValue(new Error('Health check failed'));
      
      chain.addProvider(faultyProvider);

      const status = await chain.getChainStatus();
      
      expect(status[0].isHealthy).toBe(false);
      expect(status[0].responseTime).toBeUndefined();
    });
  });

  describe('Execution Time Tracking', () => {
    it('should track execution time', async () => {
      chain.addProvider(provider1);

      const result = await chain.getCurrentPrice('BTCUSDT');
      
      expect(result.executionTime).toBeGreaterThan(0);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should include failover time in execution time', async () => {
      provider1.setHealthy(false);
      
      chain.addProvider(provider1);
      chain.addProvider(provider2);

      const result = await chain.getCurrentPrice('BTCUSDT');
      
      // Should include time for both attempts
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.attempts).toBe(2);
    });
  });
});
