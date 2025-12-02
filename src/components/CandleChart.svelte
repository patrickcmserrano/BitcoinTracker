<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type {
    IChartApi,
    ISeriesApi,
    CandlestickData,
    LogicalRange,
  } from "lightweight-charts";

  import ChartHeader from "./chart/ChartHeader.svelte";
  import ChartControls from "./chart/ChartControls.svelte";
  import LoadingOverlay from "./chart/LoadingOverlay.svelte";
  import { ChartService } from "./chart/services/chartService";
  import { IndicatorService } from "./chart/services/indicatorService";
  import { DataService } from "./chart/services/dataService";
  import type { IndicatorState } from "./chart/types";

  // Props
  export let symbol = "BTCUSDT";
  export let interval = "1m";
  export let activeTimeframe = "1h";
  export let onTimeframeChange: ((timeframe: string) => void) | null = null;
  export let defaultOscillator: "MACD" | "RSI" = "MACD";

  // State
  let chartContainer: HTMLDivElement;
  let maximizedContainer: HTMLDivElement;
  let isMaximized = false;
  let isLoading = false;

  // Services
  let chartService: ChartService | null = null;
  let indicatorService: IndicatorService | null = null;
  let dataService: DataService | null = null;

  // Chart State
  let lastCandle: CandlestickData | null = null;
  let chartDataState: {
    candlestickData: CandlestickData[];
    logicalRange: LogicalRange | null;
  } | null = null;

  // Indicators State
  let indicators: IndicatorState = {
    showSMA: false,
    showEMA: false,
    showBollinger: false,
    showMACD: defaultOscillator === "MACD",
    showRSI: defaultOscillator === "RSI",
  };

  const timeframes = [
    { id: "5m", label: "5m" },
    { id: "15m", label: "15m" },
    { id: "1h", label: "1h" },
    { id: "4h", label: "4h" },
    { id: "1d", label: "1d" },
    { id: "1w", label: "1w" },
  ];

  function handleNewCandle(candle: CandlestickData) {
    if (chartService) {
      const candleSeries = chartService.getCandleSeries();
      if (candleSeries) {
        candleSeries.update(candle);
      }
    }
    lastCandle = candle;
  }

  function handleConnectionStatus(connected: boolean) {
    // Optional: handle connection status UI
  }

  async function init() {
    isLoading = true;
    const container = isMaximized ? maximizedContainer : chartContainer;
    if (!container) return;

    // Initialize Services
    chartService = new ChartService(
      container,
      isMaximized,
      (chart, candleSeries) => {
        indicatorService = new IndicatorService(chart);
      },
    );

    dataService = new DataService(handleNewCandle, handleConnectionStatus);

    // Load Data
    const data = await dataService.loadHistoricalData(symbol, interval);
    if (chartService && chartService.getCandleSeries()) {
      chartService.getCandleSeries()?.setData(data);
      if (data.length > 0) lastCandle = data[data.length - 1];
    }

    // Restore State if available
    if (chartDataState && chartService && chartService.getCandleSeries()) {
      chartService.getCandleSeries()?.setData(chartDataState.candlestickData);
      if (chartDataState.logicalRange) {
        chartService
          .getChart()
          ?.timeScale()
          .setVisibleLogicalRange(chartDataState.logicalRange);
      }
    } else {
      chartService?.setVisibleCandles(80);
    }

    // Update Indicators
    await updateIndicators();

    // Connect WebSocket
    dataService.connectWebSocket(symbol, interval);
    isLoading = false;
  }

  async function updateIndicators() {
    if (!indicatorService || !dataService) return;

    // We need raw klines for indicators
    const klines = await dataService.getRawKlines(symbol, interval);

    await indicatorService.updateIndicators(
      symbol,
      interval,
      klines,
      indicators.showSMA,
      indicators.showEMA,
      indicators.showBollinger,
      indicators.showMACD,
      indicators.showRSI,
    );
  }

  function toggleIndicator(indicator: keyof IndicatorState) {
    indicators[indicator] = !indicators[indicator];

    // Exclusive logic for MACD/RSI
    if (indicator === "showMACD" && indicators.showMACD)
      indicators.showRSI = false;
    if (indicator === "showRSI" && indicators.showRSI)
      indicators.showMACD = false;

    updateIndicators();
  }

  function saveState() {
    if (chartService && chartService.getCandleSeries()) {
      const seriesData = chartService.getCandleSeries()?.data();
      const logicalRange =
        chartService.getChart()?.timeScale().getVisibleLogicalRange() || null;

      chartDataState = {
        candlestickData: Array.isArray(seriesData)
          ? (seriesData as CandlestickData[])
          : [],
        logicalRange,
      };
    }
  }

  function toggleMaximize() {
    saveState();
    cleanup();
    isMaximized = !isMaximized;
    // Re-init will happen via reactive statement or we can call it manually after tick
    setTimeout(init, 0);
  }

  function cleanup() {
    dataService?.disconnectWebSocket();
    chartService?.destroy();
    indicatorService?.destroy();
    chartService = null;
    indicatorService = null;
    dataService = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape" && isMaximized) {
      toggleMaximize();
    }
  }

  // Reactive props change
  let previousSymbol = symbol;
  let previousInterval = interval;

  $: if (symbol !== previousSymbol || interval !== previousInterval) {
    previousSymbol = symbol;
    previousInterval = interval;
    cleanup();
    init();
  }

  // Theme observer
  onMount(() => {
    init();

    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          chartService?.updateColors();
        }
      });
    });

    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    window.addEventListener("keydown", handleKeydown);

    return () => {
      themeObserver.disconnect();
      window.removeEventListener("keydown", handleKeydown);
      cleanup();
    };
  });
