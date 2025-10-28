# 🚀 Plano de Implementação - Trading Bot Backend

## 📅 Timeline Geral: 6 Semanas

---

## 🎯 Fase 1: Setup Inicial (Semana 1)

### Dia 1-2: Estrutura do Projeto

#### Criar novo repositório
```bash
mkdir trading-bot-backend
cd trading-bot-backend
npm init -y
```

#### Instalar dependências principais
```bash
# Core
npm install express typescript ts-node @types/node @types/express

# Database
npm install @prisma/client
npm install -D prisma

# Cache & Queue
npm install redis ioredis bull
npm install -D @types/redis @types/bull

# HTTP Client
npm install axios

# Utilities
npm install dotenv cors helmet express-rate-limit
npm install date-fns

# Development
npm install -D nodemon tsx
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier

# Testing
npm install -D jest @types/jest ts-jest
npm install -D supertest @types/supertest
```

#### Configurar TypeScript
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### Estrutura de pastas
```bash
mkdir -p src/{config,models,services,controllers,routes,jobs,middleware,utils}
mkdir -p src/services/{binance,taapi,market,indicators,cache,ccxt}
mkdir -p tests/{unit,integration}
mkdir -p prisma
```

### Dia 3-4: Setup Database & Redis

#### Configurar Prisma
```bash
npx prisma init
```

#### Criar schema.prisma completo
- Copiar schema do documento BACKEND_ARCHITECTURE.md
- Ajustar conforme necessário

#### Setup PostgreSQL (Docker)
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: trading_brain
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

#### Iniciar serviços
```bash
docker-compose up -d
```

#### Criar migrations
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Dia 5: Configuração Base

#### Criar arquivos de config
```typescript
// src/config/database.ts
// src/config/redis.ts
// src/config/apis.ts
// src/config/env.ts
```

#### Setup .env
```bash
# .env.example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trading_brain"
REDIS_URL="redis://localhost:6379"

TAAPI_SECRET_KEY="your_key_here"
BINANCE_API_KEY=""
BINANCE_SECRET_KEY=""

PORT=3000
NODE_ENV="development"
LOG_LEVEL="debug"

CACHE_DEFAULT_TTL=60000
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Entry point básico
```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
```

---

## 🎯 Fase 2: Serviços de APIs Externas (Semana 2)

### Dia 1-2: Binance Spot Service

#### Criar serviço base
```typescript
// src/services/binance/spot.service.ts
- getBinanceKlines()
- getTicker24hr()
- processKlineData()
- calculateAmplitude()
- calculateVolume()
- calculatePercentChange()
```

#### Implementar cache Redis
```typescript
// src/services/cache/redis.service.ts
- get()
- set()
- del()
- exists()
- ttl()
```

#### Testes unitários
```typescript
// tests/unit/binance-spot.test.ts
```

### Dia 3: Binance Futures Service

#### Criar serviço
```typescript
// src/services/binance/futures.service.ts
- getFundingRate()
- getOpenInterest()
- getLongShortAccountRatio()
- getTopTraderPositionRatio()
- getBinanceFuturesData()
```

#### Testes
```typescript
// tests/unit/binance-futures.test.ts
```

### Dia 4: TAAPI Service

#### Migrar lógica do frontend
```typescript
// src/services/taapi/taapi.service.ts
- getATR()
- Smart caching (até próximo dia UTC)
- Rate limiting
- Fallback to stale cache
```

#### Testes
```typescript
// tests/unit/taapi.test.ts
```

### Dia 5: Market Services

#### Alternative.me Service
```typescript
// src/services/market/fear-greed.service.ts
- getFearGreedIndex()
- classifyFearGreed()
- calculateChange()
```

#### CoinGecko Service
```typescript
// src/services/market/coingecko.service.ts
- getBTCDominance()
- getCryptoRanking()
```

#### Aggregator Service
```typescript
// src/services/market/market-indicators.service.ts
- getMarketIndicators() // agrega tudo
```

---

## 🎯 Fase 3: Processamento de Dados (Semana 3)

### Dia 1-2: Klines Processor

#### Criar processador
```typescript
// src/services/binance/klines.processor.ts
- processMultipleTimeframes()
- aggregateKlines()
- calculateMetrics()
```

#### Salvar no banco
```typescript
// Save processed data to PostgreSQL
- MarketData model
- OHLCV model
```

### Dia 3-4: Indicator Calculator

#### Implementar cálculos
```typescript
// src/services/indicators/calculator.ts
// Usar biblioteca technicalindicators (mesma do frontend)

