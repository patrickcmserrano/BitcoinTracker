<script lang="ts">
    import type {
        OperationDirection,
        Trend,
        MACDResult,
        StochasticResult,
        Setup,
    } from "../types";

    export let operationDirection: OperationDirection;
    export let weeklyTrend: Trend;
    export let weeklyMACD: MACDResult | null;
    export let dailyStochastic: StochasticResult | null;
    export let hourlySetup: Setup;
    export let hourlyEMA17: number | null;
    export let canEnterTrade: boolean;
</script>

<div class="analysis-summary">
    <div class="summary-header">
        <h2>📊 Análise e Justificativa do Triple Screen</h2>
        <p class="summary-subtitle">
            Entenda o raciocínio por trás da leitura multitemporal
        </p>
    </div>

    <div class="summary-grid">
        <!-- Resumo da Tendência -->
        <div class="summary-card main-trend">
            <div class="summary-icon">🎯</div>
            <h3>Direção Operacional</h3>
            <div class="summary-value {operationDirection?.toLowerCase()}">
                {operationDirection || "Aguardando dados..."}
            </div>
            <p class="summary-explanation">
                {#if operationDirection === "COMPRA"}
                    A tendência semanal (OCEANO) está em alta, portanto devemos <strong
                        >excluir vendas</strong
                    >
                    e buscar apenas oportunidades de compra quando o mercado diário
                    (MARÉ) recuar.
                {:else if operationDirection === "VENDA"}
                    A tendência semanal (OCEANO) está em baixa, portanto devemos <strong
                        >excluir compras</strong
                    >
                    e buscar apenas oportunidades de venda quando o mercado diário
                    (MARÉ) subir.
                {:else if operationDirection === "RANGE"}
                    O mercado está <strong>lateral</strong> no semanal. Neste caso,
                    o método Triple Screen não se aplica. Considere usar estratégias
                    de faixa de negociação (suporte/resistência).
                {:else}
                    Calculando tendência...
                {/if}
            </p>
        </div>

        <!-- Justificativa OCEANO -->
        <div class="summary-card oceano-justify">
            <div class="summary-icon">🌊</div>
            <h3>Por que {weeklyTrend}? (Semanal)</h3>
            {#if weeklyMACD}
                <div class="justify-points">
                    <div class="justify-item">
                        <span class="justify-label">MACD Histogram:</span>
                        <span
                            class="justify-value {weeklyMACD.histogram > 0
                                ? 'positive'
                                : 'negative'}"
                        >
                            {weeklyMACD.histogram > 0 ? "Positivo" : "Negativo"}
                            ({weeklyMACD.histogram.toFixed(2)})
                        </span>
                    </div>
                    <div class="justify-item">
                        <span class="justify-label">MACD vs Signal:</span>
                        <span class="justify-value">
                            {weeklyMACD.MACD > weeklyMACD.signal
                                ? "MACD acima"
                                : "MACD abaixo"} da linha de sinal
                        </span>
                    </div>
                    <div class="justify-conclusion">
                        {#if weeklyTrend === "ALTA"}
                            ✅ Histograma positivo + MACD acima do sinal = <strong
                                >Tendência de ALTA confirmada</strong
                            >
                        {:else if weeklyTrend === "BAIXA"}
                            ✅ Histograma negativo + MACD abaixo do sinal = <strong
                                >Tendência de BAIXA confirmada</strong
                            >
                        {:else}
                            ⚠️ Sinais conflitantes ou cruzamento recente = <strong
                                >Mercado LATERAL</strong
                            >
                        {/if}
                    </div>
                </div>
            {:else}
                <p class="loading-text">Calculando MACD semanal...</p>
            {/if}
        </div>

        <!-- Justificativa MARÉ -->
        <div class="summary-card mare-justify">
            <div class="summary-icon">🌀</div>
            <h3>Setup de Entrada (Diário)</h3>
            {#if dailyStochastic}
                <div class="justify-points">
                    <div class="justify-item">
                        <span class="justify-label">Estocástico %K:</span>
                        <span class="justify-value">
                            {dailyStochastic.k.toFixed(2)}
                            {#if dailyStochastic.k < 30}
                                (Sobrevenda)
                            {:else if dailyStochastic.k > 70}
                                (Sobrecompra)
                            {:else}
                                (Neutro)
                            {/if}
                        </span>
                    </div>
                    <div class="justify-conclusion">
                        {#if hourlySetup === "COMPRA"}
                            ✅ Estocástico em sobrevenda (&lt;30) + Tendência de
                            alta =
                            <strong>Momento ideal para COMPRAR</strong> no rompimento
                            do horário
                        {:else if hourlySetup === "VENDA"}
                            ✅ Estocástico em sobrecompra (&gt;70) + Tendência
                            de baixa =
                            <strong>Momento ideal para VENDER</strong> no rompimento
                            do horário
                        {:else}
                            ⏳ Estocástico em zona neutra. <strong
                                >Aguarde</strong
                            > entrada em zona de sobrevenda/sobrecompra alinhada
                            com a tendência principal.
                        {/if}
                    </div>
                </div>
            {:else}
                <p class="loading-text">Calculando Estocástico diário...</p>
            {/if}
        </div>

        <!-- Justificativa ONDA -->
        <div class="summary-card onda-justify">
            <div class="summary-icon">〰️</div>
            <h3>Confirmação (60 minutos)</h3>
            {#if hourlyEMA17}
                <div class="justify-points">
                    <div class="justify-item">
                        <span class="justify-label">EMA 17 períodos:</span>
                        <span class="justify-value"
                            >${hourlyEMA17.toFixed(2)}</span
                        >
                    </div>
                    <div class="justify-conclusion">
                        📍 Use a EMA 17 como <strong>referência</strong> para
                        entrada:
                        <ul class="justify-list">
                            <li>Em COMPRA: Preço próximo ou acima da EMA 17</li>
                            <li>Em VENDA: Preço próximo ou abaixo da EMA 17</li>
                            <li>
                                Aguarde padrão de candle de confirmação no
                                gráfico de 60min
                            </li>
                        </ul>
                    </div>
                </div>
            {:else}
                <p class="loading-text">Calculando EMA 17...</p>
            {/if}
        </div>
    </div>

    <!-- Resumo da Decisão Final -->
    <div class="final-decision">
        <div class="decision-icon">
            {#if canEnterTrade && (hourlySetup === "COMPRA" || hourlySetup === "VENDA")}
                ✅
            {:else}
                ⏳
            {/if}
        </div>
        <div class="decision-content">
            <h3 class="decision-title">Decisão Final:</h3>
            {#if canEnterTrade && hourlySetup === "COMPRA"}
                <p class="decision-text ready">
                    <strong>PRONTO PARA COMPRAR!</strong> Todos os timeframes estão
                    alinhados. Aguarde confirmação no gráfico de 60 minutos (padrão
                    de candle, volume, suporte).
                </p>
            {:else if canEnterTrade && hourlySetup === "VENDA"}
                <p class="decision-text ready">
                    <strong>PRONTO PARA VENDER!</strong> Todos os timeframes estão
                    alinhados. Aguarde confirmação no gráfico de 60 minutos (padrão
                    de candle, volume, resistência).
                </p>
            {:else if operationDirection === "RANGE"}
                <p class="decision-text warning">
                    <strong>MERCADO LATERAL.</strong> O Triple Screen não se aplica.
                    Considere estratégias de faixa de negociação ou aguarde definição
                    de tendência.
                </p>
            {:else}
                <p class="decision-text wait">
                    <strong>AGUARDAR.</strong>
                    {hourlySetup !== "COMPRA" && hourlySetup !== "VENDA"
                        ? "O timing do diário ainda não está favorável."
                        : "Complete o checklist com os 4 motivos obrigatórios antes de operar."}
                </p>
            {/if}
        </div>
    </div>
</div>

<style>
    .analysis-summary {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border: 2px solid #3b82f6;
    }

    :global(.dark) .analysis-summary {
        background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
        border-color: #60a5fa;
    }

    .summary-header {
        text-align: center;
        margin-bottom: 2rem;
    }

    .summary-header h2 {
        font-size: 1.75rem;
        font-weight: 800;
        color: #1e40af;
        margin-bottom: 0.5rem;
    }

    :global(.dark) .summary-header h2 {
        color: #bfdbfe;
    }

    .summary-subtitle {
        color: #1e40af;
        font-size: 1rem;
        opacity: 0.8;
    }

    :global(.dark) .summary-subtitle {
        color: #bfdbfe;
    }

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .summary-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        transition: transform 0.2s;
    }

    :global(.dark) .summary-card {
        background: #1e293b;
    }

    .summary-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .summary-card.main-trend {
        grid-column: 1 / -1;
        background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
        border: 2px solid #f59e0b;
    }

    :global(.dark) .summary-card.main-trend {
        background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
        border-color: #fbbf24;
    }

    .summary-icon {
        font-size: 2.5rem;
        text-align: center;
        margin-bottom: 1rem;
    }

    .summary-card h3 {
        font-size: 1.25rem;
        font-weight: 700;
        margin-bottom: 1rem;
        color: #374151;
    }

    :global(.dark) .summary-card h3 {
        color: #f9fafb;
    }

    .summary-value {
        font-size: 2rem;
        font-weight: 800;
        text-align: center;
        padding: 0.75rem;
        border-radius: 8px;
        margin-bottom: 1rem;
    }

    .summary-value.compra {
        color: #10b981;
        background: rgba(16, 185, 129, 0.15);
    }

    .summary-value.venda {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.15);
    }

    .summary-value.range {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.15);
    }

    .summary-explanation {
        font-size: 0.95rem;
        line-height: 1.6;
        color: #4b5563;
        text-align: left;
    }

    :global(.dark) .summary-explanation {
        color: #d1d5db;
    }

    .justify-points {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .justify-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem;
        background: #f9fafb;
        border-radius: 6px;
        font-size: 0.9rem;
    }

    :global(.dark) .justify-item {
        background: #0f172a;
    }

    .justify-label {
        font-weight: 600;
        color: #6b7280;
    }

    :global(.dark) .justify-label {
        color: #9ca3af;
    }

    .justify-value {
        font-weight: 700;
        color: #374151;
    }

    :global(.dark) .justify-value {
        color: #e5e7eb;
    }

    .justify-value.positive {
        color: #10b981;
    }

    .justify-value.negative {
        color: #ef4444;
    }

    .justify-conclusion {
        margin-top: 1rem;
        padding: 1rem;
        background: #f0f9ff;
        border-left: 4px solid #3b82f6;
        border-radius: 6px;
        font-size: 0.9rem;
        line-height: 1.6;
    }

    :global(.dark) .justify-conclusion {
        background: #1e3a8a;
        border-left-color: #60a5fa;
    }

    .justify-list {
        margin: 0.5rem 0 0 1.5rem;
        padding: 0;
    }

    .justify-list li {
        margin: 0.25rem 0;
    }

    .loading-text {
        text-align: center;
        color: #9ca3af;
        font-style: italic;
        padding: 2rem;
    }

    .final-decision {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 2rem;
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    :global(.dark) .final-decision {
        background: #1e293b;
    }

    .decision-icon {
        font-size: 4rem;
        flex-shrink: 0;
    }

    .decision-content {
        flex: 1;
    }

    .decision-title {
        font-size: 1.5rem;
        font-weight: 800;
        color: #1e40af;
        margin-bottom: 0.75rem;
    }

    :global(.dark) .decision-title {
        color: #bfdbfe;
    }

    .decision-text {
        font-size: 1.1rem;
        line-height: 1.6;
    }

    .decision-text.ready {
        color: #10b981;
        font-weight: 600;
    }

    .decision-text.warning {
        color: #f59e0b;
        font-weight: 600;
    }

    .decision-text.wait {
        color: #6b7280;
        font-weight: 500;
    }

    :global(.dark) .decision-text.wait {
        color: #9ca3af;
    }
</style>
