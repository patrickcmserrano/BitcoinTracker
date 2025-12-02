export interface HealthCheckResult {
    status: 'online' | 'offline';
    latency?: number;
    error?: string;
}

export interface APIStatus {
    name: string;
    status: 'online' | 'offline' | 'checking' | 'disabled';
    description: string;
    free: boolean;
    latency?: number;
    error?: string;
    lastCheck?: Date;
    reason?: string;
}

export class ApiHealthService {
    private static instance: ApiHealthService;

    private constructor() { }

    public static getInstance(): ApiHealthService {
        if (!ApiHealthService.instance) {
            ApiHealthService.instance = new ApiHealthService();
        }
        return ApiHealthService.instance;
    }

    public async checkBinanceHealth(): Promise<HealthCheckResult> {
        return this.checkEndpoint('https://api.binance.com/api/v3/ping');
    }

    public async checkBinanceFuturesHealth(): Promise<HealthCheckResult> {
        return this.checkEndpoint('https://fapi.binance.com/fapi/v1/ping');
    }

    public async checkAlternativeMeHealth(): Promise<HealthCheckResult> {
        return this.checkEndpoint('https://api.alternative.me/fng/?limit=1');
    }

    public async checkCoinGeckoHealth(): Promise<HealthCheckResult> {
        try {
            const start = Date.now();
            const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', {
                signal: AbortSignal.timeout(8000),
                mode: 'cors'
            });
            const latency = Date.now() - start;

            if (response.ok) {
                const data = await response.json();
                if (data && data.bitcoin && data.bitcoin.usd) {
                    return { status: 'online', latency };
                } else {
                    return { status: 'offline', error: 'Resposta inválida' };
                }
            } else {
                return { status: 'offline', error: `HTTP ${response.status}` };
            }
        } catch (error) {
            return this.handleError(error);
        }
    }

    private async checkEndpoint(url: string): Promise<HealthCheckResult> {
        try {
            const start = Date.now();
            const response = await fetch(url, {
                signal: AbortSignal.timeout(8000),
                mode: 'cors'
            });
            const latency = Date.now() - start;

            if (response.ok) {
                return { status: 'online', latency };
            } else {
                return { status: 'offline', error: `HTTP ${response.status}` };
            }
        } catch (error) {
            return this.handleError(error);
        }
    }

    private handleError(error: unknown): HealthCheckResult {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            return { status: 'offline', error: 'CORS ou rede bloqueada' };
        }
        return { status: 'offline', error: error instanceof Error ? error.message : 'Timeout' };
    }
}

export const apiHealthService = ApiHealthService.getInstance();
