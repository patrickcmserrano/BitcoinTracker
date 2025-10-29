import {
  SMA,
  EMA,
  MACD,
  RSI,
  BollingerBands,
  Stochastic,
  ATR,
} from 'technicalindicators';
import { logger } from '../config/logger';

export interface OHLCVData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MACDResult {
  MACD: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsResult {
  upper: number;
  middle: number;
  lower: number;
}

export interface StochasticResult {
  k: number;
  d: number;
}

export interface TripleScreenData {
  daily: {
    macd: MACDResult;
    ema: number;
  };
  fourHour: {
    stochastic: StochasticResult;
    rsi: number;
  };
  oneHour: {
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    macd: MACDResult;
  };
}

export class TechnicalIndicatorsService {
  /**
   * Calculate Simple Moving Average
   */
  calculateSMA(values: number[], period: number): number[] {
    try {
      return SMA.calculate({ period, values });
    } catch (error) {
      logger.error(`Error calculating SMA (period: ${period}):`, error);
      return [];
    }
  }

  /**
   * Calculate Exponential Moving Average
   */
  calculateEMA(values: number[], period: number): number[] {
    try {
      return EMA.calculate({ period, values });
    } catch (error) {
      logger.error(`Error calculating EMA (period: ${period}):`, error);
      return [];
    }
  }

  /**
   * Calculate MACD
   */
  calculateMACD(
    values: number[],
    fastPeriod: number = 12,
    slowPeriod: number = 26,
    signalPeriod: number = 9
  ): MACDResult | null {
    try {
      const results = MACD.calculate({
        values,
        fastPeriod,
        slowPeriod,
        signalPeriod,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      });

      if (!results || results.length === 0) {
        return null;
      }

      const latest = results[results.length - 1];
      return {
        MACD: latest.MACD || 0,
        signal: latest.signal || 0,
        histogram: latest.histogram || 0,
      };
    } catch (error) {
      logger.error('Error calculating MACD:', error);
      return null;
    }
  }

