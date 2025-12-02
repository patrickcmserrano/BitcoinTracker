<script lang="ts">
    export let symbol: string;
    export let interval: string;
    export let isMaximized: boolean = false;
</script>

{#if isMaximized}
    <div class="flex items-center gap-2 flex-1">
        <h2
            id="maximized-chart-title"
            class="text-lg font-bold text-primary-700 dark:text-primary-300"
        >
            {symbol} - {interval}
        </h2>
        <span
            class="text-xs bg-primary-100 dark:bg-primary-800 px-1.5 py-0.5 rounded"
            aria-label="Estado do gráfico"
        >
            Max
        </span>
    </div>
{:else}
    <h3 class="text-lg font-semibold text-primary-700 dark:text-primary-300">
        {symbol} - {interval}
    </h3>
{/if}
