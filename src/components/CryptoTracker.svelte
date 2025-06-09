<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { format } from 'date-fns';
import { getCryptoData } from '../lib/crypto-api';
import type { CryptoConfig, CryptoData } from '../lib/crypto-config';
import { _ } from '../lib/i18n';
import CandleChart from './CandleChart.svelte';

// Props obrigatórias
export let config: CryptoConfig;

// Estados para armazenar os dados
export let data: CryptoData | null = null;
let loading = true; // Apenas para o carregamento inicial
let updating = false; // Estado para indicar atualização em andamento
let error = false;
let interval: ReturnType<typeof setInterval> | null = null;
let nextUpdateTime: Date | null = null;
let lastUpdated: Date | null = null;
let timeLeftStr = '';
let updateTimer: ReturnType<typeof setInterval> | null = null;
let lastData: CryptoData | null = null; // Para persistência do último estado válido

// Estados exportados para serem compartilhados com TaapiIndicators
export { loading };
export let atrError: string | null = null;
export let lastATRCheck: Date | null = null; // Para controlar quando foi a última verificação de ATR
export let nextATRCheck: Date | null = null; // Para mostrar quando será a próxima verificação de ATR

// Estado para controlar o timeframe ativo
let activeTimeframe = '1h'; // Valor padrão - 1 hora

// Estado para controlar a visibilidade do gráfico
let showChart = true;

// Variável para rastrear o config anterior para detectar mudanças
let previousConfigId: string | null = null;

// Reatividade: Reinicializa os dados quando o config da criptomoeda muda
$: if (config && config.id !== previousConfigId) {
  console.log(`Config changed from ${previousConfigId} to ${config.id}, reinitializing...`);
  reinitializeForNewCrypto();
  previousConfigId = config.id;
}

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

// Função pública para forçar atualização de ATR (chamada pelo componente pai)
export function triggerATRUpdate() {
  fetchData(false, true);
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

// Constantes para intervalos de atualização (em ms)
const UPDATE_INTERVAL = 15000; // 15 segundos para dados da criptomoeda
const ATR_CHECK_INTERVAL = 300000; // 5 minutos para verificar ATR (mais conservador)

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
    timeLeftStr = 'atualizando...';
    
    // Verificar se o intervalo ainda está funcionando se o tempo já passou
    if (!updating && diff < -5000) { // Se 5 segundos se passaram após o tempo previsto
      console.log('Verificando intervalo de atualização...');
      
      // Se não estiver atualizando e o tempo já passou, talvez o intervalo parou
      if (interval) {
        console.log('Forçando uma nova atualização...');
        fetchData(false, false); // Não força ATR, apenas dados da criptomoeda
      } else {
        console.log('Intervalo perdido, recriando...');
        interval = setInterval(async () => {
          console.log('Executando atualização automática (recriada):', new Date().toLocaleTimeString());
          await fetchData(false, false); // Atualização regular, não força ATR
        }, UPDATE_INTERVAL);
        
        // Forçar uma atualização imediata
        fetchData(false, false);
      }
    }
  } else {
    const seconds = Math.floor(diff / 1000);
    timeLeftStr = `em ${seconds}s`;
  }
}

// Função para determinar a cor da amplitude com base nos thresholds
function getAmplitudeColor(amplitude: number, timeframe: string): string {
  const thresholds = AMPLITUDE_THRESHOLDS[timeframe as keyof typeof AMPLITUDE_THRESHOLDS];
  
  if (amplitude > thresholds.HIGH) {
    return 'bg-error-500';
  } else if (amplitude > thresholds.MEDIUM) {
    return 'bg-warning-500';
  } else {
    return 'bg-success-500';
  }
}

// Função para calcular o percentual da amplitude para a barra de progresso
function getAmplitudePercentage(amplitude: number, timeframe: string): number {
  const thresholds = AMPLITUDE_THRESHOLDS[timeframe as keyof typeof AMPLITUDE_THRESHOLDS];
  const maxValue = thresholds.HIGH * 5/3; // 5/3 do threshold HIGH como máximo
  const percentage = (amplitude / maxValue) * 100;
  return Math.min(percentage, 100); // Limitar a 100%
}

