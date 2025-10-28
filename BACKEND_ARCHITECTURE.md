# 📊 Arquitetura do Backend - Trading Bot Brain

## 🎯 Objetivo
Criar um backend Node.js centralizado que:
1. Substitui todas as chamadas diretas do frontend às APIs externas
2. Serve como "cérebro" para bots de trading (integração com CCXT e Freqtrade)
3. Processa e armazena dados históricos para análise
4. Fornece endpoints REST para o frontend consumir

---

## 📋 Análise Completa do Sistema Atual

### 🔌 APIs Externas Consumidas (Frontend Atual)

#### 1. **Binance Spot API** (GRATUITA)
- **URL Base**: `https://api.binance.com`
- **Endpoints Usados**:
  - `/api/v3/ticker/24hr` - Dados de 24h
  - `/api/v3/klines` - Candlesticks (OHLCV)
  - `/api/v3/ping` - Health check
- **Frequência**: ~15 segundos (refresh automático)
- **Criptos**: BTC, ETH, SOL, XRP, PAXG, TRX, USDT/BRL
- **Dados Obtidos**:
  - Preço atual, volume 24h, variação %
  - OHLCV para múltiplos timeframes (1m, 1h, 4h, 1d, 1w)
  - Métricas calculadas: amplitude, volume por período, variação %

#### 2. **Binance Futures API** (GRATUITA)
- **URL Base**: `https://fapi.binance.com`
- **Endpoints Usados**:
  - `/fapi/v1/premiumIndex` - Funding Rate
  - `/fapi/v1/openInterest` - Open Interest
  - `/futures/data/globalLongShortAccountRatio` - LSR (contas)
  - `/futures/data/topLongShortPositionRatio` - LSR (top traders)
  - `/fapi/v1/fundingRate` - Histórico de Funding
  - `/futures/data/openInterestHist` - Histórico de OI
- **Frequência**: ~60 segundos
- **Dados Obtidos**:
  - Funding Rate atual e próximo
  - Open Interest (valor e quantidade)
  - Long/Short Ratio (contas e posições)

#### 3. **TAAPI.IO** (PAGA - $9.99/mês)
- **URL Base**: `https://api.taapi.io`
- **Endpoints Usados**:
  - `/atr` - Average True Range (ATR14 daily)
- **Frequência**: Cache até próximo dia UTC (smart caching)
- **Limite**: 10 requisições/minuto
- **Dados Obtidos**: ATR14 (indicador de volatilidade)

#### 4. **Alternative.me** (GRATUITA)
- **URL**: `https://api.alternative.me/fng/`
- **Endpoint**: Fear & Greed Index
- **Frequência**: ~5 minutos (cached)
- **Dados Obtidos**:
  - Valor atual (0-100)
  - Classificação (Extreme Fear, Fear, Neutral, Greed, Extreme Greed)
  - Variação vs dia anterior

#### 5. **CoinGecko** (GRATUITA)
- **URL Base**: `https://api.coingecko.com/api/v3`
- **Endpoints Usados**:
  - `/global` - Dominância BTC, market cap total
  - `/coins/markets` - Ranking de criptos
- **Frequência**: ~5 minutos (cached)
- **Rate Limit**: 10-50 chamadas/minuto
- **Dados Obtidos**:
  - BTC Dominance %
  - ETH Dominance %
  - Market Cap total
  - Volume 24h total
  - Número de criptos ativas

#### 6. **Coinglass API** (DESABILITADA - Requer API Key Paga)
- **Status**: Implementada mas não usada
- **Motivo**: Custo adicional
- **Dados que forneceria**: LSR agregado, heatmap de liquidação

---

### 🧮 Cálculos e Processamentos no Frontend

#### 1. **Processamento de Klines (OHLCV)**
```typescript
// Múltiplos timeframes processados:
- 10 minutos (10x 1m candles)
- 1 hora (60x 1m candles)
- 4 horas (4x 1h candles)
- 1 dia (24x 1h candles)
- 1 semana (7x 1d candles)

// Para cada timeframe, calcula:
- Amplitude (High - Low)
- Volume total
- Variação percentual
- Preços: High, Low, Open, Close
```

#### 2. **Indicadores Técnicos (Biblioteca: technicalindicators)**
```typescript
Calculados localmente no frontend:
- MACD (12, 26, 9)
- RSI (14)
- ATR (14) - local + TAAPI
- SMA (20, 50)
- EMA (9, 21)
- Estocástico (14, 3, 3)
- Bandas de Bollinger (20, 2)
- Trend Analysis (bullish/bearish/neutral)
```

