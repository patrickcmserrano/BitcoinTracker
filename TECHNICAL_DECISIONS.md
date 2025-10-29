# 🔧 Decisões Técnicas - Backend Trading Brain

## 📋 Visão Geral

Este documento registra todas as decisões técnicas importantes tomadas durante o desenvolvimento do backend, incluindo justificativas e alternativas consideradas.

**Data**: 29 de Outubro de 2025

---

## 🗄️ Decisões de Banco de Dados

### PostgreSQL como Banco Principal

**Decisão**: Usar PostgreSQL 15+ como banco de dados principal

**Justificativa**:
- ✅ **Time Series**: Excelente para dados de séries temporais (OHLCV)
- ✅ **JSONB**: Suporte a dados semi-estruturados (indicadores, configurações)
- ✅ **Índices Potentes**: B-tree, GiST, GIN para queries rápidas
- ✅ **Particionamento**: Escala horizontal para dados históricos
- ✅ **Transações ACID**: Consistência de dados financeiros
- ✅ **Maturidade**: Battle-tested, comunidade grande, bem documentado
- ✅ **Prisma ORM**: Excelente integração com TypeScript

**Alternativas Consideradas**:
- ❌ **MongoDB**: 
  - Menos eficiente para time series
  - Joins complexos são lentos
  - Dados financeiros precisam de estrutura rígida
- ❌ **TimescaleDB**: 
  - Excelente para time series, mas adiciona complexidade
  - PostgreSQL puro é suficiente para nossa escala inicial
  - Podemos migrar no futuro se necessário
- ❌ **InfluxDB**:
  - Especializado em time series, mas menos flexível
  - Não suporta bem relacionamentos complexos
  - Curva de aprendizado adicional

**Estrutura de Dados**:
```sql
-- Dados Hot (acesso frequente)
- MarketData (snapshot atual)
- FuturesData (dados recentes)
- Indicators (cálculos recentes)

-- Dados Warm (acesso moderado)
- OHLCV (1m, 5m, 15m últimos 7-30 dias)

-- Dados Cold (acesso raro)
- OHLCV histórico (1h, 4h, 1d, 1w)
- Análises históricas
- Backtest results
```

---

### Redis como Cache Distribuído

**Decisão**: Usar Redis 7+ para cache e pub/sub

**Justificativa**:
- ✅ **Performance**: Sub-milissegundo de latência
- ✅ **TTL Automático**: Expira cache automaticamente
- ✅ **Estruturas de Dados**: Strings, Hashes, Lists, Sets, Sorted Sets
- ✅ **Pub/Sub**: Para notificações real-time (futura WebSocket)
- ✅ **Bull Queue**: Integração nativa para background jobs
- ✅ **Persistência Opcional**: RDB + AOF para durabilidade

**Estrutura de Cache**:
```typescript
// Cache Keys Pattern
crypto:snapshot:{symbol}           // TTL: 15s
crypto:ohlcv:{symbol}:{interval}   // TTL: 1h
indicators:{symbol}:{interval}     // TTL: 5min
futures:{symbol}                   // TTL: 60s
market:feargreed                   // TTL: 5min
market:dominance                   // TTL: 5min
atr:daily:{symbol}                 // TTL: 24h (smart)
```

**Cache Invalidation**:
```typescript
// 1. Time-based (automático)
await redis.setex(key, ttl, value);

// 2. Event-based (manual)
await redis.del(`crypto:snapshot:${symbol}`);
await redis.del(`crypto:*`); // Pattern matching

// 3. Cache-aside pattern
const cached = await redis.get(key);
if (!cached) {
  const fresh = await fetchFromAPI();
  await redis.setex(key, ttl, JSON.stringify(fresh));
  return fresh;
}
return JSON.parse(cached);
```

---

## 🏗️ Decisões de Arquitetura

### Arquitetura Monolítica (Inicial)

**Decisão**: Começar com arquitetura monolítica bem estruturada

