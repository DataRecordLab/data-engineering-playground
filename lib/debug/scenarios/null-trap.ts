import type { DebugScenario } from '@/types';

export const nullTrapScenario: DebugScenario = {
  id: 'null-trap',
  title: '売上が突然40%消えた',
  subtitle: 'NULL・静かに壊れる集計',
  category: 'data_quality',
  difficulty: 'beginner',
  xpReward: 120,

  alert: {
    from: '田中部長',
    role: '営業部長',
    message: '緊急！今月の売上集計が先月より40%以上少なく出ています。新しい決済システムを導入してから数字がおかしい。マーケティング予算の会議が明日あるので今日中に原因を特定してください。',
    metric: '今月の売上合計（1月）',
    expectedValue: '¥400,000',
    actualValue: '¥236,000',
    timestamp: '2024-01-31 09:14:22',
  },

  setupSQL: `CREATE OR REPLACE TABLE raw_orders AS SELECT * FROM (VALUES
  (1,  'order_001', '2024-01-03', 'stripe',  18000.0,  'completed'),
  (2,  'order_002', '2024-01-04', 'legacy',  25000.0,  'completed'),
  (3,  'order_003', '2024-01-05', 'stripe',  NULL,     'completed'),
  (4,  'order_004', '2024-01-06', 'legacy',  12500.0,  'completed'),
  (5,  'order_005', '2024-01-07', 'stripe',  NULL,     'completed'),
  (6,  'order_006', '2024-01-08', 'legacy',  32000.0,  'completed'),
  (7,  'order_007', '2024-01-09', 'stripe',  NULL,     'completed'),
  (8,  'order_008', '2024-01-10', 'legacy',  15500.0,  'completed'),
  (9,  'order_009', '2024-01-11', 'stripe',  NULL,     'completed'),
  (10, 'order_010', '2024-01-12', 'legacy',  28000.0,  'completed'),
  (11, 'order_011', '2024-01-13', 'stripe',  NULL,     'completed'),
  (12, 'order_012', '2024-01-14', 'legacy',  19000.0,  'completed'),
  (13, 'order_013', '2024-01-15', 'stripe',  NULL,     'completed'),
  (14, 'order_014', '2024-01-16', 'legacy',  11000.0,  'completed'),
  (15, 'order_015', '2024-01-17', 'stripe',  NULL,     'completed'),
  (16, 'order_016', '2024-01-18', 'legacy',  42000.0,  'completed'),
  (17, 'order_017', '2024-01-19', 'stripe',  NULL,     'completed'),
  (18, 'order_018', '2024-01-20', 'legacy',  23000.0,  'completed'),
  (19, 'order_019', '2024-01-21', 'stripe',  NULL,     'completed'),
  (20, 'order_020', '2024-01-22', 'legacy',  9000.0,   'completed')
) AS t(id, order_id, order_date, payment_source, amount, status);

CREATE OR REPLACE TABLE stripe_charges AS SELECT * FROM (VALUES
  ('order_003', 21000.0),
  ('order_005', 14000.0),
  ('order_007', 18500.0),
  ('order_009', 32000.0),
  ('order_011', 17000.0),
  ('order_013', 9000.0),
  ('order_015', 11000.0),
  ('order_017', 28500.0),
  ('order_019', 13000.0)
) AS t(order_id, charge_amount);`,

  availableTables: ['raw_orders', 'stripe_charges'],

  investigationHints: [
    {
      id: 'hint-1',
      label: '決済ソース別に集計してみよう',
      sql: `SELECT payment_source, COUNT(*) AS cnt, SUM(amount) AS total
FROM raw_orders
GROUP BY payment_source;`,
    },
    {
      id: 'hint-2',
      label: 'NULLがある行を確認してみよう',
      sql: `SELECT order_id, payment_source, amount
FROM raw_orders
WHERE amount IS NULL;`,
    },
    {
      id: 'hint-3',
      label: 'stripe_chargesテーブルも確認してみよう',
      sql: `SELECT * FROM stripe_charges LIMIT 10;`,
    },
    {
      id: 'hint-4',
      label: 'NULLの数を数えてみよう',
      sql: `SELECT
  COUNT(*) AS total_orders,
  COUNT(amount) AS orders_with_amount,
  COUNT(*) - COUNT(amount) AS null_amount_orders,
  SUM(amount) AS current_sum
FROM raw_orders;`,
    },
  ],

  diagnosisQuestion: '売上が¥164,000少ない原因はどれですか？',
  diagnosisOptions: [
    {
      id: 'diag-1',
      label: 'データベースのストレージ不足でデータが削除された',
      correct: false,
      explanation: '違います。ストレージ不足ではデータ削除でなく書き込みエラーが起きます。',
    },
    {
      id: 'diag-2',
      label: 'Stripe連携のETLがamountカラムをNULLのままロードしており、SUMが静かにその行を除外している',
      correct: true,
      explanation: '正解！SQLのSUMはNULLを0ではなく「存在しない値」として扱うため、NULL行を集計から除外します。Stripe連携で9件（¥164,000分）のamountがNULLのままになっていました。',
    },
    {
      id: 'diag-3',
      label: 'order_dateのフィルターが間違っていて一部の日付が除外されている',
      correct: false,
      explanation: '違います。日付フィルターの問題なら特定の日付範囲が完全に消えるはずです。',
    },
    {
      id: 'diag-4',
      label: '通貨の単位変換ミスで円ではなくドルで集計されている',
      correct: false,
      explanation: '違います。通貨変換ミスなら全件に影響し、Stripe分だけ問題になりません。',
    },
  ],

  fixQuestion: '正しい修正アプローチはどれですか？',
  fixOptions: [
    {
      id: 'fix-1',
      label: 'NULLを0に置き換えてSUM（実際は¥0ではないので間違い）',
      sqlPreview: 'SUM(COALESCE(amount, 0))',
      correct: false,
      explanation: 'COALESCE(amount, 0)はNULLを¥0に変換しますが、実際の金額は0ではありません。損失計上になってしまいます。',
      fixSQL: `SELECT SUM(COALESCE(r.amount, 0)) AS total FROM raw_orders r;`,
    },
    {
      id: 'fix-2',
      label: 'stripe_chargesとJOINして実際の金額を補完する（正解）',
      sqlPreview: 'COALESCE(r.amount, s.charge_amount)',
      correct: true,
      explanation: '正解！stripe_chargesテーブルに実際の金額が存在するので、JOINして補完します。これがETL修正の正しいアプローチです。',
      fixSQL: `SELECT
  SUM(COALESCE(r.amount, s.charge_amount)) AS corrected_total,
  COUNT(*) AS total_orders
FROM raw_orders r
LEFT JOIN stripe_charges s ON r.order_id = s.order_id;`,
    },
    {
      id: 'fix-3',
      label: 'NULLのある行を除外してSUM',
      sqlPreview: 'WHERE amount IS NOT NULL',
      correct: false,
      explanation: 'NULL行を除外すれば正直ですが、9件の売上が集計から消えます。報告としては不完全です。',
      fixSQL: `SELECT SUM(amount) AS total FROM raw_orders WHERE amount IS NOT NULL;`,
    },
    {
      id: 'fix-4',
      label: 'NULLのある行を削除してから集計',
      sqlPreview: 'DELETE FROM raw_orders WHERE amount IS NULL',
      correct: false,
      explanation: 'データを削除するのは最悪の対処です。監査証跡が失われ、後で復元できません。',
      fixSQL: `DELETE FROM raw_orders WHERE amount IS NULL;
SELECT SUM(amount) AS total FROM raw_orders;`,
    },
  ],

  verificationSQL: `SELECT
  SUM(COALESCE(r.amount, s.charge_amount)) AS corrected_total,
  COUNT(*) AS total_orders,
  COUNT(r.amount) AS orders_with_amount,
  COUNT(s.charge_amount) AS stripe_backfilled
FROM raw_orders r
LEFT JOIN stripe_charges s ON r.order_id = s.order_id;`,

  verificationExpectedDescription: 'corrected_total = 400000、total_orders = 20、stripe_backfilled = 9',

  lesson: {
    title: 'SQLのSUMはNULLを静かに無視する',
    body: `SQLの\`SUM()\`、\`AVG()\`、\`COUNT(column)\`は全て **NULLを無視** します。

これは仕様通りの動作ですが、エラーが出ないため気づきにくい。

今回のケースでは、新しい決済プロバイダーのETLが\`amount\`カラムをNULLのままロードしており、集計クエリが静かに9件分の売上を除外していました。

**COUNT(*) vs COUNT(column) の違い**も重要です：
- \`COUNT(*)\` → NULL含む全行数
- \`COUNT(amount)\` → amountがNULLでない行数のみ`,
    prevention: [
      'ETLロード直後にNULL率を監視するdbt testを追加する（not_null テスト）',
      'Data Contractでamountカラムをnot_nullと定義する',
      '新しいデータソース追加時はNULL率チェックをCI/CDに組み込む',
      'dashboardの前段でNULLアラートを設定する（例：NULL率 > 1%で通知）',
    ],
    realWorldExample: '2021年、某EC企業でマイクロサービス移行後に決済サービスのレスポンス仕様が変わり、amount_centsがnullで返るようになった。月次売上が実際の65%しか集計されず、財務報告のやり直しが発生した事例があります。',
  },
};
