import type { DebugScenario } from '@/types';

export const incrementalBugScenario: DebugScenario = {
  id: 'incremental-bug',
  title: '更新したはずのデータが反映されない',
  subtitle: '増分処理バグ・ウォーターマーク境界',
  category: 'pipeline_design',
  difficulty: 'intermediate',
  xpReward: 170,

  alert: {
    from: 'CS担当 林さん',
    role: 'カスタマーサクセス',
    message: '「注文ステータスをshippedに更新した」とバックエンドが言っているのに、ダッシュボードではまだpendingのままです。昨日の夕方に5件更新したはずが、今朝になっても反映されていません。顧客からクレームが来ています。',
    metric: '注文ステータス（shipped件数）',
    expectedValue: '5件 shipped',
    actualValue: '0件 shipped（全てpending）',
    timestamp: '2024-06-12 09:20:00',
  },

  setupSQL: `CREATE OR REPLACE TABLE orders_current AS SELECT * FROM (VALUES
  ('order_001', 'pending',   '2024-06-11 17:00:00'),
  ('order_002', 'pending',   '2024-06-11 17:01:00'),
  ('order_003', 'pending',   '2024-06-11 17:02:00'),
  ('order_004', 'pending',   '2024-06-11 17:03:00'),
  ('order_005', 'pending',   '2024-06-11 17:04:00'),
  ('order_006', 'completed', '2024-06-11 10:00:00'),
  ('order_007', 'completed', '2024-06-11 11:30:00'),
  ('order_008', 'completed', '2024-06-11 12:00:00')
) AS t(order_id, status, updated_at);

CREATE OR REPLACE TABLE orders_source AS SELECT * FROM (VALUES
  ('order_001', 'shipped',   '2024-06-11 17:00:00'),
  ('order_002', 'shipped',   '2024-06-11 17:01:00'),
  ('order_003', 'shipped',   '2024-06-11 17:02:00'),
  ('order_004', 'shipped',   '2024-06-11 17:03:00'),
  ('order_005', 'shipped',   '2024-06-11 17:04:00'),
  ('order_006', 'completed', '2024-06-11 10:00:00'),
  ('order_007', 'completed', '2024-06-11 11:30:00'),
  ('order_008', 'completed', '2024-06-11 12:00:00')
) AS t(order_id, status, updated_at);

CREATE OR REPLACE TABLE incremental_watermark AS SELECT * FROM (VALUES
  (1, '2024-06-11 17:04:00', '2024-06-11 18:00:00', 'success')
) AS t(run_id, watermark_used, run_at, result);`,

  availableTables: ['orders_current', 'orders_source', 'incremental_watermark'],

  investigationHints: [
    {
      id: 'hint-1',
      label: 'ソース（正）と現在の状態を比較してみよう',
      sql: `SELECT
  s.order_id,
  s.status AS source_status,
  c.status AS current_status,
  s.updated_at
FROM orders_source s
JOIN orders_current c ON s.order_id = c.order_id
WHERE s.status != c.status;`,
    },
    {
      id: 'hint-2',
      label: 'ウォーターマーク（前回実行情報）を確認してみよう',
      sql: `SELECT * FROM incremental_watermark ORDER BY run_id DESC;`,
    },
    {
      id: 'hint-3',
      label: '増分クエリを実際に試してみよう（バグあり）',
      sql: `-- 増分パイプラインが使っているクエリ（ウォーターマーク以降を取得）
SELECT order_id, status, updated_at
FROM orders_source
WHERE updated_at > '2024-06-11 17:04:00';`,
    },
    {
      id: 'hint-4',
      label: '境界値（>=）で試すとどうなるか確認してみよう',
      sql: `-- >= にするとどうなるか
SELECT order_id, status, updated_at
FROM orders_source
WHERE updated_at >= '2024-06-11 17:04:00';`,
    },
  ],

  diagnosisQuestion: '更新データが反映されない根本原因はどれですか？',
  diagnosisOptions: [
    {
      id: 'diag-1',
      label: 'バックエンドが実際には更新していなかった（データの問題）',
      correct: false,
      explanation: 'orders_sourceを確認するとshippedに更新されています。問題はデータではなく、増分処理のロジックにあります。',
    },
    {
      id: 'diag-2',
      label: '増分クエリがWHERE updated_at > watermarkを使っており、watermarkと同じ時刻のレコードが常に除外される',
      correct: true,
      explanation: '正解！増分クエリはupdated_at > \'2024-06-11 17:04:00\'（厳密な>）を使っています。しかし更新された5件の最終更新時刻が全て17:00〜17:04で、ウォーターマークは17:04に設定されています。17:04のレコードが境界条件で除外されています。',
    },
    {
      id: 'diag-3',
      label: 'ウォーターマークが未来の時刻を指しており、全レコードが除外されている',
      correct: false,
      explanation: 'ウォーターマークは2024-06-11 17:04:00で、これは過去の時刻です。問題は時刻ではなく、不等号（> vs >=）にあります。',
    },
    {
      id: 'diag-4',
      label: 'updated_atカラムに索引がなくフルスキャンでタイムアウトしている',
      correct: false,
      explanation: 'タイムアウトならエラーが出て気づきます。今回は「データが返ってくるが変更が反映されていない」という症状なので、ロジックの問題です。',
    },
  ],

  fixQuestion: '増分処理バグへの正しい対処はどれですか？',
  fixOptions: [
    {
      id: 'fix-1',
      label: 'WHERE updated_at > watermark を >= に変更する（正解）',
      sqlPreview: 'WHERE updated_at >= last_watermark',
      correct: true,
      explanation: '正解！境界値を含める>= にすることで、ウォーターマーク時刻のレコードが確実に処理されます。また次回のウォーターマークをMAX(updated_at)ではなく処理開始時刻にすることで重複リスクも管理します。',
      fixSQL: `SELECT order_id, status, updated_at
FROM orders_source
WHERE updated_at >= '2024-06-11 17:04:00'
ORDER BY updated_at;`,
    },
    {
      id: 'fix-2',
      label: 'ウォーターマークを1秒前に設定して余裕を持たせる',
      sqlPreview: "watermark - INTERVAL 1 SECOND",
      correct: false,
      explanation: '1秒の余裕は直感的ですが、次回以降のウォーターマークも1秒ずつずれ続けます。また1秒に満たない差の更新は依然として見逃す可能性があります。根本的には>=への変更が必要です。',
      fixSQL: `SELECT order_id, status, updated_at
FROM orders_source
WHERE updated_at > '2024-06-11 17:03:59'
ORDER BY updated_at;`,
    },
    {
      id: 'fix-3',
      label: '増分処理を廃止して全件フルロードに戻す',
      sqlPreview: 'SELECT * FROM orders_source （全件）',
      correct: false,
      explanation: '小規模なら有効ですが、増分処理はデータ量が増えたときの性能のために必要です。境界条件のバグは修正すべきであり、増分処理自体を廃止するのは過剰対応です。',
      fixSQL: `SELECT COUNT(*), MAX(updated_at) FROM orders_source;`,
    },
    {
      id: 'fix-4',
      label: 'ウォーターマークをrun_at（実行時刻）ではなくMAX(updated_at)に変更する',
      sqlPreview: 'new_watermark = MAX(updated_at) from processed batch',
      correct: false,
      explanation: 'MAX(updated_at)をウォーターマークにすることは一般的ですが、>= との組み合わせがないと今回と同じ境界問題が起きます。また、処理時間中に更新されたレコードを見逃すリスクもあります。',
      fixSQL: `SELECT MAX(updated_at) AS new_watermark FROM orders_source WHERE updated_at >= '2024-06-11 17:04:00';`,
    },
  ],

  verificationSQL: `SELECT
  s.order_id,
  s.status AS correct_status,
  s.updated_at
FROM orders_source s
WHERE s.updated_at >= '2024-06-11 17:04:00'
ORDER BY s.updated_at;`,

  verificationExpectedDescription: '5件のshipped注文が取得される（order_001〜005）',

  lesson: {
    title: '増分処理のウォーターマークは境界条件に注意する',
    body: `**増分処理（Incremental Load）** は前回処理済みのデータをスキップし、新しいデータだけを処理するパターンです。

**よくある境界条件バグ：**

\`\`\`sql
-- ❌ 危険：境界値を除外する（>）
WHERE updated_at > '2024-06-11 17:04:00'
-- 17:04:00 ちょうどのレコードが永遠にスキップされる

-- ✅ 安全：境界値を含める（>=）
WHERE updated_at >= '2024-06-11 17:04:00'
\`\`\`

**ウォーターマーク設計の注意点：**
1. 次回のウォーターマークを何にするか（MAX(updated_at) vs 処理開始時刻）
2. 処理中に更新されたレコードはどうなるか（Late Arriving Data）
3. パイプラインが途中で失敗した場合、どこから再開するか

**dbt incremental models** ではこの境界条件を \`is_incremental()\` マクロで管理します。`,
    prevention: [
      'WHERE updated_at > ... を使う場合は境界条件を必ずテストする',
      'ウォーターマークは処理開始時刻を使い、終了後にコミットするパターンを検討する',
      'Airflow/Prefect でジョブのメタデータ（開始・終了・処理件数）を記録し、0件の場合にアラートを出す',
      'dbt incremental モデルを使い、フレームワーク側に境界条件の管理を委ねる',
    ],
    realWorldExample: '物流システムで出荷ステータスの増分同期に > を使っていたため、毎日23:59:59に更新されたレコードが翌日のウォーターマーク（23:59:59）を超えず、毎日深夜の更新が翌々日まで反映されなかった事例があります。',
  },
};