**Justificativa**:
- ✅ **Simplicidade**: Desenvolvimento mais rápido
- ✅ **Deploy Simples**: Uma aplicação para gerenciar
- ✅ **Performance**: Sem latência de rede entre serviços
- ✅ **Facilidade de Debug**: Stack trace completo
- ✅ **Custo**: Menor custo de infraestrutura
- ✅ **Transações**: ACID transactions sem distributed transactions

**Estrutura Modular**:
```typescript
// Mantemos modularidade para futura migração
src/
  services/       // Business logic isolada
  adapters/       // APIs externas isoladas
  controllers/    // Thin controllers
  routes/         // REST endpoints
```

**Quando Migrar para Microserviços**:
- Quando tivermos > 100k requisições/min
- Quando precisarmos escalar componentes independentemente
- Quando tivermos múltiplos times trabalhando
- Quando latência entre serviços for aceitável

**Preparação para Microserviços**:
- Serviços desacoplados via interfaces
- Sem dependências circulares
- Comunicação via eventos (event bus)
- Cada service pode virar um microservice

---

### Background Jobs com Bull Queue

**Decisão**: Usar Bull para processamento assíncrono

**Justificativa**:
- ✅ **Baseado em Redis**: Já usamos Redis
- ✅ **Retry Logic**: Automático com backoff exponencial
- ✅ **Priorização**: Filas com prioridades
- ✅ **Concorrência**: Controle fino de workers
- ✅ **Dashboard**: Bull Board para monitoramento
- ✅ **Rate Limiting**: Built-in rate limiter
- ✅ **Cron Jobs**: Agendamento de tarefas periódicas

**Alternativas Consideradas**:
- ❌ **Agenda**: Baseado em MongoDB (dependência extra)
- ❌ **Node-cron**: Muito simples, sem retry/monitoring
- ❌ **RabbitMQ**: Overhead desnecessário para nossa escala

**Estrutura de Jobs**:
```typescript
// Job Definitions
dataCollectorJob.every('15 seconds', handler);
indicatorCalculatorJob.every('1 minute', handler);
futuresUpdaterJob.every('1 minute', handler);
marketIndicatorsJob.every('5 minutes', handler);
taapiSyncJob.cron('0 0 * * *', handler); // Diário UTC 00:00
cleanupJob.every('1 hour', handler);

// Job Priority
{
  priority: 1,  // Real-time data
  priority: 5,  // Indicators
  priority: 10  // Cleanup
}

// Retry Strategy
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
}
```

---

### REST API (Não GraphQL)

**Decisão**: API REST ao invés de GraphQL

**Justificativa**:
- ✅ **Simplicidade**: Frontend já usa REST
- ✅ **Cache**: HTTP caching funciona out-of-the-box
- ✅ **Ferramentas**: Melhor suporte de ferramentas (Postman, curl)
- ✅ **Performance Previsível**: Sem problema de N+1 queries
- ✅ **Documentação**: Swagger/OpenAPI bem estabelecido
- ✅ **Rate Limiting**: Mais fácil de implementar

**Quando Considerar GraphQL**:
- Quando tivermos múltiplos clientes com necessidades diferentes
- Quando over-fetching for um problema real
- Quando precisarmos de subscriptions complexos

**Versionamento de API**:
```typescript
/api/v1/crypto/:symbol      // Versão atual
/api/v2/crypto/:symbol      // Futuro (breaking changes)

Headers:
- Accept: application/json
- API-Version: v1
```

---

## 📊 Decisões de Dados

### Política de Retenção de Dados

**Decisão**: Retenção baseada no timeframe e uso

**Estrutura**:
```typescript
// OHLCV Data
1m candles:  7 dias   (10,080 candles)
5m candles:  30 dias  (8,640 candles)
15m candles: 90 dias  (8,640 candles)
1h candles:  1 ano    (8,760 candles)
4h candles:  2 anos   (4,380 candles)
1d candles:  Forever  (histórico completo)
1w candles:  Forever  (histórico completo)

// Indicators
1h interval: 30 dias
4h interval: 90 dias
1d interval: 1 ano
1w interval: Forever

// Futures Data
Current snapshot: Always
Historical: 90 dias

// Market Indicators
Fear & Greed: 1 ano
BTC Dominance: 1 ano

// Logs
Application logs: 30 dias
Error logs: 90 dias
Access logs: 7 dias
```

