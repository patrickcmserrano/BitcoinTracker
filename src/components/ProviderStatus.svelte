<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import type { ProviderStatus } from '../lib/domain/interfaces';
import { BitcoinTrackingService } from '../lib/services/bitcoin-tracking-service';

// Props
export let trackingService: BitcoinTrackingService | null = null;

// State
let providerStatuses: Map<string, ProviderStatus> = new Map();
let activeProvider = '';
let isExpanded = false;
let isLoading = false;

// Auto-create service if not provided
if (!trackingService) {
  trackingService = new BitcoinTrackingService();
}

// Load initial status
onMount(async () => {
  if (trackingService) {
    await loadProviderStatuses();
    
    // Set up periodic health checks
    const healthCheckInterval = setInterval(async () => {
      if (trackingService) {
        await trackingService.performHealthCheck();
        await loadProviderStatuses();
      }
    }, 30000); // Check every 30 seconds
    
    // Clean up on destroy
    onDestroy(() => {
      clearInterval(healthCheckInterval);
    });
  }
});

async function loadProviderStatuses() {
  if (!trackingService) return;
  
  try {
    providerStatuses = trackingService.getProviderStatuses();
    
    // Find active provider
    for (const [providerId, status] of providerStatuses) {
      if (status.isActive) {
        activeProvider = providerId;
        break;
      }
    }
  } catch (error) {
    console.error('Error loading provider statuses:', error);
  }
}

async function switchProvider(providerId: string) {
  if (!trackingService || isLoading) return;
  
  isLoading = true;
  try {
    const success = await trackingService.switchProvider(providerId);
    if (success) {
      activeProvider = providerId;
      await loadProviderStatuses();
      console.log(`Switched to provider: ${providerId}`);
    } else {
      console.error(`Failed to switch to provider: ${providerId}`);
    }
  } catch (error) {
    console.error('Error switching provider:', error);
  } finally {
    isLoading = false;
  }
}

async function performHealthCheck() {
  if (!trackingService || isLoading) return;
  
  isLoading = true;
  try {
    await trackingService.performHealthCheck();
    await loadProviderStatuses();
  } catch (error) {
    console.error('Error performing health check:', error);
  } finally {
    isLoading = false;
  }
}

function getStatusColor(status: ProviderStatus): string {
  if (!status.isHealthy) return 'text-red-500';
  if (status.responseTime > 2000) return 'text-yellow-500';
  return 'text-green-500';
}

function getStatusIcon(status: ProviderStatus): string {
  if (!status.isHealthy) return '❌';
  if (status.responseTime > 2000) return '⚠️';
  return '✅';
}

