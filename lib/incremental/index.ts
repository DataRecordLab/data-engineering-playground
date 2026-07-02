export type LoadStrategy = 'full' | 'incremental' | 'upsert' | 'cdc';

export type RowState = 'new' | 'updated' | 'duplicate' | 'stale';

export interface OrderRow {
  order_id: number;
  user_id: string;
  product: string;
  status: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface SubRow {
  sub_id: number;
  user_id: string;
  plan: string;
  status: string;
  mrr: number;
  started_at: string;
  updated_at: string;
}

export interface CdcEvent {
  op: '+' | '~' | '-';
  order_id: number;
  product: string;
  status?: string;
  amount?: number;
  reason: string;
}

export interface SubCdcEvent {
  op: '+' | '~' | '-';
  sub_id: number;
  plan?: string;
  mrr?: number;
  reason: string;
}

export interface StrategyResult<T = OrderRow> {
  rowsScanned: number;
  rowsWritten: number;
  warehouseAfter: (T & { _state?: RowState })[];
  issues: string[];
  ok: boolean;
  sql: string;
  totalSourceRows: number;
}

export const LAST_RUN_AT = '2024-01-14';

// ── 前回実行後のウェアハウス状態（15件）──────────────────────────────────────
export const WAREHOUSE_ROWS: OrderRow[] = [
  { order_id: 1,  user_id: 'u001', product: 'ノートPC',         status: 'delivered', amount: 89800,  created_at: '2024-01-01', updated_at: '2024-01-10' },
  { order_id: 2,  user_id: 'u002', product: 'マウス',            status: 'delivered', amount: 3200,   created_at: '2024-01-02', updated_at: '2024-01-09' },
  { order_id: 3,  user_id: 'u003', product: 'キーボード',        status: 'cancelled', amount: 8900,   created_at: '2024-01-03', updated_at: '2024-01-08' },
  { order_id: 4,  user_id: 'u004', product: 'モニター',          status: 'delivered', amount: 45000,  created_at: '2024-01-04', updated_at: '2024-01-11' },
  { order_id: 5,  user_id: 'u005', product: 'ノートPC',         status: 'pending',   amount: 89800,  created_at: '2024-01-05', updated_at: '2024-01-05' },
  { order_id: 6,  user_id: 'u006', product: 'イヤフォン',        status: 'delivered', amount: 14800,  created_at: '2024-01-06', updated_at: '2024-01-13' },
  { order_id: 7,  user_id: 'u007', product: 'ケース',            status: 'delivered', amount: 1800,   created_at: '2024-01-07', updated_at: '2024-01-12' },
  { order_id: 8,  user_id: 'u008', product: 'スピーカー',        status: 'shipped',   amount: 22000,  created_at: '2024-01-08', updated_at: '2024-01-13' },
  { order_id: 9,  user_id: 'u009', product: 'タブレット',        status: 'delivered', amount: 62000,  created_at: '2024-01-09', updated_at: '2024-01-14' },
  { order_id: 10, user_id: 'u010', product: 'ウェブカメラ',      status: 'pending',   amount: 8500,   created_at: '2024-01-10', updated_at: '2024-01-10' },
  { order_id: 11, user_id: 'u011', product: 'SSDドライブ',      status: 'delivered', amount: 15000,  created_at: '2024-01-11', updated_at: '2024-01-13' },
  { order_id: 12, user_id: 'u012', product: 'カメラレンズ',      status: 'shipped',   amount: 45000,  created_at: '2024-01-12', updated_at: '2024-01-12' },
  { order_id: 13, user_id: 'u013', product: 'マウスパッド',      status: 'delivered', amount: 1200,   created_at: '2024-01-13', updated_at: '2024-01-14' },
  { order_id: 14, user_id: 'u014', product: 'USBハブ',          status: 'delivered', amount: 3500,   created_at: '2024-01-13', updated_at: '2024-01-14' },
  { order_id: 15, user_id: 'u015', product: 'ルーター',          status: 'shipped',   amount: 12000,  created_at: '2024-01-14', updated_at: '2024-01-14' },
];

// ── 今日（2024-01-15）のソースDB状態 ──────────────────────────────────────────
// 変更: order 3 削除、order 5/12 更新、order 16-18 新規
export const SOURCE_ROWS: OrderRow[] = [
  ...WAREHOUSE_ROWS
    .filter(r => r.order_id !== 3)
    .map(r => {
      if (r.order_id === 5)  return { ...r, status: 'shipped',   updated_at: '2024-01-15' };
      if (r.order_id === 12) return { ...r, status: 'delivered', updated_at: '2024-01-15' };
      return r;
    }),
  { order_id: 16, user_id: 'u016', product: 'カメラ',             status: 'pending', amount: 125000, created_at: '2024-01-15', updated_at: '2024-01-15' },
  { order_id: 17, user_id: 'u017', product: 'メモリカード',        status: 'pending', amount: 3200,   created_at: '2024-01-15', updated_at: '2024-01-15' },
  { order_id: 18, user_id: 'u018', product: 'モバイルバッテリー',  status: 'pending', amount: 6800,   created_at: '2024-01-15', updated_at: '2024-01-15' },
];

// ── CDC変更ログ ────────────────────────────────────────────────────────────────
export const CDC_EVENTS: CdcEvent[] = [
  { op: '+', order_id: 16, product: 'カメラ',            status: 'pending',   amount: 125000, reason: '新規注文' },
  { op: '+', order_id: 17, product: 'メモリカード',      status: 'pending',   amount: 3200,   reason: '新規注文' },
  { op: '+', order_id: 18, product: 'モバイルバッテリー', status: 'pending',  amount: 6800,   reason: '新規注文' },
  { op: '~', order_id: 5,  product: 'ノートPC',          status: 'shipped',   amount: 89800,  reason: 'pending → shipped' },
  { op: '~', order_id: 12, product: 'カメラレンズ',      status: 'delivered', amount: 45000,  reason: 'shipped → delivered' },
  { op: '-', order_id: 3,  product: 'キーボード',                              reason: '物理削除（キャンセル確定）' },
];

export function simulateStrategy(strategy: LoadStrategy): StrategyResult<OrderRow> {
  const newRows = SOURCE_ROWS.filter(r => r.updated_at > LAST_RUN_AT);

  switch (strategy) {
    case 'full': {
      return {
        rowsScanned: SOURCE_ROWS.length,
        rowsWritten: SOURCE_ROWS.length,
        warehouseAfter: SOURCE_ROWS.map(r => ({
          ...r,
          _state: newRows.some(n => n.order_id === r.order_id && !WAREHOUSE_ROWS.some(w => w.order_id === r.order_id))
            ? 'new'
            : newRows.some(n => n.order_id === r.order_id) ? 'updated' : undefined,
        })),
        issues: [],
        ok: true,
        totalSourceRows: SOURCE_ROWS.length,
        sql: `-- ① TRUNCATE + INSERT 全件ロード
-- ⏱️ 毎回全データをスキャン（本番では数百万行）
TRUNCATE TABLE warehouse_orders;

INSERT INTO warehouse_orders
SELECT * FROM source_orders;

-- スキャン: ${SOURCE_ROWS.length} 件 / 書き込み: ${SOURCE_ROWS.length} 件`,
      };
    }

    case 'incremental': {
      const dupIds = newRows.filter(r => WAREHOUSE_ROWS.some(w => w.order_id === r.order_id)).map(r => r.order_id);
      const appended = [
        ...WAREHOUSE_ROWS.map(r => ({
          ...r,
          _state: dupIds.includes(r.order_id) ? 'duplicate' as const : (r.order_id === 3 ? 'stale' as const : undefined),
        })),
        ...newRows.map(r => ({
          ...r,
          _state: dupIds.includes(r.order_id) ? 'duplicate' as const : 'new' as const,
        })),
      ];
      return {
        rowsScanned: newRows.length,
        rowsWritten: newRows.length,
        warehouseAfter: appended,
        issues: [
          `❌ 重複: order_id ${dupIds.join(', ')} が2件ずつ存在（古いまま + 新しい行）`,
          '❌ 削除漏れ: order_id 3 が削除されたのに倉庫に残存',
        ],
        ok: false,
        totalSourceRows: SOURCE_ROWS.length,
        sql: `-- ② 差分のみ追記（watermark 方式）
-- ✅ スキャン件数は大幅削減
-- ❌ 問題: 更新行が重複、削除を検知できない
INSERT INTO warehouse_orders
SELECT *
FROM source_orders
WHERE updated_at > '${LAST_RUN_AT}';

-- スキャン: ${newRows.length} 件 / 書き込み: ${newRows.length} 件`,
      };
    }

    case 'upsert': {
      const map = new Map<number, OrderRow & { _state?: 'new' | 'updated' | 'stale' }>(
        WAREHOUSE_ROWS.map(r => [r.order_id, { ...r, _state: r.order_id === 3 ? 'stale' as const : undefined }])
      );
      for (const r of newRows) {
        const isNew = !WAREHOUSE_ROWS.some(w => w.order_id === r.order_id);
        map.set(r.order_id, { ...r, _state: isNew ? 'new' as const : 'updated' as const });
      }
      return {
        rowsScanned: newRows.length,
        rowsWritten: newRows.length,
        warehouseAfter: Array.from(map.values()),
        issues: ['⚠️ 削除漏れ: order_id 3 が削除されたのに倉庫に残存（Upsertでは検知不可）'],
        ok: false,
        totalSourceRows: SOURCE_ROWS.length,
        sql: `-- ③ 差分を UPSERT（重複は解決・更新も正確）
-- ✅ 新規 + 更新を正しく処理
-- ⚠️ 削除はまだ検知できない
INSERT INTO warehouse_orders
SELECT * FROM source_orders
WHERE updated_at > '${LAST_RUN_AT}'
ON CONFLICT (order_id) DO UPDATE SET
  status     = EXCLUDED.status,
  updated_at = EXCLUDED.updated_at;

-- スキャン: ${newRows.length} 件 / UPSERT: ${newRows.length} 件`,
      };
    }

    case 'cdc': {
      const map = new Map(WAREHOUSE_ROWS.map(r => [r.order_id, { ...r, _state: undefined as ('new' | 'updated' | undefined) }]));
      for (const ev of CDC_EVENTS) {
        if (ev.op === '-') {
          map.delete(ev.order_id);
        } else {
          const src = SOURCE_ROWS.find(r => r.order_id === ev.order_id);
          if (src) map.set(src.order_id, { ...src, _state: ev.op === '+' ? 'new' : 'updated' });
        }
      }
      return {
        rowsScanned: CDC_EVENTS.length,
        rowsWritten: CDC_EVENTS.length,
        warehouseAfter: Array.from(map.values()),
        issues: [],
        ok: true,
        totalSourceRows: SOURCE_ROWS.length,
        sql: `-- ④ CDC変更ログ適用（INSERT / UPDATE / DELETE 完全同期）
-- ✅ 削除も正確に検知・反映
MERGE INTO warehouse_orders AS target
USING cdc_log AS src ON target.order_id = src.order_id
WHEN MATCHED AND src.op = 'D' THEN DELETE
WHEN MATCHED AND src.op = 'U' THEN
  UPDATE SET status = src.status, updated_at = src.updated_at
WHEN NOT MATCHED AND src.op = 'I' THEN
  INSERT VALUES (src.*);

-- イベント処理: ${CDC_EVENTS.length} 件（+3件 / ~2件 / -1件）`,
      };
    }
  }
}

// ── SaaS サブスクリプション インクリメンタルシナリオ ──────────────────────────

export const SAAS_LAST_RUN_AT = '2024-01-14';

export const SAAS_WAREHOUSE_ROWS: SubRow[] = [
  { sub_id: 1,  user_id: 'u001', plan: 'pro',     status: 'active', mrr: 9800, started_at: '2024-01-01', updated_at: '2024-01-10' },
  { sub_id: 2,  user_id: 'u002', plan: 'free',    status: 'active', mrr: 0,    started_at: '2024-01-02', updated_at: '2024-01-02' },
  { sub_id: 3,  user_id: 'u003', plan: 'pro',     status: 'active', mrr: 9800, started_at: '2024-01-03', updated_at: '2024-01-08' },
  { sub_id: 4,  user_id: 'u004', plan: 'starter', status: 'active', mrr: 2980, started_at: '2024-01-04', updated_at: '2024-01-12' },
  { sub_id: 5,  user_id: 'u005', plan: 'pro',     status: 'active', mrr: 9800, started_at: '2024-01-05', updated_at: '2024-01-05' },
  { sub_id: 6,  user_id: 'u006', plan: 'free',    status: 'active', mrr: 0,    started_at: '2024-01-06', updated_at: '2024-01-06' },
  { sub_id: 7,  user_id: 'u007', plan: 'starter', status: 'active', mrr: 2980, started_at: '2024-01-07', updated_at: '2024-01-13' },
  { sub_id: 8,  user_id: 'u008', plan: 'pro',     status: 'active', mrr: 9800, started_at: '2024-01-08', updated_at: '2024-01-13' },
  { sub_id: 9,  user_id: 'u009', plan: 'free',    status: 'active', mrr: 0,    started_at: '2024-01-09', updated_at: '2024-01-14' },
  { sub_id: 10, user_id: 'u010', plan: 'starter', status: 'active', mrr: 2980, started_at: '2024-01-10', updated_at: '2024-01-14' },
];

export const SAAS_SOURCE_ROWS: SubRow[] = [
  ...SAAS_WAREHOUSE_ROWS
    .filter(r => r.sub_id !== 3)
    .map(r => {
      if (r.sub_id === 4) return { ...r, plan: 'pro',     mrr: 9800, updated_at: '2024-01-15' };
      if (r.sub_id === 8) return { ...r, plan: 'starter', mrr: 2980, updated_at: '2024-01-15' };
      return r;
    }),
  { sub_id: 11, user_id: 'u011', plan: 'free', status: 'active', mrr: 0,    started_at: '2024-01-15', updated_at: '2024-01-15' },
  { sub_id: 12, user_id: 'u012', plan: 'pro',  status: 'active', mrr: 9800, started_at: '2024-01-15', updated_at: '2024-01-15' },
];

export const SAAS_CDC_EVENTS: SubCdcEvent[] = [
  { op: '+', sub_id: 11, plan: 'free',    mrr: 0,    reason: '新規無料登録' },
  { op: '+', sub_id: 12, plan: 'pro',     mrr: 9800, reason: '新規Proプラン契約' },
  { op: '~', sub_id: 4,  plan: 'pro',     mrr: 9800, reason: 'starter → Pro アップグレード' },
  { op: '~', sub_id: 8,  plan: 'starter', mrr: 2980, reason: 'Pro → starter ダウングレード' },
  { op: '-', sub_id: 3,  reason: '解約確定（物理削除）' },
];

export function simulateSaasStrategy(strategy: LoadStrategy): StrategyResult<SubRow> {
  const newRows = SAAS_SOURCE_ROWS.filter(r => r.updated_at > SAAS_LAST_RUN_AT);

  switch (strategy) {
    case 'full': {
      return {
        rowsScanned: SAAS_SOURCE_ROWS.length,
        rowsWritten: SAAS_SOURCE_ROWS.length,
        warehouseAfter: SAAS_SOURCE_ROWS.map(r => ({
          ...r,
          _state: newRows.some(n => n.sub_id === r.sub_id && !SAAS_WAREHOUSE_ROWS.some(w => w.sub_id === r.sub_id))
            ? 'new'
            : newRows.some(n => n.sub_id === r.sub_id) ? 'updated' : undefined,
        })),
        issues: [],
        ok: true,
        totalSourceRows: SAAS_SOURCE_ROWS.length,
        sql: `-- ① TRUNCATE + INSERT 全件ロード
-- ⏱️ 毎回全データをスキャン（本番では数百万行）
TRUNCATE TABLE warehouse_subscriptions;

INSERT INTO warehouse_subscriptions
SELECT * FROM source_subscriptions;

-- スキャン: ${SAAS_SOURCE_ROWS.length} 件 / 書き込み: ${SAAS_SOURCE_ROWS.length} 件`,
      };
    }

    case 'incremental': {
      const dupIds = newRows.filter(r => SAAS_WAREHOUSE_ROWS.some(w => w.sub_id === r.sub_id)).map(r => r.sub_id);
      const appended = [
        ...SAAS_WAREHOUSE_ROWS.map(r => ({
          ...r,
          _state: dupIds.includes(r.sub_id) ? 'duplicate' as const : (r.sub_id === 3 ? 'stale' as const : undefined),
        })),
        ...newRows.map(r => ({
          ...r,
          _state: dupIds.includes(r.sub_id) ? 'duplicate' as const : 'new' as const,
        })),
      ];
      return {
        rowsScanned: newRows.length,
        rowsWritten: newRows.length,
        warehouseAfter: appended,
        issues: [
          `❌ 重複: sub_id ${dupIds.join(', ')} が2件ずつ存在（古いプラン + 新しいプラン）`,
          '❌ 削除漏れ: sub_id 3 が解約済みなのに倉庫に残存',
        ],
        ok: false,
        totalSourceRows: SAAS_SOURCE_ROWS.length,
        sql: `-- ② 差分のみ追記（watermark 方式）
-- ✅ スキャン件数は大幅削減
-- ❌ 問題: 更新行が重複、解約（削除）を検知できない
INSERT INTO warehouse_subscriptions
SELECT *
FROM source_subscriptions
WHERE updated_at > '${SAAS_LAST_RUN_AT}';

-- スキャン: ${newRows.length} 件 / 書き込み: ${newRows.length} 件`,
      };
    }

    case 'upsert': {
      const map = new Map<number, SubRow & { _state?: RowState }>(
        SAAS_WAREHOUSE_ROWS.map(r => [r.sub_id, { ...r, _state: r.sub_id === 3 ? 'stale' as const : undefined }])
      );
      for (const r of newRows) {
        const isNew = !SAAS_WAREHOUSE_ROWS.some(w => w.sub_id === r.sub_id);
        map.set(r.sub_id, { ...r, _state: isNew ? 'new' as const : 'updated' as const });
      }
      return {
        rowsScanned: newRows.length,
        rowsWritten: newRows.length,
        warehouseAfter: Array.from(map.values()),
        issues: ['⚠️ 削除漏れ: sub_id 3 が解約済みなのに倉庫に残存（Upsertでは検知不可）'],
        ok: false,
        totalSourceRows: SAAS_SOURCE_ROWS.length,
        sql: `-- ③ 差分を UPSERT（重複は解決・プラン変更も正確）
-- ✅ 新規 + アップグレード/ダウングレードを正しく処理
-- ⚠️ 解約（削除）はまだ検知できない
INSERT INTO warehouse_subscriptions
SELECT * FROM source_subscriptions
WHERE updated_at > '${SAAS_LAST_RUN_AT}'
ON CONFLICT (sub_id) DO UPDATE SET
  plan       = EXCLUDED.plan,
  mrr        = EXCLUDED.mrr,
  updated_at = EXCLUDED.updated_at;

-- スキャン: ${newRows.length} 件 / UPSERT: ${newRows.length} 件`,
      };
    }

    case 'cdc': {
      const map = new Map(SAAS_WAREHOUSE_ROWS.map(r => [r.sub_id, { ...r, _state: undefined as (RowState | undefined) }]));
      for (const ev of SAAS_CDC_EVENTS) {
        if (ev.op === '-') {
          map.delete(ev.sub_id);
        } else {
          const src = SAAS_SOURCE_ROWS.find(r => r.sub_id === ev.sub_id);
          if (src) map.set(src.sub_id, { ...src, _state: ev.op === '+' ? 'new' : 'updated' });
        }
      }
      return {
        rowsScanned: SAAS_CDC_EVENTS.length,
        rowsWritten: SAAS_CDC_EVENTS.length,
        warehouseAfter: Array.from(map.values()),
        issues: [],
        ok: true,
        totalSourceRows: SAAS_SOURCE_ROWS.length,
        sql: `-- ④ CDC変更ログ適用（INSERT / UPDATE / DELETE 完全同期）
-- ✅ 解約（削除）も正確に検知・反映
MERGE INTO warehouse_subscriptions AS target
USING cdc_log AS src ON target.sub_id = src.sub_id
WHEN MATCHED AND src.op = 'D' THEN DELETE
WHEN MATCHED AND src.op = 'U' THEN
  UPDATE SET plan = src.plan, mrr = src.mrr, updated_at = src.updated_at
WHEN NOT MATCHED AND src.op = 'I' THEN
  INSERT VALUES (src.*);

-- イベント処理: ${SAAS_CDC_EVENTS.length} 件（+2件 / ~2件 / -1件）`,
      };
    }
  }
}
