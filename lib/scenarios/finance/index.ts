import type { Quest } from '@/types';

// ─── CSV Data ──────────────────────────────────────────────────────────────────
// FinEdge：フィンテック企業の取引リスク分析基盤

export const RAW_ACCOUNTS = `account_id,user_id,account_type,balance,currency,country,risk_tier,opened_at
ACC-001,U-001,checking,2450000,JPY,JP,low,2022-01-10
ACC-002,U-002,savings,890000,JPY,JP,low,2022-02-15
ACC-003,U-003,checking,15600000,JPY,JP,medium,2022-03-01
ACC-004,U-004,investment,48000000,JPY,JP,high,2022-03-20
ACC-005,U-005,checking,320000,JPY,JP,low,2022-04-05
ACC-006,U-006,savings,7800000,JPY,JP,medium,2022-05-10
ACC-007,U-007,checking,125000,JPY,JP,low,2022-06-01
ACC-008,U-008,investment,92000000,JPY,JP,high,2022-07-15
ACC-009,U-009,checking,5400000,JPY,JP,medium,2022-08-20
ACC-010,U-010,savings,1200000,JPY,JP,low,2022-09-01`;

export const RAW_TRANSACTIONS = `txn_id,account_id,txn_type,amount,merchant_category,country,device,timestamp,flagged
T-001,ACC-001,purchase,45000,retail,JP,mobile,2024-01-05 09:12:00,false
T-002,ACC-003,transfer,2000000,transfer,JP,web,2024-01-05 14:30:00,false
T-003,ACC-004,purchase,890000,luxury,HK,unknown,2024-01-06 02:15:00,true
T-004,ACC-001,purchase,12000,food,JP,mobile,2024-01-07 12:05:00,false
T-005,ACC-008,transfer,5000000,transfer,SG,web,2024-01-08 08:00:00,true
T-006,ACC-005,purchase,3200,convenience,JP,mobile,2024-01-09 18:22:00,false
T-007,ACC-003,withdrawal,500000,atm,JP,atm,2024-01-10 11:30:00,false
T-008,ACC-004,purchase,2400000,luxury,US,unknown,2024-01-11 03:45:00,true
T-009,ACC-009,purchase,78000,electronics,JP,web,2024-01-12 20:10:00,false
T-010,ACC-008,transfer,8000000,transfer,CN,mobile,2024-01-13 01:20:00,true`;

export const RAW_ALERTS = `alert_id,txn_id,account_id,alert_type,severity,created_at,resolved_at,resolution
AL-001,T-003,ACC-004,unusual_location,high,2024-01-06 02:16:00,2024-01-06 10:00:00,false_positive
AL-002,T-005,ACC-008,large_transfer,high,2024-01-08 08:01:00,,pending
AL-003,T-008,ACC-004,unusual_location,critical,2024-01-11 03:46:00,2024-01-11 12:00:00,confirmed_fraud
AL-004,T-010,ACC-008,unusual_location,critical,2024-01-13 01:21:00,,pending`;

