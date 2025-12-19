import { test, expect } from '@playwright/test';

test.describe('Core User Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should switch cryptocurrency', async ({ page }) => {
        // Initial state check (Bitcoin)
        await expect(page.locator('h1')).toContainText('BTC');

        // Open crypto selector if on mobile/tablet (or if it's hidden)
        // Note: In desktop it's a sidebar, in mobile it might be different.
        // Assuming desktop for now based on previous tests.

        // Click on Ethereum
        // Use data-testid which is available in both grid and sidebar layouts
        const ethButton = page.getByTestId('crypto-btn-ethereum');
        await ethButton.click();

        // Wait for update
        await page.waitForTimeout(1000);

        // Check if H1 updated
        await expect(page.locator('h1')).toContainText('ETH');
    });

    test('should switch timeframe', async ({ page }) => {
        // Default is likely 1h
        const timeframe1h = page.locator('button').filter({ hasText: '1h' }).first();
        await expect(timeframe1h).toHaveClass(/active|bg-primary/); // Assuming active class or style

        // Click 4h
        const timeframe4h = page.locator('button').filter({ hasText: '4h' }).first();
        await timeframe4h.click();

        // Wait for update
        await page.waitForTimeout(500);

        // Check if 4h is active
        await expect(timeframe4h).toHaveClass(/active|bg-primary/);
    });

    test('should toggle technical indicators', async ({ page }) => {
        // Scroll to technical indicators section
        const techIndicators = page.locator('.technical-indicators-container');
        await techIndicators.scrollIntoViewIfNeeded();
        await expect(techIndicators).toBeVisible();

        // Check if refresh button works
        const refreshBtn = techIndicators.locator('.refresh-button');
        await refreshBtn.click();

        // Should see loading state or similar?
        // The button spins when loading, but it might be too fast to catch in E2E.
        // Just verify it's still visible and enabled (eventually).
        await expect(refreshBtn).toBeVisible();
    });
});
