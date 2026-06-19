# TECHNICAL.md — 技術設計書

## アーキテクチャ概要

```
ブラウザ
├── Next.js（App Router）
│   ├── Server Components（データ取得・認証チェック）
│   └── Client Components（インタラクション・エディタ）
├── DuckDB WASM（ブラウザ内SQL実行・サーバー不要）
├── Monaco Editor（SQLエディタ）
└── Reactflow（パイプライン可視化）
        ↓ API Route
Supabase（認証・進捗保存）
Claude API（AIフィードバック生成）
```

---

## DuckDB WASM 実装

### 初期化（lib/duckdb/engine.ts）

```typescript
import * as duckdb from '@duckdb/duckdb-wasm';

let db: duckdb.AsyncDuckDB | null = null;

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;
  
  const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
  const worker = await duckdb.createWorker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger();
  
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  
  return db;
}

export async function executeSQL(sql: string): Promise<QueryResult> {
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
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      error: String(e),
    };
  }
}

export type QueryResult = {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error: string | null;
};
```

### CSVデータのロード

```typescript
export async function loadScenarioData(questId: string): Promise<void> {
  const database = await getDB();
  const conn = await database.connect();
  
  // CSVファイルをDuckDBに登録
  const csvFiles = await getScenarioCsvFiles(questId);
  
  for (const { name, content } of csvFiles) {
    await database.registerFileText(`${name}.csv`, content);
  }
  
  await conn.close();
}
```

---

## シナリオ定義（lib/scenarios/）

### 型定義（types/index.ts）

```typescript
export type QuestId = 'ec-site' | 'saas' | 'medical' | 'finance';
export type StageId = 'opening' | 'source' | 'staging' | 'warehouse' | 'mart';
export type GameType = 'rpg' | 'stage_clear' | 'simulation' | 'boss';
export type StageStatus = 'locked' | 'in_progress' | 'completed';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

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
  stages: Stage[];
  csvFiles: CsvFile[];
}

export interface Stage {
  id: StageId;
  title: string;
  gameType: GameType;
  missionText: string;
  hintText: string;
  initialSQL: string;
  validation: ValidationRule[];
  xpReward: { star1: number; star2: number; star3: number };
  badgeId?: string;
}

export interface ValidationRule {
  type: 'table_exists' | 'row_count' | 'column_exists' | 'column_type' | 'custom';
  table?: string;
  column?: string;
  expected?: unknown;
  sql?: string; // type: 'custom' のとき使用
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
  sqlAnswer?: string;
  xpEarned: number;
  completedAt?: string;
}
```

### ECサイトシナリオ（lib/scenarios/ec-site/index.ts）

```typescript
import type { Quest } from '@/types';
import { ordersCSV, usersCSV, productsCSV } from './data';
import { stages } from './stages';

export const ecSiteQuest: Quest = {
  id: 'ec-site',
  title: '売上が見えない',
  clientName: 'ShopNow',
  difficulty: 'beginner',
  description: 'ECクライアントの売上データが散在。Source→Martまで基盤を構築。',
  storyText: `ShopNowのCTOからメッセージが届いた。
「売上データが各システムにバラバラに存在していて、
先月の売上すら正確に出せない状態です。
経営会議まであと2週間。助けてください。」`,
  estimatedMinutes: 90,
  requiredLevel: 1,
  tags: ['EC', 'orders', 'staging', 'star-schema'],
  stages,
  csvFiles: [
    { name: 'orders', content: ordersCSV },
    { name: 'users', content: usersCSV },
    { name: 'products', content: productsCSV },
  ],
};
```

---

## AIフィードバック（lib/ai/feedback.ts）

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export interface FeedbackRequest {
  questId: string;
  stageId: string;
  sql: string;
  queryResult: unknown;
  validationResult: ValidationResult;
}

export interface FeedbackResponse {
  stars: 1 | 2 | 3;
  message: string;
  improvements: string[];
  encouragement: string;
}

export async function generateFeedback(
  req: FeedbackRequest
): Promise<FeedbackResponse> {
  const prompt = buildFeedbackPrompt(req);
  
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });
  
  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  
  return JSON.parse(text) as FeedbackResponse;
}

function buildFeedbackPrompt(req: FeedbackRequest): string {
  return `あなたはデータエンジニアリングのメンター「田中シニアエンジニア」です。
新人エンジニアのSQLを以下の観点でレビューしてください。

ステージ: ${req.stageId}
提出SQL:
${req.sql}

実行結果:
${JSON.stringify(req.queryResult, null, 2)}

バリデーション結果:
${JSON.stringify(req.validationResult, null, 2)}

以下のJSON形式のみで返してください（他のテキスト不要）:
{
  "stars": 1〜3の整数,
  "message": "全体的なフィードバック（2〜3文）",
  "improvements": ["改善点1", "改善点2"],
  "encouragement": "励ましの一言"
}

評価基準:
★1: 動く（最低限の要件を満たす）
★2: 良い設計（命名・型・構造が適切）
★3: ベストプラクティス（監査カラム・パフォーマンス考慮あり）

口調: 丁寧だが親しみやすい。技術用語は使うが、初学者にわかる言葉で補足する。`;
}
```

---

## Supabase設定（lib/supabase/）

### クライアント（lib/supabase/client.ts）

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### サーバー（lib/supabase/server.ts）

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

### サインアップ時の初期化

```typescript
export async function signUpAndInitialize(email: string, password: string) {
  const supabase = createClient();
  
  const { data: authData, error } = await supabase.auth.signUp({ email, password });
  if (error || !authData.user) throw error;
  
  // organizationを作成
  const { data: org } = await supabase
    .from('organizations')
    .insert({ name: `${email}'s workspace`, type: 'personal' })
    .select().single();
  
  // usersに登録
  await supabase.from('users').insert({
    id: authData.user.id,
    organization_id: org.id,
    role: 'owner',
    level: 1,
    total_xp: 0,
  });
  
  // 最初のクエスト進捗を初期化
  await supabase.from('user_progress').insert([
    { user_id: authData.user.id, quest_id: 'ec-site', stage: 'opening', status: 'in_progress' },
    { user_id: authData.user.id, quest_id: 'ec-site', stage: 'source', status: 'locked' },
    { user_id: authData.user.id, quest_id: 'ec-site', stage: 'staging', status: 'locked' },
    { user_id: authData.user.id, quest_id: 'ec-site', stage: 'warehouse', status: 'locked' },
    { user_id: authData.user.id, quest_id: 'ec-site', stage: 'mart', status: 'locked' },
  ]);
}
```

---

## 環境変数

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
ANTHROPIC_API_KEY=sk-ant-xxx...
```

---

## パフォーマンス考慮事項

- DuckDB WASMは初回ロードに2〜3秒かかる → ローディング画面を表示する
- Monaco Editorも重い → dynamic importで遅延ロードする
- AIフィードバックは3〜5秒かかる → ストリーミング対応を検討

```typescript
// Monaco Editorの遅延ロード
import dynamic from 'next/dynamic';

const SqlEditor = dynamic(
  () => import('@/components/editor/SqlEditor'),
  { ssr: false, loading: () => <div>エディタを読み込み中...</div> }
);
```
