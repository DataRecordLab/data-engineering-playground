export interface LineageNode {
  id: string;
  label: string;
  layer: 'source' | 'staging' | 'warehouse' | 'mart';
  columns: LineageColumn[];
  x: number;
  y: number;
}

export interface LineageColumn {
  name: string;
  type: string;
  sourceColumns?: { nodeId: string; columnName: string; transform?: string }[];
}

export interface LineageEdge {
  id: string;
  source: string;
  target: string;
}

// ── EC サイトパイプライン リネージュグラフ ──────────────────────────────────────

export const LINEAGE_NODES: LineageNode[] = [
  {
    id: 'raw_orders',
    label: 'raw_orders',
    layer: 'source',
    x: 0, y: 0,
    columns: [
      { name: 'order_id',    type: 'VARCHAR' },
      { name: 'user_id',     type: 'VARCHAR' },
      { name: 'product_id',  type: 'VARCHAR' },
      { name: 'total_amount',type: 'VARCHAR' },  // 文字列のまま来る
      { name: 'status',      type: 'VARCHAR' },
      { name: 'created_at',  type: 'VARCHAR' },
      { name: 'updated_at',  type: 'VARCHAR' },
    ],
  },
  {
    id: 'raw_users',
    label: 'raw_users',
    layer: 'source',
    x: 0, y: 280,
    columns: [
      { name: 'user_id',     type: 'VARCHAR' },
      { name: 'email',       type: 'VARCHAR' },
      { name: 'plan',        type: 'VARCHAR' },
      { name: 'created_at',  type: 'VARCHAR' },
    ],
  },
  {
    id: 'raw_products',
    label: 'raw_products',
    layer: 'source',
    x: 0, y: 520,
    columns: [
      { name: 'product_id',  type: 'VARCHAR' },
      { name: 'name',        type: 'VARCHAR' },
      { name: 'category',    type: 'VARCHAR' },
      { name: 'price',       type: 'VARCHAR' },
    ],
  },

  {
    id: 'stg_orders',
    label: 'stg_orders',
    layer: 'staging',
    x: 280, y: 0,
    columns: [
      { name: 'order_id',    type: 'BIGINT',    sourceColumns: [{ nodeId: 'raw_orders', columnName: 'order_id', transform: 'CAST' }] },
      { name: 'user_id',     type: 'BIGINT',    sourceColumns: [{ nodeId: 'raw_orders', columnName: 'user_id',  transform: 'CAST' }] },
      { name: 'product_id',  type: 'BIGINT',    sourceColumns: [{ nodeId: 'raw_orders', columnName: 'product_id', transform: 'CAST' }] },
      { name: 'amount',      type: 'NUMERIC',   sourceColumns: [{ nodeId: 'raw_orders', columnName: 'total_amount', transform: 'CAST + NULL処理' }] },
      { name: 'status',      type: 'VARCHAR',   sourceColumns: [{ nodeId: 'raw_orders', columnName: 'status', transform: 'LOWER() + TRIM()' }] },
      { name: 'created_at',  type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'raw_orders', columnName: 'created_at', transform: 'TO_TIMESTAMP' }] },
      { name: 'updated_at',  type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'raw_orders', columnName: 'updated_at', transform: 'TO_TIMESTAMP' }] },
    ],
  },
  {
    id: 'stg_users',
    label: 'stg_users',
    layer: 'staging',
    x: 280, y: 280,
    columns: [
      { name: 'user_id',     type: 'BIGINT',  sourceColumns: [{ nodeId: 'raw_users', columnName: 'user_id', transform: 'CAST' }] },
      { name: 'email',       type: 'VARCHAR', sourceColumns: [{ nodeId: 'raw_users', columnName: 'email',   transform: 'LOWER()' }] },
      { name: 'plan',        type: 'VARCHAR', sourceColumns: [{ nodeId: 'raw_users', columnName: 'plan' }] },
      { name: 'created_at',  type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'raw_users', columnName: 'created_at', transform: 'TO_TIMESTAMP' }] },
    ],
  },
  {
    id: 'stg_products',
    label: 'stg_products',
    layer: 'staging',
    x: 280, y: 520,
    columns: [
      { name: 'product_id',  type: 'BIGINT',  sourceColumns: [{ nodeId: 'raw_products', columnName: 'product_id', transform: 'CAST' }] },
      { name: 'name',        type: 'VARCHAR', sourceColumns: [{ nodeId: 'raw_products', columnName: 'name' }] },
      { name: 'category',    type: 'VARCHAR', sourceColumns: [{ nodeId: 'raw_products', columnName: 'category' }] },
      { name: 'price',       type: 'NUMERIC', sourceColumns: [{ nodeId: 'raw_products', columnName: 'price', transform: 'CAST' }] },
    ],
  },

  {
    id: 'fct_orders',
    label: 'fct_orders',
    layer: 'warehouse',
    x: 560, y: 140,
    columns: [
      { name: 'order_id',    type: 'BIGINT',  sourceColumns: [{ nodeId: 'stg_orders', columnName: 'order_id' }] },
      { name: 'user_id',     type: 'BIGINT',  sourceColumns: [{ nodeId: 'stg_orders', columnName: 'user_id' }] },
      { name: 'product_id',  type: 'BIGINT',  sourceColumns: [{ nodeId: 'stg_orders', columnName: 'product_id' }] },
      { name: 'amount',      type: 'NUMERIC', sourceColumns: [{ nodeId: 'stg_orders', columnName: 'amount' }] },
      { name: 'status',      type: 'VARCHAR', sourceColumns: [{ nodeId: 'stg_orders', columnName: 'status' }] },
      { name: 'user_plan',   type: 'VARCHAR', sourceColumns: [{ nodeId: 'stg_users',  columnName: 'plan', transform: 'JOIN on user_id' }] },
      { name: 'category',    type: 'VARCHAR', sourceColumns: [{ nodeId: 'stg_products', columnName: 'category', transform: 'JOIN on product_id' }] },
      { name: 'ordered_at',  type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'stg_orders', columnName: 'created_at' }] },
    ],
  },

  {
    id: 'mart_daily_revenue',
    label: 'mart_daily_revenue',
    layer: 'mart',
    x: 840, y: 60,
    columns: [
      { name: 'date',          type: 'DATE',    sourceColumns: [{ nodeId: 'fct_orders', columnName: 'ordered_at', transform: 'DATE_TRUNC' }] },
      { name: 'revenue',       type: 'NUMERIC', sourceColumns: [{ nodeId: 'fct_orders', columnName: 'amount',     transform: 'SUM()' }] },
      { name: 'order_count',   type: 'BIGINT',  sourceColumns: [{ nodeId: 'fct_orders', columnName: 'order_id',   transform: 'COUNT()' }] },
      { name: 'avg_order_value', type: 'NUMERIC', sourceColumns: [{ nodeId: 'fct_orders', columnName: 'amount',  transform: 'AVG()' }] },
    ],
  },
  {
    id: 'mart_user_cohort',
    label: 'mart_user_cohort',
    layer: 'mart',
    x: 840, y: 300,
    columns: [
      { name: 'user_id',        type: 'BIGINT',  sourceColumns: [{ nodeId: 'fct_orders', columnName: 'user_id' }] },
      { name: 'first_order_at', type: 'DATE',    sourceColumns: [{ nodeId: 'fct_orders', columnName: 'ordered_at', transform: 'MIN()' }] },
      { name: 'total_spent',    type: 'NUMERIC', sourceColumns: [{ nodeId: 'fct_orders', columnName: 'amount',     transform: 'SUM()' }] },
      { name: 'plan',           type: 'VARCHAR', sourceColumns: [{ nodeId: 'fct_orders', columnName: 'user_plan' }] },
    ],
  },
];

