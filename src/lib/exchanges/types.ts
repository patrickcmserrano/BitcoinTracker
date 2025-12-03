import type { Time } from 'lightweight-charts';

export type ExchangeName = 'binance' | 'bitget';

export interface NormalizedKlineData {
    time: Time;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

export interface WebSocketKlineMessage {
    exchange: ExchangeName;
    symbol: string;
    interval: string;
    kline: NormalizedKlineData;
}

export interface ExchangeConfig {
    name: ExchangeName;
    displayName: string;
    wsBaseUrl: string;
    apiBaseUrl: string;
}

export interface TickerData {
    symbol: string;
    priceChange: number;
    priceChangePercent: number;
    lastPrice: number;
    highPrice: number;
    lowPrice: number;
    volume: number;
    quoteVolume: number;
}
