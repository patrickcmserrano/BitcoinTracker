<script lang="ts">
  import { onMount } from "svelte";
  import { technicalAnalysisService } from "../lib/services/technicalAnalysisService";
  import {
    interpretRSI,
    interpretStochastic,
    interpretMACD,
    interpretATR,
    formatIndicatorValue,
    type TechnicalAnalysis,
  } from "../lib/technical-indicators";

  export let symbol: string = "BTCUSDT";
  export let interval: string = "1h";

  let indicators: TechnicalAnalysis | null = null;
  let loading = true;
  let error: string | null = null;
  let lastUpdate: Date | null = null;
  let currentPrice: number = 0;

  // Atualizar a cada 5 minutos
  const UPDATE_INTERVAL = 5 * 60 * 1000;

  async function fetchAndCalculateIndicators() {
    try {
      loading = true;
      error = null;

      const result = await technicalAnalysisService.analyze(symbol, interval);
      indicators = result.indicators;
      currentPrice = result.currentPrice;
      lastUpdate = new Date();

      console.log("Indicadores técnicos calculados:", indicators);
    } catch (e) {
      error = e instanceof Error ? e.message : "Erro ao calcular indicadores";
      console.error("Erro ao buscar/calcular indicadores:", e);
    } finally {
      loading = false;
    }
  }

  // Variáveis para rastrear mudanças
  let previousSymbol: string | null = null;
  let previousInterval: string | null = null;

  // Reativo: detecta mudança de símbolo ou intervalo
  $: if (
    (symbol && symbol !== previousSymbol) ||
    (interval && interval !== previousInterval)
  ) {
    console.log(
      `📊 TechnicalIndicators: Symbol/Interval changed - Symbol: ${previousSymbol} → ${symbol}, Interval: ${previousInterval} → ${interval}`,
    );

    const shouldReload = previousSymbol !== null || previousInterval !== null;
    previousSymbol = symbol;
    previousInterval = interval;

    if (shouldReload) {
      fetchAndCalculateIndicators();
    }
  }

  onMount(() => {
    fetchAndCalculateIndicators();
    const interval_id = setInterval(
      fetchAndCalculateIndicators,
      UPDATE_INTERVAL,
    );
    return () => clearInterval(interval_id);
  });

  function getTrendIcon(trend: string): string {
    const icons: Record<string, string> = {
      bullish: "📈",
      bearish: "📉",
      neutral: "↔️",
    };
    return icons[trend] || "❓";
  }

  function getTrendColor(trend: string): string {
    const colors: Record<string, string> = {
      bullish: "text-green-700 dark:text-green-400",
      bearish: "text-red-700 dark:text-red-400",
      neutral: "text-yellow-700 dark:text-yellow-400",
    };
    return colors[trend] || "text-gray-700";
  }

  function formatTimeSinceUpdate(): string {
    if (!lastUpdate) return "";
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `Há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Há ${minutes}min`;
  }
</script>

