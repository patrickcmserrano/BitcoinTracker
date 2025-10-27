<script lang="ts">
  import './styles/global.css';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import LanguageSelector from './components/LanguageSelector.svelte';
  import CryptoSelector from './components/CryptoSelector.svelte';  import CryptoTracker from './components/CryptoTracker.svelte';
  import MarketIndicators from './components/MarketIndicators.svelte';
  import TechnicalIndicators from './components/TechnicalIndicators.svelte';
  import ApiStatusWidget from './components/ApiStatusWidget.svelte';
  import BinanceFuturesWidget from './components/BinanceFuturesWidget.svelte';
  import TripleScreenAnalysis from './components/TripleScreenAnalysis.svelte';
  // import TaapiIndicators from './components/TaapiIndicators.svelte'; // Removido temporariamente
  import { _ } from './lib/i18n';
  import { setupI18n } from './lib/i18n';
  import { onMount } from 'svelte';  import { selectedCrypto, currentCryptoData, isCurrentCryptoLoading } from './lib/crypto-store';
  import type { CryptoData } from './lib/crypto-config';
  import { initCryptoIcons } from './lib/crypto-icons';
  
  setupI18n();
  
  // Sistema de navegação por abas
  type PageView = 'dashboard' | 'triplescreen';
  let currentView: PageView = 'dashboard';
  
  // Estado para controlar timeframe para indicadores técnicos
  let currentTimeframe = '1h';
  
  // Estados compartilhados derivados das stores
  let cryptoTrackerRef: CryptoTracker;
  let currentData: CryptoData | null = null;
  let loading = false;
  
  // Reativo: atualiza quando os dados da store mudam
  $: currentData = $currentCryptoData;
  $: loading = $isCurrentCryptoLoading;
  
  onMount(async () => {
    // Verificar e sincronizar o tema ao montar o componente principal
    const storedMode = localStorage.getItem('mode') || 'light';
    document.documentElement.setAttribute('data-mode', storedMode);
    
    // Também definir a classe para compatibilidade com variantes de Tailwind
    if (storedMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Initialize crypto icons from official sources
    await initCryptoIcons();
  });
</script>

<div class="min-h-screen w-full" style="background-color: var(--app-background); color: var(--app-text);">
  <main class="min-h-screen px-3 py-2 container mx-auto flex flex-col max-w-7xl">
    <!-- Header compacto -->
    <div class="flex justify-between items-center mb-3">
      <div class="language-selector">
        <LanguageSelector />
      </div>
      
      <div class="theme-toggle-container">
        <ThemeToggle />
      </div>  
    </div>
    
    <!-- Navegação por Tabs -->
    <div class="tabs-container">
      <button 
        class="tab-button"
        class:active={currentView === 'dashboard'}
        on:click={() => currentView = 'dashboard'}
      >
        📊 Dashboard
      </button>
      <button 
        class="tab-button"
        class:active={currentView === 'triplescreen'}
        on:click={() => currentView = 'triplescreen'}
      >
        🎯 Triple Screen LOTUS
      </button>
    </div>
    
    <!-- Conteúdo baseado na view ativa -->
    {#if currentView === 'dashboard'}
      <!-- Conteúdo principal com altura responsiva -->
      <div class="content-container flex-grow space-y-3 flex flex-col">
        <!-- Seletor de Criptomoedas compacto -->
        <div class="flex-shrink-0">
          <CryptoSelector />
        </div>
        
        <!-- Tracker da Criptomoeda Selecionada - área principal flexível -->
        <div class="flex-grow">
          <CryptoTracker 
            bind:this={cryptoTrackerRef}
            config={$selectedCrypto}
            bind:data={currentData}
            bind:loading={loading}
            bind:activeTimeframe={currentTimeframe}
          />
        </div>
        
        <!-- Indicadores de Mercado (Fear & Greed, BTC Dominance, etc) - Abaixo do gráfico -->
        <div class="flex-shrink-0">
          <MarketIndicators />
        </div>
        
        <!-- Dados de Futures da Binance (Funding Rate, Open Interest, LSR) -->
        <div class="flex-shrink-0">
          <BinanceFuturesWidget 
            symbol={$selectedCrypto.binanceSymbol}
            updateInterval={60000}
          />
        </div>
        
        <!-- Indicadores Técnicos (MACD, RSI, Stochastic, MAs) -->
        <div class="flex-shrink-0">
          <TechnicalIndicators 
            symbol={$selectedCrypto.binanceSymbol}
            interval={currentTimeframe}
          />
        </div>
        
        <!-- Status das APIs (Health Check) -->
        <div class="flex-shrink-0">
          <ApiStatusWidget />
        </div>
      </div>
    {:else if currentView === 'triplescreen'}
      <!-- Página de Análise Triple Screen -->
      <div class="content-container flex-grow">
        <TripleScreenAnalysis />
      </div>
    {/if}
    
    <!-- Footer compacto -->
    <footer class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center flex-shrink-0">
      <p class="text-xs text-gray-600 dark:text-gray-400">{$_('footer.copyright')}</p>
    </footer>
  </main>
</div>

<style>
  .tabs-container {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.5rem;
    background: var(--color-surface-100);
    border-radius: 12px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .tabs-container {
    background: var(--color-surface-800);
  }

  .tab-button {
    flex: 1;
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    background: transparent;
    color: var(--color-surface-600);
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  :global(.dark) .tab-button {
    color: var(--color-surface-400);
  }

  .tab-button:hover:not(.active) {
    background: var(--color-surface-200);
    color: var(--color-surface-700);
  }

  :global(.dark) .tab-button:hover:not(.active) {
    background: var(--color-surface-700);
    color: var(--color-surface-300);
  }

  .tab-button.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: #667eea;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  :global(.dark) .tab-button.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-color: #764ba2;
  }

  @media (max-width: 640px) {
    .tab-button {
      font-size: 0.85rem;
      padding: 0.6rem 1rem;
    }
  }
</style>
