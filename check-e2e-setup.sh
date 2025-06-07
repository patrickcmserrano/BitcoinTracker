#!/bin/bash

# Script de teste rápido para verificar se o ambiente E2E está funcionando
echo "🔍 Verificando configuração do ambiente E2E..."

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto"
    exit 1
fi

# Verificar dependências básicas
echo "📦 Verificando dependências..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado"
    exit 1
fi

# Verificar se as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Verificar configuração do Playwright
echo "🎭 Verificando Playwright..."
if npx playwright --version > /dev/null 2>&1; then
    echo "✅ Playwright encontrado: $(npx playwright --version)"
else
    echo "🎭 Instalando Playwright..."
    npx playwright install chromium
fi

# Testar configuração
echo "🧪 Testando configuração..."
if npx playwright test --config=playwright.container.config.ts --dry-run > /dev/null 2>&1; then
    echo "✅ Configuração do Playwright válida"
else
    echo "⚠️  Problemas na configuração do Playwright"
fi

echo "✅ Verificação concluída! Execute ./run-e2e-tests.sh para rodar os testes."
