import type { IChartApi, ISeriesApi, IPriceLine, Time, MouseEventParams, ISeriesPrimitive, IPrimitivePaneView } from 'lightweight-charts';


import type { DrawingMode, DrawingLine, DrawingState } from '../types';

export class DrawingService {
    private state: DrawingState = {
        mode: 'NONE',
        lines: [],
        activeDrawing: null,
        selectedLineId: null,
    };

    private dragState: {
        type: 'p1' | 'p2' | 'move';
        lineId: string;
        startX: number;
        startY: number;
        initialP1: { price: number, time: number };
        initialP2?: { price: number, time: number };
    } | null = null;

    private chart: IChartApi | null = null;
    private candleSeries: ISeriesApi<'Candlestick'> | null = null;
    private priceLines: Map<string, IPriceLine> = new Map();
    private customLines: Map<string, any> = new Map(); // For line_ab drawings
    private handlePrimitives: ISeriesPrimitive<Time>[] = [];

    private currentSymbol: string = '';
    private currentInterval: string = '';
    private onChange: (() => void) | null = null;
    private onModeChange: ((mode: DrawingMode) => void) | null = null;

    private _boundMouseDown: (e: PointerEvent) => void;
    private _boundMouseMove: (e: PointerEvent) => void;
    private _boundMouseUp: (e: PointerEvent) => void;
    private _boundTouchStart: (e: TouchEvent) => void;

    constructor() {
        this._boundMouseDown = this.handleContainerMouseDown.bind(this);
        this._boundMouseMove = this.handleContainerMouseMove.bind(this);
        this._boundMouseUp = this.handleContainerMouseUp.bind(this);
        this._boundTouchStart = this.handleContainerTouchStart.bind(this);
    }

    public setOnChangeCallback(callback: () => void) {
        this.onChange = callback;
    }

    public setOnModeChangeCallback(callback: (mode: DrawingMode) => void) {
        this.onModeChange = callback;
    }

    public init(chart: IChartApi, candleSeries: ISeriesApi<'Candlestick'>, symbol: string, interval: string) {
        this.chart = chart;
        this.candleSeries = candleSeries;
        this.currentSymbol = symbol;
        this.currentInterval = interval;
        this.loadFromLocalStorage();
        this.renderAllLines();

        // Attach DOM listeners for dragging
        const container = (this.chart as any).chartElement?.();
        if (container) {
            // Use capture for pointerdown to intercept before chart
            container.addEventListener('pointerdown', this._boundMouseDown, { capture: true });
            container.addEventListener('pointermove', this._boundMouseMove, { capture: true });
            container.addEventListener('pointerup', this._boundMouseUp, { capture: true });
            // Intercept touchstart to prevent chart reaction
            container.addEventListener('touchstart', this._boundTouchStart, { capture: true, passive: false });
        }
    }

    public setMode(mode: DrawingMode) {
        this.state.mode = mode;
        this.state.activeDrawing = null;

        // Notify parent of mode change
        this.onModeChange?.(mode);

        // Change cursor based on mode

        // Change cursor based on mode
        if (this.chart) {
            const container = (this.chart as any).chartElement?.();
            if (container) {
                switch (mode) {
                    case 'HORIZONTAL_LINE':
                    case 'LINE_AB':
                        container.style.cursor = 'crosshair';
                        break;
                    default:
                        container.style.cursor = 'default';
                }
            }
        }
    }

    public getMode(): DrawingMode {
        return this.state.mode;
    }

    public handleChartClick(param: MouseEventParams) {
        if (!param.point || !param.time) {
            return;
        }

        // Get price from the y-coordinate (free positioning)
        let clickedPrice: number | null = null;

        if (this.candleSeries) {
            const coordinate = param.point.y;
            clickedPrice = this.candleSeries.coordinateToPrice(coordinate) as number;
        }

        // Fallback or if series data is preferred (optional, but we want free drawing now)
        // if (clickedPrice === null && param.seriesData.size > 0) { ... }

        if (clickedPrice === null) {
            console.warn('Could not determine price for click');
            return;
        }

        switch (this.state.mode) {
            case 'HORIZONTAL_LINE':
                this.addHorizontalLine(clickedPrice, param.time as number);
                break;
            case 'LINE_AB':
                this.handleLineABClick(clickedPrice, param.time as number);
                break;
        }
    }

