import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChartManager } from '../chart-manager';
import { CanvasFallbackAdapter } from '../adapters/canvas-fallback-adapter';
import type { CandlestickData } from '../../domain/chart-interfaces';

// Mock DOM elements
let mockContext: any;

const mockCanvas = {
  getContext: vi.fn(() => {
    if (!mockContext) {
      mockContext = {
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        stroke: vi.fn(),
        scale: vi.fn(),
        fillText: vi.fn(),
        beginPath: vi.fn(),
        toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        font: ''
      };
    }
    return mockContext;
  }),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
  clientWidth: 800,
  clientHeight: 400,
  width: 800,
  height: 400,
  style: {},
  addEventListener: vi.fn()
};

const mockContainer = {
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  getBoundingClientRect: vi.fn(() => ({ width: 800, height: 400 })),
  clientWidth: 800,
  clientHeight: 400
};

// Mock createElement
global.document = {
  createElement: vi.fn((tagName: string) => {
    if (tagName === 'canvas') {
      return mockCanvas as any;
    }
    return {} as any;
  })
} as any;

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn()
}));

// Mock window.devicePixelRatio
global.window = {
  devicePixelRatio: 2,
  performance: {
    now: vi.fn(() => Date.now())
  }
} as any;

describe('Chart Adapters', () => {
  describe('CanvasFallbackAdapter', () => {
    let adapter: CanvasFallbackAdapter;

    beforeEach(() => {
      adapter = new CanvasFallbackAdapter();
      vi.clearAllMocks();
      mockContext = null; // Reset the mock context
    });

    afterEach(() => {
      adapter.destroy();
    });

    it('should initialize successfully', async () => {
      await adapter.initialize(mockContainer as any);
      
      expect(adapter.isReady()).toBe(true);
      expect(adapter.getType()).toBe('canvas-fallback');
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });

    it('should add and render candlestick series', async () => {
      await adapter.initialize(mockContainer as any);
      
      const seriesData: CandlestickData[] = [
        { time: 1609459200, open: 100, high: 110, low: 95, close: 105 },
        { time: 1609545600, open: 105, high: 115, low: 100, close: 108 }
      ];

      const seriesId = adapter.addSeries({
        id: 'test-series',
        type: 'candlestick',
        data: seriesData
      });

      expect(seriesId).toBe('test-series');
      expect(adapter.getPerformanceMetrics().dataPoints).toBe(2);
    });

    it('should update series data', async () => {
      await adapter.initialize(mockContainer as any);
      
      const initialData: CandlestickData[] = [
        { time: 1609459200, open: 100, high: 110, low: 95, close: 105 }
      ];
      
      adapter.addSeries({
        id: 'test-series',
        type: 'candlestick',
        data: initialData
      });

      const updatedData: CandlestickData[] = [
        { time: 1609459200, open: 100, high: 110, low: 95, close: 105 },
        { time: 1609545600, open: 105, high: 115, low: 100, close: 108 }
      ];

      adapter.updateSeries('test-series', updatedData);
      expect(adapter.getPerformanceMetrics().dataPoints).toBe(2);
    });

    it('should append data to existing series', async () => {
      await adapter.initialize(mockContainer as any);
      
      const initialData: CandlestickData[] = [
        { time: 1609459200, open: 100, high: 110, low: 95, close: 105 }
      ];
      
      adapter.addSeries({
        id: 'test-series',
        type: 'candlestick',
        data: initialData
      });

      const newCandle: CandlestickData = { 
        time: 1609545600, open: 105, high: 115, low: 100, close: 108 
      };

      adapter.appendToSeries('test-series', newCandle);
      expect(adapter.getPerformanceMetrics().dataPoints).toBe(2);
    });

    it('should remove series', async () => {
      await adapter.initialize(mockContainer as any);
      
      const seriesData: CandlestickData[] = [
        { time: 1609459200, open: 100, high: 110, low: 95, close: 105 }
      ];
      
      adapter.addSeries({
        id: 'test-series',
        type: 'candlestick',
        data: seriesData
      });

      adapter.removeSeries('test-series');
      // After removal, rendering should work without errors
      expect(() => adapter.fitContent()).not.toThrow();
    });

    it('should handle theme changes', async () => {
      await adapter.initialize(mockContainer as any);
      
      // Clear previous calls
      mockContext.clearRect.mockClear();
      
      adapter.setTheme('dark');
      adapter.setTheme('light');
      
      // Theme changes should trigger re-renders
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    it('should handle configuration updates', async () => {
      await adapter.initialize(mockContainer as any);
      
      // Clear previous calls
      mockContext.clearRect.mockClear();
      
      adapter.updateConfig({
        theme: 'dark',
        grid: {
          vertLines: false,
          horzLines: true
        }
      });

      // Configuration changes should trigger re-renders
      expect(mockContext.clearRect).toHaveBeenCalled();
    });

    it('should handle resize', async () => {
      await adapter.initialize(mockContainer as any);
      
      // Clear previous calls
      mockContext.scale.mockClear();
      
      adapter.resize(1000, 500);
      
      // Resize should update canvas dimensions
      expect(mockContext.scale).toHaveBeenCalled();
    });

    it('should take screenshots', async () => {
      await adapter.initialize(mockContainer as any);
      
      const screenshot = await adapter.takeScreenshot();
      expect(screenshot).toBe('data:image/png;base64,mock');
      expect(mockCanvas.toDataURL).toHaveBeenCalled();
    });

    it('should handle event handlers', async () => {
      await adapter.initialize(mockContainer as any);
      
      const clickHandler = vi.fn();
      adapter.setEventHandlers({
        onClick: clickHandler
      });

      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should track performance metrics', async () => {
      await adapter.initialize(mockContainer as any);
      
      const seriesData: CandlestickData[] = [
        { time: 1609459200, open: 100, high: 110, low: 95, close: 105 }
      ];
      
      adapter.addSeries({
        id: 'test-series',
        type: 'candlestick',
        data: seriesData
      });

      const metrics = adapter.getPerformanceMetrics();
      expect(metrics.dataPoints).toBe(1);
      expect(typeof metrics.renderTime).toBe('number');
      expect(typeof metrics.memoryUsage).toBe('number');
    });

    it('should clean up on destroy', async () => {
      await adapter.initialize(mockContainer as any);
      
      adapter.destroy();
      
      expect(adapter.isReady()).toBe(false);
      expect(mockContainer.removeChild).toHaveBeenCalled();
    });

    it('should throw error when not initialized', () => {
      expect(() => {
        adapter.addSeries({
          id: 'test',
          type: 'candlestick',
          data: []
        });
      }).toThrow('Chart not initialized');
    });

    it('should throw error when taking screenshot without initialization', async () => {
      await expect(adapter.takeScreenshot()).rejects.toThrow('Chart not initialized');
    });
  });

  describe('ChartManager', () => {
    let manager: ChartManager;

    beforeEach(() => {
      manager = new ChartManager({
        fallbackOrder: ['canvas-fallback'],
        maxInitializationTime: 5000,
        healthCheckInterval: 30000
      });
      vi.clearAllMocks();
    });

    afterEach(() => {
      manager.destroy();
    });

    it('should initialize with fallback chart', async () => {
      const chart = await manager.initialize(mockContainer as any);
      
      expect(chart).toBeDefined();
      expect(chart.getType()).toBe('canvas-fallback');
      expect(chart.isReady()).toBe(true);
    });

    it('should provide access to active chart', async () => {
      await manager.initialize(mockContainer as any);
      
      const activeChart = manager.getActiveChart();
      expect(activeChart).toBeDefined();
      expect(activeChart?.getType()).toBe('canvas-fallback');
      
      const activeLibrary = manager.getActiveLibrary();
      expect(activeLibrary).toBe('canvas-fallback');
    });

    it('should handle initialization failures gracefully', async () => {
      const failingManager = new ChartManager({
        fallbackOrder: [],
        maxInitializationTime: 1
      });

      await expect(failingManager.initialize(mockContainer as any))
        .rejects.toThrow('All chart libraries failed to initialize');
      
      failingManager.destroy();
    });

    it('should handle chart configuration during initialization', async () => {
      const chartConfig = {
        theme: 'dark' as const,
        responsive: true,
        grid: {
          vertLines: true,
          horzLines: false
        }
      };

      const chart = await manager.initialize(mockContainer as any, chartConfig);
      
      expect(chart.isReady()).toBe(true);
    });

    it('should support switching chart libraries', async () => {
      await manager.initialize(mockContainer as any);
      
      // Try to switch to canvas-fallback (should work since it's the same)
      await expect(manager.switchChartLibrary('canvas-fallback')).resolves.not.toThrow();
      
      expect(manager.getActiveLibrary()).toBe('canvas-fallback');
    });

    it('should handle switching to unavailable libraries', async () => {
      await manager.initialize(mockContainer as any);
      
      // The manager should recover gracefully by falling back to canvas
      // Since switching triggers fallback recovery, it shouldn't throw
      await manager.switchChartLibrary('lightweight-charts');
      
      // Should still have a working chart (fallback canvas)
      expect(manager.getActiveChart()).toBeDefined();
      expect(manager.getActiveLibrary()).toBe('canvas-fallback');
    });

    it('should perform health checks', async () => {
      const healthCheckManager = new ChartManager({
        fallbackOrder: ['canvas-fallback'],
        healthCheckInterval: 100 // Very short for testing
      });
      
      const chart = await healthCheckManager.initialize(mockContainer as any);
      
      // Mock chart becoming unhealthy
      vi.spyOn(chart, 'isReady').mockReturnValue(false);
      
      // Wait for health check to run
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Health check should have attempted recovery
      expect(chart.isReady).toHaveBeenCalled();
      
      healthCheckManager.destroy();
    });

    it('should clean up on destroy', async () => {
      await manager.initialize(mockContainer as any);
      const chart = manager.getActiveChart();
      
      expect(chart).toBeDefined();
      
      manager.destroy();
      
      expect(manager.getActiveChart()).toBeNull();
      expect(manager.getActiveLibrary()).toBeNull();
    });

    it('should handle multiple initialization attempts', async () => {
      // Initialize once
      const chart1 = await manager.initialize(mockContainer as any);
      
      // Try to initialize again - should work with new container
      const newContainer = {
        ...mockContainer,
        appendChild: vi.fn(),
        removeChild: vi.fn()
      };
      
      const chart2 = await manager.initialize(newContainer as any);
      
      expect(chart1).toBeDefined();
      expect(chart2).toBeDefined();
      expect(chart2.getType()).toBe('canvas-fallback');
    });

    it('should throw error when switching without initialization', async () => {
      await expect(manager.switchChartLibrary('canvas-fallback'))
        .rejects.toThrow('Chart manager not initialized');
    });
  });
});
