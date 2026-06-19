# UI_DESIGN.md — 画面設計・UXフロー

## 画面一覧

| 画面ID | 画面名 | パス | 役割 |
|--------|--------|------|------|
| S-01 | LP | `/` | 世界観・ゲーム紹介 |
| S-02 | ログイン | `/login` | 認証 |
| S-03 | サインアップ | `/signup` | 新規登録 |
| S-04 | クエスト選択 | `/dashboard` | クエスト一覧・進捗 |
| S-05 | メイン構築画面 | `/quest/[id]/[stage]` | SQLエディタ・メイン体験 |
| S-06 | エンディング | `/quest/[id]/complete` | クエスト完了・報酬 |
| S-07 | スキル画面 | `/skills` | 獲得バッジ・スキル一覧 |

---

## S-04: クエスト選択画面（dashboard）

```
┌─────────────────────────────────────────────────────┐
│ DataCraft Agency              Lv.2 [===45%] [田中]  │ ← トップバー
├─────────────────────────────────────────────────────┤
│                                                     │
│  おかえりなさい、田中さん                              │
│  今日もクエストが届いています。                        │
│                                                     │
│  ┌───────────────┐  ┌───────────────┐              │
│  │ 🛒 初級       │  │ 📊 中級       │              │
│  │ 売上が見えない │  │ 解約率を下げろ │              │
│  │ 進行中        │  │ 🔒 Lv.3必要   │              │
│  │ ██░░░ 40%     │  │               │              │
│  │ [続ける →]    │  │               │              │
│  └───────────────┘  └───────────────┘              │
│                                                     │
│  ┌───────────────┐  ┌───────────────┐              │
│  │ 🏥 中級       │  │ 💰 上級       │              │
│  │ 患者データを  │  │ 金融リスクを  │              │
│  │ 守れ          │  │ 計算せよ      │              │
│  │ 🔒 Lv.3必要   │  │ 🔒 Lv.5必要   │              │
│  └───────────────┘  └───────────────┘              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## S-05: メイン構築画面（最重要画面）

```
┌──────────────────────────────────────────────────────────────────┐
│ DataCraft    [クエスト] [スキル] [実績]         Lv.2 [===] 田中  │
├──────────────────────────────────────────────────────────────────┤
│ 左サイドバー(200px) │ 中央エリア(~400px)    │ 右パネル(200px)    │
│                    │                       │                    │
│ [クエスト進捗]      │ [ステージ情報]         │ [クエリ結果]        │
│  ✅ オープニング   │  Stage 2: Source Layer │  ┌─────────────┐  │
│  ▶ Source ←今      │  ECサイト / 初級       │  │order_id│amt │  │
│  🔒 Staging        │                       │  │ORD-001 │1500│  │
│  🔒 Warehouse      │ [パイプライン進捗]      │  │ORD-002 │3200│  │
│  🔒 Mart           │  Source→Staging→      │  └─────────────┘  │
│                    │  Warehouse→Mart        │  5行 · 0.02秒      │
│ ─────────────      │                       │                    │
│ [パイプラインMAP]   │ [ミッション]           │ ─────────────      │
│                    │  src_ordersテーブルを  │ [AIレビュー]        │
│  Source  ✅        │  作成し、CSVデータを   │  ★★☆             │
│    ↓               │  そのまま格納せよ      │  「基本構造は       │
│  Staging 🔒        │                       │  正しいです。        │
│    ↓               │ [SQLエディタ]          │  _loaded_atを       │
│  Warehouse 🔒      │  ┌──────────────────┐ │  追加すると         │
│    ↓               │  │CREATE TABLE      │ │  さらに良くなります」│
│  Mart 🔒           │  │src_orders AS     │ │                    │
│                    │  │SELECT * FROM...  │ │  [改善を適用する]   │
│                    │  └──────────────────┘ │                    │
│                    │  [▶ 実行] [💡 ヒント]  │  [次のステージへ→] │
└──────────────────────────────────────────────────────────────────┘
```

---

## コンポーネント設計

### SqlEditor.tsx

```typescript
'use client';

