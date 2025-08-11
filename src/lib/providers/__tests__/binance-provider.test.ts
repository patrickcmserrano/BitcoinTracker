import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BinanceProvider } from '../binance-provider';

// Mock fetch globally
global.fetch = vi.fn();

describe('BinanceProvider', () => {
  let provider: BinanceProvider;

  beforeEach(() => {
    provider = new BinanceProvider();
    vi.clearAllMocks();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('Basic Properties', () => {
    it('should have correct name and priority', () => {
      expect(provider.getName()).toBe('binance');
      expect(provider.getPriority()).toBe(1);
    });
  });

  describe('getCurrentPrice', () => {
    it('should fetch current price successfully', async () => {
      const mockResponse = {
        symbol: 'BTCUSDT',
        lastPrice: '50000.00',
        quoteVolume: '1000000',
        priceChange: '1000',
        priceChangePercent: '2.0'
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await provider.getCurrentPrice('BTCUSDT');

      expect(result.symbol).toBe('BTCUSDT');
      expect(result.price).toBe(50000);
      expect(result.volume24h).toBe(1000000);
      expect(result.priceChangePercent24h).toBe(2.0);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT',
        { signal: expect.any(AbortSignal) }
      );
    });

    it('should handle API errors gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(provider.getCurrentPrice('BTCUSDT'))
        .rejects.toMatchObject({
          name: 'ProviderError',
          providerId: 'binance'
        });
    });

    it('should validate symbol input', async () => {
      await expect(provider.getCurrentPrice(''))
        .rejects.toThrow('Invalid symbol provided');
        
      await expect(provider.getCurrentPrice(null as any))
        .rejects.toThrow('Invalid symbol provided');
    });

    it('should handle network timeouts', async () => {
      // Mock a timeout scenario
      (fetch as any).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject({ name: 'AbortError' }), 100)
        )
      );

      await expect(provider.getCurrentPrice('BTCUSDT'))
        .rejects.toMatchObject({
          name: 'ProviderError',
          providerId: 'binance'
        });
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch historical data successfully', async () => {
      const mockKlines = [
        [1609459200000, '50000', '51000', '49000', '50500', '100.5', 1609462800000],
        [1609462800000, '50500', '52000', '50000', '51500', '120.3', 1609466400000]
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockKlines)
      });

      const result = await provider.getHistoricalData('BTCUSDT', '1h', 2);

      expect(result.symbol).toBe('BTCUSDT');
      expect(result.interval).toBe('1h');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        time: 1609459200, // Converted to seconds
        open: 50000,
        high: 51000,
        low: 49000,
        close: 50500,
        volume: 100.5
      });
    });

    it('should validate inputs', async () => {
      await expect(provider.getHistoricalData('', '1h'))
        .rejects.toThrow('Invalid symbol provided');
        
      await expect(provider.getHistoricalData('BTCUSDT', ''))
        .rejects.toThrow('Invalid interval provided');
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.binance.com/api/v3/ping',
        { signal: expect.any(AbortSignal) }
      );
    });

    it('should return false when API is down', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('WebSocket functionality', () => {
    it('should generate correct WebSocket URL', () => {
      const url = (provider as any).getWebSocketUrl('BTCUSDT');
      expect(url).toBe('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    });

    it('should parse WebSocket messages correctly', () => {
      const mockMessage = {
        e: '24hrTicker',
        s: 'BTCUSDT',
        c: '50000.00',
        E: 1609459200000,
        q: '1000000',
        P: '1000',
        p: '2.0'
      };

      const result = (provider as any).parseWebSocketMessage(mockMessage);
      
      expect(result).toMatchObject({
        symbol: 'BTCUSDT',
        price: 50000,
        volume24h: 1000000,
        priceChange24h: 1000,
        priceChangePercent24h: 2.0
      });
    });

    it('should return null for invalid messages', () => {
      const invalidMessage = { type: 'invalid' };
      const result = (provider as any).parseWebSocketMessage(invalidMessage);
      expect(result).toBeNull();
    });
  });

  describe('Extended data functionality', () => {
    it('should fetch extended data with multiple timeframes', async () => {
      // Mock the ticker response
      const mockTicker = {
        symbol: 'BTCUSDT',
        lastPrice: '50000.00',
        quoteVolume: '1000000',
        priceChangePercent: '2.0',
        priceChange: '1000'
      };

      // Mock kline responses for different timeframes
      const mockKlines = [
        [1609459200000, '50000', '51000', '49000', '50500', '100.5']
      ];

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTicker)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKlines)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKlines)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKlines)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKlines)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockKlines)
        });

      const result = await provider.getExtendedData('BTCUSDT');

      expect(result.symbol).toBe('BTCUSDT');
      expect(result.price).toBe(50000);
      expect(result.volume24h).toBe(1000000);
      expect(result.priceChangePercent24h).toBe(2.0);
      expect(result.volumePerHour).toBeDefined();
      expect(result.amplitude10m).toBeDefined();
      expect(result.recentPrices).toBeDefined();
    });
  });

  describe('Subscription management', () => {
    it('should track active subscriptions', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      provider.subscribeToRealTime('BTCUSDT', callback1);
      provider.subscribeToRealTime('ETHUSDT', callback2);

      expect(provider.getActiveSubscriptions()).toBe(2);
      expect(provider.getSubscribedSymbols()).toEqual(['BTCUSDT', 'ETHUSDT']);
    });

    it('should clean up subscriptions on unsubscribe', () => {
      const callback = vi.fn();
      
      provider.subscribeToRealTime('BTCUSDT', callback);
      expect(provider.getActiveSubscriptions()).toBe(1);
      
      provider.unsubscribeFromRealTime('BTCUSDT');
      expect(provider.getActiveSubscriptions()).toBe(0);
    });
  });
});
