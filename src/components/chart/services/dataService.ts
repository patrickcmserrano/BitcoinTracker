import { getBinanceKlines } from '../../../lib/crypto-api';
import type { Time, CandlestickData } from 'lightweight-charts';

// Interval → hours per candle
const INTERVAL_HOURS: Record<string, number> = {
    '1m': 1 / 60,
    '3m': 3 / 60,
    '5m': 5 / 60,
    '15m': 15 / 60,
    '30m': 30 / 60,
    '1h': 1,
    '2h': 2,
    '4h': 4,
    '6h': 6,
    '8h': 8,
    '12h': 12,
    '1d': 24,
    '3d': 72,
    '1w': 24 * 7,
    '1M': 24 * 30 // Approximate
};

// Target: 33 days of historical data for all timeframes
const TARGET_DAYS = 33;
const MIN_CANDLES = 300; // Ensure enough for MACD/RSI stabilization

function getCandleLimit(interval: string): number {
    const hours = INTERVAL_HOURS[interval] || 1;
    const totalHours = TARGET_DAYS * 24;
    const timeBasedLimit = Math.ceil(totalHours / hours);

    // Use the greater of time-based or minimum limit, capped at 1000
    const limit = Math.max(timeBasedLimit, MIN_CANDLES);
    // Binance has a max limit of 1000 candles per request
    return Math.min(limit, 1000);
}

export class DataService {
    private ws: WebSocket | null = null;
    private reconnectTimeout: number | null = null;
    private connectionAttempts = 0;
    private maxReconnectAttempts = 5;
    private isConnecting = false;

    constructor(
        private onNewCandle: (candle: CandlestickData) => void,
        private onConnectionStatusChange: (status: boolean) => void
    ) { }

    public async loadHistoricalData(symbol: string, interval: string): Promise<CandlestickData[]> {
        try {
            const limit = getCandleLimit(interval);
            const klines = await getBinanceKlines(symbol, interval, limit);
            if (!klines || klines.length === 0) return [];

            const data = klines.map((k: any[]) => ({
                time: Math.floor(k[0] / 1000) as Time,
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
            }));

            if (data.length > 0) {
                const start = new Date((data[0].time as number) * 1000).toISOString();
                const end = new Date((data[data.length - 1].time as number) * 1000).toISOString();
                console.log(`[DataService] Loaded ${data.length} candles for ${interval}. Range: ${start} to ${end}`);
            }

            return data;
        } catch (error) {
            console.error('Error loading historical data:', error);
            return [];
        }
    }

    public async getRawKlines(symbol: string, interval: string): Promise<any[]> {
        const limit = getCandleLimit(interval);
        return await getBinanceKlines(symbol, interval, limit);
    }

    public connectWebSocket(symbol: string, interval: string) {
        if (this.isConnecting) return;
        this.isConnecting = true;
        this.disconnectWebSocket();

        const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`;
        console.log(`Connecting to WebSocket: ${wsUrl}`);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log(`WebSocket connected for ${symbol} ${interval}`);
                this.connectionAttempts = 0;
                this.isConnecting = false;
                this.onConnectionStatusChange(true);
            };

            this.ws.onmessage = (event: MessageEvent) => {
                const data = JSON.parse(event.data);
                this.handleKlineData(data);
            };

            this.ws.onclose = (event) => {
                console.log(`WebSocket disconnected (code: ${event.code})`);
                this.isConnecting = false;
                this.onConnectionStatusChange(false);

                if (this.connectionAttempts < this.maxReconnectAttempts && event.code !== 1000) {
                    this.connectionAttempts++;
                    const delay = Math.min(2000 * Math.pow(2, this.connectionAttempts - 1), 32000);
                    this.reconnectTimeout = window.setTimeout(() => {
                        this.connectWebSocket(symbol, interval);
                    }, delay);
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this.isConnecting = false;
        }
    }

    private handleKlineData(data: any) {
        const kline = data.k;
        if (!kline) return;

        const candleData: CandlestickData = {
            time: Math.floor(kline.t / 1000) as Time,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
        };

        this.onNewCandle(candleData);
    }

    public disconnectWebSocket() {
        if (this.reconnectTimeout !== null) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                this.ws.close();
            }
            this.ws = null;
        }
        this.isConnecting = false;
    }
}
