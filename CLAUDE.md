@AGENTS.md
# CLAUDE.md — ClaudeCode プロジェクト指示文

## このファイルについて

このファイルはClaudeCodeが毎回自動で読み込む指示ファイルです。
実装の判断に迷ったときは、このファイルの方針に従ってください。

---

## プロダクト概要

**プロダクト名（仮）**: data-engineering-playground  
**一言説明**: データエンジニアリングをゲーム感覚で体験できる学習プラットフォーム  
**リポジトリ**: https://github.com/DataRecordLab/data-engineering-playground

### コアコンセプト

> 「読むだけでは身につかない。作ることで理解する。」

ユーザーはデータエンジニアリング専門エージェンシー「DataCraft Agency」の新人エンジニアとして、
様々なクライアントから届くデータ課題を「クエスト」として受注・解決する。

### ターゲットユーザー

- SQLは書けるがパイプライン設計がわからない人
- データエンジニアを目指している初学者
- データアナリスト・BIエンジニアからステップアップしたい人

---

## 技術スタック

```
フロントエンド : Next.js 14+ (App Router) + TypeScript + Tailwind CSS
SQL実行エンジン: DuckDB WASM（ブラウザ内で動作・サーバー不要）
SQLエディタ    : Monaco Editor
パイプライン可視化: Reactflow
状態管理       : Zustand
認証・DB       : Supabase
AIフィードバック: Claude API (claude-sonnet-4-6)
デプロイ       : Vercel
```

### インストール済みパッケージ

```json
{
  "@supabase/supabase-js": "latest",
  "@supabase/ssr": "latest",
  "@monaco-editor/react": "latest",
  "@duckdb/duckdb-wasm": "latest",
  "reactflow": "latest",
  "zustand": "latest"
}
```

---

## ディレクトリ構成

```
app/
├── (public)/
│   └── page.tsx                    ← LP（ゲームの世界観を見せる）
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
└── (app)/
    ├── dashboard/page.tsx          ← クエスト選択画面
    └── quest/
        └── [questId]/
            └── [stage]/
                └── page.tsx        ← メイン構築画面（SQLエディタ）

components/
├── editor/
│   ├── SqlEditor.tsx               ← Monaco Editor ラッパー
│   └── ResultTable.tsx             ← クエリ結果表示
├── quest/
│   ├── QuestCard.tsx               ← クエスト一覧カード
│   ├── StageProgress.tsx           ← 左サイドバー進捗
│   └── PipelineMap.tsx             ← Source→Mart 可視化
└── feedback/
    └── AiFeedback.tsx              ← AIレビュー表示

lib/
├── supabase/
│   ├── client.ts                   ← ブラウザ用Supabaseクライアント
│   └── server.ts                   ← Server Components用
├── duckdb/
│   └── engine.ts                   ← DuckDB WASM 初期化・SQL実行
├── scenarios/
│   ├── index.ts                    ← シナリオ一覧
│   ├── ec-site/                    ← ECサイトシナリオ
│   │   ├── index.ts
│   │   ├── data/                   ← CSVサンプルデータ
│   │   └── stages/                 ← 各ステージ定義
│   ├── saas/                       ← SaaSシナリオ（将来）
│   └── medical/                    ← 医療シナリオ（将来）
└── ai/
    └── feedback.ts                 ← Claude API フィードバック生成

types/
└── index.ts                        ← 共通型定義
```

---

## ゲーム設計

### 世界観

プレイヤーは「DataCraft Agency」というデータエンジニアリング専門エージェンシーの新人エンジニア。
様々な業界のクライアントから「データ課題」が届き、クエストとして受注・解決する。

### クエスト構造

各クエストは以下の共通構造を持つ：

```
オープニング（RPG型）
    ↓ ストーリー・課題の提示
Stage 1: Source Layer（ステージクリア型）
    ↓ 生データをそのまま保持するSQL
Stage 2: Staging Layer（シミュレーション型）
    ↓ 型変換・クレンジング・整形
Stage 3: Warehouse Layer（RPGボス戦型）
    ↓ fact/dim設計・スタースキーマ
Stage 4: Mart + 意思決定（シミュレーション型）
    ↓ 分析用テーブル・ビジネス判断
エンディング（RPG型）
    → 次のクエスト解放
```

