<script lang="ts">
  import './styles/global.css';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import LanguageSelector from './components/LanguageSelector.svelte';
  import CryptoSelector from './components/CryptoSelector.svelte';  import CryptoTracker from './components/CryptoTracker.svelte';
  // import TaapiIndicators from './components/TaapiIndicators.svelte'; // Removido temporariamente
  import { _ } from './lib/i18n';
  import { setupI18n } from './lib/i18n';
  import { onMount } from 'svelte';  import { selectedCrypto, currentCryptoData, isCurrentCryptoLoading } from './lib/crypto-store';
  import type { CryptoData } from './lib/crypto-config';
  import { initCryptoIcons } from './lib/crypto-icons';
  
  setupI18n();
  
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
        />
      </div>
    </div>
    
    <!-- Footer compacto -->
    <footer class="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700 text-center flex-shrink-0">
      <p class="text-xs text-gray-600 dark:text-gray-400">{$_('footer.copyright')}</p>
    </footer>
  </main>
</div>