function formatResponseTime(ms: number): string {
  if (ms === 0) return '-';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatLastCheck(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.round(diffMs / 1000);
  
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.round(diffSeconds / 60)}m ago`;
  return date.toLocaleTimeString();
}
</script>

<div class="provider-status-card">
  <!-- Compact header -->
  <div 
    class="status-header"
    on:click={() => isExpanded = !isExpanded}
    on:keydown={(e) => e.key === 'Enter' && (isExpanded = !isExpanded)}
    role="button"
    tabindex="0"
  >
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
        Data Provider:
      </span>
      <span class="font-semibold text-primary-600 dark:text-primary-400">
        {activeProvider || 'None'}
      </span>
      {#if activeProvider && providerStatuses.has(activeProvider)}
        {@const status = providerStatuses.get(activeProvider)}
        <span class={`status-icon ${getStatusColor(status)}`}>
          {getStatusIcon(status)}
        </span>
      {/if}
    </div>
    
    <div class="flex items-center gap-2">
      {#if isLoading}
        <div class="loading-spinner"></div>
      {/if}
      <button 
        class="expand-button"
        title={isExpanded ? 'Collapse' : 'Expand'}
        aria-label={isExpanded ? 'Collapse provider status' : 'Expand provider status'}
      >
        {isExpanded ? '▲' : '▼'}
      </button>
    </div>
  </div>

  <!-- Expanded details -->
  {#if isExpanded}
    <div class="status-details">
      <!-- Controls -->
      <div class="controls-row">
        <button 
          class="health-check-btn"
          on:click={performHealthCheck}
          disabled={isLoading}
          title="Perform health check on all providers"
        >
          🔄 Health Check
        </button>
        
        <div class="providers-count">
          {Array.from(providerStatuses.values()).filter(s => s.isHealthy).length} / {providerStatuses.size} healthy
        </div>
      </div>

      <!-- Provider list -->
      <div class="providers-list">
        {#each Array.from(providerStatuses.entries()) as [providerId, status]}
          <div class="provider-row {status.isActive ? 'active' : ''}">
            <div class="provider-info">
              <div class="provider-header">
                <div class="provider-name">
                  <span class={`status-icon ${getStatusColor(status)}`}>
                    {getStatusIcon(status)}
                  </span>
                  <span class="name-text">{providerId}</span>
                  <span class="priority-badge">P{status.priority}</span>
                  {#if status.isActive}
                    <span class="active-badge">ACTIVE</span>
                  {/if}
                </div>
                
                {#if !status.isActive && status.isHealthy}
                  <button 
                    class="switch-btn"
                    on:click={() => switchProvider(providerId)}
                    disabled={isLoading}
                    title="Switch to this provider"
                  >
                    Switch
                  </button>
                {/if}
              </div>
              
              <div class="provider-stats">
                <div class="stat">
                  <span class="stat-label">Response:</span>
                  <span class="stat-value">{formatResponseTime(status.responseTime)}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Failures:</span>
                  <span class="stat-value">{status.consecutiveFailures}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Last Check:</span>
                  <span class="stat-value">{formatLastCheck(status.lastCheck)}</span>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
.provider-status-card {
  background: var(--color-surface-100);
  border: 1px solid var(--color-surface-300);
  border-radius: 8px;
  overflow: hidden;
  font-size: 0.875rem;
}

:global(.dark) .provider-status-card {
  background: var(--color-surface-800);
  border-color: var(--color-surface-600);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.status-header:hover {
  background: var(--color-surface-200);
}

:global(.dark) .status-header:hover {
  background: var(--color-surface-700);
}

.status-icon {
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

.expand-button {
  background: none;
  border: none;
  color: var(--color-surface-600);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 2px 4px;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.expand-button:hover {
  background: var(--color-surface-300);
}

:global(.dark) .expand-button {
  color: var(--color-surface-400);
}

:global(.dark) .expand-button:hover {
  background: var(--color-surface-600);
}

.loading-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-surface-300);
  border-top: 2px solid var(--color-primary-500);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.status-details {
  border-top: 1px solid var(--color-surface-300);
  background: var(--color-surface-50);
}

:global(.dark) .status-details {
  border-color: var(--color-surface-600);
  background: var(--color-surface-900);
}

.controls-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-surface-200);
}

:global(.dark) .controls-row {
  border-color: var(--color-surface-700);
}

.health-check-btn {
  background: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.health-check-btn:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.health-check-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.providers-count {
  font-size: 0.75rem;
  color: var(--color-surface-600);
}

.providers-list {
  padding: 8px;
}

.provider-row {
  margin: 2px 0;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.provider-row.active {
  background: var(--color-primary-100);
  border: 1px solid var(--color-primary-300);
}

:global(.dark) .provider-row.active {
  background: var(--color-primary-900);
  border-color: var(--color-primary-700);
}

.provider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.provider-name {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.name-text {
  font-weight: 500;
  text-transform: capitalize;
}

.priority-badge {
  background: var(--color-surface-300);
  color: var(--color-surface-700);
  padding: 1px 4px;
  border-radius: 8px;
  font-size: 0.6rem;
  font-weight: 600;
}

:global(.dark) .priority-badge {
  background: var(--color-surface-600);
  color: var(--color-surface-200);
}

.active-badge {
  background: var(--color-primary-500);
  color: white;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 0.6rem;
  font-weight: 600;
}

.switch-btn {
  background: var(--color-success-500);
  color: white;
  border: none;
  border-radius: 3px;
  padding: 2px 8px;
  font-size: 0.7rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.switch-btn:hover:not(:disabled) {
  background: var(--color-success-600);
}

.switch-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.provider-stats {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.stat {
  display: flex;
  gap: 3px;
  align-items: center;
}

.stat-label {
  color: var(--color-surface-600);
  font-size: 0.7rem;
}

.stat-value {
  font-weight: 500;
  font-size: 0.7rem;
  color: var(--color-surface-800);
}

:global(.dark) .stat-label {
  color: var(--color-surface-400);
}

:global(.dark) .stat-value {
  color: var(--color-surface-200);
}
</style>
