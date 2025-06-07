<script lang="ts">
  import './styles/global.css';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import LanguageSelector from './components/LanguageSelector.svelte';
  import BitcoinTracker from './components/BitcoinTracker.svelte';
  import TaapiIndicators from './components/TaapiIndicators.svelte';
  import { _ } from './lib/i18n';
  // Inicializa o suporte a idiomas
  import { setupI18n } from './lib/i18n';
  import { onMount } from 'svelte';
  import type { BitcoinData } from './lib/api';
  
  setupI18n();
  
  // Estado compartilhado entre componentes
  let bitcoinData: BitcoinData | null = null;
  let loading = false;
  let atrError: string | null = null;
  let lastATRCheck: Date | null = null;
  let nextATRCheck: Date | null = null;
  let bitcoinTrackerRef: BitcoinTracker;
  
  // Função para ser chamada quando a configuração TAAPI é alterada
  function handleATRConfiguration() {
    if (bitcoinTrackerRef && bitcoinTrackerRef.triggerATRUpdate) {
      bitcoinTrackerRef.triggerATRUpdate();
    }
  }
  
  onMount(() => {
    // Verificar e sincronizar o tema ao montar o componente principal
    const storedMode = localStorage.getItem('mode') || 'light';
    document.documentElement.setAttribute('data-mode', storedMode);
    
    // Também definir a classe para compatibilidade com variantes de Tailwind
    if (storedMode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });
</script>

<div class="h-screen w-full overflow-y-auto" style="background-color: var(--app-background); color: var(--app-text);">
  <main class="min-h-full p-4 container mx-auto flex flex-col">
    <div class="flex justify-between items-center mb-8">
      <div class="language-selector">
        <LanguageSelector />
      </div>
      
      <div class="theme-toggle-container">
        <ThemeToggle />
      </div>  
    </div>
      
    <div class="content-container flex-grow space-y-6">
      <BitcoinTracker 
        bind:this={bitcoinTrackerRef}
        bind:data={bitcoinData}
        bind:loading={loading}
        bind:atrError={atrError}
        bind:lastATRCheck={lastATRCheck}
        bind:nextATRCheck={nextATRCheck}
      />
      
      <TaapiIndicators 
        data={bitcoinData}
        loading={loading}
        atrError={atrError}
        lastATRCheck={lastATRCheck}
        nextATRCheck={nextATRCheck}
        onConfigureATR={handleATRConfiguration}
      />
    </div>
    
    <footer class="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
      <p class="text-sm text-gray-600 dark:text-gray-400">{$_('footer.copyright')}</p>
    </footer>
  </main>
</div>
