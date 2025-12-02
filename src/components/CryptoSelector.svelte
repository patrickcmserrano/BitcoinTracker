<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { getAllCryptos } from "../lib/crypto-config";
  import { selectedCrypto, selectCrypto } from "../lib/crypto-store";
  import type { CryptoConfig } from "../lib/crypto-config";
  import { _ } from "../lib/i18n";
  import CryptoIcon from "./CryptoIcon.svelte";

  const cryptos = getAllCryptos();

  function handleSelect(crypto: CryptoConfig) {
    selectCrypto(crypto);
  }

  // Estado para detectar tela Full HD ou maior
  let isFullHD = false;

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

  onMount(() => {
    // Verificar tamanho inicial
    checkScreenSize();

    // Adicionar listener para redimensionamento
    window.addEventListener("resize", checkScreenSize);
  });

  onDestroy(() => {
    // Remover listener
    window.removeEventListener("resize", checkScreenSize);
  });
</script>

<div class="crypto-selector" class:fullhd={isFullHD}>
  {#if !isFullHD}
    <!-- Layout horizontal normal para telas menores que Full HD -->
    <div class="text-center mb-4">
      <h2 class="h4 font-bold text-surface-900-50-token mb-2">
        {$_("crypto.selector.title")}
      </h2>
    </div>

    <div class="crypto-grid mb-6">
      {#each cryptos as crypto}
        <button
          class="crypto-btn {$selectedCrypto.id === crypto.id ? 'active' : ''}"
          style="--crypto-color: {crypto.color}"
          on:click={() => handleSelect(crypto)}
          title={$_(`crypto.${crypto.id}.description`)}
        >
          <div class="crypto-icon">
            <CryptoIcon cryptoId={crypto.id} size="md" />
          </div>
          <span class="crypto-name">{crypto.symbol}</span>
        </button>
      {/each}
    </div>
  {:else}
    <!-- Layout vertical em barra lateral para Full HD+ -->
    <div class="crypto-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-icon">💰</span>
        <h3 class="sidebar-title">Cripto</h3>
      </div>

      <div class="crypto-list-vertical">
        {#each cryptos as crypto}
          <button
            class="crypto-btn-vertical {$selectedCrypto.id === crypto.id
              ? 'active'
              : ''}"
            style="--crypto-color: {crypto.color}"
            on:click={() => handleSelect(crypto)}
            title={$_(`crypto.${crypto.id}.description`)}
          >
            <div class="crypto-icon-vertical">
              <CryptoIcon cryptoId={crypto.id} size="lg" />
            </div>
            <span class="crypto-name-vertical">{crypto.symbol}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .crypto-selector {
    margin-bottom: 1rem;
  }

  /* Modo Full HD: Barra lateral fixa à esquerda */
  .crypto-selector.fullhd {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 120px; /* Aumentado de 100px para 120px */
    margin: 0;
    z-index: 1000;
    background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.1);
    border-right: 2px solid #e2e8f0;
    display: flex;
    flex-direction: column;
  }

  :global(.dark) .crypto-selector.fullhd {
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    box-shadow: 2px 0 16px rgba(0, 0, 0, 0.4);
    border-right: 2px solid #334155;
  }

  /* Barra lateral vertical */
  .crypto-sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 1rem 0.625rem; /* Aumentado padding horizontal de 0.5rem para 0.625rem */
    overflow-y: auto;
    overflow-x: hidden;
  }

  /* Customizar scrollbar da barra lateral */
  .crypto-sidebar::-webkit-scrollbar {
    width: 6px;
  }

  .crypto-sidebar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }

  .crypto-sidebar::-webkit-scrollbar-thumb {
    background: rgba(59, 130, 246, 0.5);
    border-radius: 3px;
  }

  .crypto-sidebar::-webkit-scrollbar-thumb:hover {
    background: rgba(59, 130, 246, 0.7);
  }

  .sidebar-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem; /* Reduzido de 0.5rem */
    padding: 0.75rem 0.625rem; /* Reduzido padding vertical de 1rem */
    margin-bottom: 1rem; /* Reduzido de 1.5rem */
    background: rgba(59, 130, 246, 0.15);
    border-radius: 10px;
    border: 2px solid rgba(59, 130, 246, 0.3);
  }

  .sidebar-icon {
    font-size: 1.75rem; /* Reduzido de 2rem */
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }

  .sidebar-title {
    font-size: 0.75rem; /* Reduzido de volta para 0.75rem */
    font-weight: 800;
    text-align: center;
    color: #2563eb;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin: 0;
  }

  :global(.dark) .sidebar-title {
    color: #60a5fa;
  }

  /* Lista vertical de criptomoedas */
  .crypto-list-vertical {
    display: flex;
    flex-direction: column;
    gap: 0.5rem; /* Reduzido para economizar espaço */
    flex: 1;
  }

  .crypto-btn-vertical {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 0.5rem; /* Reduzido padding vertical */
    border: 2px solid transparent;
    border-radius: 10px;
    background: #f1f5f9;
    color: #334155;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    min-height: 70px; /* Reduzido de 85px */
    position: relative;
    overflow: hidden; /* Previne overflow */
  }

  :global(.dark) .crypto-btn-vertical {
    background: rgba(55, 65, 81, 0.5);
    color: #e5e7eb;
  }

  .crypto-btn-vertical:hover {
    border-color: var(--crypto-color);
    background: rgba(59, 130, 246, 0.15);
    transform: translateX(3px); /* Reduzido movimento, sem scale */
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  :global(.dark) .crypto-btn-vertical:hover {
    background: rgba(59, 130, 246, 0.25);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .crypto-btn-vertical.active {
    background: linear-gradient(
      135deg,
      var(--crypto-color),
      color-mix(in srgb, var(--crypto-color) 85%, #000000)
    );
    color: white;
    border-color: var(--crypto-color);
    font-weight: 900;
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.2),
      0 0 16px var(--crypto-color);
    transform: translateX(4px); /* Movimento mínimo, sem scale */
  }

  :global(.dark) .crypto-btn-vertical.active {
    background: linear-gradient(
      135deg,
      var(--crypto-color),
      color-mix(in srgb, var(--crypto-color) 70%, #000000)
    );
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.6),
      0 0 16px var(--crypto-color);
  }

  .crypto-btn-vertical.active::before {
    content: "";
    position: absolute;
    left: -4px;
    top: 50%;
    transform: translateY(-50%);
    width: 0;
    height: 0;
    border-top: 8px solid transparent; /* Reduzido de 10px */
    border-bottom: 8px solid transparent;
    border-left: 8px solid var(--crypto-color);
    filter: drop-shadow(0 0 6px var(--crypto-color));
  }

  .crypto-icon-vertical {
    font-size: 1.75rem; /* Reduzido de 2.25rem */
    line-height: 1;
    margin-bottom: 0.375rem; /* Reduzido de 0.5rem */
    display: flex;
    align-items: center;
    justify-content: center;
    height: 28px; /* Reduzido de 36px */
  }

  .crypto-name-vertical {
    font-size: 0.8rem; /* Reduzido de 0.875rem */
    font-weight: inherit;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    letter-spacing: 0.3px;
  }

  /* Layout horizontal normal */
  .crypto-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    max-width: 900px;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .crypto-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 0.5rem;
    border: 2px solid transparent;
    border-radius: 0.5rem;
    background-color: #f3f4f6; /* gray-100 */
    color: #374151; /* gray-700 */
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
    width: 100px;
    height: 80px;
    flex: 0 0 auto;
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
    content: "";
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
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
  }

  .crypto-name {
    font-size: 0.875rem;
    font-weight: inherit;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
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
    background: linear-gradient(
      135deg,
      var(--crypto-color),
      color-mix(in srgb, var(--crypto-color) 80%, #000000)
    );
    color: white;
    border-color: var(--crypto-color);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
  }

  :global(.dark) .crypto-btn.active::after {
    border-bottom-color: var(--crypto-color);
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .crypto-grid {
      gap: 0.4rem;
      padding: 0 0.5rem;
    }

    .crypto-btn {
      width: 90px;
      height: 75px;
      padding: 0.6rem 0.4rem;
    }

    .crypto-icon {
      font-size: 1.25rem;
    }

    .crypto-name {
      font-size: 0.75rem;
    }
  }

  @media (max-width: 480px) {
    .crypto-grid {
      gap: 0.3rem;
      padding: 0 0.25rem;
    }

    .crypto-btn {
      width: 80px;
      height: 70px;
      padding: 0.5rem 0.25rem;
    }

    .crypto-icon {
      font-size: 1rem;
    }

    .crypto-name {
      font-size: 0.7rem;
    }
  }

  @media (max-width: 360px) {
    .crypto-grid {
      gap: 0.25rem;
    }

    .crypto-btn {
      width: 70px;
      height: 65px;
      padding: 0.4rem 0.2rem;
    }

    .crypto-icon {
      font-size: 0.9rem;
    }

    .crypto-name {
      font-size: 0.65rem;
    }
  }
</style>
