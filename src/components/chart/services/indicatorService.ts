import { LineSeries, HistogramSeries, type IChartApi, type ISeriesApi, type LineData, type HistogramData, type Time } from 'lightweight-charts';
import { calculateIndicatorSeries } from '../../../lib/technical-indicators';
import type { ChartSeries } from '../types';

export class IndicatorService {
    private series: Partial<ChartSeries> = {};

    constructor(private chart: IChartApi) { }

    public async updateIndicators(
        symbol: string,
        interval: string,
        klines: any[],
        showSMA: boolean,
        showEMA: boolean,
        showBollinger: boolean,
        showMACD: boolean,
        showRSI: boolean
    ) {
        if (!klines || klines.length === 0) {
            return;
        }

        // Production Debugging for Klines Data
        if (klines && klines.length > 0) {
            const sample = klines[0];
            // Check if it's the expected object format or array
            const isObject = typeof sample === 'object' && sample !== null && !Array.isArray(sample);
            const hasClose = isObject && 'close' in sample;
            const closeValue = hasClose ? sample.close : (Array.isArray(sample) ? sample[4] : 'N/A');

            // Log if format seems unexpected or values are weird
            if (!hasClose && !Array.isArray(sample)) {
                console.warn('⚠️ [Indicator Service] Unexpected kline format:', {
                    sample,
                    type: typeof sample,
                    isArray: Array.isArray(sample),
                    keys: isObject ? Object.keys(sample) : []
                });
            }
        }

        console.log('🔍 Raw klines sample (Safe):', {
            first: klines[0],
            isArray: Array.isArray(klines[0])
        });

        const ohlcvData = {
            open: klines.map(k => typeof k === 'object' && 'open' in k ? Number(k.open) : parseFloat(k[1])),
            high: klines.map(k => typeof k === 'object' && 'high' in k ? Number(k.high) : parseFloat(k[2])),
            low: klines.map(k => typeof k === 'object' && 'low' in k ? Number(k.low) : parseFloat(k[3])),
            close: klines.map(k => typeof k === 'object' && 'close' in k ? Number(k.close) : parseFloat(k[4])),
            volume: klines.map(k => typeof k === 'object' && 'volume' in k ? Number(k.volume) : parseFloat(k[5]))
        };

        const indicators = calculateIndicatorSeries(ohlcvData);
        const times = klines.map(k => {
            const time = typeof k === 'object' && 'time' in k ? k.time : k[0];
            return (typeof time === 'number' ? time : Math.floor(Number(time) / 1000)) as Time;
        });

        if (showSMA) {
            this.updateSMA(times, indicators);
        } else this.removeSMA();

        if (showEMA) {
            this.updateEMA(times, indicators);
        } else this.removeEMA();

        if (showBollinger) {
            this.updateBollinger(times, indicators);
        } else this.removeBollinger();

        if (showMACD) {
            this.updateMACD(times, indicators);
        } else this.removeMACD();

        if (showRSI) {
            this.updateRSI(times, indicators);
        } else this.removeRSI();

        // Adjust margins if indicators are present
        this.adjustMargins(showMACD, showRSI);
    }

