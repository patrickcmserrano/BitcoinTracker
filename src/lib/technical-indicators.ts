/**
 * Serviço de Indicadores Técnicos
 * 
 * Calcula indicadores técnicos localmente usando a biblioteca technicalindicators
 * sem depender de APIs externas pagas.
 */

import { MACD, RSI, SMA, EMA, Stochastic, BollingerBands, ATR } from 'technicalindicators';

export interface TechnicalAnalysis {
  macd: {
    MACD: number;
    signal: number;
    histogram: number;
  } | null;
  rsi: number | null;
  atr: number | null;
  sma20: number | null;
  sma50: number | null;
  ema9: number | null;
  ema21: number | null;
  stochastic: {
    k: number;
    d: number;
  } | null;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
  trend: 'bullish' | 'bearish' | 'neutral';
  timestamp: Date;
}

export interface OHLCVData {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

/**
 * Calcula todos os indicadores técnicos a partir de dados OHLCV
 * @param data Dados OHLCV do ativo
 * @returns Análise técnica completa
 */
export function calculateTechnicalIndicators(data: OHLCVData): TechnicalAnalysis {
  const { close, high, low } = data;

  // Verificar se temos dados suficientes
  if (close.length < 50) {
    console.warn('Dados insuficientes para cálculo completo de indicadores técnicos');
  }

  // MACD (12, 26, 9)
  let macdResult = null;
  try {
    const macdValues = MACD.calculate({
      values: close,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });
    if (macdValues.length > 0) {
      const lastMACD = macdValues[macdValues.length - 1];
      // Garantir que todos os valores existem
      if (lastMACD.MACD !== undefined && lastMACD.signal !== undefined && lastMACD.histogram !== undefined) {
        macdResult = {
          MACD: lastMACD.MACD,
          signal: lastMACD.signal,
          histogram: lastMACD.histogram
        };
      }
    }
  } catch (error) {
    console.error('Erro ao calcular MACD:', error);
  }

  // RSI (14)
  let rsiResult = null;
  try {
    const rsiValues = RSI.calculate({
      values: close,
      period: 14
    });
    rsiResult = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  } catch (error) {
    console.error('Erro ao calcular RSI:', error);
  }

  // ATR (14) - Average True Range
  let atrResult = null;
  try {
    const atrValues = ATR.calculate({
      high: high,
      low: low,
      close: close,
      period: 14
    });
    atrResult = atrValues.length > 0 ? atrValues[atrValues.length - 1] : null;
  } catch (error) {
    console.error('Erro ao calcular ATR:', error);
  }

  // SMA (20 e 50)
  let sma20Result = null;
  let sma50Result = null;
  try {
    const sma20Values = SMA.calculate({
      values: close,
      period: 20
    });
    sma20Result = sma20Values.length > 0 ? sma20Values[sma20Values.length - 1] : null;

    if (close.length >= 50) {
      const sma50Values = SMA.calculate({
        values: close,
        period: 50
      });
      sma50Result = sma50Values.length > 0 ? sma50Values[sma50Values.length - 1] : null;
    }
  } catch (error) {
    console.error('Erro ao calcular SMA:', error);
  }

  // EMA (9 e 21)
  let ema9Result = null;
  let ema21Result = null;
  try {
    const ema9Values = EMA.calculate({
      values: close,
      period: 9
    });
    ema9Result = ema9Values.length > 0 ? ema9Values[ema9Values.length - 1] : null;

    const ema21Values = EMA.calculate({
      values: close,
      period: 21
    });
    ema21Result = ema21Values.length > 0 ? ema21Values[ema21Values.length - 1] : null;
  } catch (error) {
    console.error('Erro ao calcular EMA:', error);
  }

  // Estocástico (14, 3, 3)
  let stochResult = null;
  try {
    const stochValues = Stochastic.calculate({
      high: high,
      low: low,
      close: close,
      period: 14,
      signalPeriod: 3
    });
    stochResult = stochValues.length > 0 ? stochValues[stochValues.length - 1] : null;
  } catch (error) {
    console.error('Erro ao calcular Estocástico:', error);
  }

  // Bandas de Bollinger (20, 2)
  let bollingerResult = null;
  try {
    const bollingerValues = BollingerBands.calculate({
      values: close,
      period: 20,
      stdDev: 2
    });
    if (bollingerValues.length > 0) {
      const lastBB = bollingerValues[bollingerValues.length - 1];
      if (lastBB.upper !== undefined && lastBB.middle !== undefined && lastBB.lower !== undefined) {
        bollingerResult = {
          upper: lastBB.upper,
          middle: lastBB.middle,
          lower: lastBB.lower
        };
      }
    }
  } catch (error) {
    console.error('Erro ao calcular Bandas de Bollinger:', error);
  }

  // Determinar tendência geral
  const trend = determineTrend(close[close.length - 1], sma20Result, sma50Result, macdResult, rsiResult);

  return {
    macd: macdResult,
    rsi: rsiResult,
    atr: atrResult,
    sma20: sma20Result,
    sma50: sma50Result,
    ema9: ema9Result,
    ema21: ema21Result,
    stochastic: stochResult,
    bollingerBands: bollingerResult,
    trend,
    timestamp: new Date()
  };
}

/**
 * Determina a tendência geral do ativo baseado nos indicadores
 */
function determineTrend(
  currentPrice: number,
  sma20: number | null,
  sma50: number | null,
  macd: any | null,
  rsi: number | null
): 'bullish' | 'bearish' | 'neutral' {
  let bullishSignals = 0;
  let bearishSignals = 0;

  // Preço vs SMA20
  if (sma20 !== null) {
    if (currentPrice > sma20) bullishSignals++;
    else bearishSignals++;
  }

  // Preço vs SMA50
  if (sma50 !== null) {
    if (currentPrice > sma50) bullishSignals++;
    else bearishSignals++;
  }

  // MACD
  if (macd !== null) {
    if (macd.MACD > macd.signal) bullishSignals++;
    else bearishSignals++;
  }

  // RSI
  if (rsi !== null) {
    if (rsi > 50) bullishSignals++;
    else if (rsi < 50) bearishSignals++;
  }

  // Determinar tendência baseado na maioria dos sinais
  if (bullishSignals > bearishSignals) return 'bullish';
  if (bearishSignals > bullishSignals) return 'bearish';
  return 'neutral';
}

/**
 * Retorna interpretação textual do RSI
 */
export function interpretRSI(rsi: number | null): string {
  if (rsi === null) return 'N/A';
  if (rsi > 70) return 'Sobrecomprado';
  if (rsi < 30) return 'Sobrevendido';
  if (rsi >= 50) return 'Bullish';
  return 'Bearish';
}

/**
 * Retorna interpretação textual do Estocástico
 */
export function interpretStochastic(stoch: { k: number; d: number } | null): string {
  if (stoch === null) return 'N/A';
  if (stoch.k > 80 && stoch.d > 80) return 'Sobrecomprado';
  if (stoch.k < 20 && stoch.d < 20) return 'Sobrevendido';
  if (stoch.k > stoch.d) return 'Cruzamento Bullish';
  if (stoch.k < stoch.d) return 'Cruzamento Bearish';
  return 'Neutro';
}

/**
 * Retorna interpretação textual do MACD
 */
export function interpretMACD(macd: { MACD: number; signal: number; histogram: number } | null): string {
  if (macd === null) return 'N/A';
  if (macd.MACD > macd.signal && macd.histogram > 0) return 'Bullish (Forte)';
  if (macd.MACD > macd.signal) return 'Bullish';
  if (macd.MACD < macd.signal && macd.histogram < 0) return 'Bearish (Forte)';
  if (macd.MACD < macd.signal) return 'Bearish';
  return 'Neutro';
}

/**
 * Retorna interpretação textual do ATR
 * @param atr Valor do ATR
 * @param currentPrice Preço atual para calcular porcentagem
 */
export function interpretATR(atr: number | null, currentPrice: number): string {
  if (atr === null) return 'N/A';
  
  // Calcular ATR como porcentagem do preço
  const atrPercent = (atr / currentPrice) * 100;
  
  if (atrPercent < 1) return 'Baixa Volatilidade';
  if (atrPercent < 2) return 'Volatilidade Normal';
  if (atrPercent < 3) return 'Alta Volatilidade';
  return 'Volatilidade Extrema';
}

/**
 * Formata número para exibição
 */
export function formatIndicatorValue(value: number | null, decimals: number = 2): string {
  if (value === null) return 'N/A';
  return value.toFixed(decimals);
}

/**
 * Interface para séries completas de indicadores (para plotagem em gráficos)
 */
export interface IndicatorSeries {
  sma20: number[];
  sma50: number[];
  ema9: number[];
  ema21: number[];
  bollingerUpper: number[];
  bollingerMiddle: number[];
  bollingerLower: number[];
  macdLine: number[];
  macdSignal: number[];
  macdHistogram: number[];
}

/**
 * Calcula séries completas de indicadores para plotagem
 * @param data Dados OHLCV do ativo
 * @returns Séries completas de indicadores
 */
export function calculateIndicatorSeries(data: OHLCVData): IndicatorSeries {
  const { close } = data;

  // SMA
  const sma20 = SMA.calculate({ values: close, period: 20 });
  const sma50 = SMA.calculate({ values: close, period: 50 });

  // EMA
  const ema9 = EMA.calculate({ values: close, period: 9 });
  const ema21 = EMA.calculate({ values: close, period: 21 });

  // Bollinger Bands
  const bollingerBands = BollingerBands.calculate({
    values: close,
    period: 20,
    stdDev: 2
  });

  const bollingerUpper = bollingerBands.map(bb => bb.upper || 0);
  const bollingerMiddle = bollingerBands.map(bb => bb.middle || 0);
  const bollingerLower = bollingerBands.map(bb => bb.lower || 0);

  // MACD
  const macdValues = MACD.calculate({
    values: close,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });

  const macdLine = macdValues.map(m => m.MACD || 0);
  const macdSignal = macdValues.map(m => m.signal || 0);
  const macdHistogram = macdValues.map(m => m.histogram || 0);

  return {
    sma20,
    sma50,
    ema9,
    ema21,
    bollingerUpper,
    bollingerMiddle,
    bollingerLower,
    macdLine,
    macdSignal,
    macdHistogram
  };
}
