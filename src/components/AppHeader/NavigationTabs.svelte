<script lang="ts">
  // Props
  export let currentView: 'dashboard' | 'triplescreen' = 'dashboard';
  export let onViewChange: (view: 'dashboard' | 'triplescreen') => void = () => {};

  // Definição das tabs
  const tabs = [
    { id: 'dashboard' as const, label: '📊 Dashboard', icon: '📊' },
    { id: 'triplescreen' as const, label: '🎯 Triple Screen LOTUS', icon: '🎯' },
  ];

  function handleTabClick(viewId: 'dashboard' | 'triplescreen') {
    onViewChange(viewId);
  }
</script>

<div class="navigation-tabs">
  {#each tabs as tab}
    <button 
      class="tab-button {currentView === tab.id ? 'active' : ''}"
      on:click={() => handleTabClick(tab.id)}
      aria-pressed={currentView === tab.id}
      aria-label={tab.label}
    >
      <span class="tab-icon">{tab.icon}</span>
      <span class="tab-label">{tab.label.replace(tab.icon, '').trim()}</span>
    </button>
  {/each}
</div>

<style>
  .navigation-tabs {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .tab-button {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    background: transparent;
    color: var(--color-surface-600);
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
  }

  :global(.dark) .tab-button {
    color: var(--color-surface-400);
  }

  .tab-button:hover:not(.active) {
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-surface-700);
  }

  :global(.dark) .tab-button:hover:not(.active) {
    background: rgba(255, 255, 255, 0.05);
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

  .tab-icon {
    font-size: 1rem;
    line-height: 1;
  }

  .tab-label {
    line-height: 1;
  }

  /* Responsividade */
  @media (max-width: 1024px) {
    .tab-button {
      padding: 0.5rem 0.875rem;
      font-size: 0.8125rem;
    }
  }

  @media (max-width: 768px) {
    .navigation-tabs {
      width: 100%;
    }

    .tab-button {
      flex: 1;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      gap: 0.25rem;
    }

    .tab-icon {
      font-size: 1rem;
    }
  }

  @media (max-width: 480px) {
    .navigation-tabs {
      gap: 0.375rem;
    }

    .tab-button {
      padding: 0.5rem 0.5rem;
      font-size: 0.75rem;
      gap: 0.25rem;
    }

    .tab-label {
      display: none; /* Oculta o texto em mobile, mostra só ícone */
    }

    .tab-icon {
      font-size: 1.25rem;
    }
  }
</style>
