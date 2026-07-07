import { test, expect } from '@playwright/test';

test.describe('認証フォーム', () => {
  test.describe('ログインページ', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('ログインフォームが表示される', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'ログイン' })).toBeVisible();
      await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
      await expect(page.getByRole('button', { name: /ログイン/ })).toBeVisible();
    });

    test('メールアドレスが空のまま送信するとブラウザバリデーションが働く', async ({ page }) => {
      await page.getByRole('button', { name: /ログイン/ }).click();
      await expect(page).toHaveURL('/login');
    });

    test('新規登録リンクが /signup に遷移する', async ({ page }) => {
      await page.getByRole('link', { name: '新規登録' }).click();
      await expect(page).toHaveURL('/signup');
    });

    test('ログイン試行後に /dashboard か /login にいる', async ({ page }) => {
      await page.getByPlaceholder('you@example.com').fill('test@example.com');
      await page.locator('input[type="password"]').fill('password123');
      await page.getByRole('button', { name: /ログイン/ }).click();
      await page.waitForURL(/\/(dashboard|login)/, { timeout: 10000 });
    });
  });

  test.describe('サインアップページ', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup');
    });

    test('サインアップフォームが表示される', async ({ page }) => {
      await expect(page.getByRole('button', { name: /入社する/ })).toBeVisible();
    });

    test('パスワードが 8 文字未満だとエラーが表示される', async ({ page }) => {
      await page.getByPlaceholder('you@example.com').fill('test@example.com');
      const passwords = page.locator('input[type="password"]');
      await passwords.nth(0).fill('short');
      await passwords.nth(1).fill('short');
      await page.getByRole('button', { name: /入社する/ }).click();
      await expect(page.getByText('パスワードは8文字以上にしてください')).toBeVisible();
    });
  });
});
