<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { format } from 'date-fns';
import { getBitcoinData } from '../lib/api';
import type { BitcoinData } from '../lib/api';
import { _ } from '../lib/i18n';

// Estados para armazenar os dados
let data: BitcoinData | null = null;
let loading = true;
let error = false;
let interval: ReturnType<typeof setInterval> | null = null;

// Constantes para verificação de amplitude
const AMPLITUDE_MEDIUM = 150;
const AMPLITUDE_HIGH = 300;

// Função para formatar números com separador de milhares
function formatNumber(value: number, decimals = 2): string {
  // Obter o locale atual do navegador ou usar 'pt-BR' como padrão
  const locale = navigator.language || 'pt-BR';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

// Função para determinar a cor da variação percentual
function getPercentChangeColor(percentChange: number): string {
  return percentChange >= 0 ? 'text-success-500' : 'text-error-500';
}

// Função para determinar a cor do indicador de amplitude
function getAmplitudeColor(amplitude: number): string {
  if (amplitude > AMPLITUDE_HIGH) {
    return 'bg-error-500';
  } else if (amplitude > AMPLITUDE_MEDIUM) {
    return 'bg-warning-500';
  } else {
    return 'bg-success-500';
  }
}

// Função para calcular a porcentagem da barra de progresso
function getAmplitudePercentage(amplitude: number): number {
  // Ajuste para que a barra comece a ficar completa em 500 pontos
  const percentage = (amplitude / 500) * 100;
  return Math.min(percentage, 100); // Limitando a 100%
}

// Função para obter dados atualizados
async function fetchData() {
  try {
    loading = true;
    data = await getBitcoinData();
    error = false;
  } catch (err) {
    console.error('Erro ao atualizar dados:', err);
    error = true;
  } finally {
    loading = false;
  }
}

// Componente inicializado
onMount(async () => {
  await fetchData();
  
  // Configurar atualização automática a cada 60 segundos
  interval = setInterval(fetchData, 60000);
});

// Limpeza ao desmontar o componente
onDestroy(() => {
  if (interval) {
    clearInterval(interval);
  }
});
</script>

<div 
  class="card p-4 shadow-lg variant-filled-surface"
>
  <div class="flex justify-between items-center mb-3">
    <h1 class="h3 font-bold text-primary-500">{$_('app.title')}</h1>
  </div>
    {#if loading}
    <div class="flex justify-center items-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
    </div>{:else if error}
    <div class="card p-3 variant-filled-error rounded">
      <p class="text-center">{$_('bitcoin.error')}</p>
    </div>
  {:else if data}
    <!-- Preço principal -->
    <div class="flex items-center justify-center my-2">
      <span class="text-primary-500 mr-2 text-2xl">₿</span>
      <span class="text-4xl font-bold">${formatNumber(data.price)}</span>
    </div>
    
    <!-- Variação percentual -->
    <div class="flex justify-between items-center card variant-glass p-2 rounded mb-2">
      <span>{$_('bitcoin.variation')}</span>
      <span class={getPercentChangeColor(data.percentChange)}>
        {data.percentChange >= 0 ? '+' : ''}{formatNumber(data.percentChange)}%
      </span>
    </div>
    
    <!-- Volume 24h -->
    <div class="flex justify-between items-center card variant-glass p-2 rounded mb-2">
      <span>{$_('bitcoin.volume24h')}</span>
      <span>${formatNumber(data.volume24h)}</span>
    </div>
    
    <!-- Volume por hora (estimado) -->
    <div class="flex justify-between items-center card variant-glass p-2 rounded mb-2">
      <span>{$_('bitcoin.volumeHourly')}</span>
      <span>${formatNumber(data.volumePerHour)}</span>
    </div>
    
    <!-- Amplitude 10 minutos -->
    <div class="mb-3">
      <div class="flex justify-between items-center mb-1">
        <span>{$_('bitcoin.amplitude')}</span>
        <span>${formatNumber(data.amplitude10m)}</span>
      </div>
      <div class="progress">
        <div 
          class={`progress-bar ${getAmplitudeColor(data.amplitude10m)}`} 
          style={`width: ${getAmplitudePercentage(data.amplitude10m)}%`}
        ></div>
      </div>
    </div>
    
    <!-- Timestamp de atualização -->
    <div class="text-right text-xs mt-2">
      {$_('bitcoin.updated')} {format(data.lastUpdate, 'HH:mm:ss')}
    </div>
  {/if}
</div>

<style>
  .progress {
    height: 0.5rem;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    transition: width 0.3s ease;
  }
</style>