import type { Quest } from '@/types';

// ─── CSV Data ──────────────────────────────────────────────────────────────────
// MediCore：地域病院の患者データ基盤

export const RAW_PATIENTS = `patient_id,name,age,gender,blood_type,registered_at,insurance_type
P-001,田中 一郎,68,M,A,2023-01-10,national
P-002,佐藤 花子,45,F,O,2023-01-15,employee
P-003,鈴木 太郎,72,M,B,2023-01-20,national
P-004,高橋 美咲,33,F,AB,2023-02-01,employee
P-005,渡辺 健司,58,M,A,2023-02-10,national
P-006,伊藤 由美,41,F,O,2023-02-15,employee
P-007,山本 正雄,79,M,B,2023-03-01,national
P-008,中村 さくら,29,F,A,2023-03-10,employee
P-009,小林 武志,64,M,O,2023-03-20,national
P-010,加藤 明子,55,F,AB,2023-04-01,employee`;

export const RAW_ADMISSIONS = `admission_id,patient_id,department,diagnosis_code,admitted_at,discharged_at,readmitted,severity
A-001,P-001,内科,J18.1,2023-06-01,2023-06-08,false,moderate
A-002,P-003,外科,K40.9,2023-06-05,2023-06-12,false,mild
A-003,P-007,内科,I50.0,2023-06-10,2023-06-20,true,severe
A-004,P-005,整形外科,M17.1,2023-06-15,2023-06-22,false,mild
A-005,P-001,内科,J18.1,2023-07-01,2023-07-09,true,moderate
A-006,P-009,循環器科,I21.0,2023-07-05,2023-07-18,false,severe
A-007,P-007,内科,I50.0,2023-07-20,2023-08-01,true,severe
A-008,P-002,婦人科,N80.0,2023-08-01,2023-08-05,false,mild
A-009,P-004,外科,K35.8,2023-08-10,2023-08-14,false,moderate
A-010,P-006,内科,J06.9,2023-08-15,2023-08-17,false,mild`;

export const RAW_BILLING = `billing_id,admission_id,patient_id,total_amount,insurance_covered,patient_burden,billed_at,paid
B-001,A-001,P-001,280000,224000,56000,2023-06-10,true
B-002,A-002,P-003,420000,336000,84000,2023-06-15,true
B-003,A-003,P-007,980000,784000,196000,2023-06-22,true
B-004,A-004,P-005,350000,280000,70000,2023-06-28,false
B-005,A-005,P-001,300000,240000,60000,2023-07-12,true
B-006,A-006,P-009,1200000,960000,240000,2023-07-25,true
B-007,A-007,P-007,1050000,840000,210000,2023-08-05,false
B-008,A-008,P-002,180000,144000,36000,2023-08-08,true
B-009,A-009,P-004,250000,200000,50000,2023-08-17,true
B-010,A-010,P-006,95000,76000,19000,2023-08-20,true`;

