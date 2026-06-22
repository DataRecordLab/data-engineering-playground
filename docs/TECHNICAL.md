# TECHNICAL.md — 技術設計書

## アーキテクチャ概要

```
ブラウザ
├── Next.js App Router
│   ├── Server Components（データ取得・認証）
│   └── Client Components（インタラクション）
├── ReactFlow（パイプライン設計画面 ← 主役）
├── DuckDB WASM（ブラウザ内データ処理）
├── Monaco Editor（SQL補助入力・補助的役割）
└── Zustand（状態管理）
        ↓
Supabase（認証・進捗・設計保存）
Claude API（設計レビュー・AIフィードバック）
```

---

## 核心コンポーネント：PipelineDesigner

このアプリの主役コンポーネント。ReactFlowを使ってノードを視覚的に繋ぐ設計画面。

```typescript
// components/pipeline/PipelineDesigner.tsx
'use client';

import ReactFlow, {
  Node, Edge, Connection,
  addEdge, useNodesState, useEdgesState,
  Controls, Background
} from 'reactflow';
import 'reactflow/dist/style.css';

const LAYER_NODES: Node[] = [
  {
    id: 'source',
    type: 'layerNode',
    position: { x: 100, y: 100 },
    data: {
      label: 'Source Layer',
      description: '生データをそのまま保持',
      status: 'available',
      tables: ['src_orders', 'src_users', 'src_products'],
    }
  },
  {
    id: 'staging',
    type: 'layerNode',
    position: { x: 100, y: 250 },
    data: {
      label: 'Staging Layer',
      description: 'データを整形・クレンジング',
      status: 'locked',
      tables: [],
    }
  },
  {
    id: 'warehouse',
    type: 'layerNode',
    position: { x: 100, y: 400 },
    data: {
      label: 'Warehouse Layer',
      description: 'fact/dimに構造化',
      status: 'locked',
      tables: [],
    }
  },
  {
    id: 'mart',
    type: 'layerNode',
    position: { x: 100, y: 550 },
    data: {
      label: 'Mart Layer',
      description: '分析用・意思決定を支援',
      status: 'locked',
      tables: [],
    }
  },
];

export function PipelineDesigner({ questId, onStageSelect }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(LAYER_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = (connection: Connection) => {
    setEdges(eds => addEdge(connection, eds));
  };

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={{ layerNode: LayerNode }}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}
```

---

## DuckDB WASM（lib/duckdb/engine.ts）

```typescript
import * as duckdb from '@duckdb/duckdb-wasm';

let db: duckdb.AsyncDuckDB | null = null;

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker = await duckdb.createWorker(bundle.mainWorker!);
  db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  return db;
}

export async function executeTransform(sql: string): Promise<TransformResult> {
  try {
    const database = await getDB();
    const conn = await database.connect();
    const result = await conn.query(sql);
    await conn.close();
    return {
      columns: result.schema.fields.map(f => f.name),
      rows: result.toArray().map(r => r.toJSON()),
      rowCount: result.numRows,
      error: null,
    };
  } catch (e) {
    return { columns: [], rows: [], rowCount: 0, error: String(e) };
  }
}

export async function loadScenarioData(questId: string, csvFiles: CsvFile[]) {
  const database = await getDB();
  for (const { name, content } of csvFiles) {
    await database.registerFileText(`${name}.csv`, content);
  }
}

export type TransformResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error: string | null;
};
```

---

## 型定義（types/index.ts）

```typescript
export type QuestId = 'ec-site' | 'saas' | 'medical' | 'finance';
export type StageId = 'opening' | 'source' | 'staging' | 'warehouse' | 'mart';
export type StageStatus = 'locked' | 'in_progress' | 'completed';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type GameType = 'rpg' | 'stage_clear' | 'simulation' | 'boss' | 'decision';

export interface Quest {
  id: QuestId;
  title: string;
  clientName: string;
  difficulty: Difficulty;
  description: string;
  storyText: string;
  estimatedMinutes: number;
  requiredLevel: number;
  tags: string[];
  deConceptsCovered: string[];   // 学べるDE概念
  stages: Stage[];
  csvFiles: CsvFile[];
}

export interface Stage {
  id: StageId;
  title: string;
  gameType: GameType;
  conceptTaught: string;         // このステージで学ぶ概念
  missionText: string;
  hintText: string;
  storyMessage?: string;         // 上司・クライアントからのメッセージ
  initialTransform?: string;     // 初期SQL（補助的）
  validation: ValidationRule[];
  xpReward: { star1: number; star2: number; star3: number };
  badgeId?: string;
}

export interface PipelineNode {
  id: string;
  layer: StageId;
  label: string;
  description: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  tables: string[];
}

export interface CsvFile {
  name: string;
  content: string;
}

export interface UserProgress {
  questId: QuestId;
  stageId: StageId;
  status: StageStatus;
  stars: number;
  pipelineDesign?: PipelineNode[];
  xpEarned: number;
  completedAt?: string;
}

export interface ValidationRule {
  type: 'table_exists' | 'row_count' | 'column_exists' | 'column_type' | 'no_nulls' | 'custom';
  table?: string;
  column?: string;
  expected?: unknown;
  sql?: string;
  message: string;              // バリデーション失敗時のメッセージ
}
```