- calculateMACD()
- calculateRSI()
- calculateATR()
- calculateSMA()
- calculateEMA()
- calculateStochastic()
- calculateBollingerBands()
- determineTrend()
```

#### Technical Service
```typescript
// src/services/indicators/technical.service.ts
- calculateTechnicalIndicators()
- calculateIndicatorSeries()
- interpretIndicators()
```

### Dia 5: Triple Screen Analyzer

#### Implementar análise
```typescript
// src/services/indicators/triple-screen.service.ts
- analyzeScreen1() // 1 week
- analyzeScreen2() // 1 day
- analyzeScreen3() // 4 hour
- getRecommendation() // BUY/SELL/HOLD
```

---

## 🎯 Fase 4: API REST (Semana 4)

### Dia 1: Controllers - Crypto

#### Criar controller
```typescript
// src/controllers/crypto.controller.ts

GET /api/v1/crypto/:symbol
GET /api/v1/crypto/:symbol/ohlcv
```

#### Routes
```typescript
// src/routes/crypto.routes.ts
```

### Dia 2: Controllers - Indicators

#### Criar controller
```typescript
// src/controllers/indicators.controller.ts

GET /api/v1/indicators/:symbol
GET /api/v1/indicators/:symbol/triple-screen
```

#### Routes
```typescript
// src/routes/indicators.routes.ts
```

### Dia 3: Controllers - Futures

#### Criar controller
```typescript
// src/controllers/futures.controller.ts

GET /api/v1/futures/:symbol
```

#### Routes
```typescript
// src/routes/futures.routes.ts
```

### Dia 4: Controllers - Market

#### Criar controller
```typescript
// src/controllers/market.controller.ts

GET /api/v1/market/indicators
GET /api/v1/market/fear-greed
GET /api/v1/market/dominance
```

#### Routes
```typescript
// src/routes/market.routes.ts
```

### Dia 5: Middlewares & Docs

#### Implementar middlewares
```typescript
// src/middleware/error-handler.ts
// src/middleware/rate-limiter.ts
// src/middleware/logger.ts
// src/middleware/validator.ts
```

#### Swagger/OpenAPI
```bash
npm install swagger-ui-express swagger-jsdoc
```

#### Documentar endpoints
```typescript
// src/docs/swagger.ts
```

---

## 🎯 Fase 5: Background Jobs (Semana 5)

### Dia 1: Setup Bull Queue

#### Configurar Bull
```typescript
// src/config/queue.ts
import Bull from 'bull';

export const dataCollectorQueue = new Bull('data-collector', REDIS_URL);
export const indicatorCalculatorQueue = new Bull('indicator-calculator', REDIS_URL);
// ... outros queues
```

### Dia 2: Data Collector Job

#### Implementar job
```typescript
// src/jobs/data-collector.job.ts

- Buscar dados de todas as criptos configuradas
- Processar klines de múltiplos timeframes
- Salvar no PostgreSQL
- Atualizar cache Redis
- Frequência: 15 segundos
```

### Dia 3: Indicator Calculator Job

#### Implementar job
```typescript
// src/jobs/indicator-calculator.job.ts

- Buscar dados OHLCV do banco
- Calcular todos os indicadores técnicos
- Salvar indicadores no banco
- Atualizar cache
- Frequência: 1 minuto
```

### Dia 4: Outros Jobs

#### Futures Updater
```typescript
// src/jobs/futures-updater.job.ts
- Frequência: 1 minuto
```

#### Market Indicators
```typescript
// src/jobs/market-indicators.job.ts
- Frequência: 5 minutos
```

#### TAAPI Sync
```typescript
// src/jobs/taapi-sync.job.ts
- Frequência: Diário (UTC 00:00)
```

### Dia 5: Monitoring & Cleanup

#### Historical Archiver
```typescript
// src/jobs/historical-archiver.job.ts
- Agregar dados antigos
- Implementar retention policy
```

#### Cleanup Job
```typescript
// src/jobs/cleanup.job.ts
- Limpar cache expirado
- Limpar logs antigos
```

#### Bull Board (UI para monitorar jobs)
```bash
npm install @bull-board/express
```

---

## 🎯 Fase 6: Integração Frontend (Semana 6)

### Dia 1-2: Criar Service Layer no Frontend

#### Criar novo serviço
```typescript
// frontend/src/lib/backend-api.ts

class BackendApiService {
  private baseUrl = 'http://localhost:3000/api/v1';
  
  async getCryptoData(symbol: string): Promise<CryptoData> {
    const response = await fetch(`${this.baseUrl}/crypto/${symbol}`);
    return response.json();
  }
  
  async getIndicators(symbol: string, interval: string): Promise<Indicators> {
    const response = await fetch(`${this.baseUrl}/indicators/${symbol}?interval=${interval}`);
    return response.json();
  }
  
