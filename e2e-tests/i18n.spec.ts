import { test, expect } from '@playwright/test';

test.describe('Internationalization (i18n) Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('./');
  });

  test('should display the language selector', async ({ page }) => {
    // Check if language buttons are present
    const enButton = page.getByRole('button', { name: 'English' });
    const ptButton = page.getByRole('button', { name: 'Português' });
    const esButton = page.getByRole('button', { name: 'Español' });

    await expect(enButton).toBeVisible();
    await expect(ptButton).toBeVisible();
    await expect(esButton).toBeVisible();
  });

  test('should allow changing the language', async ({ page }) => {
    // Record the footer text for later comparison
    const initialFooter = await page.locator('footer p').textContent();

    // Change to Portuguese
    const ptButton = page.getByRole('button', { name: 'Português' });
    await ptButton.click();

    // Wait for the text to change
    await page.waitForTimeout(500);

    // Check if the text has been updated
    const footerAfterChange = await page.locator('footer p').textContent();
    expect(footerAfterChange).not.toBe(initialFooter);

    // Change to Spanish
    const esButton = page.getByRole('button', { name: 'Español' });
    await esButton.click();

    // Wait for the text to change
    await page.waitForTimeout(500);

    // Check if the text has been updated again
    const footerAfterSecondChange = await page.locator('footer p').textContent();
    expect(footerAfterSecondChange).not.toBe(initialFooter);
    expect(footerAfterSecondChange).not.toBe(footerAfterChange);
  });
  test('should display texts corresponding to the selected language', async ({ page }) => {
    // Expected texts in each language (based on locale files)
    const expectedTexts: Record<string, { footer: string }> = {
      en: {
        footer: '© 2025 bitcointracker. Built by Patrick Serrano.'
      },
      pt: {
        footer: '© 2025 bitcointracker. Construído por Patrick Serrano.'
      },
      es: {
        footer: '© 2025 bitcointracker. Construido por Patrick Serrano.'
      }
    };

    // Test each language
    const languages = [
      { code: 'en', button: page.getByRole('button', { name: 'English' }) },
      { code: 'pt', button: page.getByRole('button', { name: 'Português' }) },
      { code: 'es', button: page.getByRole('button', { name: 'Español' }) }
    ];

    for (const lang of languages) {
      // Change to the language
      await lang.button.click();

      // Wait for the text to change
      await page.waitForTimeout(500);
      // Check the footer
      const footer = await page.locator('footer p').textContent();
      // Use toContain because there might be extra whitespace
      expect(footer).toContain(expectedTexts[lang.code].footer);
    }
  });

  test('should persist language preference between reloads', async ({ page }) => {
    // Change to Portuguese
    const ptButton = page.getByRole('button', { name: 'Português' });
    await ptButton.click();

    // Wait for the text to change
    await page.waitForTimeout(500);

    // Record the footer text in Portuguese
    const footerInPortuguese = await page.locator('footer p').textContent();

    // Reload the page
    await page.reload();

    // Wait for the page to fully load after reload
    await page.waitForLoadState('domcontentloaded');

    // Check if the text is still in Portuguese after reload
    const footerAfterReload = await page.locator('footer p').textContent();
    expect(footerAfterReload).toBe(footerInPortuguese);
  });
});