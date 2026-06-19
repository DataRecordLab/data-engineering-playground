<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Agent 定義（案A: 技術レイヤー別）

> 将来的に案B（ゲーム機能別）へ移行する可能性があるため、  
> 各エージェントの責任範囲を明示し、再編時の移行先もコメントに残す。

---

## Frontend Agent

**役割**: UI・画面・コンポーネントの実装

**担当ディレクトリ**:
- `app/` 配下のすべての `page.tsx` / `layout.tsx`
- `components/` 配下のすべてのコンポーネント
- `app/globals.css` / Tailwind 設定

**技術スタック**: Next.js 14+ App Router, TypeScript, Tailwind CSS, Reactflow, Zustand

**ルール**:
- Server Components をデフォルトにし、`'use client'` は最小限に留める
- コンポーネントは `components/` に切り出す（`page.tsx` には置かない）
- ゲームUIは世界観（DataCraft Agency の新人エンジニア）を意識したデザインにする
- 状態管理が必要な場合は Zustand を使う

**案Bへの移行時**: Quest Agent / Editor Agent / Progress Agent に分割される

---

## Data Agent

**役割**: DuckDB WASM によるSQL実行エンジンとシナリオデータの管理

**担当ディレクトリ**:
- `lib/duckdb/`
- `lib/scenarios/`

**技術スタック**: DuckDB WASM, TypeScript

**ルール**:
- SQL実行はすべてブラウザ内 DuckDB で行う（バックエンドAPI呼び出し禁止）
- シナリオ定義は `lib/scenarios/{scenario-id}/` 配下に格納する
- シナリオの構造は `index.ts` / `data/` (CSV) / `stages/` (ステージ定義) に分ける
- `any` 型は使わない。シナリオ・ステージの型は `types/index.ts` に定義する

**案Bへの移行時**: Quest Agent（シナリオ定義部分）と Editor Agent（DuckDB実行部分）に分割される

---

## Backend Agent

**役割**: Supabase による認証・データ永続化の実装

**担当ディレクトリ**:
- `lib/supabase/`
- Supabase マイグレーション・RLS ポリシー

**技術スタック**: Supabase (Auth + PostgreSQL), Next.js Server Components

**ルール**:
- ブラウザ用クライアントは `lib/supabase/client.ts`、Server Components 用は `lib/supabase/server.ts` に分離する
- RLS（Row Level Security）を必ず有効にする
- テーブル設計は `CLAUDE.md` のスキーマ定義に従う
- 認証状態の取得は Server Components 側で行い、クライアントには最小限の情報だけ渡す

**案Bへの移行時**: Progress Agent（進捗・XP・バッジ管理）に吸収される

---

## AI Agent

**役割**: Claude API を使ったフィードバック生成

**担当ディレクトリ**:
- `lib/ai/`
- `components/feedback/`

**技術スタック**: Anthropic SDK (claude-sonnet-4-6), Next.js Route Handlers

**ルール**:
- Claude API 呼び出しは `lib/ai/feedback.ts` に集約する
- フィードバックは「上司キャラクター（DataCraft Agency のシニアエンジニア）」の口調で生成する
- ★評価の基準: ★1=動く / ★2=良い設計 / ★3=ベストプラクティス
- 改善提案を必ず1つ以上含める
- プロンプトはシナリオ・ステージごとに差し替えられる構造にする
- ANTHROPIC_API_KEY は環境変数から読む（ハードコード禁止）

**案Bへの移行時**: Feedback Agent としてそのまま独立エージェントになる

---

## エージェント間の依存関係

```
Frontend Agent
    ├── Data Agent   （シナリオデータ・SQL実行結果を受け取る）
    ├── Backend Agent（認証状態・進捗データを受け取る）
    └── AI Agent     （フィードバック結果を表示する）
```

型定義（`types/index.ts`）はすべてのエージェントが参照する共有リソース。
変更時は全エージェントへの影響を確認すること。
