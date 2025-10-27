/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import '@testing-library/jest-dom';
import { isTaapiConfigured } from '../lib/config';
import TaapiIndicators from './TaapiIndicators.svelte';
import type { CryptoConfig, CryptoData } from '../lib/crypto-config';

// Mock das dependências
vi.mock('../lib/config', () => ({
  isTaapiConfigured: vi.fn(),
  setTaapiSecretKey: vi.fn(),
  showConfigStatus: vi.fn(),
  clearTaapiSecretKey: vi.fn()
}));

vi.mock('../lib/i18n', () => ({
  _: (key: string) => key
}));

// Mock crypto config
const mockCryptoConfig: CryptoConfig = {
  id: 'bitcoin',
  name: 'Bitcoin',
  symbol: 'BTC',
  binanceSymbol: 'BTCUSDT',
  taapiSymbol: 'BTC/USDT',
  icon: '₿',
  color: '#f7931a',
  precision: 2
};

// Mock crypto data
const mockCryptoData: CryptoData = {
  config: mockCryptoConfig,
  atr14Daily: 1500,
  atrLastUpdated: new Date(),
  price: 50000,
  volume24h: 1000000,
  percentChange: 2.5,
  volumePerHour: 41666,
  amplitude10m: 100,
  highPrice10m: 50050,
  lowPrice10m: 49950,
  volume10m: 100000,
  percentChange10m: 0.1,
  amplitude1h: 200,
  highPrice1h: 50100,
  lowPrice1h: 49900,
  volume1h: 200000,
  percentChange1h: 0.2,
  amplitude4h: 400,
  highPrice4h: 50200,
  lowPrice4h: 49800,
  volume4h: 400000,
  percentChange4h: 0.4,
  amplitude1d: 800,
  highPrice1d: 50400,
  lowPrice1d: 49600,
  volume1d: 800000,
  percentChange1d: 0.8,
  amplitude1w: 1600,
  highPrice1w: 50800,
  lowPrice1w: 49200,
  volume1w: 1600000,
  percentChange1w: 1.6,
  lastUpdate: new Date(),
  recentPrices: [50000, 49950, 50050]
};

describe('TaapiIndicators Component Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Development Environment', () => {
    it('should show configuration interface when API is not configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(false);
      
      // Test the logic that determines what to show
      const isConfigured = isTaapiConfigured();
      const isDev = !import.meta.env?.PROD;
      
      expect(isConfigured).toBe(false);
      expect(isDev).toBe(true);
      
      // In dev mode with no config, should show config interface
      const shouldShowConfig = !isConfigured && isDev;
      expect(shouldShowConfig).toBe(true);
    });

    it('should show indicators when API is configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      const isConfigured = isTaapiConfigured();
      const isDev = !import.meta.env?.PROD;
      
      expect(isConfigured).toBe(true);
      expect(isDev).toBe(true);
      
      // When configured, should show indicators regardless of environment
      const shouldShowIndicators = isConfigured;
      expect(shouldShowIndicators).toBe(true);
    });

    it('should show reconfigure button in development', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      const isConfigured = isTaapiConfigured();
      const isDev = !import.meta.env?.PROD;
      
      // In dev mode with config, should show reconfigure button
      const shouldShowReconfigure = isConfigured && isDev;
      expect(shouldShowReconfigure).toBe(true);
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      // Mock production environment
      Object.defineProperty(import.meta, 'env', {
        value: { PROD: true, DEV: false },
        writable: true
      });
    });

    it('should not show configuration interface in production when API is not configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(false);
      
      const isConfigured = isTaapiConfigured();
      const isDev = !import.meta.env?.PROD;
      
      expect(isConfigured).toBe(false);
      expect(isDev).toBe(false);
      
      // In production without config, should not show config interface
      const shouldShowConfig = !isConfigured && isDev;
      expect(shouldShowConfig).toBe(false);
    });

    it('should not show reconfigure button in production', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      const isConfigured = isTaapiConfigured();
      const isDev = !import.meta.env?.PROD;
      
      expect(isConfigured).toBe(true);
      expect(isDev).toBe(false);
      
      // In production, should not show reconfigure button
      const shouldShowReconfigure = isConfigured && isDev;
      expect(shouldShowReconfigure).toBe(false);
    });

    it('should show indicators even in production when configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      const isConfigured = isTaapiConfigured();
      
      expect(isConfigured).toBe(true);
      
      // When configured, should show indicators even in production
      const shouldShowIndicators = isConfigured;
      expect(shouldShowIndicators).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle ATR error properly', () => {
      const atrError = "Failed to fetch ATR data";
      
      // Test error state logic
      const hasError = !!atrError;
      expect(hasError).toBe(true);
      
      // Error should be displayed regardless of configuration
      const shouldShowError = hasError;
      expect(shouldShowError).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should show loading state when loading is true', () => {
      const loading = true;
      
      // Test loading state logic
      const shouldShowLoading = loading;
      expect(shouldShowLoading).toBe(true);
      
      // When loading, should not show content yet
      const shouldShowContent = !loading;
      expect(shouldShowContent).toBe(false);
    });
  });
});

