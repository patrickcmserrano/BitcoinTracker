export type Trend = 'ALTA' | 'BAIXA' | 'LATERAL' | null;
export type Setup = 'COMPRA' | 'VENDA' | 'AGUARDAR' | null;
export type OperationDirection = 'COMPRA' | 'VENDA' | 'RANGE' | null;

export interface MACDResult {
    histogram: number;
    MACD: number;
    signal: number;
}

export interface StochasticResult {
    k: number;
    d: number;
}

export interface TradeReason {
    id: number;
    description: string;
    active: boolean;
    required: boolean;
}

export interface TripleScreenState {
    weeklyTrend: Trend;
    dailyTrend: Trend;
    hourlySetup: Setup;
    operationDirection: OperationDirection;
    exclusionRule: string;

    weeklyMACD: MACDResult | null;
    weeklyEMA17: number | null;

    dailyStochastic: StochasticResult | null;
    dailyEMA17: number | null;

    hourlyEMA17: number | null;

    loading: boolean;
    error: string | null;
    lastPrice: number | null;
    atrValue: number | null;
}

export interface RiskManagementState {
    capital: number;
    riskPercentage: number;
    maxMonthlyLoss: number;
    riskRewardRatio: number;
    entryPrice: number | null;
    stopLoss: number | null;
    takeProfit: number | null;
    positionSize: number | null;
}
