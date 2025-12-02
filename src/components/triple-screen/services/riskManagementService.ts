import type { RiskManagementState, OperationDirection } from '../types';

export class RiskManagementService {
    private static instance: RiskManagementService;

    private constructor() { }

    public static getInstance(): RiskManagementService {
        if (!RiskManagementService.instance) {
            RiskManagementService.instance = new RiskManagementService();
        }
        return RiskManagementService.instance;
    }

    public calculateRisk(
        state: RiskManagementState,
        atrValue: number,
        direction: OperationDirection
    ): Partial<RiskManagementState> {
        if (!atrValue || !state.entryPrice) {
            return {};
        }

        const { entryPrice, riskRewardRatio, capital, riskPercentage } = state;
        const opDirection = direction || 'COMPRA'; // Default to COMPRA if undefined

        let stopLoss: number;
        let takeProfit: number;

        if (opDirection === 'COMPRA') {
            stopLoss = entryPrice - atrValue;
            takeProfit = entryPrice + (atrValue * riskRewardRatio);
        } else if (opDirection === 'VENDA') {
            stopLoss = entryPrice + atrValue;
            takeProfit = entryPrice - (atrValue * riskRewardRatio);
        } else {
            // RANGE - default to COMPRA calculation logic for now
            stopLoss = entryPrice - atrValue;
            takeProfit = entryPrice + (atrValue * riskRewardRatio);
        }

        const maxDailyLoss = (capital * riskPercentage) / 100;
        const riskPerUnit = Math.abs(entryPrice - stopLoss);
        const positionSize = riskPerUnit > 0 ? maxDailyLoss / riskPerUnit : 0;

        return {
            stopLoss,
            takeProfit,
            positionSize
        };
    }
}

export const riskManagementService = RiskManagementService.getInstance();