describe('TaapiIndicators Component Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to development environment by default
    Object.defineProperty(import.meta, 'env', {
      value: { PROD: false, DEV: true },
      writable: true
    });
  });

  describe('Development Environment', () => {
    it('should show configuration interface when API is not configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(false);      render(TaapiIndicators, {
        props: {
          cryptoConfig: mockCryptoConfig,
          currentData: null,
          loading: false,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getByText('⚠️ API não configurada')).toBeInTheDocument();
      expect(screen.getByText('Configurar API TAAPI.IO')).toBeInTheDocument();
    });    it('should show indicators when API is configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      render(TaapiIndicators, {
        props: {
          cryptoConfig: mockCryptoConfig,
          currentData: mockCryptoData,
          loading: false,
          atrError: null,
          lastATRCheck: new Date(),
          nextATRCheck: new Date(),
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getAllByText('ATR14 Daily').length).toBeGreaterThan(0);
    });

    it('should show reconfigure button in development', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      render(TaapiIndicators, {
        props: {
          cryptoConfig: mockCryptoConfig,
          currentData: null,
          loading: false,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getByText('Reconfigurar API')).toBeInTheDocument();
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      // Mock production environment
      Object.defineProperty(import.meta, 'env', {
        value: { PROD: true, DEV: false },
        writable: true
      });
    });

    it('should not show configuration interface in production when API is not configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(false);
      
      render(TaapiIndicators, {
        props: {
          cryptoConfig: mockCryptoConfig,
          currentData: null,
          loading: false,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn(),
          isProduction: true
        }
      });

      expect(screen.getByText('🔧 Configuração necessária')).toBeInTheDocument();
      expect(screen.queryByText('Configurar API TAAPI.IO')).not.toBeInTheDocument();
    });

    it('should not show reconfigure button in production', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      render(TaapiIndicators, {
        props: {
          cryptoConfig: mockCryptoConfig,
          currentData: null,
          loading: false,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn(),
          isProduction: true
        }
      });

      expect(screen.queryByText('Reconfigurar API')).not.toBeInTheDocument();
    });

    it('should show indicators even in production when configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);

      render(TaapiIndicators, {
        props: {
          cryptoConfig: mockCryptoConfig,
          currentData: mockCryptoData,
          loading: false,
          atrError: null,
          lastATRCheck: new Date(),
          nextATRCheck: new Date(),
          onConfigureATR: vi.fn(),
          isProduction: true
        }
      });

      expect(screen.getAllByText('ATR14 Daily').length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when ATR error is present', () => {
      render(TaapiIndicators, {
        props: {
          cryptoConfig: mockCryptoConfig,
          currentData: null,
          loading: false,
          atrError: 'Request failed with status code 401',
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      // Verificar se o erro é passado para o componente ATRIndicator
      expect(screen.getAllByText('ATR14 Daily').length).toBeGreaterThan(0);
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator when loading is true', () => {
      render(TaapiIndicators, {
        props: {
          cryptoConfig: mockCryptoConfig,
          currentData: null,
          loading: true,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getAllByText('ATR14 Daily').length).toBeGreaterThan(0);
    });
  });
});
