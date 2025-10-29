# 🚀 Estratégia de Migração para Arquitetura Backend Centralizada

## 📋 Visão Geral

Este documento define a estratégia completa para migrar o sistema atual (frontend fazendo cálculos e chamadas diretas a múltiplas APIs) para uma arquitetura centralizada com backend Node.js.

**Data**: 29 de Outubro de 2025  
**Objetivo**: Criar backend Node.js que será o "cérebro" dos bots de trading

---

## 🎯 Objetivos da Migração

### Primários
1. **Centralizar Processamento**: Mover todos os cálculos e agregação de dados para o backend
2. **Simplificar Frontend**: Frontend apenas consome e exibe dados processados
3. **Preparar Infraestrutura**: Base sólida para integração com CCXT e Freqtrade
4. **Performance**: Reduzir carga no cliente, melhorar cache e processamento em batch

### Secundários
1. **Histórico de Dados**: Armazenar dados históricos para análises e backtesting
2. **Escalabilidade**: Arquitetura que suporta múltiplos clientes e bots
3. **Monitoramento**: Observabilidade e logs centralizados
4. **API Unificada**: Padrão REST consistente e bem documentado

---

## 📊 Análise do Sistema Atual

### 🔌 APIs Externas Utilizadas

| API | Custo | Limite | Dados Obtidos | Frequência Atual |
|-----|-------|--------|---------------|------------------|
| **Binance Spot** | ✅ Gratuita | ~1200/min | OHLCV, Ticker 24h | 15s |
| **Binance Futures** | ✅ Gratuita | ~1200/min | Funding Rate, OI, LSR | 60s |
| **TAAPI.IO** | 💰 $9.99/mês | 10/min | ATR14 Daily | ~24h (smart cache) |
| **Alternative.me** | ✅ Gratuita | Ilimitado | Fear & Greed Index | 5min |
| **CoinGecko** | ✅ Gratuita | 10-50/min | BTC Dominance, Market Cap | 5min |

### 📈 Criptomoedas Suportadas
- Bitcoin (BTC), Ethereum (ETH), Solana (SOL)
- XRP, PAX Gold (PAXG), TRON (TRX)
- USDT/BRL (par fiat)

### 🧮 Cálculos Realizados (Frontend Atual)

#### 1. Processamento de Klines
```
Timeframes: 10m, 1h, 4h, 1d, 1w
Para cada timeframe:
  - Amplitude (High - Low)
  - Volume Total
  - Variação Percentual
  - High/Low prices
```

#### 2. Indicadores Técnicos (Biblioteca: technicalindicators)
```
- MACD (12, 26, 9)
- RSI (14)
- ATR (14)
- SMA (20, 50)
- EMA (9, 21)
- Estocástico (14, 3, 3)
- Bandas de Bollinger (20, 2)
- Trend Analysis
```

#### 3. Análise Triple Screen (Elder)
```
Screen 1 (1w): EMA 26, MACD Histogram
Screen 2 (1d): Stochastic
Screen 3 (4h): MACD Crossover
Recomendação: BUY/SELL/HOLD
```

#### 4. Dados de Futures
```
- Funding Rate + Sentimento
- Open Interest + Variação
- Long/Short Ratio (Accounts)
- Long/Short Ratio (Top Traders)
```

#### 5. Indicadores de Mercado
```
- Fear & Greed Index + Classificação
- BTC Dominance %
- Total Market Cap
- Volume 24h Global
```

---

## 🏗️ Arquitetura Proposta

### Stack Tecnológica Backend

```
Runtime: Node.js v20+
Language: TypeScript
Framework: Express.js
Database: PostgreSQL 15+
Cache: Redis 7+
Queue: Bull (Redis-based)
ORM: Prisma
Process Manager: PM2
```

### Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                            │
│  (Svelte + TypeScript - Apenas UI e consumo de dados)      │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP/REST
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      API GATEWAY                            │
│  (Express.js - Rate Limiting, Auth, Validation)            │
└───────────────────────────┬─────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌───────▼──────┐   ┌───────▼──────┐
│   CRYPTO     │   │  INDICATORS  │   │   MARKET     │
│   SERVICE    │   │   SERVICE    │   │   SERVICE    │
└───────┬──────┘   └───────┬──────┘   └───────┬──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌───────▼──────┐   ┌───────▼──────┐
│   BINANCE    │   │    TAAPI     │   │  COINGECKO   │
│   ADAPTER    │   │   ADAPTER    │   │   ADAPTER    │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                     DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐      │
│  │ PostgreSQL   │  │    Redis     │  │  Bull Queue │      │
│  │ (Historical) │  │   (Cache)    │  │   (Jobs)    │      │
│  └──────────────┘  └──────────────┘  └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Diretórios Backend

```
backend/
├── src/
│   ├── config/                 # Configurações
│   │   ├── database.ts        # Conexão PostgreSQL
│   │   ├── redis.ts           # Conexão Redis
│   │   ├── apis.ts            # Configs de APIs externas
│   │   └── env.ts             # Validação .env
│   │
│   ├── prisma/                # ORM e Migrations
│   │   ├── schema.prisma      # Schema do banco
│   │   └── migrations/        # Histórico de migrations
│   │
│   ├── services/              # Lógica de Negócio
│   │   ├── crypto/
│   │   │   ├── crypto.service.ts
│   │   │   └── klines.processor.ts
│   │   ├── indicators/
│   │   │   ├── technical.service.ts
│   │   │   ├── triple-screen.service.ts
│   │   │   └── calculator.ts
│   │   ├── futures/
│   │   │   └── futures.service.ts
│   │   ├── market/
│   │   │   ├── fear-greed.service.ts
│   │   │   └── dominance.service.ts
│   │   └── cache/
│   │       └── redis.service.ts
│   │
│   ├── adapters/              # Integração com APIs Externas
│   │   ├── binance/
│   │   │   ├── spot.adapter.ts
│   │   │   └── futures.adapter.ts
│   │   ├── taapi/
│   │   │   └── taapi.adapter.ts
│   │   ├── coingecko/
│   │   │   └── coingecko.adapter.ts
│   │   └── alternative/
│   │       └── alternative.adapter.ts
│   │
│   ├── controllers/           # Controladores REST
│   │   ├── crypto.controller.ts
│   │   ├── indicators.controller.ts
│   │   ├── futures.controller.ts
│   │   ├── market.controller.ts
│   │   └── health.controller.ts
│   │
│   ├── routes/                # Definição de Rotas
│   │   ├── index.ts          # Router principal
│   │   ├── crypto.routes.ts
│   │   ├── indicators.routes.ts
│   │   ├── futures.routes.ts
│   │   └── market.routes.ts
│   │
│   ├── jobs/                  # Background Jobs
│   │   ├── data-collector.job.ts
│   │   ├── indicator-calculator.job.ts
│   │   ├── futures-updater.job.ts
│   │   ├── market-updater.job.ts
│   │   └── cleanup.job.ts
│   │
│   ├── middleware/            # Middlewares Express
│   │   ├── error-handler.ts
│   │   ├── rate-limiter.ts
│   │   ├── logger.ts
│   │   ├── cors.ts
│   │   └── validator.ts
│   │
│   ├── types/                 # TypeScript Types
│   │   ├── crypto.types.ts
│   │   ├── indicators.types.ts
│   │   ├── futures.types.ts
│   │   └── market.types.ts
│   │
│   ├── utils/                 # Utilitários
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── date-helpers.ts
│   │   └── calculations.ts
│   │
│   └── index.ts              # Entry Point
│
├── tests/
│   ├── unit/                 # Testes Unitários
│   ├── integration/          # Testes de Integração
│   └── e2e/                  # Testes End-to-End
│
├── scripts/                  # Scripts Auxiliares
│   ├── seed-database.ts
│   ├── migrate.ts
│   └── generate-docs.ts
│
├── .env.example             # Template de variáveis
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── ecosystem.config.js      # PM2 Config
```

