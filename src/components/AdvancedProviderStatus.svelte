<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { AdvancedPriceDataService, ProviderStatus } from '../lib/services/advanced-price-data-service';
  import { CircuitState } from '../lib/services/circuit-breaker';

  export let priceDataService: AdvancedPriceDataService;

  let providerStatuses = new Map<string, ProviderStatus>();
  let chainStatus: Array<{
    providerId: string;
    priority: number;
    isHealthy: boolean;
    responseTime?: number;
    position: number;
  }> = [];
  let isExpanded = false;
  let autoRefresh = true;
  let refreshInterval: NodeJS.Timeout | null = null;

  // Status change listener
  const handleStatusChange = (statuses: Map<string, ProviderStatus>) => {
    providerStatuses = new Map(statuses);
  };

  // Refresh chain status
  const refreshChainStatus = async () => {
    try {
      chainStatus = await priceDataService.getChainStatus();
    } catch (error) {
      console.error('Failed to refresh chain status:', error);
    }
  };

  // Switch provider
  const switchProvider = async (providerId: string) => {
    try {
      const success = await priceDataService.switchProvider(providerId);
      if (success) {
        await refreshChainStatus();
      }
    } catch (error) {
      console.error(`Failed to switch to provider ${providerId}:`, error);
    }
  };

  // Force circuit breaker state
  const forceCircuit = (providerId: string, state: 'open' | 'closed') => {
    const success = priceDataService.forceCircuitBreaker(providerId, state);
    if (success) {
      // Status will be updated through the listener
      console.log(`Circuit breaker ${state} for ${providerId}`);
    }
  };

  // Trigger health check
  const triggerHealthCheck = async () => {
    try {
      await priceDataService.performHealthCheck();
      await refreshChainStatus();
    } catch (error) {
      console.error('Failed to perform health check:', error);
    }
  };

  // Get circuit state color
  const getCircuitStateColor = (state: CircuitState) => {
    switch (state) {
      case CircuitState.CLOSED:
        return 'text-green-600';
      case CircuitState.OPEN:
        return 'text-red-600';
      case CircuitState.HALF_OPEN:
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get health indicator color
  const getHealthColor = (isHealthy: boolean, circuitState: CircuitState) => {
    if (circuitState === CircuitState.OPEN) return 'text-red-600';
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  // Format response time
  const formatResponseTime = (time?: number) => {
    if (time === undefined || time === 0) return 'N/A';
    return `${Math.round(time)}ms`;
  };

  // Format uptime percentage
  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(1)}%`;
  };

  onMount(() => {
    // Add status change listener
    priceDataService.onStatusChange(handleStatusChange);
    
    // Initial load
    providerStatuses = priceDataService.getProviderStatuses();
    refreshChainStatus();

    // Set up auto refresh
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        refreshChainStatus();
      }, 5000); // Refresh every 5 seconds
    }
  });

  onDestroy(() => {
    // Remove status change listener
    priceDataService.removeStatusChangeListener(handleStatusChange);
    
    // Clear refresh interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  $: providersArray = Array.from(providerStatuses.values()).sort((a, b) => a.priority - b.priority);
  $: activeProvider = providersArray.find(p => p.isActive);
  $: healthyCount = providersArray.filter(p => p.isHealthy && p.circuitState === CircuitState.CLOSED).length;
  $: totalCount = providersArray.length;
</script>

<div class="advanced-provider-status bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
  <!-- Header -->
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center space-x-3">
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 rounded-full {healthyCount === totalCount ? 'bg-green-500' : healthyCount > 0 ? 'bg-yellow-500' : 'bg-red-500'}"></div>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Advanced Provider Status</h3>
      </div>
      <span class="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
        {healthyCount}/{totalCount} Healthy
      </span>
    </div>
    
    <div class="flex items-center space-x-2">
      <button
        on:click={triggerHealthCheck}
        class="px-3 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
        title="Refresh Health Check"
      >
        🔄
      </button>
      
      <button
        on:click={() => isExpanded = !isExpanded}
        class="px-3 py-1 text-sm bg-gray-500 hover:bg-gray-600 text-white rounded transition-colors"
      >
        {isExpanded ? 'Collapse' : 'Expand'}
      </button>
    </div>
  </div>

  <!-- Active Provider Summary -->
  {#if activeProvider}
    <div class="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div class="flex items-center justify-between">
        <div>
          <span class="text-sm font-medium text-blue-900 dark:text-blue-100">Active Provider:</span>
          <span class="ml-2 font-bold text-blue-900 dark:text-blue-100">{activeProvider.providerId.toUpperCase()}</span>
        </div>
        <div class="flex items-center space-x-4 text-sm text-blue-700 dark:text-blue-300">
          <div class="flex items-center space-x-1">
            <span class="w-2 h-2 rounded-full {getHealthColor(activeProvider.isHealthy, activeProvider.circuitState)}"></span>
            <span>{activeProvider.isHealthy ? 'Healthy' : 'Unhealthy'}</span>
          </div>
          <div class="flex items-center space-x-1">
            <span class="w-2 h-2 rounded-full {getCircuitStateColor(activeProvider.circuitState)}"></span>
            <span>{activeProvider.circuitState}</span>
          </div>
          <span>Response: {formatResponseTime(activeProvider.responseTime)}</span>
          <span>Uptime: {formatUptime(activeProvider.circuitStats.uptime)}</span>
        </div>
      </div>
    </div>
  {/if}

  <!-- Provider List -->
  <div class="space-y-2">
    {#each providersArray as provider}
      <div class="provider-row p-3 border border-gray-200 dark:border-gray-600 rounded-lg {provider.isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700' : 'bg-gray-50 dark:bg-gray-700'}">
        <div class="flex items-center justify-between">
          <!-- Provider Info -->
          <div class="flex items-center space-x-3">
            <div class="flex items-center space-x-2">
              <div class="w-3 h-3 rounded-full {getHealthColor(provider.isHealthy, provider.circuitState)}"></div>
              <span class="font-semibold text-gray-900 dark:text-white">
                {provider.providerId.toUpperCase()}
              </span>
              {#if provider.isActive}
                <span class="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">ACTIVE</span>
              {/if}
            </div>
            
            <div class="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-300">
              <span>Priority: {provider.priority}</span>
              <span>Response: {formatResponseTime(provider.responseTime)}</span>
              
              <!-- Circuit State -->
              <div class="flex items-center space-x-1">
                <span class="w-2 h-2 rounded-full {getCircuitStateColor(provider.circuitState)}"></span>
                <span class="{getCircuitStateColor(provider.circuitState)}">{provider.circuitState}</span>
              </div>
              
              {#if provider.consecutiveFailures > 0}
                <span class="text-red-600">Failures: {provider.consecutiveFailures}</span>
              {/if}
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center space-x-2">
            {#if !provider.isActive}
              <button
                on:click={() => switchProvider(provider.providerId)}
                class="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded transition-colors disabled:opacity-50"
                disabled={!provider.isHealthy || provider.circuitState === CircuitState.OPEN}
              >
                Switch
              </button>
            {/if}
            
            <!-- Circuit Breaker Controls -->
            {#if provider.circuitState === CircuitState.CLOSED}
              <button
                on:click={() => forceCircuit(provider.providerId, 'open')}
                class="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                title="Force Circuit Open"
              >
                Open Circuit
              </button>
            {:else if provider.circuitState === CircuitState.OPEN}
              <button
                on:click={() => forceCircuit(provider.providerId, 'closed')}
                class="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded transition-colors"
                title="Force Circuit Closed"
              >
                Close Circuit
              </button>
            {/if}
          </div>
        </div>

        <!-- Expanded Details -->
        {#if isExpanded}
          <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span class="text-gray-500 dark:text-gray-400">Total Requests:</span>
                <span class="ml-1 font-medium">{provider.circuitStats.totalRequests}</span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Success Rate:</span>
                <span class="ml-1 font-medium">{formatUptime(provider.circuitStats.uptime)}</span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Recent Failures:</span>
                <span class="ml-1 font-medium text-red-600">{provider.circuitStats.failureCount}</span>
              </div>
              <div>
                <span class="text-gray-500 dark:text-gray-400">Last Check:</span>
                <span class="ml-1 font-medium">{provider.lastCheck.toLocaleTimeString()}</span>
              </div>
            </div>
            
            {#if provider.circuitStats.lastFailureTime || provider.circuitStats.lastSuccessTime}
              <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {#if provider.circuitStats.lastFailureTime}
                  <div>
                    <span class="text-gray-500 dark:text-gray-400">Last Failure:</span>
                    <span class="ml-1 font-medium text-red-600">
                      {provider.circuitStats.lastFailureTime.toLocaleString()}
                    </span>
                  </div>
                {/if}
                {#if provider.circuitStats.lastSuccessTime}
                  <div>
                    <span class="text-gray-500 dark:text-gray-400">Last Success:</span>
                    <span class="ml-1 font-medium text-green-600">
                      {provider.circuitStats.lastSuccessTime.toLocaleString()}
                    </span>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Chain Status -->
  {#if isExpanded && chainStatus.length > 0}
    <div class="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
      <h4 class="text-md font-semibold text-gray-900 dark:text-white mb-3">Failover Chain Order</h4>
      <div class="flex items-center space-x-2">
        {#each chainStatus as item, index}
          <div class="flex items-center">
            <div class="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span class="text-sm font-medium">{index + 1}.</span>
              <span class="w-2 h-2 rounded-full {item.isHealthy ? 'bg-green-500' : 'bg-red-500'}"></span>
              <span class="text-sm font-medium">{item.providerId.toUpperCase()}</span>
              {#if item.responseTime}
                <span class="text-xs text-gray-500">({formatResponseTime(item.responseTime)})</span>
              {/if}
            </div>
            {#if index < chainStatus.length - 1}
              <div class="mx-2 text-gray-400">→</div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Auto Refresh Toggle -->
  <div class="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex items-center justify-between text-sm">
    <div class="flex items-center space-x-2">
      <input
        type="checkbox"
        id="auto-refresh"
        bind:checked={autoRefresh}
        on:change={() => {
          if (autoRefresh) {
            refreshInterval = setInterval(() => {
              refreshChainStatus();
            }, 5000);
          } else if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
          }
        }}
        class="rounded"
      >
      <label for="auto-refresh" class="text-gray-600 dark:text-gray-300">Auto-refresh (5s)</label>
    </div>
    
    <div class="text-gray-500 dark:text-gray-400">
      Last updated: {new Date().toLocaleTimeString()}
    </div>
  </div>
</div>

<style>
  .advanced-provider-status {
    min-width: 800px;
  }
  
  .provider-row {
    transition: all 0.2s ease-in-out;
  }
  
  .provider-row:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  @media (max-width: 768px) {
    .advanced-provider-status {
      min-width: unset;
    }
  }
</style>
