import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoinbaseProvider } from '../coinbase-provider';

// Mock fetch globally
global.fetch = vi.fn();

describe('CoinbaseProvider', () => {
  let provider: CoinbaseProvider;

  beforeEach(() => {
    provider = new CoinbaseProvider();
    vi.clearAllMocks();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe('Basic Properties', () => {
    it('should have correct name and priority', () => {
      expect(provider.getName()).toBe('coinbase');
      expect(provider.getPriority()).toBe(2);
    });
  });

  describe('Symbol mapping', () => {
    it('should map Binance symbols to Coinbase format', () => {
      expect((provider as any).convertToCoinbaseFormat('BTCUSDT')).toBe('BTC-USD');
      expect((provider as any).convertToCoinbaseFormat('ETHUSDT')).toBe('ETH-USD');
      expect((provider as any).convertToCoinbaseFormat('ADAUSDT')).toBe('ADA-USD');
    });

    it('should map granularity correctly', () => {
      expect((provider as any).convertToCoinbaseGranularity('1m')).toBe(60);
      expect((provider as any).convertToCoinbaseGranularity('5m')).toBe(300);
      expect((provider as any).convertToCoinbaseGranularity('15m')).toBe(900);
      expect((provider as any).convertToCoinbaseGranularity('1h')).toBe(3600);
      expect((provider as any).convertToCoinbaseGranularity('4h')).toBe(14400);
      expect((provider as any).convertToCoinbaseGranularity('1d')).toBe(86400);
    });

    it('should handle unsupported intervals gracefully', () => {
      // Since the method doesn't throw but warns and returns default
      expect((provider as any).convertToCoinbaseGranularity('2m')).toBe(3600);
    });
  });

  describe('getCurrentPrice', () => {
    it('should fetch current price successfully', async () => {
      const mockResponse = {
        price: '50000.00',
        size: '100.5',
        time: '2023-01-01T00:00:00Z'
      };

      const mockStats = {
        volume: '1000000',
        volume_30day: '30000000'
      };

      (fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockStats)
        });

      const result = await provider.getCurrentPrice('BTCUSDT');

      expect(result.symbol).toBe('BTCUSDT');
      expect(result.price).toBe(50000);
      expect(result.volume24h).toBe(1000000);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.exchange.coinbase.com/products/BTC-USD/ticker',
        { signal: expect.any(AbortSignal) }
      );
      expect(fetch).toHaveBeenCalledWith(
        'https://api.exchange.coinbase.com/products/BTC-USD/stats',
        { signal: expect.any(AbortSignal) }
      );
    });

    it('should handle API errors gracefully', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(provider.getCurrentPrice('BTCUSDT'))
        .rejects.toMatchObject({
          name: 'ProviderError',
          providerId: 'coinbase'
        });
    });

    it('should validate symbol input', async () => {
      await expect(provider.getCurrentPrice(''))
        .rejects.toThrow('Invalid symbol provided');
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch historical data successfully', async () => {
      // Mock data in Coinbase format: [time, low, high, open, close, volume]
      // Coinbase returns newest first, so newer timestamp should be first in the array
      const mockCandles = [
        [1609462800, 50000, 52000, 50500, 51500, 120.3], // newer
        [1609459200, 49000, 51000, 50000, 50500, 100.5]  // older
      ];

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCandles)
      });

      const result = await provider.getHistoricalData('BTCUSDT', '1h', 2);

      expect(result.symbol).toBe('BTCUSDT');
      expect(result.interval).toBe('1h');
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toMatchObject({
        time: 1609459200, // older timestamp first after reverse
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

    it('should construct correct API URL with parameters', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      await provider.getHistoricalData('BTCUSDT', '1h', 100);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.exchange.coinbase.com/products/BTC-USD/candles'),
        { signal: expect.any(AbortSignal) }
      );

      const url = (fetch as any).mock.calls[0][0];
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get('granularity')).toBe('3600');
      expect(urlObj.searchParams.has('start')).toBe(true);
      expect(urlObj.searchParams.has('end')).toBe(true);
    });
  });

  describe('healthCheck', () => {
    it('should return true when API is healthy', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'ok' })
      });

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.exchange.coinbase.com/time',
        { signal: expect.any(AbortSignal) }
      );
    });

    it('should return false when API is down', async () => {
      (fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should return false on non-200 response', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const isHealthy = await provider.healthCheck();
      expect(isHealthy).toBe(false);
    });
  });

  describe('WebSocket functionality', () => {
    it('should generate correct WebSocket URL', () => {
      const url = (provider as any).getWebSocketUrl('BTCUSDT');
      expect(url).toBe('wss://ws-feed.exchange.coinbase.com');
    });

    it('should create correct subscription message', () => {
      const message = (provider as any).buildSubscribeMessage('BTCUSDT');
      
      expect(message).toEqual({
        type: 'subscribe',
        product_ids: ['BTC-USD'],
        channels: ['ticker']
      });
    });

    it('should parse WebSocket messages correctly', () => {
      const mockMessage = {
        type: 'ticker',
        product_id: 'BTC-USD',
        price: '50000.00',
        time: '2023-01-01T00:00:00Z',
        volume_24h: '1000000',
        open_24h: '49000.00'
      };

      const result = (provider as any).parseWebSocketMessage(mockMessage);
      
      expect(result).toMatchObject({
        symbol: 'BTCUSDT',
        price: 50000,
        volume24h: 1000000,
        priceChange24h: 1000,
        priceChangePercent24h: expect.closeTo(2.04, 1)
      });
    });

    it('should return null for non-ticker messages', () => {
      const subscriptionMessage = { type: 'subscriptions' };
      const result = (provider as any).parseWebSocketMessage(subscriptionMessage);
      expect(result).toBeNull();
    });

    it('should handle malformed messages gracefully', () => {
      const malformedMessage = { type: 'ticker' }; // Missing required fields
      const result = (provider as any).parseWebSocketMessage(malformedMessage);
      expect(result).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should handle network timeouts', async () => {
      (fetch as any).mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject({ name: 'AbortError' }), 100)
        )
      );

      await expect(provider.getCurrentPrice('BTCUSDT'))
        .rejects.toMatchObject({
          name: 'ProviderError',
          message: expect.stringContaining('Failed to fetch current price for BTCUSDT')
        });
    });

    it('should handle JSON parsing errors', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(provider.getCurrentPrice('BTCUSDT'))
        .rejects.toMatchObject({
          name: 'ProviderError',
          providerId: 'coinbase'
        });
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

    it('should clean up all subscriptions on destroy', () => {
      const callback = vi.fn();
      
      provider.subscribeToRealTime('BTCUSDT', callback);
      provider.subscribeToRealTime('ETHUSDT', callback);
      expect(provider.getActiveSubscriptions()).toBe(2);
      
      provider.destroy();
      expect(provider.getActiveSubscriptions()).toBe(0);
    });
  });
});
