import type { Quest } from '@/types';

// ─── CSV Data ──────────────────────────────────────────────────────────────────
// CloudStack: SaaS企業（プロジェクト管理ツール）のサブスクリプションデータ

export const RAW_SUBSCRIPTIONS = `sub_id,user_id,plan,mrr,status,started_at,cancelled_at
S-001,U-1,pro,9800,active,2024-01-05,
S-002,U-2,starter,2980,cancelled,2024-01-10,2024-03-15
S-003,U-3,pro,9800,active,2024-01-12,
S-004,U-4,enterprise,29800,active,2024-01-15,
S-005,U-5,starter,2980,cancelled,2024-01-20,2024-02-28
S-006,U-6,starter,2980,active,2024-01-22,
S-007,U-7,pro,9800,cancelled,2024-02-01,2024-04-10
S-008,U-8,starter,2980,active,2024-02-05,
S-009,U-9,pro,9800,active,2024-02-10,
S-010,U-10,enterprise,29800,cancelled,2024-02-15,2024-04-30
S-011,U-11,starter,2980,active,2024-02-18,
S-012,U-12,starter,2980,cancelled,2024-03-01,2024-04-20
S-013,U-13,pro,9800,active,2024-03-05,
S-014,U-14,starter,2980,active,2024-03-10,
S-015,U-15,pro,9800,cancelled,2024-03-15,2024-05-01`;

export const RAW_USERS = `user_id,company_name,industry,team_size,country,registered_at
U-1,TechFlow Inc,SaaS,50,JP,2024-01-04
U-2,DesignCo,Creative,12,JP,2024-01-09
U-3,DataMind,Analytics,80,US,2024-01-11
U-4,GlobalOps,Logistics,500,JP,2024-01-14
U-5,StartupX,SaaS,8,JP,2024-01-19
U-6,MediaCraft,Media,35,JP,2024-01-21
U-7,CloudNine,SaaS,25,US,2024-01-31
U-8,RetailPlus,Retail,120,JP,2024-02-04
U-9,AIVentures,AI/ML,40,JP,2024-02-09
U-10,MegaCorp,Enterprise,1200,JP,2024-02-14
U-11,LocalBiz,Service,6,JP,2024-02-17
U-12,FreelanceHub,Platform,3,JP,2024-02-29
U-13,ScaleUp Inc,SaaS,90,US,2024-03-04
U-14,SmallTeam,Consulting,10,JP,2024-03-09
U-15,GrowthCo,Marketing,45,JP,2024-03-14`;

export const RAW_EVENTS = `event_id,user_id,event_type,feature,occurred_at
E-001,U-2,feature_use,dashboard,2024-02-15
E-002,U-2,login,null,2024-03-01
E-003,U-5,support_request,billing,2024-02-10
E-004,U-5,feature_use,export,2024-02-15
E-005,U-7,support_request,api,2024-03-15
E-006,U-7,feature_use,dashboard,2024-03-20
E-007,U-10,support_request,sso,2024-04-01
E-008,U-10,feature_use,api,2024-04-10
E-009,U-12,login,null,2024-04-01
E-010,U-15,support_request,billing,2024-04-15
E-011,U-15,feature_use,dashboard,2024-04-20
E-012,U-1,feature_use,api,2024-03-01
E-013,U-3,feature_use,export,2024-03-15
E-014,U-4,feature_use,sso,2024-04-01
E-015,U-6,feature_use,dashboard,2024-03-20`;

// ─── Quest Definition ──────────────────────────────────────────────────────────

