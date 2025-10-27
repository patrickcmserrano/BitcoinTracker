<script lang="ts">
  /**
   * Componente de Status de APIs (Health Check)
   * Verifica a saúde das APIs em tempo real
   */
  
  import { onMount, onDestroy } from 'svelte';
  
  let showDetails = false;
  let loading = true;
  let lastCheck: Date | null = null;
  
  interface APIStatus {
    name: string;
    status: 'online' | 'offline' | 'checking';
    description: string;
    free: boolean;
    latency?: number;
    error?: string;
    lastCheck?: Date;
  }
  
  let apiStatuses: APIStatus[] = [
    {
      name: 'Binance',
      status: 'checking',
      description: 'Preços, OHLCV, Volume',
      free: true
    },
    {
      name: 'Alternative.me',
      status: 'checking',
      description: 'Fear & Greed Index',
      free: true
    },
    {
      name: 'CoinGecko',
      status: 'checking',
      description: 'BTC Dominance, Market Cap',
      free: true
    },
    {
      name: 'TechnicalIndicators',
      status: 'online',
      description: 'MACD, RSI, Stochastic (Local)',
      free: true
    }
  ];
  
  const inactiveAPIs = [
    {
      name: 'Coinglass',
      status: 'disabled',
      description: 'LSR, Open Interest, Liquidações',
      free: false,
      reason: 'Requer API Key paga'
    },
    {
      name: 'TAAPI',
      status: 'disabled',
      description: 'Indicadores técnicos avançados',
      free: false,
      reason: 'Requer API Key (não configurado)'
    }
  ];
  
  let checkInterval: ReturnType<typeof setInterval> | null = null;
  
  async function checkBinanceHealth(): Promise<{ status: 'online' | 'offline', latency?: number, error?: string }> {
    try {
      const start = Date.now();
      const response = await fetch('https://api.binance.com/api/v3/ping', { 
        signal: AbortSignal.timeout(8000),
        mode: 'cors'
      });
      const latency = Date.now() - start;
      
      if (response.ok) {
        return { status: 'online', latency };
      } else {
        return { status: 'offline', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { status: 'offline', error: 'CORS ou rede bloqueada' };
      }
      return { status: 'offline', error: error instanceof Error ? error.message : 'Timeout' };
    }
  }
  
  async function checkAlternativeMeHealth(): Promise<{ status: 'online' | 'offline', latency?: number, error?: string }> {
    try {
      const start = Date.now();
      const response = await fetch('https://api.alternative.me/fng/?limit=1', { 
        signal: AbortSignal.timeout(8000),
        mode: 'cors'
      });
      const latency = Date.now() - start;
      
      if (response.ok) {
        return { status: 'online', latency };
      } else {
        return { status: 'offline', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { status: 'offline', error: 'CORS ou rede bloqueada' };
      }
      return { status: 'offline', error: error instanceof Error ? error.message : 'Timeout' };
    }
  }
  
  async function checkCoinGeckoHealth(): Promise<{ status: 'online' | 'offline', latency?: number, error?: string }> {
    try {
      const start = Date.now();
      // Try the simpler endpoint first
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { 
        signal: AbortSignal.timeout(8000),
        mode: 'cors'
      });
      const latency = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.bitcoin && data.bitcoin.usd) {
          return { status: 'online', latency };
        } else {
          return { status: 'offline', error: 'Resposta inválida' };
        }
      } else {
        return { status: 'offline', error: `HTTP ${response.status}` };
      }
    } catch (error) {
      // Try to provide more specific error message
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return { status: 'offline', error: 'CORS ou rede bloqueada' };
      }
      return { status: 'offline', error: error instanceof Error ? error.message : 'Timeout' };
    }
  }
  
  async function checkAllAPIs() {
    loading = true;
    
    // Check all APIs in parallel
    const [binanceResult, altMeResult, coinGeckoResult] = await Promise.all([
      checkBinanceHealth(),
      checkAlternativeMeHealth(),
      checkCoinGeckoHealth()
    ]);
    
    console.log('API Results:', { binanceResult, altMeResult, coinGeckoResult });
    
    // Update all statuses
    apiStatuses = [
      {
        name: apiStatuses[0].name,
        description: apiStatuses[0].description,
        free: apiStatuses[0].free,
        status: binanceResult.status,
        latency: binanceResult.latency,
        error: binanceResult.status === 'online' ? undefined : binanceResult.error,
        lastCheck: new Date()
      },
      {
        name: apiStatuses[1].name,
        description: apiStatuses[1].description,
        free: apiStatuses[1].free,
        status: altMeResult.status,
        latency: altMeResult.latency,
        error: altMeResult.status === 'online' ? undefined : altMeResult.error,
        lastCheck: new Date()
      },
      {
        name: apiStatuses[2].name,
        description: apiStatuses[2].description,
        free: apiStatuses[2].free,
        status: coinGeckoResult.status,
        latency: coinGeckoResult.latency,
        error: coinGeckoResult.status === 'online' ? undefined : coinGeckoResult.error,
        lastCheck: new Date()
      },
      {
        name: apiStatuses[3].name,
        description: apiStatuses[3].description,
        free: apiStatuses[3].free,
        status: 'online',
        latency: undefined,
        error: undefined,
        lastCheck: new Date()
      }
    ];
    
    console.log('Updated apiStatuses:', apiStatuses.map(a => ({ name: a.name, status: a.status })));
    
    lastCheck = new Date();
    loading = false;
  }
  
  function getStatusCounts() {
    const online = apiStatuses.filter(api => api.status === 'online').length;
    const total = apiStatuses.length;
    const disabled = inactiveAPIs.length;
    console.log('getStatusCounts:', { online, total, apiStatuses: apiStatuses.map(a => ({ name: a.name, status: a.status })) });
    return { online, total, disabled };
  }
  
  onMount(() => {
    checkAllAPIs();
    // Check every 2 minutes
    checkInterval = setInterval(checkAllAPIs, 2 * 60 * 1000);
  });
  
  onDestroy(() => {
    if (checkInterval) {
      clearInterval(checkInterval);
    }
  });
  
  function formatLatency(latency?: number): string {
    if (!latency) return '-';
    return `${latency}ms`;
  }
  
  function formatTimeSinceCheck(): string {
    if (!lastCheck) return '';
    const seconds = Math.floor((Date.now() - lastCheck.getTime()) / 1000);
    if (seconds < 60) return `Há ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Há ${minutes}min`;
  }
  
  $: statusCounts = getStatusCounts();
  // Provide activeAPIs for the template (derived from apiStatuses)
  $: activeAPIs = apiStatuses;
