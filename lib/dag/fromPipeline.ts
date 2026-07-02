import type { DagScenario, DagTask } from '@/lib/dag';

type RawTask = Omit<DagTask, 'upstreams' | 'x' | 'y'>;

interface QuestTemplate {
  label: (pattern: string) => string;
  description: string;
  source: RawTask[];
  staging: Array<RawTask & { sourceId: string }>;
  warehouse: Array<RawTask & { stagingIds: string[] }>;
  mart: Array<RawTask & { upstreamIds: string[] }>;
}

const TEMPLATES: Record<string, QuestTemplate> = {
  'ec-site': {
    label: p => `ECサイト 日次パイプライン（${p}）`,
    description: '受注・ユーザー・商品データを毎日集計するDAG — あなたが設計したパイプライン',
    source: [
      { id: 'extract_orders',   label: 'extract_orders',   type: 'extract',   description: '受注DBからデータ抽出',  duration: 800 },
      { id: 'extract_users',    label: 'extract_users',    type: 'extract',   description: 'ユーザーDBから抽出',    duration: 600 },
      { id: 'extract_products', label: 'extract_products', type: 'extract',   description: '商品DBから抽出',        duration: 400 },
    ],
    staging: [
      { id: 'stg_orders',   label: 'stg_orders',   type: 'transform', description: '型変換・NULL除去',   duration: 700, sourceId: 'extract_orders' },
      { id: 'stg_users',    label: 'stg_users',    type: 'transform', description: 'メール正規化',       duration: 500, sourceId: 'extract_users' },
      { id: 'stg_products', label: 'stg_products', type: 'transform', description: 'カテゴリ正規化',     duration: 400, sourceId: 'extract_products' },
    ],
    warehouse: [
      { id: 'fct_orders', label: 'fct_orders', type: 'transform', description: '3テーブルJOIN・受注ファクト生成', duration: 1000,
        stagingIds: ['stg_orders', 'stg_users', 'stg_products'] },
    ],
    mart: [
      { id: 'mart_revenue', label: 'mart_daily_revenue', type: 'load',   description: '売上KPIをマートへ出力',  duration: 600, upstreamIds: ['fct_orders'] },
      { id: 'mart_cohort',  label: 'mart_user_cohort',  type: 'load',   description: 'コホート分析をマートへ', duration: 500, upstreamIds: ['fct_orders'] },
      { id: 'notify',       label: 'notify_slack',      type: 'notify', description: 'Slackに完了通知',        duration: 200, upstreamIds: ['mart_revenue', 'mart_cohort'] },
    ],
  },
  'saas': {
    label: p => `SaaS メトリクス 日次パイプライン（${p}）`,
    description: 'イベント・サブスク・MRRデータを毎日集計するDAG — あなたが設計したパイプライン',
    source: [
      { id: 'extract_events', label: 'extract_events',       type: 'extract', description: 'アプリイベントログ抽出',   duration: 700 },
      { id: 'extract_subs',   label: 'extract_subscriptions', type: 'extract', description: 'サブスクDBから抽出',       duration: 500 },
      { id: 'extract_users',  label: 'extract_users',        type: 'extract', description: 'ユーザーDBから抽出',       duration: 400 },
    ],
    staging: [
      { id: 'stg_events', label: 'stg_events',         type: 'transform', description: 'イベント正規化・セッションID付与', duration: 800, sourceId: 'extract_events' },
      { id: 'stg_subs',   label: 'stg_subscriptions',  type: 'transform', description: 'プラン変換・解約フラグ計算',     duration: 600, sourceId: 'extract_subs' },
      { id: 'stg_users',  label: 'stg_users',          type: 'transform', description: 'ユーザー属性正規化',             duration: 400, sourceId: 'extract_users' },
    ],
    warehouse: [
      { id: 'fct_events', label: 'fct_user_events', type: 'transform', description: 'ユーザー別イベントファクト集計', duration: 900, stagingIds: ['stg_events', 'stg_users'] },
      { id: 'fct_mrr',    label: 'fct_mrr',         type: 'transform', description: 'MRR計算・チャーン率算出',       duration: 700, stagingIds: ['stg_subs', 'stg_users'] },
    ],
    mart: [
      { id: 'mart_churn', label: 'mart_churn_risk', type: 'load',   description: 'チャーンリスクスコアをマートへ', duration: 600, upstreamIds: ['fct_events'] },
      { id: 'mart_mrr',   label: 'mart_mrr_trend',  type: 'load',   description: 'MRRトレンド・予測をマートへ',   duration: 500, upstreamIds: ['fct_mrr'] },
      { id: 'notify',     label: 'notify_slack',    type: 'notify', description: 'Slackに完了通知',               duration: 200, upstreamIds: ['mart_churn', 'mart_mrr'] },
    ],
  },
};

