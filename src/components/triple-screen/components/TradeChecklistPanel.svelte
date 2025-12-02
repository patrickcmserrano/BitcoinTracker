<script lang="ts">
    import type { TradeReason } from "../types";

    export let tradeReasons: TradeReason[];
    export let canEnterTrade: boolean;
    export let activeReasonsCount: number;
</script>

<div class="checklist-section">
    <div class="section-header">
        <h2>📋 Checklist Operacional (Regra de Ouro #5)</h2>
        <p class="section-subtitle">
            Mínimo 4 motivos para entrar na operação - Tendência Primária é
            OBRIGATÓRIA
        </p>
    </div>

    <div class="checklist">
        {#each tradeReasons as reason}
            <div class="checklist-item">
                <label>
                    <input
                        type="checkbox"
                        bind:checked={reason.active}
                        disabled={reason.required}
                    />
                    <span
                        class="checkbox-label {reason.required
                            ? 'required'
                            : ''}"
                    >
                        {reason.description}
                        {#if reason.required}
                            <span class="badge-required">OBRIGATÓRIO</span>
                        {/if}
                    </span>
                </label>
            </div>
        {/each}
    </div>

    <div class="checklist-status">
        <div class="status-indicator" class:ready={canEnterTrade}>
            {activeReasonsCount} de 4 motivos ativos
        </div>
        {#if canEnterTrade}
            <div class="ready-message">✅ Pronto para operar!</div>
        {:else}
            <div class="wait-message">⏳ Aguarde mais confirmações</div>
        {/if}
    </div>
</div>

<style>
    .checklist-section {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    :global(.dark) .checklist-section {
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

    .checklist {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .checklist-item label {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    :global(.dark) .checklist-item label {
        background: #0f172a;
    }

    .checklist-item label:hover {
        background: #f3f4f6;
    }

    :global(.dark) .checklist-item label:hover {
        background: #1e293b;
    }

    .checklist-item input[type="checkbox"] {
        width: 20px;
        height: 20px;
        cursor: pointer;
    }

    .checkbox-label {
        flex: 1;
        font-size: 0.95rem;
    }

    .checkbox-label.required {
        font-weight: 600;
    }

    .badge-required {
        display: inline-block;
        margin-left: 0.5rem;
        padding: 0.125rem 0.5rem;
        background: #fef3c7;
        color: #92400e;
        font-size: 0.625rem;
        font-weight: 700;
        border-radius: 4px;
    }

    .checklist-status {
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    :global(.dark) .checklist-status {
        border-top-color: #374151;
    }

    .status-indicator {
        font-weight: 600;
        color: #6b7280;
    }

    .status-indicator.ready {
        color: #10b981;
    }

    .ready-message {
        color: #10b981;
        font-weight: 700;
        font-size: 1.1rem;
    }

    .wait-message {
        color: #f59e0b;
        font-weight: 600;
    }
</style>
