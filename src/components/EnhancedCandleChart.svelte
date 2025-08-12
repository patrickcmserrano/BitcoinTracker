<!-- Enhanced CandleChart with Chart Library Abstraction -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { ChartManager } from '../lib/charts/chart-manager';
  import type { ChartPort, CandlestickData } from '../lib/domain/chart-interfaces';

  export let data: CandlestickData[] = [];
  export let theme: 'light' | 'dark' = 'light';
  export let width: number = 800;
  export let height: number = 400;
  export let preferredLibrary: 'lightweight-charts' | 'chart-js' | 'canvas-fallback' = 'canvas-fallback';

  let container: HTMLElement;
  let chartManager: ChartManager | null = null;
  let activeChart: ChartPort | null = null;
  let currentLibrary: string = '';
  let performanceMetrics = { renderTime: 0, dataPoints: 0, memoryUsage: 0 };
  let isLoading = true;
  let error: string = '';

  $: if (activeChart && data.length > 0) {
    updateChartData();
  }

  $: if (activeChart) {
    activeChart.setTheme(theme);
  }

  onMount(async () => {
    if (container) {
      await initializeChart();
    }
  });

  onDestroy(() => {
    if (chartManager) {
      chartManager.destroy();
    }
  });

  async function initializeChart() {
    try {
      isLoading = true;
      error = '';

      chartManager = new ChartManager({
        preferredLibrary,
        fallbackOrder: ['canvas-fallback'], // Always have fallback available
        healthCheckInterval: 60000,
        maxInitializationTime: 10000
      });

      activeChart = await chartManager.initialize(container, {
        width,
        height,
        theme,
        responsive: true,
        grid: {
          vertLines: true,
          horzLines: true
        },
        priceScale: {
          position: 'right',
          autoScale: true
        },
        crosshair: true
      });

      currentLibrary = chartManager.getActiveLibrary() || 'unknown';

      if (data.length > 0) {
        updateChartData();
      }

      // Update performance metrics periodically
      updateMetrics();
      setInterval(updateMetrics, 5000);

    } catch (err) {
      error = `Failed to initialize chart: ${err}`;
      console.error('Chart initialization error:', err);
    } finally {
      isLoading = false;
    }
  }

  function updateChartData() {
    if (!activeChart || data.length === 0) return;

    try {
      // Remove existing series if any
      activeChart.removeSeries('main-candlestick');
      
      // Add new series
      activeChart.addSeries({
        id: 'main-candlestick',
        type: 'candlestick',
        data: data,
        config: {
          upColor: theme === 'dark' ? '#22c55e' : '#10b981',
          downColor: theme === 'dark' ? '#ef4444' : '#f87171',
          borderUpColor: theme === 'dark' ? '#22c55e' : '#10b981',
          borderDownColor: theme === 'dark' ? '#ef4444' : '#f87171',
          wickUpColor: theme === 'dark' ? '#22c55e' : '#10b981',
          wickDownColor: theme === 'dark' ? '#ef4444' : '#f87171'
        }
      });

      activeChart.fitContent();
      updateMetrics();
    } catch (err) {
      error = `Failed to update chart data: ${err}`;
      console.error('Chart data update error:', err);
    }
  }

  function updateMetrics() {
    if (activeChart) {
      performanceMetrics = activeChart.getPerformanceMetrics();
    }
  }

  async function switchLibrary(library: 'lightweight-charts' | 'chart-js' | 'canvas-fallback') {
    if (!chartManager) return;

    try {
      isLoading = true;
      error = '';
      
      await chartManager.switchChartLibrary(library);
      activeChart = chartManager.getActiveChart();
      currentLibrary = chartManager.getActiveLibrary() || 'unknown';
      
      if (data.length > 0) {
        updateChartData();
      }
    } catch (err) {
      error = `Failed to switch to ${library}: ${err}`;
      console.error('Chart library switch error:', err);
    } finally {
      isLoading = false;
    }
  }

  async function takeScreenshot() {
    if (!activeChart) return;

    try {
      const screenshot = await activeChart.takeScreenshot();
      
      // Create download link
      const link = document.createElement('a');
      link.download = `chart-screenshot-${Date.now()}.png`;
      link.href = screenshot;
      link.click();
    } catch (err) {
      error = `Failed to take screenshot: ${err}`;
      console.error('Screenshot error:', err);
    }
  }

  function handleResize() {
    if (activeChart) {
      activeChart.resize(width, height);
    }
  }

  // Handle prop changes
  $: if (activeChart && (width || height)) {
    handleResize();
  }
</script>

