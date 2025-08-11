import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PriceDataService } from '../price-data-service';
import { ProviderFactory } from '../../providers/provider-factory';
import type { PriceDataPort } from '../../domain/interfaces';

// Mock ProviderFactory to control test environment
vi.mock('../../providers/provider-factory', () => ({
  ProviderFactory: {
    createAll: vi.fn(() => [])
  }
}));

// Mock provider implementation
class MockProvider implements PriceDataPort {
  private _healthy = true;
  private _name: string;
  private _priority: number;

  constructor(name: string, priority: number, healthy = true) {
    this._name = name;
    this._priority = priority;
    this._healthy = healthy;
  }

  getName(): string {
    return this._name;
  }

  getPriority(): number {
    return this._priority;
  }

  async getCurrentPrice(symbol: string) {
    if (!this._healthy) {
      throw new Error(`${this._name} is down`);
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
      throw new Error(`${this._name} is down`);
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

describe('PriceDataService', () => {
  let service: PriceDataService;
  let mockPrimary: MockProvider;
  let mockSecondary: MockProvider;
  let mockCreateAll: any;

  beforeEach(() => {
    mockPrimary = new MockProvider('primary', 1);
    mockSecondary = new MockProvider('secondary', 2);
    
    // Mock ProviderFactory.createAll to return our mock providers
    mockCreateAll = vi.mocked(ProviderFactory.createAll);
    mockCreateAll.mockReturnValue([mockPrimary, mockSecondary]);
    
    service = new PriceDataService();
  });

  afterEach(() => {
    service.destroy();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with providers from factory', () => {
      expect(mockCreateAll).toHaveBeenCalled();
      expect(service.getActiveProvider()?.getName()).toBe('primary');
    });

    it('should handle empty provider list', () => {
      mockCreateAll.mockReturnValue([]);
      const emptyService = new PriceDataService();
      
      expect(emptyService.getActiveProvider()).toBeNull();
      emptyService.destroy();
    });
  });

  describe('Provider Management', () => {
    it('should return active provider', () => {
      const activeProvider = service.getActiveProvider();
      expect(activeProvider?.getName()).toBe('primary');
    });

    it('should return available providers', () => {
      const providers = service.getAvailableProviders();
      expect(providers).toHaveLength(2);
      expect(providers[0].getName()).toBe('primary');
      expect(providers[1].getName()).toBe('secondary');
    });

    it('should return provider statuses', () => {
      const statuses = service.getProviderStatuses();
      expect(statuses.size).toBe(2);
      expect(statuses.has('primary')).toBe(true);
      expect(statuses.has('secondary')).toBe(true);
      
      const primaryStatus = statuses.get('primary');
      expect(primaryStatus?.providerId).toBe('primary');
      expect(primaryStatus?.isActive).toBe(true);
      expect(primaryStatus?.priority).toBe(1);
    });
  });

  describe('Current Price Fetching', () => {
    it('should fetch current price from active provider', async () => {
      const result = await service.getCurrentPrice('BTCUSDT');
      
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.price).toBe(50000);
      expect(result.volume24h).toBe(1000000);
    });

    it('should handle provider errors', async () => {
      mockPrimary.setHealthy(false);
      
      await expect(service.getCurrentPrice('BTCUSDT'))
        .rejects.toThrow('primary is down');
    });

    it('should handle no active provider', async () => {
      mockCreateAll.mockReturnValue([]);
      const emptyService = new PriceDataService();
      
      await expect(emptyService.getCurrentPrice('BTCUSDT'))
        .rejects.toThrow('No active provider available');
        
      emptyService.destroy();
    });
  });

  describe('Historical Data', () => {
    it('should fetch historical data from active provider', async () => {
      const result = await service.getHistoricalData('BTCUSDT', '1h', 100);
      
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.interval).toBe('1h');
      expect(result.data).toBeDefined();
    });

    it('should handle provider errors for historical data', async () => {
      mockPrimary.setHealthy(false);
      
      await expect(service.getHistoricalData('BTCUSDT', '1h'))
        .rejects.toThrow('primary is down');
    });
  });

