import { writable, derived, get } from 'svelte/store';
import { onDestroy } from 'svelte';
import type { CryptoConfig, CryptoData } from '../crypto-config';
import { loadCryptoData, updateCryptoData, appState } from '../crypto-store';
import { selectedExchange } from '../config/exchangeConfig';

const UPDATE_INTERVAL = 15000;
const ATR_CHECK_INTERVAL = 300000;

export function useTrackerData(initialConfig: CryptoConfig) {
    const config = writable<CryptoConfig>(initialConfig);

    // Derived stores from global appState
    const data = derived([appState, config], ([$state, $config]) =>
        $state.cryptoData[$config.id] || null
    );

    const loading = derived([appState, config], ([$state, $config]) =>
        $state.loading[$config.id] || false
    );

    const updating = derived([appState, config], ([$state, $config]) =>
        $state.updating[$config.id] || false
    );

    const error = derived([appState, config], ([$state, $config]) =>
        $state.errors[$config.id] || null
    );

    const atrError = derived([appState, config], ([$state, $config]) =>
        $state.atrErrors[$config.id] || null
    );

    // Local state for timers
    const lastATRCheck = writable<Date | null>(null);
    const nextATRCheck = writable<Date | null>(null);
    const lastUpdated = writable<Date | null>(null);
    const nextUpdateTime = writable<Date | null>(null);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let updateTimerId: ReturnType<typeof setInterval> | null = null;

    function shouldUpdateATR(): boolean {
        const lastCheck = get(lastATRCheck);
        if (!lastCheck) return true;

        const now = new Date();
        const timeSinceLastCheck = now.getTime() - lastCheck.getTime();
        return timeSinceLastCheck >= ATR_CHECK_INTERVAL;
    }

    async function fetchData(isInitialLoad = false, forceATRUpdate = false) {
        const currentConfig = get(config);
        const currentExchange = get(selectedExchange);

        const shouldCheckATR = forceATRUpdate || shouldUpdateATR();

        try {
            if (isInitialLoad) {
                await loadCryptoData(currentConfig, { checkATR: shouldCheckATR, forceRefresh: false, exchange: currentExchange });
            } else {
                await updateCryptoData(currentConfig, { checkATR: shouldCheckATR, exchange: currentExchange });
            }
        } catch (err) {
            console.error(`Error fetching data for ${currentConfig.name}:`, err);
        } finally {
            if (shouldCheckATR) {
                const now = new Date();
                lastATRCheck.set(now);
                nextATRCheck.set(new Date(now.getTime() + ATR_CHECK_INTERVAL));
            }

            const now = new Date();
            lastUpdated.set(now);
            nextUpdateTime.set(new Date(now.getTime() + UPDATE_INTERVAL));
        }
    }

    function startAutoUpdate() {
        stopAutoUpdate();
        intervalId = setInterval(() => fetchData(false, false), UPDATE_INTERVAL);

        // Subscribe to exchange changes to reload data
        const unsubscribeExchange = selectedExchange.subscribe(() => {
            fetchData(true, false);
        });

        // Store unsubscribe function to call it on stop/cleanup
        // But wait, startAutoUpdate might be called multiple times.
        // Better to handle exchange subscription outside or manage it carefully.
        // Actually, fetchData gets the current exchange value, so if the interval runs, it uses the new exchange.
        // But we want immediate update on change.
    }

    function stopAutoUpdate() {
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    async function manualUpdate() {
        const isUpdating = get(updating);
        if (isUpdating) return;

        await fetchData(false, true);
        startAutoUpdate(); // Restart interval
    }

    // React to exchange changes
    const unsubscribeExchange = selectedExchange.subscribe(newExchange => {
        // Trigger update when exchange changes
        // We use a timeout to avoid conflict with initial load if it happens simultaneously
        setTimeout(() => {
            const currentConfig = get(config);
            if (currentConfig) {
                fetchData(true, false);
            }
        }, 0);
    });

    function cleanup() {
        stopAutoUpdate();
        unsubscribeExchange();
    }

    return {
        config,
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
        stopAutoUpdate,
        cleanup
    };
}