  async getFuturesData(symbol: string): Promise<FuturesData> {
    const response = await fetch(`${this.baseUrl}/futures/${symbol}`);
    return response.json();
  }
  
  async getMarketIndicators(): Promise<MarketIndicators> {
    const response = await fetch(`${this.baseUrl}/market/indicators`);
    return response.json();
  }
}

export const backendApi = new BackendApiService();
```

### Dia 3: Atualizar Componentes

#### Atualizar componentes principais
```typescript
// CryptoTracker.svelte
- Usar backendApi.getCryptoData()

// TechnicalIndicators.svelte
- Usar backendApi.getIndicators()

// BinanceFuturesWidget.svelte
- Usar backendApi.getFuturesData()

// MarketIndicators.svelte
- Usar backendApi.getMarketIndicators()
```

### Dia 4: Remover Código Antigo

#### Limpar arquivos não usados
```bash
# Manter apenas para referência:
- crypto-api.ts (adaptar)
- binance-futures-api.ts (adaptar)
- market-indicators.ts (adaptar)

# Remover ou deprecar:
- taapi-service.ts (movido para backend)
- Direct Binance API calls
```

### Dia 5: Testes End-to-End

#### Testar fluxo completo
- [ ] Frontend → Backend → Database
- [ ] Cache funcionando
- [ ] Rate limiting funcionando
- [ ] Error handling
- [ ] Performance (latência < 100ms)

---

## 🧪 Testing Strategy

### Unit Tests
```bash
# Backend
npm run test:unit

# Coverage target: > 80%
- Services: 100%
- Controllers: 90%
- Utils: 100%
```

### Integration Tests
```bash
npm run test:integration

# Testar:
- API endpoints
- Database operations
- Redis cache
- External APIs (mocked)
```

### E2E Tests
```bash
# Frontend (Playwright)
npm run e2e

# Testar:
- Fluxo completo de dados
- UI updates
- Error states
```

---

## 📦 Deployment

### Docker Setup

#### Backend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

#### Docker Compose (Produção)
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - TAAPI_SECRET_KEY=${TAAPI_SECRET_KEY}
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: trading_brain
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### CI/CD Pipeline

#### GitHub Actions
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run build
```

---

## 📊 Monitoramento

### Métricas a Coletar

#### Application Metrics
- Request rate (req/s)
- Response time (p50, p95, p99)
- Error rate (%)
- Cache hit rate (%)

#### Business Metrics
- API calls per minute
- Data freshness (latency)
- Job execution time
- Queue depth

#### Infrastructure Metrics
- CPU usage
- Memory usage
- Disk I/O
- Network I/O
- Database connections
- Redis memory

### Alertas

#### Critical
- API down > 5 minutes
- Database connection lost
- Redis connection lost
- Error rate > 5%

#### Warning
- Response time > 500ms (p95)
- Cache hit rate < 70%
- Job queue depth > 100
- Disk usage > 80%

---

## 🎯 Próximos Passos Imediatos

### Esta Semana (Semana 1)
1. [ ] Criar repositório `trading-bot-backend`
2. [ ] Setup estrutura inicial
3. [ ] Configurar TypeScript, ESLint, Prettier
4. [ ] Setup Docker (PostgreSQL + Redis)
5. [ ] Criar schema Prisma completo
6. [ ] Rodar migrations
7. [ ] Criar entry point básico
8. [ ] Testar conexões (DB + Redis)

### Próxima Semana (Semana 2)
1. [ ] Implementar Binance Spot Service
2. [ ] Implementar Binance Futures Service
3. [ ] Implementar TAAPI Service
4. [ ] Implementar Market Services
5. [ ] Setup Redis Cache
6. [ ] Testes unitários

---

## 📚 Recursos e Referências

### Documentação
- [Prisma Docs](https://www.prisma.io/docs)
- [Bull Queue](https://github.com/OptimalBits/bull)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

### APIs
- [Binance API Docs](https://binance-docs.github.io/apidocs/spot/en/)
- [Binance Futures API](https://binance-docs.github.io/apidocs/futures/en/)
- [TAAPI.IO Docs](https://taapi.io/documentation/)
- [Alternative.me API](https://alternative.me/crypto/fear-and-greed-index/)
- [CoinGecko API](https://www.coingecko.com/en/api/documentation)

### Libraries
- [technicalindicators](https://github.com/anandanand84/technicalindicators)
- [CCXT](https://github.com/ccxt/ccxt)

---

**Criado em**: 28 de Outubro de 2025  
**Versão**: 1.0  
**Status**: 📋 Pronto para Execução

**Responsável**: Equipe de Desenvolvimento  
**Prazo Estimado**: 6 semanas  
**Data Início**: A definir  
**Data Fim Prevista**: A definir