export const SAAS_QUEST: Quest = {
  id: 'saas',
  title: '解約率を下げろ',
  clientName: 'CloudStack',
  difficulty: 'intermediate',
  description: 'SaaSプロダクトの解約率が急増。どのプランのユーザーが解約しているか？原因は何か？データで特定せよ。',
  storyText: `CloudStack CPO 佐藤さんからメッセージが届いた。

「DataCraft Agencyさん、大変困っています。

先月からチャーン（解約率）が急上昇しています。
starterプランを中心に解約が増えているようですが、
詳細なデータが手元にない。

Stripeのサブスクリプションデータ、
ユーザー属性データ、プロダクト利用ログ——
これらを統合して解約の原因を特定してほしい。

来月の取締役会でチャーン対策を発表しないといけない。」

CSVを3つ受け取った: subscriptions / users / events`,
  estimatedMinutes: 120,
  requiredLevel: 2,
  tags: ['SaaS', 'チャーン分析', 'MRR', 'コホート'],
  deConceptsCovered: [
    'パイプライン全体像（ELT）',
    'Source Layer',
    'Staging Layer（NULL処理・型変換）',
    'Warehouse Layer（ファクト・ディメンション）',
    'Mart Layer（MRR・チャーン率KPI）',
    'インクリメンタル処理の考え方',
  ],
  csvFiles: [
    { name: 'subscriptions', content: RAW_SUBSCRIPTIONS },
    { name: 'users', content: RAW_USERS },
    { name: 'events', content: RAW_EVENTS },
  ],
  stages: [
    {
      id: 'pipeline',
      type: 'pipeline',
      title: 'パイプライン設計',
      gameType: 'rpg',
      conceptTaught: 'SaaSデータ基盤の設計：サブスクリプション・ユーザー・イベントの3データソースを統合',
      missionText: `CloudStackのデータ基盤を設計してください。

3つのデータソース（サブスクリプション・ユーザー・イベント）が
どのように流れるか、4層パイプラインを繋いで設計しましょう。`,
      hintText: '左から右へ: Source → Staging → Warehouse → Mart の順番で繋ぐ',
      storyMessage: `田中シニアエンジニア:
「SaaSのデータは3種類ある。
サブスクリプション（課金）・ユーザー属性・プロダクトイベント。
この3つを統合して初めてチャーンの原因が見える。
まず全体の流れを設計しろ。」`,
      validation: [],
      xpReward: { star1: 50, star2: 50, star3: 50 },
      badgeId: 'saas_architect',
      pipelineConfig: {
        layers: [
          { id: 'source', label: 'Source Layer', description: '生データをそのまま保持', color: '#6366f1', tables: ['src_subscriptions', 'src_users', 'src_events'], x: 40, y: 140 },
          { id: 'staging', label: 'Staging Layer', description: 'NULL処理・型変換・正規化', color: '#f59e0b', tables: ['stg_subscriptions', 'stg_users', 'stg_events'], x: 280, y: 140 },
          { id: 'warehouse', label: 'Warehouse Layer', description: 'サブスクファクト + ユーザーDIM', color: '#10b981', tables: ['fact_subscriptions', 'dim_users', 'dim_plans'], x: 520, y: 140 },
          { id: 'mart', label: 'Mart Layer', description: 'MRR・チャーン率・コホート分析', color: '#f43f5e', tables: ['mart_churn_by_plan', 'mart_mrr_monthly'], x: 760, y: 140 },
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
      conceptTaught: 'Source層：Stripeデータ・ユーザー属性・イベントログを生のまま格納',
      missionText: `CloudStackの3つのデータソースを Source Layer に格納してください。

SaaSデータの特徴：
- サブスクリプションデータ（課金の事実）
- ユーザー属性データ（会社情報・規模）
- イベントログ（プロダクト利用記録）`,
      hintText: '各CSVを確認して、生データをそのまま格納しましょう',
      storyMessage: `田中シニアエンジニア:
「SaaSの場合、データソースが複数ある。
Stripe（課金）・CRM（ユーザー）・プロダクトログ——
まず全部そのまま取り込む。手を加えるのは後だ。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'src_subscriptions', message: 'src_subscriptions が作成されていません' },
        { type: 'table_exists', table: 'src_users', message: 'src_users が作成されていません' },
        { type: 'table_exists', table: 'src_events', message: 'src_events が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'source_guardian',
    },
    {
      id: 'staging',
      title: 'Staging Layer',
      gameType: 'simulation',
      conceptTaught: 'Staging層：cancelled_atのNULL処理・プラン名の正規化・日付型変換',
      missionText: `SaaSデータ特有の問題を解決してください。

主な課題：
- cancelled_at が空文字 vs NULL の混在
- plan名の表記統一
- 日付型への変換`,
      hintText: "cancelled_at が空文字の場合は NULL として扱う: NULLIF(cancelled_at, '')",
      storyMessage: `田中シニアエンジニア:
「SaaSデータの厄介な点は cancelled_at だ。
解約していないユーザーはこの列が空——
空文字なのかNULLなのか、CSVによってバラバラだ。
きちんとNULLに統一しないとチャーン計算が狂う。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'stg_subscriptions', message: 'stg_subscriptions が作成されていません' },
        { type: 'table_exists', table: 'stg_users', message: 'stg_users が作成されていません' },
        { type: 'table_exists', table: 'stg_events', message: 'stg_events が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'data_cleaner',
    },
    {
      id: 'warehouse',
      title: 'Warehouse Layer',
      gameType: 'boss',
      conceptTaught: 'SaaSファクトテーブル：サブスクリプションの状態変化をファクトとして捉える',
      missionText: `SaaS向けスタースキーマを設計してください。

- fact_subscriptions：サブスクリプションの事実
- dim_users：顧客属性（会社規模・業界）
- dim_plans：プラン情報（価格・機能）`,
      hintText: 'SaaSではサブスクリプションの「状態」がファクトになる',
      storyMessage: `田中シニアエンジニア:
「SaaSのモデリングはECと少し違う。
注文（点）じゃなくて、サブスクリプション（期間）がファクトだ。
started_at と cancelled_at の差がそのまま利用期間になる。
チャーンを計算するにはこの期間情報が必要だ。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'fact_subscriptions', message: 'fact_subscriptions が作成されていません' },
        { type: 'table_exists', table: 'dim_users', message: 'dim_users が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'modeler',
    },
    {
      id: 'mart',
      title: 'Mart Layer + チャーン分析',
      gameType: 'decision',
      conceptTaught: 'Mart層：プラン別チャーン率とMRRを計算し、解約の多いプランを特定',
      missionText: `佐藤CPOへの報告：

**「どのプランで最も解約が発生していますか？」**

プラン別チャーン率テーブルを作り、
解約が集中しているプランを特定してください。`,
      hintText: 'チャーン率 = 解約数 ÷ 全体数 × 100',
      storyMessage: `佐藤さん（CPO）:
「starterプランが危ないと思っているのですが、
データで証明できますか？

プラン別のチャーン率と、
解約したユーザーはどんな会社規模が多いか——
それが分かれば対策が打てます。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'mart_churn_by_plan', message: 'mart_churn_by_plan が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'kpi_builder',
    },
  ],
};