<div class="technical-indicators-container">
  <div class="header">
    <h2 class="title">📊 Indicadores Técnicos</h2>
    <span class="interval-badge">{interval.toUpperCase()}</span>
    {#if lastUpdate}
      <span class="last-update">{formatTimeSinceUpdate()}</span>
    {/if}
    <button
      on:click={fetchAndCalculateIndicators}
      disabled={loading}
      class="refresh-button"
      title="Recalcular indicadores"
    >
      <span class="refresh-icon" class:spinning={loading}>↻</span>
    </button>
  </div>

  <div class="data-source-banner">
    <span class="source-icon">🔗</span>
    <span class="source-text"
      >Dados: Binance API (gratuita) | Cálculos: Biblioteca local
      technicalindicators</span
    >
  </div>

  {#if loading && !indicators}
    <div class="loading">
      <div class="spinner"></div>
      <p>Calculando indicadores...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>⚠️ {error}</p>
      <button on:click={fetchAndCalculateIndicators} class="retry-button"
        >Tentar novamente</button
      >
    </div>
  {:else if indicators}
    <!-- Tendência Geral -->
    <div class="trend-card">
      <div class="trend-content">
        <span class="trend-icon">{getTrendIcon(indicators.trend)}</span>
        <div class="trend-info">
          <h3 class="trend-title">Tendência Geral</h3>
          <span class="trend-value {getTrendColor(indicators.trend)}">
            {indicators.trend === "bullish"
              ? "Alta"
              : indicators.trend === "bearish"
                ? "Baixa"
                : "Neutra"}
          </span>
        </div>
      </div>
    </div>

    <div class="indicators-grid">
      <!-- RSI -->
      <div class="indicator-card">
        <div class="indicator-header">
          <h3 class="indicator-title">RSI (14)</h3>
          <span class="indicator-badge">{interpretRSI(indicators.rsi)}</span>
        </div>
        <div class="indicator-value">
          {formatIndicatorValue(indicators.rsi)}
        </div>
        <div class="progress-bar">
          <div
            class="progress-fill rsi"
            style="width: {indicators.rsi || 0}%"
          ></div>
          <div class="progress-markers">
            <span class="marker" style="left: 30%"></span>
            <span class="marker" style="left: 70%"></span>
          </div>
        </div>
        <div class="indicator-hint">
          <span class="hint-text">&lt;30 Sobrevendido</span>
          <span class="hint-text">&gt;70 Sobrecomprado</span>
        </div>
      </div>

      <!-- ATR -->
      <div class="indicator-card">
        <div class="indicator-header">
          <h3 class="indicator-title">ATR (14)</h3>
          <span class="indicator-badge"
            >{interpretATR(indicators.atr, currentPrice)}</span
          >
        </div>
        <div class="indicator-value">
          {formatIndicatorValue(indicators.atr)}
        </div>
        {#if indicators.atr && currentPrice}
          <div class="atr-percent">
            {formatIndicatorValue((indicators.atr / currentPrice) * 100, 2)}% do
            preço
          </div>
          <div class="indicator-hint">
            <span class="hint-text">Volatilidade média do ativo</span>
          </div>
        {:else}
          <div class="no-data">Dados insuficientes</div>
        {/if}
      </div>

      <!-- MACD -->
      <div class="indicator-card">
        <div class="indicator-header">
          <h3 class="indicator-title">MACD (12,26,9)</h3>
          <span class="indicator-badge">{interpretMACD(indicators.macd)}</span>
        </div>
        {#if indicators.macd}
          <div class="macd-values">
            <div class="macd-row">
              <span>MACD:</span>
              <span class="value"
                >{formatIndicatorValue(indicators.macd.MACD, 4)}</span
              >
            </div>
            <div class="macd-row">
              <span>Signal:</span>
              <span class="value"
                >{formatIndicatorValue(indicators.macd.signal, 4)}</span
              >
            </div>
            <div class="macd-row">
              <span>Histogram:</span>
              <span
                class="value {indicators.macd.histogram >= 0
                  ? 'positive'
                  : 'negative'}"
              >
                {formatIndicatorValue(indicators.macd.histogram, 4)}
              </span>
            </div>
          </div>
        {:else}
          <div class="no-data">Dados insuficientes</div>
        {/if}
      </div>

      <!-- Stochastic -->
      <div class="indicator-card">
        <div class="indicator-header">
          <h3 class="indicator-title">Estocástico (14,3)</h3>
          <span class="indicator-badge"
            >{interpretStochastic(indicators.stochastic)}</span
          >
        </div>
        {#if indicators.stochastic}
          <div class="stoch-values">
            <div class="stoch-row">
              <span>%K:</span>
              <span class="value"
                >{formatIndicatorValue(indicators.stochastic.k)}</span
              >
            </div>
            <div class="stoch-row">
              <span>%D:</span>
              <span class="value"
                >{formatIndicatorValue(indicators.stochastic.d)}</span
              >
            </div>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill stoch-k"
              style="width: {indicators.stochastic.k}%"
            ></div>
            <div class="progress-markers">
              <span class="marker" style="left: 20%"></span>
              <span class="marker" style="left: 80%"></span>
            </div>
          </div>
        {:else}
          <div class="no-data">Dados insuficientes</div>
        {/if}
      </div>

      <!-- Médias Móveis -->
      <div class="indicator-card ma-card">
        <div class="indicator-header">
          <h3 class="indicator-title">Médias Móveis</h3>
        </div>
        <div class="ma-values">
          <div class="ma-row">
            <span class="ma-label">SMA 20:</span>
            <span class="ma-value"
              >${formatIndicatorValue(indicators.sma20)}</span
            >
          </div>
          <div class="ma-row">
            <span class="ma-label">SMA 50:</span>
            <span class="ma-value"
              >${formatIndicatorValue(indicators.sma50)}</span
            >
          </div>
          <div class="ma-row">
            <span class="ma-label">EMA 9:</span>
            <span class="ma-value"
              >${formatIndicatorValue(indicators.ema9)}</span
            >
          </div>
          <div class="ma-row">
            <span class="ma-label">EMA 21:</span>
            <span class="ma-value"
              >${formatIndicatorValue(indicators.ema21)}</span
            >
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .technical-indicators-container {
    background: transparent;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: none;
    border: none;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }

  .data-source-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    padding: 8px 16px;
    border-radius: 8px;
    margin-bottom: 16px;
    font-size: 0.75rem;
    color: var(--color-surface-700);
    border: 1px solid var(--color-surface-300);
  }

  :global(.dark) .data-source-banner {
    background: transparent;
    color: var(--color-surface-300);
    border-color: var(--color-surface-600);
  }

  .source-icon {
    font-size: 1rem;
  }

  .source-text {
    font-style: italic;
    font-weight: 500;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-surface-900);
    margin: 0;
    flex: 1;
  }

  :global(.dark) .title {
    color: #ffffff;
  }

  .interval-badge {
    background: var(--color-primary-100);
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary-700);
    border: 1px solid var(--color-primary-300);
  }

  :global(.dark) .interval-badge {
    background: var(--color-primary-900);
    color: var(--color-primary-200);
    border-color: var(--color-primary-700);
  }

  .last-update {
    font-size: 0.75rem;
    color: var(--color-surface-700);
  }

  :global(.dark) .last-update {
    color: var(--color-surface-300);
  }

  .refresh-button {
    background: transparent;
    border: 1px solid var(--color-surface-400);
    border-radius: 8px;
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  :global(.dark) .refresh-button {
    border-color: var(--color-surface-500);
  }

  .refresh-button:hover:not(:disabled) {
    background: var(--color-surface-200);
    border-color: var(--color-surface-500);
    transform: scale(1.05);
  }

  :global(.dark) .refresh-button:hover:not(:disabled) {
    background: var(--color-surface-800);
    border-color: var(--color-surface-500);
  }

  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .refresh-icon {
    font-size: 1.2rem;
    color: var(--color-surface-700);
    display: inline-block;
  }

  :global(.dark) .refresh-icon {
    color: var(--color-surface-200);
  }

  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .loading,
  .error {
    text-align: center;
    padding: 40px;
    color: var(--color-surface-700);
  }

  :global(.dark) .loading,
  :global(.dark) .error {
    color: var(--color-surface-200);
  }

  .spinner {
    width: 40px;
    height: 40px;
    margin: 0 auto 16px;
    border: 4px solid var(--color-surface-300);
    border-top-color: var(--color-primary-500);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  :global(.dark) .spinner {
    border-color: var(--color-surface-600);
    border-top-color: var(--color-primary-400);
  }

  .retry-button {
    margin-top: 16px;
    padding: 10px 20px;
    background: var(--color-primary-500);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }

  .retry-button:hover {
    transform: scale(1.05);
    background: var(--color-primary-600);
  }

  .trend-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .trend-card {
    background: #1f2937;
  }

  .trend-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .trend-icon {
    font-size: 3rem;
  }

  .trend-title {
    font-size: 0.875rem;
    color: #4b5563;
    margin: 0 0 4px 0;
  }

  .trend-value {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .indicators-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
  }

  .indicator-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .indicator-card {
    background: #1f2937;
  }

  .indicator-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .indicator-title {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin: 0;
  }

  :global(.dark) .indicator-title {
    color: #ffffff;
  }

  .indicator-badge {
    font-size: 0.75rem;
    padding: 4px 8px;
    border-radius: 8px;
    background: #e5e7eb;
    color: #374151;
    font-weight: 600;
  }

  :global(.dark) .indicator-badge {
    background: #374151;
    color: #f9fafb;
  }

  .indicator-value {
    font-size: 2rem;
    font-weight: 700;
    color: #667eea;
    margin-bottom: 12px;
  }

  .progress-bar {
    position: relative;
    width: 100%;
    height: 12px;
    background: #e5e7eb;
    border-radius: 6px;
    overflow: hidden;
    margin-bottom: 8px;
  }

  :global(.dark) .progress-bar {
    background: #374151;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.5s ease;
    border-radius: 6px;
  }

  .progress-fill.rsi {
    background: linear-gradient(90deg, #ef4444 0%, #eab308 50%, #22c55e 100%);
  }

  .progress-fill.stoch-k {
    background: #667eea;
  }

  .progress-markers {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .marker {
    position: absolute;
    top: 0;
    width: 2px;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
  }

  .indicator-hint {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #4b5563;
  }

  .atr-percent {
    font-size: 0.875rem;
    color: #667eea;
    font-weight: 600;
    margin-top: 8px;
    text-align: center;
  }

  :global(.dark) .atr-percent {
    color: #818cf8;
  }

  .macd-values,
  .stoch-values,
  .ma-values {
    font-size: 0.875rem;
  }

  .macd-row,
  .stoch-row,
  .ma-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    border-bottom: 1px solid #e5e7eb;
  }

  :global(.dark) .macd-row,
  :global(.dark) .stoch-row,
  :global(.dark) .ma-row {
    border-bottom-color: #374151;
  }

  .macd-row:last-child,
  .stoch-row:last-child,
  .ma-row:last-child {
    border-bottom: none;
  }

  .value {
    font-weight: 600;
    color: #374151;
  }

  :global(.dark) .value {
    color: #ffffff;
  }

  .value.positive {
    color: #22c55e;
  }

  .value.negative {
    color: #b91c1c;
  }

  .ma-value {
    font-weight: 600;
    color: #667eea;
  }

  .no-data {
    text-align: center;
    padding: 20px;
    color: #9ca3af;
    font-style: italic;
  }
</style>
