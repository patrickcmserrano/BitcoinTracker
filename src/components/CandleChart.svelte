<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LineData, type HistogramData, type Time, type LogicalRange } from 'lightweight-charts';
import { calculateIndicatorSeries, type IndicatorSeries } from '../lib/technical-indicators';
import { getBinanceKlines } from '../lib/api';

// Props
export let symbol = 'BTCUSDT';
export let interval = '1m';
export let activeTimeframe = '1h'; // Timeframe ativo do rastreador
export let onTimeframeChange: ((timeframe: string) => void) | null = null; // Callback para mudança de timeframe
export let defaultOscillator: 'MACD' | 'RSI' = 'MACD'; // Oscilador padrão a exibir

// Variáveis do componente
let chartContainer: HTMLDivElement;
let chart: IChartApi | null = null;
let candleSeries: ISeriesApi<'Candlestick'> | null = null;
let macdHistogramSeries: ISeriesApi<'Histogram'> | null = null;
let macdLineSeries: ISeriesApi<'Line'> | null = null;
let macdSignalSeries: ISeriesApi<'Line'> | null = null;
let rsiSeries: ISeriesApi<'Line'> | null = null;
let sma20Series: ISeriesApi<'Line'> | null = null;
let sma50Series: ISeriesApi<'Line'> | null = null;
let ema9Series: ISeriesApi<'Line'> | null = null;
let ema21Series: ISeriesApi<'Line'> | null = null;
let bollingerUpperSeries: ISeriesApi<'Line'> | null = null;
let bollingerMiddleSeries: ISeriesApi<'Line'> | null = null;
let bollingerLowerSeries: ISeriesApi<'Line'> | null = null;
let ws: WebSocket | null = null;
let lastCandle: CandlestickData | null = null;
let connectionAttempts = 0;
const maxReconnectAttempts = 5;
let isDestroyed = false; // Flag para rastrear se o componente foi destruído
let reconnectTimeout: number | null = null; // Timeout para reconexão
let isConnecting = false; // Flag para evitar múltiplas conexões simultâneas

// Estados de visibilidade dos indicadores
let showSMA = false;
let showEMA = false;
let showBollinger = false;
let showMACD = defaultOscillator === 'MACD';
let showRSI = defaultOscillator === 'RSI';
let macdReady = false; // Flag para indicar quando o MACD está pronto
let rsiReady = false; // Flag para indicar quando o RSI está pronto

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
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '1h', label: '1h' },
  { id: '4h', label: '4h' },
  { id: '1d', label: '1d' },
  { id: '1w', label: '1w' }
];

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
    },
    rightPriceScale: {
      borderColor: colors.borderColor,
      scaleMargins: {
        top: 0.1,
        bottom: showMACD ? 0.4 : 0.1, // Deixar espaço para MACD se ativo
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

  // Adicionar série de candles no price scale principal
  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: '#22c55e',
    downColor: '#ef4444',
    borderDownColor: '#ef4444',
    borderUpColor: '#22c55e',
    wickDownColor: '#ef4444',
    wickUpColor: '#22c55e',
    priceScaleId: 'right',
  });

  // Se MACD estiver ativo, adicionar as séries no mesmo gráfico
  if (showMACD) {
    console.log('🎯 initChart: Adicionando séries MACD (showMACD = true)');
    addMacdSeries();
  }

  // Se RSI estiver ativo, adicionar a série no mesmo gráfico
  if (showRSI) {
    console.log('🎯 initChart: Adicionando série RSI (showRSI = true)');
    addRsiSeries();
  }

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

function addMacdSeries() {
  if (!chart) return;

  console.log('➕ Adicionando séries MACD ao gráfico');

  // Adicionar série de histograma MACD PRIMEIRO para criar o price scale 'macd'
  macdHistogramSeries = chart.addSeries(HistogramSeries, {
    color: '#26a69a',
    priceFormat: {
      type: 'volume',
    },
    priceScaleId: 'macd',
  });

  // Adicionar linha MACD
  macdLineSeries = chart.addSeries(LineSeries, {
    color: '#2196F3',
    lineWidth: 2,
    priceScaleId: 'macd',
  });

  // Adicionar linha Signal
  macdSignalSeries = chart.addSeries(LineSeries, {
    color: '#FF6D00',
    lineWidth: 2,
    priceScaleId: 'macd',
  });

  // DEPOIS de criar as séries, configurar o price scale para posicionar o MACD na parte inferior
  chart.priceScale('macd').applyOptions({
    scaleMargins: {
      top: 0.7, // MACD ocupa os 30% inferiores do gráfico
      bottom: 0,
    },
  });

  macdReady = true;
  console.log('✅ Séries MACD adicionadas com sucesso');
}

