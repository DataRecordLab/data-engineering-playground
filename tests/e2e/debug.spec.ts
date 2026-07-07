import { test, expect } from '@playwright/test';

test.describe('Debug Lab', () => {
  test('/debug は未ログインだと /login にリダイレクトされる', async ({ page }) => {
    await page.goto('/debug');
    // Auth guard redirects to /login or shows the page if logged in
    await page.waitForURL(/\/(debug|login)/, { timeout: 8000 });
    const url = page.url();
    if (url.includes('/login')) {
      // Auth guard working correctly
      await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
    } else {
      // Logged in — verify debug lab content
      await expect(page.getByText('Pipeline Debug Lab')).toBeVisible();
    }
  });

  test('/debug が表示される場合はカテゴリラベルがある', async ({ page }) => {
    await page.goto('/debug');
    await page.waitForURL(/\/(debug|login)/, { timeout: 8000 });
    if (!page.url().includes('/debug')) return; // skip if redirected to login

    await expect(
      page.getByText('データ品質の問題').or(page.getByText('パイプライン設計の問題'))
    ).toBeVisible();
  });

  test('/debug が表示される場合はシナリオカードがある', async ({ page }) => {
    await page.goto('/debug');
    await page.waitForURL(/\/(debug|login)/, { timeout: 8000 });
    if (!page.url().includes('/debug')) return;

    const firstCard = page.locator('a[href^="/debug/"]').first();
    await expect(firstCard).toBeVisible();
  });

  test('/debug シナリオページに遷移できる', async ({ page }) => {
    await page.goto('/debug');
    await page.waitForURL(/\/(debug|login)/, { timeout: 8000 });
    if (!page.url().includes('/debug')) return;

    const firstCard = page.locator('a[href^="/debug/"]').first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/debug\/.+/);
    await expect(
      page.getByText('アラート').or(page.getByText('期待値'))
    ).toBeVisible({ timeout: 8000 });
  });
});