---

## AIフィードバック（lib/ai/feedback.ts）

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface FeedbackRequest {
  questId: string;
  stageId: string;
  conceptTaught: string;
  pipelineDesign: unknown;
  transformResult: unknown;
  validationResult: unknown;
}

export interface FeedbackResponse {
  stars: 1 | 2 | 3;
  conceptExplanation: string;   // この設計が「なぜ」良いか/悪いか
  message: string;
  improvements: string[];
  encouragement: string;
}

export async function generateFeedback(req: FeedbackRequest): Promise<FeedbackResponse> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: buildPrompt(req),
    }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return JSON.parse(text) as FeedbackResponse;
}

function buildPrompt(req: FeedbackRequest): string {
  return `あなたはデータエンジニアリングのメンター「田中シニアエンジニア」です。

このステージで学ぶべき概念: ${req.conceptTaught}

ユーザーの設計:
${JSON.stringify(req.pipelineDesign, null, 2)}

実行結果:
${JSON.stringify(req.transformResult, null, 2)}

バリデーション:
${JSON.stringify(req.validationResult, null, 2)}

以下のJSON形式のみで返してください:
{
  "stars": 1〜3,
  "conceptExplanation": "この設計のなぜ（DE概念の観点から2〜3文）",
  "message": "全体フィードバック",
  "improvements": ["改善点1", "改善点2"],
  "encouragement": "励ましの一言"
}

重要: コードの正誤ではなく、データエンジニアリングの設計思想を評価してください。
★評価基準:
★1: 動く
★2: 設計の意図が正しい
★3: ベストプラクティス（監査・品質・パフォーマンスまで考慮）`;
}
```

---

## Supabase 認証・初期化

```typescript
// app/(auth)/signup/actions.ts
export async function signUpAndInitialize(email: string, password: string) {
  const supabase = createClient();
  const { data: authData, error } = await supabase.auth.signUp({ email, password });
  if (error || !authData.user) throw error;

  // 1. Organization作成（B2B拡張を見据えた設計）
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: `${email}'s workspace`, type: 'personal' })
    .select().single();

  // 2. User登録
  await supabase.from('users').insert({
    id: authData.user.id,
    organization_id: org.id,
    role: 'owner',
    level: 1,
    total_xp: 0,
  });

  // 3. 初期進捗（ECサイト初級を解放済みに）
  const stages: StageId[] = ['opening', 'source', 'staging', 'warehouse', 'mart'];
  await supabase.from('user_progress').insert(
    stages.map((stage, i) => ({
      user_id: authData.user!.id,
      quest_id: 'ec-site',
      stage,
      status: i === 0 ? 'in_progress' : 'locked',
    }))
  );
}
```

---

---

## キャラクターシステム実装

### Sprite.tsx — ピクセルアート SVG エンジン

```typescript
// components/characters/Sprite.tsx
'use client';

type PixelRow = (string | null)[];
type PixelGrid = PixelRow[];

interface SpriteProps {
  grid: PixelGrid;           // 16x16 の色配列
  scale?: number;            // 1 = 16px, 4 = 64px (default)
  expression?: string;       // 'neutral' | 'smile' | 'stern' etc.
  animate?: 'idle' | 'walk' | 'talk' | 'react';
  className?: string;
}

