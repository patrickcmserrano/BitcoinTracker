import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import type { DrawingMode, DrawingLine, DrawingState } from '../../types';

export type { DrawingMode, DrawingLine, DrawingState };

export interface DragState {
    type: 'p1' | 'p2' | 'move';
    lineId: string;
    startX: number;
    startY: number;
    initialP1: { price: number, time: number };
    initialP2?: { price: number, time: number };
}

export type CoordinateResolver = (time: number) => number | null;

export interface DrawingServiceContext {
    chart: IChartApi | null;
    candleSeries: ISeriesApi<'Candlestick'> | null;
    currentData: number[];
    resolveCoordinate: CoordinateResolver;
    requestRender: () => void;
}
