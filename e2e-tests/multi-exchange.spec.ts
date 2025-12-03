import { test, expect } from '@playwright/test';

test.describe('Multi-Exchange Support', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('./');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should display exchange selector and spread monitor', async ({ page }) => {
        // Check for Exchange Selector
        const binanceButton = page.getByRole('button', { name: 'Binance' });
        const bitgetButton = page.getByRole('button', { name: 'Bitget' });

        await expect(binanceButton).toBeVisible();
        await expect(bitgetButton).toBeVisible();

        // Check for Spread Monitor
        const spreadMonitor = page.locator('text=Arbitrage Monitor');
        await expect(spreadMonitor).toBeVisible();

        // Check for price rows
        await expect(page.locator('text=Binance:')).toBeVisible();
        await expect(page.locator('text=Bitget:')).toBeVisible();
        await expect(page.locator('text=Spread:')).toBeVisible();
    });

    test('should switch exchanges', async ({ page }) => {
        // Default should be Binance
        const binanceButton = page.getByRole('button', { name: 'Binance' });
        await expect(binanceButton).toHaveClass(/bg-blue-600/);

        // Switch to Bitget
        const bitgetButton = page.getByRole('button', { name: 'Bitget' });
        await bitgetButton.click();

        // Verify Bitget is active
        await expect(bitgetButton).toHaveClass(/bg-blue-600/);
        await expect(binanceButton).not.toHaveClass(/bg-blue-600/);

        // Verify chart reloads (mocking might be needed for full verification, but we check UI state)
        // We can check if localStorage was updated
        const storedExchange = await page.evaluate(() => localStorage.getItem('selected_exchange'));
        expect(storedExchange).toBe('bitget');
    });

    test('should persist exchange selection', async ({ page }) => {
        // Select Bitget
        await page.getByRole('button', { name: 'Bitget' }).click();

        // Reload page
        await page.reload();

        // Verify Bitget is still selected
        const bitgetButton = page.getByRole('button', { name: 'Bitget' });
        await expect(bitgetButton).toHaveClass(/bg-blue-600/);
    });
});