#### 3. **Análise Triple Screen (Elder)**
```typescript
Screen 1 (1 Week): Tendência de longo prazo
Screen 2 (1 Day): Tendência intermediária
Screen 3 (4 Hour): Entrada/Saída
```

#### 4. **Cálculos de Sentimento**
```typescript
- Classificação Fear & Greed
- Sentimento baseado em Funding Rate
- Sentimento baseado em LSR
- Análise de dominância BTC
```

---

### 💾 Sistema de Cache Atual

#### Cache Service (Frontend)
```typescript
Configurações por API:
- Binance Spot: 15s TTL, 20 req/min
- Binance Futures: 60s TTL, 20 req/min
- TAAPI: Dynamic TTL (até próximo dia), 10 req/min
- Alternative.me: 5min TTL
- CoinGecko: 5min TTL

Features:
- Rate limiting
- Stale cache fallback
- Auto cleanup
- Pattern invalidation
```

---

## 🏗️ Arquitetura Proposta do Backend

### 📦 Stack Tecnológica

```
Backend:
- Node.js (v18+)
- TypeScript
- Express.js (REST API)
- PostgreSQL (dados históricos e análises)
- Redis (cache distribuído)
- Bull (job queue para processamento)
- Prisma ORM (gerenciamento de banco)

Integrações Futuras:
- CCXT (múltiplas exchanges)
- Freqtrade (bot framework)
- WebSocket (dados em tempo real)
```

### 📂 Estrutura de Pastas

```
backend/
├── src/
│   ├── config/          # Configurações e variáveis de ambiente
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   └── apis.ts
│   │
│   ├── models/          # Modelos de dados (Prisma)
│   │   ├── crypto.ts
│   │   ├── market-data.ts
│   │   ├── indicator.ts
│   │   └── trading-signal.ts
│   │
│   ├── services/        # Lógica de negócio
│   │   ├── binance/
│   │   │   ├── spot.service.ts
│   │   │   ├── futures.service.ts
│   │   │   └── klines.processor.ts
│   │   ├── taapi/
│   │   │   └── taapi.service.ts
│   │   ├── market/
│   │   │   ├── fear-greed.service.ts
│   │   │   ├── coingecko.service.ts
│   │   │   └── market-indicators.service.ts
│   │   ├── indicators/
│   │   │   ├── technical.service.ts
│   │   │   ├── triple-screen.service.ts
│   │   │   └── calculator.ts
│   │   ├── cache/
│   │   │   └── redis.service.ts
│   │   └── ccxt/
│   │       └── ccxt.service.ts
│   │
│   ├── controllers/     # Controladores REST
│   │   ├── crypto.controller.ts
│   │   ├── market.controller.ts
│   │   ├── indicators.controller.ts
│   │   └── futures.controller.ts
│   │
│   ├── routes/          # Definição de rotas
│   │   ├── crypto.routes.ts
│   │   ├── market.routes.ts
│   │   ├── indicators.routes.ts
│   │   └── futures.routes.ts
│   │
│   ├── jobs/            # Background jobs
│   │   ├── data-collector.job.ts
│   │   ├── indicator-calculator.job.ts
│   │   └── cleanup.job.ts
│   │
│   ├── middleware/      # Middlewares
│   │   ├── error-handler.ts
│   │   ├── rate-limiter.ts
│   │   └── logger.ts
│   │
│   ├── utils/           # Utilitários
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   │
│   └── index.ts         # Entry point
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ Modelagem de Banco de Dados

### Schema Principal (PostgreSQL)

```prisma
// prisma/schema.prisma

model Crypto {
  id              String   @id @default(uuid())
  symbol          String   @unique // BTC, ETH, SOL
  name            String   // Bitcoin, Ethereum, Solana
  binanceSymbol   String   // BTCUSDT
  taapiSymbol     String   // BTC/USDT
  icon            String
  color           String
  precision       Int
  active          Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  marketData      MarketData[]
  indicators      Indicator[]
  futuresData     FuturesData[]
}

