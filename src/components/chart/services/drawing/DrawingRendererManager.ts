import type { IChartApi, ISeriesApi, IPriceLine, ISeriesPrimitive, Time } from 'lightweight-charts';
import type { DrawingLine } from './types';
import type { CoordinateTransformer } from './CoordinateTransformer';
import { LinePrimitive, HandlePrimitive } from './DrawingPrimitives';

export class DrawingRendererManager {
    private priceLines: Map<string, IPriceLine> = new Map();
    private customLines: Map<string, ISeriesPrimitive<Time>> = new Map();
    private handlePrimitives: ISeriesPrimitive<Time>[] = [];
    private chart: IChartApi | null = null;
    private candleSeries: ISeriesApi<'Candlestick'> | null = null;

    constructor(private coordinateTransformer: CoordinateTransformer) { }

    public setChart(chart: IChartApi, candleSeries: ISeriesApi<'Candlestick'>) {
        this.chart = chart;
        this.candleSeries = candleSeries;
    }

    public clear() {
        this.clearRenderedLines();
    }

    private clearRenderedLines() {
        if (!this.candleSeries) return;

        // Remove price lines
        this.priceLines.forEach((priceLine) => {
            this.candleSeries?.removePriceLine(priceLine);
        });
        this.priceLines.clear();

        // Remove custom primitives
        this.customLines.forEach((primitive) => {
            this.candleSeries?.detachPrimitive(primitive);
        });
        this.customLines.clear();

        // Remove handles
        this.handlePrimitives.forEach(h => {
            this.candleSeries?.detachPrimitive(h);
        });
        this.handlePrimitives = [];
    }

    public renderAll(lines: DrawingLine[], selectedLineId: string | null, currentData: number[]) {
        if (!this.chart || !this.candleSeries) return;

        this.clearRenderedLines();

        lines.forEach(line => this.renderLine(line));

        if (selectedLineId) {
            const line = lines.find(l => l.id === selectedLineId);
            if (line) {
                this.renderHandles(line, currentData);
            }
        }
    }

    private renderLine(line: DrawingLine) {
        if (!this.candleSeries) return;

        if (line.type === 'horizontal') {
            const priceLine = this.candleSeries.createPriceLine({
                price: line.price,
                color: line.color,
                lineWidth: 2,
                lineStyle: 0, // Solid
                axisLabelVisible: true,
                title: '',
            });
            this.priceLines.set(line.id, priceLine);
        } else if (line.type === 'line_ab' && line.time !== undefined && line.time2 !== undefined && line.price2 !== undefined) {
            const primitive = new LinePrimitive(
                this.chart!,
                this.candleSeries,
                line.price,
                line.time,
                line.price2,
                line.time2,
                line.color,
                false,
                this.coordinateTransformer.resolveCoordinate.bind(this.coordinateTransformer)
            );

            this.candleSeries.attachPrimitive(primitive);
            this.customLines.set(line.id, primitive);
        }
    }

    private renderHandles(line: DrawingLine, currentData: number[]) {
        if (!this.candleSeries) return;

        // P1 Handle
        const time = line.time || (currentData.length > 0 ? currentData[currentData.length - 1] : 0);
        const h1 = new HandlePrimitive(
            this.candleSeries,
            line.price,
            time,
            this.coordinateTransformer.resolveCoordinate.bind(this.coordinateTransformer)
        );
        this.candleSeries.attachPrimitive(h1);
        this.handlePrimitives.push(h1);

        // P2 Handle
        if (line.type === 'line_ab' && line.time2 !== undefined && line.price2 !== undefined) {
            const h2 = new HandlePrimitive(
                this.candleSeries,
                line.price2,
                line.time2,
                this.coordinateTransformer.resolveCoordinate.bind(this.coordinateTransformer)
            );
            this.candleSeries.attachPrimitive(h2);
            this.handlePrimitives.push(h2);
        }
    }

    public updatePreview(activeDrawing: Partial<DrawingLine> | null, currentPrice: number, currentTime: number) {
        // Remove old preview
        if (this.customLines.has('preview')) {
            const preview = this.customLines.get('preview');
            if (preview) this.candleSeries?.detachPrimitive(preview);
            this.customLines.delete('preview');
        }

        if (activeDrawing && this.chart && this.candleSeries) {
            const preview = new LinePrimitive(
                this.chart,
                this.candleSeries,
                activeDrawing.price!,
                activeDrawing.time!,
                currentPrice,
                currentTime,
                '#94a3b8', // Gray color
                true, // Dashed
                this.coordinateTransformer.resolveCoordinate.bind(this.coordinateTransformer)
            );

            this.candleSeries.attachPrimitive(preview);
            this.customLines.set('preview', preview);
        }
    }
}
