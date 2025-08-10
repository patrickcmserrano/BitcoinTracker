import { writable, derived, get } from 'svelte/store';
import type { CryptoConfig, CryptoData } from './crypto-config';
import { getDefaultCrypto, getAllCryptos } from './crypto-config';

// Interface para o estado da aplicação
interface AppState {
  selectedCrypto: CryptoConfig;
  cryptoData: Record<string, CryptoData | null>;
  loading: Record<string, boolean>;
  updating: Record<string, boolean>;
  errors: Record<string, string | null>;
  atrErrors: Record<string, string | null>;
  lastATRCheck: Record<string, Date | null>;
  nextATRCheck: Record<string, Date | null>;
}

// Estado inicial
const initialState: AppState = {
  selectedCrypto: getDefaultCrypto(),
  cryptoData: {},
  loading: {},
  updating: {},
  errors: {},
  atrErrors: {},
  lastATRCheck: {},
  nextATRCheck: {}
};

// Store principal
export const appState = writable(initialState);

// Stores derivados para acesso fácil
export const selectedCrypto = derived(appState, $state => $state.selectedCrypto);
export const currentCryptoData = derived(appState, $state => 
  $state.cryptoData[$state.selectedCrypto.id] || null
);
export const isCurrentCryptoLoading = derived(appState, $state => 
  $state.loading[$state.selectedCrypto.id] || false
);
export const isCurrentCryptoUpdating = derived(appState, $state => 
  $state.updating[$state.selectedCrypto.id] || false
);
export const currentCryptoError = derived(appState, $state => 
  $state.errors[$state.selectedCrypto.id] || null
);
export const currentATRError = derived(appState, $state => 
  $state.atrErrors[$state.selectedCrypto.id] || null
);

// Actions
export const selectCrypto = (crypto: CryptoConfig) => {
  appState.update(state => ({
    ...state,
    selectedCrypto: crypto
  }));
};

// Navigation functions for swipe gestures
export const selectNextCrypto = () => {
  const allCryptos = getAllCryptos();
  const currentIndex = allCryptos.findIndex(crypto => crypto.id === get(selectedCrypto).id);
  const nextIndex = (currentIndex + 1) % allCryptos.length;
  selectCrypto(allCryptos[nextIndex]);
};

export const selectPreviousCrypto = () => {
  const allCryptos = getAllCryptos();
  const currentIndex = allCryptos.findIndex(crypto => crypto.id === get(selectedCrypto).id);
  const previousIndex = currentIndex === 0 ? allCryptos.length - 1 : currentIndex - 1;
  selectCrypto(allCryptos[previousIndex]);
};

export const setCryptoData = (cryptoId: string, data: CryptoData) => {
  appState.update(state => ({
    ...state,
    cryptoData: {
      ...state.cryptoData,
      [cryptoId]: data
    }
  }));
};

export const setCryptoLoading = (cryptoId: string, loading: boolean) => {
  appState.update(state => ({
    ...state,
    loading: {
      ...state.loading,
      [cryptoId]: loading
    }
  }));
};

export const setCryptoUpdating = (cryptoId: string, updating: boolean) => {
  appState.update(state => ({
    ...state,
    updating: {
      ...state.updating,
      [cryptoId]: updating
    }
  }));
};

export const setCryptoError = (cryptoId: string, error: string | null) => {
  appState.update(state => ({
    ...state,
    errors: {
      ...state.errors,
      [cryptoId]: error
    }
  }));
};

export const setATRError = (cryptoId: string, error: string | null) => {
  appState.update(state => ({
    ...state,
    atrErrors: {
      ...state.atrErrors,
      [cryptoId]: error
    }
  }));
};

export const setATRCheckTime = (cryptoId: string, lastCheck: Date | null, nextCheck: Date | null) => {
  appState.update(state => ({
    ...state,
    lastATRCheck: {
      ...state.lastATRCheck,
      [cryptoId]: lastCheck
    },
    nextATRCheck: {
      ...state.nextATRCheck,
      [cryptoId]: nextCheck
    }
  }));
};

// Função para obter dados de um crypto específico
export const getCryptoDataById = (cryptoId: string) => {
  return derived(appState, $state => $state.cryptoData[cryptoId] || null);
};

// Função para obter status de loading de um crypto específico
export const getCryptoLoadingById = (cryptoId: string) => {
  return derived(appState, $state => $state.loading[cryptoId] || false);
};
