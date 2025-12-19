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
  import DrawingToolbar from "./chart/DrawingToolbar.svelte";
  import ExchangeSelector from "./ExchangeSelector.svelte";
  import { ChartService } from "./chart/services/chartService";
  import { IndicatorService } from "./chart/services/indicatorService";
  import { DataService } from "./chart/services/dataService";
  import type { IndicatorState, DrawingMode } from "./chart/types";
  import { selectedExchange } from "../lib/config/exchangeConfig";

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

  // Drawing State
  let drawingMode: DrawingMode = "NONE";
  let isDrawingActive = false; // Tracks if first point of line_ab is set

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
        // Safety check: ensure we don't update with older data
        if (
          lastCandle &&
          (candle.time as number) < (lastCandle.time as number)
        ) {
          return;
        }

        try {
          candleSeries.update(candle);
          chartService.getDrawingService()?.updateLastCandle(candle);
          lastCandle = candle;
        } catch (error) {
          console.error("Error updating chart:", error);
        }
      }
    }

    // Update indicators with new candle data
    updateIndicators();
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
    const data = await dataService.loadHistoricalData(
      symbol,
      interval,
      $selectedExchange,
    );
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
      // Adjust default zoom for longer timeframes to avoid "spaced out" look
      let defaultVisible = 80;
      if (interval === "1d") defaultVisible = 150;
      else if (interval === "1w") defaultVisible = 100;

      chartService?.setVisibleCandles(defaultVisible);
    }

    // Update Indicators
    await updateIndicators();

    // Enable Drawing (in both modes)
    if (chartService) {
      const drawingService = chartService.enableDrawing(symbol, interval);
      drawingService.setOnChangeCallback(() => {
        updateDrawingActiveState();
      });
      drawingService.setOnModeChangeCallback((mode) => {
        drawingMode = mode;
      });
      drawingService.updateData(data);
    }

    // Connect WebSocket
    dataService.connectWebSocket(symbol, interval, $selectedExchange);
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
    indicatorService?.destroy();
    chartService?.destroy();
    chartService = null;
    indicatorService = null;
    dataService = null;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      if (isMaximized) {
        toggleMaximize();
      } else if (drawingMode !== "NONE") {
        // Cancel active drawing
        handleDrawingModeChange("NONE");
      }
    } else if (event.key === "Delete" || event.key === "Backspace") {
      if (chartService) {
        chartService.getDrawingService()?.removeSelectedLine();
      }
    }
  }

  function handleDrawingModeChange(mode: DrawingMode) {
    drawingMode = mode;
    if (chartService) {
      const drawingService = chartService.getDrawingService();
      if (drawingService) {
        drawingService.setMode(mode);
        // Check if there's an active drawing in progress
        updateDrawingActiveState();
      }
    }
  }

  function updateDrawingActiveState() {
    if (chartService) {
      const drawingService = chartService.getDrawingService();
      if (drawingService) {
        isDrawingActive = drawingService.hasActiveDrawing();
      }
    }
  }

  function handleClearAllDrawings() {
    if (chartService) {
      const drawingService = chartService.getDrawingService();
      if (drawingService && confirm("Clear all drawings?")) {
        drawingService.clearAll();
      }
    }
  }

  // Reactive props change
  let previousSymbol = symbol;
  let previousInterval = interval;

  $: if (symbol !== previousSymbol || interval !== previousInterval) {
    previousSymbol = symbol;
    previousInterval = interval;

    // Update drawing service symbol/interval
    if (chartService) {
      chartService.updateDrawingSymbolInterval(symbol, interval);
    }

    cleanup();
    setTimeout(init, 0);
  }

  // React to exchange changes
  let previousExchange = $selectedExchange;
  $: if ($selectedExchange !== previousExchange) {
    previousExchange = $selectedExchange;
    cleanup();
    setTimeout(init, 0);
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
    <div class="flex items-center gap-2">
      <ChartHeader {symbol} {interval} />
      <ExchangeSelector />
    </div>

    <ChartControls
      {indicators}
      {isMaximized}
      onToggleIndicator={toggleIndicator}
      onMaximize={toggleMaximize}
    />
  </div>

  {#if !isMaximized}
    <!-- Drawing Toolbar -->
    <DrawingToolbar
      currentMode={drawingMode}
      {isDrawingActive}
      onModeChange={handleDrawingModeChange}
      onClearAll={handleClearAllDrawings}
    />

    <div class="relative w-full h-[720px]">
      <div bind:this={chartContainer} class="w-full h-full rounded"></div>
      <LoadingOverlay {isLoading} />
    </div>
  {/if}
</div>

{#if isMaximized}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="maximized-overlay"
    role="dialog"
    aria-modal="true"
    aria-labelledby="maximized-chart-title"
    onclick={(e) => e.target === e.currentTarget && toggleMaximize()}
    tabindex="-1"
  >
    <div class="maximized-content" role="group" tabindex="-1">
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
            class="flex items-center gap-1.5 mx-1.5 border-l border-gray-300 dark:border-gray-600 pl-2 timeframe-section"
          >
            <span
              class="text-xs font-medium text-gray-600 dark:text-gray-300 timeframe-label"
              >TF:</span
            >
            <div class="flex gap-0.5">
              {#each timeframes as timeframe}
                <button
                  class="timeframe-btn-maximized {activeTimeframe ===
                  timeframe.id
                    ? 'active'
                    : ''}"
                  onclick={() =>
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
            onclick={toggleMaximize}
            title="Fechar visualização maximizada (ESC)"
            aria-label="Fechar gráfico maximizado"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Drawing Toolbar (Maximized) -->
      <div
        class="px-2 py-1 bg-surface-100 dark:bg-surface-800 border-b border-surface-300 dark:border-surface-600"
      >
        <DrawingToolbar
          currentMode={drawingMode}
          {isDrawingActive}
          onModeChange={handleDrawingModeChange}
          onClearAll={handleClearAllDrawings}
        />
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
    z-index: 1100;
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
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  :global(.dark) .maximized-header {
    background: var(--color-surface-800, #1f2937);
    border-bottom-color: var(--color-surface-600, #4b5563);
  }

  /* Mobile responsive styles for maximized header */
  @media (max-width: 768px) {
    .maximized-header {
      padding: 6px 8px;
      gap: 0.25rem;
    }

    /* Ensure close button is always visible and accessible */
    .close-btn {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      font-size: 16px;
      margin-left: auto !important;
      order: 999; /* Ensure it appears last */
    }

    /* Make timeframe section more compact on mobile */
    .maximized-header > div:last-child {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      align-items: center;
    }
  }

  @media (max-width: 480px) {
    .maximized-header {
      padding: 4px 6px;
    }

    /* Even more compact on very small screens */
    .close-btn {
      width: 36px;
      height: 36px;
      font-size: 18px;
    }

    /* Hide TF label on very small screens to save space */
    .timeframe-label {
      display: none;
    }

    /* Reduce timeframe section spacing */
    .timeframe-section {
      margin-left: 0.25rem !important;
      margin-right: 0.25rem !important;
      padding-left: 0.25rem !important;
      gap: 0.25rem !important;
    }
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

  /* Mobile responsive styles for timeframe buttons */
  @media (max-width: 768px) {
    .timeframe-btn-maximized {
      padding: 3px 5px;
      font-size: 0.65rem;
      min-width: 32px;
    }
  }

  @media (max-width: 480px) {
    .timeframe-btn-maximized {
      padding: 4px 4px;
      font-size: 0.6rem;
      min-width: 28px;
    }
  }
</style>