</script>

<div class="w-full">
  <div class="flex justify-between items-center mb-2 flex-wrap gap-2">
    <ChartHeader {symbol} {interval} />

    <ChartControls
      {indicators}
      {isMaximized}
      onToggleIndicator={toggleIndicator}
      onMaximize={toggleMaximize}
    />
  </div>

  {#if !isMaximized}
    <div class="relative w-full h-[600px]">
      <div bind:this={chartContainer} class="w-full h-full rounded"></div>
      <LoadingOverlay {isLoading} />
    </div>
  {/if}
</div>

{#if isMaximized}
  <div
    class="maximized-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="maximized-chart-title"
    on:click|self={toggleMaximize}
    on:keydown|self={(e) => e.key === "Escape" && toggleMaximize()}
    tabindex="-1"
  >
    <div class="maximized-content">
      <div class="maximized-header">
        <ChartHeader {symbol} {interval} isMaximized={true} />

        <div class="flex items-center">
          <ChartControls
            {indicators}
            {isMaximized}
            onToggleIndicator={toggleIndicator}
            onMaximize={toggleMaximize}
            isMaximizedMode={true}
          />

          <div
            class="flex items-center gap-1.5 mx-1.5 border-l border-gray-300 dark:border-gray-600 pl-2"
          >
            <span class="text-xs font-medium text-gray-600 dark:text-gray-300"
              >TF:</span
            >
            <div class="flex gap-0.5">
              {#each timeframes as timeframe}
                <button
                  class="timeframe-btn-maximized {activeTimeframe ===
                  timeframe.id
                    ? 'active'
                    : ''}"
                  on:click={() =>
                    onTimeframeChange && onTimeframeChange(timeframe.id)}
                  title={`Alterar para timeframe ${timeframe.label}`}
                >
                  {timeframe.label}
                </button>
              {/each}
            </div>
          </div>

          <button
            class="close-btn ml-2"
            on:click={toggleMaximize}
            title="Fechar visualização maximizada (ESC)"
            aria-label="Fechar gráfico maximizado"
          >
            ✕
          </button>
        </div>
      </div>

      <div class="relative maximized-chart">
        <div
          bind:this={maximizedContainer}
          class="w-full h-full"
          role="img"
          aria-label={`Gráfico de candlestick para ${symbol} no intervalo ${interval}`}
        ></div>
        <LoadingOverlay {isLoading} />
      </div>
    </div>
  </div>
{/if}

<style>
  /* Overlay maximizado */
  .maximized-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(6px);
    padding: 2px;
  }

  .maximized-content {
    width: calc(100vw - 4px);
    height: calc(100vh - 4px);
    background: var(--color-surface-50, #f9fafb);
    border-radius: 4px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :global(.dark) .maximized-content {
    background: var(--color-surface-900, #111827);
  }

  .maximized-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 10px;
    background: var(--color-surface-100, #f3f4f6);
    border-bottom: 1px solid var(--color-surface-300, #d1d5db);
    min-height: 40px;
    flex-shrink: 0;
  }

  :global(.dark) .maximized-header {
    background: var(--color-surface-800, #1f2937);
    border-bottom-color: var(--color-surface-600, #4b5563);
  }

  .maximized-chart {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .close-btn {
    background: var(--color-error-500, #ef4444);
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .timeframe-btn-maximized {
    padding: 2px 6px;
    font-size: 0.7rem;
    font-weight: 500;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .timeframe-btn-maximized:hover {
    background: #e2e8f0;
    color: #334155;
  }

  .timeframe-btn-maximized.active {
    background: #3b82f6;
    color: white;
  }

  :global(.dark) .timeframe-btn-maximized {
    color: #94a3b8;
  }

  :global(.dark) .timeframe-btn-maximized:hover {
    background: #334155;
    color: #e2e8f0;
  }

  :global(.dark) .timeframe-btn-maximized.active {
    background: #2563eb;
    color: white;
  }
</style>