<div class="chart-container">
  <!-- Chart Controls -->
  <div class="chart-controls">
    <div class="library-info">
      <span class="label">Active Library:</span>
      <span class="value" class:error={currentLibrary === 'canvas-fallback'}>
        {currentLibrary}
      </span>
    </div>

    <div class="library-switcher">
      <button 
        on:click={() => switchLibrary('canvas-fallback')}
        class:active={currentLibrary === 'canvas-fallback'}
        disabled={isLoading}
      >
        Canvas
      </button>
      <button 
        on:click={() => switchLibrary('lightweight-charts')}
        class:active={currentLibrary === 'lightweight-charts'}
        disabled={isLoading}
      >
        Lightweight
      </button>
      <button 
        on:click={() => switchLibrary('chart-js')}
        class:active={currentLibrary === 'chart-js'}
        disabled={isLoading}
      >
        Chart.js
      </button>
    </div>

    <div class="actions">
      <button on:click={takeScreenshot} disabled={!activeChart || isLoading}>
        📸 Screenshot
      </button>
      <button on:click={() => activeChart?.fitContent()} disabled={!activeChart || isLoading}>
        🎯 Fit Content
      </button>
    </div>
  </div>

  <!-- Performance Metrics -->
  <div class="metrics">
    <div class="metric">
      <span class="label">Render Time:</span>
      <span class="value">{performanceMetrics.renderTime.toFixed(2)}ms</span>
    </div>
    <div class="metric">
      <span class="label">Data Points:</span>
      <span class="value">{performanceMetrics.dataPoints}</span>
    </div>
    <div class="metric">
      <span class="label">Memory:</span>
      <span class="value">{performanceMetrics.memoryUsage.toFixed(2)}MB</span>
    </div>
  </div>

  <!-- Loading State -->
  {#if isLoading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading chart...</p>
    </div>
  {/if}

  <!-- Error Display -->
  {#if error}
    <div class="error-message">
      <p>⚠️ {error}</p>
      <button on:click={() => error = ''}>Dismiss</button>
    </div>
  {/if}

  <!-- Chart Container -->
  <div 
    bind:this={container}
    class="chart-canvas"
    style="width: {width}px; height: {height}px;"
  ></div>
</div>

<style>
  .chart-container {
    position: relative;
    background: var(--bg-primary);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .chart-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
    gap: 16px;
  }

  .library-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .library-switcher {
    display: flex;
    gap: 4px;
  }

  .library-switcher button {
    padding: 6px 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
  }

  .library-switcher button:hover {
    background: var(--bg-hover);
  }

  .library-switcher button.active {
    background: var(--accent-color);
    color: white;
    border-color: var(--accent-color);
  }

  .library-switcher button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .actions {
    display: flex;
    gap: 8px;
  }

  .actions button {
    padding: 6px 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 12px;
  }

  .actions button:hover {
    background: var(--bg-hover);
  }

  .actions button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .metrics {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    font-size: 12px;
  }

  .metric {
    display: flex;
    gap: 4px;
  }

  .label {
    color: var(--text-secondary);
    font-weight: 500;
  }

  .value {
    color: var(--text-primary);
    font-weight: 600;
  }

  .value.error {
    color: var(--error-color);
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    z-index: 10;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--text-secondary);
    border-top: 3px solid var(--accent-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-overlay p {
    margin-top: 12px;
    color: white;
    font-size: 14px;
  }

  .error-message {
    position: absolute;
    top: 60px;
    left: 16px;
    right: 16px;
    background: var(--error-bg);
    color: var(--error-color);
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--error-color);
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-message button {
    background: transparent;
    border: 1px solid var(--error-color);
    color: var(--error-color);
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }

  .chart-canvas {
    border: 1px solid var(--border-color);
    border-radius: 4px;
    position: relative;
    overflow: hidden;
  }

  /* Dark theme support */
  :global([data-theme="dark"]) {
    --bg-primary: #1f2937;
    --bg-secondary: #374151;
    --bg-tertiary: #4b5563;
    --bg-hover: #6b7280;
    --text-primary: #f9fafb;
    --text-secondary: #d1d5db;
    --border-color: #4b5563;
    --accent-color: #3b82f6;
    --error-color: #ef4444;
    --error-bg: #7f1d1d;
  }

  /* Light theme support */
  :global([data-theme="light"]) {
    --bg-primary: #ffffff;
    --bg-secondary: #f3f4f6;
    --bg-tertiary: #e5e7eb;
    --bg-hover: #f9fafb;
    --text-primary: #111827;
    --text-secondary: #6b7280;
    --border-color: #d1d5db;
    --accent-color: #3b82f6;
    --error-color: #dc2626;
    --error-bg: #fef2f2;
  }
</style>
