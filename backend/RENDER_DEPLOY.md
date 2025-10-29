# 🚢 Deploy no Render.com - Guia Completo

## 📋 Visão Geral

Este guia cobre o deploy completo do backend no Render.com, incluindo:
- PostgreSQL Database
- Redis Instance
- Web Service (Backend API)

**Custo Estimado (Render Free Tier):**
- PostgreSQL: $0 (free tier) ou $7/mês (starter)
- Redis: $0 (free tier) ou $10/mês (starter)  
- Web Service: $0 (free tier - 750h/mês)

**Total Free Tier:** $0/mês  
**Total Starter (recomendado prod):** ~$17/mês

---

## 🔐 Pré-requisitos

1. ✅ Conta no [Render.com](https://render.com)
2. ✅ Repositório GitHub com o código
3. ✅ Chave TAAPI.IO (se usar)

---

## 📦 Passo 1: Criar PostgreSQL Database

### 1.1 No Dashboard do Render

1. Click **"New +"** → **"PostgreSQL"**
2. Preencher:
   - **Name:** `trading-brain-db`
   - **Database:** `trading_brain`
   - **User:** `trading_user`
   - **Region:** `Ohio (US East)` ou mais próximo
   - **PostgreSQL Version:** `15`
   - **Plan:** `Free` ou `Starter` ($7/mês)

3. Click **"Create Database"**

### 1.2 Aguardar Provisão

- Leva ~2-5 minutos
- Status muda para **"Available"**

### 1.3 Copiar Connection String

Na página do database, copie:
- **Internal Database URL** (para usar dentro do Render)
- **External Database URL** (para conectar localmente)

Formato:
```
postgresql://trading_user:***@dpg-xxx.oregon-postgres.render.com/trading_brain
```

**Importante:** Guarde essa URL, você vai precisar depois!

---

## 📦 Passo 2: Criar Redis Instance

### 2.1 No Dashboard do Render

1. Click **"New +"** → **"Redis"**
2. Preencher:
   - **Name:** `trading-brain-redis`
   - **Region:** `Ohio (US East)` (mesmo do PostgreSQL)
   - **Plan:** `Free` ou `Starter` ($10/mês)
   - **Maxmemory Policy:** `allkeys-lru`

3. Click **"Create Redis"**

### 2.2 Aguardar Provisão

- Leva ~1-2 minutos
- Status muda para **"Available"**

### 2.3 Copiar Connection String

Na página do Redis, copie:
- **Internal Redis URL**

Formato:
```
redis://red-xxx:6379
```

---

## 📦 Passo 3: Criar Web Service (Backend API)

### 3.1 No Dashboard do Render

1. Click **"New +"** → **"Web Service"**
2. Connect ao seu repositório GitHub
3. Selecionar o repositório `BitcoinTracker`

### 3.2 Configurar Web Service

**Basic Configuration:**
- **Name:** `trading-backend-api`
- **Region:** `Ohio (US East)` (mesmo dos outros)
- **Branch:** `main`
- **Root Directory:** `backend`
- **Runtime:** `Node`
- **Build Command:** 
  ```
  npm install && npm run build && npm run prisma:generate && npm run prisma:migrate:deploy
  ```
- **Start Command:**
  ```
  npm start
  ```

**Advanced:**
- **Auto-Deploy:** `Yes` (auto deploy ao fazer push)
- **Health Check Path:** `/api/v1/health`
- **Plan:** `Free` ou `Starter` ($7/mês)

### 3.3 Configurar Environment Variables

Click **"Environment"** e adicionar:

```env
NODE_ENV=production
PORT=3000

# Database (copiar do PostgreSQL criado)
DATABASE_URL=postgresql://trading_user:***@dpg-xxx.oregon-postgres.render.com/trading_brain

# Redis (copiar do Redis criado)
REDIS_URL=redis://red-xxx:6379

# APIs Externas
TAAPI_SECRET_KEY=sua_chave_taapi_aqui
BINANCE_API_KEY=
BINANCE_SECRET_KEY=

# Cache
CACHE_DEFAULT_TTL=60000
CACHE_MAX_SIZE=10000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Background Jobs
JOB_CONCURRENCY=5
JOB_DATA_COLLECTOR_INTERVAL=15000
JOB_INDICATOR_CALCULATOR_INTERVAL=60000
JOB_FUTURES_UPDATER_INTERVAL=60000
JOB_MARKET_INDICATORS_INTERVAL=300000

# CORS (URL do seu frontend)
CORS_ORIGIN=https://seu-frontend.netlify.app

# Logging
LOG_LEVEL=info

# CCXT/Freqtrade (Futuro)
CCXT_ENABLED=false
```

### 3.4 Deploy

1. Click **"Create Web Service"**
2. Render vai:
   - Clonar seu repositório
   - Instalar dependências
   - Rodar build
   - Gerar Prisma Client
   - Rodar migrations
   - Iniciar servidor

**Tempo estimado:** 3-5 minutos

---

## ✅ Passo 4: Verificar Deploy

### 4.1 Ver Logs

Na página do Web Service:
- Click **"Logs"**
- Deve ver:
  ```
  ✅ Redis connected
  ✅ Database connected
  🚀 Server running on port 3000
  ```

### 4.2 Testar Health Check

URL do seu backend:
```
https://trading-backend-api.onrender.com
```

Testar:
```
https://trading-backend-api.onrender.com/api/v1/health
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T...",
  "version": "v1",
  "environment": "production",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 🗄️ Passo 5: Popular Banco de Dados

### 5.1 Conectar ao PostgreSQL Remotamente

```powershell
# Instalar psql (se não tiver)
# Download: https://www.postgresql.org/download/windows/

# Conectar usando External Database URL
psql "postgresql://trading_user:***@dpg-xxx.oregon-postgres.render.com/trading_brain"
```

### 5.2 Rodar Seed

```sql
-- Copiar e colar o conteúdo do prisma/seed.sql
INSERT INTO crypto_configs (id, symbol, name, binance_symbol, taapi_symbol, icon, color, precision, active, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'BTC', 'Bitcoin', 'BTCUSDT', 'BTC/USDT', '₿', '#f7931a', 0, true, NOW(), NOW()),
  (gen_random_uuid(), 'ETH', 'Ethereum', 'ETHUSDT', 'ETH/USDT', 'Ξ', '#627eea', 0, true, NOW(), NOW()),
  -- ... resto das criptos
ON CONFLICT (symbol) DO NOTHING;
```

**Ou via Render Dashboard:**
1. Ir no PostgreSQL Database
2. Click **"Connect"** → **"External Connection"**
3. Usar cliente SQL favorito (DBeaver, pgAdmin, etc)

---

## 🔄 Passo 6: Configurar Auto-Deploy (CI/CD)

### 6.1 O que já está configurado

- ✅ Auto-deploy ao fazer push na branch `main`
- ✅ Health check automático
- ✅ Restart automático em caso de crash

### 6.2 Workflow de Deploy

```
1. Fazer mudanças localmente
2. Commit e push para GitHub
   git add .
   git commit -m "feat: adicionar novo endpoint"
   git push origin main
3. Render detecta push automaticamente
4. Inicia build e deploy
5. Testa health check
6. Deploy completo!
```

---

## 📊 Passo 7: Monitoramento

### 7.1 No Dashboard do Render

**Metrics disponíveis:**
- CPU Usage
- Memory Usage
- Request Count
- Response Time

**Logs:**
- Real-time logs
- Filtros por nível (info, warn, error)

### 7.2 Alertas

Configure em **Settings → Notifications:**
- Email ao deploy falhar
- Email quando service fica down
- Slack webhook (opcional)

---

## 🎛️ Configurações Adicionais

### Custom Domain (Opcional)

1. Comprar domínio (ex: api.seudominio.com)
2. No Render: **Settings → Custom Domains**
3. Adicionar `api.seudominio.com`
4. Configurar CNAME no DNS:
   ```
   CNAME api.seudominio.com → trading-backend-api.onrender.com
   ```

### SSL/HTTPS

- ✅ Render fornece SSL gratuito automaticamente
- ✅ Certificado renovado automaticamente
- ✅ Redirect HTTP → HTTPS automático

### Scaling (Upgrade para Starter)

**Free Tier Limitations:**
- ⚠️ Service hiberna após 15 min de inatividade
- ⚠️ First request após hibernar leva ~30s (cold start)
- ⚠️ 750h/mês (suficiente para 1 instância)

**Starter Plan ($7/mês):**
- ✅ Sem hibernação
- ✅ Sempre ativo
- ✅ Mais CPU e RAM
- ✅ Recomendado para produção

---

## 🐛 Troubleshooting

### Build Failed

**Erro:** `npm install` falhou
```powershell
# Verificar package.json está correto
# Verificar Node version no package.json:
"engines": {
  "node": ">=18.0.0"
}
```

**Erro:** Prisma migrations falhou
```powershell
# Verificar DATABASE_URL está correto
# Verificar schema.prisma está no repo
# Ver logs detalhados no Render
```

### Service Not Starting

**Erro:** Health check failed
```powershell
# Verificar /api/v1/health endpoint existe
# Verificar PORT está configurado
# Ver logs do Render
```

**Erro:** Cannot connect to Redis/Database
```powershell
# Verificar REDIS_URL e DATABASE_URL estão corretos
# Verificar services estão no mesmo region
# Testar conexão manualmente
```

### Performance Issues

**Sintomas:** API lenta, timeouts
```powershell
# Upgrade para Starter plan
# Verificar logs de erro
# Otimizar queries do banco
# Aumentar cache TTL
```

---

## 📈 Próximos Passos

### 1. Monitoramento Avançado

Adicionar:
- [ ] Sentry (error tracking)
- [ ] Datadog (APM)
- [ ] Prometheus + Grafana

### 2. Backup

- [ ] Configurar backup automático do PostgreSQL
- [ ] Export de dados periódico
- [ ] Disaster recovery plan

### 3. Staging Environment

- [ ] Criar branch `staging`
- [ ] Deploy automático para staging
- [ ] Testar antes de produção

---

## 💰 Resumo de Custos

### Free Tier (Desenvolvimento)
```
PostgreSQL: $0
Redis: $0
Web Service: $0
Total: $0/mês
```

### Starter Tier (Produção)
```
PostgreSQL: $7/mês (50GB)
Redis: $10/mês (250MB)
Web Service: $7/mês (sempre ativo)
Total: $24/mês
```

### Pro Tier (Escala)
```
PostgreSQL: $20/mês (100GB)
Redis: $25/mês (1GB)
Web Service: $25/mês (mais recursos)
Total: $70/mês
```

---

## 🔗 Links Úteis

- [Render Dashboard](https://dashboard.render.com)
- [Render Docs](https://render.com/docs)
- [Render Status](https://status.render.com)
- [Render Community](https://community.render.com)

---

**Última Atualização:** 29 de Outubro de 2025  
**Status:** 📘 Guia Completo

