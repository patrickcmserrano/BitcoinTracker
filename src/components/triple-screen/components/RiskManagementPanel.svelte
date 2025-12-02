<script lang="ts">
    import type { RiskManagementState } from "../types";
    import { createEventDispatcher } from "svelte";

    export let state: RiskManagementState;
    export let atrValue: number | null;
    export let lastPrice: number | null;
    export let currentCryptoPrice: number | null;
    export let symbol: string;

    const dispatch = createEventDispatcher();

    $: maxDailyLoss = (state.capital * state.riskPercentage) / 100;
    $: maxMonthlyLossValue = (state.capital * state.maxMonthlyLoss) / 100;

    function useCurrentPrice() {
        const priceToUse = lastPrice || currentCryptoPrice;
        if (priceToUse) {
            dispatch("updateEntryPrice", priceToUse);
        }
    }
</script>

<div class="risk-management-section">
    <div class="section-header">
        <h2>💰 Gerenciamento de Risco (Regra de Ouro #1)</h2>
        <p class="section-subtitle">Regra dos 2% - Máximo 6% de perda mensal</p>
    </div>

    <div class="risk-grid">
        <div class="risk-card">
            <label for="capital-input">Capital Operacional (USD):</label>
            <input
                id="capital-input"
                type="number"
                bind:value={state.capital}
                min="100"
                step="100"
            />
        </div>

        <div class="risk-card">
            <label for="risk-input">Risco por Operação (%):</label>
            <input
                id="risk-input"
                type="number"
                bind:value={state.riskPercentage}
                min="0.5"
                max="5"
                step="0.5"
            />
        </div>

        <div class="risk-card highlight">
            <div class="risk-label">Perda Máxima Diária:</div>
            <div class="risk-value">${maxDailyLoss.toFixed(2)}</div>
        </div>

        <div class="risk-card highlight">
            <div class="risk-label">Perda Máxima Mensal:</div>
            <div class="risk-value">${maxMonthlyLossValue.toFixed(2)}</div>
        </div>
    </div>

    <!-- Calculadora de Stop Loss -->
    <div class="stop-loss-calculator">
        <h3>🎯 Calculadora de Stop Loss (ATR 3 períodos)</h3>

        <div class="calculator-grid">
            <div class="calc-input">
                <label for="entry-price">Preço de Entrada:</label>
                <input
                    id="entry-price"
                    type="number"
                    bind:value={state.entryPrice}
                    placeholder="Digite o preço de entrada"
                    step="0.01"
                />
                <button
                    class="use-current-price"
                    on:click={useCurrentPrice}
                    disabled={!lastPrice && !currentCryptoPrice}
                >
                    💰 Usar Preço Atual
                </button>
            </div>

            <div class="calc-display">
                <div class="calc-label">ATR (3 dias):</div>
                <div class="calc-value">
                    {atrValue ? `$${atrValue.toFixed(2)}` : "Calculando..."}
                </div>
            </div>

            <div class="calc-input">
                <label for="risk-reward">Relação Risco/Ganho:</label>
                <input
                    id="risk-reward"
                    type="number"
                    bind:value={state.riskRewardRatio}
                    min="1"
                    max="5"
                    step="0.1"
                />
            </div>
        </div>

        {#if state.stopLoss && state.takeProfit}
            <div class="trade-plan">
                <h4 class="plan-title">📋 Plano de Trade Calculado:</h4>
                <div class="plan-item">
                    <span class="plan-label">❌ Stop Loss:</span>
                    <span class="plan-value loss"
                        >${state.stopLoss.toFixed(2)}</span
                    >
                </div>
                <div class="plan-item">
                    <span class="plan-label">✅ Take Profit:</span>
                    <span class="plan-value profit"
                        >${state.takeProfit.toFixed(2)}</span
                    >
                </div>
                <div class="plan-item">
                    <span class="plan-label">📊 Tamanho da Posição:</span>
                    <span class="plan-value"
                        >{state.positionSize?.toFixed(4)} {symbol}</span
                    >
                </div>
                <div class="plan-item">
                    <span class="plan-label">💸 Risco da Operação:</span>
                    <span class="plan-value">${maxDailyLoss.toFixed(2)}</span>
                </div>
                <div class="plan-item">
                    <span class="plan-label">🎯 Ganho Potencial:</span>
                    <span class="plan-value profit">
                        ${(maxDailyLoss * state.riskRewardRatio).toFixed(2)}
                    </span>
                </div>
            </div>
        {:else}
            <div class="trade-plan-empty">
                <div class="empty-icon">📝</div>
                <p class="empty-text">
                    <strong>Preencha o Preço de Entrada</strong> acima para calcular
                    seu plano de trade completo
                </p>
                <p class="empty-hint">
                    💡 Dica: O ATR já está calculado automaticamente com base
                    nos dados diários
                </p>
            </div>
        {/if}
    </div>
</div>

<style>
    .risk-management-section {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    :global(.dark) .risk-management-section {
        background: #1e293b;
    }

    .section-header {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
    }

    :global(.dark) .section-header {
        border-bottom-color: #374151;
    }

    .section-header h2 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }

    .section-subtitle {
        color: #6b7280;
        font-size: 0.875rem;
    }

    .risk-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .risk-card {
        background: #f9fafb;
        padding: 1rem;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    :global(.dark) .risk-card {
        background: #0f172a;
    }

    .risk-card label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 600;
    }

    .risk-card input {
        padding: 0.5rem;
        border: 1px solid #e5e7eb;
        border-radius: 4px;
        font-size: 1rem;
        width: 100%;
    }

    :global(.dark) .risk-card input {
        background: #1e293b;
        border-color: #374151;
        color: white;
    }

    .risk-card.highlight {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
    }

    :global(.dark) .risk-card.highlight {
        background: #1e3a8a;
        border-color: #1e40af;
    }

    .risk-value {
        font-size: 1.5rem;
        font-weight: 800;
        color: #0369a1;
    }

    :global(.dark) .risk-value {
        color: #bae6fd;
    }

    .stop-loss-calculator {
        background: #f9fafb;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #e5e7eb;
    }

    :global(.dark) .stop-loss-calculator {
        background: #0f172a;
        border-color: #374151;
    }

    .stop-loss-calculator h3 {
        font-size: 1.1rem;
        font-weight: 700;
        margin-bottom: 1.5rem;
        color: #374151;
    }

    :global(.dark) .stop-loss-calculator h3 {
        color: #f3f4f6;
    }

    .calculator-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        align-items: end;
    }

    .calc-input {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .calc-input label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #4b5563;
    }

    .calc-input input {
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 1rem;
    }

    .use-current-price {
        margin-top: 0.5rem;
        padding: 0.5rem;
        background: #e0f2fe;
        color: #0369a1;
        border: none;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
    }

    .use-current-price:hover:not(:disabled) {
        background: #bae6fd;
    }

    .use-current-price:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .calc-display {
        text-align: center;
        padding: 1rem;
        background: white;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
    }

    :global(.dark) .calc-display {
        background: #1e293b;
        border-color: #374151;
    }

    .calc-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.25rem;
    }

    .calc-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: #374151;
    }

    :global(.dark) .calc-value {
        color: #f3f4f6;
    }

    .trade-plan {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        border-left: 4px solid #10b981;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    :global(.dark) .trade-plan {
        background: #1e293b;
    }

    .plan-title {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: #374151;
    }

    :global(.dark) .plan-title {
        color: #f3f4f6;
    }

    .plan-item {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f3f4f6;
    }

    :global(.dark) .plan-item {
        border-bottom-color: #374151;
    }

    .plan-label {
        color: #6b7280;
        font-weight: 500;
    }

    .plan-value {
        font-weight: 700;
        color: #111827;
    }

    :global(.dark) .plan-value {
        color: #f3f4f6;
    }

    .plan-value.loss {
        color: #ef4444;
    }

    .plan-value.profit {
        color: #10b981;
    }

    .trade-plan-empty {
        text-align: center;
        padding: 2rem;
        color: #9ca3af;
        background: white;
        border-radius: 8px;
        border: 1px dashed #d1d5db;
    }

    :global(.dark) .trade-plan-empty {
        background: #1e293b;
        border-color: #374151;
    }

    .empty-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
    }

    .empty-text {
        font-size: 1rem;
        margin-bottom: 0.5rem;
    }

    .empty-hint {
        font-size: 0.875rem;
        font-style: italic;
        opacity: 0.8;
    }
</style>