// Função para formatar números com separadores locais
function formatNumber(value: number, decimals: number = config.precision): string {
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

// Função para verificar se deve atualizar dados ATR
function shouldUpdateATR(): boolean {
  if (!lastATRCheck) return true; // Primeira vez
  
  const now = new Date();
  const timeSinceLastCheck = now.getTime() - lastATRCheck.getTime();
  
  return timeSinceLastCheck >= ATR_CHECK_INTERVAL;
}

// Função para obter dados atualizados
async function fetchData(isInitialLoad = false, forceATRUpdate = false) {
  try {
    console.log(`Atualizando dados do ${config.name}... (carregamento inicial: ${isInitialLoad})`);
    
    if (isInitialLoad) {
      loading = true;
    } else {
      updating = true;
    }
    
    // Determinar se deve atualizar ATR
    const shouldCheckATR = forceATRUpdate || shouldUpdateATR();
    
    if (shouldCheckATR) {
      console.log(`Verificando dados ATR para ${config.name}...`);
      // Clear previous ATR error only when checking ATR
      atrError = null;
    }
    
    const newData = await getCryptoData(config, { checkATR: shouldCheckATR });
    
    // Se não verificamos ATR mas tínhamos dados anteriores, preserve-os
    if (!shouldCheckATR && data?.atr14Daily) {
      newData.atr14Daily = data.atr14Daily;
      newData.atrLastUpdated = data.atrLastUpdated;
    }
    
    data = newData;
    error = false;
    
    // Atualizar timestamp de verificação ATR se foi verificado
    if (shouldCheckATR) {
      lastATRCheck = new Date();
      nextATRCheck = new Date(lastATRCheck.getTime() + ATR_CHECK_INTERVAL);
      console.log(`ATR verificado às ${lastATRCheck.toLocaleTimeString()}, próxima verificação às ${nextATRCheck.toLocaleTimeString()}`);
    }
    
    // Registrar o momento da atualização dos dados da criptomoeda
    lastUpdated = new Date();
    // Definir o próximo tempo de atualização dos dados da criptomoeda
    nextUpdateTime = new Date(lastUpdated.getTime() + UPDATE_INTERVAL);
    
    // Salvar último estado válido para persistência
    if (newData) {
      lastData = { ...newData };
    }
    
    console.log(`Dados do ${config.name} atualizados: ${lastUpdated?.toLocaleTimeString()}`);
    console.log(`Próxima atualização: ${nextUpdateTime?.toLocaleTimeString()}`);
    
    // Garantir que o contador está funcionando
    if (!updateTimer) {
      console.log('Iniciando contador regressivo...');
      updateTimer = setInterval(() => {
        updateTimeLeft();
      }, 1000);
    }
  } catch (err) {
    console.error(`Erro ao atualizar dados do ${config.name}:`, err);
    error = true;
    
    // Check if it's a TAAPI-specific error only if we were checking ATR
    const wasCheckingATR = forceATRUpdate || shouldUpdateATR();
    if (wasCheckingATR && err instanceof Error && err.message.includes('Request failed with status code')) {
      atrError = err.message;
    }
    
    // Usar dados anteriores se disponíveis
    if (lastData && !isInitialLoad) {
      console.log(`Usando último estado válido dos dados do ${config.name}...`);
      data = lastData;
      error = false; // Não mostrar mensagem de erro pois temos dados para exibir
    }
  } finally {
    loading = false;
    updating = false;
  }
}

// Função para reinicializar dados ao mudar de criptomoeda
async function reinitializeForNewCrypto() {
  console.log(`Reinicializando para nova criptomoeda: ${config.name}`);
  
  // Limpar intervalos existentes
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
  
  // Resetar estados
  data = null;
  loading = true;
  updating = false;
  error = false;
  nextUpdateTime = null;
  lastUpdated = null;  timeLeftStr = '';
  lastData = null;
  atrError = null;
  lastATRCheck = null;
  nextATRCheck = null;
  // Manter o gráfico aberto ao trocar de crypto
  // showChart permanece como está
  
  // Buscar dados da nova criptomoeda
  try {
    await fetchData(true, true); // Carregamento inicial incluindo ATR
    
    // Configurar próxima atualização
    nextUpdateTime = new Date(new Date().getTime() + UPDATE_INTERVAL);
    
    // Configurar novo intervalo de atualização
    interval = setInterval(async () => {
      console.log(`Executando atualização automática para ${config.name}:`, new Date().toLocaleTimeString());
      await fetchData(false, false);
    }, UPDATE_INTERVAL);
    
    // Reiniciar contador visual
    updateTimer = setInterval(() => {
      updateTimeLeft();
    }, 1000);
    
    console.log(`Reinicialização completa para ${config.name}`);
  } catch (error) {
    console.error(`Erro na reinicialização para ${config.name}:`, error);
  }
}

// Função para realizar atualização manual
async function manualUpdate() {
  if (updating) return; // Evitar múltiplas atualizações simultâneas
  
  console.log(`Atualização manual solicitada para ${config.name} - incluindo verificação de ATR`);
  await fetchData(false, true); // Força atualização do ATR na atualização manual
  
  // Reiniciar o intervalo para evitar atualizações muito próximas
  if (interval) {
    clearInterval(interval);
    interval = setInterval(async () => {
      console.log(`Executando atualização automática após manual para ${config.name}:`, new Date().toLocaleTimeString());
      await fetchData(false, false); // Atualização regular após manual
    }, UPDATE_INTERVAL);
    
    console.log('Intervalo de atualização reconfigurado após manual');
  }
}

// Componente inicializado
onMount(async () => {
  try {
    console.log(`Inicializando componente para ${config.name}...`);
    
    await fetchData(true, true); // Carregamento inicial incluindo ATR
    
    // Garantir que o timer inicial é definido corretamente
    if (!nextUpdateTime) {
      nextUpdateTime = new Date(new Date().getTime() + UPDATE_INTERVAL);
      console.log('Próxima atualização definida para:', nextUpdateTime.toLocaleTimeString());
    }
    
    // Configurar atualização automática
    if (interval) clearInterval(interval);
    
    interval = setInterval(async () => {
      console.log(`Executando atualização automática para ${config.name}:`, new Date().toLocaleTimeString());
      await fetchData(false, false); // Atualização regular, ATR verificado conforme necessário
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
    console.error(`Erro na inicialização do componente para ${config.name}:`, error);
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

<!-- Container principal responsivo com altura adaptável -->
<div class="w-full mx-auto px-2 py-1">
  <!-- Layout responsivo: lado a lado em telas grandes, empilhado em telas pequenas -->
  <div class="flex flex-col xl:flex-row gap-3 xl:items-start">
    <!-- Seção do Crypto Tracker (dados) -->
    <div class="xl:w-1/2 flex-shrink-0 flex flex-col">
      <div
        class="card p-3 shadow-lg variant-filled-surface w-full relative crypto-tracker"
        style="--crypto-color: {config.color}"
      >
        {#if updating}
          <div class="absolute top-0 left-0 w-full h-1 z-10">
            <div class="h-full bg-primary-300 animate-progress"></div>
          </div>
        {/if}
        
        <!-- Header compacto -->
        <div class="text-center mb-2 relative">
          <h1 class="text-lg font-bold" style="color: var(--crypto-color)">
            {$_('crypto.tracker.title', { values: { name: config.name } })}
          </h1>
          <p class="text-xs text-gray-600 dark:text-gray-400">
            {$_(`crypto.${config.id}.description`)}
          </p>
            <!-- Botão de atualização manual temático -->
          <button 
            class="absolute right-0 top-0 p-1 btn-refresh transition-colors text-sm" 
            title="Atualizar dados manualmente" 
            onclick={() => {
              console.log('Botão de atualização clicado');
              manualUpdate();
            }}
            disabled={updating}
          >
            <span class={updating ? "animate-spin" : ""}>⟳</span>
          </button>
        </div>

        {#if loading}
          <div class="flex justify-center items-center py-4">
            <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        {:else if error}
          <div class="card p-2 variant-filled-error rounded">
            <p class="text-center text-sm">{$_('bitcoin.error')}</p>
          </div>
        {:else if data}
          <!-- Preço principal compacto -->
          <div class="flex items-center justify-center my-1">
            <span class="mr-2 text-lg" style="color: var(--crypto-color)">{config.icon}</span>
            <span class="text-2xl font-bold">${formatNumber(data.price)}</span>
          </div>
          
          <!-- Seletor de Timeframes compacto -->
          <div class="flex justify-center space-x-1 mb-2">
            {#each timeframes as timeframe}
              <button 
                class="timeframe-btn-compact {activeTimeframe === timeframe.id ? 'active' : ''}"
                onclick={() => changeTimeframe(timeframe.id)}
                title={$_(`bitcoin.timeframe${timeframe.id}Info`)}
              >
                {timeframe.label}
              </button>
            {/each}
          </div>
          
          {#if getTimeframeData(activeTimeframe)}
            {@const timeframeData = getTimeframeData(activeTimeframe)}
            
            {#if timeframeData}
              <!-- Dados do timeframe em cards compactos -->
              <div class="space-y-1 mb-2">
                <!-- Variação percentual -->
                <div class="flex justify-between items-center card variant-glass p-1 rounded text-sm">
                  <span>{$_('bitcoin.variation')} ({activeTimeframe})</span>
                  <span class={getPercentChangeColor(timeframeData.percentChange)}>
                    {timeframeData.percentChange >= 0 ? '+' : ''}{formatNumber(timeframeData.percentChange)}%
                  </span>
                </div>
                
                <!-- Volume -->
                <div class="flex justify-between items-center card variant-glass p-1 rounded text-sm">
                  <span>{$_('bitcoin.volume')} ({activeTimeframe})</span>
                  <span>${formatNumber(timeframeData.volume)}</span>
                </div>
                
                <!-- Amplitude compacta -->
                <div class="mb-2">
                  <div class="flex justify-between items-center mb-1 text-sm">
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
                
                <!-- Preços alto/baixo compactos -->
                <div class="flex justify-between text-xs">
                  <div>
                    <span class="text-success-500">▲</span> ${formatNumber(timeframeData.highPrice)}
                  </div>
                  <div>
                    <span class="text-error-500">▼</span> ${formatNumber(timeframeData.lowPrice)}
                  </div>
                </div>
              </div>
            {/if}
            
            <!-- Informações específicas por timeframe compactas -->
            {#if activeTimeframe === '10m'}
              <div class="text-xs text-center mt-1 mb-1 text-gray-600 dark:text-gray-400">
                {$_('bitcoin.timeframe10mInfo')}
              </div>
            {:else if activeTimeframe === '1h'}
              <div class="text-xs text-center mt-1 mb-1 text-gray-600 dark:text-gray-400">
                {$_('bitcoin.timeframe1hInfo')}
              </div>
            {:else if activeTimeframe === '4h'}
              <div class="text-xs text-center mt-1 mb-1 text-gray-600 dark:text-gray-400">
                {$_('bitcoin.timeframe4hInfo')}
              </div>
            {:else if activeTimeframe === '1d'}
              <div class="text-xs text-center mt-1 mb-1 text-gray-600 dark:text-gray-400">
                {$_('bitcoin.timeframe1dInfo')}
              </div>
            {:else if activeTimeframe === '1w'}
              <div class="text-xs text-center mt-1 mb-1 text-gray-600 dark:text-gray-400">
                {$_('bitcoin.timeframe1wInfo')}
              </div>
            {/if}
          {/if}
          
          <!-- Timestamp de atualização compacto -->
          <div class="text-right text-xs mt-2">
            <div class="flex items-center justify-end mb-1">
              {#if updating}
                <span class="animate-pulse mr-1">⟳</span>
              {/if}
              {$_('bitcoin.updated')} {format(data.lastUpdate, 'HH:mm:ss')}
              <span class="ml-1 text-primary-500" title="Próxima atualização dos dados da criptomoeda">
                ({timeLeftStr})
              </span>
            </div>
            {#if lastATRCheck && nextATRCheck}
              <div class="text-xs text-surface-600-300-token">
                ATR: {format(lastATRCheck, 'HH:mm:ss')}
                <span class="ml-1" title="Próxima verificação de ATR">
                  (próx. {format(nextATRCheck, 'HH:mm')})
                </span>
              </div>
            {/if}
          </div>
        {/if}
      </div>      <!-- Botão para mostrar/ocultar gráfico temático -->
      <div class="text-center mt-2 space-y-2">
        <button 
          class="btn-crypto-theme btn-sm"
          onclick={() => showChart = !showChart}
        >
          {showChart ? '📈 Ocultar Gráfico' : '📊 Mostrar Gráfico'}
        </button>
          <!-- Dica sobre maximização do gráfico -->
        {#if showChart}
          <div class="maximize-hint">
            <span class="text-sm text-gray-600 dark:text-gray-400">
              💡 Clique no botão ⛶ no canto superior direito do gráfico para maximizar
            </span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Seção do Gráfico de Candles -->
    {#if showChart}
      <div class="xl:w-1/2 flex-shrink-0">
        <div class="card p-3 shadow-lg variant-filled-surface w-full">
          <div class="text-center mb-2">
            <h2 class="text-lg font-bold text-primary-500">📊 Gráfico de Candles</h2>
          </div>
            <!-- Container do gráfico -->
          <div class="w-full">
            <CandleChart 
              symbol={config.binanceSymbol}
              interval={mapTimeframeToInterval(activeTimeframe)}
              activeTimeframe={activeTimeframe}
              onTimeframeChange={changeTimeframe}
            />
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .crypto-tracker {
    border-left: 4px solid var(--crypto-color);
  }
    .timeframe-btn {
    padding: 0.5rem 1rem;
    border: 1px solid transparent;
    border-radius: 0.375rem;
    background-color: var(--color-surface-200);
    color: var(--color-surface-700);
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
  }
  
  .timeframe-btn:hover {
    background-color: var(--color-surface-300);
    color: var(--color-surface-900);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
    .timeframe-btn.active {
    background-color: var(--color-primary-500);
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
  
  /* Dark mode adjustments for timeframe buttons */
  :global(.dark) .timeframe-btn {
    background-color: var(--color-surface-700);
    color: var(--color-surface-200);
  }
  
  :global(.dark) .timeframe-btn:hover {
    background-color: var(--color-surface-600);
    color: var(--color-surface-100);
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
  
  .progress {
    width: 100%;
    height: 8px;
    background-color: var(--color-surface-200);
    border-radius: 4px;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  @keyframes progress {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
  
  .animate-progress {
    position: relative;
    overflow: hidden;
  }
  
  .animate-progress::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: progress 1.5s infinite;
  }
    /* Botões de timeframe compactos com cor da criptomoeda */
  .timeframe-btn-compact {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--crypto-color, var(--color-surface-300));
    border-radius: 0.25rem;
    background-color: transparent;
    color: var(--crypto-color, var(--color-surface-700));
    font-size: 0.75rem;
    font-weight: 500;
    transition: all 0.2s ease;
    cursor: pointer;
    position: relative;
    min-width: 2rem;
  }
  
  .timeframe-btn-compact:hover {
    background-color: var(--crypto-color, var(--color-primary-500));
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    border-color: var(--crypto-color, var(--color-primary-500));
  }
  
  .timeframe-btn-compact.active {
    background-color: var(--crypto-color, var(--color-primary-500));
    border-color: var(--crypto-color, var(--color-primary-500));
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
  
  .timeframe-btn-compact.active::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: white;
    opacity: 0.8;
  }

  /* Estilos para modo escuro - melhora contraste */
  :global(.dark) .timeframe-btn-compact {
    border-color: var(--crypto-color, var(--color-primary-400));
    color: var(--crypto-color, var(--color-primary-400));
    background-color: rgba(0, 0, 0, 0.3);
  }
  
  :global(.dark) .timeframe-btn-compact:hover {
    background-color: var(--crypto-color, var(--color-primary-500));
    color: white;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4);
    border-color: var(--crypto-color, var(--color-primary-500));
  }
  
  :global(.dark) .timeframe-btn-compact.active {
    background-color: var(--crypto-color, var(--color-primary-500));
    border-color: var(--crypto-color, var(--color-primary-500));
    color: white;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  }

  /* Estilos para o botão de gráfico com tema da criptomoeda */
  .btn-crypto-theme {
    padding: 0.5rem 1rem;
    border: 2px solid var(--crypto-color, var(--color-primary-500));
    border-radius: 0.375rem;
    background-color: var(--crypto-color, var(--color-primary-500));
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.3s ease;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    text-transform: none;
    letter-spacing: 0.025em;
  }
  
  .btn-crypto-theme:hover {
    background-color: transparent;
    color: var(--crypto-color, var(--color-primary-500));
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
  
  .btn-crypto-theme:active {
    transform: translateY(0);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
  }

  /* Modo escuro - ajustes para melhor contraste */
  :global(.dark) .btn-crypto-theme {
    background-color: var(--crypto-color, var(--color-primary-500));
    border-color: var(--crypto-color, var(--color-primary-500));
    color: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  :global(.dark) .btn-crypto-theme:hover {
    background-color: rgba(0, 0, 0, 0.2);
    color: var(--crypto-color, var(--color-primary-400));
    border-color: var(--crypto-color, var(--color-primary-400));
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
  
  /* Botão de refresh temático */
  .btn-refresh {
    color: var(--crypto-color, var(--color-primary-500));
    border: 1px solid transparent;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }
  
  .btn-refresh:hover {
    color: white;
    background-color: var(--crypto-color, var(--color-primary-500));
    border-color: var(--crypto-color, var(--color-primary-500));
    transform: scale(1.1);
  }
  
  .btn-refresh:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
    /* Modo escuro */
  :global(.dark) .btn-refresh {
    color: var(--crypto-color, var(--color-primary-400));
  }
  
  :global(.dark) .btn-refresh:hover {
    color: white;
    background-color: var(--crypto-color, var(--color-primary-500));
    border-color: var(--crypto-color, var(--color-primary-500));
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  /* Estilo para dica de maximização */
  .maximize-hint {
    margin-top: 8px;
    padding: 8px 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 6px;
    text-align: center;
  }
  
  :global(.dark) .maximize-hint {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.3);
  }
</style>