**Agregação de Dados**:
```typescript
// Após período de retenção, agregar dados
Daily Summary:
- High, Low, Open, Close, Volume
- Indicadores médios
- Sentimento predominante

Weekly Summary:
- High, Low, Open, Close, Volume
- Range de indicadores
- Análise de tendência
```

---

### JSONB vs Colunas Separadas

**Decisão**: Híbrido - colunas para queries, JSONB para flexibilidade

**Estratégia**:
```typescript
// Colunas Separadas (queries frequentes)
model MarketData {
  price: Decimal         // WHERE price > X
  volume24h: Decimal     // ORDER BY volume24h
  timestamp: DateTime    // WHERE timestamp BETWEEN X AND Y
}

// JSONB (dados flexíveis)
model MarketData {
  timeframes: Json       // Timeframes podem mudar
  recentPrices: Json     // Array de preços
}

model Indicator {
  data: Json             // Indicadores podem crescer
  trend: String          // WHERE trend = 'bullish'
}
```

**Benefícios**:
- ✅ Queries rápidas em colunas indexadas
- ✅ Flexibilidade para adicionar dados
- ✅ Menos migrations para mudanças no schema
- ✅ Melhor compatibilidade com TypeScript

---

## 🔒 Decisões de Segurança

### Rate Limiting

**Decisão**: Rate limiting por IP e por endpoint

**Implementação**:
```typescript
// Global rate limit
app.use(rateLimit({
  windowMs: 60000,        // 1 minuto
  max: 100,               // 100 requisições
  message: 'Too many requests'
}));

// Per-endpoint rate limit
router.get('/crypto/:symbol',
  rateLimit({ windowMs: 1000, max: 10 }), // 10 req/s
  controller
);

// Per-user rate limit (futuro)
router.get('/premium/:symbol',
  authenticateUser,
  rateLimitByUser({ windowMs: 60000, max: 1000 }),
  controller
);
```

---

### CORS

**Decisão**: CORS restrito por ambiente

**Configuração**:
```typescript
// Development
cors({
  origin: 'http://localhost:5173',
  credentials: true
});

// Production
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
});
```

---

### Validação de Dados

**Decisão**: Validação em múltiplas camadas

**Camadas**:
```typescript
// 1. Schema validation (Zod)
const CryptoSymbolSchema = z.object({
  symbol: z.enum(['BTC', 'ETH', 'SOL', 'XRP', 'PAXG', 'TRX']),
  interval: z.enum(['1h', '4h', '1d', '1w']).optional()
});

// 2. Business logic validation
if (!isCryptoSupported(symbol)) {
  throw new ValidationError('Crypto not supported');
}

// 3. Database constraints
@unique([cryptoConfigId, interval, openTime])
```

---

## 📈 Decisões de Performance

### Database Indexing Strategy

**Decisão**: Índices estratégicos para queries comuns

**Índices Principais**:
```sql
-- Market Data
CREATE INDEX idx_market_data_crypto_time 
  ON market_data(crypto_config_id, timestamp DESC);

-- OHLCV
CREATE INDEX idx_ohlcv_crypto_interval_time 
  ON ohlcv(crypto_config_id, interval, open_time DESC);

-- Indicators
CREATE INDEX idx_indicators_crypto_interval_time 
  ON indicators(crypto_config_id, interval, timestamp DESC);

-- Futures Data
CREATE INDEX idx_futures_crypto_time 
  ON futures_data(crypto_config_id, timestamp DESC);

-- Composite Index para queries complexas
CREATE INDEX idx_ohlcv_query 
  ON ohlcv(crypto_config_id, interval, open_time DESC) 
  INCLUDE (close, volume);
```

---

### Connection Pooling

**Decisão**: Pool size baseado em carga esperada

**Configuração**:
```typescript
// Prisma connection pool
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Environment config
DATABASE_POOL_SIZE=20          // Desenvolvimento
DATABASE_POOL_SIZE=50          // Produção
DATABASE_POOL_SIZE=100         // Alta carga

// Formula: 
// Pool Size = ((core_count * 2) + effective_spindle_count)
```

