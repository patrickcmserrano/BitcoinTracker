# ⚡ Comandos Rápidos - Backend

## 🚀 Setup Inicial (Execute em Ordem)

```powershell
# 1. Entrar na pasta
cd c:\dev\BitcoinTracker\backend

# 2. Instalar dependências
npm install

# 3. Copiar .env
copy .env.example .env

# 4. Editar .env (Configure suas variáveis)
code .env

# 5. Iniciar Docker (PostgreSQL + Redis)
npm run docker:up

# 6. Gerar Prisma Client
npm run prisma:generate

# 7. Rodar migrations
npm run prisma:migrate
# Digite "init" quando pedir nome da migration

# 8. Popular banco com criptos
docker exec -i trading-postgres psql -U trading_user -d trading_brain < prisma\seed.sql

# 9. Iniciar servidor
npm run dev
```

---

## 🧪 Testar

```powershell
# Health check
curl http://localhost:3000/api/v1/health

# Ou no navegador
start http://localhost:3000/api/v1/health
```

---

## 📊 Desenvolvimento

```powershell
# Rodar em modo dev (hot-reload)
npm run dev

# Build para produção
npm run build

# Rodar produção
npm start

# Testes
npm test

# Lint
npm run lint

# Formatar código
npm run format
```

---

## 🐳 Docker

```powershell
# Iniciar PostgreSQL + Redis
npm run docker:up

# Ver logs
npm run docker:logs

# Parar containers
npm run docker:down

# Reiniciar
npm run docker:down
npm run docker:up
```

---

## 🗄️ Prisma

```powershell
# Gerar Prisma Client
npm run prisma:generate

# Criar migration
npm run prisma:migrate

# Deploy migrations (produção)
npm run prisma:migrate:deploy

# Abrir Prisma Studio (GUI)
npm run prisma:studio
```

---

## 🐛 Troubleshooting

```powershell
# Limpar tudo e recomeçar
npm run docker:down
docker volume rm backend_postgres_data backend_redis_data
rm -rf node_modules
rm -rf dist
npm install
npm run docker:up
npm run prisma:generate
npm run prisma:migrate
npm run dev

# Ver logs de erro
npm run docker:logs | findstr "ERROR"

# Verificar portas em uso
netstat -ano | findstr ":3000"
netstat -ano | findstr ":5432"
netstat -ano | findstr ":6379"
```

---

## 🚢 Deploy Render

```powershell
# Commitar mudanças
git add .
git commit -m "feat: adicionar nova feature"
git push origin main

# Render vai fazer deploy automático!
# Ver logs em: https://dashboard.render.com
```

---

## 📦 Gerenciar Dependências

```powershell
# Adicionar nova dependência
npm install package-name

# Adicionar dev dependency
npm install -D package-name

# Atualizar dependências
npm update

# Auditar segurança
npm audit
npm audit fix
```

---

## 🔍 Debug

```powershell
# Rodar com debug do Node
node --inspect dist/index.js

# Ver logs do Winston
cat logs/combined.log
cat logs/error.log

# Conectar ao PostgreSQL
docker exec -it trading-postgres psql -U trading_user -d trading_brain

# Conectar ao Redis
docker exec -it trading-redis redis-cli
```

---

## 📊 Monitoramento

```powershell
# Health check loop (monitorar continuamente)
while ($true) { curl http://localhost:3000/api/v1/health; Start-Sleep -Seconds 5 }

# Ver uso de recursos Docker
docker stats

# Ver logs em tempo real
npm run docker:logs
```

---

## 🎯 Atalhos Úteis

```powershell
# Reinício rápido
npm run docker:down && npm run docker:up && npm run dev

# Reset completo do banco
npm run docker:down
docker volume rm backend_postgres_data
npm run docker:up
npm run prisma:migrate
docker exec -i trading-postgres psql -U trading_user -d trading_brain < prisma\seed.sql

# Build e testar produção localmente
npm run build
npm start
```

---

## 📝 Git Workflow

```powershell
# Criar branch para feature
git checkout -b feature/nome-da-feature

# Fazer mudanças e commitar
git add .
git commit -m "feat: descrição da mudança"

# Push e criar PR
git push origin feature/nome-da-feature

# Merge para main (após aprovação)
git checkout main
git merge feature/nome-da-feature
git push origin main
```

---

**Última Atualização:** 29 de Outubro de 2025
