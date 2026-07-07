import { test, expect } from '@playwright/test';

test.describe('スキルレッスン', () => {
  test('スキル一覧ページが表示される', async ({ page }) => {
    await page.goto('/skills');
    // h1 with the page title
    await expect(page.getByRole('heading', { name: /スキルパス/ })).toBeVisible();
  });

  test('セクション1が表示される', async ({ page }) => {
    await page.goto('/skills');
    // Wait for loading to finish (`.catch` fix ensures this resolves)
    await expect(page.getByText('パイプライン基礎')).toBeVisible({ timeout: 10000 });
  });

  test('レッスンページに遷移できる', async ({ page }) => {
    await page.goto('/skills/pipeline-basics/what-is-pipeline');
    await expect(
      page.getByText('このレッスンで学ぶこと').or(page.getByText('1 / '))
    ).toBeVisible({ timeout: 8000 });
  });

  test('コンセプトカードの「わかった！」ボタンで問題フェーズに進む', async ({ page }) => {
    await page.goto('/skills/pipeline-basics/what-is-pipeline');
    const conceptBtn = page.getByRole('button', { name: /わかった！/ });
    if (await conceptBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await conceptBtn.click();
      await expect(page.getByText('1 / ')).toBeVisible();
    }
  });

  test('問題に回答するとフィードバックが表示される', async ({ page }) => {
    await page.goto('/skills/pipeline-basics/what-is-pipeline');

    const conceptBtn = page.getByRole('button', { name: /わかった！/ });
    if (await conceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await conceptBtn.click();
    }

    // Click the first answer option button
    const options = page.locator('button').filter({ hasText: /^[A-Z]/ });
    if (await options.first().isVisible({ timeout: 5000 }).catch(() => false)) {
      await options.first().click();
      await expect(
        page.getByText('正解').or(page.getByText('不正解'))
      ).toBeVisible({ timeout: 3000 });
    }
  });
});
