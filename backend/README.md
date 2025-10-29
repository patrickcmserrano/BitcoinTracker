# 🚀 Trading Backend - Brain for CCXT/Freqtrade

Backend centralizado Node.js para sistema de trading com integração CCXT e Freqtrade.

## 📋 Features

- ✅ APIs de múltiplas exchanges via adapters
- ✅ Cálculo de indicadores técnicos (MACD, RSI, SMA, EMA, etc)
- ✅ Análise Triple Screen (Elder)
- ✅ Dados de Futures (Funding Rate, Open Interest, LSR)
- ✅ Cache distribuído com Redis
- ✅ Background jobs com Bull Queue
- ✅ REST API completa
- 🔄 Preparado para CCXT
- 🔄 Preparado para Freqtrade

## 🏗️ Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **Cache**: Redis 7+
- **Queue**: Bull (Redis-based)
- **ORM**: Prisma
- **Deploy**: Render.com

## 🚀 Quick Start

### 1. Setup com Docker (Recomendado)

```bash
# Clone o repositório
cd backend

# Copiar .env
cp .env.example .env

# Editar .env com suas configurações
# Especialmente: TAAPI_SECRET_KEY

# Iniciar PostgreSQL e Redis
npm run docker:up

# Instalar dependências
npm install

# Gerar Prisma Client
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate

# Iniciar em modo desenvolvimento
npm run dev
```

### 2. Setup Manual (sem Docker)

```bash
# Instalar PostgreSQL 15+ e Redis 7+

# Configurar DATABASE_URL no .env
# Exemplo: postgresql://user:password@localhost:5432/trading_brain

# Configurar REDIS_URL no .env
# Exemplo: redis://localhost:6379

# Instalar dependências
npm install

# Gerar Prisma Client
npm run prisma:generate

# Rodar migrations
npm run prisma:migrate

# Iniciar em modo desenvolvimento
npm run dev
```

## 📡 API Endpoints

### Health Check
```
GET /api/v1/health
```

### Crypto Data
```
GET /api/v1/crypto
GET /api/v1/crypto/:symbol
GET /api/v1/crypto/:symbol/ohlcv
```

### Indicators
```
GET /api/v1/indicators/:symbol
GET /api/v1/indicators/:symbol/triple-screen
```

### Futures
```
GET /api/v1/futures/:symbol
```

### Market
```
GET /api/v1/market/indicators
GET /api/v1/market/fear-greed
GET /api/v1/market/dominance
```

## 🧪 Testes

```bash
# Rodar todos os testes
npm test

# Testes em modo watch
npm run test:watch

# Coverage
npm run test:coverage
```

## 🐳 Docker

```bash
# Subir apenas banco e Redis
npm run docker:up

# Ver logs
npm run docker:logs

# Parar containers
npm run docker:down
```

## 🌐 Deploy no Render

### 1. Preparação

1. Criar conta no [Render.com](https://render.com)
2. Conectar repositório GitHub
3. Criar PostgreSQL Database
4. Criar Redis instance
5. Criar Web Service

### 2. Configuração do Web Service

```yaml
Build Command: npm install && npm run build && npm run prisma:generate && npm run prisma:migrate:deploy
Start Command: npm start
```

### 3. Environment Variables

Configurar no Render Dashboard:
- `NODE_ENV=production`
- `PORT=3000` (auto-configurado)
- `DATABASE_URL` (auto-configurado pelo Render Postgres)
- `REDIS_URL` (auto-configurado pelo Render Redis)
- `TAAPI_SECRET_KEY=your_key`
- `CORS_ORIGIN=https://your-frontend.com`

## 📊 Estrutura de Pastas

```
backend/
├── src/
│   ├── config/          # Configurações
│   ├── services/        # Business Logic
│   ├── adapters/        # APIs Externas
│   ├── controllers/     # REST Controllers
│   ├── routes/          # Express Routes
│   ├── jobs/            # Background Jobs
│   ├── middleware/      # Express Middleware
│   ├── types/           # TypeScript Types
│   ├── utils/           # Utilities
│   └── index.ts         # Entry Point
├── prisma/
│   └── schema.prisma    # Database Schema
├── tests/               # Tests
├── docker-compose.yml   # Docker Setup
├── Dockerfile           # Production Image
└── package.json
```

## 🔧 Scripts Disponíveis

```bash
npm run dev              # Desenvolvimento com hot-reload
npm run build            # Build para produção
npm start                # Iniciar produção
npm test                 # Rodar testes
npm run lint             # Verificar código
npm run format           # Formatar código
npm run docker:up        # Iniciar Docker
npm run prisma:studio    # Prisma GUI
```

## 🌟 Próximas Integrações

### CCXT
- [ ] Configurar CCXT para múltiplas exchanges
- [ ] Unificar dados de OHLCV
- [ ] Sincronizar com backend

### Freqtrade
- [ ] API client para Freqtrade
- [ ] Enviar sinais de trading
- [ ] Receber status de bots
- [ ] Dashboard de performance

## 📝 Documentação

- [BACKEND_ARCHITECTURE.md](../BACKEND_ARCHITECTURE.md)
- [MIGRATION_STRATEGY.md](../MIGRATION_STRATEGY.md)
- [TECHNICAL_DECISIONS.md](../TECHNICAL_DECISIONS.md)

## 🤝 Contributing

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 License

MIT
