<script lang="ts">
    export let isLoading: boolean = false;
    export let text: string = "Carregando dados...";
</script>

{#if isLoading}
    <div class="loading-overlay">
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p class="loading-text">{text}</p>
        </div>
    </div>
{/if}

<style>
    .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10;
        backdrop-filter: blur(2px);
        border-radius: 4px;
    }

    :global(.dark) .loading-overlay {
        background: rgba(31, 41, 55, 0.8);
    }

    .loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid rgba(59, 130, 246, 0.3);
        border-radius: 50%;
        border-top-color: #3b82f6;
        animation: spin 1s ease-in-out infinite;
    }

    .loading-text {
        font-size: 0.9rem;
        font-weight: 500;
        color: #4b5563;
    }

    :global(.dark) .loading-text {
        color: #d1d5db;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
</style>
