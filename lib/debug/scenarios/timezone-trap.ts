import type { DebugScenario } from '@/types';

export const timezoneTrapScenario: DebugScenario = {
  id: 'timezone-trap',
  title: '昨日の売上が半分しかない',
  subtitle: 'タイムゾーン・UTC vs JST',
  category: 'timezone',
  difficulty: 'intermediate',
  xpReward: 160,

  alert: {
    from: '高橋CFO',
    role: '最高財務責任者',
    message: '昨日（3月31日）の月末締め売上が予算の半分しかありません。月次レポートに重大な差異が出ています。チームは「注文は入っています」と言うのに、ダッシュボードは¥180,000しか出ていません。至急確認してください。',
    metric: '3月31日（月末）の売上合計',
    expectedValue: '¥360,000（予算）',
    actualValue: '¥180,000（ダッシュボード）',
    timestamp: '2024-04-01 09:05:00',
  },

  setupSQL: `CREATE OR REPLACE TABLE raw_orders AS SELECT * FROM (VALUES
  ('order_001', '2024-03-31 01:30:00', 25000, 'completed'),
  ('order_002', '2024-03-31 04:15:00', 18000, 'completed'),
  ('order_003', '2024-03-31 07:00:00', 32000, 'completed'),
  ('order_004', '2024-03-31 09:45:00', 15000, 'completed'),
  ('order_005', '2024-03-31 10:20:00', 22000, 'completed'),
  ('order_006', '2024-03-31 11:50:00', 28000, 'completed'),
  ('order_007', '2024-03-31 13:30:00', 19000, 'completed'),
  ('order_008', '2024-03-31 15:10:00', 31000, 'completed'),
  ('order_009', '2024-03-31 17:45:00', 24000, 'completed'),
  ('order_010', '2024-03-31 19:20:00', 16000, 'completed'),
  ('order_011', '2024-03-31 21:05:00', 35000, 'completed'),
  ('order_012', '2024-03-31 22:30:00', 27000, 'completed'),
  ('order_013', '2024-03-31 23:00:00', 20000, 'completed'),
  ('order_014', '2024-03-31 23:30:00', 8000,  'completed')
) AS t(order_id, order_time_utc, amount, status);`,

  availableTables: ['raw_orders'],

  investigationHints: [
    {
      id: 'hint-1',
      label: 'UTC日付で集計してみよう（ダッシュボードと同じ）',
      sql: `SELECT
  DATE(order_time_utc) AS date_utc,
  COUNT(*) AS orders,
  SUM(amount) AS total
FROM raw_orders
GROUP BY date_utc
ORDER BY date_utc;`,
    },
    {
      id: 'hint-2',
      label: '注文時刻の一覧を確認してみよう',
      sql: `SELECT
  order_id,
  order_time_utc,
  amount
FROM raw_orders
ORDER BY order_time_utc;`,
    },
    {
      id: 'hint-3',
      label: 'JST（UTC+9時間）に変換してみよう',
      sql: `SELECT
  order_id,
  order_time_utc,
  order_time_utc + INTERVAL 9 HOUR AS order_time_jst,
  amount
FROM raw_orders
ORDER BY order_time_utc;`,
    },
    {
      id: 'hint-4',
      label: 'JST日付で集計するとどうなるか確認してみよう',
      sql: `SELECT
  DATE(order_time_utc + INTERVAL 9 HOUR) AS date_jst,
  COUNT(*) AS orders,
  SUM(amount) AS total
FROM raw_orders
GROUP BY date_jst
ORDER BY date_jst;`,
    },
  ],

  diagnosisQuestion: '月末の売上が半分しか出ない原因はどれですか？',
  diagnosisOptions: [
    {
      id: 'diag-1',
      label: 'ダッシュボードのフィルターが3月31日ではなく4月1日を参照している',
      correct: false,
      explanation: '違います。フィルター設定ではなく、タイムゾーンの扱いが原因です。全データのorder_time_utcを確認してみてください。',
    },
    {
      id: 'diag-2',
      label: 'タイムスタンプがUTCで保存されており、UTCの日付で集計するとJST深夜0〜8時59分の注文が前日として計上される',
      correct: true,
      explanation: '正解！注文時刻はUTCで保存されています。JST 00:00〜08:59（UTC 3/30 15:00〜3/31 00:00 より前）の注文は、UTCで見ると前日になります。逆に、3/31 JST 21:00以降の注文は4/1 UTCとして集計されます。',
    },
    {
      id: 'diag-3',
      label: '注文データが実際に途中から入力されておらず、バックエンドの問題',
      correct: false,
      explanation: 'テーブルを見ると14件の注文が存在します。バックエンドの問題ではなく、集計方法の問題です。',
    },
    {
      id: 'diag-4',
      label: '通貨変換の処理でJPYがUSDに変換されて金額が小さく見えている',
      correct: false,
      explanation: '違います。amountは日本円のINTEGERで保存されており、通貨変換は行われていません。',
    },
  ],

  fixQuestion: 'タイムゾーンのズレへの正しい対処はどれですか？',
  fixOptions: [
    {
      id: 'fix-1',
      label: 'ダッシュボードの日付フィルターを前日〜当日に広げる',
      sqlPreview: "WHERE DATE(order_time_utc) BETWEEN '2024-03-30' AND '2024-03-31'",
      correct: false,
      explanation: '暫定的には動きますが、フィルターの範囲が曖昧になります。データの根本的な扱いを直すべきです。',
      fixSQL: `SELECT
  SUM(amount) AS total
FROM raw_orders
WHERE DATE(order_time_utc) BETWEEN '2024-03-30' AND '2024-03-31';`,
    },
    {
      id: 'fix-2',
      label: 'ステージングでJSTタイムスタンプカラムを追加し、以降の集計はJSTを使う（正解）',
      sqlPreview: 'order_time_utc + INTERVAL 9 HOUR AS order_time_jst',
      correct: true,
      explanation: '正解！ステージングレイヤーでJSTカラムを追加し、ビジネスロジックは全てJSTで計算します。UTCは生データとして保持し、JSTはビジネスレポート用として分離するのがベストプラクティスです。',
      fixSQL: `CREATE OR REPLACE TABLE stg_orders AS
SELECT
  order_id,
  order_time_utc,
  order_time_utc + INTERVAL 9 HOUR AS order_time_jst,
  DATE(order_time_utc + INTERVAL 9 HOUR) AS order_date_jst,
  amount,
  status
FROM raw_orders;

SELECT
  order_date_jst,
  COUNT(*) AS orders,
  SUM(amount) AS total
FROM stg_orders
GROUP BY order_date_jst
ORDER BY order_date_jst;`,
    },
    {
      id: 'fix-3',
      label: 'バックエンドにJSTでタイムスタンプを記録するよう変更依頼する',
      sqlPreview: '-- 上流をJSTに変更',
      correct: false,
      explanation: 'UTCで保存すること自体は正しい設計です（サーバーはUTCが標準）。変換はデータ層で行うべきで、上流を変えることで他のシステムへの影響が出ます。',
      fixSQL: `-- バックエンド変更には時間がかかり、既存データの扱いも複雑になります`,
    },
    {
      id: 'fix-4',
      label: 'UTCで管理するのでJSTへの変換は不要、基準を社内でUTCに統一する',
      sqlPreview: '-- 全社UTCに統一',
      correct: false,
      explanation: '技術的には一貫していますが、ビジネスステークホルダーは「3月31日の売上」をJSTで考えます。UTCで集計するとレポートが直感に反し、コミュニケーションで混乱が生じます。',
      fixSQL: `SELECT DATE(order_time_utc) AS date_utc, SUM(amount) AS total
FROM raw_orders
GROUP BY date_utc;`,
    },
  ],

  verificationSQL: `SELECT
  order_date_jst,
  COUNT(*) AS orders,
  SUM(amount) AS total
FROM stg_orders
GROUP BY order_date_jst
ORDER BY order_date_jst;`,

  verificationExpectedDescription: '2024-03-31 に 14件・¥360,000 が集計される（分散なし）',

  lesson: {
    title: 'タイムスタンプはUTCで保存し、表示時にJSTへ変換する',
    body: `**UTC vs JST の境界問題：**

JST は UTC+9 です。つまり JST の 1日は UTC では前日15:00〜当日14:59 に対応します。

\`\`\`
JST 2024-03-31 00:00 = UTC 2024-03-30 15:00  ← UTCでは前日！
JST 2024-03-31 09:00 = UTC 2024-03-31 00:00  ← ここからUTCでも3/31
JST 2024-04-01 00:00 = UTC 2024-03-31 15:00  ← UTCではまだ3/31
\`\`\`

UTCのDATE()でグループ化すると、JSTの1日分のデータが2日に分散します。

**ベストプラクティス：**
- ストレージ: 常にUTCで保存（サーバー間で一貫）
- ステージング: JSTカラムを追加（\`utc_ts + INTERVAL 9 HOUR\`）
- レポート: JSTカラムを使用
- コード: タイムゾーンを明示的に記録（ambiguousなTIMESTAMPを避ける）`,
    prevention: [
      'タイムスタンプカラム名に _utc / _jst サフィックスをつけて明示する（order_time_utc / order_date_jst）',
      'ステージングモデルで TIMESTAMPTZ 型を使い、タイムゾーン情報を保持する',
      'dbt で timezone macros を定義し、全モデルで統一した変換を使う',
      '月末・四半期末など境界日はJSTとUTCで集計値を突き合わせるチェックを入れる',
    ],
    realWorldExample: 'グローバル展開している某SaaS企業で月次MRRの集計がUTCで行われており、日本・韓国・オーストラリアのサブスクリプション更新が翌月にずれていた。四半期の財務報告が3回連続で修正される事態になりました。',
  },
};
