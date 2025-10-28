# 🗺️ Mapeamento Completo de Dados do Frontend

## 📋 Objetivo
Este documento mapeia **TODOS** os dados que o frontend atual obtém, calcula e exibe, servindo como referência para a migração ao novo backend.

---

## 🔌 Mapeamento de Chamadas de API

### 1. Arquivo: `src/lib/api.ts`

#### Função: `getBitcoinData()`
**API Externa**: Binance Spot  
**Frequência**: A cada 15 segundos  
**Criptos**: Apenas Bitcoin (legacy, mantido para compatibilidade)

**Chamadas**:
```typescript
// 1. Ticker 24h
GET https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT

Dados extraídos:
- lastPrice (preço atual)
- quoteVolume (volume 24h em USDT)
- priceChangePercent (variação % 24h)
- highPrice (máxima 24h)
- lowPrice (mínima 24h)
```

```typescript
// 2. Klines - 10 minutos (10x candles de 1 minuto)
GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=10

Usado para calcular:
- amplitude10m (highPrice10m - lowPrice10m)
- volume10m (soma de todos os volumes)
- percentChange10m (variação % no período)
- recentPrices (últimos 10 preços de fechamento)
```

```typescript
// 3. Klines - 1 hora (60x candles de 1 minuto)
GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60

Usado para calcular:
- amplitude1h, highPrice1h, lowPrice1h
- volume1h, percentChange1h
```

```typescript
// 4. Klines - 4 horas (4x candles de 1 hora)
GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=4

Usado para calcular:
- amplitude4h, highPrice4h, lowPrice4h
- volume4h, percentChange4h
```

```typescript
// 5. Klines - 1 dia (24x candles de 1 hora)
GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24

Usado para calcular:
- amplitude1d, highPrice1d, lowPrice1d
- volume1d, percentChange1d
```

```typescript
// 6. Klines - 1 semana (7x candles de 1 dia)
GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1d&limit=7

Usado para calcular:
- amplitude1w, highPrice1w, lowPrice1w
- volume1w, percentChange1w
```

**Cálculos Locais**:
```typescript
// Para cada timeframe:
const calculateAmplitude = (klines) => {
  high = max(klines.map(k => k.high))
  low = min(klines.map(k => k.low))
  amplitude = high - low
}

const calculateVolume = (klines) => {
  return sum(klines.map(k => k.quoteAssetVolume))
}

const calculatePercentChange = (klines) => {
  firstPrice = klines[0].open
  lastPrice = klines[last].close
  return ((lastPrice - firstPrice) / firstPrice) * 100
}
```

#### Função: `getATRData()`
**API Externa**: TAAPI.IO (Paga)  
**Frequência**: 1x por dia (cache até próximo dia UTC)  
**Custo**: $9.99/mês

```typescript
GET https://api.taapi.io/atr?secret=KEY&exchange=binance&symbol=BTC/USDT&interval=1d&period=14

Retorna:
- value: ATR14 (Average True Range de 14 períodos)
- timestamp: momento do cálculo

Cache Strategy:
- TTL dinâmico: até próximo UTC midnight
- Mínimo: 1 hora
- Fallback: retorna cache expirado se API falhar
```

---

### 2. Arquivo: `src/lib/crypto-api.ts`

#### Função: `getCryptoData(config: CryptoConfig)`
**API Externa**: Binance Spot  
**Frequência**: A cada 15 segundos  
**Criptos**: BTC, ETH, SOL, XRP, PAXG, TRX, USDT/BRL

**Mesma lógica de `getBitcoinData()` mas generalizada para qualquer cripto**

Configurações por cripto (`src/lib/crypto-config.ts`):
```typescript
{
  bitcoin: {
    binanceSymbol: 'BTCUSDT',
    taapiSymbol: 'BTC/USDT',
    precision: 0
  },
  ethereum: {
    binanceSymbol: 'ETHUSDT',
    taapiSymbol: 'ETH/USDT',
    precision: 0
  },
  solana: {
    binanceSymbol: 'SOLUSDT',
    taapiSymbol: 'SOL/USDT',
    precision: 2
  },
  // ... outros
}
```

---

### 3. Arquivo: `src/lib/binance-futures-api.ts`

#### Função: `getFundingRate(symbol)`
**API Externa**: Binance Futures  
**Frequência**: A cada 1 minuto  
**Cache TTL**: 60 segundos

