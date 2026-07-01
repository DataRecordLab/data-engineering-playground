import type { DebugScenario } from '@/types';

export const duplicateExplosionScenario: DebugScenario = {
  id: 'duplicate-explosion',
  title: '再実行したら売上が2倍になった',
  subtitle: '冪等性の欠如・重複データ',
  category: 'pipeline_design',
  difficulty: 'beginner',
  xpReward: 150,

  alert: {
    from: '佐藤リーダー',
    role: 'データチームリーダー',
    message: '大変です！深夜のcronジョブが失敗したので手動で再実行したら、朝のダッシュボードで売上が昨日の2倍になっています。CFOから今すぐ説明しろと連絡が来ています。なぜこうなったのか調査してください！',
    metric: '今日の売上合計',
    expectedValue: '¥315,000',
    actualValue: '¥630,000',
    timestamp: '2024-02-15 08:47:03',
  },

  setupSQL: `CREATE OR REPLACE TABLE stg_orders AS SELECT * FROM (VALUES
  (1,  'order_001', '2024-02-14', 45000.0, 'completed'),
  (2,  'order_002', '2024-02-14', 22000.0, 'completed'),
  (3,  'order_003', '2024-02-14', 38000.0, 'completed'),
  (4,  'order_004', '2024-02-14', 15000.0, 'completed'),
  (5,  'order_005', '2024-02-14', 52000.0, 'completed'),
  (6,  'order_006', '2024-02-14', 28000.0, 'completed'),
  (7,  'order_007', '2024-02-14', 19000.0, 'completed'),
  (8,  'order_008', '2024-02-14', 33000.0, 'completed'),
  (9,  'order_009', '2024-02-14', 41000.0, 'completed'),
  (10, 'order_010', '2024-02-14', 22000.0, 'completed'),
  (11, 'order_001', '2024-02-14', 45000.0, 'completed'),
  (12, 'order_002', '2024-02-14', 22000.0, 'completed'),
  (13, 'order_003', '2024-02-14', 38000.0, 'completed'),
  (14, 'order_004', '2024-02-14', 15000.0, 'completed'),
  (15, 'order_005', '2024-02-14', 52000.0, 'completed'),
  (16, 'order_006', '2024-02-14', 28000.0, 'completed'),
  (17, 'order_007', '2024-02-14', 19000.0, 'completed'),
  (18, 'order_008', '2024-02-14', 33000.0, 'completed'),
  (19, 'order_009', '2024-02-14', 41000.0, 'completed'),
  (20, 'order_010', '2024-02-14', 22000.0, 'completed')
) AS t(id, order_id, order_date, amount, status);

CREATE OR REPLACE TABLE pipeline_run_log AS SELECT * FROM (VALUES
  (1, '2024-02-14 23:00:01', 'completed', 10),
  (2, '2024-02-15 07:32:18', 'completed', 10)
) AS t(run_id, started_at, status, rows_inserted);`,

  availableTables: ['stg_orders', 'pipeline_run_log'],

  investigationHints: [
    {
      id: 'hint-1',
      label: '合計行数を確認してみよう',
      sql: `SELECT COUNT(*) AS total_rows, SUM(amount) AS total_amount
FROM stg_orders;`,
    },
    {
      id: 'hint-2',
      label: 'order_idが重複していないか確認してみよう',
      sql: `SELECT order_id, COUNT(*) AS count
FROM stg_orders
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY count DESC;`,
    },
    {
      id: 'hint-3',
      label: 'パイプラインの実行履歴を確認してみよう',
      sql: `SELECT * FROM pipeline_run_log ORDER BY started_at;`,
    },
    {
      id: 'hint-4',
      label: '重複を除外した場合の正しい集計を確認してみよう',
      sql: `SELECT
  COUNT(DISTINCT order_id) AS unique_orders,
  (SELECT SUM(amount) FROM (SELECT DISTINCT order_id, amount FROM stg_orders)) AS correct_total
FROM stg_orders;`,
    },
  ],

  diagnosisQuestion: '売上が2倍になった根本原因はどれですか？',
  diagnosisOptions: [
    {
      id: 'diag-1',
      label: 'ダッシュボードの集計クエリにバグがあり2倍にしている',
      correct: false,
      explanation: '違います。ダッシュボードが正しくSUMしているなら、データ自体が2倍になっているはずです。',
    },
    {
      id: 'diag-2',
      label: 'パイプラインが冪等でなく、再実行するたびにINSERTが追記されてしまう',
      correct: true,
      explanation: '正解！パイプラインがINSERT INTO ... SELECTを使っており、実行するたびにデータが追記されます。「同じ結果になること（冪等性）」が保証されていないため、再実行で2重登録が起きました。',
    },
    {
      id: 'diag-3',
      label: '昨日のデータが今日のパーティションに誤って書き込まれた',
      correct: false,
      explanation: '違います。日付は2024-02-14で統一されており、パーティションの問題ではありません。',
    },
    {
      id: 'diag-4',
      label: 'ソースシステムが同じ注文を2回送信している',
      correct: false,
      explanation: 'ソースが2回送信していても、同じorder_idなので上流での重複を疑います。しかしpipeline_run_logを見ると2回実行されています。',
    },
  ],

  fixQuestion: '正しい修正はどれですか？（短期修正 + 根本対策）',
  fixOptions: [
    {
      id: 'fix-1',
      label: '重複行を今すぐDELETEして件数を戻す',
      sqlPreview: 'DELETE FROM stg_orders WHERE id > 10',
      correct: false,
      explanation: '今回は動きますが、次回の再実行でまた同じ問題が起きます。根本原因（冪等性の欠如）が解決されていません。',
      fixSQL: `DELETE FROM stg_orders WHERE id > 10;
SELECT COUNT(*), SUM(amount) FROM stg_orders;`,
    },
    {
      id: 'fix-2',
      label: 'CREATE OR REPLACE TABLE を使って冪等な上書きに変える（正解）',
      sqlPreview: 'CREATE OR REPLACE TABLE stg_orders AS SELECT DISTINCT ...',
      correct: true,
      explanation: '正解！CREATE OR REPLACE TABLEは毎回テーブルを作り直すため、何度実行しても同じ結果になります。これが冪等性（Idempotency）です。dbtのmodelsはデフォルトでこの動作をします。',
      fixSQL: `CREATE OR REPLACE TABLE stg_orders AS
SELECT DISTINCT order_id, order_date, amount, status
FROM stg_orders
ORDER BY order_id;

SELECT COUNT(*) AS rows, SUM(amount) AS total FROM stg_orders;`,
    },
    {
      id: 'fix-3',
      label: 'cronジョブを削除して手動実行のみにする',
      sqlPreview: '-- cronを止める',
      correct: false,
      explanation: '自動化を止めるのは逆効果です。問題は自動化ではなく、パイプラインの実装方法にあります。',
      fixSQL: `-- これは解決策ではありません`,
    },
    {
      id: 'fix-4',
      label: 'UNIQUE制約を追加してINSERT時にエラーにする',
      sqlPreview: 'ALTER TABLE stg_orders ADD UNIQUE(order_id)',
      correct: false,
      explanation: 'UNIQUE制約はデータ重複を防ぎますが、エラーでパイプラインが止まるだけです。より良いのはUPSERT（INSERT OR REPLACE）か、CREATE OR REPLACEで再構築することです。',
      fixSQL: `ALTER TABLE stg_orders ADD UNIQUE(order_id);`,
    },
  ],

  verificationSQL: `SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT order_id) AS unique_orders,
  SUM(amount) AS total_amount
FROM stg_orders;`,

  verificationExpectedDescription: 'total_rows = 10、unique_orders = 10、total_amount = 315000',

  lesson: {
    title: 'パイプラインは冪等でなければならない',
    body: `**冪等性（Idempotency）** とは「何度実行しても同じ結果になる」という性質です。

データパイプラインでは、障害時の再実行・手動再実行・スケジュールの重複起動が日常的に起きます。

**やってはいけないパターン：**
\`\`\`sql
-- INSERTは追記される → 再実行で重複
INSERT INTO stg_orders SELECT * FROM raw_orders;
\`\`\`

**正しいパターン：**
\`\`\`sql
-- 毎回作り直す → 冪等
CREATE OR REPLACE TABLE stg_orders AS SELECT * FROM raw_orders;
\`\`\`

dbtはデフォルトで\`CREATE OR REPLACE\`を使うため、この問題を自動的に回避します。`,
    prevention: [
      'INSERT INTO ではなく CREATE OR REPLACE TABLE / INSERT OVERWRITE を使う',
      'dbt などのフレームワークを使い、冪等性を標準化する',
      '実行前に対象テーブルのTRUNCATEを行い、その後INSERTする',
      'pipeline_run_logに実行IDを記録し、同一日時の二重実行を検知する',
    ],
    realWorldExample: 'Airflowのタスクがタイムアウトして再実行された際、冪等でないDWHへのINSERTが二重実行し、財務KPIが2倍に膨らんだまま週次レポートが送信されてしまった事例があります。dbt移行後はこのクラスの問題が消えました。',
  },
};
