<script lang="ts">
  import { onMount } from 'svelte';
  import {
    getMarketIndicators,
    getFearGreedEmoji,
    formatLargeNumber,
    type MarketIndicators
  } from '../lib/market-indicators';

  let indicators: MarketIndicators | null = null;
  let loading = true;
  let error: string | null = null;
  let lastUpdate: Date | null = null;

  // Atualizar a cada 5 minutos
  const UPDATE_INTERVAL = 5 * 60 * 1000;

  async function fetchIndicators() {
    try {
      loading = true;
      error = null;
      indicators = await getMarketIndicators();
      lastUpdate = new Date();
      console.log('Indicadores de mercado atualizados:', indicators);
    } catch (e) {
      error = e instanceof Error ? e.message : 'Erro ao buscar indicadores';
      console.error('Erro ao buscar indicadores de mercado:', e);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchIndicators();
    const interval = setInterval(fetchIndicators, UPDATE_INTERVAL);
    return () => clearInterval(interval);
  });

  function getColorClass(value: number, type: 'fear-greed' | 'dominance'): string {
    if (type === 'fear-greed') {
      if (value <= 25) return 'text-red-600 dark:text-red-400';
      if (value <= 45) return 'text-orange-600 dark:text-orange-400';
      if (value <= 55) return 'text-yellow-600 dark:text-yellow-400';
      if (value <= 75) return 'text-green-600 dark:text-green-400';
      return 'text-emerald-600 dark:text-emerald-400';
    }
    
    // Dominance: vermelho se baixo (<40%), verde se alto (>50%)
    if (value < 40) return 'text-red-600 dark:text-red-400';
    if (value > 50) return 'text-green-600 dark:text-green-400';
    return 'text-yellow-600 dark:text-yellow-400';
  }

  function formatTimeSinceUpdate(): string {
    if (!lastUpdate) return '';
    const seconds = Math.floor((Date.now() - lastUpdate.getTime()) / 1000);
    if (seconds < 60) return `Há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Há ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `Há ${hours}h`;
  }

  function formatChange(change: number | undefined, isPercentage: boolean = false): string {
    if (change === undefined || change === null) return '';
    const prefix = change >= 0 ? '+' : '';
    const suffix = isPercentage ? '%' : '';
    return `${prefix}${change.toFixed(2)}${suffix}`;
  }

  function getChangeClass(change: number | undefined): string {
    if (change === undefined || change === null) return '';
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  }

  function getChangeIcon(change: number | undefined): string {
    if (change === undefined || change === null) return '';
    if (change > 0) return '↑';
    if (change < 0) return '↓';
    return '→';
  }
</script>

<div class="market-indicators-container">
  <div class="header">
    <h2 class="title">📊 Indicadores de Mercado</h2>
    {#if lastUpdate}
      <span class="last-update">{formatTimeSinceUpdate()}</span>
    {/if}
    <button 
      on:click={fetchIndicators} 
      disabled={loading}
      class="refresh-button"
      title="Atualizar indicadores"
    >
      <span class="refresh-icon" class:spinning={loading}>↻</span>
    </button>
  </div>

  {#if loading && !indicators}
    <div class="loading">
      <div class="spinner"></div>
      <p>Carregando indicadores...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>⚠️ {error}</p>
      <button on:click={fetchIndicators} class="retry-button">Tentar novamente</button>
    </div>
  {:else if indicators}
    <div class="indicators-grid">
      <!-- Fear & Greed Index -->
      <div class="indicator-card fear-greed">
        <div class="indicator-header">
          <span class="indicator-icon">{getFearGreedEmoji(indicators.fearGreed.valueClassification)}</span>
          <h3 class="indicator-title">Fear & Greed Index</h3>
        </div>
        <div class="indicator-value {getColorClass(indicators.fearGreed.value, 'fear-greed')}">
          {indicators.fearGreed.value}
        </div>
        <div class="indicator-label">
          {indicators.fearGreed.valueClassification}
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill"
            style="width: {indicators.fearGreed.value}%; background: {getProgressColor(indicators.fearGreed.value)}"
          ></div>
        </div>
        {#if indicators.fearGreed.change !== undefined}
          <div class="change-indicator {getChangeClass(indicators.fearGreed.change)}">
            <span class="change-icon">{getChangeIcon(indicators.fearGreed.change)}</span>
            <span class="change-value">
              {formatChange(indicators.fearGreed.change)} ({formatChange(indicators.fearGreed.changePercentage, true)})
            </span>
            <span class="change-label">vs dia anterior</span>
          </div>
        {:else}
          <div class="change-placeholder"></div>
        {/if}
        <div class="indicator-meta">
          <div class="meta-description">Sentimento do mercado crypto</div>
        </div>
        <div class="data-source">
          <span class="source-icon">🔗</span>
          <span class="source-text">Fonte: Alternative.me (API Gratuita)</span>
        </div>
      </div>

      <!-- BTC Dominance -->
      <div class="indicator-card btc-dominance">
        <div class="indicator-header">
          <span class="indicator-icon">₿</span>
          <h3 class="indicator-title">BTC Dominance</h3>
        </div>
        <div class="indicator-value {getColorClass(indicators.btcDominance.btcDominance, 'dominance')}">
          {indicators.btcDominance.btcDominance.toFixed(2)}%
        </div>
        <div class="indicator-label">
          Market Share
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill"
            style="width: {indicators.btcDominance.btcDominance}%; background: linear-gradient(90deg, #f59e0b 0%, #10b981 100%)"
          ></div>
        </div>
        {#if indicators.btcDominance.btcDominanceChange !== undefined}
          <div class="change-indicator {getChangeClass(indicators.btcDominance.btcDominanceChange)}">
            <span class="change-icon">{getChangeIcon(indicators.btcDominance.btcDominanceChange)}</span>
            <span class="change-value">
              {formatChange(indicators.btcDominance.btcDominanceChange, true)}
            </span>
            <span class="change-label">vs dia anterior</span>
          </div>
        {:else}
          <div class="change-placeholder"></div>
        {/if}
        <div class="indicator-meta">
          <div class="meta-row">
            <span>ETH Dominance:</span>
            <span class="meta-value">{indicators.btcDominance.ethDominance.toFixed(2)}%</span>
          </div>
        </div>
        <div class="data-source">
          <span class="source-icon">🔗</span>
          <span class="source-text">Fonte: CoinGecko (API Gratuita)</span>
        </div>
      </div>

      <!-- Market Cap Total -->
      <div class="indicator-card market-cap">
        <div class="indicator-header">
          <span class="indicator-icon">💰</span>
          <h3 class="indicator-title">Market Cap Total</h3>
        </div>
        <div class="indicator-value text-blue-600 dark:text-blue-400">
          {formatLargeNumber(indicators.btcDominance.totalMarketCap)}
        </div>
        <div class="indicator-label">
          Capitalização Global
        </div>
        <div class="progress-bar">
          <div 
            class="progress-fill"
            style="width: 100%; background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%)"
          ></div>
        </div>
        {#if indicators.btcDominance.marketCapChange24h !== undefined}
          <div class="change-indicator {getChangeClass(indicators.btcDominance.marketCapChange24h)}">
            <span class="change-icon">{getChangeIcon(indicators.btcDominance.marketCapChange24h)}</span>
            <span class="change-value">
              {formatChange(indicators.btcDominance.marketCapChange24h, true)}
            </span>
            <span class="change-label">últimas 24h</span>
          </div>
        {:else}
          <div class="change-placeholder"></div>
        {/if}
        <div class="indicator-meta">
          <div class="meta-row">
            <span>Volume 24h:</span>
            <span class="meta-value">{formatLargeNumber(indicators.btcDominance.total24hVolume)}</span>
          </div>
          <div class="meta-row">
            <span>Cryptos Ativas:</span>
            <span class="meta-value">{indicators.btcDominance.activeCryptocurrencies.toLocaleString()}</span>
          </div>
        </div>
        <div class="data-source">
          <span class="source-icon">🔗</span>
          <span class="source-text">Fonte: CoinGecko (API Gratuita)</span>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .market-indicators-container {
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
    margin-bottom: 20px;
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

  .last-update {
    font-size: 0.75rem;
    color: var(--color-surface-600);
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
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .loading, .error {
    text-align: center;
    padding: 40px;
    color: var(--color-surface-600);
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

  .indicators-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }

  .indicator-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    display: flex;
    flex-direction: column;
    min-height: 420px; /* Altura mínima para alinhamento */
  }

  .indicator-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  }

  .indicator-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .indicator-icon {
    font-size: 2rem;
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

  :global(.dark) .indicator-card {
    background: #1f2937;
  }

  .indicator-value {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .indicator-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    margin-bottom: 12px;
  }

  :global(.dark) .indicator-label {
    color: #d1d5db;
  }

  .change-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.875rem;
    font-weight: 600;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    border-left: 3px solid currentColor;
  }

  :global(.dark) .change-indicator {
    background: rgba(255, 255, 255, 0.05);
  }

  .change-icon {
    font-size: 1.2rem;
    font-weight: bold;
  }

  .change-value {
    font-weight: 700;
  }

  .change-label {
    font-size: 0.75rem;
    font-weight: 400;
    opacity: 0.8;
    margin-left: auto;
  }

  .change-placeholder {
    height: 48px; /* Mesma altura do change-indicator */
    margin-bottom: 12px;
  }

  .meta-description {
    line-height: 1.5;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 12px;
  }

  :global(.dark) .progress-bar {
    background: #374151;
  }

  .progress-fill {
    height: 100%;
    transition: width 0.5s ease;
    border-radius: 4px;
  }

  .indicator-meta {
    font-size: 0.75rem;
    color: #6b7280;
    flex-grow: 1; /* Empurra o data-source para o final */
    min-height: 40px; /* Altura mínima para consistência */
  }

  :global(.dark) .indicator-meta {
    color: #d1d5db;
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .meta-value {
    font-weight: 600;
    color: #374151;
  }

  :global(.dark) .meta-value {
    color: #ffffff;
  }
  
  .data-source {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: auto; /* Sempre no final do card */
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 0.7rem;
    color: #6b7280;
  }
  
  :global(.dark) .data-source {
    border-top-color: #374151;
    color: #d1d5db;
  }
  
  .source-icon {
    font-size: 0.875rem;
  }
  
  .source-text {
    font-style: italic;
  }
</style>

<script context="module" lang="ts">
  function getProgressColor(value: number): string {
    if (value <= 25) return '#dc2626'; // red
    if (value <= 45) return '#ea580c'; // orange
    if (value <= 55) return '#ca8a04'; // yellow
    if (value <= 75) return '#16a34a'; // green
    return '#059669'; // emerald
  }
</script>
