# 🚀 Guia de Início Rápido - Backend Trading

## ✅ Setup Completo Criado!

A estrutura completa do backend foi criada com:
- ✅ Docker Compose (PostgreSQL + Redis)
- ✅ Prisma ORM com schema completo
- ✅ TypeScript configurado
- ✅ Express.js com middlewares
- ✅ Sistema de logging (Winston)
- ✅ Configuração de ambiente
- ✅ Primeiro adapter (Binance Spot)
- ✅ Preparado para Render.com

---

## 🎯 Próximos Passos - Ordem de Execução

### 1️⃣ Instalar Dependências (5 minutos)

```powershell
# Entrar na pasta do backend
cd c:\dev\BitcoinTracker\backend

# Instalar todas as dependências
npm install
```

**O que isso faz:**
- Instala Express, TypeScript, Prisma, Redis, etc
- Cria node_modules/
- Gera package-lock.json

---

### 2️⃣ Iniciar PostgreSQL e Redis com Docker (2 minutos)

```powershell
# Iniciar containers Docker
npm run docker:up

# Verificar se estão rodando
docker ps
```

**Você deverá ver:**
- `trading-postgres` rodando na porta 5432
- `trading-redis` rodando na porta 6379

**Troubleshooting:**
```powershell
# Se der erro, ver logs:
npm run docker:logs

# Se precisar parar e reiniciar:
npm run docker:down
npm run docker:up
```

---

### 3️⃣ Configurar Variáveis de Ambiente (1 minuto)

```powershell
# Copiar o template
copy .env.example .env

# Editar .env (pode usar notepad ou VSCode)
code .env
```

**Configurações mínimas necessárias:**
```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://trading_user:trading_password_dev@localhost:5432/trading_brain?schema=public"
REDIS_URL="redis://localhost:6379"
TAAPI_SECRET_KEY=sua_chave_aqui_se_tiver
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
```

**Importante:**
- Se não tiver chave TAAPI ainda, deixe vazio ou coloque um placeholder
- CORS_ORIGIN deve ser a URL do seu frontend

---

### 4️⃣ Gerar Prisma Client e Rodar Migrations (2 minutos)

```powershell
# Gerar o Prisma Client
npm run prisma:generate

# Criar as tabelas no banco
npm run prisma:migrate

# Quando pedir nome da migration, digite: "init"
```

**O que isso faz:**
- Gera código TypeScript do Prisma Client
- Cria todas as tabelas no PostgreSQL
- Cria pasta prisma/migrations/

**Verificar se funcionou:**
```powershell
# Abrir Prisma Studio (GUI do banco)
npm run prisma:studio
```
Isso abre http://localhost:5555 com interface visual do banco.

---

### 5️⃣ Popular Banco com Dados Iniciais (1 minuto)

```powershell
# Conectar ao PostgreSQL e rodar seed
docker exec -i trading-postgres psql -U trading_user -d trading_brain < prisma\seed.sql
```

**O que isso faz:**
- Insere as 7 criptomoedas suportadas (BTC, ETH, SOL, XRP, PAXG, TRX, USDT/BRL)
- Cria registros na tabela `crypto_configs`

**Verificar:**
```powershell
# Abrir Prisma Studio novamente
npm run prisma:studio
```
Você deve ver 7 registros na tabela `crypto_configs`.

---

### 6️⃣ Iniciar Servidor de Desenvolvimento (Agora!)

```powershell
# Iniciar com hot-reload
npm run dev
```

**Você deverá ver:**
```
✅ Redis connected
✅ Database connected
🚀 Server running on port 3000
📊 Environment: development
🔗 Health check: http://localhost:3000/api/v1/health
```

---

### 7️⃣ Testar o Backend (1 minuto)

**Opção A: No navegador**
```
Abrir: http://localhost:3000/api/v1/health
```

**Opção B: PowerShell (curl)**
```powershell
curl http://localhost:3000/api/v1/health
```

**Opção C: PowerShell (Invoke-WebRequest)**
```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/v1/health | Select-Object -Expand Content
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-29T...",
  "version": "v1",
  "environment": "development",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

---

## 🎉 Tudo Funcionando!

Se chegou até aqui, você tem:
- ✅ PostgreSQL rodando com 7 criptos configuradas
- ✅ Redis rodando e conectado
- ✅ Backend rodando na porta 3000
- ✅ Health check respondendo
- ✅ Hot-reload configurado (nodemon)

---

## 🔄 Próximas Implementações

### Fase 1: Completar Adapters (Próxima)
```
✅ Binance Spot - FEITO
⏳ Binance Futures
⏳ TAAPI
⏳ Alternative.me (Fear & Greed)
⏳ CoinGecko (BTC Dominance)
```

### Fase 2: Services
```
⏳ Crypto Service (processamento de klines)
⏳ Indicators Service (cálculo de indicadores)
⏳ Futures Service
⏳ Market Service
```

### Fase 3: Controllers e Routes
```
⏳ Crypto Controller
⏳ Indicators Controller
⏳ Futures Controller
⏳ Market Controller
```

### Fase 4: Background Jobs
```
⏳ Data Collector Job
⏳ Indicator Calculator Job
⏳ Futures Updater Job
⏳ Market Indicators Job
```

---

## 🐛 Troubleshooting Comum

### Docker não inicia
```powershell
# Verificar se Docker Desktop está rodando
docker --version

# Se não estiver, iniciar Docker Desktop manualmente
```

### Erro de conexão ao PostgreSQL
```powershell
# Verificar se container está rodando
docker ps

# Ver logs do PostgreSQL
docker logs trading-postgres

# Reiniciar container
npm run docker:down
npm run docker:up
```

### Erro no Prisma
```powershell
# Limpar e regenerar
npx prisma generate --schema=./prisma/schema.prisma

# Se persistir, deletar e recriar
npm run docker:down
docker volume rm backend_postgres_data
npm run docker:up
npm run prisma:migrate
```

### Porta 3000 já em uso
```powershell
# Alterar PORT no .env
PORT=3001

# Ou matar o processo na porta 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 📊 Comandos Úteis

```powershell
# Ver logs do servidor
npm run dev

# Rodar em background
npm run build
npm start

# Ver logs do Docker
npm run docker:logs

# Parar Docker
npm run docker:down

# Verificar saúde do sistema
curl http://localhost:3000/api/v1/health

# Abrir Prisma Studio (GUI do banco)
npm run prisma:studio

# Rodar testes (quando implementados)
npm test

# Lint do código
npm run lint

# Formatar código
npm run format
```

---

## 🎯 Me Avise Quando:

1. ✅ Conseguir rodar `npm install` com sucesso
2. ✅ Docker subir corretamente
3. ✅ Migrations rodarem sem erro
4. ✅ Servidor iniciar e health check funcionar
5. ❌ Qualquer erro acontecer (mande a mensagem completa)

**Então continuamos implementando os próximos adapters e services!**

---

**Criado em**: 29 de Outubro de 2025  
**Status**: 🚀 Pronto para Iniciar
