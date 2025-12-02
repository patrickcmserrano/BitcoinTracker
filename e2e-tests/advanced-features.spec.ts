import { test, expect } from '@playwright/test';

test.describe('Advanced Features', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
    });

    test('should navigate to Triple Screen Analysis', async ({ page }) => {
        // Find navigation tab for Triple Screen
        const tripleScreenTab = page.locator('.tab-button').filter({ hasText: 'Triple Screen' }).first();
        await tripleScreenTab.click();

        // Wait for view change
        await page.waitForTimeout(1000);

        // Check if Triple Screen component is rendered
        // It likely has a specific header or class
        // The title is "Análise Triple Screen - Academia LOTUS"
        await expect(page.getByText('Análise Triple Screen')).toBeVisible();
    });
});
