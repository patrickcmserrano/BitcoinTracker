<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { ExchangeProviderFactory } from "../lib/exchanges/ExchangeProviderFactory";

    export let symbol: string = "BTCUSDT";

    let binancePrice: number | null = null;
    let bitgetPrice: number | null = null;
    let spread: number | null = null;
    let spreadPercent: number | null = null;
    let intervalId: any;

    async function updatePrices() {
        try {
            const binanceProvider =
                ExchangeProviderFactory.getProvider("binance");
            const bitgetProvider =
                ExchangeProviderFactory.getProvider("bitget");

            const [bPrice, bgPrice] = await Promise.all([
                binanceProvider.getCurrentPrice(symbol).catch(() => null),
                bitgetProvider.getCurrentPrice(symbol).catch(() => null),
            ]);

            binancePrice = bPrice;
            bitgetPrice = bgPrice;

            if (binancePrice && bitgetPrice) {
                spread = Math.abs(binancePrice - bitgetPrice);
                spreadPercent = (spread / binancePrice) * 100;
            }
        } catch (error) {
            console.error("Error updating spread:", error);
        }
    }

    onMount(() => {
        updatePrices();
        intervalId = setInterval(updatePrices, 5000); // Update every 5 seconds
    });

    onDestroy(() => {
        if (intervalId) clearInterval(intervalId);
    });
</script>

<div
    class="bg-gray-800 rounded-lg p-3 text-xs flex flex-col space-y-1 min-w-[150px]"
>
    <div class="text-gray-400 font-medium border-b border-gray-700 pb-1 mb-1">
        Arbitrage Monitor
    </div>

    <div class="flex justify-between">
        <span class="text-gray-500">Binance:</span>
        <span class="font-mono text-gray-200"
            >{binancePrice ? binancePrice.toFixed(2) : "---"}</span
        >
    </div>

    <div class="flex justify-between">
        <span class="text-gray-500">Bitget:</span>
        <span class="font-mono text-gray-200"
            >{bitgetPrice ? bitgetPrice.toFixed(2) : "---"}</span
        >
    </div>

    <div class="flex justify-between pt-1 border-t border-gray-700 mt-1">
        <span class="text-gray-400">Spread:</span>
        <div class="text-right">
            <div
                class="font-mono {spread && spread > 10
                    ? 'text-yellow-400'
                    : 'text-green-400'}"
            >
                {spread ? spread.toFixed(2) : "---"}
            </div>
            <div class="text-[10px] text-gray-500">
                {spreadPercent ? spreadPercent.toFixed(4) : "---"}%
            </div>
        </div>
    </div>
</div>
