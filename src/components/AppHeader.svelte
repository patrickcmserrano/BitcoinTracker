<script lang="ts">
  import type { CryptoConfig, CryptoData } from "../lib/crypto-config";
  import PriceDisplay from "./AppHeader/PriceDisplay.svelte";
  import TimeframeSelector from "./AppHeader/TimeframeSelector.svelte";
  import NavigationTabs from "./AppHeader/NavigationTabs.svelte";
  import SettingsBar from "./AppHeader/SettingsBar.svelte";

  // Props
  export let selectedCrypto: CryptoConfig;
  export let cryptoData: CryptoData | null = null;
  export let activeTimeframe: string = "1h";
  export let currentView: "dashboard" | "triplescreen" = "dashboard";
  export let isFullHD: boolean = false;
  export let loading: boolean = false;
  export let onTimeframeChange: (timeframe: string) => void = () => {};
  export let onViewChange: (
    view: "dashboard" | "triplescreen",
  ) => void = () => {};

  // Estado para animação de atualização
  let updating = false;

  // Debug: Log quando os dados chegam no AppHeader
  $: console.log("🎯 AppHeader - Dados recebidos:", {
    crypto: selectedCrypto.symbol,
    hasData: !!cryptoData,
    price: cryptoData?.price,
    loading,
  });

  // Reativo: detecta mudanças nos dados para animação
  $: if (cryptoData) {
    updating = true;
    setTimeout(() => (updating = false), 300);
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
      <NavigationTabs {currentView} {onViewChange} />
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
      <a
        href="https://github.com/patrickcmserrano/BitcoinTracker"
        target="_blank"
        rel="noopener noreferrer"
        class="github-link"
        aria-label="View on GitHub"
        title="View on GitHub"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
          />
        </svg>
      </a>
    </div>
  </div>
</header>

<style>
  .github-link {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-color-secondary);
    transition: color 0.2s ease;
  }

  .github-link:hover {
    color: var(--crypto-color);
  }

  .github-link svg {
    width: 24px;
    height: 24px;
  }

  .app-header {
    position: sticky;
    top: 0;
    z-index: 999;
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
    margin-left: 90px;
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
    background: linear-gradient(
      90deg,
      transparent,
      var(--crypto-color),
      transparent
    );
    animation: progress-slide 1s ease-in-out infinite;
  }

  @keyframes progress-slide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
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

  /* Responsividade para Tablets - sem wrap até 1300px */
  @media (max-width: 1300px) {
    .app-header {
      padding: 0.625rem 0.75rem;
    }

    .header-row {
      flex-wrap: wrap;
      gap: 0.75rem;
      min-height: auto;
    }

    .left-section {
      flex: 0 1 auto;
      order: 0;
      min-width: 0;
    }

    .center-section {
      flex: 1 1 auto;
      order: 1;
      max-width: 100%;
      min-width: 0;
    }

    .right-section {
      flex: 0 1 auto;
      order: 2;
      gap: 0.5rem;
      justify-content: flex-end;
      min-width: 0;
    }
  }

  /* Responsividade para Mobile */
  @media (max-width: 768px) {
    .app-header {
      padding: 0.5rem 0.5rem;
      min-height: auto;
    }

    .header-row {
      flex-wrap: wrap;
      gap: 0.5rem;
      min-height: auto;
    }

    .left-section {
      flex: 0 1 auto;
      order: 0;
      min-width: 0;
    }

    .center-section {
      flex: 1 1 auto;
      order: 1;
      max-width: 100%;
      min-width: 0;
    }

    .right-section {
      flex: 0 1 auto;
      order: 2;
      justify-content: flex-end;
      gap: 0.5rem;
      min-width: 0;
    }

    .settings-wrapper {
      margin-left: 0;
    }
  }

  /* Largura mínima suportada: 400px */
  @media (max-width: 400px) {
    .app-header {
      padding: 0.375rem 0.5rem;
    }

    .header-row {
      gap: 0.5rem;
    }
  }
</style>
