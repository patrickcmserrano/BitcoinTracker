import { MACD, Stochastic, EMA } from 'technicalindicators';
import { cacheService } from '../../../lib/cache-service';
import { ExchangeProviderFactory } from '../../../lib/exchanges/ExchangeProviderFactory';
import type { ExchangeName } from '../../../lib/exchanges/types';
import type { TripleScreenState, MACDResult, StochasticResult, Trend, Setup, OperationDirection } from '../types';


export class TripleScreenService {
    private static instance: TripleScreenService;

    private constructor() { }

    public static getInstance(): TripleScreenService {
        if (!TripleScreenService.instance) {
            TripleScreenService.instance = new TripleScreenService();
        }
        return TripleScreenService.instance;
    }

    private async getKlines(symbol: string, interval: string, limit: number, exchange: ExchangeName = 'binance'): Promise<any[]> {
        const cacheKey = `klines_${exchange}_${symbol}_${interval}_${limit}`;

        return cacheService.get(
            cacheKey,
            async () => {
                console.log(`🎯 Buscando ${limit} klines de ${symbol} no intervalo ${interval} via ${exchange}`);
                const provider = ExchangeProviderFactory.getProvider(exchange);
                const klines = await provider.getKlines(symbol, interval, limit);
                console.log(`✅ ${klines.length} klines obtidos com sucesso`);
                return klines;
            },
            {
                ttl: interval.includes('m') ? 30000 : 60000,
                apiType: exchange
            }
        );
    }

    public async analyze(symbol: string, exchange: ExchangeName = 'binance'): Promise<Partial<TripleScreenState>> {
        console.log(`🎯 Triple Screen: Iniciando análise para ${symbol} via ${exchange}`);

        const [weeklyAnalysis, dailyAnalysis, hourlyAnalysis] = await Promise.all([
            this.analyzeWeekly(symbol, exchange),
            this.analyzeDaily(symbol, exchange),
            this.analyzeHourly(symbol, exchange)
        ]);

        // Combine results to determine operation direction and setup
        const operationDirection = this.determineOperationDirection(weeklyAnalysis.trend, weeklyAnalysis.priceAboveEMA);
        const hourlySetup = this.determineHourlySetup(operationDirection, dailyAnalysis.stochastic);

        // Update daily trend based on operation direction and stochastic
        const dailyTrend = this.determineDailyTrend(operationDirection, dailyAnalysis.stochastic);

        return {
            weeklyTrend: weeklyAnalysis.trend,
            weeklyMACD: weeklyAnalysis.macd,
            weeklyEMA17: weeklyAnalysis.ema17,

            dailyStochastic: dailyAnalysis.stochastic,
            dailyEMA17: dailyAnalysis.ema17,
            dailyTrend,

            hourlyEMA17: hourlyAnalysis.ema17,
            lastPrice: hourlyAnalysis.lastPrice,

            operationDirection,
            hourlySetup,
            exclusionRule: this.getExclusionRule(operationDirection),
            atrValue: dailyAnalysis.atr
        };
    }

    private async analyzeWeekly(symbol: string, exchange: ExchangeName) {
        console.log('🌊 Buscando dados semanais...');
        const data = await this.getKlines(symbol, '1w', 100, exchange);
        const closes = data.map((k: any) => k.close);
        const currentPrice = closes[closes.length - 1];

        // MACD
        const macdResult = MACD.calculate({
            values: closes,
            fastPeriod: 12,
            slowPeriod: 26,
            signalPeriod: 9,
            SimpleMAOscillator: false,
            SimpleMASignal: false
        });
        const latestMACD = macdResult[macdResult.length - 1];

        // EMA 17
        const ema17Result = EMA.calculate({ period: 17, values: closes });
        const ema17 = ema17Result[ema17Result.length - 1];

        let trend: Trend = 'LATERAL';
        const priceAboveEMA = currentPrice > ema17;

        if (latestMACD && ema17 &&
            latestMACD.histogram !== undefined &&
            latestMACD.MACD !== undefined &&
            latestMACD.signal !== undefined) {

            const macdBullish = latestMACD.histogram > 0 && latestMACD.MACD > latestMACD.signal;
            const macdBearish = latestMACD.histogram < 0 && latestMACD.MACD < latestMACD.signal;

            if (macdBullish && priceAboveEMA) {
                trend = 'ALTA';
            } else if (macdBearish && !priceAboveEMA) {
                trend = 'BAIXA';
            }
        }

        return {
            trend,
            macd: (latestMACD && latestMACD.histogram !== undefined && latestMACD.MACD !== undefined && latestMACD.signal !== undefined) ? {
                histogram: latestMACD.histogram,
                MACD: latestMACD.MACD,
                signal: latestMACD.signal
            } : null,
            ema17,
            priceAboveEMA
        };
    }

