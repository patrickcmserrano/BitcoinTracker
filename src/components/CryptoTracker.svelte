<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { format } from "date-fns";
  import type { CryptoConfig, CryptoData } from "../lib/crypto-config";
  import { _ } from "../lib/i18n";
  import CandleChart from "./CandleChart.svelte";
  import CryptoIcon from "./CryptoIcon.svelte";
  import ExchangeSelector from "./ExchangeSelector.svelte";
  import PriceSpreadMonitor from "./PriceSpreadMonitor.svelte";
  import { selectNextCrypto, selectPreviousCrypto } from "../lib/crypto-store";
  import { setupSwipeGestures, isTouchDevice } from "../lib/swipe-gestures";
  import { useTrackerData } from "../lib/composables/useTrackerData";

  // Props obrigatórias
  export let config: CryptoConfig;

  // Use the composable
  const {
    config: configStore,
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
  } = useTrackerData(config);

  // Update config store when prop changes
  $: configStore.set(config);

  // Re-fetch when config changes
  let previousConfigId: string | null = null;
  $: if (config && config.id !== previousConfigId) {
    console.log(
      `Config changed from ${previousConfigId} to ${config.id}, reinitializing...`,
    );
    previousConfigId = config.id;
    // Restart update cycle
    fetchData(true, true).then(() => {
      startAutoUpdate();
    });
  }

  // Estados exportados para serem compartilhados (mantendo compatibilidade)
  // Note: Svelte 5 runes would make this cleaner, but for Svelte 4 we might need to rely on the store values being used in template
  // or re-export them if parent binds to them.
  // Since 'data' is now a store, we can't export it as 'let data'.
  // We might need to subscribe to it and update a local variable if we want to maintain 'export let data' interface,
  // OR change the parent to use the store.
  // Given the constraints, I'll try to maintain compatibility by subscribing.

  let localData: CryptoData | null = null;
  $: localData = $data;

  // Exported props for binding (if parent uses bind:data)
  // Warning: bind:data won't work with derived store directly.
  // If parent expects to read data, it's fine. If it expects to write, it won't work.
  // Looking at App.svelte, it passes data={currentCryptoData} which is a store value?
  // App.svelte: <CryptoTracker config={$selectedCrypto} />
  // It doesn't seem to bind data.

  // Loading state
  let localLoading = false;
  $: localLoading = $loading;

  // ATR Error
  let localAtrError: string | null = null;
  $: localAtrError = $atrError;

  // Last ATR Check
  let localLastATRCheck: Date | null = null;
  $: localLastATRCheck = $lastATRCheck;

  // Next ATR Check
  let localNextATRCheck: Date | null = null;
  $: localNextATRCheck = $nextATRCheck;

  // Estado para controlar o timeframe ativo
  export let activeTimeframe = "1h";

  // Estado para controlar a visibilidade do gráfico
  let showChart = true;

  // Swipe gesture variables
  let swipeContainer: HTMLElement;
  let swipeCleanup: (() => void) | null = null;
  let isSwipeTransitioning = false;
  let swipeIndicator = "";

  // Lista de timeframes disponíveis
  const timeframes = [
    { id: "5m", label: "5m" },
    { id: "15m", label: "15m" },
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
      "5m": "5m",
      "15m": "15m",
      "1h": "1h",
      "4h": "4h",
      "1d": "1d",
      "1w": "1w",
    };

    return timeframeMap[timeframe] || "1h";
  }

  // Função pública para forçar atualização de ATR (chamada pelo componente pai)
  export function triggerATRUpdate() {
    manualUpdate();
  }

  // Função para mapear o timeframe para os dados apropriados
  function getTimeframeData(timeframe: string) {
    if (!localData) return null;

    const timeframeMap = {
      "5m": {
        amplitude: localData.amplitude10m, // Usando dados de 10m como fallback
        highPrice: localData.highPrice10m,
        lowPrice: localData.lowPrice10m,
        volume: localData.volume10m,
        percentChange: localData.percentChange10m,
      },
      "15m": {
        amplitude: localData.amplitude1h, // Usando dados de 1h como aproximação
        highPrice: localData.highPrice1h,
        lowPrice: localData.lowPrice1h,
        volume: localData.volume1h,
        percentChange: localData.percentChange1h,
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
    "5m": { MEDIUM: 100, HIGH: 200 },
    "15m": { MEDIUM: 200, HIGH: 400 },
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

  // Função para determinar a cor da amplitude com base nos thresholds
  function getAmplitudeColor(amplitude: number, timeframe: string): string {
    const thresholds =
      AMPLITUDE_THRESHOLDS[timeframe as keyof typeof AMPLITUDE_THRESHOLDS];

    if (amplitude > thresholds.HIGH) {
      return "bg-error-500";
    } else if (amplitude > thresholds.MEDIUM) {
      return "bg-warning-500";
    } else {
      return "bg-success-500";
    }
  }

  // Função para calcular o percentual da amplitude para a barra de progresso
  function getAmplitudePercentage(
    amplitude: number,
    timeframe: string,
  ): number {
    const thresholds =
      AMPLITUDE_THRESHOLDS[timeframe as keyof typeof AMPLITUDE_THRESHOLDS];
    const maxValue = (thresholds.HIGH * 5) / 3; // 5/3 do threshold HIGH como máximo
    const percentage = (amplitude / maxValue) * 100;
    return Math.min(percentage, 100); // Limitar a 100%
  }

  // Função para formatar números com separadores locais
  function formatNumber(
    value: number,
    decimals: number = config.precision,
  ): string {
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

  // Swipe gesture functions
  function handleSwipeNext() {
    if (isSwipeTransitioning) return;
    isSwipeTransitioning = true;
    swipeIndicator = "next";
    setTimeout(() => {
      selectNextCrypto();
      isSwipeTransitioning = false;
      swipeIndicator = "";
    }, 150);
  }

  function handleSwipePrevious() {
    if (isSwipeTransitioning) return;
    isSwipeTransitioning = true;
    swipeIndicator = "previous";
    setTimeout(() => {
      selectPreviousCrypto();
      isSwipeTransitioning = false;
      swipeIndicator = "";
    }, 150);
  }

  // Componente inicializado
  onMount(() => {
    // Initial fetch handled by reactive block above

    // Timer for countdown
    updateTimer = setInterval(updateTimeLeft, 1000);

    // Setup swipe gestures
    if (isTouchDevice() && swipeContainer) {
      swipeCleanup = setupSwipeGestures(
        swipeContainer,
        {
          onSwipeLeft: () => {
            if (!isSwipeTransitioning) handleSwipeNext();
          },
          onSwipeRight: () => {
            if (!isSwipeTransitioning) handleSwipePrevious();
          },
          onSwipeStart: () => {
            swipeIndicator = "";
          },
        },
        {
          minSwipeDistance: 60,
          maxSwipeTime: 400,
          preventScroll: true,
          excludeSelectors: [".card"],
        },
      );
    }
  });

  // Limpeza ao desmontar o componente
  onDestroy(() => {
    cleanup();
    if (updateTimer) clearInterval(updateTimer);
    if (swipeCleanup) swipeCleanup();
  });
</script>

<!-- Container principal responsivo com altura adaptável para viewport completo -->
<div class="w-full h-full mx-auto px-2 py-1" bind:this={swipeContainer}>
  <!-- Layout responsivo: empilhado verticalmente em todas as telas -->
  <div class="flex flex-col gap-3">
    <!-- Header Controls -->
    <div class="flex justify-between items-start px-1">
      <ExchangeSelector />
    </div>

    <!-- Seção do Gráfico de Candles -->
    {#if showChart}
      <div class="w-full flex-shrink-0 flex flex-col">
        <div
          class="card p-3 shadow-lg variant-filled-surface w-full flex flex-col min-h-[500px]"
        >
          <!-- Container do gráfico -->
          <div class="w-full flex-1">
            <CandleChart
              symbol={config.binanceSymbol}
              interval={mapTimeframeToInterval(activeTimeframe)}
              {activeTimeframe}
              onTimeframeChange={changeTimeframe}
            />
          </div>
        </div>
      </div>
    {/if}

    <div class="w-full px-1 pb-2">
      <PriceSpreadMonitor symbol={config.binanceSymbol} />
    </div>
  </div>
</div>