function removeMacdSeries() {
  if (!chart) return;

  if (macdHistogramSeries) {
    chart.removeSeries(macdHistogramSeries);
    macdHistogramSeries = null;
  }
  if (macdLineSeries) {
    chart.removeSeries(macdLineSeries);
    macdLineSeries = null;
  }
  if (macdSignalSeries) {
    chart.removeSeries(macdSignalSeries);
    macdSignalSeries = null;
  }
  
  macdReady = false;
  
  // Ajustar margens do price scale principal
  if (chart) {
    chart.applyOptions({
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });
  }
}

function addRsiSeries() {
  if (!chart) return;

  // Adicionar série RSI
  rsiSeries = chart.addSeries(LineSeries, {
    color: '#9C27B0',
    lineWidth: 2,
    priceScaleId: 'rsi',
    priceFormat: {
      type: 'price',
      precision: 2,
      minMove: 0.01,
    },
  });

  // Configurar o price scale do RSI para posicionar na parte inferior
  chart.priceScale('rsi').applyOptions({
    scaleMargins: {
      top: 0.7, // RSI ocupa os 30% inferiores do gráfico
      bottom: 0,
    },
  });

  rsiReady = true;
}

function removeRsiSeries() {
  if (!chart) return;

  if (rsiSeries) {
    chart.removeSeries(rsiSeries);
    rsiSeries = null;
  }
  
  rsiReady = false;
  
  // Ajustar margens do price scale principal
  if (chart) {
    chart.applyOptions({
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });
  }
}


/**
 * Adiciona ou atualiza séries de indicadores técnicos
 */