    private updateSMA(times: Time[], indicators: any) {
        if (!this.series.sma20Series) {
            this.series.sma20Series = this.chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, title: 'SMA 20', priceLineVisible: false });
        }
        if (!this.series.sma50Series) {
            this.series.sma50Series = this.chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2, title: 'SMA 50', priceLineVisible: false });
        }

        const sma20Data = this.mapData(times, indicators.sma20);
        const sma50Data = this.mapData(times, indicators.sma50);

        this.series.sma20Series?.setData(sma20Data);
        this.series.sma50Series?.setData(sma50Data);
    }

    private removeSMA() {
        if (this.series.sma20Series) { this.chart.removeSeries(this.series.sma20Series); this.series.sma20Series = null; }
        if (this.series.sma50Series) { this.chart.removeSeries(this.series.sma50Series); this.series.sma50Series = null; }
    }

    private updateEMA(times: Time[], indicators: any) {
        if (!this.series.ema9Series) {
            this.series.ema9Series = this.chart.addSeries(LineSeries, { color: '#10b981', lineWidth: 2, title: 'EMA 9', priceLineVisible: false });
        }
        if (!this.series.ema21Series) {
            this.series.ema21Series = this.chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: 'EMA 21', priceLineVisible: false });
        }

        const ema9Data = this.mapData(times, indicators.ema9);
        const ema21Data = this.mapData(times, indicators.ema21);

        this.series.ema9Series?.setData(ema9Data);
        this.series.ema21Series?.setData(ema21Data);
    }

    private removeEMA() {
        if (this.series.ema9Series) { this.chart.removeSeries(this.series.ema9Series); this.series.ema9Series = null; }
        if (this.series.ema21Series) { this.chart.removeSeries(this.series.ema21Series); this.series.ema21Series = null; }
    }

    private updateBollinger(times: Time[], indicators: any) {
        if (!this.series.bollingerUpperSeries) {
            this.series.bollingerUpperSeries = this.chart.addSeries(LineSeries, { color: '#ef4444', lineWidth: 1, title: 'BB Upper', priceLineVisible: false });
        }
        if (!this.series.bollingerMiddleSeries) {
            this.series.bollingerMiddleSeries = this.chart.addSeries(LineSeries, { color: '#6b7280', lineWidth: 1, lineStyle: 2, title: 'BB Middle', priceLineVisible: false });
        }
        if (!this.series.bollingerLowerSeries) {
            this.series.bollingerLowerSeries = this.chart.addSeries(LineSeries, { color: '#22c55e', lineWidth: 1, title: 'BB Lower', priceLineVisible: false });
        }

        const bbUpperData = this.mapData(times, indicators.bollingerUpper);
        const bbMiddleData = this.mapData(times, indicators.bollingerMiddle);
        const bbLowerData = this.mapData(times, indicators.bollingerLower);

        this.series.bollingerUpperSeries?.setData(bbUpperData);
        this.series.bollingerMiddleSeries?.setData(bbMiddleData);
        this.series.bollingerLowerSeries?.setData(bbLowerData);
    }

    private removeBollinger() {
        if (this.series.bollingerUpperSeries) { this.chart.removeSeries(this.series.bollingerUpperSeries); this.series.bollingerUpperSeries = null; }
        if (this.series.bollingerMiddleSeries) { this.chart.removeSeries(this.series.bollingerMiddleSeries); this.series.bollingerMiddleSeries = null; }
        if (this.series.bollingerLowerSeries) { this.chart.removeSeries(this.series.bollingerLowerSeries); this.series.bollingerLowerSeries = null; }
    }

    private updateMACD(times: Time[], indicators: any) {
        if (!this.series.macdHistogramSeries) {
            this.series.macdHistogramSeries = this.chart.addSeries(HistogramSeries, { color: '#26a69a', priceFormat: { type: 'volume' }, priceScaleId: 'macd' });

            this.chart.priceScale('macd').applyOptions({
                scaleMargins: { top: 0.75, bottom: 0 },
            });
        }

        const histogramData: HistogramData[] = [];
        const offset = times.length - indicators.macdHistogram.length;

        indicators.macdHistogram.forEach((value: number, i: number) => {
            if (value !== undefined && times[i + offset]) {
                const time = times[i + offset];
                histogramData.push({ time, value, color: value >= 0 ? '#26a69a' : '#ef5350' });
            }
        });

        this.series.macdHistogramSeries?.setData(histogramData);
    }

    private removeMACD() {
        if (this.series.macdHistogramSeries) { this.chart.removeSeries(this.series.macdHistogramSeries); this.series.macdHistogramSeries = null; }
    }

    private updateRSI(times: Time[], indicators: any) {
        if (!this.series.rsiSeries) {
            this.series.rsiSeries = this.chart.addSeries(LineSeries, {
                color: '#9C27B0',
                lineWidth: 2,
                priceScaleId: 'rsi',
                priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
                title: 'RSI (14)'
            });
            this.chart.priceScale('rsi').applyOptions({
                scaleMargins: { top: 0.75, bottom: 0 },
            });
        }

        const rsiData = this.mapData(times, indicators.rsi);
        this.series.rsiSeries?.setData(rsiData);
    }

    private removeRSI() {
        if (this.series.rsiSeries) {
            this.chart.removeSeries(this.series.rsiSeries);
            this.series.rsiSeries = null;
        }
    }

    private mapData(times: Time[], values: number[]): LineData[] {
        const data: LineData[] = [];
        const offset = times.length - values.length;
        values.forEach((value, i) => {
            if (value !== undefined && times[i + offset]) {
                data.push({ time: times[i + offset], value });
            }
        });
        return data;
    }

    private adjustMargins(showMACD: boolean, showRSI: boolean) {
        this.chart.applyOptions({
            rightPriceScale: {
                scaleMargins: {
                    top: 0.1,
                    bottom: showMACD || showRSI ? 0.35 : 0.1,
                },
            },
        });
    }

    public destroy() {
        this.removeSMA();
        this.removeEMA();
        this.removeBollinger();
        this.removeMACD();
        this.removeRSI();
    }
}
