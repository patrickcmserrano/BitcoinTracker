# Arquitetura para Suporte Multi-Criptomoedas: Bitcoin, Ethereum e Solana

## Visão Geral

Este documento define a arquitetura para expandir nossa aplicação Bitcoin Tracker para suportar **Ethereum (ETH)** e **Solana (SOL)**, mantendo escalabilidade e organização do código para futuras expansões.

## Análise das APIs Disponíveis

### Binance API
A API da Binance já suporta múltiplas criptomoedas com os mesmos endpoints:

#### Símbolos Disponíveis:
- **Bitcoin**: `BTCUSDT`
- **Ethereum**: `ETHUSDT`
- **Solana**: `SOLUSDT`

#### Endpoints Utilizados:
```
/api/v3/ticker/24hr?symbol={SYMBOL}
/api/v3/klines?symbol={SYMBOL}&interval={INTERVAL}&limit={LIMIT}
```

### TAAPI.IO
A TAAPI.IO também suporta múltiplas criptomoedas na Binance:

#### Símbolos Suportados:
- **Bitcoin**: `BTC/USDT`
- **Ethereum**: `ETH/USDT`
- **Solana**: `SOL/USDT`

#### Endpoint ATR:
```
https://api.taapi.io/atr?secret={SECRET}&exchange=binance&symbol={SYMBOL}&interval=1d&period=14
```

## Arquitetura Proposta

### 1. Estrutura de Dados Genérica

#### Interface Base para Criptomoedas:
```typescript
interface CryptoConfig {
  id: string;                    // 'bitcoin', 'ethereum', 'solana'
  name: string;                  // 'Bitcoin', 'Ethereum', 'Solana'
  symbol: string;                // 'BTC', 'ETH', 'SOL'
  binanceSymbol: string;         // 'BTCUSDT', 'ETHUSDT', 'SOLUSDT'
  taapiSymbol: string;          // 'BTC/USDT', 'ETH/USDT', 'SOL/USDT'
  icon: string;                  // '₿', 'Ξ', '◎'
  color: string;                 // Cor primária para UI
  precision: number;             // Casas decimais para preço
}

interface CryptoData {
  config: CryptoConfig;
  price: number;
  volume24h: number;
  percentChange: number;
  volumePerHour: number;
  
  // Dados por timeframe
  amplitude10m: number;
  highPrice10m: number;
  lowPrice10m: number;
  volume10m: number;
  percentChange10m: number;
  
  amplitude1h: number;
  highPrice1h: number;
  lowPrice1h: number;
  volume1h: number;
  percentChange1h: number;
  
  amplitude4h: number;
  highPrice4h: number;
  lowPrice4h: number;
  volume4h: number;
  percentChange4h: number;
  
  amplitude1d: number;
  highPrice1d: number;
  lowPrice1d: number;
  volume1d: number;
  percentChange1d: number;
  
  amplitude1w: number;
  highPrice1w: number;
  lowPrice1w: number;
  volume1w: number;
  percentChange1w: number;
  
  lastUpdate: Date;
  recentPrices: number[];
  
  // Indicadores TAAPI
  atr14Daily?: number;
  atrLastUpdated?: Date;
}
```

### 2. Configuração das Criptomoedas

#### Arquivo: `src/lib/crypto-config.ts`
```typescript
export const CRYPTO_CONFIGS: Record<string, CryptoConfig> = {
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    symbol: 'BTC',
    binanceSymbol: 'BTCUSDT',
    taapiSymbol: 'BTC/USDT',
    icon: '₿',
    color: '#f7931a',
    precision: 0
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    symbol: 'ETH',
    binanceSymbol: 'ETHUSDT',
    taapiSymbol: 'ETH/USDT',
    icon: 'Ξ',
    color: '#627eea',
    precision: 0
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    symbol: 'SOL',
    binanceSymbol: 'SOLUSDT',
    taapiSymbol: 'SOL/USDT',
    icon: '◎',
    color: '#9945ff',
    precision: 2
  }
};

export const getDefaultCrypto = () => CRYPTO_CONFIGS.bitcoin;
export const getCryptoById = (id: string) => CRYPTO_CONFIGS[id];
export const getAllCryptos = () => Object.values(CRYPTO_CONFIGS);
```

### 3. API Genérica

