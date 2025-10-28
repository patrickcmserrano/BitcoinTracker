<script lang="ts">
  import { _ } from '../../lib/i18n';
  
  // Props
  export let activeTimeframe: string = '1h';
  export let disabled: boolean = false;
  export let onTimeframeChange: (timeframe: string) => void = () => {};

  // Definição dos timeframes
  const timeframes = [
    { id: '5m', label: '5m' },
    { id: '15m', label: '15m' },
    { id: '1h', label: '1h' },
    { id: '4h', label: '4h' },
    { id: '1d', label: '1d' },
    { id: '1w', label: '1w' },
  ];

  function handleTimeframeClick(timeframeId: string) {
    if (!disabled) {
      onTimeframeChange(timeframeId);
    }
  }
</script>

<div class="timeframe-selector">
  {#each timeframes as timeframe}
    <button 
      class="timeframe-btn {activeTimeframe === timeframe.id ? 'active' : ''}"
      on:click={() => handleTimeframeClick(timeframe.id)}
      title={$_(`bitcoin.timeframe${timeframe.id}Info`) || `Timeframe ${timeframe.label}`}
      disabled={disabled}
    >
      {timeframe.label}
    </button>
  {/each}
</div>

<style>
  .timeframe-selector {
    display: flex;
    gap: 0.25rem;
    background: rgba(0, 0, 0, 0.05);
    padding: 0.25rem;
    border-radius: 0.5rem;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .timeframe-selector {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .timeframe-btn {
    padding: 0.375rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--app-text);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    opacity: 0.7;
  }

  .timeframe-btn:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.05);
    opacity: 1;
  }

  :global(.dark) .timeframe-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }

  .timeframe-btn.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: #667eea;
    opacity: 1;
    font-weight: 700;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  }

  .timeframe-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* Responsividade */
  @media (max-width: 768px) {
    .timeframe-selector {
      gap: 0.2rem;
      padding: 0.2rem;
    }

    .timeframe-btn {
      padding: 0.3rem 0.6rem;
      font-size: 0.7rem;
    }
  }

  @media (max-width: 480px) {
    .timeframe-selector {
      flex-wrap: wrap;
      justify-content: center;
    }

    .timeframe-btn {
      padding: 0.25rem 0.5rem;
      font-size: 0.65rem;
    }
  }
</style>
