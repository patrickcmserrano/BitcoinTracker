<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { format } from 'date-fns';
import { getBitcoinData } from '../lib/api';
import type { BitcoinData } from '../lib/api';
import { _ } from '../lib/i18n';

// Estados para armazenar os dados
let data: BitcoinData | null = null;
let loading = true; // Apenas para o carregamento inicial
let updating = false; // Estado para indicar atualização em andamento
let error = false;
let interval: ReturnType<typeof setInterval> | null = null;
let nextUpdateTime: Date | null = null;
let lastUpdated: Date | null = null;
let timeLeftStr = '';
let updateTimer: ReturnType<typeof setInterval> | null = null;
let lastData: BitcoinData | null = null; // Para persistência do último estado válido

// Constante para o intervalo de atualização (em ms)
const UPDATE_INTERVAL = 15000; // 15 segundos para teste, deve ser 60000 (60s) em produção

// Função para atualizar o contador regressivo
function updateTimeLeft() {
  if (!nextUpdateTime) {
    timeLeftStr = 'aguardando...';
    return;
  }
  
  const now = new Date();
  const diff = nextUpdateTime.getTime() - now.getTime();
  
  if (diff <= 0) {
    timeLeftStr = 'em breve...';
    
    // Verificar se o intervalo ainda está funcionando se o tempo já passou
    if (!updating && diff < -5000) { // Se 5 segundos se passaram após o tempo previsto
      console.log('Verificando intervalo de atualização...');
      
      // Se não estiver atualizando e o tempo já passou, talvez o intervalo parou
      if (interval) {
        console.log('Forçando uma nova atualização...');
        fetchData(false);
      } else {
        console.log('Intervalo perdido, recriando...');
        interval = setInterval(async () => {
          console.log('Executando atualização automática (recriada):', new Date().toLocaleTimeString());
          await fetchData(false);
        }, UPDATE_INTERVAL);
        
        // Forçar uma atualização imediata
        fetchData(false);
      }
    }
  } else {
    const seconds = Math.floor(diff / 1000);
    timeLeftStr = `em ${seconds}s`;
  }
}

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
async function fetchData(isInitialLoad = false) {
  try {
    console.log(`Atualizando dados... (carregamento inicial: ${isInitialLoad})`);
    
    if (isInitialLoad) {
      loading = true;
    } else {
      updating = true;
    }
    
    const newData = await getBitcoinData();
    data = newData;
    error = false;
    
    // Registrar o momento da atualização
    lastUpdated = new Date();
    // Definir o próximo tempo de atualização
    nextUpdateTime = new Date(lastUpdated.getTime() + UPDATE_INTERVAL);
    
    // Salvar último estado válido para persistência
    if (newData) {
      lastData = { ...newData };
    }
    
    console.log(`Dados atualizados: ${lastUpdated?.toLocaleTimeString()}`);
    console.log(`Próxima atualização: ${nextUpdateTime?.toLocaleTimeString()}`);
    
    // Garantir que o contador está funcionando
    if (!updateTimer) {
      console.log('Iniciando contador regressivo...');
      updateTimer = setInterval(() => {
        updateTimeLeft();
      }, 1000);
    }
  } catch (err) {
    console.error('Erro ao atualizar dados:', err);
    error = true;
    
    // Usar dados anteriores se disponíveis
    if (lastData && !isInitialLoad) {
      console.log('Usando último estado válido dos dados...');
      data = lastData;
      error = false; // Não mostrar mensagem de erro pois temos dados para exibir
    }
  } finally {
    loading = false;
    updating = false;
  }
}

// Função para realizar atualização manual
async function manualUpdate() {
  if (updating) return; // Evitar múltiplas atualizações simultâneas
  
  console.log('Atualização manual solicitada');
  await fetchData(false);
  
  // Reiniciar o intervalo para evitar atualizações muito próximas
  if (interval) {
    clearInterval(interval);
    
    interval = setInterval(async () => {
      console.log('Executando atualização automática após manual:', new Date().toLocaleTimeString());
      await fetchData(false);
    }, UPDATE_INTERVAL);
    
    console.log('Intervalo de atualização reconfigurado após manual');
  }
}

// Componente inicializado
onMount(async () => {
  try {
    console.log('Inicializando componente...');
    await fetchData(true); // Indicar que é o carregamento inicial
    
    // Garantir que o timer inicial é definido corretamente
    if (!nextUpdateTime) {
      nextUpdateTime = new Date(new Date().getTime() + UPDATE_INTERVAL);
      console.log('Próxima atualização definida para:', nextUpdateTime.toLocaleTimeString());
    }
    
    // Configurar atualização automática
    if (interval) clearInterval(interval);
    
    interval = setInterval(async () => {
      console.log('Executando atualização automática:', new Date().toLocaleTimeString());
      await fetchData(false);
      console.log('Dados atualizados com sucesso');
    }, UPDATE_INTERVAL);
    
    console.log('Intervalo de atualização configurado:', interval);
    
    // Iniciar contador visual para mostrar o tempo até a próxima atualização
    if (updateTimer) clearInterval(updateTimer);
    
    updateTimer = setInterval(() => {
      updateTimeLeft();
    }, 1000);
    
    console.log('Contador regressivo iniciado');
  } catch (error) {
    console.error('Erro na inicialização do componente:', error);
    throw error;
  }
});