export function Sprite({ grid, scale = 4, animate = 'idle', className }: SpriteProps) {
  const size = 16 * scale;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 16 16`}
      style={{ imageRendering: 'pixelated' }}
      className={className}
    >
      {grid.map((row, y) =>
        row.map((color, x) =>
          color ? (
            <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />
          ) : null
        )
      )}
    </svg>
  );
}
```

### CharacterDialog.tsx — ダイアログボックス

```typescript
// components/characters/CharacterDialog.tsx
'use client';
import { useState, useEffect } from 'react';
import { Sprite } from './Sprite';
import { SPRITES } from './sprites';

interface DialogLine {
  characterId: keyof typeof SPRITES;
  expression: string;
  text: string;
}

interface CharacterDialogProps {
  lines: DialogLine[];
  onComplete: () => void;
  position?: 'left' | 'right';  // キャラ位置
}

export function CharacterDialog({ lines, onComplete, position = 'left' }: CharacterDialogProps) {
  const [lineIndex, setLineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const currentLine = lines[lineIndex];
  const SPEED = 30; // ms per character

  useEffect(() => {
    // タイプライターアニメーション
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(currentLine.text.slice(0, ++i));
      if (i >= currentLine.text.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, SPEED);
    return () => clearInterval(interval);
  }, [lineIndex, currentLine.text]);

  const advance = () => {
    if (isTyping) {
      // 全文即表示
      setDisplayedText(currentLine.text);
      setIsTyping(false);
      return;
    }
    if (lineIndex < lines.length - 1) {
      setLineIndex(i => i + 1);
    } else {
      onComplete();
    }
  };

  const sprite = SPRITES[currentLine.characterId]?.[currentLine.expression];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 p-6 z-50"
      onClick={advance}
    >
      <div className="max-w-4xl mx-auto bg-slate-900/95 backdrop-blur border border-slate-700 rounded-2xl p-5 flex items-end gap-5">
        {/* キャラクタースプライト */}
        {position === 'left' && sprite && (
          <div className="flex-shrink-0 animate-idle-bob">
            <Sprite grid={sprite} scale={4} />
          </div>
        )}

        {/* テキスト */}
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-white font-bold text-sm">{currentLine.characterId}</span>
            <span className="text-slate-500 text-xs">Press Space / Click to continue</span>
          </div>
          <p className="text-slate-200 text-sm leading-relaxed font-mono min-h-[3rem]">
            {displayedText}
            {isTyping && <span className="animate-blink">▋</span>}
          </p>
        </div>

        {/* 次へボタン */}
        {!isTyping && (
          <div className="text-slate-400 text-xs animate-bounce">▶</div>
        )}
      </div>
    </div>
  );
}
```

### sprites/tanaka.ts — 田中スプライトデータ

```typescript
// 16×16 ピクセルグリッド定義
// null = 透明, string = hex color

const _ = null;

// 色定数
const HAIR   = '#2C1A0E';
const SKIN   = '#F0C070';
const HOODIE = '#1A2744';
const GLASS  = '#A0B8D8';
const DARK   = '#0A0A0A';

export const TANAKA_NEUTRAL: (string | null)[][] = [
  [_,_,_,HAIR,HAIR,HAIR,HAIR,HAIR,HAIR,HAIR,HAIR,HAIR,_,_,_,_],
  [_,_,HAIR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR,_,_,_,_],
  [_,HAIR,SKIN,GLASS,GLASS,SKIN,SKIN,SKIN,GLASS,GLASS,SKIN,SKIN,HAIR,_,_,_],
  [_,HAIR,SKIN,GLASS,DARK,GLASS,SKIN,SKIN,GLASS,DARK,GLASS,SKIN,HAIR,_,_,_],
  [_,HAIR,SKIN,GLASS,GLASS,SKIN,SKIN,SKIN,GLASS,GLASS,SKIN,SKIN,HAIR,_,_,_],
  [_,HAIR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR,_,_,_],
  [_,_,HAIR,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,SKIN,HAIR,_,_,_,_],
  [_,_,_,HOODIE,HOODIE,HOODIE,HOODIE,HOODIE,HOODIE,HOODIE,HOODIE,HOODIE,_,_,_,_],
  // ... 残りの行
];

export const TANAKA = {
  neutral:  TANAKA_NEUTRAL,
  smile:    TANAKA_SMILE,    // 口が上がる
  stern:    TANAKA_STERN,    // 眉が下がる
  thinking: TANAKA_THINKING, // 頭上に「...」
};
```

---

## ワールドマップ実装

### WorldMap.tsx — SVG インタラクティブマップ

```typescript
// components/map/WorldMap.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface District {
  id: string;
  questId: string;
  label: string;
  x: number;
  y: number;
  color: string;
  status: 'available' | 'locked' | 'completed';
  lockReason?: string;
}

const DISTRICTS: District[] = [
  { id: 'ec',      questId: 'ec-site',  label: '商業区',           x: 200, y: 200, color: '#F39C12', status: 'available' },
  { id: 'tech',    questId: 'saas',     label: 'テクノロジーパーク', x: 200, y: 480, color: '#8E44AD', status: 'locked', lockReason: 'Lv.3が必要' },
  { id: 'medical', questId: 'medical',  label: '医療センター',       x: 820, y: 200, color: '#2980B9', status: 'locked', lockReason: 'Lv.3が必要' },
  { id: 'finance', questId: 'finance',  label: '金融タワー',         x: 820, y: 480, color: '#D4AC0D', status: 'locked', lockReason: 'Lv.5が必要' },
];

const HQ_POS = { x: 510, y: 340 };

export function WorldMap() {
  const router = useRouter();
  const [playerPos, setPlayerPos] = useState(HQ_POS);
  const [isMoving, setIsMoving] = useState(false);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);

  const handleDistrictClick = async (district: District) => {
    if (district.status === 'locked' || isMoving) return;
    setIsMoving(true);
    setPlayerPos({ x: district.x, y: district.y });
    await new Promise(r => setTimeout(r, 700));
    router.push(`/quest/${district.questId}`);
  };

  return (
    <div className="relative w-full h-full bg-[#0A0E1A] overflow-hidden">
      <svg viewBox="0 0 1024 680" className="w-full h-full">
        {/* 夜空グラデーション */}
        <defs>
          <radialGradient id="glow-ec" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#F39C12" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F39C12" stopOpacity="0" />
          </radialGradient>
          {/* 各区画の glow グラデーション ... */}
        </defs>

        {/* 星背景 */}
        <Stars />

        {/* 各区画 */}
        {DISTRICTS.map(d => (
          <District
            key={d.id}
            {...d}
            isHovered={hoveredDistrict === d.id}
            onClick={() => handleDistrictClick(d)}
            onHover={id => setHoveredDistrict(id)}
          />
        ))}

        {/* DataCraft HQ */}
        <HQBuilding x={HQ_POS.x} y={HQ_POS.y} />

        {/* プレイヤーキャラクター */}
        <g
          transform={`translate(${playerPos.x}, ${playerPos.y})`}
          style={{ transition: 'transform 0.6s ease-in-out' }}
        >
          <PlayerSprite isWalking={isMoving} />
        </g>
      </svg>

      {/* ホバー時ツールチップ */}
      {hoveredDistrict && <DistrictTooltip districtId={hoveredDistrict} />}
    </div>
  );
}
```

### CSS アニメーション定義

```css
/* globals.css への追加 */

/* Idle bob */
@keyframes idle-bob {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-2px); }
}
.animate-idle-bob { animation: idle-bob 2s ease-in-out infinite; }

/* ネオン glow パルス */
@keyframes neon-pulse {
  0%, 100% { filter: drop-shadow(0 0 4px currentColor); opacity: 1; }
  50%       { filter: drop-shadow(0 0 12px currentColor); opacity: 0.85; }
}
.animate-neon { animation: neon-pulse 2s ease-in-out infinite; }

/* テキストカーソル点滅 */
@keyframes blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0; }
}
.animate-blink { animation: blink 0.8s step-end infinite; }

/* 霧解除 */
@keyframes fog-clear {
  from { opacity: 0.7; filter: blur(4px); }
  to   { opacity: 0;   filter: blur(0);   }
}

/* 星のまたたき */
@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50%       { opacity: 1; }
}
```

---

## パフォーマンス考慮

```typescript
// DuckDB WASMは初回ロード2〜3秒 → ローディング画面を表示
// Monaco Editorは重い → dynamic importで遅延ロード
// ReactFlowは初期化が必要 → Suspenseでラップ

import dynamic from 'next/dynamic';

const PipelineDesigner = dynamic(
  () => import('@/components/pipeline/PipelineDesigner'),
  { ssr: false, loading: () => <PipelineLoading /> }
);

const TransformEditor = dynamic(
  () => import('@/components/stage/TransformEditor'),
  { ssr: false, loading: () => <EditorLoading /> }
);
```