    private async analyzeDaily(symbol: string, exchange: ExchangeName) {
        console.log('🌀 Buscando dados diários...');
        const data = await this.getKlines(symbol, '1d', 100, exchange);

        const highs = data.map((k: any) => k.high);
        const lows = data.map((k: any) => k.low);
        const closes = data.map((k: any) => k.close);
        const currentPrice = closes[closes.length - 1];

        // Stochastic
        const stochResult = Stochastic.calculate({
            high: highs,
            low: lows,
            close: closes,
            period: 14,
            signalPeriod: 3
        });
        const latestStoch = stochResult[stochResult.length - 1];

        // EMA 17
        const ema17Result = EMA.calculate({ period: 17, values: closes });
        const ema17 = ema17Result[ema17Result.length - 1];

        // ATR Calculation (manual implementation from original code)
        const atrValue = this.calculateATR(highs, lows, closes);

        return {
            stochastic: latestStoch,
            ema17,
            atr: atrValue,
            currentPrice
        };
    }

    private async analyzeHourly(symbol: string, exchange: ExchangeName) {
        const data = await this.getKlines(symbol, '1h', 100, exchange);
        const closes = data.map((k: any) => k.close);
        const lastPrice = closes[closes.length - 1];

        const ema17Result = EMA.calculate({ period: 17, values: closes });
        const ema17 = ema17Result[ema17Result.length - 1];

        return {
            ema17,
            lastPrice
        };
    }

    private calculateATR(highs: number[], lows: number[], closes: number[]): number {
        const period = 3; // Using 3 periods as per original code
        const slicedHighs = highs.slice(-14);
        const slicedLows = lows.slice(-14);
        const slicedCloses = closes.slice(-14);

        const trueRanges: number[] = [];
        for (let i = 1; i < slicedCloses.length; i++) {
            const high = slicedHighs[i];
            const low = slicedLows[i];
            const prevClose = slicedCloses[i - 1];

            const tr = Math.max(
                high - low,
                Math.abs(high - prevClose),
                Math.abs(low - prevClose)
            );

            trueRanges.push(tr);
        }

        return trueRanges.slice(-period).reduce((a, b) => a + b, 0) / period;
    }

    private determineOperationDirection(weeklyTrend: Trend, priceAboveEMA: boolean): OperationDirection {
        if (weeklyTrend === 'ALTA') return 'COMPRA';
        if (weeklyTrend === 'BAIXA') return 'VENDA';
        return 'RANGE';
    }

    private determineDailyTrend(direction: OperationDirection, stoch: StochasticResult | null): Trend {
        if (!stoch) return 'LATERAL';

        if (direction === 'COMPRA') {
            if (stoch.k < 30) return 'BAIXA'; // Pullback
            if (stoch.k > 70) return 'ALTA';
        } else if (direction === 'VENDA') {
            if (stoch.k > 70) return 'ALTA'; // Pullback (Rally)
            if (stoch.k < 30) return 'BAIXA';
        }
        return 'LATERAL';
    }

    private determineHourlySetup(direction: OperationDirection, stoch: StochasticResult | null): Setup {
        if (!stoch) return 'AGUARDAR';

        if (direction === 'COMPRA') {
            if (stoch.k < 30) return 'COMPRA';
            return 'AGUARDAR';
        } else if (direction === 'VENDA') {
            if (stoch.k > 70) return 'VENDA';
            return 'AGUARDAR';
        }
        return 'AGUARDAR';
    }

    private getExclusionRule(direction: OperationDirection): string {
        switch (direction) {
            case 'COMPRA':
                return 'EXCLUIR VENDAS - Operar apenas compras aguardando baixa no diário';
            case 'VENDA':
                return 'EXCLUIR COMPRAS - Operar apenas vendas aguardando alta no diário';
            case 'RANGE':
                return 'MERCADO LATERAL - Usar estratégia de faixa de negociação';
            default:
                return '';
        }
    }
}

export const tripleScreenService = TripleScreenService.getInstance();
