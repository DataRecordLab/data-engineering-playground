# UI_DESIGN.md — 画面設計・UXフロー

## 設計の大原則

> **パイプライン設計画面が主役。SQLエディタは補助。**
> **キャラクターと地図がゲームの「世界」を作る。**

ユーザーが「データ基盤を設計している」という感覚と、「RPGの世界を冒険している」没入感を両立させる。

---

## デザインシステム

### 全体トーン
- **ダークテーマ** (`slate-950` ベース) を基本とする
- ネオンアクセント（クエスト区画ごとに固有カラー）
- ピクセルアート要素 × ガラスモーフィズム UI の共存
- `image-rendering: pixelated` でスプライトをシャープに表示

### タイポグラフィ
- UI 文字: `Geist` (サンセリフ・モダン)
- ダイアログ文字: `Geist Mono` または等幅フォント (レトロ感)
- ピクセルフォント: キャラクター名や演出テキストに `Press Start 2P` (Google Fonts) を使用

### カラーパレット

| 用途 | カラー |
|------|--------|
| 背景 (深夜) | `#0A0E1A` |
| カード背景 | `#0F172A` (slate-950) |
| 境界線 | `#1E293B` (slate-800) |
| Quest 1 アクセント | `#F39C12` (オレンジ) |
| Quest 2 アクセント | `#8E44AD` (パープル) |
| Quest 3 アクセント | `#2980B9` (ブルー) |
| Quest 4 アクセント | `#D4AC0D` (ゴールド) |
| DataCraft HQ | `#3498DB` (シアン) |
| 成功 | `#27AE60` |
| 警告 | `#E67E22` |
| エラー | `#E74C3C` |

---

## 画面一覧

| 画面ID | 画面名 | パス | 役割 |
|--------|--------|------|------|
| S-01 | LP | `/` | 世界観・ゲーム紹介 |
| S-02 | ログイン | `/login` | 認証 |
| S-03 | サインアップ | `/signup` | 新規登録 |
| **S-03b** | **キャラクター作成** | `/onboarding` | **名前・外見カスタマイズ（サインアップ直後）** |
| S-03c | プランアップグレード | `/upgrade` | Proプラン購入（Stripe） |
| **S-04** | **ワールドマップ** | `/dashboard` | **DataCraft City の地図からクエスト選択** |
| S-05 | オープニング | `/quest/[id]` | キャラクターダイアログ + CSV プレビュー |
| S-06 | パイプライン設計 | `/quest/[id]/design` | ノード設計画面（主役） |
| S-07 | ステージ実装 | `/quest/[id]/[stage]` | 各レイヤーの実装 |
| S-08 | AIレビュー | 統合 (S-07 右パネル) | 田中のキャラクターダイアログ |
| S-09 | 意思決定 | `/quest/[id]/decision` | データで答える |
| S-10 | エンディング | `/quest/[id]/complete` | 完了・報酬・次へ |
| S-11 | スキル画面 | `/skills` | バッジ・学習済み概念 |

---

## S-03b: キャラクター作成（オンボーディング）

サインアップ直後に1度だけ表示。プレイヤーキャラクターを作る画面。

### レイアウト

```
┌──────────────────────────────────────────────────────────┐
│ ◈ DataCraft Agency                            Step 1/2   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│      「DataCraft Agencyへようこそ。                       │
│        まずあなたのことを教えてください。」                  │
│                         — 田中 [neutral]                 │
│                                                          │
│  ┌─────────────────┐  ┌───────────────────────────────┐  │
│  │                 │  │  表示名                        │  │
│  │   [スプライト]   │  │  ┌─────────────────────────┐  │  │
│  │   (idle-bob)    │  │  │ あなたの名前...          │  │  │
│  │                 │  │  └─────────────────────────┘  │  │
│  │  ▼ 外見設定     │  │                               │  │
│  │  肌: ●●●●●     │  │  職種タイトル                  │  │
│  │  髪型: ◎○○○   │  │  ┌─────────────────────────┐  │  │
│  │  髪色: ●●●●●  │  │  │ Data Engineer ▼         │  │  │
│  │  服装: ◎○○○   │  │  └─────────────────────────┘  │  │
│  │  服色: ●●●●●  │  │                               │  │
│  │  眼鏡: □ ON    │  │  [Freeプランバナー]             │  │
│  │                 │  │  Proにすると全色・全スタイル    │  │
│  └─────────────────┘  └───────────────────────────────┘  │
│                                                          │
│              [スキップ]  [入社する →]                    │
└──────────────────────────────────────────────────────────┘
```

### Freeプランの制限表示

