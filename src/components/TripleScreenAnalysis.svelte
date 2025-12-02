<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { selectedCrypto, currentCryptoData } from "../lib/crypto-store";
  import CryptoTracker from "./CryptoTracker.svelte";
  import { tripleScreenService } from "./triple-screen/services/tripleScreenService";
  import { riskManagementService } from "./triple-screen/services/riskManagementService";
  import type {
    TripleScreenState,
    RiskManagementState,
    TradeReason,
  } from "./triple-screen/types";

  // Components
  import WeeklyTrendPanel from "./triple-screen/components/WeeklyTrendPanel.svelte";
  import DailyTrendPanel from "./triple-screen/components/DailyTrendPanel.svelte";
  import HourlySetupPanel from "./triple-screen/components/HourlySetupPanel.svelte";
  import AnalysisSummaryPanel from "./triple-screen/components/AnalysisSummaryPanel.svelte";
  import TradeChecklistPanel from "./triple-screen/components/TradeChecklistPanel.svelte";
  import RiskManagementPanel from "./triple-screen/components/RiskManagementPanel.svelte";

  // State
  let state: TripleScreenState = {
    weeklyTrend: null,
    dailyTrend: null,
    hourlySetup: null,
    operationDirection: null,
    exclusionRule: "",
    weeklyMACD: null,
    weeklyEMA17: null,
    dailyStochastic: null,
    dailyEMA17: null,
    hourlyEMA17: null,
    loading: false,
    error: null,
    lastPrice: null,
    atrValue: null,
  };

  let riskState: RiskManagementState = {
    capital: 2000,
    riskPercentage: 2,
    maxMonthlyLoss: 6,
    riskRewardRatio: 1.5,
    entryPrice: null,
    stopLoss: null,
    takeProfit: null,
    positionSize: null,
  };

  let tradeReasons: TradeReason[] = [
    {
      id: 1,
      description: "Tendência Primária Favorável (Oceano/Semanal)",
      active: false,
      required: true,
    },
    {
      id: 2,
      description: "Maré (Diário) dando setup na direção da tendência",
      active: false,
      required: false,
    },
    {
      id: 3,
      description: "Preço próximo/acima da EMA 17",
      active: false,
      required: false,
    },
    {
      id: 4,
      description: "Suporte/Resistência relevante",
      active: false,
      required: false,
    },
    {
      id: 5,
      description: "Padrão de candle de confirmação",
      active: false,
      required: false,
    },
    {
      id: 6,
      description: "Volume acima da média",
      active: false,
      required: false,
    },
  ];

  // Refs
  let cryptoTrackerRef: CryptoTracker;
  let cryptoData: any = null;
  let cryptoLoading = false;
  let activeTimeframe = "1h";
  let intervalId: any;

  // Derived
  $: activeReasonsCount = tradeReasons.filter((r) => r.active).length;
  $: canEnterTrade = activeReasonsCount >= 4 && tradeReasons[0].active;

  // Methods
  async function fetchData() {
    state.loading = true;
    state.error = null;

    try {
      const result = await tripleScreenService.analyze(
        $selectedCrypto.binanceSymbol,
      );
      state = { ...state, ...result };

      // Update first reason based on trend
      if (state.weeklyTrend === "ALTA" || state.weeklyTrend === "BAIXA") {
        tradeReasons[0].active = true;
      }
    } catch (err) {
      state.error = err instanceof Error ? err.message : "Erro ao buscar dados";
      console.error("Error fetching triple screen data:", err);
    } finally {
      state.loading = false;
    }
  }

  function updateRiskCalculations() {
    if (state.atrValue && riskState.entryPrice) {
      const result = riskManagementService.calculateRisk(
        riskState,
        state.atrValue,
        state.operationDirection,
      );
      riskState = { ...riskState, ...result };
    }
  }

  // Reactive statements
  $: if (riskState.entryPrice && state.atrValue) {
    updateRiskCalculations();
  }

  let previousCryptoId: string | null = null;
  $: if ($selectedCrypto && $selectedCrypto.id !== previousCryptoId) {
    previousCryptoId = $selectedCrypto.id;
    if (previousCryptoId !== null) {
      // Reset state
      state = {
        ...state,
        weeklyTrend: null,
        dailyTrend: null,
        hourlySetup: null,
        operationDirection: null,
        weeklyMACD: null,
        dailyStochastic: null,
        atrValue: null,
      };
      riskState = {
        ...riskState,
        entryPrice: null,
        stopLoss: null,
        takeProfit: null,
      };
      tradeReasons = tradeReasons.map((r) => ({
        ...r,
        active: r.required ? false : r.active,
      }));

      fetchData();
    }
  }

  onMount(() => {
    fetchData();
    intervalId = setInterval(fetchData, 5 * 60 * 1000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

<div class="triple-screen-with-tracker">
  <CryptoTracker
    bind:this={cryptoTrackerRef}
    config={$selectedCrypto}
    bind:data={cryptoData}
    bind:loading={cryptoLoading}
    bind:activeTimeframe
  />
</div>

<div class="triple-screen-container">
  <div class="header">
    <h1 class="title">🎯 Análise Triple Screen - Academia LOTUS</h1>
    <p class="subtitle">
      Sistema de análise multitemporal para operar apenas na direção da
      tendência
    </p>
    <button class="refresh-btn" on:click={fetchData} disabled={state.loading}>
      <span class="refresh-icon" class:spinning={state.loading}>↻</span>
      Atualizar
    </button>
  </div>

  {#if state.loading && !state.weeklyTrend}
    <div class="loading">
      <div class="spinner"></div>
      <p>Calculando Triple Screen...</p>
    </div>
  {:else if state.error}
    <div class="error">
      <p>⚠️ {state.error}</p>
      <button on:click={fetchData}>Tentar novamente</button>
    </div>
  {:else}
    <div class="timeframes-grid">
      <WeeklyTrendPanel
        trend={state.weeklyTrend}
        macd={state.weeklyMACD}
        ema17={state.weeklyEMA17}
        exclusionRule={state.exclusionRule}
        symbol={$selectedCrypto.binanceSymbol}
      />

      <DailyTrendPanel
        trend={state.dailyTrend}
        stochastic={state.dailyStochastic}
        ema17={state.dailyEMA17}
        setup={state.hourlySetup}
        symbol={$selectedCrypto.binanceSymbol}
      />

      <HourlySetupPanel
        operationDirection={state.operationDirection}
        ema17={state.hourlyEMA17}
        symbol={$selectedCrypto.binanceSymbol}
      />
    </div>

    <AnalysisSummaryPanel
      operationDirection={state.operationDirection}
      weeklyTrend={state.weeklyTrend}
      weeklyMACD={state.weeklyMACD}
      dailyStochastic={state.dailyStochastic}
      hourlySetup={state.hourlySetup}
      hourlyEMA17={state.hourlyEMA17}
      {canEnterTrade}
    />

    <TradeChecklistPanel
      bind:tradeReasons
      {canEnterTrade}
      {activeReasonsCount}
    />

    <RiskManagementPanel
      bind:state={riskState}
      atrValue={state.atrValue}
      lastPrice={state.lastPrice}
      currentCryptoPrice={$currentCryptoData?.price ?? null}
      symbol={$selectedCrypto.symbol}
      on:updateEntryPrice={(e) => (riskState.entryPrice = e.detail)}
    />

    <!-- Regras de Ouro -->
    <div class="golden-rules">
      <h2>⭐ Regras de Ouro da Academia LOTUS</h2>
      <div class="rules-grid">
        <div class="rule-card">
          <span class="rule-number">#1</span>
          <p>Risco máximo 2% por dia, 6% por mês</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#2</span>
          <p>Operar APENAS na direção da tendência</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#4</span>
          <p>Relação Risco x Ganho &gt; 1:1</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#5</span>
          <p>Mínimo 4 motivos para entrada</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#6</span>
          <p>Stop move apenas a favor</p>
        </div>
        <div class="rule-card">
          <span class="rule-number">#7</span>
          <p>Menor prejuízo é o melhor</p>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .triple-screen-container {
    width: 100%;
    max-width: 100%;
    margin: 0 auto;
    padding: 1rem 2rem;
    color: var(--app-text);
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    color: white;
    position: relative;
  }

  .title {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-size: 1rem;
    opacity: 0.9;
    margin-bottom: 1rem;
  }

  .refresh-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .refresh-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .refresh-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .refresh-icon {
    display: inline-block;
    font-size: 1.2rem;
  }

  .refresh-icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .loading,
  .error {
    text-align: center;
    padding: 3rem;
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  .timeframes-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
    gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .golden-rules {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    border-top: 4px solid #f59e0b;
  }

  :global(.dark) .golden-rules {
    background: #1e293b;
  }

  .golden-rules h2 {
    text-align: center;
    font-size: 1.5rem;
    font-weight: 800;
    color: #d97706;
    margin-bottom: 2rem;
  }

  :global(.dark) .golden-rules h2 {
    color: #fbbf24;
  }

  .rules-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1.5rem;
  }

  .rule-card {
    background: #fffbeb;
    padding: 1.5rem;
    border-radius: 8px;
    text-align: center;
    border: 1px solid #fcd34d;
    transition: transform 0.2s;
  }

  :global(.dark) .rule-card {
    background: #451a03;
    border-color: #92400e;
  }

  .rule-card:hover {
    transform: translateY(-4px);
  }

  .rule-number {
    display: inline-block;
    background: #f59e0b;
    color: white;
    font-weight: 800;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .rule-card p {
    font-weight: 600;
    color: #92400e;
    line-height: 1.4;
  }

  :global(.dark) .rule-card p {
    color: #fcd34d;
  }
</style>