model MarketData {
  id                String   @id @default(uuid())
  cryptoId          String
  crypto            Crypto   @relation(fields: [cryptoId], references: [id])
  
  // Preço e Volume
  price             Decimal  @db.Decimal(20, 8)
  volume24h         Decimal  @db.Decimal(20, 2)
  percentChange     Decimal  @db.Decimal(10, 4)
  volumePerHour     Decimal  @db.Decimal(20, 2)
  
  // Timeframe: 10m
  amplitude10m      Decimal  @db.Decimal(20, 8)
  highPrice10m      Decimal  @db.Decimal(20, 8)
  lowPrice10m       Decimal  @db.Decimal(20, 8)
  volume10m         Decimal  @db.Decimal(20, 2)
  percentChange10m  Decimal  @db.Decimal(10, 4)
  
  // Timeframe: 1h
  amplitude1h       Decimal  @db.Decimal(20, 8)
  highPrice1h       Decimal  @db.Decimal(20, 8)
  lowPrice1h        Decimal  @db.Decimal(20, 8)
  volume1h          Decimal  @db.Decimal(20, 2)
  percentChange1h   Decimal  @db.Decimal(10, 4)
  
  // Timeframe: 4h
  amplitude4h       Decimal  @db.Decimal(20, 8)
  highPrice4h       Decimal  @db.Decimal(20, 8)
  lowPrice4h        Decimal  @db.Decimal(20, 8)
  volume4h          Decimal  @db.Decimal(20, 2)
  percentChange4h   Decimal  @db.Decimal(10, 4)
  
  // Timeframe: 1d
  amplitude1d       Decimal  @db.Decimal(20, 8)
  highPrice1d       Decimal  @db.Decimal(20, 8)
  lowPrice1d        Decimal  @db.Decimal(20, 8)
  volume1d          Decimal  @db.Decimal(20, 2)
  percentChange1d   Decimal  @db.Decimal(10, 4)
  
  // Timeframe: 1w
  amplitude1w       Decimal  @db.Decimal(20, 8)
  highPrice1w       Decimal  @db.Decimal(20, 8)
  lowPrice1w        Decimal  @db.Decimal(20, 8)
  volume1w          Decimal  @db.Decimal(20, 2)
  percentChange1w   Decimal  @db.Decimal(10, 4)
  
  timestamp         DateTime @default(now())
  
  @@index([cryptoId, timestamp])
  @@map("market_data")
}

model Indicator {
  id                String   @id @default(uuid())
  cryptoId          String
  crypto            Crypto   @relation(fields: [cryptoId], references: [id])
  interval          String   // 1h, 4h, 1d, 1w
  
  // MACD
  macd              Decimal? @db.Decimal(20, 8)
  macdSignal        Decimal? @db.Decimal(20, 8)
  macdHistogram     Decimal? @db.Decimal(20, 8)
  
  // RSI
  rsi               Decimal? @db.Decimal(10, 4)
  
  // ATR
  atr               Decimal? @db.Decimal(20, 8)
  
  // Moving Averages
  sma20             Decimal? @db.Decimal(20, 8)
  sma50             Decimal? @db.Decimal(20, 8)
  ema9              Decimal? @db.Decimal(20, 8)
  ema21             Decimal? @db.Decimal(20, 8)
  
  // Stochastic
  stochasticK       Decimal? @db.Decimal(10, 4)
  stochasticD       Decimal? @db.Decimal(10, 4)
  
  // Bollinger Bands
  bbUpper           Decimal? @db.Decimal(20, 8)
  bbMiddle          Decimal? @db.Decimal(20, 8)
  bbLower           Decimal? @db.Decimal(20, 8)
  
  // Trend
  trend             String   // bullish, bearish, neutral
  
  timestamp         DateTime @default(now())
  
  @@index([cryptoId, interval, timestamp])
  @@map("indicators")
}

model FuturesData {
  id                    String   @id @default(uuid())
  cryptoId              String
  crypto                Crypto   @relation(fields: [cryptoId], references: [id])
  
  // Funding Rate
  fundingRate           Decimal? @db.Decimal(10, 8)
  fundingRatePercent    Decimal? @db.Decimal(10, 4)
  nextFundingTime       DateTime?
  
  // Open Interest
  openInterest          Decimal? @db.Decimal(20, 2)
  openInterestValue     Decimal? @db.Decimal(20, 2)
  
  // Long/Short Ratio (Accounts)
  longAccountPercent    Decimal? @db.Decimal(10, 4)
  shortAccountPercent   Decimal? @db.Decimal(10, 4)
  lsrAccounts           Decimal? @db.Decimal(10, 4)
  
  // Long/Short Ratio (Top Traders)
  longPositionPercent   Decimal? @db.Decimal(10, 4)
  shortPositionPercent  Decimal? @db.Decimal(10, 4)
  lsrTopTraders         Decimal? @db.Decimal(10, 4)
  
  timestamp             DateTime @default(now())
  
  @@index([cryptoId, timestamp])
  @@map("futures_data")
}