- 肌・髪型・服装の選択肢でPro限定オプションには🔒アイコン
- 色パレットの大部分がグレーアウト（3色のみ選択可能）
- 「Proにアップグレードすると全色・全スタイル解放」バナー

### プランアップグレード誘導タイミング

| タイミング | 表示内容 |
|-----------|---------|
| オンボーディング中 | Pro限定オプションに🔒 + 「解放する」リンク |
| Quest 2クリック時 | モーダル「このクエストはProプラン限定です」 |
| AIフィードバック3回目 | バナー「本日の制限に達しました」 |
| キャラクター設定画面 | 色・スタイルのロック表示 |

---

## S-04: ワールドマップ（クエスト選択）

クエスト選択画面は **DataCraft City の夜景マップ** として表現する。
プレイヤーキャラクターが中央の DataCraft HQ に立ち、各区画をクリックしてクエストへ移動する。

### レイアウト

```
┌──────────────────────────────────────────────────────────┐
│ ◈ DataCraft Agency         Lv.1 [==--] 120 XP   [Menu] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ╔════════════════════════════════════════════════════╗  │
│  ║          DataCraft City — 深夜 02:14              ║  │
│  ║  ★ . . ✦ . ★ . . . ✦ . ★  (星アニメ)           ║  │
│  ║                                                   ║  │
│  ║  ┌──────────┐    ┌──────────┐    ┌──────────┐   ║  │
│  ║  │🏪 商業区  │    │ DataCraft│    │🏥 医療    │   ║  │
│  ║  │          │    │   HQ     │    │センター   │   ║  │
│  ║  │▓▓▓▓▓▓▓▓│    │  [You]   │    │░░░░░░░░│   ║  │
│  ║  │Quest 1 ▶│    │  ★Lv.1  │    │🔒 Lv.3  │   ║  │
│  ║  │ShopNow  │    └──────────┘    │CareHub  │   ║  │
│  ║  └──────────┘         │         └──────────┘   ║  │
│  ║       ネオン点灯      道         霧がかかる      ║  │
│  ║  ┌──────────┐                  ┌──────────┐   ║  │
│  ║  │💼 Tech   │                  │🏦 金融    │   ║  │
│  ║  │パーク    │                  │タワー    │   ║  │
│  ║  │░░░░░░░░│                  │░░░░░░░░│   ║  │
│  ║  │🔒 Lv.3  │                  │🔒 Lv.5  │   ║  │
│  ║  │TaskFlow │                  │FinTrack │   ║  │
│  ║  └──────────┘                  └──────────┘   ║  │
│  ╚════════════════════════════════════════════════╝  │
│                                                          │
│  [最新依頼] ShopNow から緊急依頼が届いています → [受ける] │
└──────────────────────────────────────────────────────────┘
```

### ホバー時の表示（ツールチップ）

```
クリック時（解放済み）:
┌──────────────────────────┐
│ 🏪 ShopNow — EC サイト  │
│ 「売上が見えない」         │
│ 初級 · 60〜90分          │
│ [依頼を受ける →]          │
└──────────────────────────┘

クリック時（ロック）:
┌──────────────────────────┐
│ 🔒 TaskFlow              │
│ Lv.3 が必要です          │
│ 現在 Lv.1               │
└──────────────────────────┘
```

### マップ演出仕様

| 状態 | ビジュアル | アニメーション |
|------|-----------|--------------|
| 解放済み区画 | フルカラー・ネオン点灯 | 2s周期でネオンがパルス (`glow`) |
| ロック区画 | グレースケール + 霧 | なし（静的） |
| ホバー中 | `scale(1.06)` + アウトラインglow | 200ms ease |
| クリック後 | プレイヤーが区画へ歩く | 600ms 移動アニメ → 画面遷移 |
| 新規解放 | 霧が晴れる | 2s フェードアニメ + ネオン点灯 |

---

---

## S-05: オープニング（キャラクターダイアログ）

オープニング画面はキャラクターが直接語りかけるダイアログ形式で表現する。
ビジュアルノベルとRPGの中間。

