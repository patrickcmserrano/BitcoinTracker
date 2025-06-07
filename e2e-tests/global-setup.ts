// Global setup for E2E tests in container environment
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 Configurando ambiente de testes E2E...');
  
  // Verificar se o servidor está respondendo
  const browser = await chromium.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('🌐 Verificando se o servidor está executando...');
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:5173', {
      timeout: 30000
    });
    console.log('✅ Servidor está respondendo');
  } catch (error) {
    console.error('❌ Servidor não está respondendo:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;
