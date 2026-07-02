# 管理者ダッシュボード セットアップ手順

## 1. Supabase 環境変数を追加

`.env.local` に以下を追加：

```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

> Supabase ダッシュボード → Project Settings → API → service_role key

## 2. ユーザーを管理者に昇格（Supabase SQL Editor）

```sql
-- 管理者にしたいユーザーのroleをadminに変更
UPDATE users
SET role = 'admin'
WHERE id = 'ユーザーのUUID';

-- 確認
SELECT id, display_name, role, organization_id FROM users;
```

## 3. 組織を作成してユーザーを紐付ける

```sql
-- 組織を作成
INSERT INTO organizations (name, type)
VALUES ('株式会社○○ 研修2025', 'team')
RETURNING id;

-- そのIDでユーザーを紐付け
UPDATE users
SET organization_id = '上で取得したorg_id',
    role = 'admin',
    plan = 'team'
WHERE id = '管理者のUUID';
```

## 4. 招待リンクの使い方

1. `/admin` ページを開く
2. 「招待リンクをコピー」ボタンをクリック
3. コピーされたURL (`/signup?team=orgId`) を研修参加者に共有
4. 参加者がそのURLから登録すると organization に自動参加

## 5. メンバーがsignupした後の自動org紐付け

Supabase の `auth.users` trigger で実施（将来実装）。
現状は手動でSQLを実行：

```sql
UPDATE users
SET organization_id = 'org_id',
    plan = 'team'
WHERE id = '新規ユーザーのUUID';
```

## 画面説明

| 画面 | URL | 説明 |
|------|-----|------|
| 管理ダッシュボード | `/admin` | 受講者一覧・進捗・クエスト完了率 |
| CSVエクスポート | ボタン | HR報告・修了証発行用 |
| 招待リンク | ボタン | コピーして参加者に共有 |
| プラン選択 | `/upgrade` | Free/Pro/Team の比較 |
