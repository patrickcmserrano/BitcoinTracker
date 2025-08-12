<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ChartLibrary } from '../lib/charts/chart-manager';

  export let availableLibraries: { id: ChartLibrary; name: string; description: string }[] = [];
  export let currentLibrary: ChartLibrary | null = null;
  export let performanceMetrics = { renderTime: 0, dataPoints: 0, memoryUsage: 0 };
  export let showAdvanced = false;

  const dispatch = createEventDispatcher();

  // Service combinations
  interface ServiceCombination {
    id: string;
    name: string;
    description: string;
    chartLibrary: ChartLibrary;
    priceProvider: 'binance' | 'coinbase' | 'taapi';
    indicators: string[];
    features: string[];
    performance: 'high' | 'medium' | 'low';
    reliability: 'high' | 'medium' | 'low';
  }

  const serviceCombinations: ServiceCombination[] = [
    {
      id: 'performance',
      name: 'High Performance',
      description: 'Optimized for speed and real-time updates',
      chartLibrary: 'lightweight-charts',
      priceProvider: 'binance',
      indicators: ['SMA', 'EMA', 'ATR'],
      features: ['Real-time updates', 'WebGL rendering', 'Touch gestures'],
      performance: 'high',
      reliability: 'high'
    },
    {
      id: 'feature-rich',
      name: 'Feature Rich',
      description: 'Full feature set with advanced indicators',
      chartLibrary: 'chart-js',
      priceProvider: 'taapi',
      indicators: ['SMA', 'EMA', 'RSI', 'MACD', 'Bollinger Bands', 'ATR'],
      features: ['Advanced indicators', 'Custom overlays', 'Export options', 'Annotations'],
      performance: 'medium',
      reliability: 'medium'
    },
    {
      id: 'reliable',
      name: 'Most Reliable',
      description: 'Zero-dependency fallback, always works',
      chartLibrary: 'canvas-fallback',
      priceProvider: 'coinbase',
      indicators: ['SMA', 'EMA'],
      features: ['Zero dependencies', 'Offline capable', 'Lightweight'],
      performance: 'low',
      reliability: 'high'
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Good balance of features and performance',
      chartLibrary: 'lightweight-charts',
      priceProvider: 'coinbase',
      indicators: ['SMA', 'EMA', 'RSI', 'ATR'],
      features: ['Smooth animations', 'Touch support', 'Responsive design'],
      performance: 'high',
      reliability: 'high'
    }
  ];

  let selectedCombination: ServiceCombination | null = null;

  function selectCombination(combination: ServiceCombination) {
    selectedCombination = combination;
    dispatch('combinationSelected', combination);
  }

  function selectLibrary(libraryId: ChartLibrary) {
    dispatch('librarySelected', { library: libraryId });
  }

  function getPerformanceColor(level: 'high' | 'medium' | 'low') {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-red-600 bg-red-50';
    }
  }

  function getReliabilityColor(level: 'high' | 'medium' | 'low') {
    switch (level) {
      case 'high': return 'text-blue-600 bg-blue-50';
      case 'medium': return 'text-purple-600 bg-purple-50';
      case 'low': return 'text-gray-600 bg-gray-50';
    }
  }
</script>

<div class="service-selector p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
  <h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
    Choose Service Configuration
  </h3>
  
  <!-- Predefined Combinations -->
  <div class="mb-6">
    <h4 class="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">
      Recommended Combinations
    </h4>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      {#each serviceCombinations as combination}
        <div 
          class="combination-card p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer transition-all hover:shadow-md {selectedCombination?.id === combination.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:border-gray-300'}"
          on:click={() => selectCombination(combination)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && selectCombination(combination)}
        >
          <div class="flex items-start justify-between mb-2">
            <h5 class="font-semibold text-gray-900 dark:text-gray-100">
              {combination.name}
            </h5>
            <div class="flex space-x-1">
              <span class="px-2 py-1 text-xs rounded-full {getPerformanceColor(combination.performance)}">
                {combination.performance} perf
              </span>
              <span class="px-2 py-1 text-xs rounded-full {getReliabilityColor(combination.reliability)}">
                {combination.reliability} rel
              </span>
            </div>
          </div>
          
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {combination.description}
          </p>
          
          <div class="space-y-2">
            <div class="flex items-center text-xs">
              <span class="w-16 text-gray-500">Chart:</span>
              <span class="font-medium text-gray-700 dark:text-gray-300">
                {availableLibraries.find(lib => lib.id === combination.chartLibrary)?.name || combination.chartLibrary}
              </span>
            </div>
            
            <div class="flex items-center text-xs">
              <span class="w-16 text-gray-500">Data:</span>
              <span class="font-medium text-gray-700 dark:text-gray-300 capitalize">
                {combination.priceProvider}
              </span>
            </div>
            
            <div class="flex items-start text-xs">
              <span class="w-16 text-gray-500 mt-0.5">Features:</span>
              <div class="flex flex-wrap gap-1">
                {#each combination.features.slice(0, 3) as feature}
                  <span class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                    {feature}
                  </span>
                {/each}
                {#if combination.features.length > 3}
                  <span class="text-gray-500">+{combination.features.length - 3} more</span>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Advanced Manual Selection -->
  <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
    <button
      on:click={() => showAdvanced = !showAdvanced}
      class="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-3"
    >
      <svg class="w-4 h-4 mr-1 transition-transform {showAdvanced ? 'rotate-90' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
      </svg>
      Advanced Configuration
    </button>

    {#if showAdvanced}
      <div class="space-y-4">
        <div>
          <h6 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Chart Library
          </h6>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3" role="group" aria-labelledby="chart-library-heading">
            {#each availableLibraries as library}
              <button
                on:click={() => selectLibrary(library.id)}
                class="p-3 text-left border border-gray-200 dark:border-gray-700 rounded-lg transition-all hover:border-gray-300 {currentLibrary === library.id ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}"
              >
                <div class="flex items-center justify-between mb-1">
                  <h6 class="font-medium text-gray-900 dark:text-gray-100">
                    {library.name}
                  </h6>
                  {#if currentLibrary === library.id}
                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                  {/if}
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400">
                  {library.description}
                </p>
              </button>
            {/each}
          </div>
        </div>

        <!-- Performance Metrics -->
        {#if currentLibrary}
          <div class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
            <h6 class="font-medium text-gray-900 dark:text-gray-100 mb-2">Current Performance</h6>
            <div class="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span class="text-gray-600 dark:text-gray-400">Render Time:</span>
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {performanceMetrics.renderTime.toFixed(1)}ms
                </div>
              </div>
              <div>
                <span class="text-gray-600 dark:text-gray-400">Data Points:</span>
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {performanceMetrics.dataPoints}
                </div>
              </div>
              <div>
                <span class="text-gray-600 dark:text-gray-400">Memory:</span>
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Action Buttons -->
  {#if selectedCombination}
    <div class="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div class="text-sm">
        <span class="text-gray-600 dark:text-gray-400">Selected:</span>
        <span class="font-medium text-gray-900 dark:text-gray-100 ml-1">
          {selectedCombination.name}
        </span>
      </div>
      
      <div class="flex space-x-2">
        <button
          on:click={() => selectedCombination = null}
          class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          Cancel
        </button>
        <button
          on:click={() => dispatch('applyConfiguration', selectedCombination)}
          class="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
        >
          Apply Configuration
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .combination-card:focus {
    outline: none;
  }
</style>