### ダイアログボックス設計

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│   [背景: 夜の商業区。ネオン看板。雨。]                     │
│                                                          │
│                                                          │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ ┌───────┐  田村 誠 — ShopNow CEO                   │ │
│  │ │  👔   │                                          │ │
│  │ │[sprite│  「DataCraft Agencyさん、緊急のお願いが   │ │
│  │ │worried│  あります。売上の集計が全くできていない    │ │
│  │ │ 48×48│  状態です...」                           │ │
│  │ └───────┘                              [▶ 次へ]   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
│  [受け取ったデータ]                                       │
│  📄 orders.csv  📄 users.csv  📄 products.csv           │
│                                                          │
│                     [設計を始める →]                     │
└──────────────────────────────────────────────────────────┘
```

### ダイアログボックス コンポーネント仕様

```
CharacterDialog コンポーネント
├── 背景レイヤー: ブラー + 暗め グラデーション
├── キャラクタースプライト（左または右に配置）
│   ├── 48×48px pixel art (SVG rect grid)
│   ├── 表情: expression prop で切り替え
│   └── idle animation: 常時 bob up/down
├── テキストエリア
│   ├── キャラクター名 (Press Start 2P フォント、小さめ)
│   ├── 役職タグ
│   ├── 会話テキスト（タイプライターアニメ: 30ms/文字）
│   └── [▶ 次へ] ボタン または スペースキーで進む
└── スキップボタン（右上）
```

### タイプライターアニメーション

```typescript
// 実装方針
const TYPEWRITER_SPEED_MS = 30; // 1文字あたり
// スペースキーまたはクリックで全文即表示
// [▶ 次へ] で次のダイアログへ
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

---

## キャラクタースプライト — SVG 実装方針

### ピクセルアートを SVG で表現する

```typescript
// components/characters/Sprite.tsx
// 各キャラは 16×16 グリッドの配列で色を定義
// 透明 = null, 色 = hex string

type PixelGrid = (string | null)[][];

const TANAKA_NEUTRAL: PixelGrid = [
  // 16行 × 16列 (0行目が上)
  [null,null,'#2C1A0E','#2C1A0E','#2C1A0E','#2C1A0E',null,...],
  ['#F0C070','#F0C070','#F0C070',...],
  // ...
];

// SVG として出力
// <rect x={col*4} y={row*4} width={4} height={4} fill={color} />
// → 64×64px のピクセルアートスプライト完成
```

### コンポーネント構成

```
components/characters/
├── Sprite.tsx              ← ピクセルグリッド → SVG 変換エンジン
├── CharacterDialog.tsx     ← ダイアログボックス + タイプライター
├── sprites/
│   ├── tanaka.ts           ← 田中の各表情ピクセルデータ
│   ├── tamura.ts           ← 田村の各表情ピクセルデータ
│   ├── player.ts           ← プレイヤーの各表情ピクセルデータ
│   └── index.ts            ← エクスポート
└── animations/
    └── useIdleAnimation.ts ← idle bob アニメーション hook
```

### アニメーション実装

```typescript
// idle bob: CSS keyframes
// transform: translateY(0) → translateY(-2px) → translateY(0)
// duration: 2s, ease-in-out, infinite

// talk: 表情を expression prop で切り替え
// 'neutral' | 'smile' | 'stern' | 'thinking' | 'worried' | 'happy'

// walk: 4フレームのパラパラアニメ (マップ上)
// フレーム切り替え: 200ms interval
```

---

## ワールドマップ — SVG 実装方針

### コンポーネント構成

```
components/map/
├── WorldMap.tsx            ← メインマップ SVG コンテナ
├── District.tsx            ← 各区画のクリッカブル SVG グループ
├── PlayerMarker.tsx        ← プレイヤースプライト（マップ上）
├── NeonSign.tsx            ← ネオン看板アニメーション
├── StarlightBackground.tsx ← 星空背景 (canvas or CSS)
└── FogOverlay.tsx          ← ロック区画の霧エフェクト
```

### SVG レイアウト

```
<svg viewBox="0 0 1200 700" className="w-full h-full">
  {/* レイヤー1: 夜空背景 */}
  <StarlightBackground />

  {/* レイヤー2: 建物シルエット */}
  <BuildingGroup district="ec" status="available" />
  <BuildingGroup district="tech" status="locked" />
  <BuildingGroup district="medical" status="locked" />
  <BuildingGroup district="finance" status="locked" />
  <BuildingGroup district="hq" status="home" />

  {/* レイヤー3: ネオン・ライト */}
  <NeonSign district="ec" color="#F39C12" />

  {/* レイヤー4: 霧エフェクト (ロック区画) */}
  <FogOverlay district="tech" />

  {/* レイヤー5: プレイヤー */}
  <PlayerMarker position={playerPos} />

  {/* レイヤー6: クリック領域 */}
  <ClickTarget district="ec" onClick={...} />
</svg>
```

### 状態管理

```typescript
// Zustand store
interface MapStore {
  playerPosition: 'hq' | 'ec' | 'tech' | 'medical' | 'finance';
  setPlayerPosition: (pos: string) => void;
  isMoving: boolean;
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
