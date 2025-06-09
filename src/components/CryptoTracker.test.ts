import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCryptoData } from '../lib/crypto-api';
import { CRYPTO_CONFIGS } from '../lib/crypto-config';

// Mock axios para evitar chamadas de API reais
vi.mock('axios');

// Mock dos serviços
vi.mock('../lib/taapi-service', () => ({
  getTaapiService: vi.fn(),
  initializeTaapiService: vi.fn(),
}));

vi.mock('../lib/config', () => ({
  getAppConfig: vi.fn(() => ({})),
  isTaapiConfigured: vi.fn(() => false),
}));

describe('Crypto API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock global fetch
    global.fetch = vi.fn();
  });

  describe('getCryptoData', () => {
    it('should handle Bitcoin configuration correctly', async () => {
      const bitcoinConfig = CRYPTO_CONFIGS.bitcoin;
      
      expect(bitcoinConfig).toBeDefined();
      expect(bitcoinConfig.id).toBe('bitcoin');
      expect(bitcoinConfig.symbol).toBe('BTC');
      expect(bitcoinConfig.binanceSymbol).toBe('BTCUSDT');
      expect(bitcoinConfig.taapiSymbol).toBe('BTC/USDT');
    });

    it('should handle Ethereum configuration correctly', async () => {
      const ethereumConfig = CRYPTO_CONFIGS.ethereum;
      
      expect(ethereumConfig).toBeDefined();
      expect(ethereumConfig.id).toBe('ethereum');
      expect(ethereumConfig.symbol).toBe('ETH');
      expect(ethereumConfig.binanceSymbol).toBe('ETHUSDT');
      expect(ethereumConfig.taapiSymbol).toBe('ETH/USDT');
    });

    it('should handle Solana configuration correctly', async () => {
      const solanaConfig = CRYPTO_CONFIGS.solana;
      
      expect(solanaConfig).toBeDefined();
      expect(solanaConfig.id).toBe('solana');
      expect(solanaConfig.symbol).toBe('SOL');
      expect(solanaConfig.binanceSymbol).toBe('SOLUSDT');
      expect(solanaConfig.taapiSymbol).toBe('SOL/USDT');
    });

    it('should have different precision settings for different cryptos', () => {
      expect(CRYPTO_CONFIGS.bitcoin.precision).toBe(0);
      expect(CRYPTO_CONFIGS.ethereum.precision).toBe(0);
      expect(CRYPTO_CONFIGS.solana.precision).toBe(2);
    });

    it('should have unique colors for each crypto', () => {
      const colors = [
        CRYPTO_CONFIGS.bitcoin.color,
        CRYPTO_CONFIGS.ethereum.color,
        CRYPTO_CONFIGS.solana.color
      ];
      
      // Verificar que todas as cores são diferentes
      expect(new Set(colors).size).toBe(3);
      
      // Verificar formato de cor hexadecimal
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });

    it('should have unique icons for each crypto', () => {
      const icons = [
        CRYPTO_CONFIGS.bitcoin.icon,
        CRYPTO_CONFIGS.ethereum.icon,
        CRYPTO_CONFIGS.solana.icon
      ];
      
      expect(new Set(icons).size).toBe(3);
      expect(icons).toEqual(['₿', 'Ξ', '◎']);
    });
  });

  describe('Multi-crypto support', () => {
    it('should support all configured cryptocurrencies', () => {
      const cryptoIds = Object.keys(CRYPTO_CONFIGS);
      expect(cryptoIds).toContain('bitcoin');
      expect(cryptoIds).toContain('ethereum');
      expect(cryptoIds).toContain('solana');
      expect(cryptoIds).toHaveLength(3);
    });

    it('should have consistent structure across all crypto configs', () => {
      Object.values(CRYPTO_CONFIGS).forEach(config => {
        expect(config).toHaveProperty('id');
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('symbol');
        expect(config).toHaveProperty('binanceSymbol');
        expect(config).toHaveProperty('taapiSymbol');
        expect(config).toHaveProperty('icon');
        expect(config).toHaveProperty('color');
        expect(config).toHaveProperty('precision');
        
        // Verificar tipos
        expect(typeof config.id).toBe('string');
        expect(typeof config.name).toBe('string');
        expect(typeof config.symbol).toBe('string');
        expect(typeof config.binanceSymbol).toBe('string');
        expect(typeof config.taapiSymbol).toBe('string');
        expect(typeof config.icon).toBe('string');
        expect(typeof config.color).toBe('string');
        expect(typeof config.precision).toBe('number');
      });
    });
  });
});