---

### Query Optimization

**Decisão**: Otimização progressiva baseada em metrics

**Técnicas**:
```typescript
// 1. Select apenas colunas necessárias
const data = await prisma.marketData.findMany({
  select: {
    price: true,
    volume24h: true,
    timestamp: true
  }
});

// 2. Pagination
const data = await prisma.ohlcv.findMany({
  take: 200,
  skip: offset,
  orderBy: { openTime: 'desc' }
});

// 3. Cursor-based pagination (large datasets)
const data = await prisma.ohlcv.findMany({
  take: 200,
  cursor: { id: lastId },
  orderBy: { openTime: 'desc' }
});

// 4. Raw queries para agregações complexas
const result = await prisma.$queryRaw`
  SELECT 
    DATE_TRUNC('hour', open_time) as hour,
    AVG(close) as avg_price,
    SUM(volume) as total_volume
  FROM ohlcv
  WHERE crypto_config_id = ${cryptoId}
    AND open_time >= NOW() - INTERVAL '24 hours'
  GROUP BY hour
  ORDER BY hour DESC
`;
```

---

## 🔧 Decisões de DevOps

### Environment Management

**Decisão**: Múltiplos ambientes com configs separadas

**Ambientes**:
```typescript
// Development
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/trading_dev
REDIS_URL=redis://localhost:6379/0
LOG_LEVEL=debug

// Staging
NODE_ENV=staging
DATABASE_URL=postgresql://staging-db:5432/trading_staging
REDIS_URL=redis://staging-redis:6379/0
LOG_LEVEL=info

// Production
NODE_ENV=production
DATABASE_URL=postgresql://prod-db:5432/trading_prod
REDIS_URL=redis://prod-redis:6379/0
LOG_LEVEL=warn
```

---

### Process Management

**Decisão**: PM2 para gerenciamento de processos

**Configuração** (`ecosystem.config.js`):
```javascript
module.exports = {
  apps: [{
    name: 'trading-backend',
    script: './dist/index.js',
    instances: 'max',           // Cluster mode
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

**Alternativas**:
- Docker + Docker Compose (mais isolamento)
- Kubernetes (overkill para escala inicial)

---

### Logging Strategy

**Decisão**: Winston para logging estruturado

**Configuração**:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console (development)
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    
    // File (production)
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    })
  ]
});
```

---

## 🧪 Decisões de Testes

### Testing Strategy

**Decisão**: Pirâmide de testes com foco em integração

**Estrutura**:
```
70% - Unit Tests (services, utils)
20% - Integration Tests (API endpoints)
10% - E2E Tests (critical paths)
```

**Ferramentas**:
```typescript
// Unit Tests: Jest + ts-jest
describe('IndicatorService', () => {
  it('should calculate MACD correctly', () => {
    const result = service.calculateMACD(ohlcv);
    expect(result.MACD).toBeCloseTo(123.45, 2);
  });
});

// Integration Tests: Supertest
describe('GET /api/v1/crypto/:symbol', () => {
  it('should return crypto data', async () => {
    const response = await request(app)
      .get('/api/v1/crypto/BTC')
      .expect(200);
    expect(response.body).toHaveProperty('price');
  });
});

// E2E Tests: Playwright (já existe no frontend)
```

---

## 📚 Decisões de Documentação

### API Documentation

**Decisão**: Swagger/OpenAPI 3.0

**Ferramentas**:
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const specs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Trading Brain API',
      version: '1.0.0',
    },
  },
  apis: ['./src/routes/*.ts'],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

**Acessível em**: `http://localhost:3000/api-docs`

---

## 🔄 Próximas Decisões a Tomar

### Em Aberto
1. **Autenticação**: JWT vs Session-based?
2. **WebSocket**: Socket.io vs ws?
3. **Deploy**: VPS vs Cloud (AWS/GCP/Azure)?
4. **Monitoramento**: Prometheus vs Datadog?
5. **CI/CD**: GitHub Actions vs GitLab CI?

---

**Última Atualização**: 29 de Outubro de 2025  
**Versão**: 1.0  
**Status**: 🔧 Em Evolução
