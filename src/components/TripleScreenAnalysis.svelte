<script lang="ts">
import { onMount, onDestroy } from 'svelte';
import { _ } from '../lib/i18n';
import { selectedCrypto, currentCryptoData } from '../lib/crypto-store';
import { getBinanceKlines } from '../lib/api';
import { MACD, Stochastic, EMA } from 'technicalindicators';
import CandleChart from './CandleChart.svelte';

// Estados para cada timeframe (Triple Screen)
let weeklyTrend: 'ALTA' | 'BAIXA' | 'LATERAL' | null = null;
let dailyTrend: 'ALTA' | 'BAIXA' | 'LATERAL' | null = null;
let hourlySetup: 'COMPRA' | 'VENDA' | 'AGUARDAR' | null = null;

// Dados dos indicadores
let weeklyMACD: { histogram: number; MACD: number; signal: number } | null = null;
let weeklyEMA17: number | null = null; // MME 17 do semanal (LOTUS)
let dailyStochastic: { k: number; d: number } | null = null;
let dailyEMA17: number | null = null; // MME 17 do diário (LOTUS)
let hourlyEMA17: number | null = null;

// Estados de loading
let loading = false;
let error: string | null = null;
let lastPrice: number | null = null; // Último preço carregado

// Regra de ouro: Operar apenas na direção da tendência
let operationDirection: 'COMPRA' | 'VENDA' | 'RANGE' | null = null;
let exclusionRule: string = '';

// Checklist operacional (mínimo 4 motivos)
interface TradeReason {
  id: number;
  description: string;
  active: boolean;
  required: boolean;
}

let tradeReasons: TradeReason[] = [
  { id: 1, description: 'Tendência Primária Favorável (Oceano/Semanal)', active: false, required: true },
  { id: 2, description: 'Maré (Diário) dando setup na direção da tendência', active: false, required: false },
  { id: 3, description: 'Preço próximo/acima da EMA 17', active: false, required: false },
  { id: 4, description: 'Suporte/Resistência relevante', active: false, required: false },
  { id: 5, description: 'Padrão de candle de confirmação', active: false, required: false },
  { id: 6, description: 'Volume acima da média', active: false, required: false },
];

// Gerenciamento de risco
let capital = 2000; // Capital operacional padrão (USD)
let riskPercentage = 2; // Risco máximo por operação (%)
let maxMonthlyLoss = 6; // Perda máxima mensal (%)
let riskRewardRatio = 1.5; // Relação Risco/Recompensa mínima

// Cálculo do Stop Loss usando ATR
let atrValue: number | null = null;
let entryPrice: number | null = null;
let stopLoss: number | null = null;
let takeProfit: number | null = null;
let positionSize: number | null = null;

// Calcular valores de risco
$: maxDailyLoss = (capital * riskPercentage) / 100;
$: maxMonthlyLossValue = (capital * maxMonthlyLoss) / 100;
$: activeReasonsCount = tradeReasons.filter(r => r.active).length;
$: canEnterTrade = activeReasonsCount >= 4 && tradeReasons[0].active; // Regra de ouro: mínimo 4 motivos e tendência obrigatória