```typescript
GET https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT

Retorna:
- lastFundingRate (taxa atual, ex: 0.0001 = 0.01%)
- fundingTime (timestamp do último funding)
- nextFundingTime (próximo funding)

Cálculos:
- fundingRatePercent = fundingRate * 100
- sentiment = determineSentiment(fundingRate)
  - > 0.001 = bullish
  - < -0.001 = bearish
  - else = neutral
```

#### Função: `getOpenInterest(symbol)`
**API Externa**: Binance Futures  
**Frequência**: A cada 1 minuto

```typescript
// Busca paralela:
GET https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT
GET https://fapi.binance.com/fapi/v1/ticker/price?symbol=BTCUSDT

Retorna:
- openInterest (quantidade em contratos)
- openInterestValue = openInterest * currentPrice

Formatação:
- formatOpenInterest(value)
  - > 1B = "$X.XXB"
  - > 1M = "$X.XXM"
  - > 1K = "$X.XXK"
```

#### Função: `getLongShortAccountRatio(symbol)`
**API Externa**: Binance Futures  
**Frequência**: A cada 1 minuto

```typescript
GET https://fapi.binance.com/futures/data/globalLongShortAccountRatio
  ?symbol=BTCUSDT&period=1h&limit=1

Retorna:
- longAccount (% de contas em long, ex: 0.523 = 52.3%)
- shortAccount (% de contas em short)
- timestamp

Cálculos:
- longShortRatio = longAccount / shortAccount
- sentiment = determineLSRSentiment(ratio)
  - > 1.2 = bullish
  - < 0.8 = bearish
  - else = neutral
```

#### Função: `getTopTraderPositionRatio(symbol)`
**API Externa**: Binance Futures  
**Frequência**: A cada 1 minuto

```typescript
GET https://fapi.binance.com/futures/data/topLongShortPositionRatio
  ?symbol=BTCUSDT&period=1h&limit=1

Retorna:
- longPosition (% de posição long dos top traders)
- shortPosition (% de posição short)
- timestamp
```

#### Função: `getBinanceFuturesData(symbol)`
**Agrega todas as funções acima em uma única resposta**

```typescript
Response completa:
{
  fundingRate: {
    rate: 0.0001,
    ratePercent: 0.01,
    fundingTime: timestamp,
    nextFundingTime: timestamp,
    sentiment: "bullish"
  },
  openInterest: {
    openInterest: 535000,
    openInterestValue: 35500000000
  },
  longShortRatio: {
    longAccount: 52.3,
    shortAccount: 47.7,
    longShortRatio: 1.096
  },
  topTraderRatio: {
    longPosition: 48.5,
    shortPosition: 51.5
  }
}
```

---

### 4. Arquivo: `src/lib/market-indicators.ts`

#### Função: `getFearGreedIndex()`
**API Externa**: Alternative.me (Gratuita)  
**Frequência**: A cada 5 minutos  
**Cache TTL**: 300 segundos

```typescript
GET https://api.alternative.me/fng/?limit=2

Retorna (últimos 2 dias):
[
  {
    value: "65",
    value_classification: "Greed",
    timestamp: "1234567890",
    time_until_update: "8 hours"
  },
  {
    value: "62",
    value_classification: "Greed",
    timestamp: "1234481490"
  }
]

Processamento:
- value atual
- previousValue (dia anterior)
- change = value - previousValue
- changePercentage = (change / previousValue) * 100
- classification = classifyFearGreed(value)
  - 0-25: Extreme Fear
  - 26-45: Fear
  - 46-55: Neutral
  - 56-75: Greed
  - 76-100: Extreme Greed
- emoji = getEmoji(classification)
```

#### Função: `getBTCDominance()`
**API Externa**: CoinGecko (Gratuita)  
**Frequência**: A cada 5 minutos  
**Rate Limit**: 10-50 req/min

```typescript
GET https://api.coingecko.com/api/v3/global

Retorna:
{
  data: {
    market_cap_percentage: {
      btc: 54.2,
      eth: 17.8
    },
    total_market_cap: {
      usd: 2500000000000
    },
    total_volume: {
      usd: 125000000000
    },
    active_cryptocurrencies: 12000,
    markets: 850,
    market_cap_change_percentage_24h_usd: 2.5
  }
}

Processamento:
- btcDominance
- ethDominance
- totalMarketCap
- total24hVolume
- activeCryptocurrencies
- markets
- marketCapChange24h
```