async function updateIndicatorSeries() {
  if (!chart || !candleSeries || isDestroyed) return;

  try {
    // Buscar dados OHLCV
    const klines = await getBinanceKlines(symbol, interval, 200);
    
    // Verificar se o componente foi destruído durante a chamada assíncrona
    if (isDestroyed || !chart) return;
    
    if (!klines || klines.length === 0) return;

    // Preparar dados OHLCV
    const ohlcvData = {
      open: klines.map(k => parseFloat(k[1])),
      high: klines.map(k => parseFloat(k[2])),
      low: klines.map(k => parseFloat(k[3])),
      close: klines.map(k => parseFloat(k[4])),
      volume: klines.map(k => parseFloat(k[5]))
    };

    // Calcular indicadores
    const indicators = calculateIndicatorSeries(ohlcvData);

    // Preparar timestamps
    const times = klines.map(k => Math.floor(k[0] / 1000) as Time);

    // SMA 20 e 50
    if (showSMA) {
      if (!sma20Series) {
        sma20Series = chart.addSeries(LineSeries, {
          color: '#3b82f6', // blue-500
          lineWidth: 2,
          title: 'SMA 20',
          priceLineVisible: false,
        });
      }
      if (!sma50Series) {
        sma50Series = chart.addSeries(LineSeries, {
          color: '#8b5cf6', // violet-500
          lineWidth: 2,
          title: 'SMA 50',
          priceLineVisible: false,
        });
      }

      // Preencher SMA20 (offset para alinhar com os dados)
      const sma20Data: LineData[] = [];
      const sma20Offset = times.length - indicators.sma20.length;
      indicators.sma20.forEach((value, i) => {
        if (value && times[i + sma20Offset]) {
          sma20Data.push({ time: times[i + sma20Offset], value });
        }
      });
      
      // Verificar se o componente ainda está ativo antes de atualizar
      if (isDestroyed || !chart) return;
      
      if (sma20Series) sma20Series.setData(sma20Data);

      // Preencher SMA50
      const sma50Data: LineData[] = [];
      const sma50Offset = times.length - indicators.sma50.length;
      indicators.sma50.forEach((value, i) => {
        if (value && times[i + sma50Offset]) {
          sma50Data.push({ time: times[i + sma50Offset], value });
        }
      });
      
      if (isDestroyed || !chart) return;
      
      if (sma50Series) sma50Series.setData(sma50Data);
    } else {
      if (sma20Series) {
        chart.removeSeries(sma20Series);
        sma20Series = null;
      }
      if (sma50Series) {
        chart.removeSeries(sma50Series);
        sma50Series = null;
      }
    }

    // EMA 9 e 21
    if (showEMA) {
      if (!ema9Series) {
        ema9Series = chart.addSeries(LineSeries, {
          color: '#10b981', // green-500
          lineWidth: 2,
          title: 'EMA 9',
          priceLineVisible: false,
        });
      }
      if (!ema21Series) {
        ema21Series = chart.addSeries(LineSeries, {
          color: '#f59e0b', // amber-500
          lineWidth: 2,
          title: 'EMA 21',
          priceLineVisible: false,
        });
      }

      const ema9Data: LineData[] = [];
      const ema9Offset = times.length - indicators.ema9.length;
      indicators.ema9.forEach((value, i) => {
        if (value && times[i + ema9Offset]) {
          ema9Data.push({ time: times[i + ema9Offset], value });
        }
      });
      if (ema9Series) ema9Series.setData(ema9Data);

      const ema21Data: LineData[] = [];
      const ema21Offset = times.length - indicators.ema21.length;
      indicators.ema21.forEach((value, i) => {
        if (value && times[i + ema21Offset]) {
          ema21Data.push({ time: times[i + ema21Offset], value });
        }
      });
      if (ema21Series) ema21Series.setData(ema21Data);
    } else {
      if (ema9Series) {
        chart.removeSeries(ema9Series);
        ema9Series = null;
      }
      if (ema21Series) {
        chart.removeSeries(ema21Series);
        ema21Series = null;
      }
    }

    // Bandas de Bollinger
    if (showBollinger) {
      if (!bollingerUpperSeries) {
        bollingerUpperSeries = chart.addSeries(LineSeries, {
          color: '#ef4444', // red-500
          lineWidth: 1,
          title: 'BB Upper',
          priceLineVisible: false,
        });
      }
      if (!bollingerMiddleSeries) {
        bollingerMiddleSeries = chart.addSeries(LineSeries, {
          color: '#6b7280', // gray-500
          lineWidth: 1,
          lineStyle: 2, // dashed
          title: 'BB Middle',
          priceLineVisible: false,
        });
      }
      if (!bollingerLowerSeries) {
        bollingerLowerSeries = chart.addSeries(LineSeries, {
          color: '#22c55e', // green-500
          lineWidth: 1,
          title: 'BB Lower',
          priceLineVisible: false,
        });
      }

      const bbOffset = times.length - indicators.bollingerUpper.length;

      const bbUpperData: LineData[] = [];
      indicators.bollingerUpper.forEach((value, i) => {
        if (value && times[i + bbOffset]) {
          bbUpperData.push({ time: times[i + bbOffset], value });
        }
      });
      if (bollingerUpperSeries) bollingerUpperSeries.setData(bbUpperData);

      const bbMiddleData: LineData[] = [];
      indicators.bollingerMiddle.forEach((value, i) => {
        if (value && times[i + bbOffset]) {
          bbMiddleData.push({ time: times[i + bbOffset], value });
        }
      });
      if (bollingerMiddleSeries) bollingerMiddleSeries.setData(bbMiddleData);

      const bbLowerData: LineData[] = [];
      indicators.bollingerLower.forEach((value, i) => {
        if (value && times[i + bbOffset]) {
          bbLowerData.push({ time: times[i + bbOffset], value });
        }
      });
      if (bollingerLowerSeries) bollingerLowerSeries.setData(bbLowerData);
    } else {
      if (bollingerUpperSeries) {
        chart.removeSeries(bollingerUpperSeries);
        bollingerUpperSeries = null;
      }
      if (bollingerMiddleSeries) {
        chart.removeSeries(bollingerMiddleSeries);
        bollingerMiddleSeries = null;
      }
      if (bollingerLowerSeries) {
        chart.removeSeries(bollingerLowerSeries);
        bollingerLowerSeries = null;
      }
    }

  } catch (error) {
    console.error('Erro ao atualizar indicadores:', error);
  }
}