  /**
   * Calculate RSI
   */
  calculateRSI(values: number[], period: number = 14): number | null {
    try {
      const results = RSI.calculate({ values, period });

      if (!results || results.length === 0) {
        return null;
      }

      return results[results.length - 1];
    } catch (error) {
      logger.error(`Error calculating RSI (period: ${period}):`, error);
      return null;
    }
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(
    values: number[],
    period: number = 20,
    stdDev: number = 2
  ): BollingerBandsResult | null {
    try {
      const results = BollingerBands.calculate({
        values,
        period,
        stdDev,
      });

      if (!results || results.length === 0) {
        return null;
      }

      const latest = results[results.length - 1];
      return {
        upper: latest.upper,
        middle: latest.middle,
        lower: latest.lower,
      };
    } catch (error) {
      logger.error('Error calculating Bollinger Bands:', error);
      return null;
    }
  }

  /**
   * Calculate Stochastic Oscillator
   */
  calculateStochastic(
    high: number[],
    low: number[],
    close: number[],
    period: number = 14,
    signalPeriod: number = 3
  ): StochasticResult | null {
    try {
      const results = Stochastic.calculate({
        high,
        low,
        close,
        period,
        signalPeriod,
      });

      if (!results || results.length === 0) {
        return null;
      }

      const latest = results[results.length - 1];
      return {
        k: latest.k,
        d: latest.d,
      };
    } catch (error) {
      logger.error('Error calculating Stochastic:', error);
      return null;
    }
  }

  /**
   * Calculate ATR (Average True Range)
   */
  calculateATR(
    high: number[],
    low: number[],
    close: number[],
    period: number = 14
  ): number | null {
    try {
      const results = ATR.calculate({
        high,
        low,
        close,
        period,
      });

      if (!results || results.length === 0) {
        return null;
      }

      return results[results.length - 1];
    } catch (error) {
      logger.error('Error calculating ATR:', error);
      return null;
    }
  }

  /**
   * Calculate all indicators for a dataset
   */
  calculateAll(ohlcv: OHLCVData[]): {
    sma20: number | null;
    sma50: number | null;
    ema9: number | null;
    ema21: number | null;
    macd: MACDResult | null;
    rsi: number | null;
    bollingerBands: BollingerBandsResult | null;
    stochastic: StochasticResult | null;
    atr: number | null;
  } {
    if (ohlcv.length < 50) {
      logger.warn(`Insufficient data for indicators: ${ohlcv.length} candles`);
      return {
        sma20: null,
        sma50: null,
        ema9: null,
        ema21: null,
        macd: null,
        rsi: null,
        bollingerBands: null,
        stochastic: null,
        atr: null,
      };
    }

    const closes = ohlcv.map((c) => c.close);
    const highs = ohlcv.map((c) => c.high);
    const lows = ohlcv.map((c) => c.low);

    const sma20Array = this.calculateSMA(closes, 20);
    const sma50Array = this.calculateSMA(closes, 50);
    const ema9Array = this.calculateEMA(closes, 9);
    const ema21Array = this.calculateEMA(closes, 21);

    return {
      sma20: sma20Array.length > 0 ? sma20Array[sma20Array.length - 1] : null,
      sma50: sma50Array.length > 0 ? sma50Array[sma50Array.length - 1] : null,
      ema9: ema9Array.length > 0 ? ema9Array[ema9Array.length - 1] : null,
      ema21: ema21Array.length > 0 ? ema21Array[ema21Array.length - 1] : null,
      macd: this.calculateMACD(closes),
      rsi: this.calculateRSI(closes),
      bollingerBands: this.calculateBollingerBands(closes),
      stochastic: this.calculateStochastic(highs, lows, closes),
      atr: this.calculateATR(highs, lows, closes),
    };
  }

  /**
   * Triple Screen Analysis (Elder's Trading System)
   */
  calculateTripleScreen(
    dailyOHLCV: OHLCVData[],
    fourHourOHLCV: OHLCVData[],
    oneHourOHLCV: OHLCVData[]
  ): TripleScreenData | null {
    try {
      // Screen 1: Daily MACD and EMA (long-term trend)
      const dailyCloses = dailyOHLCV.map((c) => c.close);
      const dailyMACD = this.calculateMACD(dailyCloses);
      const dailyEMA = this.calculateEMA(dailyCloses, 26);

      // Screen 2: 4H Stochastic and RSI (intermediate oscillator)
      const fourHourCloses = fourHourOHLCV.map((c) => c.close);
      const fourHourHighs = fourHourOHLCV.map((c) => c.high);
      const fourHourLows = fourHourOHLCV.map((c) => c.low);
      const fourHourStochastic = this.calculateStochastic(
        fourHourHighs,
        fourHourLows,
        fourHourCloses
      );
      const fourHourRSI = this.calculateRSI(fourHourCloses);

      // Screen 3: 1H MACD for entry signals
      const oneHourCloses = oneHourOHLCV.map((c) => c.close);
      const oneHourMACD = this.calculateMACD(oneHourCloses);

      if (!dailyMACD || !fourHourStochastic || !oneHourMACD || dailyEMA.length === 0) {
        logger.warn('Insufficient data for Triple Screen Analysis');
        return null;
      }

      // Determine signal
      let signal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';

      const dailyTrendUp = dailyMACD.histogram > 0;
      const dailyTrendDown = dailyMACD.histogram < 0;

      if (dailyTrendUp && fourHourStochastic.k < 30 && oneHourMACD.histogram > 0) {
        signal = 'BUY';
      } else if (dailyTrendDown && fourHourStochastic.k > 70 && oneHourMACD.histogram < 0) {
        signal = 'SELL';
      }

      return {
        daily: {
          macd: dailyMACD,
          ema: dailyEMA[dailyEMA.length - 1],
        },
        fourHour: {
          stochastic: fourHourStochastic,
          rsi: fourHourRSI || 50,
        },
        oneHour: {
          signal,
          macd: oneHourMACD,
        },
      };
    } catch (error) {
      logger.error('Error calculating Triple Screen Analysis:', error);
      return null;
    }
  }

  /**
   * Determine trend based on EMAs
   */
  determineTrend(ema9: number, ema21: number, price: number): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
    if (price > ema9 && ema9 > ema21) {
      return 'UPTREND';
    } else if (price < ema9 && ema9 < ema21) {
      return 'DOWNTREND';
    } else {
      return 'SIDEWAYS';
    }
  }
}

// Export singleton instance
export const technicalIndicatorsService = new TechnicalIndicatorsService();
