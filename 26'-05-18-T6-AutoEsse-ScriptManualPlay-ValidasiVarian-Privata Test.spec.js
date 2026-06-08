import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://dev-essensial.assist.id/login');
  await page.locator('#username').click();
  await page.locator('#username').fill('anisasecondacc24@gmail.com');
  await page.locator('[data-test="input-password"]').click();
  await page.locator('[data-test="input-password"]').fill('12345678');
  await page.locator('[data-test="login-btn"]').click();
  await page.locator('[data-test="change-account-button-arrow"]').click();
  await page.getByRole('menuitem', { name: '- Pure Atkins [Privata] (QA)' }).click();
  await page.locator('div').nth(1).click();
  await page.locator('div').nth(1).click();
});