// Função para buscar dados históricos e calcular indicadores
async function fetchTripleScreenData() {
  loading = true;
  error = null;
  
  try {
    const symbol = $selectedCrypto.binanceSymbol;
    console.log('🎯 Triple Screen: Iniciando análise para', symbol);
    
    // 1. OCEANO (Semanal) - MACD para tendência de médio prazo
    console.log('🌊 Buscando dados semanais...');
    const weeklyData = await getBinanceKlines(symbol, '1w', 100);
    console.log('🌊 Dados semanais recebidos:', weeklyData.length, 'candles');
    
    // A API retorna arrays: [time, open, high, low, close, volume, ...]
    // Índice 4 = close
    const weeklyCloses = weeklyData.map(k => parseFloat(k[4]));
    console.log('🌊 Primeiros 5 closes:', weeklyCloses.slice(0, 5));
    
    const macdInput = {
      values: weeklyCloses,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    };
    
    console.log('🌊 Calculando MACD...');
    const macdResult = MACD.calculate(macdInput);
    console.log('🌊 MACD resultado:', macdResult.length, 'valores');
    const latestMACD = macdResult[macdResult.length - 1];
    console.log('🌊 Último MACD:', latestMACD);
    
    // Calcular MME 17 do semanal (metodologia LOTUS)
    console.log('🌊 Calculando MME 17 semanal...');
    const weeklyEMA17Result = EMA.calculate({ period: 17, values: weeklyCloses });
    weeklyEMA17 = weeklyEMA17Result[weeklyEMA17Result.length - 1];
    const currentWeeklyPrice = weeklyCloses[weeklyCloses.length - 1];
    console.log('🌊 MME 17 semanal:', weeklyEMA17, 'Preço atual:', currentWeeklyPrice);
    
    if (latestMACD && 
        typeof latestMACD.histogram === 'number' && 
        typeof latestMACD.MACD === 'number' && 
        typeof latestMACD.signal === 'number' &&
        weeklyEMA17) {
      weeklyMACD = {
        histogram: latestMACD.histogram,
        MACD: latestMACD.MACD,
        signal: latestMACD.signal
      };
      
      // Determinar tendência semanal (LOTUS: MACD + posição do preço em relação à MME 17)
      const priceAboveEMA = currentWeeklyPrice > weeklyEMA17;
      const macdBullish = latestMACD.histogram > 0 && latestMACD.MACD > latestMACD.signal;
      const macdBearish = latestMACD.histogram < 0 && latestMACD.MACD < latestMACD.signal;
      
      if (macdBullish && priceAboveEMA) {
        weeklyTrend = 'ALTA';
        operationDirection = 'COMPRA';
        exclusionRule = 'EXCLUIR VENDAS - Operar apenas compras aguardando baixa no diário';
        console.log('🌊 Tendência: ALTA CONFIRMADA (MACD bullish + Preço acima MME17)');
      } else if (macdBearish && !priceAboveEMA) {
        weeklyTrend = 'BAIXA';
        operationDirection = 'VENDA';
        exclusionRule = 'EXCLUIR COMPRAS - Operar apenas vendas aguardando alta no diário';
        console.log('🌊 Tendência: BAIXA CONFIRMADA (MACD bearish + Preço abaixo MME17)');
      } else {
        weeklyTrend = 'LATERAL';
        operationDirection = 'RANGE';
        exclusionRule = 'MERCADO LATERAL - Usar estratégia de faixa de negociação';
        console.log('🌊 Tendência: LATERAL (sinais conflitantes entre MACD e MME17)');
      }
    } else {
      console.warn('⚠️ MACD não retornou dados válidos');
    }
    
    // 2. MARÉ (Diário) - Estocástico e EMA 17 para timing
    console.log('🌀 Buscando dados diários...');
    const dailyData = await getBinanceKlines(symbol, '1d', 100);
    console.log('🌀 Dados diários recebidos:', dailyData.length, 'candles');
    
    // Índices: 2 = high, 3 = low, 4 = close
    const dailyHighs = dailyData.map(k => parseFloat(k[2]));
    const dailyLows = dailyData.map(k => parseFloat(k[3]));
    const dailyCloses = dailyData.map(k => parseFloat(k[4]));
    
    const stochInput = {
      high: dailyHighs,
      low: dailyLows,
      close: dailyCloses,
      period: 14,
      signalPeriod: 3
    };
    
    console.log('🌀 Calculando Estocástico...');
    const stochResult = Stochastic.calculate(stochInput);
    console.log('🌀 Estocástico resultado:', stochResult.length, 'valores');
    const latestStoch = stochResult[stochResult.length - 1];
    console.log('🌀 Último Estocástico:', latestStoch);
    
    // Calcular MME 17 do diário (metodologia LOTUS)
    console.log('🌀 Calculando MME 17 diária...');
    const dailyEMA17Result = EMA.calculate({ period: 17, values: dailyCloses });
    dailyEMA17 = dailyEMA17Result[dailyEMA17Result.length - 1];
    const currentDailyPrice = dailyCloses[dailyCloses.length - 1];
    console.log('🌀 MME 17 diária:', dailyEMA17, 'Preço atual:', currentDailyPrice);
    
    if (latestStoch && dailyEMA17) {
      dailyStochastic = latestStoch;
      
      // Determinar setup diário (LOTUS: Estocástico + MME 17)
      const dailyPriceAboveEMA = currentDailyPrice > dailyEMA17;
      
      if (operationDirection === 'COMPRA') {
        // Buscar oportunidade de compra: esperar recuo (estocástico baixo)
        if (latestStoch.k < 30) {
          dailyTrend = 'BAIXA';
          hourlySetup = 'COMPRA'; // Aguardar setup de compra no horário
          console.log('🌀 Setup: COMPRA (estocástico em sobrevenda)');
        } else if (latestStoch.k > 70) {
          dailyTrend = 'ALTA';
          hourlySetup = 'AGUARDAR'; // Não entrar em sobrecompra
          console.log('🌀 Setup: AGUARDAR (estocástico em sobrecompra)');
        } else {
          dailyTrend = 'LATERAL';
          hourlySetup = 'AGUARDAR';
          console.log('🌀 Setup: AGUARDAR (estocástico neutro)');
        }
      } else if (operationDirection === 'VENDA') {
        // Buscar oportunidade de venda: esperar alta (estocástico alto)
        if (latestStoch.k > 70) {
          dailyTrend = 'ALTA';
          hourlySetup = 'VENDA'; // Aguardar setup de venda no horário
          console.log('🌀 Setup: VENDA (estocástico em sobrecompra)');
        } else if (latestStoch.k < 30) {
          dailyTrend = 'BAIXA';
          hourlySetup = 'AGUARDAR'; // Não entrar em sobrevenda
          console.log('🌀 Setup: AGUARDAR (estocástico em sobrevenda)');
        } else {
          dailyTrend = 'LATERAL';
          hourlySetup = 'AGUARDAR';
          console.log('🌀 Setup: AGUARDAR (estocástico neutro)');
        }
      } else {
        dailyTrend = 'LATERAL';
        hourlySetup = 'AGUARDAR';
        console.log('🌀 Setup: AGUARDAR (mercado lateral)');
      }
    }
    
    // 3. ONDA (60 minutos) - EMA 17 para confirmação
    const hourlyData = await getBinanceKlines(symbol, '1h', 100);
    const hourlyCloses = hourlyData.map(k => parseFloat(k[4]));
    
    // Armazenar último preço para usar no botão
    lastPrice = hourlyCloses[hourlyCloses.length - 1];
    console.log('💰 Último preço capturado:', lastPrice);
    
    const ema17Result = EMA.calculate({ period: 17, values: hourlyCloses });
    hourlyEMA17 = ema17Result[ema17Result.length - 1];
    
    // Calcular ATR para Stop Loss (usando dados diários)
    const atrInput = {
      high: dailyHighs.slice(-14),
      low: dailyLows.slice(-14),
      close: dailyCloses.slice(-14),
      period: 3
    };
    
    // Cálculo manual do ATR (Average True Range)
    const trueRanges: number[] = [];
    for (let i = 1; i < atrInput.close.length; i++) {
      const high = atrInput.high[i];
      const low = atrInput.low[i];
      const prevClose = atrInput.close[i - 1];
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      
      trueRanges.push(tr);
    }
    
    atrValue = trueRanges.slice(-3).reduce((a, b) => a + b, 0) / 3;
    console.log('📊 ATR calculado:', atrValue);
    console.log('📈 Direção da operação:', operationDirection);
    
    // Atualizar primeiro motivo se tendência está favorável
    if (weeklyTrend === 'ALTA' || weeklyTrend === 'BAIXA') {
      tradeReasons[0].active = true;
    }
    
  } catch (err) {
    error = err instanceof Error ? err.message : 'Erro ao buscar dados';
    console.error('Error fetching triple screen data:', err);
  } finally {
    loading = false;
  }
}