model MarketIndicators {
  id                    String   @id @default(uuid())
  
  // Fear & Greed
  fearGreedValue        Int
  fearGreedClassification String
  fearGreedPrevious     Int?
  fearGreedChange       Int?
  
  // BTC Dominance
  btcDominance          Decimal  @db.Decimal(10, 4)
  ethDominance          Decimal  @db.Decimal(10, 4)
  totalMarketCap        Decimal  @db.Decimal(20, 2)
  total24hVolume        Decimal  @db.Decimal(20, 2)
  
  timestamp             DateTime @default(now())
  
  @@index([timestamp])
  @@map("market_indicators")
}

model OHLCV {
  id                String   @id @default(uuid())
  symbol            String   // BTCUSDT
  interval          String   // 1m, 5m, 15m, 1h, 4h, 1d
  
  openTime          DateTime
  open              Decimal  @db.Decimal(20, 8)
  high              Decimal  @db.Decimal(20, 8)
  low               Decimal  @db.Decimal(20, 8)
  close             Decimal  @db.Decimal(20, 8)
  volume            Decimal  @db.Decimal(20, 8)
  closeTime         DateTime
  
  quoteVolume       Decimal  @db.Decimal(20, 2)
  trades            Int
  
  @@unique([symbol, interval, openTime])
  @@index([symbol, interval, openTime])
  @@map("ohlcv")
}
```

---

## 🔌 API Endpoints (Backend)

### 1. **Crypto Data**

```
GET /api/v1/crypto/:symbol
Retorna dados completos de uma criptomoeda

Response:
{
  "config": { symbol, name, icon, color, ... },
  "marketData": { price, volume24h, percentChange, ... },
  "timeframes": {
    "10m": { amplitude, high, low, volume, percentChange },
    "1h": { ... },
    "4h": { ... },
    "1d": { ... },
    "1w": { ... }
  },
  "lastUpdate": "2025-10-28T...",
  "recentPrices": [67000, 67100, 67200, ...]
}
```

```
GET /api/v1/crypto/:symbol/ohlcv
Retorna dados OHLCV para gráficos

Query Params:
- interval: 1m, 5m, 15m, 1h, 4h, 1d, 1w
- limit: número de candles (default: 200)
- startTime: timestamp início
- endTime: timestamp fim

Response:
{
  "symbol": "BTCUSDT",
  "interval": "1h",
  "data": [
    {
      "openTime": 1234567890,
      "open": 67000,
      "high": 67500,
      "low": 66800,
      "close": 67200,
      "volume": 1234.56,
      "closeTime": 1234571490
    },
    ...
  ]
}
```

### 2. **Indicadores Técnicos**

```
GET /api/v1/indicators/:symbol
Retorna todos os indicadores técnicos

Query Params:
- interval: 1h, 4h, 1d, 1w (default: 1d)

Response:
{
  "symbol": "BTCUSDT",
  "interval": "1d",
  "indicators": {
    "macd": { MACD: 123.45, signal: 120.00, histogram: 3.45 },
    "rsi": 58.23,
    "atr": 1234.56,
    "sma20": 66500,
    "sma50": 65000,
    "ema9": 67000,
    "ema21": 66800,
    "stochastic": { k: 65.4, d: 62.1 },
    "bollingerBands": { upper: 68000, middle: 67000, lower: 66000 },
    "trend": "bullish"
  },
  "timestamp": "2025-10-28T..."
}
```

```
GET /api/v1/indicators/:symbol/triple-screen
Análise Triple Screen (Elder)

Response:
{
  "symbol": "BTCUSDT",
  "screens": {
    "screen1": {
      "interval": "1w",
      "trend": "bullish",
      "ema": 65000,
      "macdHistogram": 150
    },
    "screen2": {
      "interval": "1d",
      "trend": "bullish",
      "stochastic": { k: 65, d: 60 }
    },
    "screen3": {
      "interval": "4h",
      "trend": "bullish",
      "macd": { ... }
    }
  },
  "recommendation": "BUY" | "SELL" | "HOLD",
  "timestamp": "2025-10-28T..."
}
```

### 3. **Dados de Futures**

```
GET /api/v1/futures/:symbol
Retorna dados de futuros

