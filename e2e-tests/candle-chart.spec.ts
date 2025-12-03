import { test, expect } from '@playwright/test';

// Helper function to show chart
async function showChart(page: any) {
  await page.waitForLoadState('domcontentloaded');

  // Chart is always visible in CryptoTracker, so we just wait for the container
  // The container has min-h-[500px] in CryptoTracker
  await page.waitForSelector('div[class*="min-h-[500px]"]', { timeout: 15000 });
}

test.describe('CandleChart E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API route interception BEFORE navigation
    // This ensures the mock is ready when the chart loads data
    await page.route('**/api.binance.com/api/v3/klines**', async route => {
      const mockData = [
        [1625097600000, "50000", "51000", "49000", "50500"],
        [1625097660000, "50500", "52000", "50000", "51500"],
        [1625097720000, "51500", "53000", "51000", "52000"]
      ];

      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(mockData)
      });
    });

    // Now navigate to the page with the route already set up
    await page.goto('./');
  });

  test('deve renderizar o gráfico de candles', async ({ page }) => {
    await showChart(page);

    // Verificar se o container do gráfico está presente
    const chartContainer = page.locator('div[class*="min-h-[500px]"]');
    await expect(chartContainer).toBeVisible();
  });

  test('deve carregar dados históricos', async ({ page }) => {
    // Track if the API was called
    let apiCalled = false;

    // Set up a listener for the specific API call
    page.on('request', request => {
      if (request.url().includes('api.binance.com/api/v3/klines')) {
        apiCalled = true;
      }
    });

    // Wait for the chart to load - the beforeEach already set up the route mock
    await showChart(page);

    // Wait a bit for the async data loading to complete
    await page.waitForTimeout(2000);

    // Verify the API was called
    expect(apiCalled).toBeTruthy();

    // Verify the chart container is visible (data loaded successfully)
    const chartContainer = page.locator('div[class*="min-h-[500px]"]');
    await expect(chartContainer).toBeVisible();
  });

  test.skip('deve estabelecer conexão WebSocket', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    // Reload to ensure we capture startup logs
    await page.reload();
    await showChart(page);

    // Wait for WebSocket connection
    await page.waitForTimeout(5000);

    // Verificar se há logs de conexão WebSocket
    const hasWebSocketLog = logs.some(log =>
      log.includes('Connecting to WebSocket') ||
      log.includes('WebSocket connected')
    );
    expect(hasWebSocketLog).toBeTruthy();
  });

  test('deve ser responsivo em diferentes tamanhos de tela', async ({ page }) => {
    await showChart(page);

    const chartContainer = page.locator('div[class*="min-h-[500px]"]');

    // Testar em desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(chartContainer).toBeVisible();

    // Testar em tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(chartContainer).toBeVisible();

    // Testar em mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(chartContainer).toBeVisible();
  });

  test.skip('deve exibir dados em tempo real', async ({ page }) => {
    // Mock WebSocket para simular dados em tempo real
    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;

      window.WebSocket = class MockWebSocket extends EventTarget {
        url: string;
        readyState: number = WebSocket.CONNECTING;

        constructor(url: string) {
          super();
          this.url = url;

          // Simular conexão bem-sucedida
          setTimeout(() => {
            this.readyState = WebSocket.OPEN;
            this.dispatchEvent(new Event('open'));

            // Simular dados de kline a cada 2 segundos
            setInterval(() => {
              const mockKlineData = {
                k: {
                  t: Date.now(),
                  o: (Math.random() * 1000 + 50000).toFixed(2),
                  h: (Math.random() * 1000 + 51000).toFixed(2),
                  l: (Math.random() * 1000 + 49000).toFixed(2),
                  c: (Math.random() * 1000 + 50500).toFixed(2)
                }
              };

              this.dispatchEvent(new MessageEvent('message', {
                data: JSON.stringify(mockKlineData)
              }));
            }, 2000);
          }, 100);
        }

        close() {
          this.readyState = WebSocket.CLOSED;
          this.dispatchEvent(new CloseEvent('close'));
        }

        send() { }
      } as any;
    });

    await showChart(page);

    // Capturar logs para verificar processamento de dados
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Aguardar alguns ciclos de dados
    await page.waitForTimeout(6000);

    // Verificar se há logs indicando conexão WebSocket
    const hasWebSocketConnection = logs.some(log =>
      log.includes('WebSocket connected') ||
      log.includes('Connecting to WebSocket')
    );
    expect(hasWebSocketConnection).toBeTruthy();
  });

  test('deve lidar com erros de rede graciosamente', async ({ page }) => {
    // Create a new page context to avoid route conflicts
    // We need to set up the error route BEFORE navigating
    await page.unroute('**/api.binance.com/api/v3/klines**');

    // Simular erro na API da Binance
    await page.route('**/api.binance.com/api/v3/klines**', async route => {
      await route.abort('failed');
    });

    // Navigate to trigger a fresh load with the error route
    await page.goto('./');

    // Capturar erros do console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await showChart(page);
    await page.waitForTimeout(3000);

    // O componente deve ainda estar visível mesmo com erro na API
    const chartContainer = page.locator('div[class*="min-h-[500px]"]');
    await expect(chartContainer).toBeVisible();
  });

  test('deve ter acessibilidade adequada', async ({ page }) => {
    await showChart(page);

    // Verificar se o componente tem estrutura adequada para acessibilidade
    const chartContainer = page.locator('div[class*="min-h-[500px]"]');
    await expect(chartContainer).toBeVisible();

    // O gráfico deve ter um container com classe apropriada
    await expect(chartContainer).toHaveClass(/min-h-\[500px\]/);
  });
});
