import { test, expect } from '@playwright/test';

test.describe('クエスト・ステージ', () => {
  test('クエスト一覧（ダッシュボード）が表示される', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL(/\/(dashboard|login)/, { timeout: 8000 });
    const url = page.url();
    if (url.includes('/dashboard')) {
      await expect(page.getByText('Modelion')).toBeVisible();
    } else {
      await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    }
  });

  test('ECサイトクエストのオープニングが表示される', async ({ page }) => {
    await page.goto('/quest/ec-site');
    // Quest pages are accessible without auth; character dialog or login shows
    await expect(
      page.locator('header').first()
    ).toBeVisible({ timeout: 10000 });
    // If on quest page, dialog content should eventually appear
    if (page.url().includes('/quest')) {
      await expect(
        page.getByText('ShopNow CEO').or(page.getByText('ダッシュボード')).first()
      ).toBeVisible({ timeout: 8000 });
    }
  });

  test('ステージページが表示される（pipeline ステージ）', async ({ page }) => {
    await page.goto('/quest/ec-site/pipeline');
    // Wait for the page to load (world entry animation or stage content)
    await expect(page.locator('header').first()).toBeVisible({ timeout: 12000 });
    if (page.url().includes('/pipeline')) {
      // World entry shows the stage name (unique large heading)
      await expect(
        page.locator('.text-5xl').filter({ hasText: 'パイプライン' }).or(page.getByRole('link', { name: /Source Layer/ })).first()
      ).toBeVisible({ timeout: 12000 });
    }
  });
});
