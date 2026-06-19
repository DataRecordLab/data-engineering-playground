# SCENARIOS.md — シナリオ・タスク設計書

## Quest 1: 売上が見えない（ECサイト・初級）

### サンプルデータ

**orders.csv**
```csv
order_id,user_id,product_id,amount,status,created_at
ORD-001,U-1,P-1,1500,Completed,2024-01-15 10:30:00
ORD-002,U-2,P-3,3200,completed,2024-01-16 14:20:00
ORD-003,U-1,P-2,NULL,COMPLETED,2024-01-17 09:15:00
ORD-004,U-3,P-1,800,Cancelled,2024-01-18 16:45:00
ORD-005,U-2,P-4,5600,Pending,2024-01-19 11:00:00
```
※ 意図的な問題: amount=NULL、statusの表記揺れ、タイムゾーンなし

**users.csv**
```csv
user_id,name,email,registered_at
U-1,田中太郎,tanaka@example.com,2024-01-01
U-2,Sato Hanako,SATO@EXAMPLE.COM,2024/01/05
U-3,鈴木一郎,suzuki@example.com,2024-01-10
```
※ 意図的な問題: 名前の形式不統一、メールの大文字小文字混在、日付フォーマット不統一

**products.csv**
```csv
product_id,name,category,price
P-1,ワイヤレスイヤホン,Electronics,1500
P-2,スマホケース,electronics,800
P-3,充電器,ELECTRONICS,3200
P-4,Bluetoothスピーカー,Electronics,5600
```
※ 意図的な問題: categoryの表記揺れ

---

### Stage 1: オープニング

**ゲーム形式**: RPG  
**所要時間**: 5分

**ストーリーテキスト**:
```
ShopNowのCTOからメッセージが届いた。

「先月から売上の集計が全くできていない状態です。
データはあるはずなのに、バラバラなシステムに散在していて、
集計すると数字が合わない。

まずデータを確認してほしい。
CSVを3つ送ります。orders、users、productsです。
経営会議まで2週間。よろしくお願いします。」

---

あなたのミッション:
1. データの全体像を把握する
2. どんな問題があるかを確認する
3. Source→Staging→Warehouse→Martの設計方針を立てる
```

**ユーザーアクション**: 「データを確認する」ボタン → CSVプレビュー表示 → 「課題を理解した」

---

### Stage 2: Source Layer

**ゲーム形式**: ステージクリア  
**所要時間**: 15分  
**XP**: 50〜150

**ミッションテキスト**:
```
まずSource Layerを作りましょう。

Source層のルール:
- データを加工しない
- 型変換しない
- そのままの形で保持する
- _loaded_at（ロード日時）は追加してよい

なぜSource層が必要か？
生データをそのまま保持することで、
後から「元のデータはどうだったか」を確認できます。
```

**初期SQL**:
```sql
-- src_ordersテーブルを作成してください
-- CSVのデータをそのまま保持します（加工禁止）

CREATE TABLE src_orders AS
SELECT * FROM read_csv_auto('orders.csv');
```

**正解判定ルール**:
```typescript
const sourceValidation = {
  requiredTables: ['src_orders', 'src_users', 'src_products'],
  checks: [
    { type: 'table_exists', table: 'src_orders' },
    { type: 'table_exists', table: 'src_users' },
    { type: 'table_exists', table: 'src_products' },
    { type: 'row_count', table: 'src_orders', expected: 5 },
    { type: 'column_exists', table: 'src_orders', column: 'order_id' },
    // 加工していないことの確認（amountがVARCHARのまま）
    { type: 'column_type', table: 'src_orders', column: 'amount', type: 'VARCHAR' },
  ]
};
```

**AIフィードバック例（★2）**:
```
src_ordersの基本構造は正しいですね。

ただし、本番環境では _loaded_at カラムを追加するのが標準です。
「このデータがいつ取り込まれたか」を記録することで、
再取り込みや差分管理が可能になります。

改善案:
CREATE TABLE src_orders AS
SELECT *, CURRENT_TIMESTAMP as _loaded_at
FROM read_csv_auto('orders.csv');
```

---

### Stage 3: Staging Layer

**ゲーム形式**: シミュレーション  
**所要時間**: 25分  
**XP**: 50〜150

**シナリオメッセージ（上司からのSlack風）**:
```
田中シニアエンジニア:
「src_ordersを見たんだけど、amountがVARCHARのままだと
集計クエリがエラーになるよ。
statusも表記がバラバラ（Completed / completed / COMPLETED）。
Stagingで整えてほしい。
あと、_loaded_atも忘れずに。」
```

