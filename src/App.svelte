<script lang="ts">
  import './styles/global.css';
  import AppHeader from './components/AppHeader.svelte';
  import CryptoSelector from './components/CryptoSelector.svelte';  import CryptoTracker from './components/CryptoTracker.svelte';
  import MarketIndicators from './components/MarketIndicators.svelte';
  import TechnicalIndicators from './components/TechnicalIndicators.svelte';
  import ApiStatusWidget from './components/ApiStatusWidget.svelte';
  import TripleScreenAnalysis from './components/TripleScreenAnalysis.svelte';
  // import TaapiIndicators from './components/TaapiIndicators.svelte'; // Removido temporariamente
  import { _ } from './lib/i18n';
  import { setupI18n } from './lib/i18n';
  import { onMount, onDestroy } from 'svelte';  import { selectedCrypto, currentCryptoData, isCurrentCryptoLoading } from './lib/crypto-store';
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
  
  // Debug: Log quando os dados mudam
  $: if (currentData) {
    console.log('📊 App.svelte - Dados atualizados:', { 
      crypto: $selectedCrypto.symbol, 
      price: currentData.price,
      hasData: !!currentData 
    });
  }
  
  // Estado para detectar tela Full HD ou maior
  let isFullHD = false;
  
  // Handlers para o AppHeader
  function handleTimeframeChange(timeframe: string) {
    currentTimeframe = timeframe;
    // Propagar mudança para o CryptoTracker se necessário
    if (cryptoTrackerRef && cryptoTrackerRef.changeTimeframe) {
      cryptoTrackerRef.changeTimeframe(timeframe);
    }
  }
  
  function handleViewChange(view: 'dashboard' | 'triplescreen') {
    currentView = view;
  }
  
  // Função para verificar se a tela é Full HD ou maior (1920px+)
  // Usa screen.width para detectar a resolução real, não afetada por zoom
  function checkScreenSize() {
    // Usar screen.width (resolução real) ou innerWidth (viewport)
    // screen.width não é afetado por zoom do navegador
    const screenWidth = window.screen.width;
    const viewportWidth = window.innerWidth;
    
    // Considera Full HD se a tela física for >= 1920px
    // OU se o viewport for >= 1600px (para telas menores com zoom out)
    isFullHD = screenWidth >= 1920 || viewportWidth >= 1600;
  }
  
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
    
    // Verificar tamanho da tela
    checkScreenSize();
    
    // Adicionar listener para redimensionamento
    window.addEventListener('resize', checkScreenSize);
  });
  
  onDestroy(() => {
    // Remover listener
    window.removeEventListener('resize', checkScreenSize);
  });
</script>

<div class="min-h-screen w-full" style="background-color: var(--app-background); color: var(--app-text);">
  <!-- AppHeader Unificado: substitui header, tabs e barra de preço -->
  <AppHeader 
    selectedCrypto={$selectedCrypto}
    cryptoData={currentData}
    activeTimeframe={currentTimeframe}
    {currentView}
    {isFullHD}
    {loading}
    onTimeframeChange={handleTimeframeChange}
    onViewChange={handleViewChange}
  />

  <main class="min-h-screen px-3 py-2 mx-auto flex flex-col w-full pt-[130px]" class:fullhd-layout={isFullHD}>
    
    <!-- Conteúdo baseado na view ativa -->
    {#if currentView === 'dashboard'}
      <!-- Conteúdo principal com altura responsiva -->
      <div class="content-container flex-grow space-y-3 flex flex-col">
        <!-- Seletor de Criptomoedas compacto (oculto em Full HD pois vira barra lateral) -->
        {#if !isFullHD}
          <div class="flex-shrink-0">
            <CryptoSelector />
          </div>
        {/if}
        
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
  
  <!-- CryptoSelector em modo Full HD (barra lateral fixa) -->
  {#if isFullHD}
    <CryptoSelector />
  {/if}
</div>

<style>
  /* Layout Full HD: adiciona padding para dar espaço à barra lateral */
  main.fullhd-layout {
    padding-left: 130px; /* 120px da barra + 10px de margem */
  }
</style>
