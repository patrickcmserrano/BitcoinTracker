<script lang="ts">
    import type { IndicatorState } from "./types";

    export let indicators: IndicatorState;
    export let isMaximized: boolean = false;
    export let onToggleIndicator: (indicator: keyof IndicatorState) => void;
    export let onMaximize: () => void;
    export let isMaximizedMode: boolean = false; // To distinguish styling between normal and maximized header
</script>

<div class="flex gap-2 items-center {isMaximizedMode ? 'mx-2' : ''}">
    {#if isMaximizedMode}
        <span class="text-xs font-medium text-gray-600 dark:text-gray-300"
            >Indicadores:</span
        >
    {/if}

    <button
        class="{isMaximizedMode
            ? 'indicator-toggle-max'
            : 'indicator-toggle'} {indicators.showSMA ? 'active' : ''}"
        onclick={() => onToggleIndicator("showSMA")}
        title="Mostrar/Ocultar SMAs"
    >
        SMA
    </button>
    <button
        class="{isMaximizedMode
            ? 'indicator-toggle-max'
            : 'indicator-toggle'} {indicators.showEMA ? 'active' : ''}"
        onclick={() => onToggleIndicator("showEMA")}
        title="Mostrar/Ocultar EMAs"
    >
        EMA
    </button>
    <button
        class="{isMaximizedMode
            ? 'indicator-toggle-max'
            : 'indicator-toggle'} {indicators.showBollinger ? 'active' : ''}"
        onclick={() => onToggleIndicator("showBollinger")}
        title="Mostrar/Ocultar Bandas de Bollinger"
    >
        BB
    </button>
    <button
        class="{isMaximizedMode
            ? 'indicator-toggle-max'
            : 'indicator-toggle'} {indicators.showMACD ? 'active' : ''}"
        onclick={() => onToggleIndicator("showMACD")}
        title="Mostrar/Ocultar MACD Histograma"
    >
        MACD
    </button>
    <button
        class="{isMaximizedMode
            ? 'indicator-toggle-max'
            : 'indicator-toggle'} {indicators.showRSI ? 'active' : ''}"
        onclick={() => onToggleIndicator("showRSI")}
        title="Mostrar/Ocultar RSI"
    >
        RSI
    </button>

    {#if !isMaximizedMode}
        <button
            class="maximize-btn"
            onclick={onMaximize}
            title={isMaximized ? "Minimizar gráfico" : "Maximizar gráfico"}
        >
            {isMaximized ? "🗗" : "⛶"}
        </button>
    {/if}
</div>

<style>
    .maximize-btn {
        background: var(--crypto-color, #3b82f6);
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .maximize-btn:hover {
        background: color-mix(in srgb, var(--crypto-color, #3b82f6) 80%, black);
        transform: translateY(-1px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .maximize-btn:active {
        transform: translateY(0);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    :global(.dark) .maximize-btn {
        background: color-mix(in srgb, var(--crypto-color, #3b82f6) 70%, black);
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    :global(.dark) .maximize-btn:hover {
        background: color-mix(in srgb, var(--crypto-color, #3b82f6) 60%, black);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
    }

    .indicator-toggle {
        padding: 4px 10px;
        font-size: 0.75rem;
        font-weight: 600;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        background: white;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
    }

    .indicator-toggle:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
    }

    .indicator-toggle.active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: white;
    }

    :global(.dark) .indicator-toggle {
        background: #1e293b;
        border-color: #475569;
        color: #94a3b8;
    }

    :global(.dark) .indicator-toggle:hover {
        background: #334155;
        border-color: #64748b;
    }

    :global(.dark) .indicator-toggle.active {
        background: #2563eb;
        border-color: #2563eb;
        color: white;
    }

    .indicator-toggle-max {
        padding: 3px 8px;
        font-size: 0.7rem;
        font-weight: 600;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        background: white;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
    }

    .indicator-toggle-max:hover {
        background: #f1f5f9;
        border-color: #94a3b8;
    }

    .indicator-toggle-max.active {
        background: #3b82f6;
        border-color: #3b82f6;
        color: white;
    }

    :global(.dark) .indicator-toggle-max {
        background: #1e293b;
        border-color: #475569;
        color: #94a3b8;
    }

    :global(.dark) .indicator-toggle-max:hover {
        background: #334155;
        border-color: #64748b;
    }

    :global(.dark) .indicator-toggle-max.active {
        background: #2563eb;
        border-color: #2563eb;
        color: white;
    }
</style>
