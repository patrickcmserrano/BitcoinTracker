<script lang="ts">
    import { selectedExchange } from "../lib/config/exchangeConfig";

    const exchanges = [
        { id: "binance", name: "Binance" },
        { id: "bitget", name: "Bitget" },
    ];
</script>

<div class="flex items-center space-x-1">
    {#each exchanges as exchange}
        <button
            class="px-2 py-1 text-xs rounded transition-colors duration-200 {$selectedExchange ===
            exchange.id
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}"
            on:click={() =>
                selectedExchange.set(
                    exchange.id as import("../lib/exchanges/types").ExchangeName,
                )}
        >
            {exchange.name}
        </button>
    {/each}
</div>