**ミッション**:
```
以下の問題を修正してStaging Layerを作ってください:

orders:
- amount: VARCHAR → NUMERIC に変換（NULLはそのまま）
- status: 小文字に統一（LOWER関数）
- created_at: TIMESTAMP型に変換
- _loaded_at: 現在日時を追加

users:
- email: 小文字に統一
- registered_at: DATE型に統一

products:
- category: 小文字に統一
- price: NUMERIC型に変換
```

**ヒント**:
```sql
-- 型変換の基本
CAST(amount AS NUMERIC)
TRY_CAST(amount AS NUMERIC)  -- NULLセーフ

-- 文字列処理
LOWER(status)
TRIM(name)

-- 日付変換
STRPTIME(registered_at, '%Y/%m/%d')
```

**模範解答**:
```sql
CREATE TABLE stg_orders AS
SELECT
  order_id,
  user_id,
  product_id,
  TRY_CAST(amount AS NUMERIC) AS amount,
  LOWER(TRIM(status)) AS status,
  CAST(created_at AS TIMESTAMP) AS created_at,
  CURRENT_TIMESTAMP AS _loaded_at
FROM src_orders;

CREATE TABLE stg_users AS
SELECT
  user_id,
  TRIM(name) AS name,
  LOWER(TRIM(email)) AS email,
  CAST(registered_at AS DATE) AS registered_at,
  CURRENT_TIMESTAMP AS _loaded_at
FROM src_users;

CREATE TABLE stg_products AS
SELECT
  product_id,
  TRIM(name) AS name,
  LOWER(TRIM(category)) AS category,
  CAST(price AS NUMERIC) AS price,
  CURRENT_TIMESTAMP AS _loaded_at
FROM src_products;
```

---

### Stage 4: Warehouse Layer（ボス戦）

**ゲーム形式**: RPG ボス戦  
**所要時間**: 30分  
**XP**: 100〜200

**ボス戦の設定**:
```
「ここからが本番だ。Warehouseの設計は、
一つの正解があるわけじゃない。
ビジネスの要件と、将来の拡張性を考えながら
最適な設計を選ぶんだ。」

3つの設計案を提示する。あなたが最適だと思うものを選んで実装し、
なぜその設計を選んだか説明してください。
```

**設計選択肢**:
```
案A: シンプルなスタースキーマ
- fact_orders（注文ファクト）
- dim_users（ユーザーディメンション）
- dim_products（商品ディメンション）
- dim_date（日付ディメンション）

案B: 正規化重視
- fact_orders
- dim_users
- dim_products
- dim_categories（カテゴリを別テーブルに）

案C: 非正規化（分析特化）
- fact_orders（全情報を一テーブルに）
```

**模範解答（案A）**:
```sql
-- ディメンションテーブル
CREATE TABLE dim_users AS
SELECT
  ROW_NUMBER() OVER (ORDER BY user_id) AS user_key,
  user_id,
  name,
  email,
  registered_at
FROM stg_users;

CREATE TABLE dim_products AS
SELECT
  ROW_NUMBER() OVER (ORDER BY product_id) AS product_key,
  product_id,
  name,
  category,
  price
FROM stg_products;

-- ファクトテーブル
CREATE TABLE fact_orders AS
SELECT
  o.order_id,
  u.user_key,
  p.product_key,
  o.amount,
  o.status,
  o.created_at,
  DATE_TRUNC('day', o.created_at) AS order_date
FROM stg_orders o
LEFT JOIN dim_users u ON o.user_id = u.user_id
LEFT JOIN dim_products p ON o.product_id = p.product_id;
```

---

### Stage 5: Mart + 意思決定

**ゲーム形式**: シミュレーション  
**所要時間**: 20分  
**XP**: 100〜150

**経営からの質問**:
```
ShopNow CEOから緊急メッセージ:
「売上が最も落ちている曜日はいつですか？
来週の経営会議でその曜日の施策を発表したい。
明日の朝までに教えてください。」
```

**ミッション**:
```sql
-- 以下のMartを作り、質問に答えてください

-- 1. 日次売上Mart
CREATE TABLE mart_daily_sales AS
SELECT
  ...

-- 2. 曜日別売上を集計するクエリを書いて
-- 売上が最も落ちている曜日を特定せよ
```

**エンディングテキスト**:
```
「ありがとうございます！木曜日が最も売上が低いんですね。
キャンペーンを木曜日に集中させてみます。

あなたのおかげでデータに基づいた意思決定ができました。
これがデータエンジニアの本当の価値ですね。」

— ShopNow CEO

---

クエスト完了！

あなたは今日、以下を学びました:
✓ Source / Staging / Warehouse / Martの役割
✓ データクレンジングの重要性
✓ スタースキーマ設計
✓ データで意思決定を支援する方法

獲得バッジ: 「クエスト完走」「モデリング思考」
次のクエスト「解約率を下げろ」が解放されました！
```
