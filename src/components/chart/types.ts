import type { IChartApi, ISeriesApi, CandlestickData, LineData, HistogramData, Time } from 'lightweight-charts';

export interface ChartColors {
    background: string;
    textColor: string;
    gridColor: string;
    borderColor: string;
}

export interface ChartState {
    symbol: string;
    interval: string;
    isMaximized: boolean;
    isLoading: boolean;
}

export interface IndicatorState {
    showSMA: boolean;
    showEMA: boolean;
    showBollinger: boolean;
    showMACD: boolean;
    showRSI: boolean;
}

export interface ChartSeries {
    candleSeries: ISeriesApi<'Candlestick'> | null;
    macdHistogramSeries: ISeriesApi<'Histogram'> | null;
    rsiSeries: ISeriesApi<'Line'> | null;
    sma20Series: ISeriesApi<'Line'> | null;
    sma50Series: ISeriesApi<'Line'> | null;
    ema9Series: ISeriesApi<'Line'> | null;
    ema21Series: ISeriesApi<'Line'> | null;
    bollingerUpperSeries: ISeriesApi<'Line'> | null;
    bollingerMiddleSeries: ISeriesApi<'Line'> | null;
    bollingerLowerSeries: ISeriesApi<'Line'> | null;
}