#### Função: `getCryptoRanking(symbols[])`
**API Externa**: CoinGecko  
**Frequência**: Sob demanda  
**Uso**: Não usado atualmente no frontend

```typescript
GET https://api.coingecko.com/api/v3/coins/markets
  ?vs_currency=usd&ids=bitcoin,ethereum,solana&order=market_cap_desc

Retorna ranking e dados detalhados de múltiplas criptos
```

#### Função: `getMarketIndicators()`
**Agrega Fear & Greed + BTC Dominance**

```typescript
Response:
{
  fearGreed: { ... },
  btcDominance: { ... },
  timestamp: Date.now()
}
```

---

### 5. Arquivo: `src/lib/technical-indicators.ts`

#### Função: `calculateTechnicalIndicators(ohlcvData)`
**Processamento**: 100% Local (biblioteca: technicalindicators)  
**Não usa APIs externas**

**Input**:
```typescript
{
  open: number[],
  high: number[],
  low: number[],
  close: number[],
  volume: number[]
}
```

**Indicadores Calculados**:

1. **MACD (Moving Average Convergence Divergence)**
```typescript
MACD.calculate({
  values: close,
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9
})

Retorna:
- MACD (linha MACD)
- signal (linha de sinal)
- histogram (diferença MACD - signal)

Interpretação:
- MACD > signal = bullish
- MACD < signal = bearish
- Cruzamentos = sinais de compra/venda
```

2. **RSI (Relative Strength Index)**
```typescript
RSI.calculate({
  values: close,
  period: 14
})

Retorna: valor entre 0-100

Interpretação:
- > 70 = Sobrecomprado
- < 30 = Sobrevendido
- > 50 = Bullish
- < 50 = Bearish
```

3. **ATR (Average True Range)**
```typescript
ATR.calculate({
  high: high,
  low: low,
  close: close,
  period: 14
})

Interpretação de volatilidade:
- atrPercent = (atr / currentPrice) * 100
- < 1% = Baixa Volatilidade
- < 2% = Volatilidade Normal
- < 3% = Alta Volatilidade
- >= 3% = Volatilidade Extrema
```

4. **SMA (Simple Moving Average)**
```typescript
SMA20 = SMA.calculate({ values: close, period: 20 })
SMA50 = SMA.calculate({ values: close, period: 50 })

Interpretação:
- Preço > SMA20 = tendência de curto prazo bullish
- Preço > SMA50 = tendência de longo prazo bullish
- SMA20 > SMA50 = Golden Cross (bullish)
- SMA20 < SMA50 = Death Cross (bearish)
```

5. **EMA (Exponential Moving Average)**
```typescript
EMA9 = EMA.calculate({ values: close, period: 9 })
EMA21 = EMA.calculate({ values: close, period: 21 })

Mais responsiva que SMA, usada para entradas/saídas rápidas
```

6. **Estocástico**
```typescript
Stochastic.calculate({
  high: high,
  low: low,
  close: close,
  period: 14,
  signalPeriod: 3
})

Retorna:
- k (linha rápida)
- d (linha lenta)

Interpretação:
- k > 80 e d > 80 = Sobrecomprado
- k < 20 e d < 20 = Sobrevendido
- k cruza acima de d = Bullish
- k cruza abaixo de d = Bearish
```

7. **Bandas de Bollinger**
```typescript
BollingerBands.calculate({
  values: close,
  period: 20,
  stdDev: 2
})

Retorna:
- upper (banda superior)
- middle (SMA 20)
- lower (banda inferior)

Interpretação:
- Preço próximo a upper = sobrecomprado
- Preço próximo a lower = sobrevendido
- Estreitamento das bandas = baixa volatilidade (preparação para movimento)
- Alargamento das bandas = alta volatilidade
```

8. **Trend Analysis**
```typescript
determineTrend(currentPrice, sma20, sma50, macd, rsi)

Algoritmo:
- bullishSignals = 0, bearishSignals = 0
- Se preço > SMA20: bullishSignals++
- Se preço > SMA50: bullishSignals++
- Se MACD > signal: bullishSignals++
- Se RSI > 50: bullishSignals++

Retorna:
- "bullish" se bullishSignals > bearishSignals
- "bearish" se bearishSignals > bullishSignals
- "neutral" se empate
```

#### Função: `calculateIndicatorSeries(ohlcvData)`
**Retorna séries completas para plotagem em gráficos**