    private addHorizontalLine(price: number, time?: number) {
        const line: DrawingLine = {
            id: this.generateId(),
            type: 'horizontal',
            price,
            time,
            color: '#3b82f6', // Blue color
        };

        this.state.lines.push(line);
        this.renderLine(line);
        this.saveToLocalStorage();

        // Reset mode after drawing
        this.setMode('NONE');
    }

    private handleLineABClick(price: number, time: number) {
        if (!this.state.activeDrawing) {
            // First click - start drawing
            // First click - start drawing
            this.state.activeDrawing = {
                id: this.generateId(),
                type: 'line_ab',
                price,
                time,
                color: '#3b82f6',
            };
            this.onChange?.(); // Notify state changed
        } else {
            // Second click - finish drawing
            // Second click - finish drawing

            const line: DrawingLine = {
                ...this.state.activeDrawing,
                price2: price,
                time2: time,
            } as DrawingLine;

            this.state.lines.push(line);
            this.renderLine(line);
            this.saveToLocalStorage();

            // Reset state
            this.state.activeDrawing = null;
            this.setMode('NONE');
            this.onChange?.(); // Notify state changed
        }
    }

    public handleMouseMove(param: MouseEventParams) {
        // Update preview for active line_ab drawing
        if (this.state.mode === 'LINE_AB' && this.state.activeDrawing && param.point && param.time) {
            if (this.candleSeries) {
                const coordinate = param.point.y;
                const price = this.candleSeries.coordinateToPrice(coordinate) as number;
                if (price !== null) {
                    this.updateActiveDrawingPreview(price, param.time as number);
                }
            }
        }
    }

    private updateActiveDrawingPreview(price: number, time: number) {
        // Remove old preview if exists
        if (this.customLines.has('preview')) {
            const preview = this.customLines.get('preview');
            this.candleSeries?.detachPrimitive(preview);
            this.customLines.delete('preview');
        }

        // Create new preview
        if (this.state.activeDrawing && this.chart) {
            const preview = this.createLinePrimitive(
                this.state.activeDrawing.price!,
                this.state.activeDrawing.time!,
                price,
                time,
                '#94a3b8', // Gray color for preview
                true // isDashed
            );

            this.candleSeries?.attachPrimitive(preview);
            this.customLines.set('preview', preview);
        }
    }

