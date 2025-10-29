<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { format } from 'date-fns';
import type { CryptoConfig, CryptoData } from '../lib/crypto-config';
import { _ } from '../lib/i18n';
import CandleChart from './CandleChart.svelte';
import CryptoIcon from './CryptoIcon.svelte';
import { selectNextCrypto, selectPreviousCrypto, loadCryptoData, updateCryptoData } from '../lib/crypto-store';
import { setupSwipeGestures, isTouchDevice } from '../lib/swipe-gestures';

// Props obrigatórias
export let config: CryptoConfig;

// Estados para armazenar os dados
export let data: CryptoData | null = null;
let loading = false;
let initialLoad = true;
let updating = false;
let error = false;
let interval: ReturnType<typeof setInterval> | null = null;
let nextUpdateTime: Date | null = null;
let lastUpdated: Date | null = null;
let timeLeftStr = '';
let updateTimer: ReturnType<typeof setInterval> | null = null;

// Estados exportados para serem compartilhados
export { loading };
export let atrError: string | null = null;
export let lastATRCheck: Date | null = null;
export let nextATRCheck: Date | null = null;

// Estado para controlar o timeframe ativo
export let activeTimeframe = '1h';

// Estado para controlar a visibilidade do gráfico
let showChart = true;

// Variável para rastrear o config anterior para detectar mudanças
let previousConfigId: string | null = null;

// Swipe gesture variables
let swipeContainer: HTMLElement;
let swipeCleanup: (() => void) | null = null;
let isSwipeTransitioning = false;
let swipeIndicator = '';

// Reatividade: Reinicializa os dados quando o config da criptomoeda muda
$: if (config && config.id !== previousConfigId) {
  console.log(`Config changed from ${previousConfigId} to ${config.id}, reinitializing...`);
  reinitializeForNewCrypto();
  previousConfigId = config.id;
}

// Lista de timeframes disponíveis
const timeframes = [
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
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
    '5m': '5m',    // 5m e 5m (mantém igual)
    '15m': '15m',  // 15m e 15m (mantém igual)
    '1h': '1h',    // 1h e 1h (mantém igual)
    '4h': '4h',    // 4h e 4h (mantém igual)
    '1d': '1d',    // 1d e 1d (mantém igual)
    '1w': '1w'     // 1w e 1w (mantém igual)
  };
  
  return timeframeMap[timeframe] || '1h';
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
    '5m': {
      amplitude: data.amplitude10m, // Usando dados de 10m como fallback
      highPrice: data.highPrice10m,
      lowPrice: data.lowPrice10m,
      volume: data.volume10m,
      percentChange: data.percentChange10m
    },
    '15m': {
      amplitude: data.amplitude1h, // Usando dados de 1h como aproximação
      highPrice: data.highPrice1h,
      lowPrice: data.lowPrice1h,
      volume: data.volume1h,
      percentChange: data.percentChange1h
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
const ATR_CHECK_INTERVAL = 300000; // 5 minutos para verificar ATR

// Função para verificar se deve atualizar dados ATR
function shouldUpdateATR(): boolean {
  if (!lastATRCheck) return true;
  
  const now = new Date();
  const timeSinceLastCheck = now.getTime() - lastATRCheck.getTime();
  
  return timeSinceLastCheck >= ATR_CHECK_INTERVAL;
}

// Função para obter dados atualizados usando a store
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
      atrError = null;
    }
    
    // Usar a função da store para carregar dados
    if (isInitialLoad) {
      await loadCryptoData(config, { checkATR: shouldCheckATR, forceRefresh: false });
    } else {
      await updateCryptoData(config, { checkATR: shouldCheckATR });
    }
    
    // Os dados já estão na store, apenas precisamos atualizar o binding local
    // O componente pai (App.svelte) já está observando a store e passando os dados via props
    
    error = false;
    initialLoad = false;
    
    // Atualizar timestamp de verificação ATR se foi verificado
    if (shouldCheckATR) {
      lastATRCheck = new Date();
      nextATRCheck = new Date(lastATRCheck.getTime() + ATR_CHECK_INTERVAL);
      console.log(`ATR verificado às ${lastATRCheck.toLocaleTimeString()}, próxima verificação às ${nextATRCheck.toLocaleTimeString()}`);
    }
    
    // Registrar o momento da atualização
    lastUpdated = new Date();
    nextUpdateTime = new Date(lastUpdated.getTime() + UPDATE_INTERVAL);
    
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
    
    // Check if it's a TAAPI-specific error
    const wasCheckingATR = forceATRUpdate || shouldUpdateATR();
    if (wasCheckingATR && err instanceof Error && err.message.includes('Request failed with status code')) {
      atrError = err.message;
    }
  } finally {
    loading = false;
    updating = false;
  }
}

// Valores de amplitude para cada timeframe
const AMPLITUDE_THRESHOLDS = {
  '5m': {
    MEDIUM: 100,
    HIGH: 200
  },
  '15m': {
    MEDIUM: 200,
    HIGH: 400
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
  loading = true;
  updating = false;
  error = false;
  nextUpdateTime = null;
  lastUpdated = null;
  timeLeftStr = '';
  atrError = null;
  lastATRCheck = null;
  nextATRCheck = null;
  initialLoad = true;
  
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

// Swipe gesture functions
function handleSwipeNext() {
  if (isSwipeTransitioning) return;
  
  isSwipeTransitioning = true;
  swipeIndicator = 'next';
  
  setTimeout(() => {
    selectNextCrypto();
    isSwipeTransitioning = false;
    swipeIndicator = '';
  }, 150);
}

function handleSwipePrevious() {
  if (isSwipeTransitioning) return;
  
  isSwipeTransitioning = true;
  swipeIndicator = 'previous';
  
  setTimeout(() => {
    selectPreviousCrypto();
    isSwipeTransitioning = false;
    swipeIndicator = '';
  }, 150);
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
    
    // Setup swipe gestures for touch devices
    if (isTouchDevice() && swipeContainer) {
      swipeCleanup = setupSwipeGestures(swipeContainer, {
        onSwipeLeft: () => {
          if (!isSwipeTransitioning) {
            handleSwipeNext();
          }
        },
        onSwipeRight: () => {
          if (!isSwipeTransitioning) {
            handleSwipePrevious();
          }
        },
        onSwipeStart: () => {
          swipeIndicator = '';
        }
      }, {
        minSwipeDistance: 60,
        maxSwipeTime: 400,
        preventScroll: true,
        excludeSelectors: ['.card'] // Excluir o card do gráfico dos gestos de swipe
      });
      console.log('Swipe gestures configurados para', config.name);
    }
    
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
  
  // Cleanup swipe gestures
  if (swipeCleanup) {
    swipeCleanup();
    swipeCleanup = null;
  }
});
</script>

<!-- Container principal responsivo com altura adaptável para viewport completo -->
<div class="w-full h-full mx-auto px-2 py-1" bind:this={swipeContainer}>
  <!-- Layout responsivo: empilhado verticalmente em todas as telas -->
  <div class="flex flex-col gap-3">
    <!-- Seção do Gráfico de Candles -->
    {#if showChart}
      <div class="w-full flex-shrink-0 flex flex-col">
        <div class="card p-3 shadow-lg variant-filled-surface w-full flex flex-col min-h-[500px]">
            <!-- Container do gráfico -->
          <div class="w-full flex-1">
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


