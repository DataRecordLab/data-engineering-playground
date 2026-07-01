'use client';

import { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { querySQL, runSQL } from '@/lib/duckdb/engine';
import type { QueryResult } from '@/types';

// ─── Stage Definitions ─────────────────────────────────────────────────────────

interface HintDef { label: string; sql: string }
interface StageDef {
  id: string;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  xp: number;
  description: string;
  scaffold: string;
  successMessage: string;
  hints: HintDef[];
  completeLabel: string;
  validationType: 'any_query' | 'table_exists';
  validationTable?: string;
}

export const PIPELINE_STAGES: StageDef[] = [
  {
    id: 'source',
    label: 'Source Layer',
    sublabel: '生データ保持',
    icon: '📥',
    color: '#6366f1',
    xp: 50,
    description: `外部から受け取ったCSVデータをそのまま保持するレイヤー。
加工せず「原本を守る」ことが目的です。

まずは3つの生データを確認してみましょう。
NULLや表記揺れ・型の問題に気づけますか？`,
    scaffold: `-- 生データを確認してみましょう
SELECT * FROM orders LIMIT 10;`,
    successMessage: '✓ 生データを確認しました。NULLや表記揺れが見えましたね。これが次のStagingで修正すべき問題です。',
    hints: [
      { label: 'ordersを確認', sql: 'SELECT * FROM orders LIMIT 10;' },
      { label: 'amountのNULL確認', sql: 'SELECT COUNT(*) as total, COUNT(amount) as not_null FROM orders;' },
      { label: 'statusの表記揺れ', sql: 'SELECT DISTINCT status, COUNT(*) as cnt FROM orders GROUP BY status;' },
      { label: 'usersを確認', sql: 'SELECT * FROM users LIMIT 5;' },
      { label: 'productsを確認', sql: 'SELECT * FROM products;' },
    ],
    completeLabel: 'Source確認完了 ✓',
    validationType: 'any_query',
  },
  {
    id: 'staging',
    label: 'Staging Layer',
    sublabel: 'クレンジング',
    icon: '🧹',
    color: '#f59e0b',
    xp: 100,
    description: `生データの品質問題を修正するレイヤー。
ordersには3つの問題があります:

• amount に NULL が含まれている → COALESCE で 0 に変換
• status が大文字小文字混在 → LOWER() で統一
• created_at が文字列 → TIMESTAMP に変換

stg_orders テーブルを作成してください。`,
    scaffold: `-- クレンジングしてstg_ordersを作る
CREATE OR REPLACE TABLE stg_orders AS
SELECT
  order_id,
  user_id,
  product_id,
  COALESCE(TRY_CAST(amount AS INTEGER), 0) AS amount,
  LOWER(TRIM(status)) AS status,
  CAST(created_at AS TIMESTAMP) AS created_at
FROM orders;

-- 確認: NULLと表記揺れが解消されているか
SELECT COUNT(*) as total_rows,
       COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
       COUNT(CASE WHEN amount = 0 THEN 1 END) as zero_amount_rows
FROM stg_orders;`,
    successMessage: '✓ stg_ordersを作成しました。NULLと大文字混在が解決されました。下流のレイヤーは信頼できるデータで動かせます。',
    hints: [
      { label: 'NULLを0に変換する方法', sql: 'SELECT COALESCE(TRY_CAST(amount AS INTEGER), 0) as safe_amount FROM orders LIMIT 5;' },
      { label: 'statusを小文字統一', sql: "SELECT DISTINCT LOWER(TRIM(status)) as clean_status FROM orders;" },
      { label: 'stg_ordersを確認', sql: 'SELECT * FROM stg_orders LIMIT 10;' },
      { label: 'statusの分布確認', sql: 'SELECT status, COUNT(*) FROM stg_orders GROUP BY status;' },
    ],
    completeLabel: 'Staging完了 ✓',
    validationType: 'table_exists',
    validationTable: 'stg_orders',
  },
  {
    id: 'warehouse',
    label: 'Warehouse Layer',
    sublabel: 'データモデリング',
    icon: '🏛️',
    color: '#10b981',
    xp: 150,
    description: `ビジネス分析に最適化した構造に変換するレイヤー。
スタースキーマのFact Tableを作ります。

• completedの注文のみ抽出（分析対象を絞る）
• 日付をDATEに変換（時刻不要）
• fact_orders として保存

Dimension Tableは今回はシンプルにします。`,
    scaffold: `-- Fact Tableを作成する
CREATE OR REPLACE TABLE fact_orders AS
SELECT
  order_id,
  user_id,
  product_id,
  amount,
  CAST(created_at AS DATE) AS order_date
FROM stg_orders
WHERE status = 'completed';

-- 確認: completedのみが入っているか
SELECT
  COUNT(*) as fact_rows,
  SUM(amount) as total_revenue,
  MIN(order_date) as first_date,
  MAX(order_date) as last_date
FROM fact_orders;`,
    successMessage: '✓ fact_ordersを作成しました。分析に最適化されたFact Tableの完成です。',
    hints: [
      { label: 'stg_ordersを確認', sql: "SELECT DISTINCT status FROM stg_orders;" },
      { label: 'fact_ordersを確認', sql: 'SELECT * FROM fact_orders LIMIT 10;' },
      { label: '売上合計を確認', sql: 'SELECT SUM(amount) as total_revenue FROM fact_orders;' },
      { label: '日別件数', sql: 'SELECT order_date, COUNT(*) as cnt FROM fact_orders GROUP BY order_date ORDER BY order_date;' },
    ],
    completeLabel: 'Warehouse完了 ✓',
    validationType: 'table_exists',
    validationTable: 'fact_orders',
  },
  {
    id: 'mart',
    label: 'Mart Layer',
    sublabel: 'KPI集計',
    icon: '📊',
    color: '#f43f5e',
    xp: 200,
    description: `意思決定に使えるKPIテーブルを作るレイヤー。
ShopNow CTOが経営会議で使いたいデータを提供します。

日別売上サマリーを作ってください:
• 日付ごとの注文件数
• 日付ごとの売上合計
• 平均注文単価（小数点なし）`,
    scaffold: `-- 日別KPIテーブルを作成する
CREATE OR REPLACE TABLE mart_daily_sales AS
SELECT
  order_date,
  COUNT(*) AS order_count,
  SUM(amount) AS total_sales,
  ROUND(AVG(amount), 0) AS avg_order_value
FROM fact_orders
GROUP BY order_date
ORDER BY order_date;

-- 経営会議用レポート
SELECT * FROM mart_daily_sales;`,
    successMessage: '🎉 mart_daily_salesを作成しました！経営会議で使えるデータが完成しました。ShopNow CTOに報告できます。',
    hints: [
      { label: 'fact_ordersから集計', sql: 'SELECT order_date, COUNT(*), SUM(amount) FROM fact_orders GROUP BY order_date;' },
      { label: 'mart_daily_salesを確認', sql: 'SELECT * FROM mart_daily_sales;' },
      { label: '週別サマリー', sql: "SELECT DATE_TRUNC('week', order_date) as week, SUM(total_sales) as weekly_sales FROM mart_daily_sales GROUP BY 1 ORDER BY 1;" },
    ],
    completeLabel: '🎉 Mart完了 ✓ パイプライン完成！',
    validationType: 'table_exists',
    validationTable: 'mart_daily_sales',
  },
];

// ─── Node Types ─────────────────────────────────────────────────────────────────

type NodeStatus = 'locked' | 'active' | 'running' | 'completed';

interface PipelineNodeData {
  stage: StageDef;
  status: NodeStatus;
  rowCount?: number;
  onClick: (id: string) => void;
}

function PipelineLayerNode({ data }: NodeProps<PipelineNodeData>) {
  const { stage, status, rowCount, onClick } = data;
  const isActive = status === 'active' || status === 'running';
  const isDone = status === 'completed';
  const isLocked = status === 'locked';

  return (
    <div
      onClick={() => !isLocked && onClick(stage.id)}
      className={`relative rounded-2xl border-2 transition-all cursor-pointer select-none ${
        isDone
          ? 'shadow-lg'
          : isActive
          ? 'animate-pulse-slow shadow-lg'
          : 'opacity-40 cursor-not-allowed'
      }`}
      style={{
        width: 160,
        minHeight: 110,
        borderColor: isDone ? stage.color : isActive ? stage.color : '#334155',
        background: isDone
          ? `linear-gradient(135deg, ${stage.color}22 0%, ${stage.color}08 100%)`
          : isActive
          ? `linear-gradient(135deg, ${stage.color}18 0%, #0f172a 100%)`
          : '#0f172a',
        boxShadow: isDone
          ? `0 0 24px ${stage.color}40`
          : isActive
          ? `0 0 16px ${stage.color}28`
          : 'none',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: isDone ? stage.color : '#334155', border: 'none', width: 10, height: 10 }}
      />
      <div className="p-3 space-y-1.5">
        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span className="text-lg leading-none">{stage.icon}</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
            isDone ? 'bg-emerald-500/20 text-emerald-400'
            : isActive ? 'bg-blue-500/20 text-blue-400'
            : 'bg-slate-800 text-slate-600'
          }`}>
            {isDone ? '✓ 完了' : isActive ? '▶ 進行中' : '🔒'}
          </span>
        </div>

        {/* Label */}
        <div>
          <p className="text-white text-xs font-bold leading-tight">{stage.label}</p>
          <p className="text-[10px] mt-0.5" style={{ color: isDone || isActive ? stage.color : '#475569' }}>
            {stage.sublabel}
          </p>
        </div>

        {/* Row count */}
        {isDone && rowCount !== undefined && (
          <p className="text-[10px] text-slate-500 font-mono">{rowCount.toLocaleString()} rows</p>
        )}
        {isActive && !isDone && (
          <p className="text-[10px] text-blue-400/70">クリックして実装 →</p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: isDone ? stage.color : '#334155', border: 'none', width: 10, height: 10 }}
      />
    </div>
  );
}

const nodeTypes = { pipelineLayer: PipelineLayerNode };

// ─── Result Table ────────────────────────────────────────────────────────────────

function ResultTable({ result }: { result: QueryResult }) {
  if (result.error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
        <p className="text-red-400 text-xs font-mono whitespace-pre-wrap">{result.error}</p>
      </div>
    );
  }
  if (result.rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 p-3 text-center">
        <p className="text-slate-500 text-xs">0 行（テーブルが空か条件に一致なし）</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/40">
      <table className="text-xs w-full">
        <thead>
          <tr className="border-b border-slate-700">
            {result.columns.map(col => (
              <th key={col} className="px-2 py-1.5 text-left text-slate-400 font-mono font-medium whitespace-nowrap">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 30).map((row, i) => (
            <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30">
              {result.columns.map(col => (
                <td key={col} className={`px-2 py-1 font-mono whitespace-nowrap ${
                  row[col] === null ? 'text-red-400 font-bold'
                  : typeof row[col] === 'number' ? 'text-emerald-400'
                  : 'text-slate-300'
                }`}>
                  {row[col] === null ? 'NULL' : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1 border-t border-slate-800 text-[10px] text-slate-600">
        {result.rowCount} 行{result.rowCount > 30 ? '（先頭30行を表示）' : ''}
      </div>
    </div>
  );
}

// ─── Stage Panel ─────────────────────────────────────────────────────────────────

interface StagePanelProps {
  stage: StageDef;
  isCompleted: boolean;
  onComplete: (rowCount: number) => void;
  onClose: () => void;
}

function StagePanel({ stage, isCompleted, onComplete, onClose }: StagePanelProps) {
  const [sql, setSql] = useState(stage.scaffold);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [runCount, setRunCount] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [successMsg, setSuccessMsg] = useState('');

  async function runQuery() {
    if (!sql.trim() || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await querySQL(sql);
      setResult(res);
      setRunCount(c => c + 1);
    } finally {
      setRunning(false);
    }
  }

  async function handleComplete() {
    if (completing || completed) return;
    setCompleting(true);

    // Validation
    let valid = false;
    if (stage.validationType === 'any_query') {
      valid = runCount > 0;
    } else if (stage.validationType === 'table_exists' && stage.validationTable) {
      const check = await querySQL(
        `SELECT COUNT(*) as cnt FROM ${stage.validationTable}`
      );
      valid = !check.error && (check.rows[0]?.cnt as number) > 0;
    }

    if (!valid) {
      setResult({
        columns: ['error'],
        rows: [{ error: stage.validationType === 'any_query'
          ? 'まずSQLを実行してみてください'
          : `${stage.validationTable} テーブルがまだ作成されていません。SQLを実行してください。`
        }],
        rowCount: 1,
        error: stage.validationType === 'any_query'
          ? 'まずSQLを実行してみてください'
          : `${stage.validationTable} テーブルがまだ作成されていません。`,
      });
      setCompleting(false);
      return;
    }

    // Get row count
    let rowCount = result?.rowCount ?? 0;
    if (stage.validationTable) {
      const cnt = await querySQL(`SELECT COUNT(*) as cnt FROM ${stage.validationTable}`);
      rowCount = (cnt.rows[0]?.cnt as number) ?? 0;
    }

    setSuccessMsg(stage.successMessage);
    setCompleted(true);
    setCompleting(false);
    onComplete(rowCount);
  }

  return (
    <div className="flex flex-col h-full bg-[#080e1a] border-l border-slate-800/60">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0"
        style={{ borderBottomColor: `${stage.color}30` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{stage.icon}</span>
          <div>
            <p className="text-white font-bold text-sm leading-tight">{stage.label}</p>
            <p className="text-[10px]" style={{ color: stage.color }}>{stage.sublabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completed && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              +{stage.xp} XP
            </span>
          )}
          <button onClick={onClose} className="text-slate-600 hover:text-slate-400 text-sm p-1 transition-colors">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Description */}
        <div className="px-4 py-3 border-b border-slate-800/40">
          <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-line">{stage.description}</p>
        </div>

        {/* Success banner */}
        {successMsg && (
          <div className="mx-4 mt-3 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8">
            <p className="text-emerald-400 text-xs leading-relaxed">{successMsg}</p>
          </div>
        )}

        {/* SQL Editor */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">SQL エディタ</p>
            <span className="text-slate-700 text-[10px]">Ctrl+Enter で実行</span>
          </div>
          <textarea
            value={sql}
            onChange={e => setSql(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); runQuery(); } }}
            className="w-full bg-[#0d1117] border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 resize-none focus:outline-none focus:border-blue-500/50 transition-colors leading-relaxed"
            rows={8}
            spellCheck={false}
          />
          <button
            onClick={runQuery}
            disabled={running}
            className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              running
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.01]'
            }`}
          >
            {running ? <><span className="animate-spin">⟳</span> 実行中...</> : <>▶ SQL を実行</>}
          </button>
        </div>

        {/* Hints */}
        <div className="px-4 pb-3 space-y-1.5">
          <p className="text-slate-600 text-[10px] uppercase tracking-wider font-medium">ヒント</p>
          <div className="flex flex-wrap gap-1.5">
            {stage.hints.map(h => (
              <button
                key={h.label}
                onClick={() => { setSql(h.sql); setResult(null); }}
                className="px-2.5 py-1 rounded-lg border border-slate-700/60 bg-slate-800/40 hover:border-blue-500/30 hover:bg-blue-500/5 text-slate-400 hover:text-blue-400 text-[10px] transition-all"
              >
                {h.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result */}
        {result && (
          <div className="px-4 pb-3 space-y-2">
            <p className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">実行結果</p>
            <ResultTable result={result} />
          </div>
        )}
      </div>

      {/* Complete button */}
      <div className="flex-shrink-0 p-4 border-t border-slate-800/60">
        {completed ? (
          <div className="w-full py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 text-center">
            <p className="text-emerald-400 font-bold text-sm">✓ {stage.label} 完了</p>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            disabled={completing}
            className={`w-full py-3 rounded-xl font-black text-sm transition-all ${
              completing
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'hover:scale-[1.02] hover:shadow-xl text-white'
            }`}
            style={!completing ? {
              background: `linear-gradient(135deg, ${stage.color} 0%, ${stage.color}bb 100%)`,
              boxShadow: `0 4px 20px ${stage.color}40`,
            } : {}}
          >
            {completing ? '確認中...' : stage.completeLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Canvas ─────────────────────────────────────────────────────────────────

const NODE_X_POSITIONS = [60, 260, 460, 660];
const NODE_Y = 80;

function buildNodes(
  completedIds: Set<string>,
  activeId: string | null,
  rowCounts: Record<string, number>,
  onNodeClick: (id: string) => void
): Node<PipelineNodeData>[] {
  return PIPELINE_STAGES.map((stage, i) => {
    const isDone = completedIds.has(stage.id);
    const prevDone = i === 0 || completedIds.has(PIPELINE_STAGES[i - 1].id);
    const status: NodeStatus = isDone ? 'completed' : prevDone ? 'active' : 'locked';
    return {
      id: stage.id,
      type: 'pipelineLayer',
      position: { x: NODE_X_POSITIONS[i], y: NODE_Y },
      data: { stage, status, rowCount: rowCounts[stage.id], onClick: onNodeClick },
      draggable: false,
    };
  });
}

function buildEdges(completedIds: Set<string>): Edge[] {
  const edges: Edge[] = [];
  for (let i = 0; i < PIPELINE_STAGES.length - 1; i++) {
    const from = PIPELINE_STAGES[i];
    const to = PIPELINE_STAGES[i + 1];
    const done = completedIds.has(from.id);
    edges.push({
      id: `${from.id}-${to.id}`,
      source: from.id,
      target: to.id,
      animated: done,
      style: {
        stroke: done ? from.color : '#1e293b',
        strokeWidth: done ? 2.5 : 1.5,
      },
    });
  }
  return edges;
}

interface Props {
  csvSetup: () => Promise<void>;
  onStageComplete?: (stageId: string, xp: number) => void;
  onAllComplete?: (totalXp: number) => void;
  initialCompleted?: string[];
}

function Inner({ csvSetup, onStageComplete, onAllComplete, initialCompleted = [] }: Props) {
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set(initialCompleted));
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});
  const [allDone, setAllDone] = useState(false);

  const onNodeClick = useCallback((id: string) => {
    setActiveId(prev => prev === id ? null : id);
  }, []);

  const nodes = buildNodes(completedIds, activeId, rowCounts, onNodeClick);
  const edges = buildEdges(completedIds);
  const [rfNodes, , onNodesChange] = useNodesState(nodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(edges);

  // Sync when completedIds changes
  const currentNodes = buildNodes(completedIds, activeId, rowCounts, onNodeClick);
  const currentEdges = buildEdges(completedIds);

  useEffect(() => {
    csvSetup()
      .then(() => setDbReady(true))
      .catch(e => setDbError(String(e)));
  }, [csvSetup]);

  function handleStageComplete(stageId: string, rowCount: number) {
    const stage = PIPELINE_STAGES.find(s => s.id === stageId)!;
    setCompletedIds(prev => {
      const next = new Set(prev);
      next.add(stageId);
      return next;
    });
    setRowCounts(prev => ({ ...prev, [stageId]: rowCount }));
    onStageComplete?.(stageId, stage.xp);

    // Check if all done
    const nextCompleted = new Set(completedIds);
    nextCompleted.add(stageId);
    if (PIPELINE_STAGES.every(s => nextCompleted.has(s.id))) {
      const totalXp = PIPELINE_STAGES.reduce((sum, s) => sum + s.xp, 0);
      setAllDone(true);
      onAllComplete?.(totalXp);
    }
  }

  const activeStage = PIPELINE_STAGES.find(s => s.id === activeId);
  const completedCount = completedIds.size;
  const totalStages = PIPELINE_STAGES.length;

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 flex-shrink-0 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${dbReady ? 'bg-emerald-400' : dbError ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
            <span className="text-[10px] text-slate-500">
              {dbReady ? 'DuckDB 準備完了' : dbError ? 'エラー' : '初期化中...'}
            </span>
          </div>
          {dbError && <span className="text-red-400 text-[10px]">{dbError}</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            {PIPELINE_STAGES.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center gap-0.5"
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all ${completedIds.has(s.id) ? 'scale-125' : ''}`}
                  style={{
                    background: completedIds.has(s.id) ? s.color : '#1e293b',
                    boxShadow: completedIds.has(s.id) ? `0 0 6px ${s.color}80` : 'none',
                  }}
                />
                {i < PIPELINE_STAGES.length - 1 && (
                  <div className={`w-4 h-px ${completedIds.has(s.id) ? 'bg-slate-500' : 'bg-slate-800'}`} />
                )}
              </div>
            ))}
          </div>
          <span className="text-slate-500 text-xs">{completedCount}/{totalStages} ステージ完了</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className={`transition-all duration-300 ${activeStage ? 'w-[55%]' : 'w-full'} relative flex-shrink-0`}>
          {/* All done overlay */}
          {allDone && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
              <div className="text-center space-y-4 p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 max-w-sm mx-4">
                <p className="text-4xl">🎉</p>
                <h3 className="text-white font-black text-xl">パイプライン完成！</h3>
                <p className="text-slate-400 text-sm">
                  生データ → 意思決定まで、<br/>全4レイヤーのパイプラインを構築しました。
                </p>
                <div className="flex items-center justify-center gap-2 text-yellow-400 font-black text-lg">
                  +{PIPELINE_STAGES.reduce((s, st) => s + st.xp, 0)} XP
                </div>
              </div>
            </div>
          )}

          <ReactFlow
            nodes={currentNodes}
            edges={currentEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            nodesDraggable={false}
            nodesConnectable={false}
            proOptions={{ hideAttribution: true }}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
          >
            <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} size={1} />
          </ReactFlow>

          {/* Stage labels below canvas */}
          {!activeStage && (
            <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-slate-950/80 text-[11px] text-slate-500">
                {completedCount === 0
                  ? '📥 Source Layer から始めよう — ノードをクリック'
                  : completedCount < totalStages
                  ? `次は ${PIPELINE_STAGES[completedCount].label} をクリック`
                  : '🎉 全ステージ完了！'}
              </div>
            </div>
          )}
        </div>

        {/* Stage Panel */}
        {activeStage && (
          <div className="flex-1 overflow-hidden border-l border-slate-800/60">
            <StagePanel
              stage={activeStage}
              isCompleted={completedIds.has(activeStage.id)}
              onComplete={(rowCount) => handleStageComplete(activeStage.id, rowCount)}
              onClose={() => setActiveId(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function UnifiedPipelineCanvas(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
