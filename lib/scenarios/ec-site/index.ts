import type { Quest } from '@/types';

export const RAW_ORDERS = `order_id,user_id,product_id,amount,status,created_at
ORD-001,U-1,P-1,1500,Completed,2024-01-15 10:30:00
ORD-002,U-2,P-3,3200,completed,2024-01-15 14:20:00
ORD-003,U-1,P-2,NULL,COMPLETED,2024-01-15 09:15:00
ORD-004,U-3,P-4,5600,completed,2024-01-16 11:00:00
ORD-005,U-4,P-1,1500,Completed,2024-01-16 13:30:00
ORD-006,U-2,P-3,3200,COMPLETED,2024-01-16 16:45:00
ORD-007,U-5,P-2,800,Cancelled,2024-01-17 09:30:00
ORD-008,U-1,P-4,5600,completed,2024-01-17 14:00:00
ORD-009,U-3,P-3,3200,Completed,2024-01-17 15:30:00
ORD-010,U-4,P-1,3000,COMPLETED,2024-01-17 17:00:00
ORD-011,U-2,P-1,1500,completed,2024-01-18 11:00:00
ORD-012,U-5,P-2,800,Cancelled,2024-01-18 12:30:00
ORD-013,U-1,P-4,5600,Pending,2024-01-18 14:00:00
ORD-014,U-3,P-3,3200,Completed,2024-01-19 09:00:00
ORD-015,U-4,P-1,1500,completed,2024-01-19 11:30:00
ORD-016,U-2,P-2,800,Cancelled,2024-01-19 13:00:00
ORD-017,U-5,P-4,5600,completed,2024-01-19 15:00:00
ORD-018,U-1,P-1,1500,COMPLETED,2024-01-20 10:00:00
ORD-019,U-3,P-3,2200,completed,2024-01-20 12:00:00
ORD-020,U-4,P-2,800,Pending,2024-01-20 14:00:00
ORD-021,U-2,P-4,5600,Cancelled,2024-01-21 09:30:00
ORD-022,U-5,P-3,3200,Completed,2024-01-21 11:00:00`;

export const RAW_USERS = `user_id,name,email,registered_at
U-1,田中太郎,tanaka@example.com,2024-01-01
U-2,Sato Hanako,SATO@EXAMPLE.COM,2024/01/05
U-3,鈴木一郎,suzuki@example.com,2024-01-10
U-4,yamamoto keiko,YAMAMOTO@EXAMPLE.COM,2024/01/12
U-5,Kim Jiyeon,kim@example.com,2024-01-14`;

export const RAW_PRODUCTS = `product_id,name,category,price
P-1,ワイヤレスイヤホン,Electronics,1500
P-2,スマホケース,electronics,800
P-3,充電器,ELECTRONICS,3200
P-4,Bluetoothスピーカー,Electronics,5600`;

