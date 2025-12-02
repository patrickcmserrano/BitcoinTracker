import { getBinanceKlines } from '../crypto-api';
import { calculateTechnicalIndicators, type TechnicalAnalysis, type OHLCVData } from '../technical-indicators';

export class TechnicalAnalysisService {
    private static instance: TechnicalAnalysisService;

    private constructor() { }

    public static getInstance(): TechnicalAnalysisService {
        if (!TechnicalAnalysisService.instance) {
            TechnicalAnalysisService.instance = new TechnicalAnalysisService();
        }
        return TechnicalAnalysisService.instance;
    }

    public async analyze(symbol: string, interval: string): Promise<{ indicators: TechnicalAnalysis, currentPrice: number }> {
        const binanceInterval = this.mapTimeframeToInterval(interval);
        console.log(`Buscando dados OHLCV para ${symbol} no intervalo ${interval} (mapeado: ${binanceInterval})`);

        const klines = await getBinanceKlines(symbol, binanceInterval, 200);

        if (!klines || klines.length === 0) {
            throw new Error('Nenhum dado OHLCV disponível');
        }

        const ohlcvData: OHLCVData = {
            open: klines.map(k => parseFloat(k[1])),
            high: klines.map(k => parseFloat(k[2])),
            low: klines.map(k => parseFloat(k[3])),
            close: klines.map(k => parseFloat(k[4])),
            volume: klines.map(k => parseFloat(k[5]))
        };

        const currentPrice = ohlcvData.close[ohlcvData.close.length - 1];
        const indicators = calculateTechnicalIndicators(ohlcvData);

        return { indicators, currentPrice };
    }

    private mapTimeframeToInterval(timeframe: string): string {
        const timeframeMap: { [key: string]: string } = {
            '5m': '5m',
            '15m': '15m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d',
            '1w': '1w'
        };

        return timeframeMap[timeframe] || '1h';
    }
}

export const technicalAnalysisService = TechnicalAnalysisService.getInstance();
