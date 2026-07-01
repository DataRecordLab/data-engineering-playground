import type { DebugScenario } from '@/types';

export const schemaDriftScenario: DebugScenario = {
  id: 'schema-drift',
  title: 'パイプラインが突然エラーを出した',
  subtitle: 'スキーマドリフト・カラム消失',
  category: 'schema_drift',
  difficulty: 'intermediate',
  xpReward: 180,

  alert: {
    from: 'Airflow アラート',
    role: 'DAG: ec_site_daily_pipeline',
    message: '[CRITICAL] DAG ec_site_daily_pipeline が失敗しました。Task: stg_orders >> ERROR: column "amount" does not exist\nLine 3: SELECT order_id, amount, status FROM new_orders\n昨日まで正常に動いていたのに今朝から全タスクが落ちています。上流チームが昨夜デプロイを実施しています。調査してください。',
    metric: 'パイプラインの稼働状態',
    expectedValue: 'SUCCESS（毎朝6:00 JST）',
    actualValue: 'FAILED（column "amount" does not exist）',
    timestamp: '2024-04-08 06:03:41',
  },

  setupSQL: `CREATE OR REPLACE TABLE new_orders AS SELECT * FROM (VALUES
  (1,  'order_001', '2024-04-08', 28000.0,  'completed',  'customer_A'),
  (2,  'order_002', '2024-04-08', 15000.0,  'completed',  'customer_B'),
  (3,  'order_003', '2024-04-08', 42000.0,  'pending',    'customer_C'),
  (4,  'order_004', '2024-04-08', 19000.0,  'completed',  'customer_D'),
  (5,  'order_005', '2024-04-08', 33000.0,  'completed',  'customer_E')
) AS t(id, order_id, order_date, total_amount, status, customer_id);

CREATE OR REPLACE TABLE old_pipeline_sql AS SELECT * FROM (VALUES
  ('stg_orders', 'SELECT order_id, amount, status FROM new_orders', 'broken'),
  ('stg_customers', 'SELECT customer_id, name FROM customers', 'ok')
) AS t(step, sql_used, health);

CREATE OR REPLACE TABLE schema_change_log AS SELECT * FROM (VALUES
  ('2024-04-07 23:15:00', 'backend-team', 'new_orders', 'RENAME COLUMN amount TO total_amount', '請求書発行システムとの統一のため'),
  ('2024-04-07 23:15:00', 'backend-team', 'new_orders', 'ADD COLUMN tax_amount DECIMAL', '消費税を明示的に管理するため')
) AS t(changed_at, team, table_name, change_description, reason);`,

  availableTables: ['new_orders', 'old_pipeline_sql', 'schema_change_log'],

  investigationHints: [
    {
      id: 'hint-1',
      label: 'new_ordersのカラム一覧を確認してみよう',
      sql: `DESCRIBE new_orders;`,
    },
    {
      id: 'hint-2',
      label: 'スキーマ変更ログを確認してみよう',
      sql: `SELECT * FROM schema_change_log ORDER BY changed_at;`,
    },
    {
      id: 'hint-3',
      label: 'new_ordersのデータを実際に見てみよう',
      sql: `SELECT * FROM new_orders LIMIT 5;`,
    },
    {
      id: 'hint-4',
      label: '既存のパイプラインSQLが動くか確認してみよう',
      sql: `-- これがエラーになる（amount列が存在しない）
SELECT order_id, amount, status FROM new_orders LIMIT 3;`,
    },
  ],

  diagnosisQuestion: 'パイプラインがエラーになった根本原因はどれですか？',
  diagnosisOptions: [
    {
      id: 'diag-1',
      label: 'データベースのディスクが満杯になりテーブルが壊れた',
      correct: false,
      explanation: 'ディスク満杯なら書き込みエラーが出ます。「column does not exist」エラーはスキーマの変更を示しています。',
    },
    {
      id: 'diag-2',
      label: '上流チームが amount カラムを total_amount にリネームし、パイプラインが古いカラム名を参照している（スキーマドリフト）',
      correct: true,
      explanation: '正解！上流チームのデプロイでamountがtotal_amountにリネームされました。パイプラインSQLは古いカラム名amountを参照しているため失敗します。これを「スキーマドリフト（Schema Drift）」と呼びます。',
    },
    {
      id: 'diag-3',
      label: 'Airflowのバージョンアップによりタスクの実行環境が変わった',
      correct: false,
      explanation: 'Airflowのバージョンアップは実行環境に影響しますが、「column does not exist」はSQLの問題であり、スキーマ変更が原因です。',
    },
    {
      id: 'diag-4',
      label: 'ネットワーク障害でDWHへの接続が切断された',
      correct: false,
      explanation: 'ネットワーク障害なら接続エラーになります。column not foundはテーブルには接続できているが列名が違うことを示します。',
    },
  ],

  fixQuestion: 'スキーマドリフトへの正しい対処はどれですか？',
  fixOptions: [
    {
      id: 'fix-1',
      label: 'パイプラインSQLのamountをtotal_amountに書き換える（応急処置）',
      sqlPreview: 'SELECT order_id, total_amount AS amount',
      correct: false,
      explanation: '今すぐ動くようになりますが、これは応急処置です。根本対策（スキーマ変更の事前通知・コントラクト管理）を合わせて実施しないと同じ問題が繰り返されます。',
      fixSQL: `SELECT order_id, total_amount AS amount, status
FROM new_orders
LIMIT 5;`,
    },
    {
      id: 'fix-2',
      label: 'パイプラインSQLを修正しつつ、スキーマ変更を検知する監視を入れる（正解）',
      sqlPreview: 'total_amount AS amount + スキーマ監視',
      correct: true,
      explanation: '正解！①パイプラインSQLをtotal_amount AS amountに修正して今すぐ復旧します。②スキーマ変更を検知する仕組みを入れて再発防止します。③上流チームとData Contractを締結し、破壊的変更は事前通知するルールを作ります。',
      fixSQL: `CREATE OR REPLACE TABLE stg_orders AS
SELECT
  order_id,
  total_amount AS amount,
  status,
  customer_id,
  order_date
FROM new_orders;

SELECT * FROM stg_orders LIMIT 5;`,
    },
    {
      id: 'fix-3',
      label: '上流チームにリネームを元に戻すよう依頼する',
      sqlPreview: '-- 上流にROLLBACKを依頼',
      correct: false,
      explanation: '上流チームには正当な理由があってリネームしています。自分たちのパイプラインを直す方が正しい対応です。「下流が壊れるから変えるな」という依存関係は長期的に持続不可能です。',
      fixSQL: `-- 上流チームへの依頼は手間がかかり、根本解決になりません`,
    },
    {
      id: 'fix-4',
      label: 'SELECT * を使えばカラム名に依存しなくなる',
      sqlPreview: 'SELECT * FROM new_orders',
      correct: false,
      explanation: 'SELECT *はカラム名の変更には強くなりますが、カラムの追加・削除・順序変更で下流の処理が壊れます。明示的なカラム指定の方が壊れたときの原因特定が容易です。',
      fixSQL: `SELECT * FROM new_orders LIMIT 5;`,
    },
  ],

  verificationSQL: `SELECT
  order_id,
  total_amount AS amount,
  status
FROM new_orders
ORDER BY order_id;`,

  verificationExpectedDescription: 'total_amountをamountとして取得できる（5行、エラーなし）',

  lesson: {
    title: 'スキーマドリフトはデータパイプラインの天敵',
    body: `**スキーマドリフト** とは、上流データソースのスキーマ（テーブル定義）が下流の同意なく変更されることです。

今回のように\`amount → total_amount\`のリネームは上流にとって「内部リファクタリング」ですが、下流パイプラインには破壊的変更です。

**スキーマドリフトが起きやすい状況：**
- マイクロサービスアーキテクチャでAPIのレスポンス形式が変わる
- サードパーティSaaSのAPI仕様変更
- チーム間の連携不足

**Data Contract（データ契約）** という概念が注目されています。上流と下流がスキーマについて明示的に合意し、破壊的変更は事前通知・調整するルールです。`,
    prevention: [
      'dbt source tests で期待するカラムの存在を検証する（column_not_null + accepted_values）',
      'Great Expectations / Soda でスキーマ変更を自動検知して通知する',
      '上流チームとData Contractを締結し、破壊的変更は最低1週間前に通知するルールを作る',
      'CI/CDでスキーマのdiffを自動検出し、下流への影響をリストアップする',
    ],
    realWorldExample: '某フィンテック企業で決済プロバイダーがAPIレスポンスのfeeフィールドをprocessing_feeにリネームし、手数料計算が0になって3日間気づかなかった事例があります。日次の損益計算が3日分ずれ、修正に1週間かかりました。',
  },
};