```typescript
Response:
{
  sma20: [65000, 65100, ...],
  sma50: [64000, 64100, ...],
  ema9: [67000, 67100, ...],
  ema21: [66800, 66900, ...],
  bollingerUpper: [68000, ...],
  bollingerMiddle: [67000, ...],
  bollingerLower: [66000, ...],
  macdLine: [123, 125, ...],
  macdSignal: [120, 122, ...],
  macdHistogram: [3, 3, ...]
}
```

---

### 6. Arquivo: `src/lib/coinglass-api.ts`

**STATUS**: ❌ NÃO USADO (Requer API Key paga)

Implementado mas desabilitado. Funções disponíveis:
- `getLongShortRatio()` - LSR agregado de múltiplas exchanges
- `getOpenInterest()` - OI agregado
- `getLiquidations()` - Dados de liquidação 24h
- `getLiquidationHeatmap()` - Heatmap de níveis de liquidação
- `getMockCoinglassData()` - Dados mock para desenvolvimento

---

### 7. Arquivo: `src/lib/taapi-service.ts`

#### Classe: `TaapiService`
**API Externa**: TAAPI.IO  
**Plano**: $9.99/mês (10 req/min)  
**Cache Strategy**: Inteligente (até próximo dia UTC)

**Método Principal**:
```typescript
getATR({ symbol, interval, exchange, period })

URL: https://api.taapi.io/atr
Query Params:
- secret: API key
- exchange: binance
- symbol: BTC/USDT
- interval: 1d
- period: 14

Cache:
- TTL dinâmico: calcula tempo até próximo UTC midnight
- Mínimo: 1 hora
- Fallback: retorna cache expirado se API falhar
- Auto cleanup de cache expirado

Rate Limiting:
- 2 segundos entre requisições (maxRequests)
- Log de todas as requisições
```

---

### 8. Arquivo: `src/lib/cache-service.ts`

#### Classe: `CacheService`
**Cache em memória (Map) com TTL e rate limiting**

**Rate Limits Configurados**:
```typescript
{
  binance: { maxRequests: 20, windowMs: 60000 },
  taapi: { maxRequests: 10, windowMs: 60000 },
  coinglass: { maxRequests: 15, windowMs: 60000 },
  default: { maxRequests: 30, windowMs: 60000 }
}
```

**Estratégias**:
```typescript
1. Cache Hit: Retorna dados válidos imediatamente
2. Cache Miss: Executa fetcher e cacheia resultado
3. Rate Limit: Retorna stale cache se limite atingido
4. Error Fallback: Retorna stale cache em caso de erro
5. Auto Cleanup: Remove cache expirado a cada 1 minuto
```

---

## 📊 Componentes Svelte e Consumo de Dados

### 1. `BitcoinTracker.svelte` (Legacy)
**Dados consumidos**:
- `getBitcoinData()` - API
- Atualização automática a cada 15s
- Exibição de dados de múltiplos timeframes

### 2. `CryptoTracker.svelte`
**Dados consumidos**:
- `getCryptoData(config)` - API
- Crypto Store (store reativo)
- Atualização automática a cada 15s
- Exibição de ATR14

### 3. `CandleChart.svelte`
**Dados consumidos**:
- `getBinanceKlines()` - direto da Binance
- Renderiza gráfico usando lightweight-charts
- Suporta múltiplos intervals (1m, 5m, 15m, 1h, 4h, 1d, 1w)

**Chamada**:
```typescript
GET https://api.binance.com/api/v3/klines
  ?symbol=BTCUSDT&interval=1h&limit=200

Mapeia para formato lightweight-charts:
{
  time: timestamp,
  open: float,
  high: float,
  low: float,
  close: float
}
```

### 4. `TechnicalIndicators.svelte`
**Dados consumidos**:
- `getBinanceKlines()` - busca 200 candles
- `calculateTechnicalIndicators()` - processa localmente
- Atualização automática a cada 5 minutos

**Exibe**:
- MACD, RSI, ATR, SMA20/50, EMA9/21
- Estocástico, Bollinger Bands
- Trend analysis com emoji

### 5. `TripleScreenAnalysis.svelte`
**Dados consumidos**:
- `getBinanceKlines()` para 3 timeframes:
  - Screen 1: 1 semana (200 candles de 1d)
  - Screen 2: 1 dia (200 candles de 1h)
  - Screen 3: 4 horas (200 candles de 15m)
- `calculateTechnicalIndicators()` para cada screen
- Atualização automática a cada 5 minutos