export const LINEAGE_EDGES: LineageEdge[] = [
  { id: 'e1', source: 'raw_orders',   target: 'stg_orders' },
  { id: 'e2', source: 'raw_users',    target: 'stg_users' },
  { id: 'e3', source: 'raw_products', target: 'stg_products' },
  { id: 'e4', source: 'stg_orders',   target: 'fct_orders' },
  { id: 'e5', source: 'stg_users',    target: 'fct_orders' },
  { id: 'e6', source: 'stg_products', target: 'fct_orders' },
  { id: 'e7', source: 'fct_orders',   target: 'mart_daily_revenue' },
  { id: 'e8', source: 'fct_orders',   target: 'mart_user_cohort' },
];

// ── SaaS パイプライン リネージュグラフ ────────────────────────────────────────

export const SAAS_LINEAGE_NODES: LineageNode[] = [
  {
    id: 'raw_events',
    label: 'raw_events',
    layer: 'source',
    x: 0, y: 0,
    columns: [
      { name: 'event_id',   type: 'VARCHAR' },
      { name: 'user_id',    type: 'VARCHAR' },
      { name: 'event_type', type: 'VARCHAR' },
      { name: 'properties', type: 'VARCHAR' },  // JSON文字列のまま
      { name: 'created_at', type: 'VARCHAR' },
    ],
  },
  {
    id: 'raw_subscriptions',
    label: 'raw_subscriptions',
    layer: 'source',
    x: 0, y: 280,
    columns: [
      { name: 'sub_id',       type: 'VARCHAR' },
      { name: 'user_id',      type: 'VARCHAR' },
      { name: 'plan',         type: 'VARCHAR' },
      { name: 'status',       type: 'VARCHAR' },
      { name: 'mrr',          type: 'VARCHAR' },  // 文字列のまま
      { name: 'started_at',   type: 'VARCHAR' },
      { name: 'updated_at',   type: 'VARCHAR' },
    ],
  },
  {
    id: 'raw_users',
    label: 'raw_users',
    layer: 'source',
    x: 0, y: 520,
    columns: [
      { name: 'user_id',    type: 'VARCHAR' },
      { name: 'email',      type: 'VARCHAR' },
      { name: 'company',    type: 'VARCHAR' },
      { name: 'trial_end',  type: 'VARCHAR' },
      { name: 'created_at', type: 'VARCHAR' },
    ],
  },

  {
    id: 'stg_events',
    label: 'stg_events',
    layer: 'staging',
    x: 280, y: 0,
    columns: [
      { name: 'event_id',   type: 'BIGINT',    sourceColumns: [{ nodeId: 'raw_events', columnName: 'event_id',   transform: 'CAST' }] },
      { name: 'user_id',    type: 'BIGINT',    sourceColumns: [{ nodeId: 'raw_events', columnName: 'user_id',    transform: 'CAST' }] },
      { name: 'event_type', type: 'VARCHAR',   sourceColumns: [{ nodeId: 'raw_events', columnName: 'event_type', transform: 'LOWER() + TRIM()' }] },
      { name: 'session_id', type: 'VARCHAR',   sourceColumns: [{ nodeId: 'raw_events', columnName: 'properties', transform: 'JSON抽出' }] },
      { name: 'created_at', type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'raw_events', columnName: 'created_at', transform: 'TO_TIMESTAMP' }] },
    ],
  },
  {
    id: 'stg_subscriptions',
    label: 'stg_subscriptions',
    layer: 'staging',
    x: 280, y: 280,
    columns: [
      { name: 'sub_id',     type: 'BIGINT',    sourceColumns: [{ nodeId: 'raw_subscriptions', columnName: 'sub_id',     transform: 'CAST' }] },
      { name: 'user_id',    type: 'BIGINT',    sourceColumns: [{ nodeId: 'raw_subscriptions', columnName: 'user_id',    transform: 'CAST' }] },
      { name: 'plan',       type: 'VARCHAR',   sourceColumns: [{ nodeId: 'raw_subscriptions', columnName: 'plan' }] },
      { name: 'is_active',  type: 'BOOLEAN',   sourceColumns: [{ nodeId: 'raw_subscriptions', columnName: 'status',     transform: "status='active'" }] },
      { name: 'mrr',        type: 'NUMERIC',   sourceColumns: [{ nodeId: 'raw_subscriptions', columnName: 'mrr',        transform: 'CAST' }] },
      { name: 'started_at', type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'raw_subscriptions', columnName: 'started_at', transform: 'TO_TIMESTAMP' }] },
      { name: 'updated_at', type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'raw_subscriptions', columnName: 'updated_at', transform: 'TO_TIMESTAMP' }] },
    ],
  },
  {
    id: 'stg_users_saas',
    label: 'stg_users',
    layer: 'staging',
    x: 280, y: 520,
    columns: [
      { name: 'user_id',    type: 'BIGINT',  sourceColumns: [{ nodeId: 'raw_users', columnName: 'user_id',   transform: 'CAST' }] },
      { name: 'email',      type: 'VARCHAR', sourceColumns: [{ nodeId: 'raw_users', columnName: 'email',     transform: 'LOWER()' }] },
      { name: 'company',    type: 'VARCHAR', sourceColumns: [{ nodeId: 'raw_users', columnName: 'company' }] },
      { name: 'is_trial',   type: 'BOOLEAN', sourceColumns: [{ nodeId: 'raw_users', columnName: 'trial_end', transform: 'trial_end > NOW()' }] },
      { name: 'created_at', type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'raw_users', columnName: 'created_at', transform: 'TO_TIMESTAMP' }] },
    ],
  },

  {
    id: 'fct_user_events',
    label: 'fct_user_events',
    layer: 'warehouse',
    x: 560, y: 60,
    columns: [
      { name: 'user_id',      type: 'BIGINT',    sourceColumns: [{ nodeId: 'stg_events',    columnName: 'user_id' }] },
      { name: 'event_type',   type: 'VARCHAR',   sourceColumns: [{ nodeId: 'stg_events',    columnName: 'event_type' }] },
      { name: 'event_count',  type: 'BIGINT',    sourceColumns: [{ nodeId: 'stg_events',    columnName: 'event_id',    transform: 'COUNT()' }] },
      { name: 'session_count',type: 'BIGINT',    sourceColumns: [{ nodeId: 'stg_events',    columnName: 'session_id',  transform: 'COUNT DISTINCT' }] },
      { name: 'company',      type: 'VARCHAR',   sourceColumns: [{ nodeId: 'stg_users_saas',columnName: 'company',     transform: 'JOIN on user_id' }] },
      { name: 'last_event_at',type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'stg_events',    columnName: 'created_at',  transform: 'MAX()' }] },
    ],
  },
  {
    id: 'fct_mrr',
    label: 'fct_mrr',
    layer: 'warehouse',
    x: 560, y: 370,
    columns: [
      { name: 'user_id',      type: 'BIGINT',  sourceColumns: [{ nodeId: 'stg_subscriptions', columnName: 'user_id' }] },
      { name: 'plan',         type: 'VARCHAR', sourceColumns: [{ nodeId: 'stg_subscriptions', columnName: 'plan' }] },
      { name: 'mrr',          type: 'NUMERIC', sourceColumns: [{ nodeId: 'stg_subscriptions', columnName: 'mrr' }] },
      { name: 'is_active',    type: 'BOOLEAN', sourceColumns: [{ nodeId: 'stg_subscriptions', columnName: 'is_active' }] },
      { name: 'months_active',type: 'INTEGER', sourceColumns: [{ nodeId: 'stg_subscriptions', columnName: 'started_at', transform: 'DATEDIFF(月)' }] },
      { name: 'churn_score',  type: 'NUMERIC', sourceColumns: [{ nodeId: 'stg_users_saas',    columnName: 'is_trial',   transform: 'JOIN + スコア計算' }] },
    ],
  },

  {
    id: 'mart_churn_risk',
    label: 'mart_churn_risk',
    layer: 'mart',
    x: 840, y: 60,
    columns: [
      { name: 'user_id',      type: 'BIGINT',  sourceColumns: [{ nodeId: 'fct_mrr',         columnName: 'user_id' }] },
      { name: 'plan',         type: 'VARCHAR', sourceColumns: [{ nodeId: 'fct_mrr',         columnName: 'plan' }] },
      { name: 'churn_score',  type: 'NUMERIC', sourceColumns: [{ nodeId: 'fct_mrr',         columnName: 'churn_score' }] },
      { name: 'days_inactive',type: 'INTEGER', sourceColumns: [{ nodeId: 'fct_user_events', columnName: 'last_event_at', transform: 'DATEDIFF(日)' }] },
      { name: 'last_event_at',type: 'TIMESTAMP', sourceColumns: [{ nodeId: 'fct_user_events',columnName: 'last_event_at' }] },
      { name: 'risk_level',   type: 'VARCHAR', sourceColumns: [{ nodeId: 'fct_mrr',         columnName: 'churn_score',   transform: "CASE WHEN >0.7 THEN 'high'" }] },
    ],
  },
  {
    id: 'mart_mrr_trend',
    label: 'mart_mrr_trend',
    layer: 'mart',
    x: 840, y: 340,
    columns: [
      { name: 'date',        type: 'DATE',    sourceColumns: [{ nodeId: 'fct_mrr', columnName: 'mrr',       transform: 'DATE_TRUNC(月)' }] },
      { name: 'plan',        type: 'VARCHAR', sourceColumns: [{ nodeId: 'fct_mrr', columnName: 'plan' }] },
      { name: 'mrr_total',   type: 'NUMERIC', sourceColumns: [{ nodeId: 'fct_mrr', columnName: 'mrr',       transform: 'SUM()' }] },
      { name: 'new_mrr',     type: 'NUMERIC', sourceColumns: [{ nodeId: 'fct_mrr', columnName: 'mrr',       transform: 'SUM() WHERE months_active=1' }] },
      { name: 'churned_mrr', type: 'NUMERIC', sourceColumns: [{ nodeId: 'fct_mrr', columnName: 'mrr',       transform: 'SUM() WHERE is_active=false' }] },
      { name: 'net_mrr',     type: 'NUMERIC', sourceColumns: [{ nodeId: 'fct_mrr', columnName: 'mrr',       transform: 'new_mrr - churned_mrr' }] },
    ],
  },
];

