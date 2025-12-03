import type { NormalizedKlineData, WebSocketKlineMessage, TickerData } from './types';

export interface IExchangeProvider {
    name: string;

    /**
     * Fetch historical kline data
     */
    getKlines(symbol: string, interval: string, limit: number): Promise<NormalizedKlineData[]>;

    /**
     * Get WebSocket URL for kline updates
     */
    getWebSocketUrl(symbol: string, interval: string): string;

    /**
     * Get WebSocket subscription message (if required by exchange)
     */
    getSubscriptionMessage?(symbol: string, interval: string): any;

    /**
     * Parse incoming WebSocket message into normalized format
     * Returns null if message is not a kline update or invalid
     */
    parseWebSocketMessage(data: any): WebSocketKlineMessage | null;

    /**
     * Get current price for a symbol
     */
    getCurrentPrice(symbol: string): Promise<number>;

    /**
     * Get 24h ticker data
     */
    get24hTicker(symbol: string): Promise<TickerData>;
}
