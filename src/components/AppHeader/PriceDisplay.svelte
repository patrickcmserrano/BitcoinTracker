<script lang="ts">
  import type { CryptoConfig, CryptoData } from '../../lib/crypto-config';
  import CryptoIcon from '../CryptoIcon.svelte';
  
  // Props
  export let config: CryptoConfig;
  export let data: CryptoData | null = null;
  export let activeTimeframe: string = '1h';
  export let loading: boolean = false;

  // Função para formatar números
  function formatNumber(num: number, decimals: number = 2): string {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  // Função para obter cor da variação percentual
  function getPercentChangeColor(change: number): string {
    if (change > 0) return 'text-green-700 dark:text-green-400';
    if (change < 0) return 'text-red-700 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  }

  // Função para obter dados do timeframe ativo
  function getTimeframeData(timeframe: string) {
    if (!data) {
      return null;
    }
    
    // Garantir que temos os dados necessários
    const safeData = {
      percentChange10m: data.percentChange10m ?? 0,
      volume10m: data.volume10m ?? 0,
      highPrice10m: data.highPrice10m ?? data.price,
      lowPrice10m: data.lowPrice10m ?? data.price,
      
      percentChange1h: data.percentChange1h ?? 0,
      volume1h: data.volume1h ?? 0,
      highPrice1h: data.highPrice1h ?? data.price,
      lowPrice1h: data.lowPrice1h ?? data.price,
      
      percentChange4h: data.percentChange4h ?? 0,
      volume4h: data.volume4h ?? 0,
      highPrice4h: data.highPrice4h ?? data.price,
      lowPrice4h: data.lowPrice4h ?? data.price,
      
      percentChange1d: data.percentChange1d ?? 0,
      volume1d: data.volume1d ?? 0,
      highPrice1d: data.highPrice1d ?? data.price,
      lowPrice1d: data.lowPrice1d ?? data.price,
      
      percentChange1w: data.percentChange1w ?? 0,
      volume1w: data.volume1w ?? 0,
      highPrice1w: data.highPrice1w ?? data.price,
      lowPrice1w: data.lowPrice1w ?? data.price,
    };
    
    switch (timeframe) {
      case '5m':
      case '15m':
      case '10m':
        return {
          percentChange: safeData.percentChange10m,
          volume: safeData.volume10m,
          highPrice: safeData.highPrice10m,
          lowPrice: safeData.lowPrice10m,
        };
      case '1h':
        return {
          percentChange: safeData.percentChange1h,
          volume: safeData.volume1h,
          highPrice: safeData.highPrice1h,
          lowPrice: safeData.lowPrice1h,
        };
      case '4h':
        return {
          percentChange: safeData.percentChange4h,
          volume: safeData.volume4h,
          highPrice: safeData.highPrice4h,
          lowPrice: safeData.lowPrice4h,
        };
      case '1d':
        return {
          percentChange: safeData.percentChange1d,
          volume: safeData.volume1d,
          highPrice: safeData.highPrice1d,
          lowPrice: safeData.lowPrice1d,
        };
      case '1w':
        return {
          percentChange: safeData.percentChange1w,
          volume: safeData.volume1w,
          highPrice: safeData.highPrice1w,
          lowPrice: safeData.lowPrice1w,
        };
      default:
        return {
          percentChange: data.percentChange ?? 0,
          volume: data.volume24h ?? 0,
          highPrice: data.price,
          lowPrice: data.price,
        };
    }
  }

  $: timeframeData = data ? getTimeframeData(activeTimeframe) : null;
</script>

<div class="price-display-container" style="--crypto-color: {config.color}">
  <!-- Logo e Nome da Cripto -->
  <div class="crypto-brand">
    <div class="crypto-icon-container">
      <CryptoIcon cryptoId={config.id} size="md" />
    </div>
    <span class="crypto-name">{config.symbol}</span>
  </div>
  
  <!-- Preço e Variação -->
  {#if data}
    <div class="price-info">
      <span class="price-value">${formatNumber(data.price)}</span>
      {#if timeframeData}
        <span class="price-change {getPercentChangeColor(timeframeData.percentChange)}">
          {timeframeData.percentChange >= 0 ? '▲' : '▼'}
          {formatNumber(Math.abs(timeframeData.percentChange))}%
        </span>
      {:else}
        <span class="price-change text-gray-500">
          ---%
        </span>
      {/if}
    </div>
  {:else if loading}
    <!-- Placeholder durante carregamento -->
    <div class="price-info">
      <div class="placeholder-shimmer price-placeholder"></div>
      <div class="placeholder-shimmer change-placeholder"></div>
    </div>
  {:else}
    <div class="price-info">
      <span class="price-value text-gray-400">--</span>
      <span class="price-change text-gray-400">--%</span>
    </div>
  {/if}
</div>

<style>
  .price-display-container {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 0;
  }

  .crypto-brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: fit-content;
  }

  .crypto-icon-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--crypto-color), color-mix(in srgb, var(--crypto-color) 80%, #000));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: transform 0.2s ease;
  }

  .crypto-icon-container:hover {
    transform: scale(1.05);
  }

  .crypto-name {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-surface-700);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .crypto-name {
    color: var(--color-surface-200);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .price-info {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    min-width: fit-content;
  }

  .price-value {
    font-size: 1.25rem;
    font-weight: 900;
    color: var(--app-text);
    letter-spacing: -0.5px;
  }

  .price-change {
    font-size: 0.875rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    background: rgba(0, 0, 0, 0.05);
  }

  :global(.dark) .price-change {
    background: rgba(255, 255, 255, 0.05);
  }

  /* Placeholders de carregamento */
  .placeholder-shimmer {
    background: linear-gradient(
      90deg,
      rgba(200, 200, 200, 0.2) 0%,
      rgba(200, 200, 200, 0.4) 50%,
      rgba(200, 200, 200, 0.2) 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }

  :global(.dark) .placeholder-shimmer {
    background: linear-gradient(
      90deg,
      rgba(255, 255, 255, 0.05) 0%,
      rgba(255, 255, 255, 0.15) 50%,
      rgba(255, 255, 255, 0.05) 100%
    );
    background-size: 200% 100%;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .price-placeholder {
    width: 120px;
    height: 28px;
  }

  .change-placeholder {
    width: 60px;
    height: 24px;
  }

  /* Responsividade */
  @media (max-width: 640px) {
    .price-display-container {
      gap: 0.5rem;
    }

    .crypto-icon-container {
      width: 28px;
      height: 28px;
    }

    .crypto-name {
      font-size: 0.875rem;
    }

    .price-value {
      font-size: 1rem;
    }

    .price-change {
      font-size: 0.75rem;
      padding: 0.2rem 0.4rem;
    }
  }
</style>