// Limpeza ao desmontar o componente
onDestroy(() => {
  if (interval) {
    console.log('Limpando intervalo de dados:', interval);
    clearInterval(interval);
    interval = null;
  }
  
  if (updateTimer) {
    console.log('Limpando intervalo do contador:', updateTimer);
    clearInterval(updateTimer);
    updateTimer = null;
  }
});
</script>

<div 
  class="card p-4 shadow-lg variant-filled-surface max-w-2xl mx-auto relative"
>
  {#if updating}
    <div class="absolute top-0 left-0 w-full h-1">
      <div class="h-full bg-primary-300 animate-progress"></div>
    </div>
  {/if}
  <div class="text-center mb-3 relative">
    <h1 class="h3 font-bold text-primary-500">{$_('app.title')}</h1>
    <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">{$_('app.subtitle')}</p>
    <!-- Botão de atualização manual -->
    <button 
      class="absolute right-0 top-0 p-2 text-primary-500 hover:text-primary-700 transition-colors" 
      title="Atualizar dados manualmente" 
      on:click={() => {
        console.log('Botão de atualização clicado');
        manualUpdate();
      }}
      disabled={updating}
    >
      <span class={updating ? "animate-spin" : ""}>⟳</span>
    </button>
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
        <span>{$_('bitcoin.amplitude10m')}</span>
        <span>${formatNumber(data.amplitude10m)}</span>
      </div>
      <div class="progress">
        <div 
          class={`progress-bar ${getAmplitudeColor(data.amplitude10m)}`} 
          style={`width: ${getAmplitudePercentage(data.amplitude10m)}%`}
        ></div>
      </div>
    </div>
    
    <!-- Amplitude 60 minutos -->
    <div class="mb-3">
      <div class="flex justify-between items-center mb-1">
        <span>{$_('bitcoin.amplitude1h')}</span>
        <span>${formatNumber(data.amplitude1h)}</span>
      </div>
      <div class="progress">
        <div 
          class={`progress-bar ${getAmplitudeColor(data.amplitude1h)}`} 
          style={`width: ${getAmplitudePercentage(data.amplitude1h)}%`}
        ></div>
      </div>
    </div>
    
    <!-- Amplitude 240 minutos (4 horas) -->
    <div class="mb-3">
      <div class="flex justify-between items-center mb-1">
        <span>{$_('bitcoin.amplitude4h')}</span>
        <span>${formatNumber(data.amplitude4h)}</span>
      </div>
      <div class="progress">
        <div 
          class={`progress-bar ${getAmplitudeColor(data.amplitude4h)}`} 
          style={`width: ${getAmplitudePercentage(data.amplitude4h)}%`}
        ></div>
      </div>
    </div>
    
    <!-- Amplitude 1 dia -->
    <div class="mb-3">
      <div class="flex justify-between items-center mb-1">
        <span>{$_('bitcoin.amplitude1d')}</span>
        <span>${formatNumber(data.amplitude1d)}</span>
      </div>
      <div class="progress">
        <div 
          class={`progress-bar ${getAmplitudeColor(data.amplitude1d)}`} 
          style={`width: ${getAmplitudePercentage(data.amplitude1d)}%`}
        ></div>
      </div>
    </div>
    
    <!-- Amplitude semanal -->
    <div class="mb-3">
      <div class="flex justify-between items-center mb-1">
        <span>{$_('bitcoin.amplitude1w')}</span>
        <span>${formatNumber(data.amplitude1w)}</span>
      </div>
      <div class="progress">
        <div 
          class={`progress-bar ${getAmplitudeColor(data.amplitude1w)}`} 
          style={`width: ${getAmplitudePercentage(data.amplitude1w)}%`}
        ></div>
      </div>
    </div>
      <!-- Timestamp de atualização -->
    <div class="text-right text-xs mt-2 flex items-center justify-end">
      {#if updating}
        <span class="animate-pulse mr-1">⟳</span>
      {/if}
      {$_('bitcoin.updated')} {format(data.lastUpdate, 'HH:mm:ss')}
      <span class="ml-1 text-primary-500" title="Tempo até próxima atualização">
        ({timeLeftStr})
      </span>
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
  
  @keyframes progressAnimation {
    0% { width: 0%; }
    50% { width: 70%; }
    100% { width: 100%; }
  }
  
  .animate-progress {
    animation: progressAnimation 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    background: linear-gradient(90deg, transparent, var(--color-primary-300), transparent);
    opacity: 0.7;
  }
</style>