**Lógica de Recomendação**:
```typescript
Análise em 3 níveis (Elder's Triple Screen):

Screen 1 (Trend Long-term):
- EMA 26 weeks
- MACD Histogram
- Determina tendência geral

Screen 2 (Trend Intermediate):
- Stochastic
- Identifica correções na tendência

Screen 3 (Entry/Exit):
- MACD crossover
- Ponto exato de entrada/saída

Recomendação Final:
- BUY: Todos os screens alinhados bullish
- SELL: Todos os screens alinhados bearish
- HOLD: Sinais mistos ou neutros
```

### 6. `MarketIndicators.svelte`
**Dados consumidos**:
- `getMarketIndicators()` - agrega F&G + BTC Dom
- Atualização automática a cada 5 minutos

**Exibe**:
- Fear & Greed Index com emoji e variação
- BTC Dominance %
- Total Market Cap
- Volume 24h
- Active Cryptocurrencies

### 7. `BinanceFuturesWidget.svelte`
**Dados consumidos**:
- `getBinanceFuturesData(symbol)` - API
- Atualização automática a cada 1 minuto

**Exibe**:
- Funding Rate (% e sentimento)
- Open Interest (valor formatado)
- LSR Accounts (long/short %)
- LSR Top Traders (long/short %)
- Tempo até próximo funding

### 8. `ApiStatusWidget.svelte`
**Dados consumidos**:
- Health checks diretos para cada API:
  - Binance Spot: `/api/v3/ping`
  - Binance Futures: `/fapi/v1/ping`
  - Alternative.me: `/fng/?limit=1`
  - CoinGecko: `/simple/price`

**Exibe**:
- Status (online/offline/erro)
- Latência (ms)
- Última atualização

---

## 🔄 Fluxo Completo de Dados (Exemplo: Bitcoin)

```mermaid
Frontend (CryptoTracker.svelte)
    ↓
getCryptoData(CRYPTO_CONFIGS.bitcoin)
    ↓
Cache Service (check cache)
    ↓ (cache miss)
Binance Spot API (parallel requests)
    ├─ /api/v3/ticker/24hr?symbol=BTCUSDT
    ├─ /api/v3/klines?symbol=BTCUSDT&interval=1m&limit=10
    ├─ /api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60
    ├─ /api/v3/klines?symbol=BTCUSDT&interval=1h&limit=4
    ├─ /api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24
    └─ /api/v3/klines?symbol=BTCUSDT&interval=1d&limit=7
    ↓
processKlineData() - cálculos locais
    ├─ calculateAmplitude()
    ├─ calculateVolume()
    └─ calculatePercentChange()
    ↓
getATRData(config) - se checkATR=true
    ↓
TAAPI.IO API
    └─ /atr?symbol=BTC/USDT&interval=1d&period=14
    ↓
Merge all data
    ↓
Cache result (TTL: 15s)
    ↓
Return to component
    ↓
Display in UI
```

---

## 📝 Dados Completos por Endpoint (Resumo)

### Crypto Data (por símbolo)
```json
{
  "config": { "symbol", "name", "icon", "color", "precision" },
  "price": 67000.00,
  "volume24h": 25000000000.00,
  "percentChange": 2.5,
  "volumePerHour": 1041666666.67,
  
  "amplitude10m": 150.00,
  "highPrice10m": 67100.00,
  "lowPrice10m": 66950.00,
  "volume10m": 25000000.00,
  "percentChange10m": 0.15,
  
  "amplitude1h": 500.00,
  "highPrice1h": 67300.00,
  "lowPrice1h": 66800.00,
  "volume1h": 150000000.00,
  "percentChange1h": 0.75,
  
  "amplitude4h": 1200.00,
  "highPrice4h": 67800.00,
  "lowPrice4h": 66600.00,
  "volume4h": 600000000.00,
  "percentChange4h": 1.80,
  
  "amplitude1d": 2500.00,
  "highPrice1d": 68500.00,
  "lowPrice1d": 66000.00,
  "volume1d": 3600000000.00,
  "percentChange1d": 3.79,
  
  "amplitude1w": 5000.00,
  "highPrice1w": 70000.00,
  "lowPrice1w": 65000.00,
  "volume1w": 25200000000.00,
  "percentChange1w": 7.69,
  
  "lastUpdate": "2025-10-28T15:30:00.000Z",
  "recentPrices": [66950, 67000, 67050, 67100, 67075, 67025, 67000, 66980, 67020, 67000],
  
  "atr14Daily": 1234.56,
  "atrLastUpdated": "2025-10-28T00:00:00.000Z"
}
```

