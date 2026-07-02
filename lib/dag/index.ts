export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';
export type TaskType = 'extract' | 'transform' | 'load' | 'notify';

export interface DagTask {
  id: string;
  label: string;
  type: TaskType;
  description: string;
  duration: number;  // simulation ms
  upstreams: string[];
  x: number;
  y: number;
}

export interface DagScenario {
  id: string;
  title: string;
  description: string;
  tasks: DagTask[];
  failureTaskId?: string;   // どのタスクで失敗するか
  isUserPipeline?: boolean; // ユーザーが設計したパイプライン
}

export const DAG_SCENARIOS: DagScenario[] = [
  {
    id: 'ec_pipeline',
    title: 'ECサイト 日次パイプライン',
    description: '受注・ユーザー・商品データを毎日集計するDAG',
    tasks: [
      { id: 'extract_orders',   label: 'extract_orders',   type: 'extract',   description: '注文DBからデータ抽出',     duration: 800,  upstreams: [],                                     x: 0,   y: 80  },
      { id: 'extract_users',    label: 'extract_users',    type: 'extract',   description: 'ユーザーDBから抽出',       duration: 600,  upstreams: [],                                     x: 0,   y: 230 },
      { id: 'extract_products', label: 'extract_products', type: 'extract',   description: '商品DBから抽出',           duration: 400,  upstreams: [],                                     x: 0,   y: 380 },
      { id: 'stg_orders',       label: 'stg_orders',       type: 'transform', description: '型変換・クレンジング',     duration: 700,  upstreams: ['extract_orders'],                     x: 260, y: 80  },
      { id: 'stg_users',        label: 'stg_users',        type: 'transform', description: '型変換・クレンジング',     duration: 500,  upstreams: ['extract_users'],                      x: 260, y: 230 },
      { id: 'stg_products',     label: 'stg_products',     type: 'transform', description: '型変換・クレンジング',     duration: 400,  upstreams: ['extract_products'],                   x: 260, y: 380 },
      { id: 'fct_orders',       label: 'fct_orders',       type: 'transform', description: '3テーブルをJOINして集計', duration: 1000, upstreams: ['stg_orders', 'stg_users', 'stg_products'], x: 520, y: 230 },
      { id: 'mart_revenue',     label: 'mart_daily_revenue', type: 'load',    description: '売上KPIをマートへ出力',   duration: 600,  upstreams: ['fct_orders'],                         x: 780, y: 130 },
      { id: 'mart_cohort',      label: 'mart_user_cohort', type: 'load',      description: 'コホートをマートへ出力',  duration: 500,  upstreams: ['fct_orders'],                         x: 780, y: 330 },
      { id: 'notify_slack',     label: 'notify_slack',     type: 'notify',    description: 'Slackに完了通知',          duration: 200,  upstreams: ['mart_revenue', 'mart_cohort'],        x: 1040, y: 230 },
    ],
  },
  {
    id: 'ec_pipeline_fail',
    title: 'ECサイト パイプライン（障害シナリオ）',
    description: 'stg_ordersが失敗した場合の影響範囲を確認する',
    failureTaskId: 'stg_orders',
    tasks: [
      { id: 'extract_orders',   label: 'extract_orders',   type: 'extract',   description: '注文DBからデータ抽出',     duration: 800,  upstreams: [],                                     x: 0,   y: 80  },
      { id: 'extract_users',    label: 'extract_users',    type: 'extract',   description: 'ユーザーDBから抽出',       duration: 600,  upstreams: [],                                     x: 0,   y: 230 },
      { id: 'extract_products', label: 'extract_products', type: 'extract',   description: '商品DBから抽出',           duration: 400,  upstreams: [],                                     x: 0,   y: 380 },
      { id: 'stg_orders',       label: 'stg_orders',       type: 'transform', description: '⚠️ スキーマ変更で失敗',   duration: 700,  upstreams: ['extract_orders'],                     x: 260, y: 80  },
      { id: 'stg_users',        label: 'stg_users',        type: 'transform', description: '型変換・クレンジング',     duration: 500,  upstreams: ['extract_users'],                      x: 260, y: 230 },
      { id: 'stg_products',     label: 'stg_products',     type: 'transform', description: '型変換・クレンジング',     duration: 400,  upstreams: ['extract_products'],                   x: 260, y: 380 },
      { id: 'fct_orders',       label: 'fct_orders',       type: 'transform', description: '上流タスクの失敗を受けてスキップ', duration: 0, upstreams: ['stg_orders', 'stg_users', 'stg_products'], x: 520, y: 230 },
      { id: 'mart_revenue',     label: 'mart_daily_revenue', type: 'load',    description: '上流失敗のためスキップ',  duration: 0,    upstreams: ['fct_orders'],                         x: 780, y: 130 },
      { id: 'mart_cohort',      label: 'mart_user_cohort', type: 'load',      description: '上流失敗のためスキップ',  duration: 0,    upstreams: ['fct_orders'],                         x: 780, y: 330 },
      { id: 'notify_slack',     label: 'notify_slack',     type: 'notify',    description: '⚠️ 失敗アラートを送信',  duration: 200,  upstreams: ['mart_revenue', 'mart_cohort'],        x: 1040, y: 230 },
    ],
  },
];

/** トポロジカルソート（Kahn's algorithm） */
export function topologicalSort(tasks: DagTask[]): DagTask[] {
  const inDegree = new Map(tasks.map(t => [t.id, t.upstreams.length]));
  const queue = tasks.filter(t => t.upstreams.length === 0);
  const result: DagTask[] = [];

  while (queue.length > 0) {
    const task = queue.shift()!;
    result.push(task);
    tasks
      .filter(t => t.upstreams.includes(task.id))
      .forEach(t => {
        const deg = (inDegree.get(t.id) ?? 1) - 1;
        inDegree.set(t.id, deg);
        if (deg === 0) queue.push(t);
      });
  }
  return result;
}

/** DAGを並列実行グループに分割（同時実行可能なタスクをまとめる） */
export function getExecutionWaves(tasks: DagTask[]): DagTask[][] {
  const sorted = topologicalSort(tasks);
  const waveOf = new Map<string, number>();

  for (const task of sorted) {
    const wave = task.upstreams.length === 0
      ? 0
      : Math.max(...task.upstreams.map(u => (waveOf.get(u) ?? 0))) + 1;
    waveOf.set(task.id, wave);
  }

  const maxWave = Math.max(...Array.from(waveOf.values()));
  return Array.from({ length: maxWave + 1 }, (_, i) =>
    tasks.filter(t => waveOf.get(t.id) === i)
  );
}

export const TASK_TYPE_META: Record<TaskType, { color: string; bg: string; icon: string }> = {
  extract:   { color: '#60a5fa', bg: '#0c1f3d', icon: '⬇' },
  transform: { color: '#34d399', bg: '#022915', icon: '⚙' },
  load:      { color: '#a78bfa', bg: '#160b2e', icon: '⬆' },
  notify:    { color: '#fbbf24', bg: '#1c1200', icon: '🔔' },
};

export const STATUS_META: Record<TaskStatus, { color: string; bg: string; label: string }> = {
  pending: { color: '#475569', bg: '#0f172a', label: '待機中' },
  running: { color: '#3b82f6', bg: '#0c1f3d', label: '実行中' },
  success: { color: '#22c55e', bg: '#052e16', label: '成功' },
  failed:  { color: '#ef4444', bg: '#2d0606', label: '失敗' },
  skipped: { color: '#6b7280', bg: '#111827', label: 'スキップ' },
};
