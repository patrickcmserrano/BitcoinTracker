import type { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts';
import type { DrawingMode, DrawingLine } from './types';
import { DrawingStateManager } from './DrawingStateManager';
import { CoordinateTransformer } from './CoordinateTransformer';
import { DrawingInteractionHandler } from './DrawingInteractionHandler';
import { DrawingRendererManager } from './DrawingRendererManager';

export class DrawingService {
    private stateManager: DrawingStateManager;
    private coordinateTransformer: CoordinateTransformer;
    private interactionHandler: DrawingInteractionHandler;
    private rendererManager: DrawingRendererManager;

    private chart: IChartApi | null = null;
    private candleSeries: ISeriesApi<'Candlestick'> | null = null;
    private currentData: number[] = [];

    constructor() {
        this.stateManager = new DrawingStateManager();
        this.coordinateTransformer = new CoordinateTransformer(null);
        this.rendererManager = new DrawingRendererManager(this.coordinateTransformer);

        this.interactionHandler = new DrawingInteractionHandler(
            this.stateManager,
            this.coordinateTransformer,
            () => this.renderAllLines()
        );

        this.stateManager.setOnChangeCallback(() => {
            // Optional: trigger something on state change
        });
    }

    public init(chart: IChartApi, candleSeries: ISeriesApi<'Candlestick'>, symbol: string, interval: string) {
        this.chart = chart;
        this.candleSeries = candleSeries;

        this.coordinateTransformer.setChart(chart);
        this.coordinateTransformer.setCurrentInterval(interval);

        this.rendererManager.setChart(chart, candleSeries);
        this.interactionHandler.attach(chart, candleSeries);

        this.stateManager.setCurrentSymbol(symbol);
        this.renderAllLines();
    }

    public setOnChangeCallback(callback: () => void) {
        this.stateManager.setOnChangeCallback(callback);
    }

    public setOnModeChangeCallback(callback: (mode: DrawingMode) => void) {
        this.stateManager.setOnModeChangeCallback(callback);
    }

    public setMode(mode: DrawingMode) {
        this.stateManager.setMode(mode);
        this.updateCursor();
    }

    public getMode(): DrawingMode {
        return this.stateManager.getMode();
    }

    public updateSymbolInterval(symbol: string, interval: string) {
        this.stateManager.setCurrentSymbol(symbol);
        this.coordinateTransformer.setCurrentInterval(interval);
        this.renderAllLines();
    }

    public updateData(data: any[]) {
        this.currentData = data.map(d => d.time as number).sort((a, b) => a - b);
        this.coordinateTransformer.updateData(data);
        this.renderAllLines();
    }

    public updateLastCandle(candle: any) {
        const time = candle.time as number;
        if (this.currentData.length === 0 || time > this.currentData[this.currentData.length - 1]) {
            this.currentData.push(time);
            this.currentData.sort((a, b) => a - b);
        }
        this.coordinateTransformer.updateLastCandle(candle);
    }

    public handleChartClick(param: MouseEventParams) {
        if (!param.point || !param.time || !this.candleSeries) return;

        const coordinate = param.point.y;
        const clickedPrice = this.candleSeries.coordinateToPrice(coordinate) as number;

        if (clickedPrice === null) return;

        const mode = this.stateManager.getMode();

        switch (mode) {
            case 'HORIZONTAL_LINE':
                this.addHorizontalLine(clickedPrice, param.time as number);
                break;
            case 'LINE_AB':
                this.handleLineABClick(clickedPrice, param.time as number);
                break;
        }
    }

    public handleMouseMove(param: MouseEventParams) {
        const mode = this.stateManager.getMode();
        const activeDrawing = this.stateManager.getState().activeDrawing;

        if (mode === 'LINE_AB' && activeDrawing && param.point && param.time && this.candleSeries) {
            const coordinate = param.point.y;
            const price = this.candleSeries.coordinateToPrice(coordinate) as number;
            if (price !== null) {
                this.rendererManager.updatePreview(activeDrawing, price, param.time as any as number);
            }
        }
    }

    public removeLine(id: string) {
        this.stateManager.removeLine(id);
        this.renderAllLines();
    }

    public removeSelectedLine() {
        this.stateManager.removeSelectedLine();
        this.renderAllLines();
    }

    public clearAll() {
        this.stateManager.clearAll();
        this.renderAllLines();
    }

    public getLines(): DrawingLine[] {
        return this.stateManager.getLines();
    }

    public hasActiveDrawing(): boolean {
        return this.stateManager.getState().activeDrawing !== null;
    }

    public destroy() {
        this.stateManager.saveToLocalStorage();
        this.interactionHandler.detach();
        this.rendererManager.clear();
        this.chart = null;
        this.candleSeries = null;
    }

    private addHorizontalLine(price: number, time?: number) {
        const line: DrawingLine = {
            id: this.stateManager.generateId(),
            type: 'horizontal',
            price,
            time,
            color: '#3b82f6',
        };
        this.stateManager.addLine(line);
        this.renderAllLines();
        this.setMode('NONE');
    }

    private handleLineABClick(price: number, time: number) {
        const activeDrawing = this.stateManager.getState().activeDrawing;

        if (!activeDrawing) {
            // First click
            this.stateManager.setActiveDrawing({
                id: this.stateManager.generateId(),
                type: 'line_ab',
                price,
                time,
                color: '#3b82f6',
            });
        } else {
            // Second click
            const line: DrawingLine = {
                ...activeDrawing,
                price2: price,
                time2: time,
            } as DrawingLine;

            this.stateManager.addLine(line);
            this.stateManager.setActiveDrawing(null);
            this.renderAllLines();
            this.setMode('NONE');
        }
    }

    private renderAllLines() {
        const lines = this.stateManager.getLines();
        const selectedId = this.stateManager.getState().selectedLineId;
        this.rendererManager.renderAll(lines, selectedId ?? null, this.currentData);
    }

    private updateCursor() {
        if (!this.chart) return;
        const container = (this.chart as any).chartElement?.();
        if (container) {
            const mode = this.stateManager.getMode();
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
