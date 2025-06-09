<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { createChart, ColorType, CandlestickSeries, type IChartApi, type ISeriesApi, type CandlestickData, type Time, type LogicalRange } from 'lightweight-charts';

// Props
export let symbol = 'BTCUSDT';
export let interval = '1m';
export let activeTimeframe = '1h'; // Timeframe ativo do rastreador
export let onTimeframeChange: ((timeframe: string) => void) | null = null; // Callback para mudança de timeframe

// Variáveis do componente
let chartContainer: HTMLDivElement;
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<'Candlestick'> | null = null;
let ws: WebSocket | null = null;
let lastCandle: CandlestickData | null = null;
let connectionAttempts = 0;
const maxReconnectAttempts = 5;

// Estado de maximização
let isMaximized = false;
let maximizedContainer: HTMLDivElement;

// Variável para gerenciar o ResizeObserver
let resizeObserver: ResizeObserver | null = null;

// Variáveis para rastrear mudanças nas props
let previousSymbol = symbol;
let previousInterval = interval;

// Lista de timeframes disponíveis (mesmo do rastreador)
const timeframes = [
  { id: '10m', label: '10m' },
  { id: '1h', label: '1h' },
  { id: '4h', label: '4h' },
  { id: '1d', label: '1d' },
  { id: '1w', label: '1w' }
];

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

// Função para alterar o timeframe quando em modo maximizado
function changeTimeframe(timeframe: string) {
  if (onTimeframeChange) {
    onTimeframeChange(timeframe);
  }
}

// Estado para preservar dados do gráfico durante transições
let chartData: { candlestickData: CandlestickData[] } | null = null;
let currentTimeRange: LogicalRange | null = null;

// Função para atualizar cores do gráfico baseado no tema
function updateChartColors() {
  if (!chart) return;
  
  // Detectar se está em modo escuro
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  // Configuração de cores baseada no tema
  const colors = isDarkMode ? {
    background: '#1f2937', // gray-800
    textColor: '#e5e7eb', // gray-200
    gridColor: '#4b5563', // gray-600
    borderColor: '#6b7280', // gray-500
  } : {
    background: '#f9fafb', // gray-50
    textColor: '#374151', // gray-700
    gridColor: '#d1d5db', // gray-300
    borderColor: '#9ca3af', // gray-400
  };

  // Aplicar novas cores
  chart.applyOptions({
    layout: {
      background: { type: ColorType.Solid, color: colors.background },
      textColor: colors.textColor,
    },
    grid: {
      vertLines: { color: colors.gridColor },
      horzLines: { color: colors.gridColor },
    },
    rightPriceScale: {
      borderColor: colors.borderColor,
    },
    timeScale: {
      borderColor: colors.borderColor,
    },
  });
}

function initChart(container?: HTMLDivElement) {
  const targetContainer = container || chartContainer;
  if (!targetContainer) return;

  // Configuração do gráfico com altura responsiva baseada no container
  const containerHeight = targetContainer.clientHeight || 400;
  
  // Detectar se está em modo escuro
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  // Configuração de cores baseada no tema
  const colors = isDarkMode ? {
    background: '#1f2937', // gray-800
    textColor: '#e5e7eb', // gray-200
    gridColor: '#4b5563', // gray-600
    borderColor: '#6b7280', // gray-500
  } : {
    background: '#f9fafb', // gray-50
    textColor: '#374151', // gray-700
    gridColor: '#d1d5db', // gray-300
    borderColor: '#9ca3af', // gray-400
  };

  // Configurações otimizadas para modo maximizado
  const chartOptions = {
    width: targetContainer.clientWidth,
    height: containerHeight,
    layout: {
      background: { type: ColorType.Solid, color: colors.background },
      textColor: colors.textColor,
    },
    grid: {
      vertLines: { color: colors.gridColor },
      horzLines: { color: colors.gridColor },
    },
    crosshair: {
      mode: 1,
    },    rightPriceScale: {
      borderColor: colors.borderColor,
      scaleMargins: {
        top: isMaximized ? 0.02 : 0.1,
        bottom: isMaximized ? 0.02 : 0.1,
      },
    },
    timeScale: {
      borderColor: colors.borderColor,
      timeVisible: true,
      secondsVisible: false,
      barSpacing: isMaximized ? 10 : 6, // Mais espaço entre barras no modo maximizado
    },
    // Remover bordas quando maximizado
    ...(isMaximized && {
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    }),
  };

  chart = createChart(targetContainer, chartOptions);

  // Adicionar série de candles
  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderDownColor: '#ef4444',
    borderUpColor: '#22c55e',
    wickDownColor: '#ef4444',
    wickUpColor: '#22c55e',
  });

  // Responsividade - observar redimensionamento dos containers
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
  
  resizeObserver = new ResizeObserver(() => {
    if (chart) {
      const container = isMaximized ? maximizedContainer : chartContainer;
      if (container) {
        chart.resize(container.clientWidth, container.clientHeight);
      }
    }
  });
  
  // Observar o container atual se ele existir
  if (targetContainer) {
    resizeObserver.observe(targetContainer);
  }
}

