# SCENARIOS.md — シナリオ・タスク設計書

## Quest 1: 売上が見えない（ECサイト・初級）

### 概要

| 項目 | 内容 |
|------|------|
| クライアント | ShopNow（ECサイト） |
| 難易度 | 初級（beginner） |
| 推定時間 | 60〜90分 |
| 学べるDE概念 | パイプライン全体像・Source/Staging/Warehouse/Mart・スタースキーマ基礎 |
| ゴール | 「売上が最も落ちている曜日はいつか？」に答える |

### サンプルデータ（意図的に問題を含む）

**orders.csv** — 問題: amount=NULL・statusの表記揺れ・日付フォーマット不統一
```csv
order_id,user_id,product_id,amount,status,created_at
ORD-001,U-1,P-1,1500,Completed,2024-01-15 10:30:00
ORD-002,U-2,P-3,3200,completed,2024-01-16 14:20:00
ORD-003,U-1,P-2,NULL,COMPLETED,2024-01-17 09:15:00
ORD-004,U-3,P-1,800,Cancelled,2024-01-18 16:45:00
ORD-005,U-2,P-4,5600,Pending,2024-01-19 11:00:00
```

**users.csv** — 問題: 名前形式不統一・メール大文字小文字混在・日付フォーマット混在
```csv
user_id,name,email,registered_at
U-1,田中太郎,tanaka@example.com,2024-01-01
U-2,Sato Hanako,SATO@EXAMPLE.COM,2024/01/05
U-3,鈴木一郎,suzuki@example.com,2024-01-10
```

**products.csv** — 問題: categoryの表記揺れ
```csv
product_id,name,category,price
P-1,ワイヤレスイヤホン,Electronics,1500
P-2,スマホケース,electronics,800
P-3,充電器,ELECTRONICS,3200
P-4,Bluetoothスピーカー,Electronics,5600
```

---

## Stage 1: オープニング

**ゲーム形式**: RPG  
**学ぶ概念**: データエンジニアリングとは何か・パイプラインの全体像  
**所要時間**: 5分

**ストーリーテキスト**:
```
ShopNowのCTO田村さんからメッセージが届いた。

「DataCraft Agencyさん、緊急のお願いがあります。

先月から売上の集計が全くできていない状態です。
Shopifyのデータ、CRMのデータ、在庫システムのデータ——
バラバラなシステムにデータが散在していて、
集計すると毎回数字が合わない。

先週の経営会議では「売上が出せない」と言わざるを得ませんでした。
来月の経営会議まであと2週間。
なんとかしてほしいのです。」

まずデータを確認しよう。
CSVを3つ受け取った: orders / users / products
```

**ユーザーアクション**:
1. CSVデータをプレビューで確認
2. 「どんな問題がありそうか？」を考える（自由入力 or 選択肢）
3. パイプラインの全体設計を見る（Source→Staging→Warehouse→Martのマップ）
4. 「理解した。設計を始める」でStage 2へ

**教えること**:
- データエンジニアの仕事は「データを使える状態にすること」
- パイプラインという設計の存在
- 各レイヤーの役割の概要

---

## Stage 2: Source Layer

**ゲーム形式**: ステージクリア  
**学ぶ概念**: Sourceの役割・なぜ生データを加工しないのか・冪等性  
**所要時間**: 15分

**ミッションテキスト**:
```
まずSource Layerを作る。

Source層のルール（絶対に守ること）:
✓ データを加工しない
✓ 型変換しない
✓ 元のデータをそのままの形で保持する
✓ _loaded_at（取り込み日時）を追加する

なぜSource層が必要か？
→ 原本を残すことで、後から「元のデータはどうだったか」を確認できる
→ 処理が失敗したとき、いつでも最初からやり直せる
```

**パイプライン操作**:
1. CSVノードと Source Layer ノードを繋ぐ
2. 各テーブルの取り込み変換を定義する

**変換定義（補助SQL）**:
```sql
CREATE TABLE src_orders AS
SELECT *, CURRENT_TIMESTAMP as _loaded_at
FROM read_csv_auto('orders.csv');
```

**バリデーション**:
```typescript
[
  { type: 'table_exists', table: 'src_orders', message: 'src_ordersが作成されていません' },
  { type: 'table_exists', table: 'src_users', message: 'src_usersが作成されていません' },
  { type: 'table_exists', table: 'src_products', message: 'src_productsが作成されていません' },
  { type: 'row_count', table: 'src_orders', expected: 5, message: '行数が一致しません' },
  { type: 'column_type', table: 'src_orders', column: 'amount', type: 'VARCHAR',
    message: 'Source層では型変換しないでください（amountはVARCHARのまま）' },
]
```

**AIフィードバック観点**:
- Source層で加工していないか
- _loaded_atが追加されているか
- テーブル命名規則（src_プレフィックス）

---

## Stage 3: Staging Layer