/**
 * Atualiza o gráfico MACD (agora no mesmo gráfico principal)
 */
async function updateMacdChart() {
  if (!chart || !macdHistogramSeries || isDestroyed) return;

  try {
    const klines = await getBinanceKlines(symbol, interval, 200);
    
    // Verificar se o componente foi destruído durante a chamada assíncrona
    if (isDestroyed || !chart || !macdHistogramSeries) return;
    
    if (!klines || klines.length === 0) return;

    const ohlcvData = {
      open: klines.map(k => parseFloat(k[1])),
      high: klines.map(k => parseFloat(k[2])),
      low: klines.map(k => parseFloat(k[3])),
      close: klines.map(k => parseFloat(k[4])),
      volume: klines.map(k => parseFloat(k[5]))
    };

    const indicators = calculateIndicatorSeries(ohlcvData);
    const times = klines.map(k => Math.floor(k[0] / 1000) as Time);

    // MACD Histogram
    const histogramData: HistogramData[] = [];
    const macdLineData: LineData[] = [];
    const signalLineData: LineData[] = [];
    
    const macdOffset = times.length - indicators.macdHistogram.length;
    
    indicators.macdHistogram.forEach((value, i) => {
      if (value !== undefined && times[i + macdOffset]) {
        const time = times[i + macdOffset];
        histogramData.push({
          time,
          value,
          color: value >= 0 ? '#26a69a' : '#ef5350'
        });

        // Adicionar linhas MACD e Signal
        if (indicators.macdLine[i] !== undefined) {
          macdLineData.push({
            time,
            value: indicators.macdLine[i]!
          });
        }
        
        if (indicators.macdSignal[i] !== undefined) {
          signalLineData.push({
            time,
            value: indicators.macdSignal[i]!
          });
        }
      }
    });

    // Verificar novamente antes de atualizar as séries
    if (isDestroyed || !chart) return;
    
    if (macdHistogramSeries) macdHistogramSeries.setData(histogramData);
    if (macdLineSeries) macdLineSeries.setData(macdLineData);
    if (macdSignalSeries) macdSignalSeries.setData(signalLineData);

    // Marcar MACD como pronto
    macdReady = true;

  } catch (error) {
    console.error('Erro ao atualizar MACD:', error);
    macdReady = false;
  }
}

/**
 * Atualiza o gráfico RSI
 */
async function updateRsiChart() {
  if (!chart || !rsiSeries || isDestroyed) return;

  try {
    const klines = await getBinanceKlines(symbol, interval, 200);
    
    // Verificar se o componente foi destruído durante a chamada assíncrona
    if (isDestroyed || !chart || !rsiSeries) return;
    
    if (!klines || klines.length === 0) return;

    const closes = klines.map(k => parseFloat(k[4]));
    
    // Calcular RSI usando a biblioteca technicalindicators
    const { RSI } = await import('technicalindicators');
    const rsiValues = RSI.calculate({
      values: closes,
      period: 14
    });

    const times = klines.map(k => Math.floor(k[0] / 1000) as Time);
    
    // RSI Line Data
    const rsiLineData: LineData[] = [];
    const rsiOffset = times.length - rsiValues.length;
    
    rsiValues.forEach((value, i) => {
      if (value !== undefined && times[i + rsiOffset]) {
        rsiLineData.push({
          time: times[i + rsiOffset],
          value
        });
      }
    });

    // Verificar novamente antes de atualizar a série
    if (isDestroyed || !chart || !rsiSeries) return;
    
    rsiSeries.setData(rsiLineData);

    // Marcar RSI como pronto
    rsiReady = true;

  } catch (error) {
    console.error('Erro ao atualizar RSI:', error);
    rsiReady = false;
  }
}


