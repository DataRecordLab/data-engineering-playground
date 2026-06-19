# CLAUDE.md — ClaudeCode プロジェクト指示文

## このプロジェクトについて

**リポジトリ**: DataRecordLab/data-engineering-playground  
**プロダクト名（仮）**: data-engineering-playground  
**本質**: データエンジニアリングを「読む」から「設計して体験する」へ変えるプラットフォーム

---

## 最重要：このプロダクトの本質

### コードを書くツールではない

このプロダクトは **SQLエディタでも、コーディング学習ツールでもない**。

目的は「データエンジニアリングの思考プロセスを体験すること」である。

```
❌ やりたくないこと
  - SQLの書き方を教える
  - コードの正解を判定する
  - ツールの操作を習得させる

✅ やりたいこと
  - パイプラインを設計する体験
  - データの流れを構造として理解する
  - なぜその設計なのかを考える
  - 意思決定を支える仕組みを作る
```

### 核心体験

```
データを見る
    ↓
課題を理解する（なぜ基盤が必要か）
    ↓
パイプラインをノードで設計する
    ↓
各レイヤーの変換・役割を定義する
    ↓
データが流れるのを確認する
    ↓
意思決定に使えるデータができあがる
```

---

## 網羅的に学べるデータエンジニアリング領域

| 領域 | 学べる概念 | 対応レイヤー |
|------|-----------|-------------|
| データ収集・取り込み | Sourceの概念・生データ保持 | Source Layer |
| データ品質・整形 | クレンジング・型変換・正規化 | Staging Layer |
| データモデリング | スタースキーマ・fact/dim・粒度 | Warehouse Layer |
| データ活用 | 分析用テーブル・KPI設計 | Mart Layer |
| パイプライン設計 | 依存関係・DAG・オーケストレーション | 全体 |
| データガバナンス | 命名規則・品質チェック・ドキュメント | 全体 |
| ビジネス理解 | KPI・メトリクス・意思決定 | Mart以降 |

---

## 世界観・ゲーム設計

### DataCraft Agency

プレイヤーは「DataCraft Agency」というデータエンジニアリング専門エージェンシーの新人エンジニア。
様々な業界のクライアントから「データ課題」が届き、クエストとして受注・解決する。

### ゲームループ

```
クエスト選択（業界・難易度を選ぶ）
    ↓
オープニング（クライアントの課題を理解する）
    ↓
パイプライン設計（ノードを繋いで設計する）
    ↓
各レイヤーの実装（変換・整形・モデリング）
    ↓
AIレビュー（設計思想のフィードバック）
    ↓
意思決定（データを使ってビジネス判断）
    ↓
エンディング（次のクエスト解放）
```

### ゲーム要素

| 要素 | 説明 |
|------|------|
| クエスト | 業界別シナリオ（EC・SaaS・医療・金融） |
| ステージ | Source→Staging→Warehouse→Mart |
| XP・レベル | 完了度に応じて獲得 |
| スター評価 | 設計品質を★1〜★3で評価 |
| バッジ | スキル習得の証明 |
| AIレビュー | 設計の思想をフィードバック |

---

## 技術スタック

```
フロントエンド  : Next.js 14+ (App Router) + TypeScript + Tailwind CSS
パイプライン設計: ReactFlow（ノードをビジュアルに繋ぐ設計画面）
SQL実行        : DuckDB WASM（ブラウザ内・サーバー不要）
SQLエディタ    : Monaco Editor（SQLは手段として補助的に使用）
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
│   └── page.tsx                        ← LP（世界観・ゲーム紹介）
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
└── (app)/
    ├── dashboard/page.tsx              ← クエスト選択画面
    └── quest/
        └── [questId]/
            ├── page.tsx                ← オープニング・ストーリー
            └── [stage]/
                └── page.tsx            ← パイプライン設計・実装画面

components/
├── pipeline/
│   ├── PipelineDesigner.tsx            ← ReactFlowノード設計画面（主役）
│   ├── LayerNode.tsx                   ← 各レイヤーのノード
│   └── PipelineMap.tsx                 ← 進捗表示用ミニマップ
├── stage/
│   ├── StageTask.tsx                   ← タスク説明・ミッション
│   ├── DataPreview.tsx                 ← データプレビュー表示
│   └── TransformEditor.tsx             ← 変換定義（SQL or GUI）
└── feedback/
    └── AiFeedback.tsx                  ← AIレビュー表示

lib/
├── supabase/
│   ├── client.ts
│   └── server.ts
├── duckdb/
│   └── engine.ts                       ← DuckDB WASM 初期化・実行
├── scenarios/
│   ├── index.ts                        ← シナリオ一覧
│   └── ec-site/                        ← ECサイトシナリオ（MVP）
│       ├── index.ts
│       ├── data/                       ← サンプルCSVデータ
│       └── stages/                     ← 各ステージ定義
└── ai/
    └── feedback.ts                     ← Claude API フィードバック生成

types/
└── index.ts                            ← 共通型定義
```

---

## Supabaseテーブル設計

```sql
-- 組織（個人も1人orgとして作成・B2B拡張を見据えた設計）
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT DEFAULT 'personal',
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
  quest_id     TEXT NOT NULL,
  stage        TEXT NOT NULL,
  status       TEXT DEFAULT 'locked',
  stars        INTEGER DEFAULT 0,
  pipeline_design JSONB,              ← ノード設計の保存
  xp_earned    INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- バッジ
CREATE TABLE user_badges (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   UUID REFERENCES users(id),
  badge_id  TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 実装方針・ルール

### 基本方針

1. **体験優先**: コードを書かせるのではなく、設計を考えさせる
2. **MVP志向**: ECサイト初級クエスト1本を完成させることが最初のゴール
3. **ノード設計が主役**: PipelineDesignerがこのアプリの核心コンポーネント
4. **SQL補助的**: SQLは変換定義の手段。将来的にGUI定義に置き換えてもいい
5. **型安全**: TypeScriptの型を必ず定義する。`any`は使わない

### コーディング規則

```typescript
// コンポーネント: PascalCase
// ユーティリティ: camelCase
// 型定義: types/index.ts に集約
// Server Components優先・Client Componentsは最小限
```

### 環境変数

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

### AIフィードバック方針

```
- 上司キャラ「田中シニアエンジニア」として話す
- 設計の「なぜ」を必ず説明する
- ★1: 動く / ★2: 良い設計 / ★3: ベストプラクティス
- 改善提案を必ず1つ以上含める
- コードの正誤ではなく、設計思想を評価する
```

---

## 現在の実装状況

- [x] Next.js プロジェクト作成
- [x] 必要パッケージインストール
- [x] ドキュメント整備（CLAUDE.md / docs/）
- [ ] Supabase接続・認証
- [ ] PipelineDesigner（ReactFlowノード設計画面）
- [ ] DataPreview（データプレビュー）
- [ ] DuckDB初期化・SQL実行
- [ ] ECサイトシナリオ定義
- [ ] クエスト選択画面
- [ ] AIフィードバック
- [ ] ゲーム要素（XP・スター・バッジ）

---

## 詳細ドキュメント

- `docs/GAME_DESIGN.md` — 世界観・クエスト・ゲーム要素
- `docs/SCENARIOS.md` — シナリオ・タスク設計
- `docs/TECHNICAL.md` — 技術設計・実装コード
- `docs/UI_DESIGN.md` — 画面設計・UXフロー
- `docs/DE_CONCEPTS.md` — 学ばせたいデータエンジニアリング概念一覧