Response:
{
  "symbol": "BTCUSDT",
  "fundingRate": {
    "rate": 0.0001,
    "ratePercent": 0.01,
    "nextFundingTime": "2025-10-28T16:00:00Z",
    "timeUntilNext": "2h 30m",
    "sentiment": "bullish"
  },
  "openInterest": {
    "value": 35500000000,
    "contracts": 535000,
    "change24h": 2.5
  },
  "longShortRatio": {
    "accounts": {
      "long": 52.3,
      "short": 47.7,
      "ratio": 1.096
    },
    "topTraders": {
      "long": 48.5,
      "short": 51.5,
      "ratio": 0.942
    }
  },
  "timestamp": "2025-10-28T..."
}
```

### 4. **Indicadores de Mercado**

```
GET /api/v1/market/indicators
Retorna Fear & Greed + BTC Dominance

Response:
{
  "fearGreed": {
    "value": 65,
    "classification": "Greed",
    "previousValue": 62,
    "change": 3,
    "changePercent": 4.84,
    "emoji": "🤑"
  },
  "btcDominance": {
    "btc": 54.2,
    "eth": 17.8,
    "totalMarketCap": 2500000000000,
    "total24hVolume": 125000000000,
    "activeCryptos": 12000
  },
  "timestamp": "2025-10-28T..."
}
```

### 5. **Health & Status**

```
GET /api/v1/health
Health check do backend

Response:
{
  "status": "healthy",
  "timestamp": "2025-10-28T...",
  "services": {
    "database": "connected",
    "redis": "connected",
    "binance": "online",
    "taapi": "online"
  },
  "cache": {
    "hitRate": 85.5,
    "size": 1234
  }
}
```

---

## 🔄 Estratégia de Dados e Cache

### Cache em Múltiplas Camadas

```
Layer 1 - Redis (Cache Distribuído)
├── Hot Data: 15-60s TTL
│   ├── Preços atuais
│   ├── Volume 24h
│   └── Dados de Futures
│
├── Warm Data: 5-15min TTL
│   ├── Indicadores técnicos
│   ├── Fear & Greed
│   └── BTC Dominance
│
└── Cold Data: 1h-24h TTL
    ├── ATR diário
    └── Dados históricos agregados

Layer 2 - PostgreSQL (Persistência)
├── Time Series Data
│   ├── OHLCV (todos os intervals)
│   ├── Indicadores históricos
│   └── Futures histórico
│
└── Analytics Data
    ├── Trends
    ├── Patterns
    └── Backtesting results
```

### Background Jobs (Bull Queue)

```typescript
// Jobs periódicos
1. Data Collector (a cada 15s)
   - Buscar dados de todas as criptos
   - Atualizar cache Redis
   - Persistir no PostgreSQL

2. Indicator Calculator (a cada 1min)
   - Calcular indicadores técnicos
   - Atualizar análises Triple Screen
   - Gerar sinais de trading

3. Futures Updater (a cada 1min)
   - Atualizar dados de Futures
   - Calcular métricas de sentimento
   
4. Market Indicators (a cada 5min)
   - Fear & Greed Index
   - BTC Dominance
   - Market Cap global

5. Historical Archiver (a cada 1h)
   - Agregar dados antigos
   - Limpar cache expirado
   - Manter dados históricos compactados

6. TAAPI Sync (a cada dia UTC 00:00)
   - Atualizar ATR14 diário
   - Renovar indicadores de TAAPI
