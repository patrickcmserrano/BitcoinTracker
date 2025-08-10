import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  appState, 
  selectedCrypto, 
  currentCryptoData, 
  selectCrypto, 
  setCryptoData, 
  setCryptoLoading, 
  setCryptoError, 
  selectNextCrypto, 
  selectPreviousCrypto 
} from './crypto-store';
import { getDefaultCrypto, CRYPTO_CONFIGS, getAllCryptos } from './crypto-config';
import { get } from 'svelte/store';

describe('Crypto Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    appState.set({
      selectedCrypto: getDefaultCrypto(),
      cryptoData: {},
      loading: {},
      updating: {},
      errors: {},
      atrErrors: {},
      lastATRCheck: {},
      nextATRCheck: {}
    });
  });

  describe('Initial State', () => {
    it('should have Bitcoin as default selected crypto', () => {
      const selected = get(selectedCrypto);
      expect(selected.id).toBe('bitcoin');
      expect(selected.symbol).toBe('BTC');
    });

    it('should have empty crypto data initially', () => {
      const data = get(currentCryptoData);
      expect(data).toBeNull();
    });

    it('should have clean initial state', () => {
      const state = get(appState);
      expect(state.cryptoData).toEqual({});
      expect(state.loading).toEqual({});
      expect(state.errors).toEqual({});
    });
  });

  describe('Crypto Selection', () => {
    it('should allow selecting different cryptocurrencies', () => {
      // Select Ethereum
      selectCrypto(CRYPTO_CONFIGS.ethereum);
      let selected = get(selectedCrypto);
      expect(selected.id).toBe('ethereum');
      expect(selected.symbol).toBe('ETH');

      // Select Solana
      selectCrypto(CRYPTO_CONFIGS.solana);
      selected = get(selectedCrypto);
      expect(selected.id).toBe('solana');
      expect(selected.symbol).toBe('SOL');

      // Back to Bitcoin
      selectCrypto(CRYPTO_CONFIGS.bitcoin);
      selected = get(selectedCrypto);
      expect(selected.id).toBe('bitcoin');
      expect(selected.symbol).toBe('BTC');
    });
  });

  describe('Data Management', () => {
    it('should store crypto data correctly', () => {
      const mockData = {
        config: CRYPTO_CONFIGS.bitcoin,
        price: 50000,
        volume24h: 1000000,
        percentChange: 2.5,
        volumePerHour: 41666,
        amplitude10m: 100,
        highPrice10m: 50050,
        lowPrice10m: 49950,
        volume10m: 5000,
        percentChange10m: 0.1,
        amplitude1h: 500,
        highPrice1h: 50250,
        lowPrice1h: 49750,
        volume1h: 30000,
        percentChange1h: 0.5,
        amplitude4h: 2000,
        highPrice4h: 51000,
        lowPrice4h: 49000,
        volume4h: 120000,
        percentChange4h: 2.0,
        amplitude1d: 5000,
        highPrice1d: 52500,
        lowPrice1d: 47500,
        volume1d: 720000,
        percentChange1d: 5.0,
        amplitude1w: 15000,
        highPrice1w: 57500,
        lowPrice1w: 42500,
        volume1w: 5040000,
        percentChange1w: 15.0,
        lastUpdate: new Date(),
        recentPrices: [49000, 49500, 50000]
      };

      setCryptoData('bitcoin', mockData);
      
      // Bitcoin should be selected by default
      const currentData = get(currentCryptoData);
      expect(currentData).toEqual(mockData);
    });

    it('should handle loading states correctly', () => {
      setCryptoLoading('bitcoin', true);
      const state = get(appState);
      expect(state.loading.bitcoin).toBe(true);

      setCryptoLoading('bitcoin', false);
      const updatedState = get(appState);
      expect(updatedState.loading.bitcoin).toBe(false);
    });

    it('should handle error states correctly', () => {
      const errorMessage = 'API connection failed';
      setCryptoError('bitcoin', errorMessage);
      
      const state = get(appState);
      expect(state.errors.bitcoin).toBe(errorMessage);

      // Clear error
      setCryptoError('bitcoin', null);
      const clearedState = get(appState);
      expect(clearedState.errors.bitcoin).toBeNull();
    });
  });

  describe('Multi-crypto Support', () => {
    it('should maintain separate data for different cryptocurrencies', () => {
      const bitcoinData = {
        config: CRYPTO_CONFIGS.bitcoin,
        price: 50000,
        volume24h: 1000000,
        percentChange: 2.5,
        volumePerHour: 41666,
        amplitude10m: 100, highPrice10m: 50050, lowPrice10m: 49950, volume10m: 5000, percentChange10m: 0.1,
        amplitude1h: 500, highPrice1h: 50250, lowPrice1h: 49750, volume1h: 30000, percentChange1h: 0.5,
        amplitude4h: 2000, highPrice4h: 51000, lowPrice4h: 49000, volume4h: 120000, percentChange4h: 2.0,
        amplitude1d: 5000, highPrice1d: 52500, lowPrice1d: 47500, volume1d: 720000, percentChange1d: 5.0,
        amplitude1w: 15000, highPrice1w: 57500, lowPrice1w: 42500, volume1w: 5040000, percentChange1w: 15.0,
        lastUpdate: new Date(), recentPrices: [49000, 49500, 50000]
      };

      const ethereumData = {
        config: CRYPTO_CONFIGS.ethereum,
        price: 3000,
        volume24h: 500000,
        percentChange: 1.8,
        volumePerHour: 20833,
        amplitude10m: 50, highPrice10m: 3025, lowPrice10m: 2975, volume10m: 2500, percentChange10m: 0.8,
        amplitude1h: 150, highPrice1h: 3075, lowPrice1h: 2925, volume1h: 15000, percentChange1h: 2.5,
        amplitude4h: 600, highPrice4h: 3300, lowPrice4h: 2700, volume4h: 60000, percentChange4h: 10.0,
        amplitude1d: 1500, highPrice1d: 3750, lowPrice1d: 2250, volume1d: 360000, percentChange1d: 25.0,
        amplitude1w: 4500, highPrice1w: 5250, lowPrice1w: 750, volume1w: 2520000, percentChange1w: 100.0,
        lastUpdate: new Date(), recentPrices: [2900, 2950, 3000]
      };

      // Store data for both cryptos
      setCryptoData('bitcoin', bitcoinData);
      setCryptoData('ethereum', ethereumData);

      // Bitcoin should be selected initially, showing Bitcoin data
      let currentData = get(currentCryptoData);
      expect(currentData?.price).toBe(50000);

      // Switch to Ethereum
      selectCrypto(CRYPTO_CONFIGS.ethereum);
      currentData = get(currentCryptoData);
      expect(currentData?.price).toBe(3000);

      // Switch back to Bitcoin
      selectCrypto(CRYPTO_CONFIGS.bitcoin);
      currentData = get(currentCryptoData);
      expect(currentData?.price).toBe(50000);
    });

    it('should maintain separate loading states for different cryptocurrencies', () => {
      setCryptoLoading('bitcoin', true);
      setCryptoLoading('ethereum', false);
      setCryptoLoading('solana', true);

      const state = get(appState);
      expect(state.loading.bitcoin).toBe(true);
      expect(state.loading.ethereum).toBe(false);
      expect(state.loading.solana).toBe(true);
    });

    it('should maintain separate error states for different cryptocurrencies', () => {
      setCryptoError('bitcoin', 'Bitcoin API error');
      setCryptoError('ethereum', null);
      setCryptoError('solana', 'Solana network issue');

      const state = get(appState);
      expect(state.errors.bitcoin).toBe('Bitcoin API error');
      expect(state.errors.ethereum).toBeNull();
      expect(state.errors.solana).toBe('Solana network issue');
    });
  });

  describe('Navigation Functions', () => {
    it('should navigate to next cryptocurrency in circular order', () => {
      // Start with Bitcoin (default)
      expect(get(selectedCrypto).id).toBe('bitcoin');
      
      // Navigate to next (Ethereum)
      selectNextCrypto();
      expect(get(selectedCrypto).id).toBe('ethereum');
      
      // Navigate to next (Solana)
      selectNextCrypto();
      expect(get(selectedCrypto).id).toBe('solana');
    });

    it('should navigate to previous cryptocurrency in circular order', () => {
      // Start with Bitcoin (default)
      expect(get(selectedCrypto).id).toBe('bitcoin');
      
      // Navigate to previous (should wrap to last crypto)
      selectPreviousCrypto();
      expect(get(selectedCrypto).id).toBe('usdtbrl'); // Last crypto in the list
      
      // Navigate to previous again
      selectPreviousCrypto();
      expect(get(selectedCrypto).id).toBe('trx');
    });

    it('should complete full circular navigation', () => {
      const allCryptos = getAllCryptos();
      
      // Start with Bitcoin
      expect(get(selectedCrypto).id).toBe('bitcoin');
      
      // Navigate through all cryptos
      for (let i = 1; i < allCryptos.length; i++) {
        selectNextCrypto();
        expect(get(selectedCrypto).id).toBe(allCryptos[i].id);
      }
      
      // One more navigation should wrap back to Bitcoin
      selectNextCrypto();
      expect(get(selectedCrypto).id).toBe('bitcoin');
    });
  });
});