---

## 🗄️ Modelagem de Dados

### Schema PostgreSQL (Prisma)

```prisma
// Configuração de Criptomoedas
model CryptoConfig {
  id              String   @id @default(uuid())
  symbol          String   @unique // BTC, ETH, SOL
  name            String   // Bitcoin, Ethereum
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
  ohlcv           OHLCV[]
  
  @@map("crypto_configs")
}

// Dados de Mercado (Snapshot Atual + Timeframes)
model MarketData {
  id                String   @id @default(uuid())
  cryptoConfigId    String
  cryptoConfig      CryptoConfig @relation(fields: [cryptoConfigId], references: [id])
  
  // Preço e Volume Atual
  price             Decimal  @db.Decimal(20, 8)
  volume24h         Decimal  @db.Decimal(20, 2)
  percentChange     Decimal  @db.Decimal(10, 4)
  volumePerHour     Decimal  @db.Decimal(20, 2)
  
  // Timeframes (calculados a partir de OHLCV)
  timeframes        Json     // { "10m": {...}, "1h": {...}, etc }
  recentPrices      Json     // Array dos últimos 10 preços
  
  timestamp         DateTime @default(now())
  
  @@index([cryptoConfigId, timestamp])
  @@map("market_data")
}

// OHLCV (Candlesticks) - Histórico
model OHLCV {
  id                String   @id @default(uuid())
  cryptoConfigId    String
  cryptoConfig      CryptoConfig @relation(fields: [cryptoConfigId], references: [id])
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
  
  @@unique([cryptoConfigId, interval, openTime])
  @@index([cryptoConfigId, interval, openTime])
  @@map("ohlcv")
}

// Indicadores Técnicos
model Indicator {
  id                String   @id @default(uuid())
  cryptoConfigId    String
  cryptoConfig      CryptoConfig @relation(fields: [cryptoConfigId], references: [id])
  interval          String   // 1h, 4h, 1d, 1w
  
  // Todos os indicadores em JSON para flexibilidade
  data              Json     // { macd: {...}, rsi: 58, atr: 1234, ... }
  trend             String   // bullish, bearish, neutral
  
  timestamp         DateTime @default(now())
  
  @@index([cryptoConfigId, interval, timestamp])
  @@map("indicators")
}

// Dados de Futures
model FuturesData {
  id                    String   @id @default(uuid())
  cryptoConfigId        String
  cryptoConfig          CryptoConfig @relation(fields: [cryptoConfigId], references: [id])
  
  // Funding Rate
  fundingRate           Decimal? @db.Decimal(10, 8)
  fundingRatePercent    Decimal? @db.Decimal(10, 4)
  nextFundingTime       DateTime?
  
  // Open Interest
  openInterest          Decimal? @db.Decimal(20, 2)
  openInterestValue     Decimal? @db.Decimal(20, 2)
  
  // Long/Short Ratios (JSON para flexibilidade)
  longShortData         Json?    // { accounts: {...}, topTraders: {...} }
  
  timestamp             DateTime @default(now())
  
  @@index([cryptoConfigId, timestamp])
  @@map("futures_data")
}

// Indicadores de Mercado Global
model MarketIndicator {
  id                    String   @id @default(uuid())
  
  // Fear & Greed
  fearGreedValue        Int
  fearGreedClass        String
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

// Triple Screen Analysis Results
model TripleScreenAnalysis {
  id                String   @id @default(uuid())
  cryptoConfigId    String
  
  screen1           Json     // { interval: "1w", trend: "bullish", ... }
  screen2           Json     // { interval: "1d", trend: "bullish", ... }
  screen3           Json     // { interval: "4h", trend: "bullish", ... }
  
  recommendation    String   // BUY, SELL, HOLD
  confidence        Decimal  @db.Decimal(5, 2) // 0-100
  
  timestamp         DateTime @default(now())
  
  @@index([cryptoConfigId, timestamp])
  @@map("triple_screen_analysis")
}
```

