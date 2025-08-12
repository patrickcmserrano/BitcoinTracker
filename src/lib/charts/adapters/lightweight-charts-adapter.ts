import type { ChartPort, ChartConfig, ChartSeries, ChartEventHandlers, CandlestickData } from '../../domain/chart-interfaces';

// Dynamic import to avoid bundling issues
let LightweightChartsModule: any = null;

export class LightweightChartsAdapter implements ChartPort {
  private chart: any = null;
  private container: HTMLElement | null = null;
  private seriesMap: Map<string, any> = new Map();
  private config: ChartConfig = {};
  private isInitialized = false;
  private performanceMetrics = {
    renderTime: 0,
    dataPoints: 0,
    memoryUsage: 0
  };

  async initialize(container: HTMLElement, config: ChartConfig = {}): Promise<void> {
    try {
      // Check if we're in a proper browser environment
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        throw new Error('Lightweight Charts requires a browser environment');
      }

      // Ensure container is properly attached to the DOM
      if (!container || !container.appendChild) {
        throw new Error('Invalid container element');
      }

      // Dynamically import Lightweight Charts
      if (!LightweightChartsModule) {
        // @ts-ignore - Dynamic import of ESM-only module
        LightweightChartsModule = await import('lightweight-charts');
        console.log('Lightweight Charts module loaded. Available exports:', Object.keys(LightweightChartsModule));
        console.log('createChart function type:', typeof LightweightChartsModule.createChart);
      }

      this.container = container;
      this.config = { ...this.getDefaultConfig(), ...config };

      const startTime = performance.now();

      // Ensure container has proper dimensions
      if (container.clientWidth === 0 || container.clientHeight === 0) {
        container.style.width = this.config.width ? `${this.config.width}px` : '400px';
        container.style.height = this.config.height ? `${this.config.height}px` : '300px';
      }

      // Create chart using the correct API
      const chartOptions = this.buildChartOptions();
      console.log('Creating chart with options:', chartOptions);
      
      this.chart = LightweightChartsModule.createChart(container, chartOptions);
      
      this.performanceMetrics.renderTime = performance.now() - startTime;
      this.isInitialized = true;

      console.log('Lightweight Charts chart created successfully');
      console.log('Chart instance type:', typeof this.chart);
      console.log('Chart constructor:', this.chart?.constructor?.name);
      
      // Get comprehensive method list
      if (this.chart) {
        const allProps = [];
        let obj = this.chart;
        let depth = 0;
        while (obj && obj !== Object.prototype && depth < 5) {
          allProps.push(...Object.getOwnPropertyNames(obj));
          obj = Object.getPrototypeOf(obj);
          depth++;
        }
        const uniqueMethods = [...new Set(allProps)].filter(name => typeof this.chart[name] === 'function');
        console.log('All available chart methods:', uniqueMethods.sort());
        
        // Specifically look for series-related methods
        const seriesRelated = uniqueMethods.filter(name => 
          name.toLowerCase().includes('series') || 
          name.toLowerCase().includes('candl') ||
          name.toLowerCase().includes('add')
        );
        console.log('Series/add related methods:', seriesRelated);
        
        // Test if the expected method exists
        console.log('addCandlestickSeries exists?', typeof this.chart.addCandlestickSeries === 'function');
      }
      
    } catch (error) {
      console.error('Failed to initialize Lightweight Charts:', error);
      throw new Error(`Lightweight Charts initialization failed: ${error.message}`);
    }
  }

  destroy(): void {
    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }
    this.seriesMap.clear();
    this.container = null;
    this.isInitialized = false;
  }

  addSeries(series: ChartSeries): string {
    if (!this.chart) {
      throw new Error('Chart not initialized');
    }

    const startTime = performance.now();
    let chartSeries: any;

    try {
      switch (series.type) {
        case 'candlestick':
          // Check for different possible method names
          if (typeof this.chart.addCandlestickSeries === 'function') {
            chartSeries = this.chart.addCandlestickSeries(this.buildCandlestickOptions(series.config));
          } else if (typeof this.chart.addCandleSeries === 'function') {
            chartSeries = this.chart.addCandleSeries(this.buildCandlestickOptions(series.config));
          } else if (typeof this.chart.addSeries === 'function') {
            chartSeries = this.chart.addSeries('candlestick', this.buildCandlestickOptions(series.config));
          } else {
            // Log available methods to help debug
            const methods = Object.getOwnPropertyNames(this.chart).filter(name => typeof this.chart[name] === 'function');
            console.error('No candlestick series method found. Available methods:', methods.sort());
            throw new Error('No candlestick series method available');
          }
          break;
        case 'line':
          if (typeof this.chart.addLineSeries === 'function') {
            chartSeries = this.chart.addLineSeries();
          } else {
            chartSeries = this.chart.addSeries('line');
          }
          break;
        case 'area':
          if (typeof this.chart.addAreaSeries === 'function') {
            chartSeries = this.chart.addAreaSeries();
          } else {
            chartSeries = this.chart.addSeries('area');
          }
          break;
        default:
          throw new Error(`Unsupported series type: ${series.type}`);
      }

      // Convert data to proper format for Lightweight Charts
      const formattedData = this.formatDataForSeries(series.data, series.type);
      console.log('Formatted data sample:', formattedData.slice(0, 2));
      
      chartSeries.setData(formattedData);
      this.seriesMap.set(series.id, chartSeries);

      this.performanceMetrics.dataPoints += series.data.length;
      this.performanceMetrics.renderTime = performance.now() - startTime;

      console.log(`Successfully added ${series.type} series with ${series.data.length} data points`);
      return series.id;
      
    } catch (error) {
      console.error('Error adding series:', error);
      console.error('Chart object type:', typeof this.chart);
      console.error('Chart constructor:', this.chart.constructor?.name);
      
      // Try to give more helpful error information
      if (this.chart) {
        const allProps = Object.getOwnPropertyNames(this.chart);
        const methods = allProps.filter(name => typeof this.chart[name] === 'function');
        const candleMethods = methods.filter(name => name.toLowerCase().includes('candl') || name.toLowerCase().includes('series'));
        console.error('Candle-related methods:', candleMethods);
        console.error('All methods:', methods.sort());
      }
      
      throw new Error(`Failed to add series: ${error.message}`);
    }
  }

  removeSeries(seriesId: string): void {
    const series = this.seriesMap.get(seriesId);
    if (series && this.chart) {
      this.chart.removeSeries(series);
      this.seriesMap.delete(seriesId);
    }
  }

  updateSeries(seriesId: string, data: CandlestickData[]): void {
    const series = this.seriesMap.get(seriesId);
    if (series) {
      const startTime = performance.now();
      const formattedData = this.formatDataForSeries(data, 'candlestick');
      series.setData(formattedData);
      this.performanceMetrics.renderTime = performance.now() - startTime;
      this.performanceMetrics.dataPoints = data.length;
    }
  }

  appendToSeries(seriesId: string, data: CandlestickData): void {
    const series = this.seriesMap.get(seriesId);
    if (series) {
      const startTime = performance.now();
      const formattedData = this.formatDataForSeries([data], 'candlestick')[0];
      series.update(formattedData);
      this.performanceMetrics.renderTime = performance.now() - startTime;
      this.performanceMetrics.dataPoints++;
    }
  }

  updateConfig(config: Partial<ChartConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.chart) {
      this.chart.applyOptions(this.buildChartOptions());
    }
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    if (this.chart) {
      this.chart.applyOptions(this.buildChartOptions());
    }
  }

  resize(width?: number, height?: number): void {
    if (this.chart && this.container) {
      const newWidth = width || this.container.clientWidth;
      const newHeight = height || this.container.clientHeight;
      this.chart.resize(newWidth, newHeight);
    }
  }

  fitContent(): void {
    if (this.chart) {
      this.chart.timeScale().fitContent();
    }
  }

  setVisibleRange(from: number, to: number): void {
    if (this.chart) {
      this.chart.timeScale().setVisibleRange({ from, to });
    }
  }

  scrollToRealTime(): void {
    if (this.chart) {
      this.chart.timeScale().scrollToRealTime();
    }
  }

  setEventHandlers(handlers: ChartEventHandlers): void {
    if (!this.chart) return;

    if (handlers.onCrosshairMove) {
      this.chart.subscribeCrosshairMove(handlers.onCrosshairMove);
    }

    if (handlers.onVisibleTimeRangeChange) {
      this.chart.timeScale().subscribeVisibleTimeRangeChange(handlers.onVisibleTimeRangeChange);
    }

    if (handlers.onClick) {
      this.chart.subscribeClick(handlers.onClick);
    }
  }

  getType(): string {
    return 'lightweight-charts';
  }

  isReady(): boolean {
    return this.isInitialized && this.chart !== null;
  }

  async takeScreenshot(): Promise<string> {
    if (!this.chart) {
      throw new Error('Chart not initialized');
    }

    // Lightweight Charts doesn't have built-in screenshot functionality
    // We'll use canvas conversion as fallback
    if (this.container) {
      const canvas = this.container.querySelector('canvas');
      if (canvas) {
        return canvas.toDataURL();
      }
    }
    
    throw new Error('Screenshot not available');
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  private formatDataForSeries(data: CandlestickData[], seriesType: string): any[] {
    // Lightweight Charts expects time as unix timestamp (seconds)
    return data.map(item => {
      const baseItem = {
        time: typeof item.time === 'number' ? item.time : Math.floor(new Date(item.time).getTime() / 1000)
      };

      if (seriesType === 'candlestick') {
        return {
          ...baseItem,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close
        };
      } else {
        // For line/area series, use close price as value
        return {
          ...baseItem,
          value: item.close
        };
      }
    });
  }

  private getDefaultConfig(): ChartConfig {
    return {
      responsive: true,
      theme: 'light',
      watermark: {
        visible: false,
        text: ''
      },
      crosshair: true,
      grid: {
        vertLines: true,
        horzLines: true
      },
      priceScale: {
        position: 'right',
        autoScale: true
      },
      timeScale: {
        visible: true,
        timeVisible: true,
        borderVisible: true
      }
    };
  }

  private buildChartOptions(): any {
    const isDark = this.config.theme === 'dark';
    
    return {
      width: this.config.width,
      height: this.config.height,
      layout: {
        background: {
          color: isDark ? '#1f2937' : '#ffffff'
        },
        textColor: isDark ? '#e5e7eb' : '#374151'
      },
      grid: {
        vertLines: {
          color: isDark ? '#374151' : '#e5e7eb',
          visible: this.config.grid?.vertLines ?? true
        },
        horzLines: {
          color: isDark ? '#374151' : '#e5e7eb',
          visible: this.config.grid?.horzLines ?? true
        }
      },
      crosshair: {
        mode: this.config.crosshair ? (LightweightChartsModule?.CrosshairMode?.Normal ?? 1) : (LightweightChartsModule?.CrosshairMode?.Hidden ?? 0)
      },
      rightPriceScale: {
        visible: this.config.priceScale?.position === 'right',
        borderColor: isDark ? '#4b5563' : '#d1d5db',
        autoScale: this.config.priceScale?.autoScale ?? true
      },
      leftPriceScale: {
        visible: this.config.priceScale?.position === 'left',
        borderColor: isDark ? '#4b5563' : '#d1d5db'
      },
      timeScale: {
        borderColor: isDark ? '#4b5563' : '#d1d5db',
        visible: this.config.timeScale?.visible ?? true,
        timeVisible: this.config.timeScale?.timeVisible ?? true,
        borderVisible: this.config.timeScale?.borderVisible ?? true
      },
      watermark: this.config.watermark?.visible ? {
        color: isDark ? '#374151' : '#9ca3af',
        visible: true,
        text: this.config.watermark.text,
        fontSize: 24,
        horzAlign: 'center',
        vertAlign: 'center'
      } : undefined
    };
  }

  private buildCandlestickOptions(config?: any): any {
    return {
      upColor: config?.upColor || '#22c55e',
      downColor: config?.downColor || '#ef4444',
      borderDownColor: config?.borderDownColor || '#ef4444',
      borderUpColor: config?.borderUpColor || '#22c55e',
      wickDownColor: config?.wickDownColor || '#ef4444',
      wickUpColor: config?.wickUpColor || '#22c55e'
    };
  }
}
