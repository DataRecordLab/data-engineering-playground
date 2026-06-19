# UI_DESIGN.md — 画面設計・UXフロー

## 設計の大原則

> **パイプライン設計画面が主役。SQLエディタは補助。**

ユーザーが「データ基盤を設計している」という感覚を持てるUI設計を最優先にする。

---

## 画面一覧

| 画面ID | 画面名 | パス | 役割 |
|--------|--------|------|------|
| S-01 | LP | `/` | 世界観・ゲーム紹介 |
| S-02 | ログイン | `/login` | 認証 |
| S-03 | サインアップ | `/signup` | 新規登録 |
| S-04 | クエスト選択 | `/dashboard` | クエスト一覧・進捗・XP |
| S-05 | オープニング | `/quest/[id]` | ストーリー・課題理解 |
| S-06 | パイプライン設計 | `/quest/[id]/design` | ノード設計画面（主役） |
| S-07 | ステージ実装 | `/quest/[id]/[stage]` | 各レイヤーの実装 |
| S-08 | AIレビュー | `/quest/[id]/[stage]/review` | 設計フィードバック |
| S-09 | 意思決定 | `/quest/[id]/decision` | データで答える |
| S-10 | エンディング | `/quest/[id]/complete` | 完了・報酬・次へ |
| S-11 | スキル画面 | `/skills` | バッジ・学習済み概念 |

---

## S-04: クエスト選択画面

```
┌──────────────────────────────────────────────┐
│ DataCraft Agency          Lv.2 [===45%] 田中 │
├──────────────────────────────────────────────┤
│                                              │
│  おかえりなさい                               │
│  新しい依頼が届いています                      │
│                                              │
│  ┌────────────────┐  ┌────────────────┐     │
│  │ 🛒 初級        │  │ 📊 中級        │     │
│  │ 売上が見えない  │  │ 解約率を下げろ  │     │
│  │ EC / 90分      │  │ SaaS / 120分   │     │
│  │ 進行中 40%     │  │ 🔒 Lv.3必要    │     │
│  │ [続ける]       │  │                │     │
│  └────────────────┘  └────────────────┘     │
│                                              │
│  あなたのスキル                               │
│  Source ★★★  Staging ★★☆  Warehouse ★☆☆  │
│                                              │
└──────────────────────────────────────────────┘
```

---

## S-06: パイプライン設計画面（主役）

ノードをビジュアルに繋いでパイプラインを設計する。ReactFlow使用。

```
┌──────────────────────────────────────────────────────┐
│ DataCraft    [設計] [実装] [レビュー]    Lv.2 田中    │
├──────────────────────────────────────────────────────┤
│ ツールバー                                            │
│ [+ ノード追加] [← 元に戻す] [保存]                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  [orders.csv] ──→ [ Source Layer ] ──→ [Staging]    │
│       ↓                  ↓                 ↓         │
│  [users.csv]  ──→ [ src_orders  ]    [stg_orders]   │
│                   [ src_users   ]    [stg_users  ]   │
│  [products.csv]→ [ src_products ]    [stg_products]  │
│                                         ↓            │
│                               [ Warehouse Layer ]    │
│                               [ fact_orders      ]   │
│                               [ dim_users        ]   │
│                               [ dim_products     ]   │
│                                         ↓            │
│                               [ Mart Layer       ]   │
│                               [ mart_daily_sales ]   │
│                                                      │
│  各ノードをクリックすると実装画面へ                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### ノードの状態

| 状態 | 見た目 | 意味 |
|------|--------|------|
| locked | グレー・🔒 | まだ実装できない |
| available | ブルー・点滅 | 次に実装するノード |
| in_progress | ブルー実線 | 実装中 |
| completed | グリーン・✓ | 実装完了 |

---

## S-07: ステージ実装画面

パイプライン設計画面からノードをクリックすると開く。

```
┌────────────────────────────────────────────────────────────────┐
│ DataCraft    [設計に戻る]                      Lv.2 田中       │
├──────────────┬─────────────────────────────┬──────────────────┤
│ 左: 進捗     │ 中央: 実装エリア             │ 右: データ確認    │
│              │                             │                  │
│ クエスト進捗  │ [ステージ情報]              │ [データプレビュー] │
│ ✅ 設計完了  │  Staging Layer              │ src_orders       │
│ ✅ Source    │  データを整えろ              │ ┌─────────────┐  │
│ ▶ Staging ← │                             │ │order_id│amt │  │
│ 🔒 Warehouse │ [上司メッセージ]            │ │ORD-001 │1500│  │
│ 🔒 Mart     │ 「amountがVARCHAR           │ │ORD-002 │3200│  │
│              │ のままだと集計              │ └─────────────┘  │
│ ──────────── │ エラーになる」              │                  │
│ 学習中の概念  │                             │ [変換後プレビュー] │
│              │ [変換定義エリア]            │ stg_orders       │
│ データ品質   │ （SQL or GUI）              │ ┌─────────────┐  │
│ 型変換       │ ┌─────────────────────┐   │ │order_id│amt │  │
│ 表記揺れ     │ │SELECT               │   │ │ORD-001 │1500│  │
│              │ │  order_id,          │   │ │ORD-002 │3200│  │
│              │ │  TRY_CAST(amount    │   │ └─────────────┘  │
│              │ │  AS NUMERIC)...     │   │                  │
│              │ └─────────────────────┘   │ [AIレビュー]      │
│              │ [▶ 実行] [💡 ヒント]       │ ★★☆            │
│              │                             │ 「型変換は正し   │
│              │ [✓ このステージを完了]      │ いです。NULL     │
│              │                             │ の扱いも考えて」 │
└──────────────┴─────────────────────────┴──────────────────┤
```

---

## コンポーネント設計

### LayerNode.tsx（ReactFlowノード）

```typescript
interface LayerNodeProps {
  data: {
    label: string;
    description: string;
    status: 'locked' | 'available' | 'in_progress' | 'completed';
    tables: string[];
    conceptTaught: string;
  };
}