</script>

<div class="api-status-container">
  <!-- Header -->
  <div class="status-header">
    <div class="header-left">
      <h3 class="status-title">
        <span class="title-icon">📡</span>
        Status das APIs
      </h3>
      <span class="status-badge" class:badge-success={statusCounts.online === statusCounts.total} class:badge-warning={statusCounts.online < statusCounts.total}>
        {statusCounts.online}/{statusCounts.total} online
      </span>
      {#if lastCheck}
        <span class="last-check">{formatTimeSinceCheck()}</span>
      {/if}
    </div>
    
    <div class="header-right">
      <button 
        class="refresh-button"
        on:click={checkAllAPIs}
        disabled={loading}
        aria-label="Atualizar status"
        title="Verificar APIs novamente"
      >
        <svg 
          class="refresh-icon" 
          class:spinning={loading}
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
      </button>
      
      <button 
        class="toggle-button"
        on:click={() => showDetails = !showDetails}
        aria-label={showDetails ? 'Ocultar detalhes' : 'Mostrar detalhes'}
      >
        <svg 
          class="toggle-icon" 
          class:rotated={showDetails}
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
    </div>
  </div>
  
  <!-- Expandable Content -->
  {#if showDetails}
    <div class="status-content">
      <!-- Active APIs -->
      <div class="api-section">
        <h4 class="section-title">APIs Ativas</h4>
        <div class="api-list">
          {#each apiStatuses as api}
            <div class="api-item" class:api-online={api.status === 'online'} class:api-offline={api.status === 'offline'} class:api-checking={api.status === 'checking'}>
              <div class="api-main">
                <div class="api-status-indicator" title={api.status}>
                  {#if api.status === 'online'}
                    <span class="status-dot online"></span>
                  {:else if api.status === 'offline'}
                    <span class="status-dot offline"></span>
                  {:else}
                    <span class="status-dot checking"></span>
                  {/if}
                </div>
                
                <div class="api-info">
                  <div class="api-name-row">
                    <span class="api-name">{api.name}</span>
                    {#if api.free}
                      <span class="badge badge-free">Free</span>
                    {/if}
                    {#if api.latency}
                      <span class="latency">{formatLatency(api.latency)}</span>
                    {/if}
                  </div>
                  <div class="api-description">{api.description}</div>
                  {#if api.error}
                    <div class="api-error">Erro: {api.error}</div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Inactive APIs -->
      {#if inactiveAPIs.length > 0}
        <div class="api-section">
          <h4 class="section-title">APIs Desativadas</h4>
          <div class="api-list">
            {#each inactiveAPIs as api}
              <div class="api-item api-disabled">
                <div class="api-main">
                  <div class="api-status-indicator">
                    <span class="status-dot disabled"></span>
                  </div>
                  
                  <div class="api-info">
                    <div class="api-name-row">
                      <span class="api-name">{api.name}</span>
                      {#if !api.free}
                        <span class="badge badge-paid">Pago</span>
                      {/if}
                    </div>
                    <div class="api-description">{api.description}</div>
                    <div class="api-reason">{api.reason}</div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .api-status-container {
    background: transparent;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  
  /* Header */
  .status-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--color-surface-200);
  }
  
  :global(.dark) .status-header {
    border-bottom-color: var(--color-surface-700);
  }
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .status-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-surface-600);
    margin: 0;
  }
  
  :global(.dark) .status-title {
    color: #ffffff;
  }
  
  .title-icon {
    font-size: 1.25rem;
  }
  
  .status-badge {
    font-size: 0.75rem;
    font-weight: 600;
    padding: 4px 12px;
    border-radius: 12px;
    white-space: nowrap;
  }
  
  .badge-success {
    background: #10b981;
    color: white;
  }
  
  .badge-warning {
    background: #f59e0b;
    color: white;
  }
  
  .last-check {
    font-size: 0.75rem;
    color: var(--color-surface-500);
  }
  
  :global(.dark) .last-check {
    color: #d1d5db;
  }
  
  /* Header Right */
  .header-right {
    display: flex;
    gap: 8px;
  }
  
  .refresh-button,
  .toggle-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: transparent;
    border: 1px solid var(--color-surface-300);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  :global(.dark) .refresh-button,
  :global(.dark) .toggle-button {
    border-color: var(--color-surface-600);
  }
  
  .refresh-button:hover:not(:disabled),
  .toggle-button:hover {
    background: var(--color-surface-100);
    border-color: var(--color-primary-500);
  }
  
  :global(.dark) .refresh-button:hover:not(:disabled),
  :global(.dark) .toggle-button:hover {
    background: var(--color-surface-700);
    border-color: var(--color-primary-400);
  }
  
  .refresh-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .refresh-icon,
  .toggle-icon {
    width: 16px;
    height: 16px;
    color: var(--color-surface-700);
  }
  
  :global(.dark) .refresh-icon,
  :global(.dark) .toggle-icon {
    color: var(--color-surface-200);
  }
  
  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .toggle-icon {
    transition: transform 0.3s;
  }
  
  .toggle-icon.rotated {
    transform: rotate(180deg);
  }
  
  /* Content */
  .status-content {
    padding: 16px;
  }
  
  .api-section {
    margin-bottom: 20px;
  }
  
  .api-section:last-child {
    margin-bottom: 0;
  }
  
  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-surface-600);
    margin: 0 0 12px 0;
  }
  
  :global(.dark) .section-title {
    color: #d1d5db;
  }
  
  .api-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  /* API Items */
  .api-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    transition: all 0.2s;
  }
  
  .api-item.api-online {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.2);
  }
  
  .api-item.api-offline {
    background: rgba(239, 68, 68, 0.05);
    border-color: rgba(239, 68, 68, 0.2);
  }
  
  .api-item.api-checking {
    background: rgba(245, 158, 11, 0.05);
    border-color: rgba(245, 158, 11, 0.2);
  }
  
  .api-item.api-disabled {
    background: rgba(156, 163, 175, 0.05);
    border-color: rgba(156, 163, 175, 0.2);
  }
  
  :global(.dark) .api-item.api-online {
    background: rgba(16, 185, 129, 0.1);
  }
  
  :global(.dark) .api-item.api-offline {
    background: rgba(239, 68, 68, 0.1);
  }
  
  :global(.dark) .api-item.api-checking {
    background: rgba(245, 158, 11, 0.1);
  }
  
  :global(.dark) .api-item.api-disabled {
    background: rgba(156, 163, 175, 0.1);
  }
  
  .api-main {
    display: flex;
    gap: 12px;
    flex: 1;
  }
  
  .api-status-indicator {
    display: flex;
    align-items: flex-start;
    padding-top: 2px;
  }
  
  .status-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }
  
  .status-dot.online {
    background: #10b981;
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
  }
  
  .status-dot.offline {
    background: #ef4444;
    box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
  }
  
  .status-dot.checking {
    background: #f59e0b;
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
    animation: pulse 2s ease-in-out infinite;
  }
  
  .status-dot.disabled {
    background: #9ca3af;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  
  .api-info {
    flex: 1;
  }
  
  .api-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
  }
  
  .api-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-surface-700);
  }
  
  :global(.dark) .api-name {
    color: #ffffff;
  }
  
  .badge {
    font-size: 0.625rem;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  
  .badge-free {
    background: #10b981;
    color: white;
  }
  
  .badge-paid {
    background: #ef4444;
    color: white;
  }
  
  .latency {
    font-size: 0.75rem;
    color: var(--color-surface-500);
    font-family: monospace;
  }
  
  :global(.dark) .latency {
    color: #d1d5db;
  }
  
  .api-description {
    font-size: 0.75rem;
    color: var(--color-surface-500);
    margin-bottom: 2px;
  }
  
  :global(.dark) .api-description {
    color: #d1d5db;
  }
  
  .api-error {
    font-size: 0.75rem;
    color: #ef4444;
    font-style: italic;
  }
  
  :global(.dark) .api-error {
    color: #fca5a5;
  }
  
  .api-reason {
    font-size: 0.75rem;
    color: var(--color-surface-500);
    font-style: italic;
  }
  
  :global(.dark) .api-reason {
    color: #d1d5db;
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .status-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    
    .header-left {
      width: 100%;
    }
    
    .header-right {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
