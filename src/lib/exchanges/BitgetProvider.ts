import axios from 'axios';
import type { IExchangeProvider } from './IExchangeProvider';
import type { NormalizedKlineData, WebSocketKlineMessage, TickerData } from './types';
import type { Time } from 'lightweight-charts';

export class BitgetProvider implements IExchangeProvider {
    public readonly name = 'bitget';
    private readonly baseUrl = 'https://api.bitget.com';
    private readonly wsUrl = 'wss://ws.bitget.com/v2/ws/public';

    private mapInterval(interval: string): string {
        // Bitget V2 format: 1min, 5min, 15min, 30min, 1h, 4h, 12h, 1day, 1week, 1M
        // Parameter name is 'granularity'
        const map: Record<string, string> = {
            '1m': '1min',
            '3m': '3min',
            '5m': '5min',
            '15m': '15min',
            '30m': '30min',
            '1h': '1h',
            '2h': '2h',
            '4h': '4h',
            '6h': '6h',
            '8h': '8h',
            '12h': '12h',
            '1d': '1day',
            '3d': '3day',
            '1w': '1week',
            '1M': '1M'
        };
        return map[interval] || interval;
    }

    private mapWsInterval(interval: string): string {
        // WS V2 channels: candle1m, candle5m, candle15m, candle30m, candle1H, candle4H, candle12H, candle1D, candle1W
        const map: Record<string, string> = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1H',
            '4h': '4H',
            '12h': '12H',
            '1d': '1D',
            '1w': '1W'
        };
        return map[interval] || interval;
    }

    public async getKlines(symbol: string, interval: string, limit: number): Promise<NormalizedKlineData[]> {
        try {
            // Bitget Spot V2
            // Symbol format: BTCUSDT (no _SPBL suffix for V2)
            const cleanSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

            const response = await axios.get(`${this.baseUrl}/api/v2/spot/market/candles`, {
                params: {
                    symbol: cleanSymbol,
                    granularity: this.mapInterval(interval),
                    limit
                }
            });

            if (response.data.code !== '00000') {
                throw new Error(`Bitget API Error: ${response.data.msg}`);
            }

            const klines = response.data.data.map((k: any[]) => ({
                time: Math.floor(parseInt(k[0]) / 1000) as Time,
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5])
            }));

            // Filter out any invalid klines
            const validKlines = klines.filter((k: NormalizedKlineData) => k.time && !isNaN(k.time as number));

            // Sort by time ascending to ensure correct order for chart
            validKlines.sort((a: NormalizedKlineData, b: NormalizedKlineData) => (a.time as number) - (b.time as number));

            // Verify order
            if (validKlines.length > 1) {
                const first = validKlines[0].time as number;
                const last = validKlines[validKlines.length - 1].time as number;
                if (first > last) {
                    console.warn('[BitgetProvider] Data is descending after sort, reversing...');
                    validKlines.reverse();
                }
            }

            return validKlines;

        } catch (error) {
            console.error('[BitgetProvider] Error fetching klines:', error);
            throw error;
        }
    }

    public async getCurrentPrice(symbol: string): Promise<number> {
        try {
            const cleanSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

            const response = await axios.get(`${this.baseUrl}/api/v2/spot/market/tickers`, {
                params: { symbol: cleanSymbol }
            });

            if (response.data.code !== '00000') {
                throw new Error(`Bitget API Error: ${response.data.msg}`);
            }

            const ticker = response.data.data[0];
            return parseFloat(ticker.lastPr);
        } catch (error) {
            console.error('[BitgetProvider] Error fetching price:', error);
            throw error;
        }
    }

    public async get24hTicker(symbol: string): Promise<TickerData> {
        try {
            const cleanSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

            const response = await axios.get(`${this.baseUrl}/api/v2/spot/market/tickers`, {
                params: { symbol: cleanSymbol }
            });

            if (response.data.code !== '00000') {
                throw new Error(`Bitget API Error: ${response.data.msg}`);
            }

            const data = response.data.data[0];

            // V2 Ticker: lastPr, open, high24h, low24h, baseVolume, quoteVolume, change24h (decimal)
            const lastPrice = parseFloat(data.lastPr);
            const openPrice = parseFloat(data.open);
            const changePercent = parseFloat(data.change24h) * 100; // Convert decimal to percent
            const change = lastPrice - openPrice;

            return {
                symbol: symbol,
                priceChange: change,
                priceChangePercent: changePercent,
                lastPrice: lastPrice,
                highPrice: parseFloat(data.high24h),
                lowPrice: parseFloat(data.low24h),
                volume: parseFloat(data.baseVolume),
                quoteVolume: parseFloat(data.quoteVolume)
            };
        } catch (error) {
            console.error('[BitgetProvider] Error fetching 24h ticker:', error);
            throw error;
        }
    }

    public getWebSocketUrl(symbol: string, interval: string): string {
        return this.wsUrl;
    }

    public getSubscriptionMessage(symbol: string, interval: string): any {
        const cleanSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;

        return {
            op: 'subscribe',
            args: [{
                instType: 'SPOT',
                channel: `candle${this.mapWsInterval(interval)}`,
                instId: cleanSymbol
            }]
        };
    }

    public parseWebSocketMessage(data: any): WebSocketKlineMessage | null {
        try {
            // Bitget V2 format: { action: 'snapshot'|'update', arg: { ... }, data: [ [ t, o, h, l, c, v ] ] }
            // Format seems similar to V1 but check 'arg' structure
            if (!data.data || !Array.isArray(data.data) || data.data.length === 0) return null;

            // Check if it's a candle message
            if (data.arg && data.arg.channel && data.arg.channel.startsWith('candle')) {
                const k = data.data[0]; // Bitget sends array of updates
                return {
                    exchange: 'bitget',
                    symbol: data.arg.instId,
                    interval: data.arg.channel.replace('candle', ''), // approximate
                    kline: {
                        time: Math.floor(parseInt(k[0]) / 1000) as Time,
                        open: parseFloat(k[1]),
                        high: parseFloat(k[2]),
                        low: parseFloat(k[3]),
                        close: parseFloat(k[4]),
                        volume: parseFloat(k[5])
                    }
                };
            }
            return null;
        } catch (error) {
            console.error('[BitgetProvider] Error parsing WS message:', error);
            return null;
        }
    }
}