// Observar mudanças nos estados de visibilidade
$: if (chart && (showSMA || showEMA || showBollinger)) {
  updateIndicatorSeries();
} else if (chart && !showSMA && !showEMA && !showBollinger) {
  // Remover todas as séries de indicadores
  if (sma20Series) { chart.removeSeries(sma20Series); sma20Series = null; }
  if (sma50Series) { chart.removeSeries(sma50Series); sma50Series = null; }
  if (ema9Series) { chart.removeSeries(ema9Series); ema9Series = null; }
  if (ema21Series) { chart.removeSeries(ema21Series); ema21Series = null; }
  if (bollingerUpperSeries) { chart.removeSeries(bollingerUpperSeries); bollingerUpperSeries = null; }
  if (bollingerMiddleSeries) { chart.removeSeries(bollingerMiddleSeries); bollingerMiddleSeries = null; }
  if (bollingerLowerSeries) { chart.removeSeries(bollingerLowerSeries); bollingerLowerSeries = null; }
}

// Observar mudança no estado do MACD
$: if (showMACD && chart) {
  macdReady = false; // Reset da flag
  // Adicionar séries MACD se ainda não existem
  if (!macdHistogramSeries) {
    addMacdSeries();
    updateMacdChart();
  }
} else if (!showMACD && chart) {
  // Remover séries MACD
  removeMacdSeries();
}

// Observar mudança no estado do RSI
$: if (showRSI && chart) {
  rsiReady = false; // Reset da flag
  // Adicionar série RSI se ainda não existe
  if (!rsiSeries) {
    addRsiSeries();
    updateRsiChart();
  }
} else if (!showRSI && chart) {
  // Remover série RSI
  removeRsiSeries();
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
    
    // Atualizar indicadores padrão se estiverem ativos
    if (showMACD && macdHistogramSeries) {
      console.log('📊 Atualizando MACD após carregar dados históricos');
      await updateMacdChart();
    }
    if (showRSI && rsiSeries) {
      console.log('📈 Atualizando RSI após carregar dados históricos');
      await updateRsiChart();
    }
    
    // Conectar ao WebSocket após carregar o histórico
    connectWebSocket();
  } catch (error) {
    console.error('Erro ao carregar dados históricos:', error);
    // Tentar conectar ao WebSocket mesmo se falhar o histórico
    connectWebSocket();
  }
}

function disconnectWebSocket() {
  // Limpar timeout de reconexão se existir
  if (reconnectTimeout !== null) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  // Fechar conexão existente
  if (ws) {
    // Remover event listeners antes de fechar
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    ws.onerror = null;
    
    // Fechar conexão se não estiver já fechada
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    
    ws = null;
  }
  
  isConnecting = false;
}

function connectWebSocket() {
  // Não conectar se o componente foi destruído, já está conectando, ou não há gráfico
  if (isDestroyed || isConnecting || !chart) {
    console.log('Skipping WebSocket connection:', { isDestroyed, isConnecting, hasChart: !!chart });
    return;
  }

  // Marcar como conectando
  isConnecting = true;
  
  // Desconectar WebSocket existente
  disconnectWebSocket();

  const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
  console.log(`Connecting to WebSocket: ${wsUrl}`);
  
  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // Verificar se o componente ainda está ativo
      if (isDestroyed) {
        ws?.close();
        return;
      }
      console.log(`WebSocket connected for ${symbol} ${interval}`);
      connectionAttempts = 0;
      isConnecting = false;
    };

    ws.onmessage = (event: MessageEvent) => {
      // Ignorar mensagens se o componente foi destruído
      if (isDestroyed) return;
      const data = JSON.parse(event.data);
      handleKlineData(data);
    };

    ws.onclose = (event) => {
      console.log(`WebSocket desconectado (code: ${event.code}, reason: ${event.reason})`);
      isConnecting = false;
      
      // Não reconectar se o componente está sendo destruído
      if (isDestroyed) {
        return;
      }
      
      // Tentar reconectar se não exceder o limite e o fechamento não foi intencional
      // Código 1000 é fechamento normal, não precisa reconectar
      if (connectionAttempts < maxReconnectAttempts && event.code !== 1000) {
        connectionAttempts++;
        console.log(`Tentativa de reconexão ${connectionAttempts}/${maxReconnectAttempts}`);
        
        // Usar timeout exponencial: 2s, 4s, 8s, 16s, 32s
        const delay = Math.min(2000 * Math.pow(2, connectionAttempts - 1), 32000);
        
        reconnectTimeout = window.setTimeout(() => {
          // Verificar novamente antes de reconectar
          if (!isDestroyed && chart) {
            connectWebSocket();
          }
        }, delay);
      }
    };

    ws.onerror = (error: Event) => {
      console.error('Erro no WebSocket:', error);
      isConnecting = false;
    };
  } catch (error) {
    console.error('Erro ao criar WebSocket:', error);
    isConnecting = false;
  }
}

