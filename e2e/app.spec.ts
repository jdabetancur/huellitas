import { expect, test } from '@playwright/test';

test('abre en Mis mascotas con los datos de ejemplo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('ion-title').first()).toContainText('Mis mascotas');
  await expect(page.locator('app-mis-mascotas')).toContainText('Toby');
});
