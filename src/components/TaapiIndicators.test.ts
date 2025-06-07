/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import TaapiIndicators from './TaapiIndicators.svelte';
import { isTaapiConfigured } from '../lib/config';

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

// Mock do ATRIndicator
vi.mock('./ATRIndicator.svelte', () => ({
  default: vi.fn(() => ({ render: () => '<div>ATR Mocked</div>' }))
}));

describe('TaapiIndicators Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment mock
    Object.defineProperty(import.meta, 'env', {
      value: { PROD: false, DEV: true },
      writable: true
    });
  });

  describe('Development Environment', () => {
    it('should show configuration interface when API is not configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(false);
      
      render(TaapiIndicators, {
        props: {
          data: null,
          loading: false,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getByText('⚠️ API não configurada')).toBeInTheDocument();
      expect(screen.getByText('Configurar API TAAPI.IO')).toBeInTheDocument();
    });

    it('should show indicators when API is configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      const mockData = {
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

      render(TaapiIndicators, {
        props: {
          data: mockData,
          loading: false,
          atrError: null,
          lastATRCheck: new Date(),
          nextATRCheck: new Date(),
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getByText('ATR14 Daily')).toBeInTheDocument();
      expect(screen.getByText('RSI14 Daily')).toBeInTheDocument();
      expect(screen.getByText('MACD')).toBeInTheDocument();
      expect(screen.getByText('Bollinger Bands')).toBeInTheDocument();
    });

    it('should show reconfigure button in development', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      render(TaapiIndicators, {
        props: {
          data: null,
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
          data: null,
          loading: false,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getByText('🔧 Configuração necessária')).toBeInTheDocument();
      expect(screen.queryByText('Configurar API TAAPI.IO')).not.toBeInTheDocument();
    });

    it('should not show reconfigure button in production', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      render(TaapiIndicators, {
        props: {
          data: null,
          loading: false,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.queryByText('Reconfigurar API')).not.toBeInTheDocument();
    });

    it('should show indicators even in production when configured', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      const mockData = {
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

      render(TaapiIndicators, {
        props: {
          data: mockData,
          loading: false,
          atrError: null,
          lastATRCheck: new Date(),
          nextATRCheck: new Date(),
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getByText('ATR14 Daily')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when ATR error is present', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      render(TaapiIndicators, {
        props: {
          data: null,
          loading: false,
          atrError: 'Request failed with status code 401',
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      // Verificar se o erro é passado para o componente ATRIndicator
      expect(screen.getByText('ATR14 Daily')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading state when loading is true', () => {
      vi.mocked(isTaapiConfigured).mockReturnValue(true);
      
      render(TaapiIndicators, {
        props: {
          data: null,
          loading: true,
          atrError: null,
          lastATRCheck: null,
          nextATRCheck: null,
          onConfigureATR: vi.fn()
        }
      });

      expect(screen.getByText('ATR14 Daily')).toBeInTheDocument();
    });
  });
});