  describe('Extended Data', () => {
    it('should fetch extended data when provider supports it', async () => {
      // Mock getExtendedData method on provider
      (mockPrimary as any).getExtendedData = vi.fn().mockResolvedValue({
        symbol: 'BTCUSDT',
        price: 50000,
        volume24h: 1000000,
        priceChange24h: 1000,
        priceChangePercent24h: 2.0,
        timestamp: new Date(),
        volumePerHour: 41666.67,
        amplitude10m: 0,
        recentPrices: [50000]
      });

      const result = await service.getExtendedData('BTCUSDT');
      
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.price).toBe(50000);
      expect(result.volumePerHour).toBeDefined();
      expect((mockPrimary as any).getExtendedData).toHaveBeenCalledWith('BTCUSDT', {});
    });

    it('should fallback to basic data when provider does not support extended data', async () => {
      const result = await service.getExtendedData('BTCUSDT');
      
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.price).toBe(50000);
      expect(result.volumePerHour).toBe(1000000 / 24); // Calculated fallback
      expect(result.recentPrices).toEqual([50000]);
    });
  });

  describe('Provider Switching', () => {
    it('should switch to a different provider', async () => {
      const result = await service.switchProvider('secondary');
      
      expect(result).toBe(true);
      expect(service.getActiveProvider()?.getName()).toBe('secondary');
    });

    it('should fail to switch to unknown provider', async () => {
      const result = await service.switchProvider('unknown');
      
      expect(result).toBe(false);
      expect(service.getActiveProvider()?.getName()).toBe('primary'); // Should remain primary
    });

    it('should fail to switch to unhealthy provider', async () => {
      mockSecondary.setHealthy(false);
      
      const result = await service.switchProvider('secondary');
      
      expect(result).toBe(false);
      expect(service.getActiveProvider()?.getName()).toBe('primary'); // Should remain primary
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health checks on all providers', async () => {
      const healthSpy1 = vi.spyOn(mockPrimary, 'healthCheck');
      const healthSpy2 = vi.spyOn(mockSecondary, 'healthCheck');
      
      const results = await service.performHealthCheck();
      
      expect(healthSpy1).toHaveBeenCalled();
      expect(healthSpy2).toHaveBeenCalled();
      expect(results.size).toBe(2);
      expect(results.get('primary')).toBe(true);
      expect(results.get('secondary')).toBe(true);
    });

    it('should handle health check failures', async () => {
      mockPrimary.setHealthy(false);
      
      const results = await service.performHealthCheck();
      
      expect(results.get('primary')).toBe(false);
      expect(results.get('secondary')).toBe(true);
    });

    it('should update provider statuses after health checks', async () => {
      mockPrimary.setHealthy(false);
      
      await service.performHealthCheck();
      
      const statuses = service.getProviderStatuses();
      const primaryStatus = statuses.get('primary');
      expect(primaryStatus?.isHealthy).toBe(false);
      expect(primaryStatus?.consecutiveFailures).toBeGreaterThan(0);
    });
  });

  describe('Real-time Subscriptions', () => {
    it('should delegate subscriptions to active provider', () => {
      const subscribeSpy = vi.spyOn(mockPrimary, 'subscribeToRealTime');
      const callback = vi.fn();
      
      service.subscribeToRealTime('BTCUSDT', callback);
      
      expect(subscribeSpy).toHaveBeenCalledWith('BTCUSDT', callback);
    });

    it('should delegate unsubscriptions to active provider', () => {
      const unsubscribeSpy = vi.spyOn(mockPrimary, 'unsubscribeFromRealTime');
      
      service.unsubscribeFromRealTime('BTCUSDT');
      
      expect(unsubscribeSpy).toHaveBeenCalledWith('BTCUSDT');
    });

    it('should handle subscriptions when no active provider', () => {
      mockCreateAll.mockReturnValue([]);
      const emptyService = new PriceDataService();
      
      // Should not throw
      expect(() => emptyService.subscribeToRealTime('BTCUSDT', vi.fn())).not.toThrow();
      expect(() => emptyService.unsubscribeFromRealTime('BTCUSDT')).not.toThrow();
      
      emptyService.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should update provider status on success', async () => {
      await service.getCurrentPrice('BTCUSDT');
      
      const statuses = service.getProviderStatuses();
      const primaryStatus = statuses.get('primary');
      expect(primaryStatus?.isHealthy).toBe(true);
      expect(primaryStatus?.consecutiveFailures).toBe(0);
      expect(primaryStatus?.responseTime).toBeGreaterThan(0);
    });

    it('should update provider status on failure', async () => {
      mockPrimary.setHealthy(false);
      
      try {
        await service.getCurrentPrice('BTCUSDT');
      } catch {
        // Expected to fail
      }
      
      const statuses = service.getProviderStatuses();
      const primaryStatus = statuses.get('primary');
      expect(primaryStatus?.isHealthy).toBe(false);
      expect(primaryStatus?.consecutiveFailures).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should destroy all providers on service destroy', () => {
      const destroySpy1 = vi.spyOn(mockPrimary, 'destroy');
      const destroySpy2 = vi.spyOn(mockSecondary, 'destroy');
      
      service.destroy();
      
      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).toHaveBeenCalled();
      expect(service.getActiveProvider()).toBeNull();
      expect(service.getAvailableProviders()).toHaveLength(0);
    });
  });
});
