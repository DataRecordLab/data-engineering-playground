<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent 定義（技術レイヤー別）

エージェントは **技術レイヤー別（Frontend / Data / Backend / AI）** で責任範囲を分ける。

## 実装フェーズとスコープ

| フェーズ | 目標 | スコープ |
|---------|------|---------|
| **Phase 0（真のMVP）** | 「データが流れる体験」を最小構成で成立させる | ノード4種（CSV Source / Filter / Aggregate / Table Output）のみ。認証・Supabase・AIフィードバック不要 |
| **Phase 1（Quest 1）** | ゲームとしての体験を完成させる | ECサイト初級クエスト全5ステージ・認証・AIレビュー込み |
| **Phase 2以降** | クエスト拡張 | SaaS / 医療 / 金融クエスト・チーム機能 |

**現在の実装ターゲット**: Phase 0 → Phase 1 の順で進める。  
Phase 0が動く前にSupabase・AI Agent・ゲーム要素に手をつけない。

> **共有リソース**: `types/index.ts` はすべてのエージェントが参照する。  
> 型を変更する際は全エージェントへの影響を確認すること。変更はこのファイルに集約し、各エージェント内で独自型を定義しない。

---

## Frontend Agent

**役割**: 画面・UI・コンポーネントの実装。ゲームとしての体験品質を担う。

### 担当ファイル

```
app/
├── (public)/page.tsx              ← LP（世界観・ゲーム紹介）
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
└── (app)/
    ├── dashboard/page.tsx         ← クエスト選択画面（S-04）
    └── quest/
        └── [questId]/
            ├── page.tsx           ← オープニング・ストーリー（S-05）
            └── [stage]/
                └── page.tsx       ← パイプライン設計・実装画面（S-06/07）

components/
├── pipeline/
│   ├── PipelineDesigner.tsx       ← ReactFlowノード設計画面（主役コンポーネント）
│   ├── LayerNode.tsx              ← 各レイヤーのノード
│   └── PipelineMap.tsx            ← 進捗表示用ミニマップ
├── stage/
│   ├── StageTask.tsx              ← タスク説明・ミッション表示
│   ├── DataPreview.tsx            ← DuckDB実行結果のテーブル表示
│   └── TransformEditor.tsx        ← SQL入力エリア（Monaco Editor）
└── feedback/
    └── AiFeedback.tsx             ← AIレビュー結果の表示

app/globals.css                    ← アニメーション含むグローバルスタイル
```

### 技術スタック

Next.js 14+ App Router / TypeScript / Tailwind CSS / ReactFlow / Zustand / Monaco Editor

### ルール

- `'use client'` は最小限。ReactFlow・Monaco Editor などインタラクティブな部分のみ
- `page.tsx` にコンポーネントを直接書かない。必ず `components/` に切り出す
- パイプライン設計画面（`PipelineDesigner.tsx`）がこのアプリの主役。UI品質を最優先にする
- `dynamic import` を使い、ReactFlow・Monaco Editor は SSR を無効化して遅延ロードする
- ゲームUIはDataCraft Agencyの世界観（新人エンジニアがクライアント依頼を受ける）を意識する
- ★・バッジ・XPの演出アニメーションは `globals.css` で定義する

---

## Data Agent

**役割**: DuckDB WASM によるSQL実行エンジンと、Quest 1シナリオデータの定義・管理。

### 担当ファイル

```
lib/
├── duckdb/
│   └── engine.ts                  ← DuckDB WASM 初期化・SQL実行・CSV登録
└── scenarios/
    ├── index.ts                   ← シナリオ一覧（QuestId → Quest のマップ）
    └── ec-site/                   ← MVP: ECサイトシナリオ
        ├── index.ts               ← Quest定義（タイトル・難易度・CSV・ステージ一覧）
        ├── data/
        │   ├── orders.csv         ← 意図的な問題を含むサンプルデータ
        │   ├── users.csv
        │   └── products.csv
        └── stages/
            ├── source.ts          ← Source Layer ステージ定義
            ├── staging.ts         ← Staging Layer ステージ定義
            ├── warehouse.ts       ← Warehouse Layer ステージ定義
            └── mart.ts            ← Mart Layer ステージ定義
```

### 技術スタック

DuckDB WASM / TypeScript

### ルール

- SQL実行はすべてブラウザ内DuckDBで行う。バックエンドAPIへのデータ処理リクエスト禁止
- `engine.ts` のシングルトンDB（`let db`）は必ず再利用する。毎回初期化しない
- DuckDB WASMの初回ロードは2〜3秒かかる。Frontend Agentと連携してローディング表示を出す
- シナリオ定義の型は `types/index.ts` の `Quest` / `Stage` / `ValidationRule` に従う
- `any` 型は使わない
- バリデーションルール（`ValidationRule[]`）はステージ定義ファイル内に記述し、SQL実行後に `engine.ts` 経由でチェックする
- DuckDB WASMの `DAYNAME()` 関数は使わず、`strftime('%A', ...)` を使うこと（互換性の問題）

---

## Backend Agent

**役割**: Supabase による認証・ユーザー管理・進捗の永続化。