### ゲーム要素

| 要素 | 説明 |
|------|------|
| XP（経験値） | タスク完了・AIレビュー評価で獲得 |
| レベル | XP累積で上昇（Lv.1〜10） |
| スター評価 | 各ステージを★1〜★3で評価 |
| バッジ | スキル習得の証明（「Source設計」など） |
| クエスト解放 | 前クエストクリアで次が解放される |

### 現在実装するシナリオ

**Quest 1: 売上が見えない（ECサイト・初級）**
- クライアント: EC企業
- データ: orders.csv / users.csv / products.csv
- 課題: 売上データが散在して分析できない
- ゴール: Source→Martまで基盤を構築し、「売上が最も落ちている曜日」を答える

---

## Supabaseテーブル設計

```sql
-- 組織（個人も1人orgとして作成）
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT DEFAULT 'personal', -- 'personal' | 'team' | 'enterprise'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ユーザー
CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users,
  organization_id UUID REFERENCES organizations(id),
  role            TEXT DEFAULT 'owner',
  level           INTEGER DEFAULT 1,
  total_xp        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 学習進捗
CREATE TABLE user_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id),
  quest_id     TEXT NOT NULL,       -- 'ec-site' | 'saas' | 'medical'
  stage        TEXT NOT NULL,       -- 'source' | 'staging' | 'warehouse' | 'mart'
  status       TEXT DEFAULT 'locked', -- 'locked' | 'in_progress' | 'completed'
  stars        INTEGER DEFAULT 0,   -- 0〜3
  sql_answer   TEXT,                -- ユーザーが書いたSQL
  xp_earned    INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- バッジ
CREATE TABLE user_badges (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id),
  badge_id   TEXT NOT NULL,
  earned_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 実装方針・ルール

### 基本方針

1. **MVP志向**: まずECサイトシナリオ1本を完成させる。複数シナリオは後から追加する
2. **DuckDB優先**: SQL実行はすべてブラウザ内DuckDBで行う。バックエンドAPIは不要
3. **型安全**: TypeScriptの型を必ず定義する。`any`は使わない
4. **Server Components優先**: データ取得はServer Componentsで行う。クライアントコンポーネントは最小限に

### コーディング規則

```typescript
// ファイル命名
// コンポーネント: PascalCase (SqlEditor.tsx)
// ユーティリティ: camelCase (engine.ts)
// 型定義: types/index.ts に集約

// コンポーネントの基本形
'use client'; // クライアントコンポーネントのみ

interface Props {
  questId: string;
  stage: string;
}

export function ComponentName({ questId, stage }: Props) {
  // ...
}
```

### 環境変数

```bash
# .env.local に設定が必要
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

### AIフィードバックのプロンプト方針

```
- 上司キャラクターとして話しかける（「よくできています」「ここを直してください」）
- 技術的な正確さより、学習者が理解できる言葉を使う
- ★評価は客観的な基準で行う（★1: 動く, ★2: 良い設計, ★3: ベストプラクティス）
- 改善提案は必ず1つ以上含める
```

---

## 現在の実装状況

- [x] Next.js プロジェクト作成
- [x] 必要パッケージインストール
- [ ] Supabase接続設定
- [ ] 認証（ログイン・サインアップ）
- [ ] DuckDB初期化
- [ ] SQLエディタ（Monaco Editor）
- [ ] ECサイトシナリオ定義
- [ ] クエスト選択画面
- [ ] メイン構築画面
- [ ] AIフィードバック

---

## 詳細ドキュメント

- `docs/GAME_DESIGN.md` — 世界観・クエスト・ゲーム要素の詳細
- `docs/SCENARIOS.md` — 各シナリオ・タスクの詳細定義
- `docs/TECHNICAL.md` — 技術設計の詳細
- `docs/UI_DESIGN.md` — 画面設計・UXフロー

---

## ClaudeCodeへの依頼例

```
# 認証を実装して
# DuckDBの初期化コードを書いて
# ECサイトのシナリオデータを定義して
# SQLエディタコンポーネントを作って
# Stage 2のStagingタスク画面を作って
```

実装に迷ったときは、このCLAUDE.mdの方針を最優先にしてください。