export const MEDICAL_QUEST: Quest = {
  id: 'medical',
  title: '患者データ基盤を構築せよ',
  clientName: 'MediCore病院グループ',
  difficulty: 'intermediate',
  description: '地域病院チェーンの患者・入院・請求データを統合し、再入院率・診療科別収益を可視化するデータ基盤を構築します。',
  storyText: `MediCore病院グループ CIO 山田さんからメッセージが届いた。

「DataCraft Agencyさん、お力をお借りしたい。

当院では患者情報・入院記録・請求データが
システムごとにバラバラで管理されています。
再入院率が高い診療科を特定したいのですが、
データを横断して分析できる環境がありません。

3つのCSVデータをお送りします：patients / admissions / billing

このデータを統合して、再入院が多い診療科と
コスト分析ができるデータ基盤を構築してください。」`,
  estimatedMinutes: 180,
  requiredLevel: 3,
  tags: ['医療', '再入院分析', 'データガバナンス', '個人情報保護'],
  deConceptsCovered: [
    'パイプライン全体像（ELT）',
    'Source Layer',
    'Staging Layer（匿名化・型変換）',
    'Warehouse Layer（ファクト・ディメンション）',
    'Mart Layer（再入院率・診療科KPI）',
    'データガバナンスの基礎',
  ],
  csvFiles: [
    { name: 'patients', content: RAW_PATIENTS },
    { name: 'admissions', content: RAW_ADMISSIONS },
    { name: 'billing', content: RAW_BILLING },
  ],
  stages: [
    {
      id: 'pipeline',
      type: 'pipeline',
      title: 'パイプライン設計',
      gameType: 'rpg',
      conceptTaught: '医療データ基盤の設計：患者・入院・請求の3ソースを統合するパイプライン',
      missionText: `MediCore病院の医療データ基盤を設計してください。

3つのデータソース（患者情報・入院記録・請求データ）が
どのように流れるか、4層パイプラインを繋いで設計しましょう。`,
      hintText: '左から右へ: Source → Staging → Warehouse → Mart の順番で繋ぐ',
      storyMessage: `田中シニアエンジニア:
「医療データは3種類ある。
患者（誰が）・入院記録（いつ何で）・請求（いくら）。
この3つを繋げると初めて『再入院コスト』が計算できる。
全体の設計をまず決めろ。」`,
      validation: [],
      xpReward: { star1: 50, star2: 50, star3: 50 },
      badgeId: 'medical_architect',
      pipelineConfig: {
        layers: [
          { id: 'source', label: 'Source Layer', description: '生データをそのまま保持', color: '#6366f1', tables: ['src_patients', 'src_admissions', 'src_billing'], x: 40, y: 140 },
          { id: 'staging', label: 'Staging Layer', description: '匿名化・型変換・NULL処理', color: '#f59e0b', tables: ['stg_patients', 'stg_admissions', 'stg_billing'], x: 280, y: 140 },
          { id: 'warehouse', label: 'Warehouse Layer', description: '入院ファクト + 患者DIM', color: '#10b981', tables: ['fact_admissions', 'dim_patients', 'dim_departments'], x: 520, y: 140 },
          { id: 'mart', label: 'Mart Layer', description: '再入院率・診療科別KPI', color: '#f43f5e', tables: ['mart_readmission_rate', 'mart_dept_revenue'], x: 760, y: 140 },
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
      conceptTaught: 'Source層：患者・入院・請求データを生のまま格納',
      missionText: `MediCoreの3つのデータソースを Source Layer に格納してください。

医療データの特徴：
- 患者情報（個人属性・保険区分）
- 入院記録（診療科・診断コード・在院日数）
- 請求データ（医療費・保険カバー率）`,
      hintText: '各CSVを確認して、生データをそのまま格納しましょう',
      storyMessage: `田中シニアエンジニア:
「医療データは絶対に改変してはいけない。
生データはそのまま Source 層に保持する。
これが後でデータの証跡（監査証跡）になる。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'src_patients', message: 'src_patients が作成されていません' },
        { type: 'table_exists', table: 'src_admissions', message: 'src_admissions が作成されていません' },
        { type: 'table_exists', table: 'src_billing', message: 'src_billing が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'source_guardian',
    },
    {
      id: 'staging',
      title: 'Staging Layer',
      gameType: 'simulation',
      conceptTaught: 'Staging層：患者名のマスキング・日付型変換・在院日数の計算',
      missionText: `医療データ特有のクレンジングを行ってください。

主な課題：
- 患者名を匿名化（patient_id のみに）
- admitted_at / discharged_at を DATE 型に変換
- 在院日数（length_of_stay）を計算して追加`,
      hintText: "在院日数: DATEDIFF('day', admitted_at::DATE, discharged_at::DATE)",
      storyMessage: `田中シニアエンジニア:
「個人情報保護法上、分析時に患者名は不要だ。
Staging 層でマスキングして、以降のレイヤーには
patient_id しか流さない。これが医療データの鉄則だ。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'stg_patients', message: 'stg_patients が作成されていません' },
        { type: 'table_exists', table: 'stg_admissions', message: 'stg_admissions が作成されていません' },
        { type: 'table_exists', table: 'stg_billing', message: 'stg_billing が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'data_cleaner',
    },
    {
      id: 'warehouse',
      title: 'Warehouse Layer',
      gameType: 'boss',
      conceptTaught: '医療ファクトテーブル：入院を事実として捉え、患者・診療科をディメンションにする',
      missionText: `医療向けスタースキーマを設計してください。

- fact_admissions：入院の事実（在院日数・重症度・再入院フラグ）
- dim_patients：患者属性（年代・保険区分）
- dim_departments：診療科情報`,
      hintText: '入院の「事実」はいつ・誰が・どの診療科で・何日入院したか',
      storyMessage: `田中シニアエンジニア:
「医療のファクトは『入院』だ。
誰が（患者DIM）・どこで（診療科DIM）・何日（在院日数）——
これを組み合わせると再入院パターンが見えてくる。」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'fact_admissions', message: 'fact_admissions が作成されていません' },
        { type: 'table_exists', table: 'dim_patients', message: 'dim_patients が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'modeler',
    },
    {
      id: 'mart',
      title: 'Mart Layer + 再入院分析',
      gameType: 'decision',
      conceptTaught: 'Mart層：診療科別再入院率とコストを計算し、改善優先診療科を特定',
      missionText: `MediCore CIO への報告：

**「どの診療科で再入院が多く発生していますか？」**

診療科別の再入院率と平均在院日数を計算し、
医療の質改善が最も必要な診療科を特定してください。`,
      hintText: '再入院率 = 再入院数 ÷ 全入院数 × 100',
      storyMessage: `MediCore CIO:
「内科の再入院が多いと現場から聞いています。
データで診療科別の再入院率を出していただけますか？

また、再入院患者は初回入院より在院日数が長い傾向があると
思っているのですが——確認できますか？」`,
      initialTransform: '',
      validation: [
        { type: 'table_exists', table: 'mart_readmission_rate', message: 'mart_readmission_rate が作成されていません' },
      ],
      xpReward: { star1: 50, star2: 100, star3: 150 },
      badgeId: 'kpi_builder',
    },
  ],
};
