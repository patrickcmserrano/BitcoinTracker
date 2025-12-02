<script lang="ts">
    import CandleChart from "../../CandleChart.svelte";
    import type { Trend, StochasticResult, Setup } from "../types";

    export let trend: Trend;
    export let stochastic: StochasticResult | null;
    export let ema17: number | null;
    export let setup: Setup;
    export let symbol: string;
</script>

<div class="timeframe-card mare">
    <div class="timeframe-header">
        <span class="timeframe-icon">🌀</span>
        <h2>MARÉ (Diário)</h2>
        <span class="indicator-badge">Estocástico + MME17</span>
    </div>

    <div class="trend-display">
        <div class="trend-label">Momento Diário:</div>
        <div class="trend-value {trend?.toLowerCase()}">
            {trend || "Carregando..."}
        </div>
    </div>

    {#if stochastic && ema17}
        <div class="indicator-values">
            <div class="indicator-row">
                <span>%K:</span>
                <span class="value">{stochastic.k.toFixed(2)}</span>
            </div>
            <div class="indicator-row">
                <span>%D:</span>
                <span class="value">{stochastic.d.toFixed(2)}</span>
            </div>
            <div class="indicator-row highlight">
                <span>MME 17 (LOTUS):</span>
                <span class="value">${ema17.toFixed(2)}</span>
            </div>
            <div class="stoch-zones">
                <div class="zone" class:active={stochastic.k < 30}>
                    Sobrevenda (&lt;30)
                </div>
                <div class="zone" class:active={stochastic.k > 70}>
                    Sobrecompra (&gt;70)
                </div>
            </div>
        </div>
    {:else}
        <div class="indicator-values">
            <div class="no-data">📊 Aguardando dados...</div>
        </div>
    {/if}

    <div class="setup-box">
        <strong>Setup:</strong>
        {setup || "AGUARDAR"}
    </div>

    <div class="chart-preview">
        <CandleChart
            {symbol}
            interval="1d"
            activeTimeframe="1d"
            defaultOscillator="RSI"
        />
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

    .timeframe-card.mare {
        border-top: 4px solid #8b5cf6;
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

    .trend-value.alta {
        color: #10b981;
        background: rgba(16, 185, 129, 0.1);
    }

    .trend-value.baixa {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
    }

    .trend-value.lateral {
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

    .indicator-row.highlight {
        background: #fef3c7;
        padding: 0.75rem;
        border-radius: 6px;
        border: 2px solid #f59e0b;
        margin-top: 0.5rem;
    }

    :global(.dark) .indicator-row.highlight {
        background: #78350f;
        border-color: #fbbf24;
    }

    .stoch-zones {
        display: flex;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .zone {
        flex: 1;
        padding: 0.5rem;
        text-align: center;
        font-size: 0.75rem;
        background: #f3f4f6;
        border-radius: 6px;
        opacity: 0.5;
        transition: all 0.3s;
    }

    :global(.dark) .zone {
        background: #374151;
    }

    .zone.active {
        opacity: 1;
        font-weight: 700;
        background: #fef3c7;
        color: #92400e;
    }

    :global(.dark) .zone.active {
        background: #78350f;
        color: #fef3c7;
    }

    .setup-box {
        margin-top: 1rem;
        padding: 1rem;
        background: #f0f9ff;
        border-left: 4px solid #3b82f6;
        border-radius: 6px;
        font-size: 0.875rem;
    }

    :global(.dark) .setup-box {
        background: #1e3a8a;
        border-left-color: #60a5fa;
    }

    .chart-preview {
        margin-top: auto;
        padding-top: 1rem;
        width: 100%;
        min-height: 400px;
    }
</style>
