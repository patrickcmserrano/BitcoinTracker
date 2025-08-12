import type { ChartPort, ChartConfig } from '../domain/chart-interfaces';
import { CanvasFallbackAdapter } from './adapters/canvas-fallback-adapter';

export type ChartLibrary = 'lightweight-charts' | 'chart-js' | 'canvas-fallback';

export interface ChartManagerConfig {
  preferredLibrary: ChartLibrary;
  fallbackOrder: ChartLibrary[];
  healthCheckInterval: number;
  maxInitializationTime: number;
}

export class ChartManager {
  private activeChart: ChartPort | null = null;
  private config: ChartManagerConfig;
  private container: HTMLElement | null = null;
  private chartConfig: ChartConfig = {};
  private initializationPromises: Map<ChartLibrary, Promise<ChartPort>> = new Map();
  private healthCheckInterval: number | null = null;

  constructor(config: Partial<ChartManagerConfig> = {}) {
    this.config = {
      preferredLibrary: 'canvas-fallback',
      fallbackOrder: ['canvas-fallback'],
      healthCheckInterval: 60000, // 1 minute
      maxInitializationTime: 10000, // 10 seconds
      ...config
    };
  }

  async initialize(container: HTMLElement, chartConfig: ChartConfig = {}): Promise<ChartPort> {
    this.container = container;
    this.chartConfig = chartConfig;

    // Try libraries in fallback order
    for (const libraryType of this.config.fallbackOrder) {
      try {
        console.log(`Attempting to initialize chart with: ${libraryType}`);
        
        const chart = await this.initializeChartLibrary(libraryType);
        
        // Test the chart with a timeout
        await Promise.race([
          chart.initialize(container, chartConfig),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Initialization timeout')), this.config.maxInitializationTime)
          )
        ]);

        this.activeChart = chart;
        console.log(`Successfully initialized chart with: ${libraryType}`);
        
        this.startHealthMonitoring();
        return chart;
        
      } catch (error) {
        console.warn(`Failed to initialize ${libraryType}:`, error);
        continue;
      }
    }

    throw new Error('All chart libraries failed to initialize');
  }

  private async initializeChartLibrary(library: ChartLibrary): Promise<ChartPort> {
    // Use cached promise if available
    if (this.initializationPromises.has(library)) {
      return this.initializationPromises.get(library)!;
    }

    const promise = this.createChartAdapter(library);
    this.initializationPromises.set(library, promise);
    
    try {
      return await promise;
    } catch (error) {
      this.initializationPromises.delete(library);
      throw error;
    }
  }

  private async createChartAdapter(library: ChartLibrary): Promise<ChartPort> {
    switch (library) {
      case 'lightweight-charts':
        // Dynamic import for lightweight charts
        try {
          const { LightweightChartsAdapter } = await import('./adapters/lightweight-charts-adapter');
          return new LightweightChartsAdapter();
        } catch (error) {
          throw new Error(`Lightweight Charts not available: ${error}`);
        }
        
      case 'chart-js':
        // Dynamic import for Chart.js
        try {
          const { ChartJsAdapter } = await import('./adapters/chartjs-adapter');
          return new ChartJsAdapter();
        } catch (error) {
          throw new Error(`Chart.js not available: ${error}`);
        }
        
      case 'canvas-fallback':
        return new CanvasFallbackAdapter();
        
      default:
        throw new Error(`Unknown chart library: ${library}`);
    }
  }

  async switchChartLibrary(library: ChartLibrary): Promise<void> {
    if (!this.container) {
      throw new Error('Chart manager not initialized');
    }

    // Save current chart state if possible
    const currentState = this.saveChartState();

    // Destroy current chart
    if (this.activeChart) {
      this.activeChart.destroy();
      this.activeChart = null;
    }

    try {
      // Initialize new chart
      const newChart = await this.initializeChartLibrary(library);
      await newChart.initialize(this.container, this.chartConfig);
      
      this.activeChart = newChart;
      
      // Restore state if possible
      if (currentState) {
        this.restoreChartState(currentState);
      }
      
      console.log(`Successfully switched to chart library: ${library}`);
      
    } catch (error) {
      console.error(`Failed to switch to ${library}, trying fallback...`, error);
      
      // Try to restore with a fallback
      await this.initializeFallback();
    }
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval) as any;
  }

  private async performHealthCheck(): Promise<void> {
    if (!this.activeChart) return;

    try {
      const isReady = this.activeChart.isReady();
      const metrics = this.activeChart.getPerformanceMetrics();
      
      // Check for performance issues
      if (metrics.renderTime > 100) { // 100ms threshold
        console.warn(`Chart performance degraded: ${metrics.renderTime}ms render time`);
      }
      
      if (!isReady) {
        console.error('Chart is not ready, attempting recovery...');
        await this.attemptRecovery();
      }
      
    } catch (error) {
      console.error('Chart health check failed:', error);
      await this.attemptRecovery();
    }
  }

  private async attemptRecovery(): Promise<void> {
    if (!this.container) return;

    const currentLibrary = this.activeChart?.getType() as ChartLibrary;
    const fallbackLibraries = this.config.fallbackOrder.filter(lib => lib !== currentLibrary);

    for (const library of fallbackLibraries) {
      try {
        await this.switchChartLibrary(library);
        console.log(`Successfully recovered with: ${library}`);
        return;
      } catch (error) {
        console.warn(`Recovery attempt with ${library} failed:`, error);
      }
    }

    console.error('All recovery attempts failed');
  }

  private async initializeFallback(): Promise<void> {
    if (!this.container) return;

    // Always fall back to canvas as last resort
    try {
      const fallbackChart = new CanvasFallbackAdapter();
      await fallbackChart.initialize(this.container, this.chartConfig);
      this.activeChart = fallbackChart;
      console.log('Initialized canvas fallback chart');
    } catch (error) {
      console.error('Even canvas fallback failed:', error);
      throw new Error('Complete chart system failure');
    }
  }

  private saveChartState(): any {
    // Save chart state for restoration after switching
    // For now, we'll return null - this can be extended to save series data, zoom level, etc.
    return null;
  }

  private restoreChartState(state: any): void {
    // Restore saved chart state
    // Implementation depends on what we saved
    if (!state || !this.activeChart) return;
    
    // Future implementation could restore:
    // - Series data
    // - Zoom/pan state
    // - Theme settings
    // - Event handlers
  }

  getActiveChart(): ChartPort | null {
    return this.activeChart;
  }

  getActiveLibrary(): ChartLibrary | null {
    return this.activeChart?.getType() as ChartLibrary || null;
  }

  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.activeChart) {
      this.activeChart.destroy();
      this.activeChart = null;
    }
    
    this.initializationPromises.clear();
    this.container = null;
  }
}
