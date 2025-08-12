import type { ChartPort, ChartConfig, ChartSeries, ChartEventHandlers, CandlestickData } from '../../domain/chart-interfaces';

// Dynamic import to avoid bundling issues
let ChartJsModule: any = null;
let CandlestickController: any = null;

export class ChartJsAdapter implements ChartPort {
  private chart: any = null;
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private config: ChartConfig = {};
  private isInitialized = false;
  private seriesData: Map<string, CandlestickData[]> = new Map();
  private performanceMetrics = {
    renderTime: 0,
    dataPoints: 0,
    memoryUsage: 0
  };

  async initialize(container: HTMLElement, config: ChartConfig = {}): Promise<void> {
    try {
      // Dynamically import Chart.js and candlestick plugin
      if (!ChartJsModule) {
        const [chartJs, candlestickPlugin] = await Promise.all([
          import('chart.js/auto'),
          import('chartjs-chart-financial')
        ]);
        
        ChartJsModule = chartJs;
        CandlestickController = candlestickPlugin;
      }

      this.container = container;
      this.config = { ...this.getDefaultConfig(), ...config };

      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      container.appendChild(this.canvas);

      const startTime = performance.now();

      // Initialize Chart.js
      this.chart = new ChartJsModule.default(this.canvas, {
        type: 'candlestick',
        data: {
          datasets: []
        },
        options: this.buildChartOptions()
      });

      this.performanceMetrics.renderTime = performance.now() - startTime;
      this.isInitialized = true;

      console.log('Chart.js initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Chart.js:', error);
      throw new Error('Chart.js initialization failed');
    }
  }

  destroy(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
    
    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
      this.canvas = null;
    }

    this.seriesData.clear();
    this.container = null;
    this.isInitialized = false;
  }

  addSeries(series: ChartSeries): string {
    if (!this.chart) {
      throw new Error('Chart not initialized');
    }

    const startTime = performance.now();

    const dataset = {
      label: series.id,
      data: this.transformDataForChartJs(series.data),
      borderColor: series.config?.upColor || '#22c55e',
      backgroundColor: series.config?.downColor || '#ef4444',
    };

    this.chart.data.datasets.push(dataset);
    this.seriesData.set(series.id, series.data);
    this.chart.update();

    this.performanceMetrics.dataPoints += series.data.length;
    this.performanceMetrics.renderTime = performance.now() - startTime;

    return series.id;
  }

  removeSeries(seriesId: string): void {
    if (!this.chart) return;

    const datasetIndex = this.chart.data.datasets.findIndex((dataset: any) => dataset.label === seriesId);
    if (datasetIndex !== -1) {
      this.chart.data.datasets.splice(datasetIndex, 1);
      this.seriesData.delete(seriesId);
      this.chart.update();
    }
  }

  updateSeries(seriesId: string, data: CandlestickData[]): void {
    if (!this.chart) return;

    const startTime = performance.now();
    const dataset = this.chart.data.datasets.find((ds: any) => ds.label === seriesId);
    
    if (dataset) {
      dataset.data = this.transformDataForChartJs(data);
      this.seriesData.set(seriesId, data);
      this.chart.update();
      
      this.performanceMetrics.renderTime = performance.now() - startTime;
      this.performanceMetrics.dataPoints = data.length;
    }
  }

  appendToSeries(seriesId: string, data: CandlestickData): void {
    if (!this.chart) return;

    const startTime = performance.now();
    const dataset = this.chart.data.datasets.find((ds: any) => ds.label === seriesId);
    
    if (dataset) {
      const existingData = this.seriesData.get(seriesId) || [];
      existingData.push(data);
      
      dataset.data = this.transformDataForChartJs(existingData);
      this.seriesData.set(seriesId, existingData);
      this.chart.update('none'); // No animation for real-time updates
      
      this.performanceMetrics.renderTime = performance.now() - startTime;
      this.performanceMetrics.dataPoints++;
    }
  }

  updateConfig(config: Partial<ChartConfig>): void {
    this.config = { ...this.config, ...config };
    if (this.chart) {
      this.chart.options = this.buildChartOptions();
      this.chart.update();
    }
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    this.updateConfig({});
  }

  resize(width?: number, height?: number): void {
    if (this.chart) {
      if (width && height) {
        this.chart.resize(width, height);
      } else {
        this.chart.resize();
      }
    }
  }

  fitContent(): void {
    if (this.chart) {
      this.chart.resetZoom();
    }
  }

  setVisibleRange(from: number, to: number): void {
    if (this.chart) {
      this.chart.zoomScale('x', { min: from * 1000, max: to * 1000 });
    }
  }

  scrollToRealTime(): void {
    if (this.chart) {
      this.chart.resetZoom();
    }
  }

  setEventHandlers(handlers: ChartEventHandlers): void {
    if (!this.chart) return;

    // Chart.js event handling is different - we'll implement basic versions
    if (handlers.onClick) {
      this.chart.options.onClick = (event: any, elements: any[]) => {
        if (elements.length > 0) {
          const point = elements[0];
          handlers.onClick?.({ time: point.parsed.x / 1000, price: point.parsed.y });
        }
      };
    }

    // Limited event support compared to Lightweight Charts
    this.chart.update();
  }

  getType(): string {
    return 'chart-js';
  }

  isReady(): boolean {
    return this.isInitialized && this.chart !== null;
  }

  async takeScreenshot(): Promise<string> {
    if (!this.chart) {
      throw new Error('Chart not initialized');
    }

    return this.chart.toBase64Image();
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  private getDefaultConfig(): ChartConfig {
    return {
      responsive: true,
      theme: 'light',
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
      responsive: this.config.responsive ?? true,
      maintainAspectRatio: false,
      scales: {
        x: {
          type: 'time',
          time: {
            displayFormats: {
              minute: 'HH:mm',
              hour: 'HH:mm',
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          },
          grid: {
            display: this.config.grid?.vertLines ?? true,
            color: isDark ? '#374151' : '#e5e7eb'
          },
          ticks: {
            color: isDark ? '#e5e7eb' : '#374151'
          },
          border: {
            display: this.config.timeScale?.borderVisible ?? true,
            color: isDark ? '#4b5563' : '#d1d5db'
          }
        },
        y: {
          position: this.config.priceScale?.position || 'right',
          grid: {
            display: this.config.grid?.horzLines ?? true,
            color: isDark ? '#374151' : '#e5e7eb'
          },
          ticks: {
            color: isDark ? '#e5e7eb' : '#374151'
          },
          border: {
            color: isDark ? '#4b5563' : '#d1d5db'
          }
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: isDark ? '#374151' : '#ffffff',
          titleColor: isDark ? '#e5e7eb' : '#374151',
          bodyColor: isDark ? '#e5e7eb' : '#374151',
          borderColor: isDark ? '#4b5563' : '#d1d5db',
          borderWidth: 1
        }
      },
      backgroundColor: isDark ? '#1f2937' : '#ffffff'
    };
  }

  private transformDataForChartJs(data: CandlestickData[]): any[] {
    return data.map(candle => ({
      x: candle.time * 1000, // Chart.js expects milliseconds
      o: candle.open,
      h: candle.high,
      l: candle.low,
      c: candle.close
    }));
  }
}
