<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { format } from 'date-fns';
import { getBitcoinData } from '../lib/api';
import type { BitcoinData } from '../lib/api';
import { _ } from '../lib/i18n';
import CandleChart from './CandleChart.svelte';

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

// Estado para controlar o timeframe ativo
let activeTimeframe = '1h'; // Valor padrão - 1 hora

// Estado para controlar a visibilidade do gráfico
let showChart = false;

// Lista de timeframes disponíveis
const timeframes = [
  { id: '10m', label: '10m' },
  { id: '1h', label: '1h' },
  { id: '4h', label: '4h' },
  { id: '1d', label: '1d' },
  { id: '1w', label: '1w' }
];

// Função para alterar o timeframe ativo
function changeTimeframe(timeframe: string) {
  console.log(`Changing timeframe from ${activeTimeframe} to ${timeframe}`);
  console.log(`This will map to interval: ${mapTimeframeToInterval(timeframe)}`);
  activeTimeframe = timeframe;
}

// Função para mapear timeframe do rastreador para intervalo do gráfico
function mapTimeframeToInterval(timeframe: string): string {
  const timeframeMap: { [key: string]: string } = {
    '10m': '5m',   // Rastreador 10m → Gráfico 5m
    '1h': '1h',    // 1h e 1h (mantém igual)
    '4h': '4h',    // 4h e 4h (mantém igual)
    '1d': '1d',    // 1d e 1d (mantém igual)
    '1w': '1w'     // 1w e 1w (mantém igual)
  };
  
  return timeframeMap[timeframe] || '1m';
}

// Função para mapear o timeframe para os dados apropriados
function getTimeframeData(timeframe: string) {
  if (!data) return null;
  
  // Mapeia o timeframe para as propriedades adequadas no objeto de dados
  // Cada objeto contém o valor de amplitude, alto e baixo para o timeframe
  const timeframeMap = {
    '10m': {
      amplitude: data.amplitude10m,
      highPrice: data.highPrice10m,
      lowPrice: data.lowPrice10m,
      volume: data.volume10m,
      percentChange: data.percentChange10m
    },
    '1h': {
      amplitude: data.amplitude1h,
      highPrice: data.highPrice1h,
      lowPrice: data.lowPrice1h,
      volume: data.volume1h,
      percentChange: data.percentChange1h
    },
    '4h': {
      amplitude: data.amplitude4h,
      highPrice: data.highPrice4h,
      lowPrice: data.lowPrice4h,
      volume: data.volume4h,
      percentChange: data.percentChange4h
    },
    '1d': {
      amplitude: data.amplitude1d,
      highPrice: data.highPrice1d,
      lowPrice: data.lowPrice1d,
      volume: data.volume1d,
      percentChange: data.percentChange1d
    },
    '1w': {
      amplitude: data.amplitude1w,
      highPrice: data.highPrice1w,
      lowPrice: data.lowPrice1w,
      volume: data.volume1w,
      percentChange: data.percentChange1w
    }
  };
  
  return timeframeMap[timeframe as keyof typeof timeframeMap];
}

// Constante para o intervalo de atualização (em ms)
const UPDATE_INTERVAL = 15000; // 15 segundos para teste, deve ser 60000 (60s) em produção

// Valores de amplitude para cada timeframe
const AMPLITUDE_THRESHOLDS = {
  '10m': {
    MEDIUM: 150,
    HIGH: 300
  },
  '1h': {
    MEDIUM: 450,
    HIGH: 900
  },
  '4h': {
    MEDIUM: 900,
    HIGH: 1800
  },
  '1d': {
    MEDIUM: 1350,
    HIGH: 2700
  },
  '1w': {
    MEDIUM: 2500,
    HIGH: 5000
  }
};

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

// Função para determinar a cor do indicador de amplitude
function getAmplitudeColor(amplitude: number, timeframe: string): string {
  const thresholds = AMPLITUDE_THRESHOLDS[timeframe as keyof typeof AMPLITUDE_THRESHOLDS];
  const timeframeData = getTimeframeData(timeframe);
  
  if (!timeframeData) return 'bg-gray-500'; // Fallback para cinza se não tiver dados
  
  // Amplitude baixa (menor que MEDIUM) - cinza
  if (amplitude < thresholds.MEDIUM) {
    return 'bg-gray-500';
  }
  
  // Amplitude média (entre MEDIUM e HIGH) - amarelo
  if (amplitude >= thresholds.MEDIUM && amplitude < thresholds.HIGH) {
    return 'bg-warning-500';
  }
  
  // Amplitude alta (maior ou igual a HIGH) - verde ou vermelho dependendo da direção
  if (amplitude >= thresholds.HIGH) {
    // Verifica se a tendência é positiva ou negativa usando percentChange
    const isPositive = timeframeData.percentChange >= 0;
    // Verde para positiva forte, vermelho para negativa forte
    return isPositive ? 'bg-success-500' : 'bg-error-500';
  }
  
  // Fallback para cinza caso alguma condição não seja coberta
  return 'bg-gray-500';
}