### Futures Data (por símbolo)
```json
{
  "fundingRate": {
    "rate": 0.0001,
    "ratePercent": 0.01,
    "fundingTime": 1698508800000,
    "nextFundingTime": 1698537600000,
    "sentiment": "bullish"
  },
  "openInterest": {
    "openInterest": 535000,
    "openInterestValue": 35850000000
  },
  "longShortRatio": {
    "longAccount": 52.3,
    "shortAccount": 47.7,
    "longShortRatio": 1.096
  },
  "topTraderRatio": {
    "longPosition": 48.5,
    "shortPosition": 51.5
  }
}
```

### Technical Indicators (por símbolo + intervalo)
```json
{
  "macd": {
    "MACD": 123.45,
    "signal": 120.00,
    "histogram": 3.45
  },
  "rsi": 58.23,
  "atr": 1234.56,
  "sma20": 66500.00,
  "sma50": 65000.00,
  "ema9": 67000.00,
  "ema21": 66800.00,
  "stochastic": {
    "k": 65.4,
    "d": 62.1
  },
  "bollingerBands": {
    "upper": 68000.00,
    "middle": 67000.00,
    "lower": 66000.00
  },
  "trend": "bullish",
  "timestamp": "2025-10-28T15:30:00.000Z"
}
```

### Market Indicators
```json
{
  "fearGreed": {
    "value": 65,
    "classification": "Greed",
    "previousValue": 62,
    "change": 3,
    "changePercentage": 4.84,
    "emoji": "🤑",
    "timestamp": 1698508800000
  },
  "btcDominance": {
    "btc": 54.2,
    "eth": 17.8,
    "totalMarketCap": 2500000000000,
    "total24hVolume": 125000000000,
    "activeCryptocurrencies": 12000,
    "markets": 850,
    "marketCapChange24h": 2.5
  },
  "timestamp": "2025-10-28T15:30:00.000Z"
}
```

---

## 🎯 Checklist para Migração Backend

### Endpoints a Criar
- [ ] `GET /api/v1/crypto/:symbol` - Dados completos da cripto
- [ ] `GET /api/v1/crypto/:symbol/ohlcv` - Klines/Candlesticks
- [ ] `GET /api/v1/indicators/:symbol` - Indicadores técnicos
- [ ] `GET /api/v1/indicators/:symbol/triple-screen` - Análise Triple Screen
- [ ] `GET /api/v1/futures/:symbol` - Dados de Futures
- [ ] `GET /api/v1/market/indicators` - Fear & Greed + BTC Dom
- [ ] `GET /api/v1/market/fear-greed` - Apenas Fear & Greed
- [ ] `GET /api/v1/market/dominance` - Apenas BTC Dominance
- [ ] `GET /api/v1/health` - Health check geral
- [ ] `GET /api/v1/health/:service` - Health por serviço

### Processamentos a Implementar
- [ ] Klines processor (amplitude, volume, percent change)
- [ ] Technical indicators calculator (MACD, RSI, SMA, EMA, etc)
- [ ] Triple Screen analyzer
- [ ] Funding rate processor
- [ ] Open Interest processor
- [ ] LSR processor
- [ ] Fear & Greed processor
- [ ] BTC Dominance processor

### Background Jobs a Criar
- [ ] Data Collector (15s interval)
- [ ] Indicator Calculator (1min interval)
- [ ] Futures Updater (1min interval)
- [ ] Market Indicators (5min interval)
- [ ] TAAPI Sync (daily at UTC 00:00)
- [ ] Historical Archiver (hourly)
- [ ] Cache Cleanup (hourly)

### Integrações Frontend
- [ ] Atualizar `crypto-api.ts` para chamar backend
- [ ] Atualizar `binance-futures-api.ts` para chamar backend
- [ ] Atualizar `market-indicators.ts` para chamar backend
- [ ] Atualizar `technical-indicators.ts` para usar backend ou manter local
- [ ] Remover `taapi-service.ts` (movido para backend)
- [ ] Simplificar `cache-service.ts` (apenas HTTP cache)
- [ ] Atualizar todos os componentes Svelte

---

**Última Atualização**: 28 de Outubro de 2025  
**Versão**: 1.0  
**Status**: 📝 Documentação Completa
