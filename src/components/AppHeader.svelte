<script lang="ts">
  import type { CryptoConfig, CryptoData } from '../lib/crypto-config';
  import PriceDisplay from './AppHeader/PriceDisplay.svelte';
  import TimeframeSelector from './AppHeader/TimeframeSelector.svelte';
  import NavigationTabs from './AppHeader/NavigationTabs.svelte';
  import SettingsBar from './AppHeader/SettingsBar.svelte';
  
  // Props
  export let selectedCrypto: CryptoConfig;
  export let cryptoData: CryptoData | null = null;
  export let activeTimeframe: string = '1h';
  export let currentView: 'dashboard' | 'triplescreen' = 'dashboard';
  export let isFullHD: boolean = false;
  export let loading: boolean = false;
  export let onTimeframeChange: (timeframe: string) => void = () => {};
  export let onViewChange: (view: 'dashboard' | 'triplescreen') => void = () => {};

  // Estado para animação de atualização
  let updating = false;
  
  // Debug: Log quando os dados chegam no AppHeader
  $: console.log('🎯 AppHeader - Dados recebidos:', { 
    crypto: selectedCrypto.symbol,
    hasData: !!cryptoData, 
    price: cryptoData?.price,
    loading 
  });
  
  // Reativo: detecta mudanças nos dados para animação
  $: if (cryptoData) {
    updating = true;
    setTimeout(() => updating = false, 300);
  }
</script>

<header 
  class="app-header" 
  style="--crypto-color: {selectedCrypto.color}"
  class:fullhd={isFullHD}
>
  {#if updating}
    <div class="update-progress-bar">
      <div class="progress-animation"></div>
    </div>
  {/if}

  <!-- Barra única horizontal: Preço + Navegação + Timeframes + Settings -->
  <div class="header-row">
    <div class="left-section">
      <PriceDisplay 
        config={selectedCrypto} 
        data={cryptoData} 
        {activeTimeframe}
        {loading}
      />
    </div>

    <div class="center-section">
      <NavigationTabs 
        {currentView}
        {onViewChange}
      />
    </div>

    <div class="right-section">
      <TimeframeSelector 
        {activeTimeframe}
        disabled={loading}
        {onTimeframeChange}
      />
      <div class="settings-wrapper">
        <SettingsBar />
      </div>
    </div>
  </div>
</header>

<style>
  .app-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    background-color: var(--app-background);
    backdrop-filter: blur(10px);
    border-bottom: 3px solid var(--crypto-color);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    padding: 0.75rem 1rem;
  }

  :global(.dark) .app-header {
    background-color: var(--app-background);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  /* Ajuste para Full HD */
  .app-header.fullhd {
    left: 120px; /* Espaço para a barra lateral de criptos */
  }

  /* Barra de progresso de atualização */
  .update-progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: rgba(0, 0, 0, 0.1);
    overflow: hidden;
    z-index: 1;
  }

  .progress-animation {
    height: 100%;
    width: 30%;
    background: linear-gradient(90deg, 
      transparent, 
      var(--crypto-color), 
      transparent
    );
    animation: progress-slide 1s ease-in-out infinite;
  }

  @keyframes progress-slide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }

  /* Layout da barra horizontal única */
  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    min-height: 60px;
  }

  /* Seções da barra */
  .left-section {
    flex: 0 0 auto;
    min-width: fit-content;
    display: flex;
    align-items: center;
  }

  .center-section {
    flex: 1 1 auto;
    display: flex;
    justify-content: center;
    max-width: 600px;
    margin: 0 auto;
  }

  .right-section {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 1rem;
    min-width: fit-content;
  }

  .settings-wrapper {
    display: flex;
    align-items: center;
  }

  /* Responsividade para Tablets */
  @media (max-width: 1024px) {
    .app-header {
      padding: 0.625rem 0.75rem;
    }

    .header-row {
      gap: 1rem;
    }

    .center-section {
      max-width: 400px;
    }

    .right-section {
      gap: 0.75rem;
    }
  }

  /* Responsividade para Mobile */
  @media (max-width: 768px) {
    .app-header {
      padding: 0.5rem;
    }

    .header-row {
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .left-section {
      flex: 1 1 100%;
      order: 0;
    }

    .center-section {
      flex: 1 1 100%;
      order: 2;
      max-width: 100%;
    }

    .right-section {
      flex: 1 1 100%;
      order: 1;
      justify-content: space-between;
    }

    .settings-wrapper {
      margin-left: auto;
    }
  }

  @media (max-width: 480px) {
    .app-header {
      padding: 0.375rem 0.5rem;
    }

    .header-row {
      gap: 0.5rem;
    }
  }
</style>
