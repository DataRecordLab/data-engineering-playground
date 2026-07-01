import type { DebugScenario } from '@/types';

export const fanoutExplosionScenario: DebugScenario = {
  id: 'fanout-explosion',
  title: '顧客ごとの売上が3倍に膨張した',
  subtitle: 'ファンアウト・JOIN行数爆発',
  category: 'pipeline_design',
  difficulty: 'intermediate',
  xpReward: 190,

  alert: {
    from: '中村データサイエンティスト',
    role: 'データサイエンスチーム',
    message: '新しいユーザーセグメント分析のためにsegmentsテーブルをJOINしたWARTモデルを作ったのですが、顧客ごとの売上合計が明らかにおかしいです。全体のSUMは¥200,000のはずなのに、顧客別に集計すると合計が¥600,000になっています。JOINのどこかがバグっていると思います。',
    metric: '顧客別売上合計のSUM',
    expectedValue: '¥200,000（全体）',
    actualValue: '¥600,000（3倍に膨張）',
    timestamp: '2024-07-22 16:45:00',
  },

  setupSQL: `CREATE OR REPLACE TABLE fct_orders AS SELECT * FROM (VALUES
  ('order_001', 'cust_A', 50000, '2024-07-01'),
  ('order_002', 'cust_B', 30000, '2024-07-02'),
  ('order_003', 'cust_A', 40000, '2024-07-03'),
  ('order_004', 'cust_C', 20000, '2024-07-04'),
  ('order_005', 'cust_B', 60000, '2024-07-05')
) AS t(order_id, customer_id, amount, order_date);

CREATE OR REPLACE TABLE dim_customer_segments AS SELECT * FROM (VALUES
  ('cust_A', 'premium'),
  ('cust_A', 'loyalty'),
  ('cust_A', 'high_value'),
  ('cust_B', 'standard'),
  ('cust_B', 'new_user'),
  ('cust_B', 'trial'),
  ('cust_C', 'premium'),
  ('cust_C', 'referral'),
  ('cust_C', 'seasonal')
) AS t(customer_id, segment);`,

  availableTables: ['fct_orders', 'dim_customer_segments'],

  investigationHints: [
    {
      id: 'hint-1',
      label: '問題のクエリ（バグあり）を実行してみよう',
      sql: `SELECT
  o.customer_id,
  SUM(o.amount) AS revenue
FROM fct_orders o
JOIN dim_customer_segments s ON o.customer_id = s.customer_id
GROUP BY o.customer_id
ORDER BY revenue DESC;`,
    },
    {
      id: 'hint-2',
      label: 'JOINで行数がどうなるか確認してみよう',
      sql: `SELECT
  o.order_id,
  o.customer_id,
  o.amount,
  s.segment
FROM fct_orders o
JOIN dim_customer_segments s ON o.customer_id = s.customer_id
ORDER BY o.order_id;`,
    },
    {
      id: 'hint-3',
      label: 'segmentsテーブルの構造を確認してみよう',
      sql: `SELECT
  customer_id,
  COUNT(*) AS segment_count
FROM dim_customer_segments
GROUP BY customer_id
ORDER BY customer_id;`,
    },
    {
      id: 'hint-4',
      label: 'JOINなしの正しい売上を確認してみよう',
      sql: `SELECT
  customer_id,
  SUM(amount) AS correct_revenue
FROM fct_orders
GROUP BY customer_id
ORDER BY customer_id;`,
    },
  ],

  diagnosisQuestion: '売上が3倍に膨張した根本原因はどれですか？',
  diagnosisOptions: [
    {
      id: 'diag-1',
      label: 'SUM関数の仕様が変わり、同じ値を重複カウントしている',
      correct: false,
      explanation: '違います。SUMの仕様は変わっていません。JOINの結果として生成される行数を確認してください。',
    },
    {
      id: 'diag-2',
      label: 'dim_customer_segmentsが顧客ごとに複数行持っており、JOINで注文行が各セグメント数だけ複製され、SUMが膨張する（ファンアウト）',
      correct: true,
      explanation: '正解！これが「ファンアウト（Fanout）」問題です。cust_Aの注文3行 × セグメント3種 = 9行に複製されます。SUMは複製された行を全て足すため、3倍になります。JOINで1対多の関係を繋ぐと必ず発生します。',
    },
    {
      id: 'diag-3',
      label: 'GROUP BYにsegmentカラムを入れ忘れているためカーテシアン積が発生している',
      correct: false,
      explanation: 'GROUP BYの問題ではありません。問題はJOIN自体で行が複製されていることです。GROUP BYはその後の集計に影響しますが、元の複製行数は変わりません。',
    },
    {
      id: 'diag-4',
      label: 'INNER JOINではなくCROSS JOINが実行されている',
      correct: false,
      explanation: 'CROSS JOINなら全組み合わせ（5 × 9 = 45行）になります。今回は1対多JOINによる行の複製であり、CROSS JOINとは異なります。',
    },
  ],

  fixQuestion: 'ファンアウト問題への正しい対処はどれですか？',
  fixOptions: [
    {
      id: 'fix-1',
      label: 'COUNT(DISTINCT order_id)とSUM(DISTINCT amount)を使う',
      sqlPreview: 'SUM(DISTINCT amount)',
      correct: false,
      explanation: 'COUNT(DISTINCT order_id)は件数を正しく出せますが、SUM(DISTINCT amount)は同じ金額の注文があると正しくありません（例：¥30,000が2件あると1件分しかカウントされない）。',
      fixSQL: `SELECT
  customer_id,
  COUNT(DISTINCT order_id) AS orders,
  SUM(DISTINCT amount) AS wrong_revenue
FROM fct_orders o
JOIN dim_customer_segments s ON o.customer_id = s.customer_id
GROUP BY customer_id;`,
    },
    {
      id: 'fix-2',
      label: '先にfct_ordersで集計してからセグメントをJOINする（正解）',
      sqlPreview: 'WITH agg AS (SELECT ... FROM fct_orders GROUP BY)',
      correct: true,
      explanation: '正解！これが「ファンアウト回避」の基本パターンです。集計ファクト（GROUP BY済み）にディメンションをJOINすることで、行の複製を防ぎます。「集計してからJOIN」の原則を守りましょう。',
      fixSQL: `WITH customer_revenue AS (
  SELECT
    customer_id,
    SUM(amount) AS revenue,
    COUNT(*) AS order_count
  FROM fct_orders
  GROUP BY customer_id
)
SELECT
  r.customer_id,
  r.revenue,
  r.order_count,
  STRING_AGG(s.segment, ', ') AS segments
FROM customer_revenue r
LEFT JOIN dim_customer_segments s ON r.customer_id = s.customer_id
GROUP BY r.customer_id, r.revenue, r.order_count
ORDER BY r.revenue DESC;`,
    },
    {
      id: 'fix-3',
      label: 'segmentsテーブルをDEDUPして1行にする',
      sqlPreview: 'SELECT DISTINCT customer_id FROM dim_customer_segments',
      correct: false,
      explanation: 'DEDUPするとセグメント情報が全て失われます。ファンアウトを避けるには「集計してからJOIN」が正しいアプローチで、セグメント情報は失わずに保持できます。',
      fixSQL: `SELECT DISTINCT customer_id FROM dim_customer_segments;`,
    },
    {
      id: 'fix-4',
      label: 'JOINを削除して別々のクエリで取得する',
      sqlPreview: '-- JOINを使わず2つのSELECTで取る',
      correct: false,
      explanation: '別々に取得するのは回避策になりますが、分析では統合されたデータが必要です。「集計してからJOIN」を使えば1つのクエリで正しく取得できます。',
      fixSQL: `SELECT customer_id, SUM(amount) AS revenue FROM fct_orders GROUP BY customer_id;`,
    },
  ],

  verificationSQL: `WITH customer_revenue AS (
  SELECT customer_id, SUM(amount) AS revenue
  FROM fct_orders
  GROUP BY customer_id
)
SELECT
  SUM(revenue) AS total_revenue,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM customer_revenue;`,

  verificationExpectedDescription: 'total_revenue = 200000、unique_customers = 3（膨張なし）',

  lesson: {
    title: 'JOINで行が爆発するファンアウトに気をつける',
    body: `**ファンアウト（Fanout）** とは、JOINで1対多の関係を繋いだとき、ファクト行が複製される現象です。

\`\`\`
fct_orders:              dim_customer_segments:
cust_A, order_001, 50000   cust_A, premium
cust_A, order_003, 40000   cust_A, loyalty
                           cust_A, high_value

JOIN後 → 6行に複製！
cust_A, order_001, 50000, premium
cust_A, order_001, 50000, loyalty   ← 複製
cust_A, order_001, 50000, high_value ← 複製
cust_A, order_003, 40000, premium
...
\`\`\`

**ファンアウト回避の鉄則：**

> **「集計してからJOINする」**

FACTテーブルで先にGROUP BYし、集計済みの結果にDIMをJOINします。これで行の複製を防げます。

dbt では **metrics layer** または **semantic layer** がこの問題を自動的に処理します。`,
    prevention: [
      'FACTテーブルへのJOINは「集計後」に行う（WITH句でGROUP BYを先に実行）',
      'JOINの前後でCOUNT(*)を確認し、行数が増えていないかを検証する',
      'dbt tests でfanout検知クエリを追加する（JOIN後の行数 = JOIN前の行数）',
      'dim_customer_segments のような多値テーブルはARRAY型に変換してファクトに持たせることを検討する',
    ],
    realWorldExample: 'BIツールでキャンペーンレポートを作成する際、注文テーブルにキャンペーンタグ（1注文に複数タグ）をJOINしたところ、GMVが実際の7倍に膨張してCEOに誤報告した事例があります。レポートの修正と説明に1週間かかりました。',
  },
};
