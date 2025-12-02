import type { IChartApi, ISeriesApi, ISeriesPrimitive, IPrimitivePaneView, Time } from 'lightweight-charts';
import type { CoordinateResolver } from './types';

export class LineView implements IPrimitivePaneView {
    constructor(
        private chart: IChartApi,
        private series: ISeriesApi<'Candlestick'>,
        private price1: number,
        private time1: number,
        private price2: number,
        private time2: number,
        private color: string,
        private isDashed: boolean,
        private coordinateResolver: CoordinateResolver
    ) { }

    renderer() {
        const chart = this.chart;
        const series = this.series;
        const price1 = this.price1;
        const time1 = this.time1;
        const price2 = this.price2;
        const time2 = this.time2;
        const color = this.color;
        const isDashed = this.isDashed;
        const resolveCoordinate = this.coordinateResolver;

        return {
            draw(target: any) {
                target.useMediaCoordinateSpace((scope: any) => {
                    const ctx = scope.context;

                    // Convert logical coordinates to screen coordinates
                    const y1 = series.priceToCoordinate(price1);
                    const y2 = series.priceToCoordinate(price2);

                    // Use the resolver for time coordinates
                    const x1 = resolveCoordinate(time1);
                    const x2 = resolveCoordinate(time2);

                    if (x1 === null || x2 === null || y1 === null || y2 === null) {
                        return;
                    }

                    // Calculate slope for infinite extension
                    const dx = x2 - x1;
                    const dy = y2 - y1;

                    // If it's not a preview (isDashed = false), extend the line infinitely
                    let startX = x1;
                    let startY = y1;
                    let endX = x2;
                    let endY = y2;

                    if (!isDashed && Math.abs(dx) > 0.001) {
                        // Calculate slope
                        const slope = dy / dx;

                        // Extend to canvas boundaries
                        const canvasWidth = scope.mediaSize.width;

                        // Start from the leftmost point (don't extend left)
                        const isX1Left = x1 < x2;
                        const leftX = isX1Left ? x1 : x2;
                        const leftY = isX1Left ? y1 : y2;

                        // Extend right to x = canvasWidth
                        const rightY = y1 + (canvasWidth - x1) * slope;

                        startX = leftX as any;
                        startY = leftY as any;
                        endX = canvasWidth as any;
                        endY = rightY as any;
                    }

                    ctx.beginPath();
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2;

                    if (isDashed) {
                        ctx.setLineDash([5, 5]);
                    } else {
                        ctx.setLineDash([]);
                    }

                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    ctx.setLineDash([]);
                });
            }
        };
    }
}

export class LinePrimitive implements ISeriesPrimitive<Time> {
    private view: LineView;

    constructor(
        chart: IChartApi,
        series: ISeriesApi<'Candlestick'>,
        price1: number,
        time1: number,
        price2: number,
        time2: number,
        color: string,
        isDashed: boolean,
        coordinateResolver: CoordinateResolver
    ) {
        this.view = new LineView(chart, series, price1, time1, price2, time2, color, isDashed, coordinateResolver);
    }

    updateAllViews() {
        // Called when the chart needs to redraw
    }

    paneViews() {
        return [this.view];
    }
}

export class HandleView implements IPrimitivePaneView {
    constructor(
        private series: ISeriesApi<'Candlestick'>,
        private price: number,
        private time: number,
        private coordinateResolver: CoordinateResolver
    ) { }

    renderer() {
        const series = this.series;
        const price = this.price;
        const time = this.time;
        const resolveCoordinate = this.coordinateResolver;

        return {
            draw(target: any) {
                target.useMediaCoordinateSpace((scope: any) => {
                    const ctx = scope.context;
                    const y = series.priceToCoordinate(price);
                    const x = resolveCoordinate(time);

                    if (x === null || y === null) return;

                    ctx.beginPath();
                    ctx.arc(x, y, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fill();
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#2962FF';
                    ctx.stroke();
                });
            }
        };
    }
}

export class HandlePrimitive implements ISeriesPrimitive<Time> {
    private view: HandleView;

    constructor(
        series: ISeriesApi<'Candlestick'>,
        price: number,
        time: number,
        coordinateResolver: CoordinateResolver
    ) {
        this.view = new HandleView(series, price, time, coordinateResolver);
    }

    updateAllViews() { }
    paneViews() { return [this.view]; }
}