**ゲーム形式**: シミュレーション  
**学ぶ概念**: データ品質・型変換・表記揺れ・NULLの扱い  
**所要時間**: 25分

**シナリオメッセージ（上司Slack風）**:
```
田中シニアエンジニア:
「src_ordersを見たんだけど問題が3つある。

1. amountがVARCHARのままだと集計クエリがエラーになる
2. status の表記がバラバラ（Completed / completed / COMPLETED）
3. emailが大文字小文字混在でユーザー照合できない

Stagingで全部きれいにしてから次に進んでくれ。
これがデータ品質の基本だ。」
```

**ミッション**:
```
Staging Layerで以下を整形してください:

orders（src_orders → stg_orders）:
- amount: VARCHARからNUMERICへ変換（NULLはそのまま保持）
- status: 小文字に統一
- created_at: TIMESTAMP型へ統一
- _loaded_atを追加

users（src_users → stg_users）:
- email: 小文字に統一
- registered_at: DATE型へ統一

products（src_products → stg_products）:
- category: 小文字に統一
- price: NUMERIC型へ変換
```

**模範変換定義**:
```sql
-- stg_orders
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
```

**AIフィードバック観点**:
- 型変換が正しくできているか
- NULLの扱い（TRY_CAST vs CAST）
- 表記揺れが解消されているか
- stg_プレフィックスの命名

---

## Stage 4: Warehouse Layer（ボス戦）

**ゲーム形式**: RPGボス戦（設計判断）  
**学ぶ概念**: スタースキーマ・fact/dim・粒度・サロゲートキー  
**所要時間**: 30分

**ボス戦の設定**:
```
「ここからが本番だ。

Warehouseの設計には正解が一つじゃない。
ビジネスの要件と将来の拡張性を考えながら
最適な設計を自分で判断するんだ。

3つの設計案を見せる。
どれが最適か選んで、なぜその設計を選んだか説明してくれ。」
```

**設計選択肢**:
```
案A: スタースキーマ（推奨）
fact_orders: 注文の事実（数値・外部キー）
dim_users: ユーザー属性
dim_products: 商品属性
dim_date: 日付ディメンション

案B: 正規化重視
fact_orders
dim_users
dim_products
dim_categories（カテゴリを独立）

案C: 非正規化（分析特化）
fact_orders_denormalized（全情報を一テーブルに）
```

**学習ポイント**:
- factテーブルは「数値・出来事」、dimテーブルは「属性・文脈」
- 粒度：「1行 = 1注文」を保つ
- サロゲートキー（user_key等）の必要性

**模範設計**:
```sql
CREATE TABLE dim_users AS
SELECT
  ROW_NUMBER() OVER (ORDER BY user_id) AS user_key,
  user_id, name, email, registered_at
FROM stg_users;

CREATE TABLE fact_orders AS
SELECT
  o.order_id,
  u.user_key,
  p.product_key,
  o.amount,
  o.status,
  o.created_at
FROM stg_orders o
LEFT JOIN dim_users u ON o.user_id = u.user_id
LEFT JOIN dim_products p ON o.product_id = p.product_id;
```

---

## Stage 5: Mart + 意思決定

**ゲーム形式**: 意思決定型  
**学ぶ概念**: KPI設計・集計設計・データドリブン意思決定  
**所要時間**: 20分

**クライアントからの質問**:
```
ShopNow CEO田村さん:
「分析できる状態になったんですね！

早速聞きたいのですが、
売上が最も落ちている曜日はいつですか？
来週の経営会議でその曜日に向けた施策を発表したい。

明日の朝までに教えてください。」
```

**ミッション**:
```sql
-- 曜日別売上Martを作り、質問に答えてください

CREATE TABLE mart_sales_by_dayofweek AS
SELECT
  DAYNAME(order_date) AS day_of_week,
  ...
FROM fact_orders
GROUP BY day_of_week
ORDER BY total_revenue ASC;
```

**エンディングテキスト**:
```
「木曜日が最も売上が低いんですね！
ありがとうございます。木曜日にタイムセールを実施します。

データエンジニアのおかげで、勘ではなく
データに基づいた意思決定ができました。

これが私たちが求めていたものです。」

— ShopNow CEO 田村さん

━━━━━━━━━━━━━━━━━━━━━
🎉 Quest Complete!
━━━━━━━━━━━━━━━━━━━━━

今日あなたが作ったもの:
✓ Source Layer（生データを守る基盤）
✓ Staging Layer（データ品質を保証する層）
✓ Warehouse Layer（分析に適した構造）
✓ Mart Layer（意思決定を支えるテーブル）

学んだこと:
✓ なぜSourceで加工しないのか
✓ データ品質とStagingの重要性
✓ スタースキーマ設計の考え方
✓ データエンジニアは意思決定支援エンジニアである

獲得バッジ: 「パイプライン設計者」「クエスト完走」
次のクエスト「解約率を下げろ」が解放されました！
```