export const FINANCE_QUEST: Quest = {
  id: 'finance',
  title: '金融リスクを検出せよ',
  clientName: 'FinEdge株式会社',
  difficulty: 'advanced',
  description: 'フィンテック企業の取引・口座・アラートデータを統合し、不正検知・リスクスコア分布を可視化するデータ基盤を構築します。',
  storyText: `FinEdge株式会社 CTO 黒田さんからメッセージが届いた。

「DataCraft Agencyさん、緊急で相談があります。

当社のフィンテックサービスでは毎日数万件の取引が発生しますが、
不正取引の検出が後手に回っています。

口座データ・取引ログ・アラート記録の3つのCSVをお送りします：
accounts / transactions / alerts

これらを統合して、不正率が高い口座タイプを特定し、
リスクスコアを可視化できるデータ基盤を構築してください。
来週のコンプライアンス委員会に間に合わせてほしい。」`,
  estimatedMinutes: 240,
  requiredLevel: 5,
  tags: ['金融', '不正検知', 'リスク分析', 'PCI DSS', 'コンプライアンス'],
  deConceptsCovered: [
    'パイプライン全体像（ELT）',
    'Source Layer（監査証跡の重要性）',
    'Staging Layer（マスキング・型変換）',
    'Warehouse Layer（取引ファクト・口座DIM）',
    'Mart Layer（リスクスコア・不正検知KPI）',
    'データリネージとコンプライアンス',
  ],
  csvFiles: [
    { name: 'accounts', content: RAW_ACCOUNTS },
    { name: 'transactions', content: RAW_TRANSACTIONS },
    { name: 'alerts', content: RAW_ALERTS },
  ],
  stages: [
    {
      id: 'pipeline',
      type: 'pipeline',
      title: 'パイプライン設計',
      gameType: 'rpg',
      conceptTaught: '金融データ基盤の設計：口座・取引・アラートの3ソースを統合するパイプライン',
      missionText: `FinEdgeのリスク分析基盤を設計してください。

3つのデータソース（口座情報・取引記録・アラート）が
どのように流れるか、4層パイプラインを繋いで設計しましょう。`,
      hintText: '左から右へ: Source → Staging → Warehouse → Mart の順番で繋ぐ',
      storyMessage: `田中シニアエンジニア:
「金融データは3つある。
口座（誰の）・取引（何が起きた）・アラート（疑わしいか）。
この3つを繋げると不正のパターンが見えてくる。
まず全体の設計から始めよう。」`,
      validation: [],
      xpReward: { star1: 50, star2: 50, star3: 50 },
      badgeId: 'finance_architect',
      pipelineConfig: {
        layers: [
          { id: 'source', label: 'Source Layer', description: '生データをそのまま保持（監査証跡）', color: '#6366f1', tables: ['src_accounts', 'src_transactions', 'src_alerts'], x: 40, y: 140 },
          { id: 'staging', label: 'Staging Layer', description: 'マスキング・型変換・リスクフラグ', color: '#f59e0b', tables: ['stg_accounts', 'stg_transactions', 'stg_alerts'], x: 280, y: 140 },
          { id: 'warehouse', label: 'Warehouse Layer', description: '取引ファクト + 口座DIM', color: '#10b981', tables: ['fact_transactions', 'dim_accounts', 'dim_merchants'], x: 520, y: 140 },
          { id: 'mart', label: 'Mart Layer', description: 'リスクスコア・不正検知KPI', color: '#f43f5e', tables: ['mart_risk_score', 'mart_fraud_summary'], x: 760, y: 140 },
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
      conceptTaught: 'Source層：金融データを生のまま格納（改ざん防止・監査証跡）',
      missionText: `FinEdgeの3つのデータソースを Source Layer に格納してください。

金融データの特徴：
- 口座情報（残高・リスクティア・開設日）
- 取引記録（金額・カテゴリ・デバイス・フラグ）
- アラート（不審取引の検知記録）`,
      hintText: '各CSVを確認して、生データをそのまま格納しましょう',
      storyMessage: `田中シニアエンジニア:
「金融規制（PCI DSS）では生データの改ざんが厳禁だ。
Source 層は読み取り専用のアーカイブとして扱う。
ここのデータが監査時の証拠になる。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'src_accounts', message: 'src_accounts が作成されていません' },
        { type: 'table_exists', table: 'src_transactions', message: 'src_transactions が作成されていません' },
        { type: 'table_exists', table: 'src_alerts', message: 'src_alerts が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'source_guardian',
    },
    {
      id: 'staging',
      title: 'Staging Layer',
      gameType: 'simulation',
      conceptTaught: 'Staging層：口座番号マスキング・タイムゾーン正規化・リスクフラグの型変換',
      missionText: `金融データ特有のクレンジングを行ってください。

主な課題：
- 残高を整数型として正規化
- timestampを UTC に統一
- 海外取引フラグ（is_overseas）を追加
- flagged を BOOLEAN 型に変換`,
      hintText: "海外取引フラグ: CASE WHEN country != 'JP' THEN true ELSE false END",
      storyMessage: `田中シニアエンジニア:
「不正の多くは海外からの取引だ。
Staging 層で is_overseas フラグを計算しておくと
後の分析が楽になる。
また時刻はすべて UTC に統一しないと
タイムゾーンをまたぐ集計が狂う。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'stg_accounts', message: 'stg_accounts が作成されていません' },
        { type: 'table_exists', table: 'stg_transactions', message: 'stg_transactions が作成されていません' },
        { type: 'table_exists', table: 'stg_alerts', message: 'stg_alerts が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'data_cleaner',
    },
    {
      id: 'warehouse',
      title: 'Warehouse Layer',
      gameType: 'boss',
      conceptTaught: '金融ファクトテーブル：取引を事実として捉え、口座・加盟店をディメンションにする',
      missionText: `金融向けスタースキーマを設計してください。

- fact_transactions：取引の事実（金額・リスクフラグ・海外フラグ）
- dim_accounts：口座属性（タイプ・リスクティア）
- dim_merchants：加盟店カテゴリ情報`,
      hintText: '取引の「事実」はいつ・どの口座から・いくら・どのカテゴリで',
      storyMessage: `田中シニアエンジニア:
「金融のファクトは『取引』だ。
誰の口座から（口座DIM）・何を買った（加盟店DIM）・
いくら（金額）・フラグ付き（リスク）——
これを組み合わせると不正パターンが浮かび上がる。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'fact_transactions', message: 'fact_transactions が作成されていません' },
        { type: 'table_exists', table: 'dim_accounts', message: 'dim_accounts が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'modeler',
    },
    {
      id: 'mart',
      title: 'Mart Layer + リスク分析',
      gameType: 'decision',
      conceptTaught: 'Mart層：口座別リスクスコアと不正検知サマリーを計算して経営判断を支援',
      missionText: `FinEdge CTO への報告：

**「どの口座タイプで不正が最も多く発生していますか？」**

口座タイプ・リスクティア別の不正率を計算し、
重点監視対象を特定してください。`,
      hintText: '不正率 = フラグ付き取引数 ÷ 全取引数 × 100',
      storyMessage: `FinEdge CTO:
「ハイリスク口座の取引監視を強化したいのですが、
実際に不正率が高いのはどの口座タイプですか？

海外取引とフラグ付き取引の相関も気になっています。
投資口座 vs 普通口座で傾向が違うはずです。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'mart_risk_score', message: 'mart_risk_score が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'kpi_builder',
    },
  ],
};
