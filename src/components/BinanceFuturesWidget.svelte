<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    getBinanceFuturesData,
    formatFundingRate,
    formatOpenInterest,
    formatLongShortRatio,
    getFundingRateSentiment,
    getLongShortSentiment,
    getTimeUntilNextFunding,
    formatFundingTime,
    type BinanceFuturesData
  } from '../lib/binance-futures-api';

  export let symbol: string = 'BTCUSDT';
  export let updateInterval: number = 60000; // 1 minuto

  let data: BinanceFuturesData | null = null;
  let loading = true;
  let error: string | null = null;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let nextFundingCountdown = '';
  let previousSymbol: string | null = null;

  // Estados de sentimento
  let fundingSentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral';
  let lsrSentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral';

  // Reativo: detecta mudança de símbolo e recarrega dados
  $: if (symbol && symbol !== previousSymbol) {
    console.log(`BinanceFutures: Symbol changed from ${previousSymbol} to ${symbol}`);
    previousSymbol = symbol;
    if (previousSymbol !== null) {
      // Não é a primeira vez, recarregar dados
      fetchData();
    }
  }

  async function fetchData() {
    try {
      loading = true;
      error = null;
      
      data = await getBinanceFuturesData(symbol);
      
      // Atualizar sentimentos
      if (data.fundingRate) {
        fundingSentiment = getFundingRateSentiment(data.fundingRate.fundingRate);
      }
      if (data.longShortRatio) {
        lsrSentiment = getLongShortSentiment(data.longShortRatio.longShortRatio);
      }
      
    } catch (err) {
      console.error('Erro ao buscar dados de Futures:', err);
      error = 'Erro ao carregar dados de Futures';
    } finally {
      loading = false;
    }
  }

  function updateCountdown() {
    if (data?.fundingRate?.nextFundingTime) {
      nextFundingCountdown = getTimeUntilNextFunding(data.fundingRate.nextFundingTime);
    }
  }

  onMount(() => {
    fetchData();
    
    // Atualizar dados periodicamente
    intervalId = setInterval(fetchData, updateInterval);
    
    // Atualizar countdown a cada segundo
    const countdownInterval = setInterval(updateCountdown, 1000);
    
    return () => {
      if (intervalId) clearInterval(intervalId);
      clearInterval(countdownInterval);
    };
  });

  onDestroy(() => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });

  function getSentimentColor(sentiment: 'bullish' | 'neutral' | 'bearish'): string {
    switch (sentiment) {
      case 'bullish': return 'text-green-500';
      case 'bearish': return 'text-red-500';
      default: return 'text-gray-400';
    }
  }

  function getSentimentIcon(sentiment: 'bullish' | 'neutral' | 'bearish'): string {
    switch (sentiment) {
      case 'bullish': return '↗';
      case 'bearish': return '↘';
      default: return '→';
    }
  }
</script>