---

## 🔌 Especificação de API REST

### Base URL
```
Development: http://localhost:3000/api/v1
Production:  https://api.yourdomain.com/api/v1
```

### Endpoints

#### 1. Crypto Data

```http
GET /api/v1/crypto
Descrição: Lista todas as criptomoedas configuradas
Response: CryptoConfig[]

GET /api/v1/crypto/:symbol
Descrição: Dados completos de uma cripto (snapshot atual)
Response: {
  config: CryptoConfig,
  marketData: {...},
  timeframes: {...},
  lastUpdate: timestamp
}

GET /api/v1/crypto/:symbol/ohlcv
Descrição: Dados OHLCV para gráficos
Query: interval, limit, startTime, endTime
Response: OHLCV[]
```

#### 2. Indicators

```http
GET /api/v1/indicators/:symbol
Descrição: Indicadores técnicos
Query: interval (1h, 4h, 1d, 1w)
Response: TechnicalAnalysis

GET /api/v1/indicators/:symbol/triple-screen
Descrição: Análise Triple Screen
Response: TripleScreenAnalysis

GET /api/v1/indicators/:symbol/series
Descrição: Séries completas para gráficos
Query: interval, limit
Response: IndicatorSeries
```

#### 3. Futures

```http
GET /api/v1/futures/:symbol
Descrição: Dados de futuros completos
Response: {
  fundingRate: {...},
  openInterest: {...},
  longShortRatio: {...}
}

GET /api/v1/futures/:symbol/funding-history
Descrição: Histórico de funding rate
Query: limit
Response: FundingRateHistory[]
```

#### 4. Market

```http
GET /api/v1/market/indicators
Descrição: Indicadores de mercado global
Response: {
  fearGreed: {...},
  btcDominance: {...}
}

GET /api/v1/market/fear-greed
Descrição: Apenas Fear & Greed
Response: FearGreedData

GET /api/v1/market/dominance
Descrição: Apenas dominância
Response: BTCDominanceData
```

#### 5. Health & Status

```http
GET /api/v1/health
Descrição: Health check geral
Response: {
  status: "healthy",
  services: {...},
  cache: {...}
}

GET /api/v1/health/:service
Descrição: Health de serviço específico
Response: ServiceHealth
```

---

## 🔄 Estratégia de Cache (Redis)

### Cache Layers

```typescript
// Layer 1: Hot Data (TTL curto)
crypto_snapshot_{symbol}     // 15s
futures_data_{symbol}        // 60s

// Layer 2: Warm Data (TTL médio)
indicators_{symbol}_{interval}  // 5min
fear_greed                      // 5min
btc_dominance                   // 5min

// Layer 3: Cold Data (TTL longo)
atr_daily_{symbol}           // 24h (smart cache)
ohlcv_{symbol}_{interval}    // 1h
```

### Cache Invalidation Strategy

```typescript
// 1. Time-based (TTL)
- Automático pelo Redis

// 2. Event-based
- Invalidar ao receber novos dados
- Invalidar ao erro de API externa

// 3. Manual
- Endpoint para forçar refresh
- Admin UI para gerenciar cache
```

---

## ⚙️ Background Jobs (Bull Queue)

### Jobs Periódicos

