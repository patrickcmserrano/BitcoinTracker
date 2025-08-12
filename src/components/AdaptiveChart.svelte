<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { ChartManager, type ChartLibrary } from '../lib/charts/chart-manager';
  import type { ChartPort, ChartConfig, CandlestickData } from '../lib/domain/chart-interfaces';

  // Props
  export let symbol = 'BTCUSDT';
  export let interval = '1m';
  export let theme: 'light' | 'dark' = 'light';
  export let height = 400;
  export let preferredLibrary: ChartLibrary = 'lightweight-charts';

  // Component state
  let chartContainer: HTMLDivElement;
  let chartManager: ChartManager | null = null;
  let activeChart: ChartPort | null = null;
  let currentLibrary: ChartLibrary | null = null;
  let isInitialized = false;
  let error: string | null = null;

  // Performance metrics
  let performanceMetrics = {
    renderTime: 0,
    dataPoints: 0,
    memoryUsage: 0
  };

  // Chart data
  let seriesId: string | null = null;
  let chartData: CandlestickData[] = [];

  // WebSocket connection
  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  const dispatch = createEventDispatcher();

  // Available libraries for user selection
  export const availableLibraries: { id: ChartLibrary; name: string; description: string }[] = [
    {
      id: 'lightweight-charts',
      name: 'Lightweight Charts',
      description: 'High performance, optimized for financial data'
    },
    {
      id: 'chart-js',
      name: 'Chart.js',
      description: 'Flexible, feature-rich charting library'
    },
    {
      id: 'canvas-fallback',
      name: 'Canvas Fallback',
      description: 'Zero-dependency, always available'
    }
  ];

  onMount(async () => {
    await initializeChart();
    await loadHistoricalData();
    setupWebSocket();
  });

  onDestroy(() => {
    cleanup();
  });

  async function initializeChart() {
    if (!chartContainer) return;

    try {
      error = null;
      
      chartManager = new ChartManager({
        preferredLibrary,
        fallbackOrder: ['lightweight-charts', 'chart-js', 'canvas-fallback'],
        healthCheckInterval: 60000,
        maxInitializationTime: 10000
      });

      const chartConfig: ChartConfig = {
        theme,
        height,
        responsive: true,
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

      activeChart = await chartManager.initialize(chartContainer, chartConfig);
      currentLibrary = chartManager.getActiveLibrary();
      isInitialized = true;

      console.log(`Chart initialized with: ${currentLibrary}`);
      dispatch('chartInitialized', { library: currentLibrary });

    } catch (err) {
      error = `Failed to initialize chart: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Chart initialization failed:', err);
      dispatch('chartError', { error });
    }
  }

  async function loadHistoricalData() {
    if (!activeChart || !isInitialized) return;

    try {
      // Mock historical data - replace with actual API call
      const mockData: CandlestickData[] = generateMockData();
      chartData = mockData;

      seriesId = activeChart.addSeries({
        id: 'main-series',
        type: 'candlestick',
        data: mockData,
        config: {
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444'
        }
      });

      updatePerformanceMetrics();
      
      dispatch('dataLoaded', { dataPoints: mockData.length });

    } catch (err) {
      error = `Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Data loading failed:', err);
    }
  }

  function generateMockData(): CandlestickData[] {
    const data: CandlestickData[] = [];
    const now = Math.floor(Date.now() / 1000);
    const oneHour = 3600;
    
    let price = 50000 + Math.random() * 10000; // Start around $50k-$60k
    
    for (let i = 100; i >= 0; i--) {
      const time = now - (i * oneHour);
      const open = price;
      const volatility = 0.02; // 2% volatility
      
      const change = (Math.random() - 0.5) * price * volatility;
      const close = Math.max(1000, open + change); // Minimum $1000
      
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      
      data.push({
        time,
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume: Math.random() * 1000
      });
      
      price = close;
    }
    
    return data;
  }

  function setupWebSocket() {
    if (ws) {
      ws.close();
    }

    // Mock WebSocket updates - replace with actual WebSocket connection
    const interval = setInterval(() => {
      if (activeChart && seriesId && isInitialized) {
        const lastCandle = chartData[chartData.length - 1];
        const now = Math.floor(Date.now() / 1000);
        
        // Update every 5 seconds with new data point
        if (now > lastCandle.time + 5) {
          const newCandle = generateNextCandle(lastCandle);
          chartData.push(newCandle);
          
          try {
            activeChart.appendToSeries(seriesId, newCandle);
            updatePerformanceMetrics();
            dispatch('dataUpdate', { candle: newCandle });
          } catch (err) {
            console.warn('Failed to update chart:', err);
          }
        }
      }
    }, 5000);

    // Store interval ID for cleanup
    ws = { close: () => clearInterval(interval) } as any;
  }

  function generateNextCandle(lastCandle: CandlestickData): CandlestickData {
    const now = Math.floor(Date.now() / 1000);
    const volatility = 0.001; // 0.1% volatility for real-time updates
    
    const change = (Math.random() - 0.5) * lastCandle.close * volatility;
    const close = Math.max(1000, lastCandle.close + change);
    
    return {
      time: now,
      open: lastCandle.close,
      high: Math.max(lastCandle.close, close) * (1 + Math.random() * 0.001),
      low: Math.min(lastCandle.close, close) * (1 - Math.random() * 0.001),
      close: Math.round(close * 100) / 100,
      volume: Math.random() * 100
    };
  }

  export async function switchLibrary(newLibrary: ChartLibrary) {
    if (!chartManager || currentLibrary === newLibrary) return;

    try {
      error = null;
      await chartManager.switchChartLibrary(newLibrary);
      activeChart = chartManager.getActiveChart();
      currentLibrary = chartManager.getActiveLibrary();

      // Reload data for new chart
      if (activeChart && chartData.length > 0) {
        seriesId = activeChart.addSeries({
          id: 'main-series',
          type: 'candlestick',
          data: chartData,
          config: {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderUpColor: '#22c55e',
            borderDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444'
          }
        });
      }

      updatePerformanceMetrics();
      dispatch('libraryChanged', { library: currentLibrary });
      
    } catch (err) {
      error = `Failed to switch library: ${err instanceof Error ? err.message : 'Unknown error'}`;
      console.error('Library switch failed:', err);
      dispatch('chartError', { error });
    }
  }

  export async function takeScreenshot(): Promise<string | null> {
    if (!activeChart) return null;

    try {
      return await activeChart.takeScreenshot();
    } catch (err) {
      console.error('Screenshot failed:', err);
      return null;
    }
  }

  export function getPerformanceMetrics() {
    return { ...performanceMetrics };
  }

  function updatePerformanceMetrics() {
    if (activeChart) {
      performanceMetrics = activeChart.getPerformanceMetrics();
    }
  }

  function cleanup() {
    if (ws) {
      ws.close();
      ws = null;
    }
    
    if (chartManager) {
      chartManager.destroy();
      chartManager = null;
    }
    
    activeChart = null;
    isInitialized = false;
    reconnectAttempts = 0;
  }

  // Reactive updates
  $: if (isInitialized && activeChart) {
    activeChart.setTheme(theme);
  }
</script>

<div class="chart-wrapper h-full">
  <!-- Chart Container -->
  <div 
    bind:this={chartContainer}
    class="chart-container w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
    style="height: {height}px;"
  >
    {#if !isInitialized && !error}
      <div class="flex items-center justify-center h-full">
        <div class="flex flex-col items-center space-y-4">
          <div class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Initializing chart...</p>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="flex items-center justify-center h-full">
        <div class="text-center p-6">
          <div class="text-red-500 mb-2">
            <svg class="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Chart Error</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button 
            on:click={initializeChart}
            class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Chart Status Bar -->
  {#if isInitialized && currentLibrary}
    <div class="flex items-center justify-between px-3 py-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-b-lg border-t border-gray-200 dark:border-gray-700">
      <div class="flex items-center space-x-4">
        <span class="flex items-center">
          <div class="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          {availableLibraries.find(lib => lib.id === currentLibrary)?.name || currentLibrary}
        </span>
        <span>
          {chartData.length} data points
        </span>
        <span>
          Render: {performanceMetrics.renderTime.toFixed(1)}ms
        </span>
      </div>
      
      <div class="flex items-center space-x-2">
        <span>{symbol} • {interval}</span>
      </div>
    </div>
  {/if}
</div>

<style>
  .chart-wrapper {
    position: relative;
  }

  .chart-container {
    position: relative;
    overflow: hidden;
  }
</style>