<div class="binance-futures-widget bg-gray-800 rounded-lg p-4 shadow-lg">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-bold text-white flex items-center gap-2">
      <span class="text-yellow-500">📊</span>
      Binance Futures
      <span class="text-xs text-gray-400">({symbol})</span>
    </h3>
    {#if loading}
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
    {/if}
  </div>

  {#if error}
    <div class="text-red-400 text-sm p-3 bg-red-900/20 rounded">
      {error}
    </div>
  {:else if data}
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      <!-- Funding Rate -->
      {#if data.fundingRate}
        <div class="futures-card bg-gray-700/50 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400 uppercase">Funding Rate</span>
            <span class={`text-xs font-bold ${getSentimentColor(fundingSentiment)}`}>
              {getSentimentIcon(fundingSentiment)}
            </span>
          </div>
          <div class="text-xl font-bold mb-1" class:text-green-400={data.fundingRate.fundingRate > 0}
               class:text-red-400={data.fundingRate.fundingRate < 0}
               class:text-gray-300={data.fundingRate.fundingRate === 0}>
            {formatFundingRate(data.fundingRate.fundingRate)}
          </div>
          <div class="text-xs text-gray-400">
            Próximo em: <span class="text-yellow-400 font-semibold">{nextFundingCountdown}</span>
          </div>
          <div class="text-xs text-gray-500 mt-1">
            {formatFundingTime(data.fundingRate.nextFundingTime)}
          </div>
        </div>
      {/if}

      <!-- Open Interest -->
      {#if data.openInterest}
        <div class="futures-card bg-gray-700/50 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400 uppercase">Open Interest</span>
            <span class="text-xs text-gray-500">💼</span>
          </div>
          <div class="text-xl font-bold text-blue-400 mb-1">
            {formatOpenInterest(data.openInterest.openInterestValue)}
          </div>
          <div class="text-xs text-gray-400">
            {data.openInterest.openInterest.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} contratos
          </div>
        </div>
      {/if}

      <!-- Long/Short Ratio (Accounts) -->
      {#if data.longShortRatio}
        <div class="futures-card bg-gray-700/50 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400 uppercase">Long/Short Ratio</span>
            <span class={`text-xs font-bold ${getSentimentColor(lsrSentiment)}`}>
              {getSentimentIcon(lsrSentiment)}
            </span>
          </div>
          <div class="text-xl font-bold text-purple-400 mb-2">
            {data.longShortRatio.longShortRatio.toFixed(3)}
          </div>
          <div class="flex gap-4 text-xs">
            <div class="flex-1">
              <div class="text-gray-400">Long</div>
              <div class="text-green-400 font-semibold">
                {data.longShortRatio.longAccount.toFixed(1)}%
              </div>
            </div>
            <div class="flex-1">
              <div class="text-gray-400">Short</div>
              <div class="text-red-400 font-semibold">
                {data.longShortRatio.shortAccount.toFixed(1)}%
              </div>
            </div>
          </div>
          <div class="text-xs text-gray-500 mt-2">
            Proporção de contas
          </div>
        </div>
      {/if}

      <!-- Top Trader Position Ratio -->
      {#if data.topTraderRatio}
        <div class="futures-card bg-gray-700/50 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400 uppercase">Top Traders</span>
            <span class="text-xs text-gray-500">👑</span>
          </div>
          {#if !isNaN(data.topTraderRatio.longPosition) && !isNaN(data.topTraderRatio.shortPosition)}
            <div class="flex gap-4 text-sm mb-2">
              <div class="flex-1">
                <div class="text-gray-400 text-xs">Long</div>
                <div class="text-green-400 font-bold text-lg">
                  {data.topTraderRatio.longPosition.toFixed(1)}%
                </div>
              </div>
              <div class="flex-1">
                <div class="text-gray-400 text-xs">Short</div>
                <div class="text-red-400 font-bold text-lg">
                  {data.topTraderRatio.shortPosition.toFixed(1)}%
                </div>
              </div>
            </div>
            <div class="text-xs text-gray-500">
              Posições dos principais traders
            </div>
          {:else}
            <div class="text-xs text-yellow-400 italic">
              Dados não disponíveis no momento
            </div>
          {/if}
        </div>
      {:else}
        <div class="futures-card bg-gray-700/50 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400 uppercase">Top Traders</span>
            <span class="text-xs text-gray-500">👑</span>
          </div>
          <div class="text-xs text-yellow-400 italic">
            Dados não disponíveis
          </div>
        </div>
      {/if}

    </div>

    <!-- Legenda e informações -->
    <div class="mt-4 p-3 bg-gray-700/30 rounded text-xs text-gray-400">
      <div class="font-semibold text-gray-300 mb-1">ℹ️ Sobre os Dados:</div>
      <ul class="space-y-1 pl-4">
        <li>• <strong>Funding Rate:</strong> Taxa paga entre traders long/short a cada 8h</li>
        <li>• <strong>Open Interest:</strong> Valor total de contratos em aberto</li>
        <li>• <strong>Long/Short Ratio:</strong> Proporção de contas com posições long vs short</li>
        <li>• <strong>Top Traders:</strong> Sentimento dos principais traders do mercado</li>
      </ul>
      <div class="mt-2 text-gray-500 text-[10px]">
        Atualizado a cada {updateInterval / 1000}s • Fonte: Binance Futures API (gratuita)
      </div>
    </div>

  {:else if loading}
    <div class="text-center py-8 text-gray-400">
      <div class="animate-pulse">Carregando dados de Futures...</div>
    </div>
  {/if}
</div>

<style>
  .futures-card {
    transition: all 0.2s ease-in-out;
  }

  .futures-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  }

  .binance-futures-widget {
    border: 1px solid rgba(251, 191, 36, 0.1);
  }
</style>