// Função para calcular a porcentagem da barra de progresso
function getAmplitudePercentage(amplitude: number, timeframe: string): number {
  // Usa o valor HIGH do timeframe específico como referência para 100%
  const maxValue = AMPLITUDE_THRESHOLDS[timeframe as keyof typeof AMPLITUDE_THRESHOLDS].HIGH * 1.66;
  const percentage = (amplitude / maxValue) * 100;
  return Math.min(percentage, 100); // Limitando a 100%
}

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

<!-- Container principal responsivo -->
<div class="w-full max-w-6xl mx-auto space-y-6 p-4">
  <!-- Seção do Bitcoin Tracker -->
  <div 
    class="card p-4 shadow-lg variant-filled-surface w-full relative"
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
    
    <!-- Seletor de Timeframes -->
    <div class="flex justify-center space-x-1 mb-4">
      {#each timeframes as timeframe}
        <button 
          class="timeframe-btn {activeTimeframe === timeframe.id ? 'active' : ''}"
          on:click={() => changeTimeframe(timeframe.id)}
          title={$_(`bitcoin.timeframe${timeframe.id}Info`)}
        >
          {timeframe.label}
        </button>
      {/each}
    </div>
    
    {#if getTimeframeData(activeTimeframe)}
      {@const timeframeData = getTimeframeData(activeTimeframe)}
      
      {#if timeframeData}
        <!-- Variação percentual do timeframe selecionado -->
        <div class="flex justify-between items-center card variant-glass p-2 rounded mb-2">
          <span>{$_('bitcoin.variation')} ({activeTimeframe})</span>
          <span class={getPercentChangeColor(timeframeData.percentChange)}>
            {timeframeData.percentChange >= 0 ? '+' : ''}{formatNumber(timeframeData.percentChange)}%
          </span>
        </div>
        
        <!-- Volume do timeframe selecionado -->
        <div class="flex justify-between items-center card variant-glass p-2 rounded mb-2">
          <span>{$_('bitcoin.volume')} ({activeTimeframe})</span>
          <span>${formatNumber(timeframeData.volume)}</span>
        </div>
        
        <!-- Amplitude do Timeframe selecionado -->
        <div class="mb-3">
          <div class="flex justify-between items-center mb-1">
            <span>{$_(`bitcoin.amplitude${activeTimeframe}`)}</span>
            <span>${formatNumber(timeframeData.amplitude)}</span>
          </div>
          <div class="progress">
            <div 
              class={`progress-bar ${getAmplitudeColor(timeframeData.amplitude, activeTimeframe)}`} 
              style={`width: ${getAmplitudePercentage(timeframeData.amplitude, activeTimeframe)}%`}
            ></div>
          </div>
        </div>
        
        <!-- Preço mais alto e mais baixo do período -->
        <div class="flex justify-between mb-2">
          <div class="text-sm">
            <span class="text-success-500">▲</span> ${formatNumber(timeframeData.highPrice)}
          </div>
          <div class="text-sm">
            <span class="text-error-500">▼</span> ${formatNumber(timeframeData.lowPrice)}
          </div>
        </div>
      {/if}
      
      <!-- Informações específicas por timeframe -->
      {#if activeTimeframe === '10m'}
        <div class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400">
          {$_('bitcoin.timeframe10mInfo')}
        </div>
      {:else if activeTimeframe === '1h'}
        <div class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400">
          {$_('bitcoin.timeframe1hInfo')}
        </div>
      {:else if activeTimeframe === '4h'}
        <div class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400">
          {$_('bitcoin.timeframe4hInfo')}
        </div>
      {:else if activeTimeframe === '1d'}
        <div class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400">
          {$_('bitcoin.timeframe1dInfo')}
        </div>
      {:else if activeTimeframe === '1w'}
        <div class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400">
          {$_('bitcoin.timeframe1wInfo')}
        </div>
      {/if}
    {/if}
      
    <!-- Timestamp de atualização -->
    <div class="text-right text-xs mt-4 flex items-center justify-end">
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

  <!-- Seção do Gráfico de Candles -->
  {#if showChart}
    <div class="card p-4 shadow-lg variant-filled-surface w-full">
      <div class="text-center mb-4">
        <h2 class="h4 font-bold text-primary-500">📊 Gráfico de Candles</h2>
      </div>
      
      <!-- Componente do gráfico de candles -->
      <div class="w-full">
        {#key activeTimeframe}
          <CandleChart 
            symbol="BTCUSDT" 
            interval={mapTimeframeToInterval(activeTimeframe)}
          />
        {/key}
      </div>
    </div>
  {/if}

  <!-- Botão para mostrar/ocultar gráfico -->
  <div class="text-center">
    <button 
      class="btn variant-filled-primary"
      on:click={() => showChart = !showChart}
    >
      {showChart ? '📈 Ocultar Gráfico' : '📊 Mostrar Gráfico'}
    </button>
  </div>
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
    /* Estilo para os botões de timeframe */
  .timeframe-btn {
    border: 1px solid var(--color-primary-300);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    min-width: 3rem;
    position: relative;
    overflow: hidden;
  }
  
  .timeframe-btn:hover {
    background-color: var(--color-primary-100);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
    .timeframe-btn.active {
    background-color: var(--color-primary-500);
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  .timeframe-btn.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: white;
    opacity: 0.7;
  }
</style>