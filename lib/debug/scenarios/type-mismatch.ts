import type { DebugScenario } from '@/types';

export const typeMismatchScenario: DebugScenario = {
  id: 'type-mismatch',
  title: '大口顧客のランキングが狂っている',
  subtitle: '型不整合・VARCHARの罠',
  category: 'data_quality',
  difficulty: 'beginner',
  xpReward: 130,

  alert: {
    from: '渡辺アナリスト',
    role: 'BIアナリスト',
    message: '週次レポートで大口顧客トップ10を出したら明らかにおかしい順番になっています。¥9,000の注文が¥20,000より上位に来ていて、営業部長から怒られました。クエリを確認しましたがORDER BY amountしているのに正しくソートされません。',
    metric: '売上金額上位10件（ORDER BY amount DESC）',
    expectedValue: '¥20,000 > ¥15,000 > ¥12,000...',
    actualValue: '¥9,500 > ¥9,000 > ¥20,000...',
    timestamp: '2024-05-10 14:32:08',
  },

  setupSQL: `CREATE OR REPLACE TABLE raw_orders AS SELECT * FROM (VALUES
  ('order_001', 'cust_A', '1500',  'completed', '2024-05-10'),
  ('order_002', 'cust_B', '20000', 'completed', '2024-05-10'),
  ('order_003', 'cust_C', '9500',  'completed', '2024-05-10'),
  ('order_004', 'cust_D', '3200',  'completed', '2024-05-10'),
  ('order_005', 'cust_E', '15000', 'completed', '2024-05-10'),
  ('order_006', 'cust_F', '780',   'completed', '2024-05-10'),
  ('order_007', 'cust_G', '9000',  'completed', '2024-05-10'),
  ('order_008', 'cust_H', '12000', 'completed', '2024-05-10'),
  ('order_009', 'cust_I', '450',   'completed', '2024-05-10'),
  ('order_010', 'cust_J', '8800',  'completed', '2024-05-10')
) AS t(order_id, customer_id, amount, status, order_date);`,

  availableTables: ['raw_orders'],

  investigationHints: [
    {
      id: 'hint-1',
      label: 'そのままORDER BYしてみよう',
      sql: `SELECT order_id, customer_id, amount
FROM raw_orders
ORDER BY amount DESC;`,
    },
    {
      id: 'hint-2',
      label: 'amountの型を確認してみよう',
      sql: `SELECT
  order_id,
  amount,
  typeof(amount) AS data_type
FROM raw_orders
LIMIT 5;`,
    },
    {
      id: 'hint-3',
      label: '文字列ソートと数値ソートの違いを比較してみよう',
      sql: `SELECT
  amount           AS varchar_sort,
  CAST(amount AS INTEGER) AS numeric_value
FROM raw_orders
ORDER BY amount DESC;`,
    },
    {
      id: 'hint-4',
      label: 'SUMしてみると何が起きるか確認してみよう',
      sql: `SELECT
  SUM(CAST(amount AS INTEGER)) AS numeric_sum,
  COUNT(*) AS total_orders
FROM raw_orders;`,
    },
  ],

  diagnosisQuestion: 'ソート結果がおかしい根本原因はどれですか？',
  diagnosisOptions: [
    {
      id: 'diag-1',
      label: 'データベースのソートアルゴリズムにバグがある',
      correct: false,
      explanation: '違います。データベースのソートアルゴリズムに問題はありません。データ型を確認してみてください。',
    },
    {
      id: 'diag-2',
      label: 'amountカラムがINTEGERではなくVARCHARで格納されており、文字列として辞書順ソートされている',
      correct: true,
      explanation: '正解！amountがVARCHARのため、文字列ソートになります。文字列の辞書順では「9」>「8」>「2」>「1」なので「9500」>「9000」>「20000」になります（先頭文字が比較される）。',
    },
    {
      id: 'diag-3',
      label: 'ORDER BY の後に LIMIT がないため重複が発生している',
      correct: false,
      explanation: '違います。LIMITの有無はソート順に影響しません。型の問題を確認してください。',
    },
    {
      id: 'diag-4',
      label: '金額がマイナス値を含んでいて符号の扱いが違う',
      correct: false,
      explanation: '違います。データを見るとマイナス値はありません。文字列ソートの動作を確認してみてください。',
    },
  ],

  fixQuestion: '正しい修正はどれですか？',
  fixOptions: [
    {
      id: 'fix-1',
      label: 'ダッシュボードのクエリにCAST追加で応急処置（根本解決でない）',
      sqlPreview: 'ORDER BY CAST(amount AS INTEGER) DESC',
      correct: false,
      explanation: '今の集計は直りますが、他のクエリでも毎回CASTが必要になります。ステージングで型を統一するのが正しい対処です。',
      fixSQL: `SELECT order_id, customer_id, amount
FROM raw_orders
ORDER BY CAST(amount AS INTEGER) DESC;`,
    },
    {
      id: 'fix-2',
      label: 'ステージングレイヤーでINTEGERに型変換して正規化する（正解）',
      sqlPreview: 'TRY_CAST(amount AS INTEGER) AS amount',
      correct: true,
      explanation: '正解！TRY_CASTは変換失敗時にNULLを返すため安全です（CASTはエラーで落ちる）。ステージングで型を統一することで、下流の全クエリが正しく動きます。',
      fixSQL: `CREATE OR REPLACE TABLE stg_orders AS
SELECT
  order_id,
  customer_id,
  TRY_CAST(amount AS INTEGER) AS amount,
  status,
  order_date
FROM raw_orders;

SELECT order_id, customer_id, amount
FROM stg_orders
ORDER BY amount DESC;`,
    },
    {
      id: 'fix-3',
      label: 'amountを数値に見えるよう0パディングする',
      sqlPreview: "LPAD(amount, 10, '0')",
      correct: false,
      explanation: 'ゼロパディングで文字列ソートを正しくできますが、数値演算（SUM、AVG）には使えません。根本解決になりません。',
      fixSQL: `SELECT order_id, customer_id, LPAD(amount, 10, '0') AS padded_amount
FROM raw_orders
ORDER BY LPAD(amount, 10, '0') DESC;`,
    },
    {
      id: 'fix-4',
      label: 'ORDER BY REGEXP_EXTRACT(amount, \'[0-9]+\') で数字部分だけ取り出す',
      sqlPreview: "ORDER BY REGEXP_EXTRACT(amount, '[0-9]+')",
      correct: false,
      explanation: 'これも文字列のまま扱っているため数値ソートになりません。また、正規表現の抽出結果も文字列型です。',
      fixSQL: `SELECT order_id, amount
FROM raw_orders
ORDER BY REGEXP_EXTRACT(amount, '[0-9]+') DESC;`,
    },
  ],

  verificationSQL: `SELECT
  order_id,
  customer_id,
  amount,
  typeof(amount) AS data_type
FROM stg_orders
ORDER BY amount DESC;`,

  verificationExpectedDescription: 'data_type = INTEGER、amount が 20000→15000→12000... と数値順に並ぶ',

  lesson: {
    title: '型は取り込み時点で明示的に定義する',
    body: `**文字列ソートと数値ソートの違い：**

\`\`\`
文字列ソート（辞書順）:  "9500" > "9000" > "20000" > "15000" > "12000"
数値ソート（大小順）:   20000 > 15000 > 12000 > 9500 > 9000
\`\`\`

文字列は先頭の文字から順に比較されます。"9"は"2"より大きいので"9500">"20000"になります。

**なぜ発生するか：**
CSVやJSONからデータを取り込む際、型推論が失敗してVARCHARになることがよくあります。特にカラムに空文字や"null"（文字列）が混じっている場合、型推論が文字列を選びます。

**TRY_CAST vs CAST：**
- \`CAST(amount AS INTEGER)\` → 変換失敗でERROR（パイプライン停止）
- \`TRY_CAST(amount AS INTEGER)\` → 変換失敗でNULL（安全）`,
    prevention: [
      'ステージングレイヤーで全カラムの型を明示的にTRY_CASTで定義する',
      'dbt の not_null + accepted_values テストに加え、型チェックを追加する',
      'CSVインポート時にread_csv_auto ではなく明示的な型定義を使う',
      'データプロファイリングツールで型の分布と異常値を定期的に確認する',
    ],
    realWorldExample: '某小売企業で売上ランキングの集計が3ヶ月間ずっと間違っており、表彰された営業担当の実際の売上が1/3だったことが後から判明した事例があります。VARCHARのamountを辞書順ソートしていたのが原因でした。',
  },
};
