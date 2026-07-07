import { test, expect } from '@playwright/test';

test.describe('LP（トップページ）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('ページタイトルに Modelion が含まれる', async ({ page }) => {
    await expect(page).toHaveTitle(/Modelion/);
  });

  test('ヒーローセクションのキャッチコピーが表示される', async ({ page }) => {
    await expect(page.getByText('設計して体験する')).toBeVisible();
  });

  test('「無料で始める」ボタンが表示される', async ({ page }) => {
    const ctaButtons = page.getByRole('link', { name: /無料で始める/ });
    await expect(ctaButtons.first()).toBeVisible();
  });

  test('ログインリンクが /login に遷移する', async ({ page }) => {
    await page.getByRole('link', { name: 'ログイン' }).first().click();
    await expect(page).toHaveURL('/login');
  });

  test('パイプラインフローアニメーションが存在する', async ({ page }) => {
    // Animation component shows the label 'データパイプライン' exactly in a span
    await expect(page.getByText('データパイプライン', { exact: true })).toBeVisible();
  });
});
