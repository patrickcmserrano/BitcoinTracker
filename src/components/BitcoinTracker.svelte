<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { format } from "date-fns";
  import { _ } from "../lib/i18n";
  import CandleChart from "./CandleChart.svelte";
  import { useTrackerData } from "../lib/composables/useTrackerData";
  import { CRYPTO_CONFIGS, type CryptoData } from "../lib/crypto-config";

  // Use the composable with Bitcoin config
  const {
    data,
    loading,
    updating,
    error,
    atrError,
    lastATRCheck,
    nextATRCheck,
    lastUpdated,
    nextUpdateTime,
    fetchData,
    manualUpdate,
    startAutoUpdate,
    cleanup,
  } = useTrackerData(CRYPTO_CONFIGS.bitcoin);

  // Estados exportados para serem compartilhados
  // Note: We need to maintain the 'export let data' interface if possible,
  // but since 'data' is now a store, we can't export it directly.
  // However, BitcoinTracker seems to be used as a standalone page/component mostly.
  // If it's used as a child component where data is bound, this might break.
  // But looking at App.svelte usage: <BitcoinTracker /> (it's not used there, CryptoTracker is used).
  // Wait, App.svelte uses <CryptoTracker>.
  // Where is BitcoinTracker used?
  // It might be a legacy component or used in a specific route.
  // I'll check usages of BitcoinTracker.

  // Assuming it's safe to change internal implementation.
  // We'll subscribe to the store to update local variables for the template.

  let localData: any | null = null;
  $: localData = $data;

  // Export data for compatibility if needed (though it won't be two-way bindable easily)
  // export let data: BitcoinData | null = null;
  // If I export it, I should update it when store changes.
  // $: data = $data as unknown as BitcoinData;

  // Loading state
  let localLoading = false;
  $: localLoading = $loading;

  // Updating state
  let localUpdating = false;
  $: localUpdating = $updating;

  // Error state
  let localError = false;
  $: localError = !!$error;

  // ATR Error
  let localAtrError: string | null = null;
  $: localAtrError = $atrError;

  // Last ATR Check
  let localLastATRCheck: Date | null = null;
  $: localLastATRCheck = $lastATRCheck;

  // Next ATR Check
  let localNextATRCheck: Date | null = null;
  $: localNextATRCheck = $nextATRCheck;

  // Exported props for compatibility
  export { localLoading as loading };
  export { localAtrError as atrError };
  export { localLastATRCheck as lastATRCheck };
  export { localNextATRCheck as nextATRCheck };

  // Estado para controlar o timeframe ativo
  let activeTimeframe = "1h"; // Valor padrão - 1 hora

  // Estado para controlar a visibilidade do gráfico
  let showChart = false;

  // Lista de timeframes disponíveis
  const timeframes = [
    { id: "10m", label: "10m" },
    { id: "1h", label: "1h" },
    { id: "4h", label: "4h" },
    { id: "1d", label: "1d" },
    { id: "1w", label: "1w" },
  ];

  // Função para alterar o timeframe ativo
  function changeTimeframe(timeframe: string) {
    console.log(`Changing timeframe from ${activeTimeframe} to ${timeframe}`);
    activeTimeframe = timeframe;
  }

  // Função para mapear timeframe do rastreador para intervalo do gráfico
  function mapTimeframeToInterval(timeframe: string): string {
    const timeframeMap: { [key: string]: string } = {
      "10m": "5m", // Rastreador 10m → Gráfico 5m
      "1h": "1h", // 1h e 1h (mantém igual)
      "4h": "4h", // 4h e 4h (mantém igual)
      "1d": "1d", // 1d e 1d (mantém igual)
      "1w": "1w", // 1w e 1w (mantém igual)
    };

    return timeframeMap[timeframe] || "1m";
  }

  // Função pública para forçar atualização de ATR (chamada pelo componente pai)
  export function triggerATRUpdate() {
    manualUpdate();
  }

  // Função para mapear o timeframe para os dados apropriados
  function getTimeframeData(timeframe: string) {
    if (!localData) return null;

    const timeframeMap = {
      "10m": {
        amplitude: localData.amplitude10m,
        highPrice: localData.highPrice10m,
        lowPrice: localData.lowPrice10m,
        volume: localData.volume10m,
        percentChange: localData.percentChange10m,
      },
      "1h": {
        amplitude: localData.amplitude1h,
        highPrice: localData.highPrice1h,
        lowPrice: localData.lowPrice1h,
        volume: localData.volume1h,
        percentChange: localData.percentChange1h,
      },
      "4h": {
        amplitude: localData.amplitude4h,
        highPrice: localData.highPrice4h,
        lowPrice: localData.lowPrice4h,
        volume: localData.volume4h,
        percentChange: localData.percentChange4h,
      },
      "1d": {
        amplitude: localData.amplitude1d,
        highPrice: localData.highPrice1d,
        lowPrice: localData.lowPrice1d,
        volume: localData.volume1d,
        percentChange: localData.percentChange1d,
      },
      "1w": {
        amplitude: localData.amplitude1w,
        highPrice: localData.highPrice1w,
        lowPrice: localData.lowPrice1w,
        volume: localData.volume1w,
        percentChange: localData.percentChange1w,
      },
    };

    return timeframeMap[timeframe as keyof typeof timeframeMap];
  }

  // Valores de amplitude para cada timeframe
  const AMPLITUDE_THRESHOLDS = {
    "10m": { MEDIUM: 150, HIGH: 300 },
    "1h": { MEDIUM: 450, HIGH: 900 },
    "4h": { MEDIUM: 900, HIGH: 1800 },
    "1d": { MEDIUM: 1350, HIGH: 2700 },
    "1w": { MEDIUM: 2500, HIGH: 5000 },
  };

  // Função para atualizar o contador regressivo
  let timeLeftStr = "";
  let updateTimer: ReturnType<typeof setInterval> | null = null;

  function updateTimeLeft() {
    const next = $nextUpdateTime;
    if (!next) {
      timeLeftStr = "aguardando...";
      return;
    }

    const now = new Date();
    const diff = next.getTime() - now.getTime();

    if (diff <= 0) {
      timeLeftStr = "atualizando...";
    } else {
      const seconds = Math.floor(diff / 1000);
      timeLeftStr = `em ${seconds}s`;
    }
  }

  // Função para determinar a cor do indicador de amplitude
  function getAmplitudeColor(amplitude: number, timeframe: string): string {
    const thresholds =
      AMPLITUDE_THRESHOLDS[timeframe as keyof typeof AMPLITUDE_THRESHOLDS];
    const timeframeData = getTimeframeData(timeframe);

    if (!timeframeData) return "bg-gray-500";

    if (amplitude < thresholds.MEDIUM) {
      return "bg-gray-500";
    }

    if (amplitude >= thresholds.MEDIUM && amplitude < thresholds.HIGH) {
      return "bg-warning-500";
    }

    if (amplitude >= thresholds.HIGH) {
      const isPositive = timeframeData.percentChange >= 0;
      return isPositive ? "bg-success-500" : "bg-error-500";
    }

    return "bg-gray-500";
  }

  // Função para calcular a porcentagem da barra de progresso
  function getAmplitudePercentage(
    amplitude: number,
    timeframe: string,
  ): number {
    const maxValue =
      AMPLITUDE_THRESHOLDS[timeframe as keyof typeof AMPLITUDE_THRESHOLDS]
        .HIGH * 1.66;
    const percentage = (amplitude / maxValue) * 100;
    return Math.min(percentage, 100);
  }

  // Função para formatar números com separador de milhares
  function formatNumber(value: number, decimals = 2): string {
    const locale = navigator.language || "pt-BR";
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }

  // Função para determinar a cor da variação percentual
  function getPercentChangeColor(percentChange: number): string {
    return percentChange >= 0 ? "text-success-500" : "text-error-500";
  }

  // Componente inicializado
  onMount(async () => {
    console.log("Inicializando componente...");

    await fetchData(true, true);
    startAutoUpdate();

    // Timer for countdown
    updateTimer = setInterval(updateTimeLeft, 1000);

    console.log("Contador regressivo iniciado");
  });

  // Limpeza ao desmontar o componente
  onDestroy(() => {
    cleanup();
    if (updateTimer) clearInterval(updateTimer);
  });
