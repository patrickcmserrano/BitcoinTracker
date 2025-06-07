<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { createChart, ColorType, CandlestickSeries, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from 'lightweight-charts';

// Props
export let symbol = 'BTCUSDT';
export let interval = '1m';

// Variáveis do componente
let chartContainer: HTMLDivElement;
let chart: IChartApi;
let candleSeries: ISeriesApi<'Candlestick'>;
let ws: WebSocket | null = null;
let lastCandle: CandlestickData | null = null;
let connectionAttempts = 0;
const maxReconnectAttempts = 5;

onMount(() => {
  initChart();
  loadHistoricalData();
});

onDestroy(() => {
  if (ws) {
    ws.close();
  }
  if (chart) {
    chart.remove();
  }
});

function initChart() {
  // Configuração do gráfico
  chart = createChart(chartContainer, {
    width: chartContainer.clientWidth,
    height: 500,
    layout: {
      background: { type: ColorType.Solid, color: 'transparent' },
      textColor: '#d1d5db',
    },
    grid: {
      vertLines: { color: '#374151' },
      horzLines: { color: '#374151' },
    },
    crosshair: {
      mode: 1,
    },
    rightPriceScale: {
      borderColor: '#485563',
    },
    timeScale: {
      borderColor: '#485563',
      timeVisible: true,
      secondsVisible: false,
    },
  });

  // Adicionar série de candles
  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderDownColor: '#ef4444',
    borderUpColor: '#22c55e',
    wickDownColor: '#ef4444',
    wickUpColor: '#22c55e',
  });

  // Responsividade
  const resizeObserver = new ResizeObserver(() => {
    if (chart && chartContainer) {
      chart.resize(chartContainer.clientWidth, 500);
    }
  });
  resizeObserver.observe(chartContainer);

  // Cleanup do observer
  onDestroy(() => {
    resizeObserver.disconnect();
  });
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

    candleSeries.setData(formattedData);
    
    // Definir o último candle para referência
    if (formattedData.length > 0) {
      lastCandle = formattedData[formattedData.length - 1];
    }

    // Ajustar a visualização
    chart.timeScale().fitContent();
    
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

  ws.onmessage = (event) => {
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

  ws.onerror = (error) => {
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
    candleSeries.update(candleData);
    lastCandle = candleData;
  } else {
    // Atualizar o candle atual
    candleSeries.update(candleData);
    lastCandle = candleData;
  }
}
</script>

<!-- Interface do usuário -->
<div class="w-full">
  <!-- Container do gráfico -->
  <div 
    bind:this={chartContainer}
    class="w-full h-[400px] sm:h-[500px] rounded"
  ></div>
</div>

<style>
  /* Estilos personalizados se necessário */
</style>