#### Arquivo: `src/lib/crypto-api.ts`
```typescript
export const getCryptoData = async (
  config: CryptoConfig, 
  options: { checkATR?: boolean } = {}
): Promise<CryptoData> => {
  const { checkATR = true } = options;
  
  try {
    // Obter dados de 24 horas
    const ticker24hrResponse = await axios.get<Ticker24hr>(
      `${BASE_URL}/api/v3/ticker/24hr?symbol=${config.binanceSymbol}`
    );
    
    // Obter dados de candlesticks (mesmo código atual)
    const [klines10m, klines1h, klines4h, klines1d, klines1w] = await Promise.all([
      fetchKlines(config.binanceSymbol, '1m', 10),
      fetchKlines(config.binanceSymbol, '1m', 60),
      fetchKlines(config.binanceSymbol, '1h', 4),
      fetchKlines(config.binanceSymbol, '1h', 24),
      fetchKlines(config.binanceSymbol, '1d', 7)
    ]);
    
    // Processar dados (mesmo algoritmo atual)
    const processedData = processKlineData(ticker24hrResponse.data, klines10m, klines1h, klines4h, klines1d, klines1w);
    
    // Buscar ATR se solicitado
    const atrData = checkATR ? await getATRData(config) : null;
    
    return {
      config,
      ...processedData,
      ...(atrData && {
        atr14Daily: atrData.atr14Daily,
        atrLastUpdated: atrData.atrLastUpdated
      })
    };
  } catch (error) {
    console.error(`Erro ao obter dados de ${config.name}:`, error);
    throw error;
  }
};

export const getATRData = async (config: CryptoConfig): Promise<{ atr14Daily: number; atrLastUpdated: Date } | null> => {
  try {
    if (!isTaapiConfigured()) {
      console.log('TAAPI: Service not configured, skipping ATR fetch');
      return null;
    }

    const taapiService = getTaapiService();
    const atrResponse = await taapiService.getATR({
      symbol: config.taapiSymbol,
      interval: '1d',
      exchange: 'binance',
      period: 14
    });

    return {
      atr14Daily: atrResponse.value,
      atrLastUpdated: new Date()
    };
  } catch (error) {
    console.error(`Error fetching ATR data for ${config.name}:`, error);
    return null;
  }
};
```

### 4. Interface do Usuário

#### A. Seletor de Criptomoedas
Novo componente: `src/components/CryptoSelector.svelte`
```svelte
<script lang="ts">
  import { getAllCryptos } from '../lib/crypto-config';
  import type { CryptoConfig } from '../lib/crypto-config';
  
  export let selectedCrypto: CryptoConfig;
  export let onSelect: (crypto: CryptoConfig) => void;
  
  const cryptos = getAllCryptos();
</script>

<div class="flex space-x-2 justify-center mb-4">
  {#each cryptos as crypto}
    <button 
      class="crypto-btn {selectedCrypto.id === crypto.id ? 'active' : ''}"
      style="--crypto-color: {crypto.color}"
      on:click={() => onSelect(crypto)}
    >
      <span class="crypto-icon">{crypto.icon}</span>
      <span class="crypto-name">{crypto.symbol}</span>
    </button>
  {/each}
</div>
```

#### B. Tracker Genérico
Refatorar `BitcoinTracker.svelte` para `CryptoTracker.svelte`:
```svelte
<script lang="ts">
  import type { CryptoConfig, CryptoData } from '../lib/crypto-config';
  import { getCryptoData } from '../lib/crypto-api';
  
  export let config: CryptoConfig;
  export let data: CryptoData | null = null;
  
  // Resto da lógica igual, mas usando config.name, config.icon, etc.
</script>

<div class="crypto-tracker" style="--crypto-color: {config.color}">
  <div class="text-center mb-3">
    <h1 class="h3 font-bold" style="color: var(--crypto-color)">
      {$_('crypto.tracker.title', { name: config.name })}
    </h1>
    <!-- Resto do template usando config.icon e dados genéricos -->
  </div>
</div>
```

### 5. Estado da Aplicação

#### Context/Store para Estado Global
```typescript
// src/lib/crypto-store.ts
import { writable } from 'svelte/store';
import type { CryptoConfig, CryptoData } from './crypto-config';
import { getDefaultCrypto } from './crypto-config';

interface AppState {
  selectedCrypto: CryptoConfig;
  cryptoData: Record<string, CryptoData | null>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

const initialState: AppState = {
  selectedCrypto: getDefaultCrypto(),
  cryptoData: {},
  loading: {},
  errors: {}
};

export const appState = writable(initialState);

// Actions
export const selectCrypto = (crypto: CryptoConfig) => {
  appState.update(state => ({
    ...state,
    selectedCrypto: crypto
  }));
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
```

### 6. Internacionalização

