import type { DbtProject } from './index';
import { RAW_ORDERS, RAW_USERS, RAW_PRODUCTS } from '@/lib/scenarios/ec-site';

export const EC_SITE_DBT_PROJECT: DbtProject = {
  name: 'shopnow_analytics',
  version: '1.0.0',
  sources: [
    {
      name: 'raw',
      tables: [
        { name: 'orders',   description: 'ECサイトの注文データ（生データ）' },
        { name: 'users',    description: 'ユーザーマスタ（生データ）' },
        { name: 'products', description: '商品マスタ（生データ）' },
      ],
    },
  ],
  seeds: {
    orders:   RAW_ORDERS,
    users:    RAW_USERS,
    products: RAW_PRODUCTS,
  },
  models: [
    // ── Staging ───────────────────────────────────────────────────────────────
    {
      name: 'stg_orders',
      folder: 'staging',
      materialization: 'table',
      description: '注文データのクレンジング（NULL除去・型変換・status統一）',
      sql: `{{ config(materialized='table') }}

-- ポイント: source() で生データを参照
-- クレンジングの責務はこのモデルだけが持つ
SELECT
    order_id,
    user_id,
    product_id,
    COALESCE(TRY_CAST(amount AS INTEGER), 0)  AS amount,
    LOWER(TRIM(status))                        AS status,
    CAST(created_at AS TIMESTAMP)              AS created_at,
    CURRENT_TIMESTAMP                          AS _dbt_loaded_at
FROM {{ source('raw', 'orders') }}`,
    },
    {
      name: 'stg_users',
      folder: 'staging',
      materialization: 'table',
      description: 'ユーザーデータのクレンジング（email小文字化・日付変換）',
      sql: `{{ config(materialized='table') }}

SELECT
    user_id,
    TRIM(name)                  AS name,
    LOWER(TRIM(email))          AS email,
    CAST(registered_at AS DATE) AS registered_at,
    CURRENT_TIMESTAMP           AS _dbt_loaded_at
FROM {{ source('raw', 'users') }}`,
    },
    {
      name: 'stg_products',
      folder: 'staging',
      materialization: 'table',
      description: '商品データのクレンジング（category小文字統一）',
      sql: `{{ config(materialized='table') }}

SELECT
    product_id,
    name,
    LOWER(TRIM(category)) AS category,
    CAST(price AS INTEGER) AS price,
    CURRENT_TIMESTAMP      AS _dbt_loaded_at
FROM {{ source('raw', 'products') }}`,
    },

    // ── Warehouse ─────────────────────────────────────────────────────────────
    {
      name: 'fct_orders',
      folder: 'warehouse',
      materialization: 'table',
      description: '完了注文のFact Table。ref() でstg_ordersに依存。',
      sql: `{{ config(materialized='table') }}

-- Fact Table: スタースキーマの中心テーブル
-- ポイント: ref('stg_orders') で上流モデルを参照
--           completed のみ抽出（分析対象を絞る）
SELECT
    order_id,
    user_id,
    product_id,
    amount,
    CAST(created_at AS DATE) AS order_date
FROM {{ ref('stg_orders') }}
WHERE status = 'completed'`,
    },
    {
      name: 'dim_users',
      folder: 'warehouse',
      materialization: 'table',
      description: 'ユーザー Dimension Table',
      sql: `{{ config(materialized='table') }}

-- Dimension Table: ユーザー属性
SELECT
    user_id,
    name,
    email,
    registered_at
FROM {{ ref('stg_users') }}`,
    },
    {
      name: 'dim_products',
      folder: 'warehouse',
      materialization: 'table',
      description: '商品 Dimension Table',
      sql: `{{ config(materialized='table') }}

-- Dimension Table: 商品属性
SELECT
    product_id,
    name,
    category,
    price
FROM {{ ref('stg_products') }}`,
    },

    // ── Mart ──────────────────────────────────────────────────────────────────
    {
      name: 'mart_daily_sales',
      folder: 'mart',
      materialization: 'table',
      description: '日別売上KPI（経営会議用）。fct_ordersから集計。',
      sql: `{{ config(materialized='table') }}

-- Mart: 経営会議用の日別売上サマリー
-- Warehouse の Fact Table から集計 → BIツールで直接使える
SELECT
    order_date,
    COUNT(*)                AS order_count,
    SUM(amount)             AS total_sales,
    ROUND(AVG(amount), 0)   AS avg_order_value,
    COUNT(DISTINCT user_id) AS unique_customers
FROM {{ ref('fct_orders') }}
GROUP BY order_date
ORDER BY order_date`,
    },
    {
      name: 'mart_product_revenue',
      folder: 'mart',
      materialization: 'table',
      description: '商品別売上ランキング。Fact + Dimensionをref()でJOIN。',
      sql: `{{ config(materialized='table') }}

-- Mart: 商品・カテゴリ別売上ランキング
-- ポイント: fct_orders と dim_products を JOIN して集計
--           Warehouse を正規化しておくことで集計が楽になる
SELECT
    p.category,
    p.name                   AS product_name,
    p.price,
    COUNT(*)                 AS order_count,
    SUM(o.amount)            AS total_revenue,
    ROUND(
      SUM(o.amount) * 100.0
        / SUM(SUM(o.amount)) OVER (),
      1
    )                        AS revenue_share_pct
FROM {{ ref('fct_orders') }} o
JOIN {{ ref('dim_products') }} p USING (product_id)
GROUP BY p.category, p.name, p.price
ORDER BY total_revenue DESC`,
    },
  ],
  tests: [
    { model: 'stg_orders',   column: 'order_id',   type: 'not_null' },
    { model: 'stg_orders',   column: 'order_id',   type: 'unique' },
    { model: 'stg_orders',   column: 'amount',     type: 'not_null' },
    { model: 'stg_orders',   column: 'status',     type: 'accepted_values', values: ['completed', 'cancelled', 'pending'] },
    { model: 'fct_orders',   column: 'order_id',   type: 'not_null' },
    { model: 'fct_orders',   column: 'order_id',   type: 'unique' },
    { model: 'dim_users',    column: 'user_id',    type: 'not_null' },
    { model: 'dim_users',    column: 'user_id',    type: 'unique' },
    { model: 'dim_products', column: 'product_id', type: 'not_null' },
    { model: 'dim_products', column: 'product_id', type: 'unique' },
  ],
};
