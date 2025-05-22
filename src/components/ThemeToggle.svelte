<script lang="ts">
  import { Switch } from '@skeletonlabs/skeleton-svelte';
  import IconMoon from '@lucide/svelte/icons/moon';
  import IconSun from '@lucide/svelte/icons/sun';
  import { onMount } from 'svelte';

  let isDarkMode = $state(false);

  // Função para aplicar o tema em todos os lugares necessários
  function setTheme(mode: string) {
    console.log('Aplicando tema:', mode);
    isDarkMode = mode === 'dark';
    document.documentElement.setAttribute('data-mode', mode);
    
    // Forçar a atualização de classes em elementos específicos
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'vintage');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'skeleton');
    }
    
    // Forçar atualização das variáveis CSS
    document.body.style.backgroundColor = 'var(--app-background)';
    document.body.style.color = 'var(--app-text)';
    
    localStorage.setItem('mode', mode);
    console.log('Tema aplicado e salvo. isDarkMode:', isDarkMode);
  }

  function handleThemeChange() {
    console.log('handleThemeChange chamado, estado atual:', isDarkMode);
    const newMode = isDarkMode ? 'light' : 'dark';
    console.log('Mudando para modo:', newMode);
    setTheme(newMode);
  }

  onMount(() => {
    console.log('ThemeToggle componente montado');
    // Sincroniza o estado do toggle com o modo atual do tema
    const storedMode = localStorage.getItem('mode') || 'light';
    console.log('Modo armazenado no localStorage:', storedMode);
    
    // Inicializa o tema
    setTheme(storedMode);
  });

  // Garante que o componente exporte algo
  export {};
</script>

<svelte:head>
  <script>
    // Aplicar tema salvo no carregamento da página
    try {
      const mode = localStorage.getItem('mode') || 'light';
      document.documentElement.setAttribute('data-mode', mode);
      
      // Aplicar também o tema do Skeleton
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'vintage');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'skeleton');
      }
    } catch (e) {
      // Fallback se localStorage não estiver disponível
      document.documentElement.setAttribute('data-mode', 'light');
      document.documentElement.setAttribute('data-theme', 'skeleton');
    }
  </script>
</svelte:head>

<div aria-label="Theme toggle" class="theme-toggle-wrapper">
  <button 
    type="button"
    class="theme-toggle"
    id="theme-toggle"
    aria-pressed={isDarkMode}
    aria-label="Alternar tema claro/escuro"
    on:click={handleThemeChange}
  >
    <Switch
      name="theme"
      checked={isDarkMode}
    >
      {#snippet inactiveChild()}
        <IconMoon size="14" />
      {/snippet}
      {#snippet activeChild()}
        <IconSun size="14" />
      {/snippet}
    </Switch>
  </button>
</div>

<style>
  .theme-toggle-wrapper {
    display: inline-block;
  }
  
  .theme-toggle {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
  }
</style>