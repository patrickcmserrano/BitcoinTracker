<script lang="ts">
  import { getAllCryptos } from '../lib/crypto-config';
  import { selectedCrypto, selectCrypto } from '../lib/crypto-store';
  import type { CryptoConfig } from '../lib/crypto-config';
  import { _ } from '../lib/i18n';
  import CryptoIcon from './CryptoIcon.svelte';
  
  const cryptos = getAllCryptos();
  
  function handleSelect(crypto: CryptoConfig) {
    selectCrypto(crypto);
  }
</script>

<div class="crypto-selector">
  <div class="text-center mb-4">
    <h2 class="h4 font-bold text-surface-900-50-token mb-2">
      {$_('crypto.selector.title')}
    </h2>
  </div>
  
  <div class="flex space-x-2 justify-center mb-6">
    {#each cryptos as crypto}      <button 
        class="crypto-btn {$selectedCrypto.id === crypto.id ? 'active' : ''}"
        style="--crypto-color: {crypto.color}"
        onclick={() => handleSelect(crypto)}
        title={$_(`crypto.${crypto.id}.description`)}
      >
        <div class="crypto-icon">
          <CryptoIcon cryptoId={crypto.id} size="md" />
        </div>
        <span class="crypto-name">{crypto.symbol}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .crypto-selector {
    margin-bottom: 1rem;
  }
    .crypto-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    border: 2px solid transparent;
    border-radius: 0.5rem;
    background-color: #f3f4f6; /* gray-100 */
    color: #374151; /* gray-700 */
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
    min-width: 80px;
    position: relative;
  }
  
  .crypto-btn:hover {
    border-color: var(--crypto-color);
    background-color: #e5e7eb; /* gray-200 */
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  .crypto-btn.active {
    background-color: var(--crypto-color);
    color: white;
    border-color: var(--crypto-color);
    font-weight: bold;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  .crypto-btn.active::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid var(--crypto-color);
  }
  
  .crypto-icon {
    font-size: 1.5rem;
    line-height: 1;
    margin-bottom: 0.25rem;
  }
  
  .crypto-name {
    font-size: 0.875rem;
    font-weight: inherit;
  }
    /* Dark mode adjustments */
  :global(.dark) .crypto-btn {
    background-color: rgba(55, 65, 81, 0.8); /* gray-700 with opacity */
    color: #f3f4f6; /* gray-100 */
    border-color: rgba(75, 85, 99, 0.6); /* gray-600 with opacity */
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  :global(.dark) .crypto-btn:hover {
    background-color: var(--crypto-color);
    color: #ffffff;
    border-color: var(--crypto-color);
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.4);
  }
  
  :global(.dark) .crypto-btn.active {
    background: linear-gradient(135deg, var(--crypto-color), color-mix(in srgb, var(--crypto-color) 80%, #000000));
    color: white;
    border-color: var(--crypto-color);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
  }
  
  :global(.dark) .crypto-btn.active::after {
    border-bottom-color: var(--crypto-color);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
  
  /* Responsive design */
  @media (max-width: 640px) {
    .crypto-btn {
      min-width: 70px;
      padding: 0.5rem 0.75rem;
    }
    
    .crypto-icon {
      font-size: 1.25rem;
    }
    
    .crypto-name {
      font-size: 0.75rem;
    }
  }
</style>
