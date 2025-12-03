import { ExchangeProviderFactory } from '../../../lib/exchanges/ExchangeProviderFactory';
import type { ExchangeName } from '../../../lib/exchanges/types';
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
    private isDisposed = false;

    constructor(
        private onNewCandle: (candle: CandlestickData) => void,
        private onConnectionStatusChange: (status: boolean) => void
    ) { }

    public async loadHistoricalData(symbol: string, interval: string, exchange: ExchangeName = 'binance'): Promise<CandlestickData[]> {
        if (this.isDisposed) return [];
        try {
            const provider = ExchangeProviderFactory.getProvider(exchange);
            const limit = getCandleLimit(interval);
            const klines = await provider.getKlines(symbol, interval, limit);

            if (this.isDisposed) return [];
            if (!klines || klines.length === 0) return [];

            const data = klines.map(k => ({
                time: k.time,
                open: k.open,
                high: k.high,
                low: k.low,
                close: k.close,
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

    public async getRawKlines(symbol: string, interval: string, exchange: ExchangeName = 'binance'): Promise<any[]> {
        if (this.isDisposed) return [];
        const provider = ExchangeProviderFactory.getProvider(exchange);
        const limit = getCandleLimit(interval);
        return await provider.getKlines(symbol, interval, limit);
    }

    public connectWebSocket(symbol: string, interval: string, exchange: ExchangeName = 'binance') {
        if (this.isDisposed) return;
        if (this.isConnecting) return;
        this.isConnecting = true;
        this.cleanupConnection();

        const provider = ExchangeProviderFactory.getProvider(exchange);
        const wsUrl = provider.getWebSocketUrl(symbol, interval);
        console.log(`Connecting to WebSocket (${exchange}): ${wsUrl}`);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                if (this.isDisposed) {
                    this.ws?.close();
                    return;
                }
                console.log(`WebSocket connected for ${symbol} ${interval}`);

                // Send subscription message if required (e.g. Bitget)
                const subMsg = provider.getSubscriptionMessage?.(symbol, interval);
                if (subMsg && this.ws) {
                    console.log('Sending subscription:', subMsg);
                    this.ws.send(JSON.stringify(subMsg));
                }

                this.connectionAttempts = 0;
                this.isConnecting = false;
                this.onConnectionStatusChange(true);
            };

            this.ws.onmessage = (event: MessageEvent) => {
                if (this.isDisposed) return;
                const data = JSON.parse(event.data);
                const parsed = provider.parseWebSocketMessage(data);
                if (parsed) {
                    this.handleKlineData(parsed.kline);
                } else if (exchange === 'bitget' && data.action === 'snapshot') {
                    // Handle initial snapshot if needed, or just rely on updates
                    // Bitget sends snapshot first, then updates. 
                    // Our parser handles both if structure matches.
                }
            };

            this.ws.onclose = (event) => {
                if (this.isDisposed) return;
                console.log(`WebSocket disconnected (code: ${event.code})`);
                this.isConnecting = false;
                this.onConnectionStatusChange(false);

                if (this.connectionAttempts < this.maxReconnectAttempts && event.code !== 1000) {
                    this.connectionAttempts++;
                    const delay = Math.min(2000 * Math.pow(2, this.connectionAttempts - 1), 32000);
                    this.reconnectTimeout = window.setTimeout(() => {
                        this.connectWebSocket(symbol, interval, exchange);
                    }, delay);
                }
            };

            this.ws.onerror = (error) => {
                if (this.isDisposed) return;
                console.error('WebSocket error:', error);
                this.isConnecting = false;
            };
        } catch (error) {
            console.error('Error creating WebSocket:', error);
            this.isConnecting = false;
        }
    }

    private handleKlineData(kline: any) {
        if (this.isDisposed) return;
        if (!kline) return;

        const candleData: CandlestickData = {
            time: kline.time,
            open: kline.open,
            high: kline.high,
            low: kline.low,
            close: kline.close,
        };

        this.onNewCandle(candleData);
    }

    public disconnectWebSocket() {
        this.isDisposed = true; // Mark as disposed to prevent any further updates
        this.cleanupConnection();
    }

    private cleanupConnection() {
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