### 担当ファイル

```
lib/
└── supabase/
    ├── client.ts                  ← ブラウザ用クライアント
    └── server.ts                  ← Server Components用クライアント

app/
└── (auth)/
    ├── login/actions.ts           ← ログイン Server Action
    └── signup/actions.ts          ← サインアップ + 初期化 Server Action

supabase/
└── migrations/                    ← テーブル定義・RLSポリシー（SQL）
```

### Supabaseテーブル（4テーブル）

```
organizations   ← 個人も1人orgとして作成（B2B拡張を見据えた設計）
users           ← Supabase auth.usersと1:1・level/total_xpを保持
user_progress   ← quest_id + stage ごとの進捗・stars・pipeline_design(JSONB)
user_badges     ← 獲得バッジの記録
```

### 技術スタック

Supabase (Auth + PostgreSQL) / Next.js Server Actions / Next.js Server Components

### ルール

- ブラウザ用 `client.ts` とServer Components用 `server.ts` を必ず分ける
- 認証状態の取得はServer Components側で行う。クライアントには最小限の情報だけ渡す
- すべてのテーブルにRLS（Row Level Security）を有効にする
- ユーザー作成時は `organizations` → `users` → `user_progress`（初期ステージ）の順で初期化する
- `pipeline_design` はノード定義（`PipelineNode[]`）をJSONBで保存する
- `user_progress.status` の遷移は `locked → in_progress → completed` のみ許可

---

## AI Agent

**役割**: Claude APIを使った設計レビュー・フィードバック生成。

### 担当ファイル

```
lib/
└── ai/
    └── feedback.ts                ← フィードバック生成・プロンプト構築

app/
└── api/
    └── feedback/
        └── route.ts               ← Route Handler（ANTHROPIC_API_KEYはサーバー側のみ）

components/
└── feedback/
    └── AiFeedback.tsx             ← フィードバック表示UI（Frontend Agentと共同管理）
```

### 技術スタック

Anthropic SDK (`@anthropic-ai/sdk`) / Next.js Route Handlers

### ルール

- Claude API呼び出しは `lib/ai/feedback.ts` の `generateFeedback()` に集約する。分散させない
- `ANTHROPIC_API_KEY` は環境変数から読む。クライアントサイドに露出させない（Route Handler経由のみ）
- 使用モデルは `claude-sonnet-4-6`（固定）
- フィードバックは必ずJSON形式で返す（`FeedbackResponse` 型）。マークダウンや自由テキストで返させない
- プロンプト内のキャラクター設定：DataCraft Agencyのシニアエンジニア「田中」。コードの正誤ではなく設計思想を評価する
- ★評価基準を必ずプロンプトに含める：★1=動く / ★2=設計の意図が正しい / ★3=ベストプラクティス
- 改善提案（`improvements[]`）を必ず1件以上含める
- ステージごとに `conceptTaught`（このステージで学ぶ概念）をプロンプトに渡す

---

## エージェント間の依存関係

```
Frontend Agent
    ├── Data Agent   ← シナリオ定義・SQL実行結果・バリデーション結果を受け取る
    ├── Backend Agent← 認証状態・ユーザー進捗を受け取る
    └── AI Agent     ← フィードバック結果（FeedbackResponse）を受け取って表示

shared: types/index.ts（全エージェントが参照）
```

### データフロー（Quest 1の例）

```
1. Backend Agent  → ユーザー認証・進捗ロード
2. Data Agent     → ECサイトシナリオ・CSVをDuckDBに登録
3. Frontend Agent → PipelineDesignerでノード設計を表示
4. Data Agent     → ユーザーのSQL実行・バリデーション
5. AI Agent       → 設計レビュー生成（Route Handler経由）
6. Backend Agent  → 進捗・stars・XP・pipelineDesignをSupabaseに保存
```

---

## 完了定義

### Phase 0（真のMVP）完了条件

「データが流れる体験」が成立すること。認証・Supabase・AIフィードバックは不要。

- [ ] ReactFlowキャンバスに4種のノードが表示できる（CSV Source / Filter / Aggregate / Table Output）
- [ ] ノードをドラッグ&ドロップで繋げる
- [ ] 売上CSVをCSV Sourceノードに読み込める
- [ ] Filter・Aggregateの条件を定義して実行できる
- [ ] DuckDB内でデータが変換され、Table Outputに結果が表示される
- [ ] 「日別売上」が正しく集計されて見える

### Phase 1（Quest 1）完了条件

ゲームとしての体験が動作すること:

- [ ] サインアップ・ログイン
- [ ] クエスト選択画面でQuest 1が表示される
- [ ] オープニングのストーリーが読める
- [ ] PipelineDesignerでSource / Staging / Warehouse / Martのノードが表示・接続できる
- [ ] 各ステージでSQL変換を実行し、DuckDB内でデータが変換される
- [ ] バリデーションが通るとステージ完了になる
- [ ] AIレビューが★評価付きで返ってくる
- [ ] Martステージで「木曜日が最も売上が低い」という答えが出せる
- [ ] 進捗がSupabaseに保存される