export function LayerNode({ data }: LayerNodeProps) {
  const statusStyles = {
    locked: 'bg-gray-100 border-gray-300 opacity-50',
    available: 'bg-blue-50 border-blue-300 animate-pulse',
    in_progress: 'bg-blue-100 border-blue-500',
    completed: 'bg-green-50 border-green-500',
  };

  return (
    <div className={`rounded-lg border-2 p-4 min-w-48 ${statusStyles[data.status]}`}>
      <div className="flex items-center gap-2 mb-2">
        {data.status === 'completed' && <span className="text-green-600">✓</span>}
        {data.status === 'locked' && <span>🔒</span>}
        <span className="font-medium">{data.label}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{data.description}</p>
      {data.tables.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {data.tables.map(t => (
            <span key={t} className="text-xs bg-white px-2 py-0.5 rounded border">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

### DataPreview.tsx

```typescript
interface DataPreviewProps {
  tableName: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export function DataPreview({ tableName, columns, rows, rowCount }: DataPreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 flex justify-between">
        <span>{tableName}</span>
        <span>{rowCount}行</span>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead>
            <tr className="bg-gray-100">
              {columns.map(col => (
                <th key={col} className="px-2 py-1 text-left font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {columns.map(col => (
                  <td key={col} className="px-2 py-1 text-gray-600">
                    {row[col] === null ? <span className="text-red-400">NULL</span> : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## UXフロー

### 初回ユーザー

```
LP（世界観を見る）
    ↓ 「DataCraft Agencyに入社する」
サインアップ
    ↓
クエスト選択（EC初級が解放済み）
    ↓ 「依頼を受ける」
オープニング（クライアントの課題を読む）
    ↓ 「パイプラインを設計する」
パイプライン設計画面（ノードを繋ぐ）
    ↓ 各ノードをクリック
各レイヤーの実装
    ↓
AIレビュー → 改善 → 再実装
    ↓
意思決定（データでビジネス課題に答える）
    ↓
エンディング（達成感・次のクエスト解放）
```

### 「パイプライン設計が主役」のUX設計ポイント

1. 最初にパイプライン全体図を見せる（ゴールを先に見せる）
2. ノードを繋ぐ操作が楽しい（ドラッグ&ドロップ）
3. 各レイヤーに「なぜ必要か」の説明を必ず表示する
4. SQLは「変換の定義」として補助的に使う
5. データが変換されていく様子を視覚的に見せる

---

## アニメーション設計

### データフロー可視化（パイプライン完成時）
```
データがノードからノードへ流れるアニメーション
CSV → src_orders → stg_orders → fact_orders → mart_sales
（パーティクルが流れるイメージ）
```

### ★獲得・バッジ獲得
```css
@keyframes starPop {
  0% { transform: scale(0) rotate(-20deg); opacity: 0; }
  60% { transform: scale(1.3) rotate(5deg); }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
```

### クエスト完了
```
1. パイプライン全ノードが緑にフラッシュ
2. データフローアニメーション（全体）
3. 「Quest Complete！」モーダル
4. 獲得バッジ表示
5. XP加算アニメーション
6. 「次のクエストへ」
```