// Calcular Stop Loss e Take Profit
function calculateRiskManagement() {
  if (!atrValue || !entryPrice) {
    console.log('⚠️ Calculadora: Faltam dados - ATR:', atrValue, 'Preço:', entryPrice);
    return;
  }
  
  console.log('🎯 Calculando Stop Loss...');
  console.log('📊 Direção:', operationDirection);
  console.log('💰 Preço de Entrada:', entryPrice);
  console.log('📏 ATR:', atrValue);
  console.log('🎲 Risco/Ganho:', riskRewardRatio);
  
  // Stop Loss = ATR de 3 períodos
  // Se não houver direção definida, assumir COMPRA por padrão
  const direction = operationDirection || 'COMPRA';
  
  if (direction === 'COMPRA') {
    stopLoss = entryPrice - atrValue;
    takeProfit = entryPrice + (atrValue * riskRewardRatio);
    console.log('✅ COMPRA - Stop Loss:', stopLoss, 'Take Profit:', takeProfit);
  } else if (direction === 'VENDA') {
    stopLoss = entryPrice + atrValue;
    takeProfit = entryPrice - (atrValue * riskRewardRatio);
    console.log('✅ VENDA - Stop Loss:', stopLoss, 'Take Profit:', takeProfit);
  } else {
    // RANGE - calcular ambos os lados
    stopLoss = entryPrice - atrValue;
    takeProfit = entryPrice + (atrValue * riskRewardRatio);
    console.log('⚠️ RANGE - Usando cálculo de COMPRA por padrão');
  }
  
  // Calcular tamanho da posição baseado no risco
  const riskPerTrade = maxDailyLoss;
  const riskPerUnit = Math.abs((entryPrice || 0) - (stopLoss || 0));
  positionSize = riskPerTrade / riskPerUnit;
  
  console.log('📦 Tamanho da Posição:', positionSize);
  console.log('✅ Cálculo concluído - stopLoss:', stopLoss, 'takeProfit:', takeProfit);
}

$: if (entryPrice && atrValue) {
  console.log('🔄 Reativo acionado - Preço:', entryPrice, 'ATR:', atrValue);
  calculateRiskManagement();
}

onMount(() => {
  fetchTripleScreenData();
  
  // Atualizar a cada 5 minutos
  const interval = setInterval(fetchTripleScreenData, 5 * 60 * 1000);
  
  return () => clearInterval(interval);
});
</script>