async function loadHistoricalData() {
  try {
    console.log(`Loading historical data for ${symbol} with interval ${interval}`);
    
    // Carregar histórico dos últimos 100 candles
    const apiUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`;
    console.log(`API URL: ${apiUrl}`);
    
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    console.log(`Received ${data.length} candles for interval ${interval}`);
    
    const formattedData: CandlestickData[] = data.map((kline: any[]) => ({
      time: Math.floor(kline[0] / 1000) as Time, // Converter de ms para segundos
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
    }));

    if (candleSeries) {
      candleSeries.setData(formattedData);
    }
    
    // Definir o último candle para referência
    if (formattedData.length > 0) {
      lastCandle = formattedData[formattedData.length - 1];
    }

    // Ajustar a visualização
    if (chart) {
      chart.timeScale().fitContent();
    }
    
    // Conectar ao WebSocket após carregar o histórico
    connectWebSocket();
  } catch (error) {
    console.error('Erro ao carregar dados históricos:', error);
    // Tentar conectar ao WebSocket mesmo se falhar o histórico
    connectWebSocket();
  }
}

function connectWebSocket() {
  if (ws) {
    ws.close();
  }

  const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log(`WebSocket connected for ${symbol} ${interval}`);
    connectionAttempts = 0;
  };

  ws.onmessage = (event: MessageEvent) => {
    const data = JSON.parse(event.data);
    handleKlineData(data);
  };

  ws.onclose = () => {
    console.log('WebSocket desconectado');
    
    // Tentar reconectar se não exceder o limite
    if (connectionAttempts < maxReconnectAttempts) {
      connectionAttempts++;
      console.log(`Tentativa de reconexão ${connectionAttempts}/${maxReconnectAttempts}`);
      setTimeout(() => {
        connectWebSocket();
      }, 3000); // Esperar 3 segundos antes de reconectar
    }
  };

  ws.onerror = (error: Event) => {
    console.error('Erro no WebSocket:', error);
  };
}

function handleKlineData(data: any) {
  const kline = data.k;
  if (!kline) return;

  const candleData: CandlestickData = {
    time: Math.floor(kline.t / 1000) as Time, // Converter de ms para segundos
    open: parseFloat(kline.o),
    high: parseFloat(kline.h),
    low: parseFloat(kline.l),
    close: parseFloat(kline.c),
  };

  // Se é um novo candle (tempo diferente do último)
  if (!lastCandle || candleData.time !== lastCandle.time) {
    if (candleSeries) {
      candleSeries.update(candleData);
    }
    lastCandle = candleData;
  } else {
    // Atualizar o candle atual
    if (candleSeries) {
      candleSeries.update(candleData);
    }
    lastCandle = candleData;
  }
}

// Função para reinicializar o gráfico e os dados
function reinitializeChart() {
  console.log(`Reinitializing chart for ${symbol} with interval ${interval}`);
  
  // Fechar WebSocket atual
  if (ws) {
    ws.close();
    ws = null;
  }
  
  // Limpar dados do gráfico atual
  if (candleSeries && chart) {
    candleSeries.setData([]);
  }
  
  // Resetar estados
  lastCandle = null;
  connectionAttempts = 0;
  
  // Recarregar dados históricos e reconectar WebSocket
  loadHistoricalData();
}

// Função para salvar o estado atual do gráfico
function saveChartState() {
  if (chart && candleSeries) {
    try {
      // Salvar dados da série de candlestick
      const seriesData = candleSeries.data();
      chartData = {
        candlestickData: Array.isArray(seriesData) ? seriesData : []
      };

      // Salvar range de tempo visível
      const timeScale = chart.timeScale();
      currentTimeRange = timeScale.getVisibleLogicalRange();
    } catch (error) {
      console.warn('Erro ao salvar estado do gráfico:', error);
      chartData = null;
      currentTimeRange = null;
    }
  }
}

// Função para restaurar o estado do gráfico
function restoreChartState() {
  if (chart && chartData && candleSeries) {
    try {
      // Recriar série com os dados salvos
      if (chartData.candlestickData && chartData.candlestickData.length > 0) {
        candleSeries.setData(chartData.candlestickData);
      }
      
      // Restaurar range de tempo se disponível
      if (currentTimeRange) {
        chart.timeScale().setVisibleLogicalRange(currentTimeRange);
      } else {
        chart.timeScale().fitContent();
      }
    } catch (error) {
      console.warn('Erro ao restaurar estado do gráfico:', error);
      // Fallback: ajustar conteúdo
      chart.timeScale().fitContent();
    }
  }
}

// Função para maximizar/minimizar o gráfico
function maximizeChart() {
  // Salvar estado atual antes da transição
  saveChartState();
  
  // Alterar estado de maximização
  isMaximized = !isMaximized;
  
  // Destruir gráfico atual
  if (chart) {
    chart.remove();
    chart = null;
    candleSeries = null;
  }
  
  // Aguardar um frame para que o DOM seja atualizado
  setTimeout(() => {
    const container = isMaximized ? maximizedContainer : chartContainer;
    if (container) {
      // Recriar gráfico no novo container
      initChart(container);
      
      // Restaurar dados e configurações
      restoreChartState();
      
      // Reestabelecer WebSocket se necessário
      if (symbol && interval) {
        connectWebSocket();
      }
    }
  }, 100);
}

// Função para fechar maximização com ESC
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && isMaximized) {
    maximizeChart();
  }
}

// Reatividade: Reinicializa o gráfico quando symbol ou interval mudam
$: if ((symbol !== previousSymbol || interval !== previousInterval) && chart) {
  console.log(`Chart props changed: ${previousSymbol}/${previousInterval} -> ${symbol}/${interval}`);
  reinitializeChart();
  previousSymbol = symbol;
  previousInterval = interval;
}

onMount(() => {
  initChart();
  loadHistoricalData();
  
  // Observer para mudanças de tema
  const themeObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        updateChartColors();
      }
    });
  });
  
  // Observar mudanças na classe do elemento html (para tema escuro/claro)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });

  // Cleanup do observer no destroy
  return () => {
    themeObserver.disconnect();
  };
});

// Adicionar listener para tecla ESC
onMount(() => {
  window.addEventListener('keydown', handleKeydown);
  
  return () => {
    window.removeEventListener('keydown', handleKeydown);
  };
});

onDestroy(() => {
  if (ws) {
    ws.close();
  }
  if (chart) {
    chart.remove();
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<!-- Interface do usuário -->
<div class="w-full">
  <!-- Cabeçalho do gráfico com botão maximizar -->
  <div class="flex justify-between items-center mb-2">
    <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400">
      {symbol} - {interval}
    </h3>
    <button 
      class="maximize-btn"
      onclick={maximizeChart}
      title={isMaximized ? "Minimizar gráfico" : "Maximizar gráfico"}
    >
      {isMaximized ? "🗗" : "⛶"}
    </button>
  </div>
  
  <!-- Container do gráfico normal -->
  {#if !isMaximized}
    <div 
      bind:this={chartContainer}
      class="w-full h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[450px] rounded"
    ></div>
  {/if}
</div>

<!-- Container maximizado (overlay full-screen) -->
{#if isMaximized}
  <div 
    class="maximized-overlay" 
    role="dialog"
    aria-modal="true"
    aria-labelledby="maximized-chart-title"
    onclick={(e) => e.target === e.currentTarget && maximizeChart()}
    onkeydown={(e) => e.key === 'Escape' && maximizeChart()}
    tabindex="-1"
  >
    <div class="maximized-content">      <!-- Header do gráfico maximizado -->
      <div class="maximized-header">        <div class="flex items-center gap-2 flex-1">
          <h2 
            id="maximized-chart-title"
            class="text-lg font-bold text-primary-600 dark:text-primary-300"
          >
            {symbol} - {interval}
          </h2>
          <span 
            class="text-xs bg-primary-100 dark:bg-primary-800 px-1.5 py-0.5 rounded"
            aria-label="Estado do gráfico"
          >
            Max
          </span>
        </div>        <!-- Seletor de Timeframes no modo maximizado -->
        <div class="flex items-center gap-1.5 mx-1.5">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">TF:</span>
          <div class="flex gap-0.5">
            {#each timeframes as timeframe}
              <button 
                class="timeframe-btn-maximized {activeTimeframe === timeframe.id ? 'active' : ''}"
                onclick={() => changeTimeframe(timeframe.id)}
                title={`Alterar para timeframe ${timeframe.label}`}
              >
                {timeframe.label}
              </button>
            {/each}
          </div>
        </div>
        
        <button 
          class="close-btn"
          onclick={maximizeChart}
          title="Fechar visualização maximizada (ESC)"
          aria-label="Fechar gráfico maximizado"
        >
          ✕
        </button>
      </div>
      
      <!-- Container do gráfico maximizado -->
      <div 
        bind:this={maximizedContainer}
        class="maximized-chart"
        role="img"
        aria-label={`Gráfico de candlestick para ${symbol} no intervalo ${interval}`}
      ></div>
    </div>
  </div>
{/if}

<style>
  /* Estilo para o botão maximizar */
  .maximize-btn {
    background: var(--crypto-color, #3b82f6);
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .maximize-btn:hover {
    background: color-mix(in srgb, var(--crypto-color, #3b82f6) 80%, black);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }
  
  .maximize-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  /* Modo escuro */
  :global(.dark) .maximize-btn {
    background: color-mix(in srgb, var(--crypto-color, #3b82f6) 70%, black);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
  
  :global(.dark) .maximize-btn:hover {
    background: color-mix(in srgb, var(--crypto-color, #3b82f6) 60%, black);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  }
    /* Overlay maximizado */
  .maximized-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    backdrop-filter: blur(6px);
    padding: 2px;
  }  .maximized-content {
    width: calc(100vw - 4px);
    height: calc(100vh - 4px);
    background: var(--color-surface-50);
    border-radius: 4px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  :global(.dark) .maximized-content {
    background: var(--color-surface-900);
  }
  .maximized-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 10px;
    background: var(--color-surface-100);
    border-bottom: 1px solid var(--color-surface-300);
    min-height: 40px;
    flex-shrink: 0;
  }
  
  :global(.dark) .maximized-header {
    background: var(--color-surface-800);
    border-bottom-color: var(--color-surface-600);
  }
    .close-btn {
    background: var(--color-error-500);
    color: white;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }
    .close-btn:hover {
    background: var(--color-error-600);
    transform: scale(1.1);
  }
  /* Estilos para os botões de timeframe no modo maximizado */
  .timeframe-btn-maximized {
    padding: 0.15rem 0.5rem;
    border: 1px solid var(--color-primary-300);
    border-radius: 0.2rem;
    background-color: transparent;
    color: var(--color-primary-600);
    font-size: 0.65rem;
    font-weight: 500;
    transition: all 0.12s ease;
    cursor: pointer;
    min-width: 2rem;
    line-height: 1.2;
  }
  
  .timeframe-btn-maximized:hover {
    background-color: var(--color-primary-100);
    border-color: var(--color-primary-400);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .timeframe-btn-maximized.active {
    background-color: var(--color-primary-500);
    color: white;
    border-color: var(--color-primary-500);
    font-weight: 600;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  
  .timeframe-btn-maximized.active:hover {
    background-color: var(--color-primary-600);
    border-color: var(--color-primary-600);
  }
  
  /* Modo escuro para os botões de timeframe */
  :global(.dark) .timeframe-btn-maximized {
    border-color: var(--color-primary-400);
    color: var(--color-primary-300);
  }
  
  :global(.dark) .timeframe-btn-maximized:hover {
    background-color: var(--color-primary-800);
    border-color: var(--color-primary-300);
  }
  
  :global(.dark) .timeframe-btn-maximized.active {
    background-color: var(--color-primary-500);
    color: white;
    border-color: var(--color-primary-500);
  }  .maximized-chart {
    flex: 1;
    margin: 1px;
    border-radius: 0;
    background: var(--color-surface-50);
    overflow: hidden;
  }
  
  :global(.dark) .maximized-chart {
    background: var(--color-surface-800);
  }
  
  /* Animação de entrada */
  .maximized-overlay {
    animation: fadeIn 0.3s ease-out;
  }
  
  .maximized-content {
    animation: scaleIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes scaleIn {
    from {
      transform: scale(0.9);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