import Editor from '@monaco-editor/react';

interface SqlEditorProps {
  initialValue: string;
  onExecute: (sql: string) => void;
  disabled?: boolean;
}

export function SqlEditor({ initialValue, onExecute, disabled }: SqlEditorProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted px-3 py-2 text-xs text-muted-foreground flex justify-between">
        <span>SQL エディタ</span>
        <span>DuckDB</span>
      </div>
      <Editor
        height="200px"
        defaultLanguage="sql"
        defaultValue={initialValue}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
        }}
        onMount={(editor) => {
          // Cmd+Enter で実行
          editor.addCommand(
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
            () => onExecute(editor.getValue())
          );
        }}
      />
    </div>
  );
}
```

### PipelineMap.tsx（Reactflow使用）

```typescript
'use client';

import ReactFlow, { Node, Edge } from 'reactflow';

const LAYERS = ['source', 'staging', 'warehouse', 'mart'] as const;

interface PipelineMapProps {
  completedStages: string[];
  currentStage: string;
}

export function PipelineMap({ completedStages, currentStage }: PipelineMapProps) {
  const nodes: Node[] = LAYERS.map((layer, i) => ({
    id: layer,
    position: { x: 0, y: i * 80 },
    data: { label: layer.charAt(0).toUpperCase() + layer.slice(1) },
    style: {
      background: completedStages.includes(layer) ? '#E1F5EE' :
                  currentStage === layer ? '#E6F1FB' : '#F1EFE8',
      border: currentStage === layer ? '1px solid #378ADD' : '1px solid #D3D1C7',
      borderRadius: 8,
      fontSize: 12,
      width: 120,
    },
  }));

  const edges: Edge[] = LAYERS.slice(0, -1).map((layer, i) => ({
    id: `${layer}-${LAYERS[i + 1]}`,
    source: layer,
    target: LAYERS[i + 1],
    type: 'smoothstep',
  }));

  return (
    <div style={{ height: 320 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView />
    </div>
  );
}
```

---

## UXフロー

### 初回ユーザーの体験フロー

```
LP（世界観を見る）
    ↓ 「はじめる」
サインアップ
    ↓ 自動でorg・進捗初期化
クエスト選択（EC初級が解放済み）
    ↓ 「はじめる」
オープニング（ストーリー読む）
    ↓ 「課題を理解した」
Stage 2: Source Layer
    ↓ SQLを書く → 実行 → AIレビュー
    ↓ ★2獲得 → XP+100
Stage 3: Staging Layer
    ...
```

### SQLエディタの操作フロー

```
1. ミッションを読む
2. SQLを書く（Monaco Editor）
3. 実行ボタン or Cmd+Enter
4. 結果テーブルを確認
5. AIレビューを受ける（自動or手動）
6. 改善 → 再実行（繰り返し可）
7. 「次のステージへ」でクリア
```

---

## デザイントークン（Tailwind設定）

```typescript
// tailwind.config.ts の追加設定
theme: {
  extend: {
    colors: {
      // ゲームUI専用カラー
      'quest-completed': '#E1F5EE',
      'quest-active': '#E6F1FB',
      'quest-locked': '#F1EFE8',
      'star-gold': '#EF9F27',
      'xp-bar': '#378ADD',
    }
  }
}
```

---

## アニメーション設計

### ★獲得アニメーション

```css
@keyframes starPop {
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.3) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.star-appear {
  animation: starPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
```

### XPバーアニメーション

```css
@keyframes xpFill {
  from { width: var(--xp-before); }
  to { width: var(--xp-after); }
}

.xp-bar-fill {
  animation: xpFill 1s ease-out forwards;
}
```

### クエスト完了演出

```
1. パイプラインMAPの全ノードが緑にフラッシュ
2. 「クエスト完了！」モーダル表示
3. 獲得バッジをアニメーション表示
4. XP加算アニメーション
5. 「次のクエストへ」ボタン
```
