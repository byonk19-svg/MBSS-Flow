import { expect, test } from '@playwright/test';

test('tracks a complete stop and exposes logs, dashboard, and export actions', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  await expect(page.getByRole('heading', { name: 'MBSS Flow' })).toBeVisible();
  await page.getByRole('button', { name: /Start Stop/i }).click();
  await expect(page.getByRole('heading', { name: 'Facility A' })).toBeVisible();

  await page.getByRole('button', { name: /^Pt On Van$/i }).click();
  await expect(page.getByRole('heading', { name: 'Active study' })).toBeVisible();
  await page.getByRole('button', { name: /Pt Leaves Van/i }).click();
  await page.getByRole('button', { name: /Documentation Complete/i }).click();
  await page.getByRole('button', { name: /Finish Stop/i }).click();

  await page.getByRole('button', { name: /Logs/i }).click();
  await expect(page.getByText(/Stop #1/)).toBeVisible();
  await expect(page.getByText('Study 1')).toBeVisible();

  await page.getByRole('button', { name: /Dashboard/i }).click();
  await expect(page.getByText('Today Summary')).toBeVisible();
  await expect(page.getByText('Bottleneck Breakdown')).toBeVisible();

  await page.getByRole('button', { name: /Export/i }).click();
  await expect(page.getByRole('button', { name: /Export stops.csv/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Export studies.csv/i })).toBeVisible();
});
