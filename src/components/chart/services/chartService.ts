import { createChart, ColorType, CandlestickSeries, type IChartApi, type ISeriesApi, type CandlestickData, type LogicalRange } from 'lightweight-charts';
import type { ChartColors } from '../types';

export class ChartService {
    private chart: IChartApi | null = null;
    private candleSeries: ISeriesApi<'Candlestick'> | null = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor(
        private container: HTMLElement,
        private isMaximized: boolean,
        private onChartCreated: (chart: IChartApi, candleSeries: ISeriesApi<'Candlestick'>) => void
    ) {
        this.initChart();
    }

    private getColors(isDarkMode: boolean): ChartColors {
        return isDarkMode ? {
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
    }

    public initChart() {
        if (!this.container) return;

        const containerHeight = this.isMaximized ? this.container.clientHeight : 600;
        const isDarkMode = document.documentElement.classList.contains('dark');
        const colors = this.getColors(isDarkMode);

        const chartOptions = {
            width: this.container.clientWidth,
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
                    bottom: 0.1, // Default bottom margin, can be adjusted for indicators
                },
            },
            timeScale: {
                borderColor: colors.borderColor,
                timeVisible: true,
                secondsVisible: false,
                barSpacing: this.isMaximized ? 10 : 6,
                tickMarkFormatter: (time: number, tickMarkType: number, locale: string) => {
                    const date = new Date(time * 1000);
                    // Simple logic: if it's a day/month/year tick (type < 3), show date. Otherwise show time.
                    // This ensures local timezone is used.
                    if (tickMarkType < 3) {
                        return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
                    }
                    return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date);
                },
            },
            localization: {
                locale: navigator.language,
                dateFormat: 'dd/MM/yyyy',
                timeFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return new Intl.DateTimeFormat(navigator.language, {
                        hour: '2-digit',
                        minute: '2-digit',
                        // second: '2-digit', // Optional, usually minutes are enough for candles
                    }).format(date);
                },
            },
            ...(this.isMaximized && {
                handleScroll: {
                    mouseWheel: true,
                    pressedMouseMove: true,
                    horzTouchDrag: true,
                    vertTouchDrag: true,
                },
            }),
        };

        this.chart = createChart(this.container, chartOptions);

        this.candleSeries = this.chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderDownColor: '#ef4444',
            borderUpColor: '#22c55e',
            wickDownColor: '#ef4444',
            wickUpColor: '#22c55e',
            priceScaleId: 'right',
        });

        this.setupResizeObserver();
        this.onChartCreated(this.chart, this.candleSeries);
    }

    private setupResizeObserver() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        this.resizeObserver = new ResizeObserver(() => {
            if (this.chart && this.container) {
                this.chart.resize(this.container.clientWidth, this.container.clientHeight);
            }
        });

        this.resizeObserver.observe(this.container);
    }

    public updateColors() {
        if (!this.chart) return;
        const isDarkMode = document.documentElement.classList.contains('dark');
        const colors = this.getColors(isDarkMode);

        this.chart.applyOptions({
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

    public setVisibleCandles(numCandles: number) {
        if (!this.chart) return;

        try {
            const timeScale = this.chart.timeScale();
            const logicalRange = timeScale.getVisibleLogicalRange();

            if (!logicalRange) {
                timeScale.fitContent();
                return;
            }

            const to = logicalRange.to;
            const from = Math.max(0, to - numCandles);

            timeScale.setVisibleLogicalRange({ from, to });
        } catch (error) {
            console.warn('Error adjusting zoom:', error);
            this.chart.timeScale().fitContent();
        }
    }

    public destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.chart) {
            this.chart.remove();
            this.chart = null;
        }
        this.candleSeries = null;
    }

    public getCandleSeries(): ISeriesApi<'Candlestick'> | null {
        return this.candleSeries;
    }

    public getChart(): IChartApi | null {
        return this.chart;
    }
}
