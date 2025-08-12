export interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface ChartConfig {
  width?: number;
  height?: number;
  theme?: 'light' | 'dark';
  responsive?: boolean;
  watermark?: {
    visible: boolean;
    text: string;
  };
  crosshair?: boolean;
  grid?: {
    vertLines: boolean;
    horzLines: boolean;
  };
  priceScale?: {
    position: 'left' | 'right';
    autoScale: boolean;
  };
  timeScale?: {
    visible: boolean;
    timeVisible: boolean;
    borderVisible: boolean;
  };
}

export interface ChartSeries {
  id: string;
  type: 'candlestick' | 'line' | 'area';
  data: CandlestickData[];
  config?: {
    upColor?: string;
    downColor?: string;
    borderUpColor?: string;
    borderDownColor?: string;
    wickUpColor?: string;
    wickDownColor?: string;
  };
}

export interface ChartEventHandlers {
  onCrosshairMove?: (point: { time?: number; price?: number }) => void;
  onVisibleTimeRangeChange?: (range: { from: number; to: number }) => void;
  onClick?: (point: { time?: number; price?: number }) => void;
  onResize?: () => void;
}

export interface ChartPort {
  // Lifecycle
  initialize(container: HTMLElement, config?: ChartConfig): Promise<void>;
  destroy(): void;
  
  // Data management
  addSeries(series: ChartSeries): string; // Returns series ID
  removeSeries(seriesId: string): void;
  updateSeries(seriesId: string, data: CandlestickData[]): void;
  appendToSeries(seriesId: string, data: CandlestickData): void;
  
  // Configuration
  updateConfig(config: Partial<ChartConfig>): void;
  setTheme(theme: 'light' | 'dark'): void;
  
  // Layout
  resize(width?: number, height?: number): void;
  fitContent(): void;
  
  // Time and price scales
  setVisibleRange(from: number, to: number): void;
  scrollToRealTime(): void;
  
  // Event handling
  setEventHandlers(handlers: ChartEventHandlers): void;
  
  // Utility
  getType(): string;
  isReady(): boolean;
  takeScreenshot(): Promise<string>; // Returns base64 image
  
  // Performance and health
  getPerformanceMetrics(): {
    renderTime: number;
    dataPoints: number;
    memoryUsage: number;
  };
}
