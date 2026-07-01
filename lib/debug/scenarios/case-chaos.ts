import type { DebugScenario } from '@/types';

export const caseChaosScenario: DebugScenario = {
  id: 'case-chaos',
  title: '完了注文の半分が突然消えた',
  subtitle: '表記揺れ・文字列正規化',
  category: 'data_quality',
  difficulty: 'beginner',
  xpReward: 120,

  alert: {
    from: '木村マネージャー',
    role: 'プロダクトマネージャー',
    message: '今週から注文完了率が急落しています！先週まで89%だったのに今週は47%になっている。バックエンドチームはデータに問題ないと言っているのに、ダッシュボードには完了済み注文が半分しか表示されていません。急いで調べてください！',
    metric: '注文完了率（completed / total）',
    expectedValue: '89%（9 / 10件）',
    actualValue: '40%（4 / 10件）',
    timestamp: '2024-03-07 11:22:55',
  },

  setupSQL: `CREATE OR REPLACE TABLE raw_orders AS SELECT * FROM (VALUES
  (1,  'order_001', 'completed',  28000.0, '2024-03-07'),
  (2,  'order_002', 'Completed',  15000.0, '2024-03-07'),
  (3,  'order_003', 'completed',  42000.0, '2024-03-07'),
  (4,  'order_004', 'COMPLETED',  19000.0, '2024-03-07'),
  (5,  'order_005', 'completed',  33000.0, '2024-03-07'),
  (6,  'order_006', 'COMPLETED',  11000.0, '2024-03-07'),
  (7,  'order_007', 'Completed',  27000.0, '2024-03-07'),
  (8,  'order_008', 'completed',  8000.0,  '2024-03-07'),
  (9,  'order_009', 'Completed',  51000.0, '2024-03-07'),
  (10, 'order_010', 'pending',    22000.0, '2024-03-07')
) AS t(id, order_id, status, amount, order_date);

CREATE OR REPLACE TABLE dashboard_query_log AS SELECT * FROM (VALUES
  ('2024-03-01 00:00:00', 'WHERE status = ''completed''', 89),
  ('2024-03-07 00:00:00', 'WHERE status = ''completed''', 40)
) AS t(run_at, filter_used, completion_pct);`,

  availableTables: ['raw_orders', 'dashboard_query_log'],

  investigationHints: [
    {
      id: 'hint-1',
      label: 'statusの値を一覧で確認してみよう',
      sql: `SELECT DISTINCT status FROM raw_orders ORDER BY status;`,
    },
    {
      id: 'hint-2',
      label: 'statusの分布を集計してみよう',
      sql: `SELECT status, COUNT(*) AS cnt, SUM(amount) AS total
FROM raw_orders
GROUP BY status
ORDER BY cnt DESC;`,
    },
    {
      id: 'hint-3',
      label: 'ダッシュボードの元クエリを試してみよう',
      sql: `-- ダッシュボードがやっている集計（バグあり）
SELECT
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*), 1) AS completion_pct
FROM raw_orders;`,
    },
    {
      id: 'hint-4',
      label: 'LOWER()で正規化するとどうなるか確認してみよう',
      sql: `SELECT
  COUNT(*) FILTER (WHERE LOWER(status) = 'completed') AS completed_normalized,
  COUNT(*) AS total,
  ROUND(COUNT(*) FILTER (WHERE LOWER(status) = 'completed') * 100.0 / COUNT(*), 1) AS correct_pct
FROM raw_orders;`,
    },
  ],

  diagnosisQuestion: '完了率が89%から40%に急落した原因はどれですか？',
  diagnosisOptions: [
    {
      id: 'diag-1',
      label: '本当に注文数が減り、バックエンドのデータが正しい',
      correct: false,
      explanation: 'データを見るとstatusカラムに"completed"、"Completed"、"COMPLETED"が混在しています。バックエンドの問題ではなくデータ品質の問題です。',
    },
    {
      id: 'diag-2',
      label: '上流システムの更新でstatusの大文字/小文字が混在し始め、ダッシュボードの完全一致フィルターが一部を捕捉できていない',
      correct: true,
      explanation: '正解！バックエンドのシステム更新で"completed"の代わりに"Completed"や"COMPLETED"が混入しています。ダッシュボードクエリがstatus = "completed"の完全一致を使っているため、大文字混じりの行がカウントされません。',
    },
    {
      id: 'diag-3',
      label: 'ダッシュボードのSQLに構文エラーが入り込んだ',
      correct: false,
      explanation: '構文エラーならダッシュボード自体がクラッシュするはずです。部分的にデータが見えている時点で構文エラーではありません。',
    },
    {
      id: 'diag-4',
      label: 'タイムゾーン設定が変わり、今日分のデータが集計に含まれていない',
      correct: false,
      explanation: 'タイムゾーン問題なら日付ごとの件数が変わるはずです。statusの分布を見ると問題は文字列の大文字小文字にあります。',
    },
  ],

  fixQuestion: 'このケースへの正しい対処はどれですか？',
  fixOptions: [
    {
      id: 'fix-1',
      label: '"Completed"と"COMPLETED"をすべて"completed"にUPDATEして修正する',
      sqlPreview: 'UPDATE raw_orders SET status = LOWER(status)',
      correct: false,
      explanation: '今のデータは直りますが、これは対症療法です。上流が今後も混在を送り続けるなら、毎回UPDATEが必要になります。ステージングレイヤーで正規化するのが正しいアーキテクチャです。',
      fixSQL: `UPDATE raw_orders SET status = LOWER(status);
SELECT status, COUNT(*) FROM raw_orders GROUP BY status;`,
    },
    {
      id: 'fix-2',
      label: 'ステージングレイヤーでLOWER()正規化を組み込む（正解）',
      sqlPreview: 'LOWER(status) AS status_normalized',
      correct: true,
      explanation: '正解！ステージングレイヤーの変換でLOWER(status)を適用することで、上流がどんな大文字小文字を送っても正規化されます。これはデータエンジニアリングの基本パターン「Clean at ingest」です。',
      fixSQL: `CREATE OR REPLACE TABLE stg_orders AS
SELECT
  id,
  order_id,
  LOWER(status) AS status,
  amount,
  order_date
FROM raw_orders;

SELECT
  status,
  COUNT(*) AS cnt,
  ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / COUNT(*), 1) AS completion_pct
FROM stg_orders
GROUP BY status;`,
    },
    {
      id: 'fix-3',
      label: 'ダッシュボードのフィルターをORで増やす',
      sqlPreview: "WHERE status IN ('completed', 'Completed', 'COMPLETED')",
      correct: false,
      explanation: '今は動きますが、将来"Complete"や"done"など別の表記が来ると壊れます。ソースデータを正規化するのが根本対策です。',
      fixSQL: `SELECT COUNT(*) AS completed_count
FROM raw_orders
WHERE status IN ('completed', 'Completed', 'COMPLETED');`,
    },
    {
      id: 'fix-4',
      label: 'バックエンドチームに大文字小文字を統一するよう依頼して待つ',
      sqlPreview: '-- バックエンドに修正依頼',
      correct: false,
      explanation: '長期的には良い施策ですが、今すぐデータを使う立場では自分たちでハンドリングする必要があります。また、ソースシステムに依存しすぎるデータパイプラインは脆弱です。',
      fixSQL: `-- バックエンドの修正を待つ間、ダッシュボードが壊れたままになります`,
    },
  ],

  verificationSQL: `SELECT
  status,
  COUNT(*) AS cnt
FROM stg_orders
GROUP BY status
ORDER BY cnt DESC;`,

  verificationExpectedDescription: 'status = "completed" が9件、"pending" が1件',

  lesson: {
    title: '文字列は取り込み時点で正規化する',
    body: `**「Clean at ingest」** はデータエンジニアリングの鉄則です。

上流システムが送るデータの表記は一貫していると仮定してはいけません。特に複数チームが開発するマイクロサービス環境では、小さなシステム更新が文字列フォーマットを変えることがよくあります。

**ステージングレイヤーの役割：**
- \`LOWER()\` / \`UPPER()\` / \`TRIM()\` で文字列を正規化
- \`COALESCE()\` でNULLをデフォルト値に変換
- \`TRY_CAST()\` で型変換の失敗を安全にハンドリング

ステージングレイヤーを通過した後のデータは、常に一貫したフォーマットであるべきです。`,
    prevention: [
      'ステージングSQLで LOWER(status) AS status を標準化する',
      'dbt の accepted_values テストで許可される値を定義する（例: ["completed", "pending", "cancelled"]）',
      '上流APIのOpenAPI specや型定義にenumを追加するよう依頼する',
      'カラムのユニーク値数が急増したときにアラートを送る（表記揺れの早期検知）',
    ],
    realWorldExample: 'SaaS企業でサブスクリプションのplanカラムが"pro"、"Pro"、"PRO"と3種類混在し、有料ユーザー数が実際の1/3しかカウントされなかった事例があります。気づくまでに3週間かかり、ARRの報告が大幅に狂いました。',
  },
};
