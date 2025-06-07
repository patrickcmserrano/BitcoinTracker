#!/bin/bash

# Script para executar testes E2E no ambiente Distrobox playwright-env
# Uso: ./run-e2e-tests.sh [opções do playwright]

set -e

echo "🧪 Iniciando testes E2E no ambiente Distrobox..."

# Verificar se estamos dentro do container Distrobox
if [ -z "$DISTROBOX_ENTER_PATH" ] && [ -z "$CONTAINER_ID" ]; then
    echo "⚠️  Não detectado ambiente Distrobox. Tentando entrar no container playwright-env..."
    
    # Verificar se o container playwright-env existe
    if ! distrobox list | grep -q "playwright-env"; then
        echo "❌ Container playwright-env não encontrado!"
        echo "Execute primeiro: distrobox create --name playwright-env --image node:18"
        exit 1
    fi
    
    # Entrar no container e executar os testes
    echo "🚀 Entrando no container playwright-env..."
    distrobox enter playwright-env -- bash -c "
        cd /var/home/patrickscript/dev/BitcoinTracker && 
        echo '📦 Instalando dependências...' &&
        npm install &&
        echo '🎭 Instalando browsers do Playwright...' &&
        npx playwright install --with-deps chromium &&
        echo '🧪 Executando testes E2E...' &&
        npm run e2e:container $*
    "
else
    echo "✅ Já estamos dentro do ambiente Distrobox"
    
    # Verificar se as dependências estão instaladas
    if [ ! -d "node_modules" ]; then
        echo "📦 Instalando dependências..."
        npm install
    fi
    
    # Verificar se os browsers do Playwright estão instalados
    if ! npx playwright --version > /dev/null 2>&1; then
        echo "🎭 Instalando browsers do Playwright..."
        npx playwright install --with-deps chromium
    fi
    
    # Carregar variáveis de ambiente específicas para E2E
    if [ -f ".env.e2e" ]; then
        source .env.e2e
    fi
    
    # Executar os testes com configuração específica para container
    echo "🧪 Executando testes E2E..."
    npm run e2e:container "$@"
fi

echo "✅ Testes E2E concluídos!"
