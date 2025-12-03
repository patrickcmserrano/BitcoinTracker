import { writable } from 'svelte/store';
import type { ExchangeName } from '../exchanges/types';

const STORAGE_KEY = 'selected_exchange';

function createExchangeStore() {
    const stored = localStorage.getItem(STORAGE_KEY) as ExchangeName;
    const initial: ExchangeName = stored === 'bitget' ? 'bitget' : 'binance';

    const { subscribe, set, update } = writable<ExchangeName>(initial);

    return {
        subscribe,
        set: (value: ExchangeName) => {
            localStorage.setItem(STORAGE_KEY, value);
            set(value);
        },
        toggle: () => {
            update(current => {
                const next = current === 'binance' ? 'bitget' : 'binance';
                localStorage.setItem(STORAGE_KEY, next);
                return next;
            });
        }
    };
}

export const selectedExchange = createExchangeStore();
