<script lang="ts">
    import CandleChart from "../../CandleChart.svelte";
    import type { OperationDirection } from "../types";

    export let operationDirection: OperationDirection;
    export let ema17: number | null;
    export let symbol: string;
</script>

<div class="timeframe-card onda">
    <div class="timeframe-header">
        <span class="timeframe-icon">〰️</span>
        <h2>ONDA (60 min)</h2>
        <span class="indicator-badge">EMA 17</span>
    </div>

    <div class="trend-display">
        <div class="trend-label">Direção da Operação:</div>
        <div class="trend-value {operationDirection?.toLowerCase()}">
            {operationDirection || "Carregando..."}
        </div>
    </div>

    {#if ema17}
        <div class="indicator-values">
            <div class="indicator-row">
                <span>EMA 17:</span>
                <span class="value">${ema17.toFixed(2)}</span>
            </div>
        </div>
    {:else}
        <div class="indicator-values">
            <div class="no-data">📊 Aguardando dados...</div>
        </div>
    {/if}

    <div class="chart-preview">
        <CandleChart {symbol} interval="1h" activeTimeframe="1h" />
    </div>
</div>

<style>
    .timeframe-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
        display: flex;
        flex-direction: column;
    }

    :global(.dark) .timeframe-card {
        background: #1e293b;
    }

    .timeframe-card:hover {
        transform: translateY(-4px);
    }

    .timeframe-card.onda {
        border-top: 4px solid #10b981;
    }

    .timeframe-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
    }

    :global(.dark) .timeframe-header {
        border-bottom-color: #374151;
    }

    .timeframe-icon {
        font-size: 2rem;
    }

    .timeframe-header h2 {
        flex: 1;
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
    }

    .indicator-badge {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
        background: #f3f4f6;
        border-radius: 4px;
        font-weight: 600;
    }

    :global(.dark) .indicator-badge {
        background: #374151;
    }

    .trend-display {
        margin: 1.5rem 0;
        text-align: center;
    }

    .trend-label {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 0.5rem;
    }

    .trend-value {
        font-size: 2rem;
        font-weight: 800;
        padding: 0.5rem;
        border-radius: 8px;
    }

    .trend-value.compra {
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
    }

    .trend-value.venda {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
    }

    .trend-value.range {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.1);
    }

    .indicator-values {
        margin: 1rem 0;
    }

    .no-data {
        text-align: center;
        padding: 2rem 1rem;
        color: #9ca3af;
        font-size: 0.95rem;
        font-style: italic;
    }

    :global(.dark) .no-data {
        color: #6b7280;
    }

    .indicator-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid #f3f4f6;
    }

    :global(.dark) .indicator-row {
        border-bottom-color: #374151;
    }

    .indicator-row .value {
        font-weight: 600;
    }

    .chart-preview {
        margin-top: auto;
        padding-top: 1rem;
        width: 100%;
        min-height: 400px;
    }
</style>