</script>

<!-- Container principal responsivo -->
<div class="w-full max-w-6xl mx-auto space-y-6 p-4">
  <!-- Seção do Bitcoin Tracker -->
  <div class="card p-4 shadow-lg variant-filled-surface w-full relative">
    {#if updating}
      <div class="absolute top-0 left-0 w-full h-1">
        <div class="h-full bg-primary-300 animate-progress"></div>
      </div>
    {/if}
    <div class="text-center mb-3 relative">
      <h1 class="h3 font-bold text-primary-500">{$_("app.title")}</h1>
      <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
        {$_("app.subtitle")}
      </p>
      <!-- Botão de atualização manual -->
      <button
        class="absolute right-0 top-0 p-2 text-primary-500 hover:text-primary-700 transition-colors"
        title="Atualizar dados manualmente"
        on:click={() => {
          console.log("Botão de atualização clicado");
          manualUpdate();
        }}
        disabled={localUpdating}
      >
        <span class={localUpdating ? "animate-spin" : ""}>⟳</span>
      </button>
    </div>
    {#if loading}
      <div class="flex justify-center items-center py-8">
        <div
          class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"
        ></div>
      </div>{:else if error}
      <div class="card p-3 variant-filled-error rounded">
        <p class="text-center">{$_("bitcoin.error")}</p>
      </div>
    {:else if localData}
      <!-- Preço principal -->
      <div class="flex items-center justify-center my-2">
        <span class="text-primary-500 mr-2 text-2xl">₿</span>
        <span class="text-4xl font-bold">${formatNumber(localData.price)}</span>
      </div>

      <!-- Seletor de Timeframes -->
      <div class="flex justify-center space-x-1 mb-4">
        {#each timeframes as timeframe}
          <button
            class="timeframe-btn {activeTimeframe === timeframe.id
              ? 'active'
              : ''}"
            on:click={() => changeTimeframe(timeframe.id)}
            title={$_(`bitcoin.timeframe${timeframe.id}Info`)}
          >
            {timeframe.label}
          </button>
        {/each}
      </div>

      {#if getTimeframeData(activeTimeframe)}
        {@const timeframeData = getTimeframeData(activeTimeframe)}

        {#if timeframeData}
          <!-- Variação percentual do timeframe selecionado -->
          <div
            class="flex justify-between items-center card variant-glass p-2 rounded mb-2"
          >
            <span>{$_("bitcoin.variation")} ({activeTimeframe})</span>
            <span class={getPercentChangeColor(timeframeData.percentChange)}>
              {timeframeData.percentChange >= 0 ? "+" : ""}{formatNumber(
                timeframeData.percentChange,
              )}%
            </span>
          </div>

          <!-- Volume do timeframe selecionado -->
          <div
            class="flex justify-between items-center card variant-glass p-2 rounded mb-2"
          >
            <span>{$_("bitcoin.volume")} ({activeTimeframe})</span>
            <span>${formatNumber(timeframeData.volume)}</span>
          </div>

          <!-- Amplitude do Timeframe selecionado -->
          <div class="mb-3">
            <div class="flex justify-between items-center mb-1">
              <span>{$_(`bitcoin.amplitude${activeTimeframe}`)}</span>
              <span>${formatNumber(timeframeData.amplitude)}</span>
            </div>
            <div class="progress">
              <div
                class={`progress-bar ${getAmplitudeColor(timeframeData.amplitude, activeTimeframe)}`}
                style={`width: ${getAmplitudePercentage(timeframeData.amplitude, activeTimeframe)}%`}
              ></div>
            </div>
          </div>

          <!-- Preço mais alto e mais baixo do período -->
          <div class="flex justify-between mb-2">
            <div class="text-sm">
              <span class="text-success-500">▲</span> ${formatNumber(
                timeframeData.highPrice,
              )}
            </div>
            <div class="text-sm">
              <span class="text-error-500">▼</span> ${formatNumber(
                timeframeData.lowPrice,
              )}
            </div>
          </div>
        {/if}

        <!-- Informações específicas por timeframe -->
        {#if activeTimeframe === "10m"}
          <div
            class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400"
          >
            {$_("bitcoin.timeframe10mInfo")}
          </div>
        {:else if activeTimeframe === "1h"}
          <div
            class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400"
          >
            {$_("bitcoin.timeframe1hInfo")}
          </div>
        {:else if activeTimeframe === "4h"}
          <div
            class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400"
          >
            {$_("bitcoin.timeframe4hInfo")}
          </div>
        {:else if activeTimeframe === "1d"}
          <div
            class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400"
          >
            {$_("bitcoin.timeframe1dInfo")}
          </div>
        {:else if activeTimeframe === "1w"}
          <div
            class="text-xs text-center mt-2 mb-2 text-gray-600 dark:text-gray-400"
          >
            {$_("bitcoin.timeframe1wInfo")}
          </div>
        {/if}
      {/if}

      <!-- Timestamp de atualização -->
      <div class="text-right text-xs mt-4">
        <div class="flex items-center justify-end mb-1">
          {#if updating}
            <span class="animate-pulse mr-1">⟳</span>
          {/if}
          {$_("bitcoin.updated")}
          {format(localData.lastUpdate, "HH:mm:ss")}
          <span
            class="ml-1 text-primary-500"
            title="Próxima atualização dos dados do Bitcoin"
          >
            ({timeLeftStr})
          </span>
        </div>
        {#if localLastATRCheck && localNextATRCheck}
          <div class="text-xs text-surface-600-300-token">
            ATR verificado: {format(localLastATRCheck, "HH:mm:ss")}
            <span class="ml-1" title="Próxima verificação de ATR">
              (próx. {format(localNextATRCheck, "HH:mm")})
            </span>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Seção do Gráfico de Candles -->
  {#if showChart}
    <div class="card p-4 shadow-lg variant-filled-surface w-full">
      <div class="text-center mb-4">
        <h2 class="h4 font-bold text-primary-500">📊 Gráfico de Candles</h2>
      </div>
      <!-- Componente do gráfico de candles -->
      <div class="w-full">
        {#key activeTimeframe}
          <CandleChart
            symbol="BTCUSDT"
            interval={mapTimeframeToInterval(activeTimeframe)}
            {activeTimeframe}
            onTimeframeChange={changeTimeframe}
          />
        {/key}
      </div>
    </div>
  {/if}

  <!-- Botão para mostrar/ocultar gráfico -->
  <div class="text-center">
    <button
      class="btn variant-filled-primary"
      on:click={() => (showChart = !showChart)}
    >
      {showChart ? "📈 Ocultar Gráfico" : "📊 Mostrar Gráfico"}
    </button>
  </div>
</div>

<style>
  .progress {
    height: 0.5rem;
    background-color: rgba(0, 0, 0, 0.1);
    border-radius: 0.25rem;
    overflow: hidden;
  }
  .progress-bar {
    height: 100%;
    transition: width 0.3s ease;
  }

  @keyframes progressAnimation {
    0% {
      width: 0%;
    }
    50% {
      width: 70%;
    }
    100% {
      width: 100%;
    }
  }

  .animate-progress {
    animation: progressAnimation 2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-primary-300),
      transparent
    );
    opacity: 0.7;
  }
  /* Estilo para os botões de timeframe */
  .timeframe-btn {
    border: 1px solid var(--color-primary-300);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    transition: all 0.2s ease;
    min-width: 3rem;
    position: relative;
    overflow: hidden;
  }

  .timeframe-btn:hover {
    background-color: var(--color-primary-100);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  .timeframe-btn.active {
    background-color: var(--color-primary-500);
    color: white;
    font-weight: bold;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .timeframe-btn.active::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: white;
    opacity: 0.7;
  }
</style>