<div class="triple-screen-container">
  <!-- Header -->
  <div class="header">
    <h1 class="title">🎯 Análise Triple Screen - Academia LOTUS</h1>
    <p class="subtitle">Sistema de análise multitemporal para operar apenas na direção da tendência</p>
    <button class="refresh-btn" on:click={fetchTripleScreenData} disabled={loading}>
      <span class="refresh-icon" class:spinning={loading}>↻</span>
      Atualizar
    </button>
  </div>

  {#if loading && !weeklyTrend}
    <div class="loading">
      <div class="spinner"></div>
      <p>Calculando Triple Screen...</p>
    </div>
  {:else if error}
    <div class="error">
      <p>⚠️ {error}</p>
      <button on:click={fetchTripleScreenData}>Tentar novamente</button>
    </div>
  {:else}
    <!-- Grid de análises por timeframe -->
    <div class="timeframes-grid">
      <!-- 1. OCEANO (Semanal) - Tendência Principal -->
      <div class="timeframe-card oceano">
        <div class="timeframe-header">
          <span class="timeframe-icon">🌊</span>
          <h2>OCEANO (Semanal)</h2>
          <span class="indicator-badge">MACD + MME17</span>
        </div>
        
        <div class="trend-display">
          <div class="trend-label">Tendência Principal:</div>
          <div class="trend-value {weeklyTrend?.toLowerCase()}">
            {weeklyTrend || 'Carregando...'}
          </div>
        </div>
        
        {#if weeklyMACD && weeklyEMA17}
          <div class="indicator-values">
            <div class="indicator-row">
              <span>MACD:</span>
              <span class="value">{weeklyMACD.MACD.toFixed(2)}</span>
            </div>
            <div class="indicator-row">
              <span>Signal:</span>
              <span class="value">{weeklyMACD.signal.toFixed(2)}</span>
            </div>
            <div class="indicator-row">
              <span>Histogram:</span>
              <span class="value {weeklyMACD.histogram > 0 ? 'positive' : 'negative'}">
                {weeklyMACD.histogram.toFixed(2)}
              </span>
            </div>
            <div class="indicator-row highlight">
              <span>MME 17 (LOTUS):</span>
              <span class="value">${weeklyEMA17.toFixed(2)}</span>
            </div>
          </div>
        {:else}
          <div class="indicator-values">
            <div class="no-data">📊 Aguardando dados...</div>
          </div>
        {/if}
        
        <div class="rule-box">
          <strong>Regra de Ouro #2:</strong> {exclusionRule || 'Calculando tendência...'}
        </div>
      </div>

      <!-- 2. MARÉ (Diário) - Timing de Entrada -->
      <div class="timeframe-card mare">
        <div class="timeframe-header">
          <span class="timeframe-icon">🌀</span>
          <h2>MARÉ (Diário)</h2>
          <span class="indicator-badge">Estocástico + MME17</span>
        </div>
        
        <div class="trend-display">
          <div class="trend-label">Momento Diário:</div>
          <div class="trend-value {dailyTrend?.toLowerCase()}">
            {dailyTrend || 'Carregando...'}
          </div>
        </div>
        
        {#if dailyStochastic && dailyEMA17}
          <div class="indicator-values">
            <div class="indicator-row">
              <span>%K:</span>
              <span class="value">{dailyStochastic.k.toFixed(2)}</span>
            </div>
            <div class="indicator-row">
              <span>%D:</span>
              <span class="value">{dailyStochastic.d.toFixed(2)}</span>
            </div>
            <div class="indicator-row highlight">
              <span>MME 17 (LOTUS):</span>
              <span class="value">${dailyEMA17.toFixed(2)}</span>
            </div>
            <div class="stoch-zones">
              <div class="zone" class:active={dailyStochastic.k < 30}>Sobrevenda (&lt;30)</div>
              <div class="zone" class:active={dailyStochastic.k > 70}>Sobrecompra (&gt;70)</div>
            </div>
          </div>
        {:else}
          <div class="indicator-values">
            <div class="no-data">📊 Aguardando dados...</div>
          </div>
        {/if}
        
        <div class="setup-box">
          <strong>Setup:</strong> {hourlySetup || 'AGUARDAR'}
        </div>
      </div>

      <!-- 3. ONDA (60 min) - Confirmação -->
      <div class="timeframe-card onda">
        <div class="timeframe-header">
          <span class="timeframe-icon">〰️</span>
          <h2>ONDA (60 min)</h2>
          <span class="indicator-badge">EMA 17</span>
        </div>
        
        <div class="trend-display">
          <div class="trend-label">Direção da Operação:</div>
          <div class="trend-value {operationDirection?.toLowerCase()}">
            {operationDirection || 'Carregando...'}
          </div>
        </div>
        
        {#if hourlyEMA17}
          <div class="indicator-values">
            <div class="indicator-row">
              <span>EMA 17:</span>
              <span class="value">${hourlyEMA17.toFixed(2)}</span>
            </div>
          </div>
        {:else}
          <div class="indicator-values">
            <div class="no-data">📊 Aguardando dados...</div>
          </div>
        {/if}
        
        <div class="chart-preview">
          <CandleChart 
            symbol={$selectedCrypto.binanceSymbol}
            interval="1h"
            activeTimeframe="1h"
          />
        </div>
      </div>
    </div>

    <!-- Justificativa da Análise Triple Screen -->
    <div class="analysis-summary">
      <div class="summary-header">
        <h2>📊 Análise e Justificativa do Triple Screen</h2>
        <p class="summary-subtitle">Entenda o raciocínio por trás da leitura multitemporal</p>
      </div>
      
      <div class="summary-grid">
        <!-- Resumo da Tendência -->
        <div class="summary-card main-trend">
          <div class="summary-icon">🎯</div>
          <h3>Direção Operacional</h3>
          <div class="summary-value {operationDirection?.toLowerCase()}">
            {operationDirection || 'Aguardando dados...'}
          </div>
          <p class="summary-explanation">
            {#if operationDirection === 'COMPRA'}
              A tendência semanal (OCEANO) está em alta, portanto devemos <strong>excluir vendas</strong> 
              e buscar apenas oportunidades de compra quando o mercado diário (MARÉ) recuar.
            {:else if operationDirection === 'VENDA'}
              A tendência semanal (OCEANO) está em baixa, portanto devemos <strong>excluir compras</strong> 
              e buscar apenas oportunidades de venda quando o mercado diário (MARÉ) subir.
            {:else if operationDirection === 'RANGE'}
              O mercado está <strong>lateral</strong> no semanal. Neste caso, o método Triple Screen 
              não se aplica. Considere usar estratégias de faixa de negociação (suporte/resistência).
            {:else}
              Calculando tendência...
            {/if}
          </p>
        </div>

        <!-- Justificativa OCEANO -->
        <div class="summary-card oceano-justify">
          <div class="summary-icon">🌊</div>
          <h3>Por que {weeklyTrend}? (Semanal)</h3>
          {#if weeklyMACD}
            <div class="justify-points">
              <div class="justify-item">
                <span class="justify-label">MACD Histogram:</span>
                <span class="justify-value {weeklyMACD.histogram > 0 ? 'positive' : 'negative'}">
                  {weeklyMACD.histogram > 0 ? 'Positivo' : 'Negativo'} ({weeklyMACD.histogram.toFixed(2)})
                </span>
              </div>
              <div class="justify-item">
                <span class="justify-label">MACD vs Signal:</span>
                <span class="justify-value">
                  {weeklyMACD.MACD > weeklyMACD.signal ? 'MACD acima' : 'MACD abaixo'} da linha de sinal
                </span>
              </div>
              <div class="justify-conclusion">
                {#if weeklyTrend === 'ALTA'}
                  ✅ Histograma positivo + MACD acima do sinal = <strong>Tendência de ALTA confirmada</strong>
                {:else if weeklyTrend === 'BAIXA'}
                  ✅ Histograma negativo + MACD abaixo do sinal = <strong>Tendência de BAIXA confirmada</strong>
                {:else}
                  ⚠️ Sinais conflitantes ou cruzamento recente = <strong>Mercado LATERAL</strong>
                {/if}
              </div>
            </div>
          {:else}
            <p class="loading-text">Calculando MACD semanal...</p>
          {/if}
        </div>

        <!-- Justificativa MARÉ -->
        <div class="summary-card mare-justify">
          <div class="summary-icon">🌀</div>
          <h3>Setup de Entrada (Diário)</h3>
          {#if dailyStochastic}
            <div class="justify-points">
              <div class="justify-item">
                <span class="justify-label">Estocástico %K:</span>
                <span class="justify-value">
                  {dailyStochastic.k.toFixed(2)}
                  {#if dailyStochastic.k < 30}
                    (Sobrevenda)
                  {:else if dailyStochastic.k > 70}
                    (Sobrecompra)
                  {:else}
                    (Neutro)
                  {/if}
                </span>
              </div>
              <div class="justify-conclusion">
                {#if hourlySetup === 'COMPRA'}
                  ✅ Estocástico em sobrevenda (&lt;30) + Tendência de alta = 
                  <strong>Momento ideal para COMPRAR</strong> no rompimento do horário
                {:else if hourlySetup === 'VENDA'}
                  ✅ Estocástico em sobrecompra (&gt;70) + Tendência de baixa = 
                  <strong>Momento ideal para VENDER</strong> no rompimento do horário
                {:else}
                  ⏳ Estocástico em zona neutra. <strong>Aguarde</strong> entrada em zona de sobrevenda/sobrecompra 
                  alinhada com a tendência principal.
                {/if}
              </div>
            </div>
          {:else}
            <p class="loading-text">Calculando Estocástico diário...</p>
          {/if}
        </div>

        <!-- Justificativa ONDA -->
        <div class="summary-card onda-justify">
          <div class="summary-icon">〰️</div>
          <h3>Confirmação (60 minutos)</h3>
          {#if hourlyEMA17}
            <div class="justify-points">
              <div class="justify-item">
                <span class="justify-label">EMA 17 períodos:</span>
                <span class="justify-value">${hourlyEMA17.toFixed(2)}</span>
              </div>
              <div class="justify-conclusion">
                📍 Use a EMA 17 como <strong>referência</strong> para entrada:
                <ul class="justify-list">
                  <li>Em COMPRA: Preço próximo ou acima da EMA 17</li>
                  <li>Em VENDA: Preço próximo ou abaixo da EMA 17</li>
                  <li>Aguarde padrão de candle de confirmação no gráfico de 60min</li>
                </ul>
              </div>
            </div>
          {:else}
            <p class="loading-text">Calculando EMA 17...</p>
          {/if}
        </div>
      </div>

      <!-- Resumo da Decisão Final -->
      <div class="final-decision">
        <div class="decision-icon">
          {#if canEnterTrade && (hourlySetup === 'COMPRA' || hourlySetup === 'VENDA')}
            ✅
          {:else}
            ⏳
          {/if}
        </div>
        <div class="decision-content">
          <h3 class="decision-title">Decisão Final:</h3>
          {#if canEnterTrade && hourlySetup === 'COMPRA'}
            <p class="decision-text ready">
              <strong>PRONTO PARA COMPRAR!</strong> Todos os timeframes estão alinhados. 
              Aguarde confirmação no gráfico de 60 minutos (padrão de candle, volume, suporte).
            </p>
          {:else if canEnterTrade && hourlySetup === 'VENDA'}
            <p class="decision-text ready">
              <strong>PRONTO PARA VENDER!</strong> Todos os timeframes estão alinhados. 
              Aguarde confirmação no gráfico de 60 minutos (padrão de candle, volume, resistência).
            </p>
          {:else if operationDirection === 'RANGE'}
            <p class="decision-text warning">
              <strong>MERCADO LATERAL.</strong> O Triple Screen não se aplica. 
              Considere estratégias de faixa de negociação ou aguarde definição de tendência.
            </p>
          {:else}
            <p class="decision-text wait">
              <strong>AGUARDAR.</strong> {hourlySetup !== 'COMPRA' && hourlySetup !== 'VENDA' ? 
              'O timing do diário ainda não está favorável.' : 
              'Complete o checklist com os 4 motivos obrigatórios antes de operar.'}
            </p>
          {/if}
        </div>
      </div>
    </div>

    <!-- Checklist Operacional -->
    <div class="checklist-section">
      <div class="section-header">
        <h2>📋 Checklist Operacional (Regra de Ouro #5)</h2>
        <p class="section-subtitle">
          Mínimo 4 motivos para entrar na operação - Tendência Primária é OBRIGATÓRIA
        </p>
      </div>
      
      <div class="checklist">
        {#each tradeReasons as reason}
          <div class="checklist-item">
            <label>
              <input 
                type="checkbox" 
                bind:checked={reason.active}
                disabled={reason.required}
              />
              <span class="checkbox-label {reason.required ? 'required' : ''}">
                {reason.description}
                {#if reason.required}
                  <span class="badge-required">OBRIGATÓRIO</span>
                {/if}
              </span>
            </label>
          </div>
        {/each}
      </div>
      
      <div class="checklist-status">
        <div class="status-indicator" class:ready={canEnterTrade}>
          {activeReasonsCount} de 4 motivos ativos
        </div>
        {#if canEnterTrade}
          <div class="ready-message">✅ Pronto para operar!</div>
        {:else}
          <div class="wait-message">⏳ Aguarde mais confirmações</div>
        {/if}
      </div>
    </div>

    <!-- Gerenciamento de Risco -->
    <div class="risk-management-section">
      <div class="section-header">
        <h2>💰 Gerenciamento de Risco (Regra de Ouro #1)</h2>
        <p class="section-subtitle">
          Regra dos 2% - Máximo 6% de perda mensal
        </p>
      </div>
      
      <div class="risk-grid">
        <div class="risk-card">
          <label for="capital-input">Capital Operacional (USD):</label>
          <input id="capital-input" type="number" bind:value={capital} min="100" step="100" />
        </div>
        
        <div class="risk-card">
          <label for="risk-input">Risco por Operação (%):</label>
          <input id="risk-input" type="number" bind:value={riskPercentage} min="0.5" max="5" step="0.5" />
        </div>
        
        <div class="risk-card highlight">
          <div class="risk-label">Perda Máxima Diária:</div>
          <div class="risk-value">${maxDailyLoss.toFixed(2)}</div>
        </div>
        
        <div class="risk-card highlight">
          <div class="risk-label">Perda Máxima Mensal:</div>
          <div class="risk-value">${maxMonthlyLossValue.toFixed(2)}</div>
        </div>
      </div>
      
      <!-- Calculadora de Stop Loss -->
      <div class="stop-loss-calculator">
        <h3>🎯 Calculadora de Stop Loss (ATR 3 períodos)</h3>
        
        <div class="calculator-grid">
          <div class="calc-input">
            <label for="entry-price">Preço de Entrada:</label>
            <input 
              id="entry-price"
              type="number" 
              bind:value={entryPrice} 
              placeholder="Digite o preço de entrada"
              step="0.01"
            />
            <button 
              class="use-current-price"
              on:click={() => {
                // Priorizar o último preço carregado, ou usar do store
                const priceToUse = lastPrice || $currentCryptoData?.price;
                if (priceToUse) {
                  entryPrice = priceToUse;
                  console.log('💰 Preço de entrada definido:', entryPrice);
                }
              }}
              disabled={!lastPrice && !$currentCryptoData}
            >
              💰 Usar Preço Atual
            </button>
          </div>
          
          <div class="calc-display">
            <div class="calc-label">ATR (3 dias):</div>
            <div class="calc-value">
              {atrValue ? `$${atrValue.toFixed(2)}` : 'Calculando...'}
            </div>
          </div>
          
          <div class="calc-input">
            <label for="risk-reward">Relação Risco/Ganho:</label>
            <input 
              id="risk-reward"
              type="number" 
              bind:value={riskRewardRatio} 
              min="1"
              max="5"
              step="0.1"
            />
          </div>
        </div>
        
        {#if stopLoss && takeProfit}
          <div class="trade-plan">
            <h4 class="plan-title">📋 Plano de Trade Calculado:</h4>
            <div class="plan-item">
              <span class="plan-label">❌ Stop Loss:</span>
              <span class="plan-value loss">${stopLoss.toFixed(2)}</span>
            </div>
            <div class="plan-item">
              <span class="plan-label">✅ Take Profit:</span>
              <span class="plan-value profit">${takeProfit.toFixed(2)}</span>
            </div>
            <div class="plan-item">
              <span class="plan-label">📊 Tamanho da Posição:</span>
              <span class="plan-value">{positionSize?.toFixed(4)} {$selectedCrypto.symbol}</span>
            </div>
            <div class="plan-item">
              <span class="plan-label">💸 Risco da Operação:</span>
              <span class="plan-value">${maxDailyLoss.toFixed(2)}</span>
            </div>
            <div class="plan-item">
              <span class="plan-label">🎯 Ganho Potencial:</span>
              <span class="plan-value profit">
                ${(maxDailyLoss * riskRewardRatio).toFixed(2)}
              </span>
            </div>
          </div>
        {:else}
          <div class="trade-plan-empty">
            <div class="empty-icon">📝</div>
            <p class="empty-text">
              <strong>Preencha o Preço de Entrada</strong> acima para calcular seu plano de trade completo
            </p>
            <p class="empty-hint">
              💡 Dica: O ATR já está calculado automaticamente com base nos dados diários
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Regras de Ouro -->
    <div class="golden-rules">
      <h2>⭐ Regras de Ouro da Academia LOTUS</h2>
      <div class="rules-grid">
        <div class="rule-card">
          <span class="rule-number">#1</span>
          <p>Risco máximo 2% por dia, 6% por mês</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#2</span>
          <p>Operar APENAS na direção da tendência</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#4</span>
          <p>Relação Risco x Ganho &gt; 1:1</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#5</span>
          <p>Mínimo 4 motivos para entrada</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#6</span>
          <p>Stop move apenas a favor</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#7</span>
          <p>Menor prejuízo é o melhor</p>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .triple-screen-container {
    width: 100%;
    padding: 1rem;
    color: var(--app-text);
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    position: relative;
  }

  .title {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1rem;
    opacity: 0.9;
    margin-bottom: 1rem;
  }

  .refresh-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .refresh-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refresh-icon {
    display: inline-block;
    font-size: 1.2rem;
  }

  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .loading, .error {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  .timeframes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .timeframe-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
  }

  :global(.dark) .timeframe-card {
    background: #1e293b;
  }

  .timeframe-card:hover {
    transform: translateY(-4px);
  }

  .timeframe-card.oceano {
    border-top: 4px solid #3b82f6;
  }

  .timeframe-card.mare {
    border-top: 4px solid #8b5cf6;
  }

  .timeframe-card.onda {
    border-top: 4px solid #10b981;
  }

  .timeframe-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e5e7eb;
  }

  :global(.dark) .timeframe-header {
    border-bottom-color: #374151;
  }

  .timeframe-icon {
    font-size: 2rem;
  }

  .timeframe-header h2 {
    flex: 1;
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
  }

  .indicator-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    font-weight: 600;
  }

  :global(.dark) .indicator-badge {
    background: #374151;
  }

  .trend-display {
    margin: 1.5rem 0;
    text-align: center;
  }

  .trend-label {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .trend-value {
    font-size: 2rem;
    font-weight: 800;
    padding: 0.5rem;
    border-radius: 8px;
  }

  .trend-value.alta {
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
  }

  .trend-value.baixa {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .trend-value.lateral, .trend-value.range {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
  }

  .trend-value.compra {
    color: #10b981;
    background: rgba(16, 185, 129, 0.1);
  }

  .trend-value.venda {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .trend-value.aguardar {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.1);
  }

  .indicator-values {
    margin: 1rem 0;
  }

  .no-data {
    text-align: center;
    padding: 2rem 1rem;
    color: #9ca3af;
    font-size: 0.95rem;
    font-style: italic;
  }

  :global(.dark) .no-data {
    color: #6b7280;
  }

  .indicator-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f3f4f6;
  }

  :global(.dark) .indicator-row {
    border-bottom-color: #374151;
  }

  .indicator-row .value {
    font-weight: 600;
  }

  .indicator-row .value.positive {
    color: #10b981;
  }

  .indicator-row .value.negative {
    color: #ef4444;
  }

  .indicator-row.highlight {
    background: #fef3c7;
    padding: 0.75rem;
    border-radius: 6px;
    border: 2px solid #f59e0b;
    margin-top: 0.5rem;
  }

  :global(.dark) .indicator-row.highlight {
    background: #78350f;
    border-color: #fbbf24;
  }

  .indicator-row.highlight span {
    font-weight: 700;
  }

  .stoch-zones {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .zone {
    flex: 1;
    padding: 0.5rem;
    text-align: center;
    font-size: 0.75rem;
    background: #f3f4f6;
    border-radius: 6px;
    opacity: 0.5;
    transition: all 0.3s;
  }

  :global(.dark) .zone {
    background: #374151;
  }

  .zone.active {
    opacity: 1;
    font-weight: 700;
    background: #fef3c7;
    color: #92400e;
  }

  :global(.dark) .zone.active {
    background: #78350f;
    color: #fef3c7;
  }

  .rule-box, .setup-box {
    margin-top: 1rem;
    padding: 1rem;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  :global(.dark) .rule-box,
  :global(.dark) .setup-box {
    background: #1e3a8a;
    border-left-color: #60a5fa;
  }

  .chart-preview {
    margin-top: 1rem;
    height: 250px;
    width: 100%;
    overflow: hidden;
  }

  /* === Seção de Justificativa da Análise === */
  .analysis-summary {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border: 2px solid #3b82f6;
  }

  :global(.dark) .analysis-summary {
    background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
    border-color: #60a5fa;
  }

  .summary-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .summary-header h2 {
    font-size: 1.75rem;
    font-weight: 800;
    color: #1e40af;
    margin-bottom: 0.5rem;
  }

  :global(.dark) .summary-header h2 {
    color: #bfdbfe;
  }

  .summary-subtitle {
    color: #1e40af;
    font-size: 1rem;
    opacity: 0.8;
  }

  :global(.dark) .summary-subtitle {
    color: #bfdbfe;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .summary-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    transition: transform 0.2s;
  }

  :global(.dark) .summary-card {
    background: #1e293b;
  }

  .summary-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  }

  .summary-card.main-trend {
    grid-column: 1 / -1;
    background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
    border: 2px solid #f59e0b;
  }

  :global(.dark) .summary-card.main-trend {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
    border-color: #fbbf24;
  }

  .summary-icon {
    font-size: 2.5rem;
    text-align: center;
    margin-bottom: 1rem;
  }

  .summary-card h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #374151;
  }

  :global(.dark) .summary-card h3 {
    color: #f9fafb;
  }

  .summary-value {
    font-size: 2rem;
    font-weight: 800;
    text-align: center;
    padding: 0.75rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .summary-value.compra {
    color: #10b981;
    background: rgba(16, 185, 129, 0.15);
  }

  .summary-value.venda {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.15);
  }

  .summary-value.range {
    color: #f59e0b;
    background: rgba(245, 158, 11, 0.15);
  }

  .summary-explanation {
    font-size: 0.95rem;
    line-height: 1.6;
    color: #4b5563;
    text-align: left;
  }

  :global(.dark) .summary-explanation {
    color: #d1d5db;
  }

  .justify-points {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .justify-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 6px;
    font-size: 0.9rem;
  }

  :global(.dark) .justify-item {
    background: #0f172a;
  }

  .justify-label {
    font-weight: 600;
    color: #6b7280;
  }

  :global(.dark) .justify-label {
    color: #9ca3af;
  }

  .justify-value {
    font-weight: 700;
    color: #374151;
  }

  :global(.dark) .justify-value {
    color: #e5e7eb;
  }

  .justify-value.positive {
    color: #10b981;
  }

  .justify-value.negative {
    color: #ef4444;
  }

  .justify-conclusion {
    margin-top: 1rem;
    padding: 1rem;
    background: #f0f9ff;
    border-left: 4px solid #3b82f6;
    border-radius: 6px;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  :global(.dark) .justify-conclusion {
    background: #1e3a8a;
    border-left-color: #60a5fa;
  }

  .justify-list {
    margin: 0.5rem 0 0 1.5rem;
    padding: 0;
  }

  .justify-list li {
    margin: 0.25rem 0;
  }

  .loading-text {
    text-align: center;
    color: #9ca3af;
    font-style: italic;
    padding: 2rem;
  }

  .final-decision {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .final-decision {
    background: #1e293b;
  }

  .decision-icon {
    font-size: 4rem;
    flex-shrink: 0;
  }

  .decision-content {
    flex: 1;
  }

  .decision-title {
    font-size: 1.5rem;
    font-weight: 800;
    color: #1e40af;
    margin-bottom: 0.75rem;
  }

  :global(.dark) .decision-title {
    color: #bfdbfe;
  }

  .decision-text {
    font-size: 1.1rem;
    line-height: 1.6;
  }

  .decision-text.ready {
    color: #10b981;
    font-weight: 600;
  }

  .decision-text.warning {
    color: #f59e0b;
    font-weight: 600;
  }

  .decision-text.wait {
    color: #6b7280;
    font-weight: 500;
  }

  :global(.dark) .decision-text.wait {
    color: #9ca3af;
  }

  /* === Fim da seção de Justificativa === */


  .checklist-section, .risk-management-section {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .checklist-section,
  :global(.dark) .risk-management-section {
    background: #1e293b;
  }

  .section-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  :global(.dark) .section-header {
    border-bottom-color: #374151;
  }

  .section-header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .section-subtitle {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .checklist {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .checklist-item label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  :global(.dark) .checklist-item label {
    background: #0f172a;
  }

  .checklist-item label:hover {
    background: #f3f4f6;
  }

  :global(.dark) .checklist-item label:hover {
    background: #1e293b;
  }

  .checklist-item input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
  }

  .checkbox-label {
    flex: 1;
    font-size: 0.95rem;
  }

  .checkbox-label.required {
    font-weight: 600;
  }

  .badge-required {
    display: inline-block;
    margin-left: 0.5rem;
    padding: 0.125rem 0.5rem;
    background: #fef3c7;
    color: #92400e;
    font-size: 0.625rem;
    font-weight: 700;
    border-radius: 4px;
  }

  :global(.dark) .badge-required {
    background: #78350f;
    color: #fef3c7;
  }

  .checklist-status {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: #f9fafb;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  :global(.dark) .checklist-status {
    background: #0f172a;
  }

  .status-indicator {
    font-size: 1.25rem;
    font-weight: 700;
    color: #6b7280;
  }

  .status-indicator.ready {
    color: #10b981;
  }

  .ready-message {
    color: #10b981;
    font-weight: 700;
    font-size: 1.1rem;
  }

  .wait-message {
    color: #f59e0b;
    font-weight: 600;
  }

  .risk-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .risk-card {
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
  }

  :global(.dark) .risk-card {
    background: #0f172a;
  }

  .risk-card.highlight {
    background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
  }

  :global(.dark) .risk-card.highlight {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
  }

  .risk-card label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    color: #6b7280;
  }

  .risk-card input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 1rem;
    background: white;
  }

  :global(.dark) .risk-card input {
    background: #1e293b;
    border-color: #374151;
    color: white;
  }

  .risk-label {
    font-size: 0.875rem;
    color: #92400e;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  :global(.dark) .risk-label {
    color: #fef3c7;
  }

  .risk-value {
    font-size: 2rem;
    font-weight: 800;
    color: #92400e;
  }

  :global(.dark) .risk-value {
    color: #fef3c7;
  }

  .stop-loss-calculator {
    padding: 1.5rem;
    background: #f0f9ff;
    border-radius: 8px;
    border: 2px solid #3b82f6;
  }

  :global(.dark) .stop-loss-calculator {
    background: #1e3a8a;
    border-color: #60a5fa;
  }

  .stop-loss-calculator h3 {
    font-size: 1.25rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #1e40af;
  }

  :global(.dark) .stop-loss-calculator h3 {
    color: #bfdbfe;
  }

  .calculator-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .calc-input label,
  .calc-label {
    display: block;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    color: #1e40af;
    font-weight: 600;
  }

  :global(.dark) .calc-input label,
  :global(.dark) .calc-label {
    color: #bfdbfe;
  }

  .calc-input input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    font-size: 1rem;
    background: white;
  }

  :global(.dark) .calc-input input {
    background: #1e293b;
    border-color: #60a5fa;
    color: white;
  }

  .calc-value {
    padding: 0.5rem;
    background: white;
    border-radius: 6px;
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e40af;
    text-align: center;
  }

  :global(.dark) .calc-value {
    background: #1e293b;
    color: #bfdbfe;
  }

  .trade-plan {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background: white;
    border-radius: 8px;
  }

  :global(.dark) .trade-plan {
    background: #1e293b;
  }

  .plan-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem;
    background: #f9fafb;
    border-radius: 6px;
  }

  :global(.dark) .plan-item {
    background: #0f172a;
  }

  .plan-label {
    font-weight: 600;
    color: #374151;
  }

  :global(.dark) .plan-label {
    color: #e5e7eb;
  }

  .plan-value {
    font-size: 1.25rem;
    font-weight: 700;
  }

  .plan-value.loss {
    color: #ef4444;
  }

  .plan-value.profit {
    color: #10b981;
  }

  .use-current-price {
    margin-top: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    width: 100%;
  }

  .use-current-price:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .use-current-price:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background: #94a3b8;
  }

  .trade-plan-empty {
    text-align: center;
    padding: 2rem;
    background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
    border-radius: 8px;
    margin-top: 1rem;
  }

  :global(.dark) .trade-plan-empty {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }

  .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .empty-text {
    font-size: 1rem;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  :global(.dark) .empty-text {
    color: #e5e7eb;
  }

  .empty-hint {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.5rem;
  }

  :global(.dark) .empty-hint {
    color: #9ca3af;
  }

  .plan-title {
    font-size: 1.125rem;
    font-weight: 700;
    color: #1e40af;
    margin-bottom: 1rem;
    text-align: center;
  }

  :global(.dark) .plan-title {
    color: #bfdbfe;
  }

  .golden-rules {
    background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  :global(.dark) .golden-rules {
    background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
  }

  .golden-rules h2 {
    font-size: 1.5rem;
    font-weight: 800;
    margin-bottom: 1.5rem;
    text-align: center;
    color: #92400e;
  }

  :global(.dark) .golden-rules h2 {
    color: #fef3c7;
  }

  .rules-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
  }

  .rule-card {
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  :global(.dark) .rule-card {
    background: #1e293b;
  }

  .rule-number {
    display: inline-block;
    width: 40px;
    height: 40px;
    line-height: 40px;
    background: #f59e0b;
    color: white;
    font-weight: 800;
    border-radius: 50%;
    margin-bottom: 0.75rem;
  }

  .rule-card p {
    font-size: 0.95rem;
    font-weight: 600;
    color: #374151;
    margin: 0;
  }

  :global(.dark) .rule-card p {
    color: #e5e7eb;
  }

  @media (max-width: 768px) {
    .timeframes-grid {
      grid-template-columns: 1fr;
    }

    .risk-grid {
      grid-template-columns: 1fr;
    }

    .calculator-grid {
      grid-template-columns: 1fr;
    }

    .rules-grid {
      grid-template-columns: 1fr;
    }

    .title {
      font-size: 1.5rem;
    }
  }
</style>
