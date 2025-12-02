import { getBinanceKlines } from '../../../lib/api';
import type { Time, CandlestickData } from 'lightweight-charts';

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
            const klines = await getBinanceKlines(symbol, interval, 200);
            if (!klines || klines.length === 0) return [];

            return klines.map((k: any[]) => ({
                time: Math.floor(k[0] / 1000) as Time,
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
            }));
        } catch (error) {
            console.error('Error loading historical data:', error);
            return [];
        }
    }

    public async getRawKlines(symbol: string, interval: string): Promise<any[]> {
        return await getBinanceKlines(symbol, interval, 200);
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