export const EC_SITE_QUEST: Quest = {
  id: 'ec-site',
  title: '売上が見えない',
  clientName: 'ShopNow',
  difficulty: 'beginner',
  description: 'ECサイトの売上データがバラバラで集計できない。データ基盤を構築して意思決定を支援せよ。',
  storyText: `ShopNowのCTO田村さんからメッセージが届いた。

「DataCraft Agencyさん、緊急のお願いがあります。

先月から売上の集計が全くできていない状態です。
Shopifyのデータ、CRMのデータ、在庫システムのデータ——
バラバラなシステムにデータが散在していて、
集計すると毎回数字が合わない。

先週の経営会議では「売上が出せない」と言わざるを得ませんでした。
来月の経営会議まであと2週間。
なんとかしてほしいのです。」

CSVを3つ受け取った: orders / users / products`,
  estimatedMinutes: 90,
  requiredLevel: 1,
  tags: ['EC', 'スタースキーマ', 'データ品質'],
  deConceptsCovered: [
    'パイプライン全体像',
    'Source Layer',
    'Staging Layer',
    'Warehouse Layer（スタースキーマ）',
    'Mart Layer（KPI設計）',
  ],
  csvFiles: [
    { name: 'orders', content: RAW_ORDERS },
    { name: 'users', content: RAW_USERS },
    { name: 'products', content: RAW_PRODUCTS },
  ],
  stages: [
    {
      id: 'pipeline',
      type: 'pipeline',
      title: 'パイプライン設計',
      gameType: 'rpg',
      conceptTaught: 'データパイプラインの全体像：Source → Staging → Warehouse → Mart の4層構造',
      missionText: `ShopNowのデータ基盤を設計してください。

4つのレイヤーを正しい順番で繋いで、
データパイプラインの全体像を作りましょう。

各レイヤーを右側のハンドル（●）からドラッグして
次のレイヤーに接続してください。`,
      hintText: '左から右へ: Source → Staging → Warehouse → Mart の順番で繋ぐ',
      storyMessage: `田中シニアエンジニア:
「まず全体の設計図を描くことが大事だ。
いきなりコードを書き始めるのはエンジニアの悪い癖。
4層のパイプラインがどう繋がるか、頭の中を可視化しろ。

ちなみにこの設計は ELT という方式だ。
昔は ETL（先に変換してから格納）が主流だったが
今はクラウドDWHの処理能力が上がったので
生データをそのままロードして（EL）
DWH内で変換する（T）方が速くて柔軟になった。」`,
      validation: [],
      xpReward: { star1: 50, star2: 50, star3: 50 },
      badgeId: 'pipeline_architect',
      pipelineConfig: {
        layers: [
          {
            id: 'source',
            label: 'Source Layer',
            description: '生データをそのまま保持。加工しない。',
            color: '#6366f1',
            tables: ['src_orders', 'src_users', 'src_products'],
            x: 40,
            y: 140,
          },
          {
            id: 'staging',
            label: 'Staging Layer',
            description: 'クレンジング・型変換・表記揺れ修正',
            color: '#f59e0b',
            tables: ['stg_orders', 'stg_users', 'stg_products'],
            x: 280,
            y: 140,
          },
          {
            id: 'warehouse',
            label: 'Warehouse Layer',
            description: 'スタースキーマ設計。fact / dim に分離。',
            color: '#10b981',
            tables: ['fact_orders', 'dim_users', 'dim_products'],
            x: 520,
            y: 140,
          },
          {
            id: 'mart',
            label: 'Mart Layer',
            description: 'ビジネス用途に特化したKPI集計テーブル',
            color: '#f43f5e',
            tables: ['mart_sales_by_dow'],
            x: 760,
            y: 140,
          },
        ],
        requiredConnections: [
          { from: 'source', to: 'staging' },
          { from: 'staging', to: 'warehouse' },
          { from: 'warehouse', to: 'mart' },
        ],
      },
    },
    {
      id: 'source',
      title: 'Source Layer',
      gameType: 'stage_clear',
      conceptTaught: 'Source層の役割：生データをそのまま保持し、加工しない',
      missionText: `**Source Layer** を作ってください。

Source層のルール（絶対に守ること）:
- データを加工しない
- 型変換しない
- 元データをそのままの形で保持する
- \`_loaded_at\`（取り込み日時）を追加する

**なぜSource層が必要か？**
原本を残すことで「元データはどうだったか」をいつでも確認できる。
処理が失敗したとき、最初からやり直せる。`,
      hintText: 'CREATE TABLE src_orders AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto(\'orders.csv\');',
      storyMessage: `田中シニアエンジニア:
「まず生データをそのまま保存しよう。
加工したくなる気持ちはわかるけど、
Source層では絶対に手を加えてはいけない。
原本を守ることがデータエンジニアの第一の仕事だ。」`,
      initialTransform: `-- Source Layer: 生データをそのままの形で取り込む
-- ルール: 加工しない・型変換しない・_loaded_atを追加する

CREATE OR REPLACE TABLE src_orders AS
SELECT *, CURRENT_TIMESTAMP AS _loaded_at
FROM read_csv_auto('orders.csv');

CREATE OR REPLACE TABLE src_users AS
SELECT *, CURRENT_TIMESTAMP AS _loaded_at
FROM read_csv_auto('users.csv');

CREATE OR REPLACE TABLE src_products AS
SELECT *, CURRENT_TIMESTAMP AS _loaded_at
FROM read_csv_auto('products.csv');`,
      validation: [
        { type: 'table_exists', table: 'src_orders', message: 'src_orders が作成されていません' },
        { type: 'table_exists', table: 'src_users', message: 'src_users が作成されていません' },
        { type: 'table_exists', table: 'src_products', message: 'src_products が作成されていません' },
        { type: 'row_count', table: 'src_orders', expected: 22, message: 'src_orders の行数が一致しません（22行）' },
        {
          type: 'column_exists',
          table: 'src_orders',
          column: '_loaded_at',
          message: 'src_orders に _loaded_at カラムがありません',
        },
        {
          type: 'custom',
          sql: "SELECT COUNT(*) AS cnt FROM src_orders WHERE CAST(amount AS VARCHAR) = 'NULL' OR amount IS NULL",
          expected: '1',
          message: 'Source層では NULL を変換しないでください（amount の NULL は保持）',
        },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'source_guardian',
    },
    {
      id: 'staging',
      title: 'Staging Layer',
      gameType: 'simulation',
      conceptTaught: 'Staging層の役割：データ品質の保証（型変換・表記揺れ・NULL処理）',
      missionText: `**Staging Layer** でデータを整形してください。

**修正が必要な問題:**

orders:
- \`amount\`: VARCHAR → NUMERIC（NULLはそのまま保持）
- \`status\`: 表記揺れを小文字に統一
- \`created_at\`: TIMESTAMP型へ

users:
- \`email\`: 小文字に統一
- \`registered_at\`: DATE型へ統一

products:
- \`category\`: 小文字に統一`,
      hintText: "TRY_CAST(amount AS NUMERIC) を使うと NULL-safe に型変換できる",
      storyMessage: `田中シニアエンジニア:
「src_ordersを見たんだけど問題が3つある。

1. amountがVARCHARのままだと集計クエリがエラーになる
2. statusの表記がバラバラ（Completed/completed/COMPLETED）
3. emailが大文字小文字混在でユーザー照合できない

Stagingで全部きれいにしてから次に進んでくれ。
これがデータ品質の基本だ。」`,
      initialTransform: `-- Staging Layer: データを整形・クレンジングする
-- ルール: 下流への汚染を防ぐ。stg_プレフィックスで命名。

CREATE OR REPLACE TABLE stg_orders AS
SELECT
  order_id,
  user_id,
  product_id,
  TRY_CAST(amount AS NUMERIC) AS amount,
  LOWER(TRIM(status))         AS status,
  CAST(created_at AS TIMESTAMP) AS created_at,
  CURRENT_TIMESTAMP           AS _loaded_at
FROM src_orders;

CREATE OR REPLACE TABLE stg_users AS
SELECT
  user_id,
  name,
  LOWER(TRIM(email))           AS email,
  CAST(registered_at AS DATE)  AS registered_at
FROM src_users;

CREATE OR REPLACE TABLE stg_products AS
SELECT
  product_id,
  name,
  LOWER(TRIM(category)) AS category,
  CAST(price AS NUMERIC) AS price
FROM src_products;`,
      validation: [
        { type: 'table_exists', table: 'stg_orders', message: 'stg_orders が作成されていません' },
        { type: 'table_exists', table: 'stg_users', message: 'stg_users が作成されていません' },
        { type: 'table_exists', table: 'stg_products', message: 'stg_products が作成されていません' },
        {
          type: 'custom',
          sql: "SELECT COUNT(*) AS cnt FROM stg_orders WHERE status NOT IN ('completed','cancelled','pending')",
          expected: '0',
          message: 'status の表記揺れが残っています（すべて小文字にしてください）',
        },
        {
          type: 'custom',
          sql: "SELECT COUNT(*) AS cnt FROM stg_users WHERE email != LOWER(email)",
          expected: '0',
          message: 'email に大文字が残っています',
        },
        {
          type: 'custom',
          sql: "SELECT COUNT(*) AS cnt FROM stg_products WHERE category != LOWER(category)",
          expected: '0',
          message: 'category の表記揺れが残っています',
        },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'data_cleaner',
    },
    {
      id: 'warehouse',
      title: 'Warehouse Layer',
      gameType: 'boss',
      conceptTaught: 'スタースキーマ：factテーブル（出来事）とdimテーブル（属性）の分離',
      missionText: `**Warehouse Layer** でスタースキーマを設計してください。

**設計の考え方:**
- \`fact_orders\`: 注文の「出来事」（数値・外部キー）
- \`dim_users\`: ユーザーの「属性」
- \`dim_products\`: 商品の「属性」

**なぜfactとdimを分けるのか？**
factは高頻度で増え続けるデータ。dimは属性情報。
分離することで分析クエリが高速・柔軟になる。`,
      hintText: 'ROW_NUMBER() OVER (ORDER BY user_id) AS user_key でサロゲートキーを生成できる',
      storyMessage: `田中シニアエンジニア:
「ここからが本番だ。Warehouseの設計には
正解が一つじゃない。

スタースキーマを採用するなら
factテーブルには「数値と外部キーだけ」を置く。
ユーザー名や商品名はdimテーブルに任せるんだ。

これがデータモデリングの核心だ。」`,
      initialTransform: `-- Warehouse Layer: スタースキーマ設計
-- fact: 注文の事実（数値・外部キー）
-- dim: 属性・文脈情報

CREATE OR REPLACE TABLE dim_users AS
SELECT
  ROW_NUMBER() OVER (ORDER BY user_id) AS user_key,
  user_id,
  name,
  email,
  registered_at
FROM stg_users;

CREATE OR REPLACE TABLE dim_products AS
SELECT
  ROW_NUMBER() OVER (ORDER BY product_id) AS product_key,
  product_id,
  name,
  category,
  price
FROM stg_products;

CREATE OR REPLACE TABLE fact_orders AS
SELECT
  o.order_id,
  u.user_key,
  p.product_key,
  o.amount,
  o.status,
  o.created_at
FROM stg_orders o
LEFT JOIN dim_users    u ON o.user_id    = u.user_id
LEFT JOIN dim_products p ON o.product_id = p.product_id;`,
      validation: [
        { type: 'table_exists', table: 'fact_orders', message: 'fact_orders が作成されていません' },
        { type: 'table_exists', table: 'dim_users', message: 'dim_users が作成されていません' },
        { type: 'table_exists', table: 'dim_products', message: 'dim_products が作成されていません' },
        {
          type: 'column_exists',
          table: 'dim_users',
          column: 'user_key',
          message: 'dim_users にサロゲートキー(user_key)がありません',
        },
        {
          type: 'custom',
          sql: 'SELECT COUNT(*) AS cnt FROM fact_orders WHERE user_key IS NULL',
          expected: '0',
          message: 'fact_orders に user_key が NULL の行があります（JOINを確認してください）',
        },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'modeler',
    },
    {
      id: 'mart',
      title: 'Mart Layer + 意思決定',
      gameType: 'decision',
      conceptTaught: 'Mart層：特定のビジネス用途に特化したKPI設計',
      missionText: `ShopNow CEO田村さんから質問が届いた:

**「売上が最も落ちている曜日はいつですか？」**

Mart Layerに **曜日別売上テーブル** を作り、
答えを導いてください。`,
      hintText: "strftime('%A', created_at) で曜日名を取得できる",
      storyMessage: `田村さん（CEO）:
「分析できる状態になったんですね！

早速聞きたいのですが、
売上が最も落ちている曜日はいつですか？
来週の経営会議でその曜日に向けた施策を発表したい。

明日の朝までに教えてください。」`,
      initialTransform: `-- Mart Layer: 曜日別売上 KPI
-- completedの注文のみを対象に集計する

CREATE OR REPLACE TABLE mart_sales_by_dow AS
SELECT
  strftime('%A', created_at)        AS day_of_week,
  SUM(amount)                        AS total_revenue,
  COUNT(*)                           AS order_count,
  ROUND(AVG(amount), 0)             AS avg_order_value
FROM fact_orders
WHERE status = 'completed'
  AND amount IS NOT NULL
GROUP BY day_of_week
ORDER BY total_revenue ASC;

-- 結果確認
SELECT * FROM mart_sales_by_dow;`,
      validation: [
        { type: 'table_exists', table: 'mart_sales_by_dow', message: 'mart_sales_by_dow が作成されていません' },
        {
          type: 'column_exists',
          table: 'mart_sales_by_dow',
          column: 'total_revenue',
          message: 'mart_sales_by_dow に total_revenue カラムがありません',
        },
        {
          type: 'custom',
          sql: 'SELECT COUNT(DISTINCT day_of_week) AS cnt FROM mart_sales_by_dow',
          expected: '7',
          message: '7曜日すべてのデータが必要です（データが足りない可能性があります）',
        },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'kpi_builder',
    },
  ],
};
