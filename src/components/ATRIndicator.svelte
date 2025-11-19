<script lang="ts">
  import { _ } from '../lib/i18n';
  
  export let atr14Daily: number | undefined;
  export let atrLastUpdated: Date | undefined;
  export let loading: boolean = false;
  export let error: string | null = null;
  
  // Format ATR value with appropriate precision
  function formatATR(value: number): string {
    if (value >= 1000) {
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      });
    } else if (value >= 100) {
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 1, 
        maximumFractionDigits: 1 
      });
    } else {
      return value.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      });
    }
  }
  
  // Format timestamp
  function formatTimestamp(date: Date): string {
    return date.toLocaleTimeString();
  }
  
  // Get error message for display
  function getErrorMessage(): string {
    if (error?.includes('401')) {
      return 'Invalid API key';
    } else if (error?.includes('429')) {
      return 'Rate limit exceeded';
    } else if (error?.includes('Network Error') || error?.includes('timeout')) {
      return 'Network error';
    } else {
      return 'Service unavailable';
    }
  }
</script>

<div class="bg-surface-100-800-token rounded-lg p-4 border border-surface-300-600-token">
  <div class="flex items-center justify-between mb-2">
    <h3 class="text-lg font-semibold text-surface-900-50-token">
      ATR14 Daily
    </h3>
    <div class="flex items-center gap-2">
      {#if loading}
        <div class="animate-spin w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full"></div>
      {/if}
      <span class="text-xs text-surface-600-300-token">
        TAAPI.IO
      </span>
    </div>
  </div>
  
  <div class="space-y-2">
    {#if atr14Daily !== undefined}
      <div class="flex items-baseline gap-2">
        <span class="text-2xl font-bold text-primary-700 dark:text-primary-300">
          ${formatATR(atr14Daily)}
        </span>
        <span class="text-sm text-surface-600-300-token">
          USD
        </span>
      </div>
      
      {#if atrLastUpdated}
        <div class="text-xs text-surface-500-400-token">
          Last updated: {formatTimestamp(atrLastUpdated)}
        </div>
      {/if}
      
      <div class="text-xs text-surface-600-300-token">
        Average True Range (14-day period)
      </div>
    {:else if error}
      <div class="flex items-center gap-2 text-error-500">
        <div class="w-4 h-4 rounded-full bg-error-500"></div>
        <span class="text-sm">
          {getErrorMessage()}
        </span>
      </div>
      <div class="text-xs text-surface-600-300-token">
        {#if error.includes('401')}
          Please check your TAAPI.IO API key
        {:else if error.includes('429')}
          Please wait before retrying
        {:else}
          ATR data temporarily unavailable
        {/if}
      </div>
    {:else}
      <div class="flex items-center gap-2 text-surface-500-400-token">
        <div class="w-4 h-4 rounded-full bg-warning-500"></div>
        <span class="text-sm">
          ATR data not available
        </span>
      </div>
      <div class="text-xs text-surface-600-300-token">
        Check TAAPI.IO configuration
      </div>
    {/if}
  </div>
</div>

<style>
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
