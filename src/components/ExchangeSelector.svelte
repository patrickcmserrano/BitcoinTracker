<script lang="ts">
    import { selectedExchange } from "../lib/config/exchangeConfig";

    const exchanges = [
        { id: "binance", name: "Binance" },
        { id: "bitget", name: "Bitget" },
    ];
</script>

<div class="flex items-center space-x-2 bg-gray-800 rounded-lg p-1">
    {#each exchanges as exchange}
        <button
            class="px-3 py-1 text-sm rounded-md transition-colors duration-200 {$selectedExchange ===
            exchange.id
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'}"
            on:click={() =>
                selectedExchange.set(
                    exchange.id as import("../lib/exchanges/types").ExchangeName,
                )}
        >
            {exchange.name}
        </button>
    {/each}
</div>