```typescript
// 1. Data Collector Job
Interval: 15 segundos
Tasks:
  - Buscar dados de todas as criptos (Binance Spot)
  - Atualizar cache Redis
  - Persistir snapshot no PostgreSQL (a cada 5min)

// 2. Indicator Calculator Job
Interval: 1 minuto
Tasks:
  - Calcular indicadores técnicos para todos os intervals
  - Calcular Triple Screen Analysis
  - Atualizar cache e banco

// 3. Futures Updater Job
Interval: 1 minuto
Tasks:
  - Buscar dados de Futures (Binance)
  - Processar métricas de sentimento
  - Atualizar cache e banco

// 4. Market Indicators Job
Interval: 5 minutos
Tasks:
  - Buscar Fear & Greed (Alternative.me)
  - Buscar BTC Dominance (CoinGecko)
  - Atualizar cache e banco

// 5. OHLCV Collector Job
Interval: Variável por timeframe
Tasks:
  - 1m: a cada 1 minuto
  - 5m: a cada 5 minutos
  - 1h: a cada hora
  - Persistir no banco

// 6. TAAPI Sync Job
Interval: Diário (UTC 00:00)
Tasks:
  - Buscar ATR14 para todas as criptos
  - Cache até próximo dia
  - Persistir no banco

// 7. Cleanup Job
Interval: 1 hora
Tasks:
  - Limpar dados antigos (política de retenção)
  - Comprimir/agregar dados históricos
  - Limpar cache expirado
```

---

## 📅 Plano de Implementação

### Fase 1: Setup e Infraestrutura (Semana 1-2)

**Tarefas**:
- [x] Criar repositório backend
- [ ] Setup TypeScript + ESLint + Prettier
- [ ] Configurar Express.js
- [ ] Setup PostgreSQL + Prisma
- [ ] Setup Redis
- [ ] Setup Bull Queue
- [ ] Configurar estrutura de pastas
- [ ] Configurar variáveis de ambiente
- [ ] Setup Docker (opcional)

**Entregáveis**:
- Projeto backend rodando
- Conexão com banco de dados
- Health check endpoint funcionando

---

### Fase 2: Adapters de APIs Externas (Semana 3)

**Tarefas**:
- [ ] Implementar Binance Spot Adapter
- [ ] Implementar Binance Futures Adapter
- [ ] Implementar TAAPI Adapter
- [ ] Implementar Alternative.me Adapter
- [ ] Implementar CoinGecko Adapter
- [ ] Implementar Redis Cache Service
- [ ] Implementar Rate Limiting

**Entregáveis**:
- Todos os adapters funcionando
- Testes unitários dos adapters
- Cache funcionando

---

### Fase 3: Services e Business Logic (Semana 4-5)

**Tarefas**:
- [ ] Crypto Service (processamento de klines)
- [ ] Indicators Service (calculadora de indicadores)
- [ ] Triple Screen Service
- [ ] Futures Service
- [ ] Market Service (Fear & Greed, Dominance)
- [ ] Klines Processor (agregação de timeframes)

**Entregáveis**:
- Lógica de negócio completa
- Testes unitários de services
- Documentação de cada service

---

### Fase 4: Controllers e Routes (Semana 6)

**Tarefas**:
- [ ] Crypto Controllers
- [ ] Indicators Controllers
- [ ] Futures Controllers
- [ ] Market Controllers
- [ ] Health Controllers
- [ ] Routes setup
- [ ] Middlewares (error, logger, validator)

**Entregáveis**:
- API REST completa
- Validação de inputs
- Error handling
- Documentação Swagger/OpenAPI

---

### Fase 5: Background Jobs (Semana 7)

**Tarefas**:
- [ ] Data Collector Job
- [ ] Indicator Calculator Job
- [ ] Futures Updater Job
- [ ] Market Indicators Job
- [ ] OHLCV Collector Job
- [ ] TAAPI Sync Job
- [ ] Cleanup Job
- [ ] Queue Dashboard (Bull Board)

**Entregáveis**:
- Todos os jobs funcionando
- Scheduler configurado
- Monitoramento de jobs

---

### Fase 6: Migração do Frontend (Semana 8-9)

**Tarefas**:
- [ ] Criar novo serviço de API no frontend
- [ ] Migrar componente por componente:
  - [ ] CryptoTracker
  - [ ] TechnicalIndicators
  - [ ] TripleScreenAnalysis
  - [ ] BinanceFuturesWidget
  - [ ] MarketIndicators
  - [ ] CandleChart
- [ ] Remover código legado
- [ ] Atualizar testes E2E

