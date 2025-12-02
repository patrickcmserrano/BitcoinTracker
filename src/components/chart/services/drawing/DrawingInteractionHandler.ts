import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { DrawingStateManager } from './DrawingStateManager';
import type { CoordinateTransformer } from './CoordinateTransformer';
import type { DragState } from './types';

export class DrawingInteractionHandler {
    private dragState: DragState | null = null;
    private chart: IChartApi | null = null;
    private candleSeries: ISeriesApi<'Candlestick'> | null = null;

    private _boundMouseDown: (e: PointerEvent) => void;
    private _boundMouseMove: (e: PointerEvent) => void;
    private _boundMouseUp: (e: PointerEvent) => void;
    private _boundTouchStart: (e: TouchEvent) => void;

    constructor(
        private stateManager: DrawingStateManager,
        private coordinateTransformer: CoordinateTransformer,
        private renderCallback: () => void
    ) {
        this._boundMouseDown = this.handleContainerMouseDown.bind(this);
        this._boundMouseMove = this.handleContainerMouseMove.bind(this);
        this._boundMouseUp = this.handleContainerMouseUp.bind(this);
        this._boundTouchStart = this.handleContainerTouchStart.bind(this);
    }

    public attach(chart: IChartApi, candleSeries: ISeriesApi<'Candlestick'>) {
        this.chart = chart;
        this.candleSeries = candleSeries;

        const container = (this.chart as any).chartElement?.();
        if (container) {
            container.addEventListener('pointerdown', this._boundMouseDown, { capture: true });
            container.addEventListener('pointermove', this._boundMouseMove, { capture: true });
            container.addEventListener('pointerup', this._boundMouseUp, { capture: true });
            container.addEventListener('touchstart', this._boundTouchStart, { capture: true, passive: false });
        }
    }

    public detach() {
        const container = (this.chart as any).chartElement?.();
        if (container) {
            container.removeEventListener('pointerdown', this._boundMouseDown, { capture: true });
            container.removeEventListener('pointermove', this._boundMouseMove, { capture: true });
            container.removeEventListener('pointerup', this._boundMouseUp, { capture: true });
            container.removeEventListener('touchstart', this._boundTouchStart, { capture: true });
        }
        this.chart = null;
        this.candleSeries = null;
    }

    private handleContainerTouchStart(e: TouchEvent) {
        if (this.stateManager.getMode() !== 'NONE') return;

        const container = (this.chart as any).chartElement?.();
        if (!container) return;

        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        const hit = this.hitTest(x, y);
        if (hit) {
            e.stopPropagation();
            e.stopImmediatePropagation();
        }
    }

    private handleContainerMouseDown(e: PointerEvent) {
        if (this.stateManager.getMode() !== 'NONE') return;

        const container = (this.chart as any).chartElement?.();
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const hit = this.hitTest(x, y);

        if (hit) {
            this.stateManager.setSelectedLine(hit.id);
            const line = this.stateManager.getLine(hit.id);
            if (line) {
                this.dragState = {
                    type: hit.handle || 'move',
                    lineId: line.id,
                    startX: x,
                    startY: y,
                    initialP1: { price: line.price, time: line.time! },
                    initialP2: line.price2 ? { price: line.price2, time: line.time2! } : undefined
                };
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                this.chart?.applyOptions({
                    handleScroll: false,
                    handleScale: false,
                });

                container.style.touchAction = 'none';
                container.setPointerCapture(e.pointerId);

                this.renderCallback();
            }
        } else {
            if (this.stateManager.getState().selectedLineId) {
                this.stateManager.setSelectedLine(null);
                this.renderCallback();
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

        if (this.stateManager.getMode() === 'NONE') {
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
            this.stateManager.saveToLocalStorage();

            this.chart?.applyOptions({
                handleScroll: true,
                handleScale: true,
            });

            const container = (this.chart as any).chartElement?.();
            if (container) {
                container.style.cursor = 'grab';
                container.style.touchAction = '';
                try {
                    container.releasePointerCapture(e.pointerId);
                } catch (e) {
                    // Ignore
                }
            }
        }
    }

    private handleDrag(x: number, y: number) {
        if (!this.dragState || !this.candleSeries || !this.chart) return;

        const line = this.stateManager.getLine(this.dragState.lineId);
        if (!line) return;

        const price = this.candleSeries.coordinateToPrice(y) as number;
        // We use chart.timeScale().coordinateToTime(x) for dragging logic, 
        // but we might want to use coordinateTransformer if we need consistency with rendering?
        // Actually, coordinateToTime is correct for getting the time under cursor.
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
                // Move entire line logic not implemented
                return;
            }
        }

        this.stateManager.updateLine(line);
        this.renderCallback();
    }

    private hitTest(x: number, y: number): { id: string, handle?: 'p1' | 'p2' } | null {
        if (!this.chart || !this.candleSeries) return null;

        const threshold = 10;
        const lines = this.stateManager.getLines();
        const selectedId = this.stateManager.getState().selectedLineId;

        for (const line of lines) {
            if (selectedId === line.id) {
                const p1 = this.getCoordinate(line.time!, line.price);
                if (p1 && Math.hypot(p1.x - x, p1.y - y) < threshold) {
                    return { id: line.id, handle: 'p1' };
                }
                if (line.type === 'line_ab') {
                    const p2 = this.getCoordinate(line.time2!, line.price2!);
                    if (p2 && Math.hypot(p2.x - x, p2.y - y) < threshold) {
                        return { id: line.id, handle: 'p2' };
                    }
                }
            }

            if (line.type === 'line_ab') {
                const p1 = this.getCoordinate(line.time!, line.price);
                const p2 = this.getCoordinate(line.time2!, line.price2!);
                if (p1 && p2) {
                    const dist = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
                    if (dist < threshold) return { id: line.id };
                }
            } else if (line.type === 'horizontal') {
                // For horizontal, we need a valid x coordinate to check y distance?
                // Actually, horizontal line spans entire width, so we just check y distance.
                // But we need to convert price to y.
                const yCoord = this.candleSeries.priceToCoordinate(line.price);
                if (yCoord !== null && Math.abs(yCoord - y) < threshold) {
                    return { id: line.id };
                }
            }
        }
        return null;
    }

    private getCoordinate(time: number, price: number): { x: number, y: number } | null {
        const x = this.coordinateTransformer.resolveCoordinate(time);
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
}