function layout(tasks: RawTask[], col: number, totalCols: number): { x: number; y: number }[] {
  const colW = 260;
  const rowH = 130;
  const totalH = tasks.length * rowH;
  const startY = Math.max(0, (totalCols * rowH - totalH) / 2);
  return tasks.map((_, i) => ({ x: col * colW, y: startY + i * rowH }));
}

/**
 * Returns a DagScenario built from the user's completed quest stages.
 * completedStages: e.g. ['source', 'staging', 'warehouse', 'mart']
 */
export function buildDagFromQuest(questId: string, completedStages: string[]): DagScenario | null {
  const tmpl = TEMPLATES[questId];
  if (!tmpl) return null;

  const hasSource    = completedStages.includes('source');
  const hasStaging   = completedStages.includes('staging');
  const hasWarehouse = completedStages.includes('warehouse');
  const hasMart      = completedStages.includes('mart');

  if (!hasSource) return null; // need at least source

  // Determine architecture pattern
  const pattern = hasStaging && hasWarehouse ? '4層 Standard'
    : hasStaging && !hasWarehouse ? '3層 Lightweight'
    : !hasStaging && hasWarehouse ? '3層 ETL Style'
    : '2層 Direct';

  const tasks: DagTask[] = [];

  // Column index per layer
  let col = 0;
  const colOf: Record<string, number> = {};

  // Source (always present)
  const srcPositions = layout(tmpl.source, col, 3);
  tmpl.source.forEach((t, i) => {
    tasks.push({ ...t, upstreams: [], x: srcPositions[i].x, y: srcPositions[i].y });
    colOf[t.id] = col;
  });
  col++;

  let prevLayerIds: string[] = tmpl.source.map(t => t.id);

  // Staging (optional)
  if (hasStaging) {
    const stgPositions = layout(tmpl.staging, col, 3);
    tmpl.staging.forEach((t, i) => {
      const upstream = prevLayerIds.find(id => id === t.sourceId) ? [t.sourceId] : [prevLayerIds[0]];
      tasks.push({ ...t, upstreams: upstream, x: stgPositions[i].x, y: stgPositions[i].y });
      colOf[t.id] = col;
    });
    prevLayerIds = tmpl.staging.map(t => t.id);
    col++;
  }

  // Warehouse (optional)
  if (hasWarehouse) {
    const wPositions = layout(tmpl.warehouse, col, tmpl.warehouse.length);
    tmpl.warehouse.forEach((t, i) => {
      const upstreams = t.stagingIds
        .filter(id => prevLayerIds.includes(id))
        .concat(prevLayerIds.filter(id => !t.stagingIds.includes(id) && t.stagingIds.length === 0));
      const resolvedUpstreams = upstreams.length > 0 ? upstreams : prevLayerIds;
      tasks.push({ ...t, upstreams: resolvedUpstreams, x: wPositions[i].x, y: wPositions[i].y });
      colOf[t.id] = col;
    });
    prevLayerIds = tmpl.warehouse.map(t => t.id);
    col++;
  }

  // Mart (optional)
  if (hasMart) {
    const martTasks = tmpl.mart.filter(t => t.id !== 'notify');
    const notifyTask = tmpl.mart.find(t => t.id === 'notify');
    const mPositions = layout(martTasks, col, martTasks.length + 1);
    martTasks.forEach((t, i) => {
      const upstreams = t.upstreamIds.filter(id => prevLayerIds.includes(id));
      const resolvedUpstreams = upstreams.length > 0 ? upstreams : prevLayerIds;
      tasks.push({ ...t, upstreams: resolvedUpstreams, x: mPositions[i].x, y: mPositions[i].y });
    });
    if (notifyTask) {
      const notifyX = (col + 1) * 260;
      const notifyY = mPositions[Math.floor(mPositions.length / 2)]?.y ?? 130;
      const notifyUpstreams = martTasks.map(t => t.id);
      tasks.push({ ...notifyTask, upstreams: notifyUpstreams, x: notifyX, y: notifyY });
    }
  }

  return {
    id: `user_${questId}`,
    title: tmpl.label(pattern),
    description: tmpl.description,
    tasks,
    isUserPipeline: true,
  };
}

export type { QuestTemplate };
