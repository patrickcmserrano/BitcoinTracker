<script lang="ts">
  import './styles/global.css';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import LanguageSelector from './components/LanguageSelector.svelte';
  import CryptoSelector from './components/CryptoSelector.svelte';
  import CryptoTracker from './components/CryptoTracker.svelte';
  import AdaptiveChart from './components/AdaptiveChart.svelte';
  import ServiceSelector from './components/ServiceSelector.svelte';
  // import TaapiIndicators from './components/TaapiIndicators.svelte'; // Removido temporariamente
  import { _ } from './lib/i18n';
  import { setupI18n } from './lib/i18n';
  import { onMount } from 'svelte';
  import { selectedCrypto, currentCryptoData, isCurrentCryptoLoading } from './lib/crypto-store';
  import type { CryptoData } from './lib/crypto-config';
  import { initCryptoIcons } from './lib/crypto-icons';
  import type { ChartLibrary } from './lib/charts/chart-manager';
  
  setupI18n();
  
  // Estados compartilhados derivados das stores
  let cryptoTrackerRef: CryptoTracker;
  let adaptiveChartRef: AdaptiveChart;
  let currentData: CryptoData | null = null;
  let loading = false;
  
  // Chart configuration state
  let showServiceSelector = false;
  let useAdaptiveChart = false;
  let selectedChartLibrary: ChartLibrary = 'lightweight-charts';
  let chartPerformanceMetrics = { renderTime: 0, dataPoints: 0, memoryUsage: 0 };
  
  // Service combination configuration
  interface ServiceCombination {
    id: string;
    name: string;
    description: string;
    chartLibrary: ChartLibrary;
    priceProvider: 'binance' | 'coinbase' | 'taapi';
    indicators: string[];
    features: string[];
    performance: 'high' | 'medium' | 'low';
    reliability: 'high' | 'medium' | 'low';
  }
  
  let activeServiceCombination: ServiceCombination | null = null;
  
  // Available chart libraries for service selector
  const availableLibraries = [
    {
      id: 'lightweight-charts' as ChartLibrary,
      name: 'Lightweight Charts',
      description: 'High performance, optimized for financial data'
    },
    {
      id: 'chart-js' as ChartLibrary,
      name: 'Chart.js',
      description: 'Flexible, feature-rich charting library'
    },
    {
      id: 'canvas-fallback' as ChartLibrary,
      name: 'Canvas Fallback',
      description: 'Zero-dependency, always available'
    }
  ];
  
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
  
  // Event handlers for service selection
  function handleCombinationSelected(event: CustomEvent<ServiceCombination>) {
    const combination = event.detail;
    console.log('Service combination selected:', combination);
    // Note: In a real implementation, you would configure the price provider here
  }
  
  function handleLibrarySelected(event: CustomEvent<{ library: ChartLibrary }>) {
    selectedChartLibrary = event.detail.library;
    if (adaptiveChartRef) {
      adaptiveChartRef.switchLibrary(selectedChartLibrary);
    }
  }
  
  function handleApplyConfiguration(event: CustomEvent<ServiceCombination>) {
    activeServiceCombination = event.detail;
    selectedChartLibrary = event.detail.chartLibrary;
    useAdaptiveChart = true;
    showServiceSelector = false;
    
    // Apply the configuration
    if (adaptiveChartRef) {
      adaptiveChartRef.switchLibrary(selectedChartLibrary);
    }
    
    console.log('Applied service configuration:', activeServiceCombination);
  }
  
  function handleChartInitialized(event: CustomEvent) {
    console.log('Chart initialized with library:', event.detail.library);
  }
  
  function handleChartError(event: CustomEvent) {
    console.error('Chart error:', event.detail.error);
  }
  
  function handleDataUpdate(event: CustomEvent) {
    // Update performance metrics when data updates
    if (adaptiveChartRef) {
      chartPerformanceMetrics = adaptiveChartRef.getPerformanceMetrics();
    }
  }
  
  async function takeChartScreenshot() {
    if (adaptiveChartRef) {
      const screenshot = await adaptiveChartRef.takeScreenshot();
      if (screenshot) {
        // Create download link for screenshot
        const link = document.createElement('a');
        link.download = `chart-${$selectedCrypto.symbol}-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = screenshot;
        link.click();
      }
    }
  }
  
  function toggleChartMode() {
    useAdaptiveChart = !useAdaptiveChart;
    if (!useAdaptiveChart) {
      activeServiceCombination = null;
    }
  }
</script>

<div class="min-h-screen w-full" style="background-color: var(--app-background); color: var(--app-text);">
  <main class="min-h-screen px-3 py-2 container mx-auto flex flex-col max-w-7xl">
    <!-- Header compacto -->
    <div class="flex justify-between items-center mb-3">
      <div class="flex items-center space-x-4">
        <div class="language-selector">
          <LanguageSelector />
        </div>
        
        <!-- Chart Mode Toggle -->
        <div class="flex items-center space-x-2">
          <button
            on:click={toggleChartMode}
            class="px-3 py-1.5 text-sm font-medium rounded-md transition-colors {useAdaptiveChart ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}"
            title="Toggle between standard and adaptive chart modes"
          >
            {useAdaptiveChart ? 'Adaptive Chart' : 'Standard Chart'}
          </button>
          
          {#if useAdaptiveChart}
            <button
              on:click={() => showServiceSelector = !showServiceSelector}
              class="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              title="Configure chart services"
            >
              ⚙️ Configure
            </button>
            
            {#if adaptiveChartRef}
              <button
                on:click={takeChartScreenshot}
                class="px-3 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                title="Take chart screenshot"
              >
                📸
              </button>
            {/if}
          {/if}
        </div>
      </div>
      
      <div class="flex items-center space-x-4">
        {#if activeServiceCombination}
          <div class="text-sm">
            <span class="text-gray-600 dark:text-gray-400">Config:</span>
            <span class="font-medium text-gray-900 dark:text-gray-100 ml-1">
              {activeServiceCombination.name}
            </span>
          </div>
        {/if}
        
        <div class="theme-toggle-container">
          <ThemeToggle />
        </div>
      </div>
    </div>    <!-- Conteúdo principal com altura responsiva -->
    <div class="content-container flex-grow space-y-3 flex flex-col">
      <!-- Service Selector Modal -->
      {#if showServiceSelector}
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                Chart Service Configuration
              </h2>
              <button
                on:click={() => showServiceSelector = false}
                class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close service selector"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            
            <ServiceSelector
              {availableLibraries}
              currentLibrary={selectedChartLibrary}
              performanceMetrics={chartPerformanceMetrics}
              on:combinationSelected={handleCombinationSelected}
              on:librarySelected={handleLibrarySelected}
              on:applyConfiguration={handleApplyConfiguration}
            />
          </div>
        </div>
      {/if}
      
      <!-- Seletor de Criptomoedas compacto -->
      <div class="flex-shrink-0">
        <CryptoSelector />
      </div>
      
      <!-- Chart Section - Conditional Rendering -->
      {#if useAdaptiveChart}
        <!-- Adaptive Chart with Service Selection -->
        <div class="flex-grow">
          <AdaptiveChart
            bind:this={adaptiveChartRef}
            symbol={$selectedCrypto.symbol}
            interval="1h"
            theme={document.documentElement.getAttribute('data-mode') === 'dark' ? 'dark' : 'light'}
            height={400}
            preferredLibrary={selectedChartLibrary}
            {availableLibraries}
            on:chartInitialized={handleChartInitialized}
            on:chartError={handleChartError}
            on:dataUpdate={handleDataUpdate}
            on:libraryChanged={(e) => selectedChartLibrary = e.detail.library}
          />
        </div>
      {:else}
        <!-- Standard CryptoTracker -->
        <div class="flex-grow">
          <CryptoTracker 
            bind:this={cryptoTrackerRef}
            config={$selectedCrypto}
            bind:data={currentData}
            bind:loading={loading}
          />
        </div>
      {/if}
    </div>
    
    <!-- Footer compacto -->
    <footer class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center flex-shrink-0">
      <p class="text-xs text-gray-600 dark:text-gray-400">{$_('footer.copyright')}</p>
    </footer>
  </main>
</div>