**Entregáveis**:
- Frontend consumindo backend
- Testes passando
- Performance igual ou melhor

---

### Fase 7: Testes e Otimização (Semana 10)

**Tarefas**:
- [ ] Testes de integração
- [ ] Testes E2E completos
- [ ] Performance testing
- [ ] Load testing
- [ ] Otimização de queries
- [ ] Otimização de cache
- [ ] Tuning do Redis e PostgreSQL

**Entregáveis**:
- Cobertura de testes > 80%
- Performance benchmarks
- Relatório de otimização

---

### Fase 8: Deploy e Monitoramento (Semana 11)

**Tarefas**:
- [ ] Setup CI/CD (GitHub Actions)
- [ ] Deploy em staging
- [ ] Setup PM2 ou Docker
- [ ] Setup monitoramento (Prometheus + Grafana)
- [ ] Setup logs centralizados
- [ ] Setup alertas
- [ ] Backup e recovery

**Entregáveis**:
- Backend em produção
- Monitoramento ativo
- Documentação de deploy

---

### Fase 9: Integrações Futuras (Semana 12+)

**Tarefas**:
- [ ] Integração CCXT (múltiplas exchanges)
- [ ] Integração Freqtrade
- [ ] WebSocket para dados real-time
- [ ] Bot trading logic
- [ ] Backtesting engine
- [ ] Portfolio management
- [ ] Alertas e notificações

**Entregáveis**:
- Sistema completo de trading
- Documentação de integração
- Estratégias de bot implementadas

---

## 🔧 Variáveis de Ambiente

```bash
# Server
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/trading_brain"
DATABASE_POOL_SIZE=20
DATABASE_SSL=false

# Redis
REDIS_URL="redis://localhost:6379"
REDIS_PASSWORD=""
REDIS_DB=0

# APIs Externas
TAAPI_SECRET_KEY="your_taapi_key_here"
BINANCE_API_KEY=""          # Opcional
BINANCE_SECRET_KEY=""       # Opcional

# Cache
CACHE_DEFAULT_TTL=60000
CACHE_MAX_SIZE=10000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Jobs
JOB_CONCURRENCY=5
JOB_DATA_COLLECTOR_INTERVAL=15000      # 15 segundos
JOB_INDICATOR_CALCULATOR_INTERVAL=60000 # 1 minuto
JOB_FUTURES_UPDATER_INTERVAL=60000     # 1 minuto
JOB_MARKET_INDICATORS_INTERVAL=300000  # 5 minutos

# Logging
LOG_LEVEL=debug
LOG_FILE_PATH=./logs

# CORS
CORS_ORIGIN=http://localhost:5173
CORS_CREDENTIALS=true
```

---

## 📊 Métricas de Sucesso

### Performance
- ✅ Latência de API < 100ms (p95)
- ✅ Cache hit rate > 80%
- ✅ Uptime > 99.9%
- ✅ Throughput > 1000 req/min

### Qualidade
- ✅ Cobertura de testes > 80%
- ✅ 0 bugs críticos em produção
- ✅ Documentação completa

### Funcionalidade
- ✅ Frontend funcionando perfeitamente
- ✅ 0% de perda de dados
- ✅ Sincronização < 1s com exchanges

---

## 🎯 Próximos Passos Imediatos

1. **Criar repositório do backend**
2. **Revisar e aprovar este documento**
3. **Iniciar Fase 1: Setup e Infraestrutura**
4. **Definir arquitetura de microserviços (se necessário)**
5. **Documentar decisões técnicas**

---

## 📚 Referências

- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md)
- [FRONTEND_DATA_MAPPING.md](./FRONTEND_DATA_MAPPING.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
- Binance API Documentation
- TAAPI.IO Documentation
- Prisma Documentation
- Bull Queue Documentation

---

**Última Atualização**: 29 de Outubro de 2025  
**Versão**: 1.0  
**Status**: 📋 Pronto para Implementação
