import axios from 'axios';
import type { IExchangeProvider } from './IExchangeProvider';
import type { NormalizedKlineData, WebSocketKlineMessage, TickerData } from './types';
import type { Time } from 'lightweight-charts';

export class BinanceProvider implements IExchangeProvider {
    public readonly name = 'binance';
    private readonly baseUrl = 'https://api.binance.com';
    private readonly wsBaseUrl = 'wss://stream.binance.com:9443/ws';

    public async getKlines(symbol: string, interval: string, limit: number): Promise<NormalizedKlineData[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/klines`, {
                params: {
                    symbol: symbol.toUpperCase(),
                    interval,
                    limit
                }
            });

            return response.data.map((k: any[]) => ({
                time: Math.floor(k[0] / 1000) as Time,
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
            }));
        } catch (error) {
            console.error('[BinanceProvider] Error fetching klines:', error);
            throw error;
        }
    }

    public async getCurrentPrice(symbol: string): Promise<number> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/ticker/price`, {
                params: { symbol: symbol.toUpperCase() }
            });
            return parseFloat(response.data.price);
        } catch (error) {
            console.error('[BinanceProvider] Error fetching price:', error);
            throw error;
        }
    }

    public async get24hTicker(symbol: string): Promise<TickerData> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v3/ticker/24hr`, {
                params: { symbol: symbol.toUpperCase() }
            });
            const data = response.data;
            return {
                symbol: data.symbol,
                priceChange: parseFloat(data.priceChange),
                priceChangePercent: parseFloat(data.priceChangePercent),
                lastPrice: parseFloat(data.lastPrice),
                highPrice: parseFloat(data.highPrice),
                lowPrice: parseFloat(data.lowPrice),
                volume: parseFloat(data.volume),
                quoteVolume: parseFloat(data.quoteVolume)
            };
        } catch (error) {
            console.error('[BinanceProvider] Error fetching 24h ticker:', error);
            throw error;
        }
    }

    public getWebSocketUrl(symbol: string, interval: string): string {
        return `${this.wsBaseUrl}/${symbol.toLowerCase()}@kline_${interval}`;
    }

    public getSubscriptionMessage(symbol: string, interval: string): any {
        return null;
    }

    public parseWebSocketMessage(data: any): WebSocketKlineMessage | null {
        try {
            // Binance format: { e: 'kline', ..., k: { t: 123456789, o: '...', ... } }
            if (!data.k) return null;

            const kline = data.k;
            return {
                exchange: 'binance',
                symbol: data.s,
                interval: kline.i,
                kline: {
                    time: Math.floor(kline.t / 1000) as Time,
                    open: parseFloat(kline.o),
                    high: parseFloat(kline.h),
                    low: parseFloat(kline.l),
                    close: parseFloat(kline.c),
                    volume: parseFloat(kline.v)
                }
            };
        } catch (error) {
            console.error('[BinanceProvider] Error parsing WS message:', error);
            return null;
        }
    }
}