export const SAAS_LINEAGE_EDGES: LineageEdge[] = [
  { id: 's1',  source: 'raw_events',        target: 'stg_events' },
  { id: 's2',  source: 'raw_subscriptions', target: 'stg_subscriptions' },
  { id: 's3',  source: 'raw_users',         target: 'stg_users_saas' },
  { id: 's4',  source: 'stg_events',        target: 'fct_user_events' },
  { id: 's5',  source: 'stg_users_saas',    target: 'fct_user_events' },
  { id: 's6',  source: 'stg_subscriptions', target: 'fct_mrr' },
  { id: 's7',  source: 'stg_users_saas',    target: 'fct_mrr' },
  { id: 's8',  source: 'fct_user_events',   target: 'mart_churn_risk' },
  { id: 's9',  source: 'fct_mrr',           target: 'mart_churn_risk' },
  { id: 's10', source: 'fct_mrr',           target: 'mart_mrr_trend' },
];

// ── グラフマップ ────────────────────────────────────────────────────────────────

export const LINEAGE_GRAPHS: Record<string, { nodes: LineageNode[]; edges: LineageEdge[] }> = {
  'ec-site': { nodes: LINEAGE_NODES,      edges: LINEAGE_EDGES },
  'saas':    { nodes: SAAS_LINEAGE_NODES, edges: SAAS_LINEAGE_EDGES },
};