```

---

## 🚀 Fases de Implementação

### Fase 1: Setup Inicial (Semana 1)
- [ ] Criar estrutura do projeto Node.js
- [ ] Configurar TypeScript, ESLint, Prettier
- [ ] Setup PostgreSQL + Prisma
- [ ] Setup Redis
- [ ] Configurar Bull Queue
- [ ] Criar schema de banco de dados
- [ ] Migrations iniciais

### Fase 2: Serviços de APIs Externas (Semana 2)
- [ ] Binance Spot Service
- [ ] Binance Futures Service
- [ ] TAAPI Service
- [ ] Alternative.me Service
- [ ] CoinGecko Service
- [ ] Sistema de cache Redis
- [ ] Rate limiting

### Fase 3: Processamento de Dados (Semana 3)
- [ ] Klines Processor
- [ ] Indicator Calculator (MACD, RSI, SMA, EMA, etc)
- [ ] Triple Screen Analyzer
- [ ] Futures Data Processor
- [ ] Market Indicators Processor

### Fase 4: API REST (Semana 4)
- [ ] Controllers
- [ ] Routes
- [ ] Middlewares (error, logging, rate limit)
- [ ] Validação de inputs
- [ ] Documentação Swagger

### Fase 5: Background Jobs (Semana 5)
- [ ] Data Collector Job
- [ ] Indicator Calculator Job
- [ ] Futures Updater Job
- [ ] Market Indicators Job
- [ ] Historical Archiver Job

### Fase 6: Integração Frontend (Semana 6)
- [ ] Adaptar frontend para consumir novo backend
- [ ] Remover chamadas diretas às APIs
- [ ] Implementar error handling
- [ ] Testes end-to-end

### Fase 7: Integrações Avançadas (Futuro)
- [ ] CCXT Integration (múltiplas exchanges)
- [ ] Freqtrade Integration
- [ ] WebSocket para real-time data
- [ ] Bot trading logic
- [ ] Backtesting engine
- [ ] Portfolio management

---

## 📊 Decisões de Design

### Por que PostgreSQL?
- ✅ Excelente para time series data
- ✅ JSONB para dados flexíveis
- ✅ Índices potentes para queries rápidas
- ✅ Suporte a particionamento (escala)
- ✅ Transações ACID

### Por que Redis?
- ✅ Cache distribuído ultra-rápido
- ✅ TTL automático
- ✅ Pub/Sub para real-time
- ✅ Sorted Sets para rankings
- ✅ Integração com Bull Queue

### Por que não MongoDB?
- ❌ Time series menos eficiente
- ❌ Joins complexos
- ❌ Queremos estrutura rígida para dados financeiros

### Estratégia de Retenção de Dados

```typescript
OHLCV Data Retention:
- 1m candles: 7 dias
- 5m candles: 30 dias
- 15m candles: 90 dias
- 1h candles: 1 ano
- 4h candles: 2 anos
- 1d candles: para sempre

Indicators:
- 1h: 30 dias
- 4h: 90 dias
- 1d: 1 ano
- 1w: para sempre

Futures Data:
- Snapshot atual: sempre
- Histórico: 90 dias

Market Indicators:
- Histórico: 1 ano
```

---

## 🔐 Segurança e Configuração

### Variáveis de Ambiente (.env)

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/trading_brain"
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD="secure_password"

# APIs
TAAPI_SECRET_KEY="your_taapi_key"
BINANCE_API_KEY="" # Opcional (para futuros bots)
BINANCE_SECRET_KEY="" # Opcional

# Server
PORT=3000
NODE_ENV="development"
LOG_LEVEL="debug"

# Cache
CACHE_DEFAULT_TTL=60000
CACHE_MAX_SIZE=10000

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Jobs
JOB_CONCURRENCY=5
JOB_DATA_COLLECTOR_INTERVAL=15000
JOB_INDICATOR_CALCULATOR_INTERVAL=60000
```

---

## 📈 Escalabilidade Futura

### Horizontal Scaling
- Load balancer (NGINX)
- Múltiplas instâncias do backend
- Redis Cluster
- PostgreSQL Read Replicas

### Microservices (Opcional)
- Data Collector Service
- Indicator Service
- Trading Bot Service
- API Gateway

### Observabilidade
- Prometheus (métricas)
- Grafana (dashboards)
- Sentry (error tracking)
- Winston (logging)

---

## 🎯 Métricas de Sucesso

1. **Performance**
   - Latência de API < 100ms (p95)
   - Cache hit rate > 80%
   - Uptime > 99.9%

2. **Dados**
   - 0% perda de dados críticos
   - < 1s de delay para dados em tempo real
   - Sincronização precisa com exchanges

3. **Qualidade**
   - Cobertura de testes > 80%
   - 0 bugs críticos em produção
   - Documentação completa

---

## 📝 Próximos Passos

1. **Revisar e aprovar esta arquitetura**
2. **Criar repositório do backend**
3. **Iniciar Fase 1: Setup Inicial**
4. **Documentar decisões técnicas**
5. **Definir CI/CD pipeline**

---

**Data de Criação**: 28 de Outubro de 2025  
**Versão**: 1.0  
**Status**: 📋 Em Planejamento