#### Atualizações nos Arquivos de Tradução
```typescript
// src/lib/locales/pt.ts
export default {
  // Genérico
  "crypto.tracker.title": "Rastreador de Preço - {name}",
  "crypto.selector.title": "Selecione a Criptomoeda",
  
  // Bitcoin específico
  "crypto.bitcoin.name": "Bitcoin",
  "crypto.bitcoin.description": "A primeira criptomoeda descentralizada",
  
  // Ethereum específico
  "crypto.ethereum.name": "Ethereum",
  "crypto.ethereum.description": "Plataforma para contratos inteligentes",
  
  // Solana específico
  "crypto.solana.name": "Solana",
  "crypto.solana.description": "Blockchain de alta performance",
  
  // Mantém todas as outras chaves existentes...
};
```

### 7. Estrutura de Arquivos Atualizada

```
src/
├── components/
│   ├── CryptoSelector.svelte          # NOVO: Seletor de criptomoedas
│   ├── CryptoTracker.svelte           # REFATORADO: de BitcoinTracker.svelte
│   ├── CandleChart.svelte             # Mantido (já genérico)
│   ├── ATRIndicator.svelte            # Mantido (já genérico)
│   ├── TaapiIndicators.svelte         # ATUALIZADO: suporte multi-crypto
│   ├── LanguageSelector.svelte        # Mantido
│   └── ThemeToggle.svelte             # Mantido
├── lib/
│   ├── crypto-config.ts               # NOVO: Configurações das criptos
│   ├── crypto-api.ts                  # NOVO: API genérica
│   ├── crypto-store.ts                # NOVO: Estado global
│   ├── api.ts                         # DEPRECIADO: mover lógica para crypto-api.ts
│   ├── taapi-service.ts               # MANTIDO: já genérico
│   ├── config.ts                      # Mantido
│   └── i18n.ts                        # ATUALIZADO: novas traduções
└── App.svelte                         # ATUALIZADO: usar novos componentes
```

### 8. Migração Gradual

#### Fase 1: Preparação
1. Criar novos arquivos de configuração e API genérica
2. Manter `BitcoinTracker.svelte` funcionando
3. Adicionar testes para novas funcionalidades

#### Fase 2: Refatoração
1. Migrar `BitcoinTracker.svelte` para `CryptoTracker.svelte`
2. Implementar `CryptoSelector.svelte`
3. Atualizar `App.svelte` para usar novo sistema

#### Fase 3: Expansão
1. Adicionar suporte completo para Ethereum
2. Adicionar suporte completo para Solana
3. Atualizar testes e documentação

#### Fase 4: Otimização
1. Implementar cache por criptomoeda
2. Otimizar atualizações automáticas
3. Melhorar UX com transições suaves

### 9. Considerações de Performance

#### Cache por Criptomoeda
```typescript
interface CryptoCache {
  [cryptoId: string]: {
    data: CryptoData;
    lastUpdate: Date;
    atrLastCheck: Date;
  }
}
```

#### Atualização Inteligente
- Atualizar apenas a criptomoeda ativa com mais frequência (15s)
- Atualizar criptomoedas inativas com menor frequência (60s)
- Cache de ATR compartilhado por criptomoeda

#### Otimização de API
- Reutilizar serviço TAAPI.IO para todas as criptomoedas
- Rate limiting global
- Fallback gracioso quando APIs falham

### 10. Vantagens da Arquitetura

#### Escalabilidade
- Fácil adição de novas criptomoedas
- Configuração centralizada
- API genérica reutilizável

#### Manutenibilidade
- Separação clara de responsabilidades
- Código reutilizável
- Testes unitários por funcionalidade

#### Performance
- Cache inteligente
- Atualizações otimizadas
- Carregamento progressivo

#### Experiência do Usuário
- Interface consistente
- Transições suaves entre criptomoedas
- Preservação de configurações por crypto

### 11. Próximos Passos Sugeridos

1. **Implementar configuração de criptomoedas** (`crypto-config.ts`)
2. **Criar API genérica** (`crypto-api.ts`)
3. **Desenvolver seletor de criptomoedas** (`CryptoSelector.svelte`)
4. **Refatorar tracker principal** (BitcoinTracker → CryptoTracker)
5. **Atualizar internacionalização** com termos genéricos
6. **Implementar cache por criptomoeda**
7. **Adicionar testes para novas funcionalidades**
8. **Documentar novas APIs e componentes**

Esta arquitetura mantém a compatibilidade com o código atual enquanto prepara a base para um sistema escalável que pode facilmente suportar dezenas de criptomoedas no futuro.