export const LAYER_META = {
  source:    { label: 'Source Layer',    color: '#64748b', bg: '#0f172a', border: '#334155' },
  staging:   { label: 'Staging Layer',   color: '#d97706', bg: '#1c1200', border: '#78350f' },
  warehouse: { label: 'Warehouse Layer', color: '#059669', bg: '#021a0d', border: '#065f46' },
  mart:      { label: 'Mart Layer',      color: '#7c3aed', bg: '#110728', border: '#5b21b6' },
} as const;

/** 指定ノードの上流・下流 node ID セットを返す */
export function getLineagePath(
  nodeId: string,
  edges: LineageEdge[] = LINEAGE_EDGES,
): { upstream: Set<string>; downstream: Set<string> } {
  const upstream = new Set<string>();
  const downstream = new Set<string>();

  const findUp = (id: string) => {
    edges.filter(e => e.target === id).forEach(e => {
      if (!upstream.has(e.source)) { upstream.add(e.source); findUp(e.source); }
    });
  };
  const findDown = (id: string) => {
    edges.filter(e => e.source === id).forEach(e => {
      if (!downstream.has(e.target)) { downstream.add(e.target); findDown(e.target); }
    });
  };

  findUp(nodeId);
  findDown(nodeId);
  return { upstream, downstream };
}