function handleKlineData(data: any) {
  // Verificar se o componente foi destruído
  if (isDestroyed || !chart || !candleSeries) {
    return;
  }

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
  
  // Desconectar WebSocket atual de forma limpa
  disconnectWebSocket();
  
  // Limpar dados do gráfico atual
  if (candleSeries && chart) {
    candleSeries.setData([]);
  }
  
  // Resetar estados
  lastCandle = null;
  connectionAttempts = 0;
  
  // Aguardar um pouco antes de recarregar para garantir que o WebSocket foi fechado
  setTimeout(() => {
    if (!isDestroyed) {
      // Recarregar dados históricos e reconectar WebSocket
      loadHistoricalData();
    }
  }, 500);
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
  // Marcar como destruído temporariamente para prevenir atualizações durante a transição
  const wasDestroyed = isDestroyed;
  isDestroyed = true;
  
  // Salvar estado atual antes da transição
  saveChartState();
  
  // Desconectar WebSocket antes de alterar o layout
  disconnectWebSocket();
  
  // Alterar estado de maximização
  isMaximized = !isMaximized;
  
  // Destruir gráfico atual
  if (chart) {
    chart.remove();
    chart = null;
    candleSeries = null;
    // Limpar séries MACD também
    macdHistogramSeries = null;
    macdLineSeries = null;
    macdSignalSeries = null;
  }
  
  // Aguardar um frame para que o DOM seja atualizado
  setTimeout(() => {
    if (wasDestroyed) return; // Se realmente foi destruído, não recriar
    
    const container = isMaximized ? maximizedContainer : chartContainer;
    if (container) {
      // Restaurar flag isDestroyed
      isDestroyed = false;
      
      // Recriar gráfico no novo container
      initChart(container);
      
      // Restaurar dados e configurações
      restoreChartState();
      
      // Se MACD estava ativo, atualizar
      if (showMACD) {
        updateMacdChart();
      }
      
      // Reconectar WebSocket após um pequeno delay
      setTimeout(() => {
        if (symbol && interval && !isDestroyed && chart) {
          connectWebSocket();
        }
      }, 300);
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
  isDestroyed = false; // Reset da flag ao montar
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
  // Marcar componente como destruído
  isDestroyed = true;
  
  // Desconectar WebSocket de forma limpa
  disconnectWebSocket();
  
  // Remover gráfico (agora é apenas um)
  if (chart) {
    chart.remove();
    chart = null;
  }
  
  // Desconectar observer
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  
  // Limpar séries
  candleSeries = null;
  macdHistogramSeries = null;
  macdLineSeries = null;
  macdSignalSeries = null;
  macdSignalSeries = null;
  sma20Series = null;
  sma50Series = null;
  ema9Series = null;
  ema21Series = null;
  bollingerUpperSeries = null;
  bollingerMiddleSeries = null;
  bollingerLowerSeries = null;
});
</script>

<!-- Interface do usuário -->
<div class="w-full">
  <!-- Cabeçalho do gráfico com botão maximizar -->
  <div class="flex justify-between items-center mb-2 flex-wrap gap-2">
    <h3 class="text-lg font-semibold text-primary-600 dark:text-primary-400">
      {symbol} - {interval}
    </h3>
    
    <!-- Controles de indicadores -->
    <div class="flex gap-2 items-center">
      <button 
        class="indicator-toggle {showSMA ? 'active' : ''}"
        onclick={() => showSMA = !showSMA}
        title="Mostrar/Ocultar SMAs"
      >
        SMA
      </button>
      <button 
        class="indicator-toggle {showEMA ? 'active' : ''}"
        onclick={() => showEMA = !showEMA}
        title="Mostrar/Ocultar EMAs"
      >
        EMA
      </button>
      <button 
        class="indicator-toggle {showBollinger ? 'active' : ''}"
        onclick={() => showBollinger = !showBollinger}
        title="Mostrar/Ocultar Bandas de Bollinger"
      >
        BB
      </button>
      <button 
        class="indicator-toggle {showMACD ? 'active' : ''}"
        onclick={() => {
          showMACD = !showMACD;
          if (showMACD && showRSI) showRSI = false; // Desativar RSI se ativar MACD
        }}
        title="Mostrar/Ocultar MACD Histograma"
      >
        MACD
      </button>
      <button 
        class="indicator-toggle {showRSI ? 'active' : ''}"
        onclick={() => {
          showRSI = !showRSI;
          if (showRSI && showMACD) showMACD = false; // Desativar MACD se ativar RSI
        }}
        title="Mostrar/Ocultar RSI"
      >
        RSI
      </button>
      <button 
        class="maximize-btn"
        onclick={maximizeChart}
        title={isMaximized ? "Minimizar gráfico" : "Maximizar gráfico"}
      >
        {isMaximized ? "🗗" : "⛶"}
      </button>
    </div>
  </div>
  
  <!-- Container do gráfico normal -->
  {#if !isMaximized}
    <div 
      bind:this={chartContainer}
      class="w-full h-full min-h-[700px] rounded"
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
        </div>
        
        <!-- Controles de indicadores no modo maximizado -->
        <div class="flex gap-1.5 items-center mx-2">
          <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Indicadores:</span>
          <button 
            class="indicator-toggle-max {showSMA ? 'active' : ''}"
            onclick={() => showSMA = !showSMA}
            title="Mostrar/Ocultar SMAs"
          >
            SMA
          </button>
          <button 
            class="indicator-toggle-max {showEMA ? 'active' : ''}"
            onclick={() => showEMA = !showEMA}
            title="Mostrar/Ocultar EMAs"
          >
            EMA
          </button>
          <button 
            class="indicator-toggle-max {showBollinger ? 'active' : ''}"
            onclick={() => showBollinger = !showBollinger}
            title="Mostrar/Ocultar Bandas de Bollinger"
          >
            BB
          </button>
          <button 
            class="indicator-toggle-max {showMACD ? 'active' : ''}"
            onclick={() => {
              showMACD = !showMACD;
              if (showMACD && showRSI) showRSI = false; // Desativar RSI se ativar MACD
            }}
            title="Mostrar/Ocultar MACD Histograma"
          >
            MACD
          </button>
          <button 
            class="indicator-toggle-max {showRSI ? 'active' : ''}"
            onclick={() => {
              showRSI = !showRSI;
              if (showRSI && showMACD) showMACD = false; // Desativar MACD se ativar RSI
            }}
            title="Mostrar/Ocultar RSI"
          >
            RSI
          </button>
        </div>
        
        <!-- Seletor de Timeframes no modo maximizado -->
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
      
      <!-- Container do gráfico maximizado (agora inclui MACD integrado) -->
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
  
  /* Botões de controle de indicadores */
  .indicator-toggle {
    padding: 4px 10px;
    font-size: 0.75rem;
    font-weight: 600;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .indicator-toggle:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
  }
  
  .indicator-toggle.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }
  
  :global(.dark) .indicator-toggle {
    background: #1e293b;
    border-color: #475569;
    color: #94a3b8;
  }
  
  :global(.dark) .indicator-toggle:hover {
    background: #334155;
    border-color: #64748b;
  }
  
  :global(.dark) .indicator-toggle.active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }
  
  .indicator-toggle-max {
    padding: 3px 8px;
    font-size: 0.7rem;
    font-weight: 600;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .indicator-toggle-max:hover {
    background: #f1f5f9;
    border-color: #94a3b8;
  }
  
  .indicator-toggle-max.active {
    background: #3b82f6;
    border-color: #3b82f6;
    color: white;
  }
  
  :global(.dark) .indicator-toggle-max {
    background: #1e293b;
    border-color: #475569;
    color: #94a3b8;
  }
  
  :global(.dark) .indicator-toggle-max:hover {
    background: #334155;
    border-color: #64748b;
  }
  
  :global(.dark) .indicator-toggle-max.active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
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