    private renderLine(line: DrawingLine) {
        if (!this.chart || !this.candleSeries) return;

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
            const primitive = this.createLinePrimitive(
                line.price,
                line.time,
                line.price2,
                line.time2,
                line.color,
                false
            );

            this.candleSeries.attachPrimitive(primitive);
            this.customLines.set(line.id, primitive);

            // Force chart to update and redraw
            // this.chart.timeScale().fitContent();
        }
    }

    private createLinePrimitive(price1: number, time1: number, price2: number, time2: number, color: string, isDashed: boolean): ISeriesPrimitive<Time> {
        return new LinePrimitive(this.chart!, this.candleSeries!, price1, time1, price2, time2, color, isDashed, this.resolveCoordinate.bind(this));
    }

    private renderAllLines() {
        // Clear existing renderings
        this.clearRenderedLines();

        // Render all saved lines
        this.state.lines.forEach(line => this.renderLine(line));

        // Render handles for selected line
        if (this.state.selectedLineId && this.candleSeries) {
            const line = this.state.lines.find(l => l.id === this.state.selectedLineId);
            if (line) {
                // P1 Handle
                const time = line.time || (this.currentData.length > 0 ? this.currentData[this.currentData.length - 1] : 0);
                const h1 = new HandlePrimitive(this.candleSeries, line.price, time, this.resolveCoordinate.bind(this));
                this.candleSeries.attachPrimitive(h1);
                this.handlePrimitives.push(h1);

                // P2 Handle
                if (line.type === 'line_ab' && line.time2 !== undefined && line.price2 !== undefined) {
                    const h2 = new HandlePrimitive(this.candleSeries, line.price2, line.time2, this.resolveCoordinate.bind(this));
                    this.candleSeries.attachPrimitive(h2);
                    this.handlePrimitives.push(h2);
                }
            }
        }
    }

    private clearRenderedLines() {
        // Remove price lines
        this.priceLines.forEach((priceLine, id) => {
            if (this.candleSeries) {
                this.candleSeries.removePriceLine(priceLine);
            }
        });
        this.priceLines.clear();

        this.customLines.forEach((primitive, id) => {
            if (this.candleSeries) {
                this.candleSeries.detachPrimitive(primitive);
            }
        });
        this.customLines.clear();

        // Remove handles
        this.handlePrimitives.forEach(h => {
            if (this.candleSeries) this.candleSeries.detachPrimitive(h);
        });
        this.handlePrimitives = [];
    }

    public removeLine(id: string) {
        const index = this.state.lines.findIndex(line => line.id === id);
        if (index === -1) return;

        const line = this.state.lines[index];

        // Remove from rendering
        if (line.type === 'horizontal') {
            const priceLine = this.priceLines.get(id);
            if (priceLine && this.candleSeries) {
                this.candleSeries.removePriceLine(priceLine);
                this.priceLines.delete(id);
            }
        } else if (line.type === 'line_ab') {
            const primitive = this.customLines.get(id);
            if (primitive && this.candleSeries) {
                this.candleSeries.detachPrimitive(primitive);
                this.customLines.delete(id);
            }
        }

        // Remove from state
        this.state.lines.splice(index, 1);
        this.saveToLocalStorage();
    }

    public removeSelectedLine() {
        if (this.state.selectedLineId) {
            this.removeLine(this.state.selectedLineId);
            this.state.selectedLineId = null;
        }
    }

    public clearAll() {
        this.clearRenderedLines();
        this.state.lines = [];
        this.saveToLocalStorage();
    }

    public getLines(): DrawingLine[] {
        return [...this.state.lines];
    }

    public hasActiveDrawing(): boolean {
        return this.state.activeDrawing !== null;
    }

    private generateId(): string {
        return `line_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private getStorageKey(): string {
        return `drawing_lines_${this.currentSymbol}`;
    }

    private saveToLocalStorage() {
        try {
            const key = this.getStorageKey();
            localStorage.setItem(key, JSON.stringify(this.state.lines));
        } catch (error) {
            console.error('Failed to save drawings to localStorage:', error);
        }
    }

    private loadFromLocalStorage() {
        try {
            const key = this.getStorageKey();
            const data = localStorage.getItem(key);
            if (data) {
                this.state.lines = JSON.parse(data);
            } else {
                this.state.lines = [];
            }
        } catch (error) {
            console.error('Failed to load drawings from localStorage:', error);
            this.state.lines = [];
        }
    }

    public updateSymbolInterval(symbol: string, interval: string) {
        // Only reload if symbol changed (drawings persist across timeframes)
        if (symbol !== this.currentSymbol) {
            // Save current drawings
            this.saveToLocalStorage();

            // Update symbol
            this.currentSymbol = symbol;

            // Load new symbol's drawings
            this.loadFromLocalStorage();
            this.renderAllLines();
        }

        // Always update interval for reference
        this.currentInterval = interval;
    }

    private currentData: number[] = [];

    public updateData(data: any[]) {
        // Extract timestamps and ensure they are numbers
        this.currentData = data.map(d => d.time as number).sort((a, b) => a - b);

        // Re-render lines now that we have data for interpolation
        this.renderAllLines();
    }

    public updateLastCandle(candle: any) {
        const time = candle.time as number;
        if (this.currentData.length === 0 || time > this.currentData[this.currentData.length - 1]) {
            this.currentData.push(time);
        } else if (time === this.currentData[this.currentData.length - 1]) {
            // Update existing candle (no change to timestamp list)
        } else {
            // Insert in correct position (should rarely happen for "new candle")
            // But for safety, we can re-sort or find index
            this.currentData.push(time);
            this.currentData.sort((a, b) => a - b);
        }
    }

    private resolveCoordinate(time: number): number | null {
        if (!this.chart) return null;

        // 1. Try direct conversion
        const coordinate = this.chart.timeScale().timeToCoordinate(time as Time);
        if (coordinate !== null) return coordinate;

        // 2. If not found, interpolate using currentData
        if (this.currentData.length < 2) {
            console.warn('[DrawingService] Not enough data for interpolation');
            return null;
        }

        // Binary search to find the time range
        let low = 0;
        let high = this.currentData.length - 1;
        let index = -1;

        // Debug: Check if time is within range
        const firstTime = this.currentData[0];
        const lastTime = this.currentData[this.currentData.length - 1];

        // Handle future timestamps (extrapolation)
        if (time > lastTime) {
            const lastIndex = this.currentData.length - 1;

            // Use fixed interval based on current timeframe setting for stability
            const interval = this.parseIntervalToSeconds(this.currentInterval);

            const diff = time - lastTime;
            const futureLogical = lastIndex + (diff / interval);
            return this.chart.timeScale().logicalToCoordinate(futureLogical as any);
        }

        if (time < firstTime) {
            // For now, just return null or clamp to first?
            // Let's try to extrapolate backwards too if needed, but usually we care about future
            // console.warn(`[DrawingService] Time ${time} before loaded range`);
            // return null;
        }

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.currentData[mid] === time) {
                index = mid;
                break;
            } else if (this.currentData[mid] < time) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        // If exact match found (should have been caught by timeToCoordinate, but just in case)
        if (index !== -1) {
            const logical = index;
            return this.chart.timeScale().logicalToCoordinate(logical as any);
        }

        // 'high' is now the index of the element smaller than 'time'
        // 'low' is the index of the element larger than 'time'
        // We want the range [high, low] where data[high] < time < data[low]

        // Check bounds
        if (high < 0 || low >= this.currentData.length) {
            // Out of range
            return null;
        }

        const t1 = this.currentData[high];
        const t2 = this.currentData[low];

        const i1 = high;
        const i2 = low;

        const fraction = (time - t1) / (t2 - t1);
        const interpolatedLogical = i1 + (i2 - i1) * fraction;

        return this.chart.timeScale().logicalToCoordinate(interpolatedLogical as any);
    }

    private parseIntervalToSeconds(interval: string): number {
        const unit = interval.slice(-1);
        const value = parseInt(interval.slice(0, -1));

        switch (unit) {
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 24 * 60 * 60;
            case 'w': return value * 7 * 24 * 60 * 60;
            case 'M': return value * 30 * 24 * 60 * 60; // Approximate
            default: return 60; // Default to 1m
        }
    }

    private handleContainerTouchStart(e: TouchEvent) {
        if (this.state.mode !== 'NONE') return;

        const container = (this.chart as any).chartElement?.();
        if (!container) return;

        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const hit = this.hitTest(x, y);
        if (hit) {
            // If we hit a handle, stop propagation so chart doesn't see it.
            // But DO NOT preventDefault, so that pointerdown fires and we handle drag there.
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }

    private handleContainerMouseDown(e: PointerEvent) {
        if (this.state.mode !== 'NONE') return;

        const container = (this.chart as any).chartElement?.();
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hit = this.hitTest(x, y);

        if (hit) {
            this.state.selectedLineId = hit.id;
            const line = this.state.lines.find(l => l.id === hit.id);
            if (line) {
                this.dragState = {
                    type: hit.handle || 'move',
                    lineId: line.id,
                    startX: x,
                    startY: y,
                    initialP1: { price: line.price, time: line.time! },
                    initialP2: line.price2 ? { price: line.price2, time: line.time2! } : undefined
                };
                e.preventDefault(); // Prevent chart panning
                e.stopPropagation(); // Stop event propagation
                e.stopImmediatePropagation();

                // Disable chart interactions
                this.chart?.applyOptions({
                    handleScroll: false,
                    handleScale: false,
                });

                // Disable touch actions
                container.style.touchAction = 'none';

                // Capture pointer to track drag outside container
                container.setPointerCapture(e.pointerId);

                this.renderAllLines();
            }
        } else {
            // Clicked empty space
            if (this.state.selectedLineId) {
                this.state.selectedLineId = null;
                this.renderAllLines();
            }
        }
    }

    private handleContainerMouseMove(e: PointerEvent) {
        const container = (this.chart as any).chartElement?.();
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.dragState) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.handleDrag(x, y);
            return;
        }

        // Hover effect
        if (this.state.mode === 'NONE') {
            const hit = this.hitTest(x, y);
            if (hit) {
                container.style.cursor = hit.handle ? 'grab' : 'pointer';
                if (hit.handle) {
                    container.style.touchAction = 'none';
                } else {
                    container.style.touchAction = '';
                }
            } else {
                container.style.cursor = 'default';
                container.style.touchAction = '';
            }
        }
    }

    private handleContainerMouseUp(e: PointerEvent) {
        if (this.dragState) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            this.dragState = null;
            this.saveToLocalStorage();

            // Re-enable chart interactions
            this.chart?.applyOptions({
                handleScroll: true,
                handleScale: true,
            });

            const container = (this.chart as any).chartElement?.();
            if (container) {
                container.style.cursor = 'grab'; // Restore cursor if still over handle
                container.style.touchAction = ''; // Restore touch actions
                try {
                    container.releasePointerCapture(e.pointerId);
                } catch (e) {
                    // Ignore if pointer was not captured
                }
            }
        }
    }

    private handleDrag(x: number, y: number) {
        if (!this.dragState || !this.candleSeries || !this.chart) return;

        const line = this.state.lines.find(l => l.id === this.dragState!.lineId);
        if (!line) return;

        const price = this.candleSeries.coordinateToPrice(y) as number;
        const time = this.chart.timeScale().coordinateToTime(x) as number;

        if (!price || !time) return;

        if (this.dragState.type === 'p1') {
            line.price = price;
            line.time = time;
        } else if (this.dragState.type === 'p2') {
            line.price2 = price;
            line.time2 = time;
        } else if (this.dragState.type === 'move') {
            if (line.type === 'horizontal') {
                line.price = price;
            } else {
                // Move entire line logic for other types (not implemented yet)
                return;
            }
        }

        this.renderAllLines();
    }

    private hitTest(x: number, y: number): { id: string, handle?: 'p1' | 'p2' } | null {
        if (!this.chart || !this.candleSeries) return null;

        const threshold = 10; // pixels

        for (const line of this.state.lines) {
            // Check handles first if selected
            if (this.state.selectedLineId === line.id) {
                // Check P1
                const p1 = this.getCoordinate(line.time!, line.price);
                if (p1 && Math.hypot(p1.x - x, p1.y - y) < threshold) {
                    return { id: line.id, handle: 'p1' };
                }
                // Check P2
                if (line.type === 'line_ab') {
                    const p2 = this.getCoordinate(line.time2!, line.price2!);
                    if (p2 && Math.hypot(p2.x - x, p2.y - y) < threshold) {
                        return { id: line.id, handle: 'p2' };
                    }
                }
            }

            // Check line body
            if (line.type === 'line_ab') {
                const p1 = this.getCoordinate(line.time!, line.price);
                const p2 = this.getCoordinate(line.time2!, line.price2!);
                if (p1 && p2) {
                    const dist = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
                    if (dist < threshold) return { id: line.id };
                }
            } else if (line.type === 'horizontal') {
                const p1 = this.getCoordinate(line.time || this.currentData[0], line.price);
                if (p1 && Math.abs(p1.y - y) < threshold) return { id: line.id };
            }
        }
        return null;
    }

    private getCoordinate(time: number, price: number): { x: number, y: number } | null {
        const x = this.resolveCoordinate(time);
        const y = this.candleSeries?.priceToCoordinate(price);
        if (x === null || y === null || y === undefined) return null;
        return { x, y: y as number };
    }

    private pointToSegmentDistance(x: number, y: number, x1: number, y1: number, x2: number, y2: number) {
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) param = dot / len_sq;
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    public destroy() {
        this.saveToLocalStorage();
        this.clearRenderedLines();

        const container = (this.chart as any).chartElement?.();
        if (container) {
            container.removeEventListener('pointerdown', this._boundMouseDown, { capture: true });
            container.removeEventListener('pointermove', this._boundMouseMove, { capture: true });
            container.removeEventListener('pointerup', this._boundMouseUp, { capture: true });
            container.removeEventListener('touchstart', this._boundTouchStart, { capture: true });
        }
        this.chart = null;
        this.candleSeries = null;
        this.currentData = [];
    }
}

// Custom Primitive for drawing lines
class LineView implements IPrimitivePaneView {
    constructor(
        private chart: IChartApi,
        private series: ISeriesApi<'Candlestick'>,
        private price1: number,
        private time1: number,
        private price2: number,
        private time2: number,
        private color: string,
        private isDashed: boolean,
        private coordinateResolver: (time: number) => number | null
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
                        // console.warn('Some coordinates are null, skipping draw');
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
                        // const canvasHeight = scope.mediaSize.height;

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

class LinePrimitive implements ISeriesPrimitive<Time> {
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
        coordinateResolver: (time: number) => number | null
    ) {
        this.view = new LineView(chart, series, price1, time1, price2, time2, color, isDashed, coordinateResolver);
    }

    updateAllViews() {
        // Called when the chart needs to redraw
    }

    paneViews() {

        return [this.view];
    }

    requestUpdate() {
        // Optional method for triggering updates
    }
}

class HandleView implements IPrimitivePaneView {
    constructor(
        private series: ISeriesApi<'Candlestick'>,
        private price: number,
        private time: number,
        private coordinateResolver: (time: number) => number | null
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

class HandlePrimitive implements ISeriesPrimitive<Time> {
    private view: HandleView;

    constructor(
        series: ISeriesApi<'Candlestick'>,
        price: number,
        time: number,
        coordinateResolver: (time: number) => number | null
    ) {
        this.view = new HandleView(series, price, time, coordinateResolver);
    }

    updateAllViews() { }
    paneViews() { return [this.view]; }
}
