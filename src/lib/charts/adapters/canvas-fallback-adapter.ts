import type { ChartPort, ChartConfig, ChartSeries, ChartEventHandlers, CandlestickData } from '../../domain/chart-interfaces';

export class CanvasFallbackAdapter implements ChartPort {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private container: HTMLElement | null = null;
  private config: ChartConfig = {};
  private isInitialized = false;
  private seriesData: Map<string, CandlestickData[]> = new Map();
  private animationFrame: number | null = null;
  private performanceMetrics = {
    renderTime: 0,
    dataPoints: 0,
    memoryUsage: 0
  };

  // Chart dimensions and scaling
  private chartArea = { x: 50, y: 10, width: 0, height: 0 };
  private padding = { left: 50, right: 10, top: 10, bottom: 30 };

  async initialize(container: HTMLElement, config: ChartConfig = {}): Promise<void> {
    try {
      this.container = container;
      this.config = { ...this.getDefaultConfig(), ...config };

      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.display = 'block';
      
      container.appendChild(this.canvas);

      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        throw new Error('Could not get 2D context');
      }

      this.setupCanvas();
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Canvas fallback chart initialized successfully');
    } catch (error) {
      console.error('Failed to initialize canvas chart:', error);
      throw new Error('Canvas chart initialization failed');
    }
  }

  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }

    if (this.canvas && this.container) {
      this.container.removeChild(this.canvas);
      this.canvas = null;
      this.ctx = null;
    }

    this.seriesData.clear();
    this.container = null;
    this.isInitialized = false;
  }

  addSeries(series: ChartSeries): string {
    if (!this.isInitialized) {
      throw new Error('Chart not initialized');
    }

    this.seriesData.set(series.id, series.data);
    this.performanceMetrics.dataPoints += series.data.length;
    this.render();
    
    return series.id;
  }

  removeSeries(seriesId: string): void {
    if (this.seriesData.has(seriesId)) {
      this.seriesData.delete(seriesId);
      this.render();
    }
  }

  updateSeries(seriesId: string, data: CandlestickData[]): void {
    const startTime = performance.now();
    this.seriesData.set(seriesId, data);
    this.performanceMetrics.dataPoints = data.length;
    this.render();
    this.performanceMetrics.renderTime = performance.now() - startTime;
  }

  appendToSeries(seriesId: string, data: CandlestickData): void {
    const startTime = performance.now();
    const existingData = this.seriesData.get(seriesId) || [];
    existingData.push(data);
    this.seriesData.set(seriesId, existingData);
    this.performanceMetrics.dataPoints++;
    this.render();
    this.performanceMetrics.renderTime = performance.now() - startTime;
  }

  updateConfig(config: Partial<ChartConfig>): void {
    this.config = { ...this.config, ...config };
    this.render();
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    this.render();
  }

  resize(width?: number, height?: number): void {
    this.setupCanvas();
    this.render();
  }

  fitContent(): void {
    this.render();
  }

  setVisibleRange(from: number, to: number): void {
    // Simple implementation - would need more sophisticated range handling
    this.render();
  }

  scrollToRealTime(): void {
    this.render();
  }

  setEventHandlers(handlers: ChartEventHandlers): void {
    // Basic event handling - limited compared to other libraries
    if (this.canvas && handlers.onClick) {
      this.canvas.addEventListener('click', (event) => {
        const rect = this.canvas!.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert canvas coordinates to chart coordinates
        const chartX = this.canvasToChartX(x);
        const chartY = this.canvasToChartY(y);
        
        handlers.onClick?.({ time: chartX, price: chartY });
      });
    }
  }

  getType(): string {
    return 'canvas-fallback';
  }

  isReady(): boolean {
    return this.isInitialized && this.canvas !== null && this.ctx !== null;
  }

  async takeScreenshot(): Promise<string> {
    if (!this.canvas) {
      throw new Error('Chart not initialized');
    }
    return this.canvas.toDataURL();
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  private getDefaultConfig(): ChartConfig {
    return {
      responsive: true,
      theme: 'light',
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

  private setupCanvas(): void {
    if (!this.canvas || !this.container) return;

    const rect = this.container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    if (this.ctx) {
      this.ctx.scale(dpr, dpr);
    }

    this.updateChartArea();
  }

  private updateChartArea(): void {
    if (!this.canvas) return;

    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.chartArea = {
      x: this.padding.left,
      y: this.padding.top,
      width: width - this.padding.left - this.padding.right,
      height: height - this.padding.top - this.padding.bottom
    };
  }

  private setupEventListeners(): void {
    if (!this.container) return;

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    resizeObserver.observe(this.container);
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;

    const startTime = performance.now();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);

    // Draw background
    this.drawBackground();

    // Draw grid
    if (this.config.grid?.horzLines || this.config.grid?.vertLines) {
      this.drawGrid();
    }

    // Draw data
    this.drawCandlesticks();

    // Draw axes
    this.drawAxes();

    this.performanceMetrics.renderTime = performance.now() - startTime;
  }

  private drawBackground(): void {
    if (!this.ctx || !this.canvas) return;

    const isDark = this.config.theme === 'dark';
    this.ctx.fillStyle = isDark ? '#1f2937' : '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
  }

  private drawGrid(): void {
    if (!this.ctx) return;

    const isDark = this.config.theme === 'dark';
    this.ctx.strokeStyle = isDark ? '#374151' : '#e5e7eb';
    this.ctx.lineWidth = 1;

    // Vertical lines
    if (this.config.grid?.vertLines) {
      const gridCount = 10;
      const stepX = this.chartArea.width / gridCount;
      
      for (let i = 1; i < gridCount; i++) {
        const x = this.chartArea.x + i * stepX;
        this.ctx.beginPath();
        this.ctx.moveTo(x, this.chartArea.y);
        this.ctx.lineTo(x, this.chartArea.y + this.chartArea.height);
        this.ctx.stroke();
      }
    }

    // Horizontal lines
    if (this.config.grid?.horzLines) {
      const gridCount = 8;
      const stepY = this.chartArea.height / gridCount;
      
      for (let i = 1; i < gridCount; i++) {
        const y = this.chartArea.y + i * stepY;
        this.ctx.beginPath();
        this.ctx.moveTo(this.chartArea.x, y);
        this.ctx.lineTo(this.chartArea.x + this.chartArea.width, y);
        this.ctx.stroke();
      }
    }
  }

  private drawCandlesticks(): void {
    if (!this.ctx) return;

    // Get all data points
    const allData: CandlestickData[] = [];
    this.seriesData.forEach(data => allData.push(...data));
    
    if (allData.length === 0) return;

    // Calculate price range
    const prices = allData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    // Calculate time range
    const times = allData.map(d => d.time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime;

    // Draw candlesticks
    const candleWidth = Math.max(1, this.chartArea.width / allData.length * 0.8);
    
    allData.forEach((candle, index) => {
      const x = this.chartArea.x + (index / allData.length) * this.chartArea.width;
      const openY = this.chartArea.y + this.chartArea.height - ((candle.open - minPrice) / priceRange) * this.chartArea.height;
      const closeY = this.chartArea.y + this.chartArea.height - ((candle.close - minPrice) / priceRange) * this.chartArea.height;
      const highY = this.chartArea.y + this.chartArea.height - ((candle.high - minPrice) / priceRange) * this.chartArea.height;
      const lowY = this.chartArea.y + this.chartArea.height - ((candle.low - minPrice) / priceRange) * this.chartArea.height;

      const isUp = candle.close > candle.open;
      this.ctx.strokeStyle = isUp ? '#22c55e' : '#ef4444';
      this.ctx.fillStyle = isUp ? '#22c55e' : '#ef4444';
      this.ctx.lineWidth = 1;

      // Draw wick
      this.ctx.beginPath();
      this.ctx.moveTo(x, highY);
      this.ctx.lineTo(x, lowY);
      this.ctx.stroke();

      // Draw body
      const bodyHeight = Math.abs(closeY - openY);
      const bodyY = Math.min(openY, closeY);
      
      if (isUp) {
        this.ctx.strokeRect(x - candleWidth/2, bodyY, candleWidth, bodyHeight);
      } else {
        this.ctx.fillRect(x - candleWidth/2, bodyY, candleWidth, bodyHeight);
      }
    });
  }

  private drawAxes(): void {
    if (!this.ctx || !this.canvas) return;

    const isDark = this.config.theme === 'dark';
    this.ctx.strokeStyle = isDark ? '#4b5563' : '#d1d5db';
    this.ctx.fillStyle = isDark ? '#e5e7eb' : '#374151';
    this.ctx.font = '12px Arial';
    this.ctx.lineWidth = 1;

    // Draw border
    this.ctx.strokeRect(this.chartArea.x, this.chartArea.y, this.chartArea.width, this.chartArea.height);

    // Simple price labels on right axis
    if (this.config.priceScale?.position === 'right') {
      const allData: CandlestickData[] = [];
      this.seriesData.forEach(data => allData.push(...data));
      
      if (allData.length > 0) {
        const prices = allData.flatMap(d => [d.high, d.low]);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        for (let i = 0; i <= 5; i++) {
          const price = minPrice + (maxPrice - minPrice) * (i / 5);
          const y = this.chartArea.y + this.chartArea.height - (i / 5) * this.chartArea.height;
          
          this.ctx.fillText(
            price.toFixed(2), 
            this.chartArea.x + this.chartArea.width + 5, 
            y + 4
          );
        }
      }
    }
  }

  private canvasToChartX(canvasX: number): number {
    // Convert canvas X coordinate to chart time value
    const ratio = (canvasX - this.chartArea.x) / this.chartArea.width;
    
    const allData: CandlestickData[] = [];
    this.seriesData.forEach(data => allData.push(...data));
    
    if (allData.length === 0) return 0;
    
    const times = allData.map(d => d.time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    return minTime + ratio * (maxTime - minTime);
  }

  private canvasToChartY(canvasY: number): number {
    // Convert canvas Y coordinate to chart price value
    const ratio = 1 - (canvasY - this.chartArea.y) / this.chartArea.height;
    
    const allData: CandlestickData[] = [];
    this.seriesData.forEach(data => allData.push(...data));
    
    if (allData.length === 0) return 0;
    
    const prices = allData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    return minPrice + ratio * (maxPrice - minPrice);
  }
}
