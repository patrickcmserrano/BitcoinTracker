<script lang="ts">
  import './styles/global.css';
  import ThemeToggle from './components/ThemeToggle.svelte';
  import LanguageSelector from './components/LanguageSelector.svelte';
  import BitcoinTracker from './components/BitcoinTracker.svelte';
  import { _ } from './lib/i18n';
  // Inicializa o suporte a idiomas
  import { setupI18n } from './lib/i18n';
  import { onMount } from 'svelte';
  
  setupI18n();
  
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

<main class="p-10 space-y-8 container mx-auto">
  <div class="flex justify-between items-center">
    <div class="language-selector">
      <LanguageSelector />
    </div>
    <div class="theme-toggle-container">
      <ThemeToggle />
    </div>  
  </div>
    
  <div class="content-container flex justify-center">
    <BitcoinTracker />
  </div>
  <footer class="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
    <p class="text-sm text-gray-600 dark:text-gray-400">{$_('footer.copyright')}</p>
  </footer>
</main>
