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
