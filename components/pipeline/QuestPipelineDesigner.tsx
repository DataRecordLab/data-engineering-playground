'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { PipelineLayerConfig } from '@/types';
import { ReflectionQuestion } from '@/components/stage/ReflectionQuestion';

// ─── アーキテクチャパターン ────────────────────────────────────────────────────

interface ArchPattern {
  id: 'standard' | 'lightweight' | 'etl';
  name: string;
  subtitle: string;
  layers: string[];
  connections: Array<{ from: string; to: string }>;
  pros: string[];
  cons: string[];
  color: string;
  finalReflection: {
    question: string;
    options: Array<{ label: string; correct: boolean; explanation: string }>;
  };
}

const ARCHITECTURE_PATTERNS: ArchPattern[] = [
  {
    id: 'standard',
    name: '4層 Standard',
    subtitle: 'Source → Staging → Warehouse → Mart',
    layers: ['source', 'staging', 'warehouse', 'mart'],
    connections: [
      { from: 'source', to: 'staging' },
      { from: 'staging', to: 'warehouse' },
      { from: 'warehouse', to: 'mart' },
    ],
    pros: ['完全な監査証跡（生データが常に残る）', 'ディメンショナルモデリングで高速クエリ', 'レイヤーごとに責任が明確'],
    cons: ['実装コストが高い', 'レイヤーが多い分レイテンシが長い'],
    color: '#6366f1',
    finalReflection: {
      question: 'このパイプラインでは Source に生データを置き、変換は Staging 以降で行う「ELT」方式を採用しました。なぜ「先に変換してから格納する ETL」ではなく ELT を選んだのですか？',
      options: [
        { label: 'ETL はエラーが多くて使い物にならないから', correct: false, explanation: 'ETL が「ダメ」なわけではありません。ELT が主流になった理由は「クラウド DWH の処理能力向上」と「変換ロジックを DWH 内で管理できる柔軟性」です。' },
        { label: 'ELT の方が設定ファイルが少なくて済むから', correct: false, explanation: '設定量は主な理由ではありません。ELT が選ばれる理由は「生データをまず保持して原本を守る」こと、そして「変換を後からやり直せる再現性」を確保できるからです。' },
        { label: 'クラウド DWH の処理能力が上がり、ロード後に DWH 内で変換するほうが速く・柔軟になったから', correct: true, explanation: '✓ 正解！ETL は処理能力が低かった時代の手法です。現代の DWH（BigQuery・Snowflake 等）は大量データを高速処理できるため、まず生データをロード（EL）し、DWH 内で変換（T）するほうが再利用性・柔軟性が高くなります。' },
      ],
    },
  },
  {
    id: 'lightweight',
    name: '3層 Lightweight',
    subtitle: 'Source → Staging → Mart',
    layers: ['source', 'staging', 'mart'],
    connections: [
      { from: 'source', to: 'staging' },
      { from: 'staging', to: 'mart' },
    ],
    pros: ['シンプルで素早く分析を開始できる', 'スモールチーム向け・実装コストが低い'],
    cons: ['ディメンショナルモデリングなし', 'データ量増加でスケールしにくい'],
    color: '#f59e0b',
    finalReflection: {
      question: 'Lightweight パターンで Warehouse Layer をスキップしました。このトレードオフとして最も重要なリスクはどれですか？',
      options: [
        { label: 'Staging Layer のコストが増える', correct: false, explanation: 'Staging は 4 層でも 3 層でも存在します。Lightweight のリスクはコストではなくスケーラビリティです。' },
        { label: 'Source Layer にデータが届かなくなる', correct: false, explanation: 'Source Layer は独立しており、パターンに関係なく正常に動作します。' },
        { label: 'データ量が増えると Mart 直接集計のクエリが重くなり、スタースキーマによる最適化ができない', correct: true, explanation: '✓ 正解！Staging → Mart 直結は素早く始められますが、データが増えるとクエリが重くなります。成長したらリファクタリングが必要です。' },
      ],
    },
  },
  {
    id: 'etl',
    name: '3層 ETL Style',
    subtitle: 'Source → Warehouse → Mart',
    layers: ['source', 'warehouse', 'mart'],
    connections: [
      { from: 'source', to: 'warehouse' },
      { from: 'warehouse', to: 'mart' },
    ],
    pros: ['ETL ツール（Talend・Fivetran 等）利用時に自然な構成'],
    cons: ['生データが変換後にしか残らない', '再処理・デバッグが困難', 'Staging での品質チェックがない'],
    color: '#10b981',
    finalReflection: {
      question: 'ETL パターンでは Staging Layer がなく、変換しながら Warehouse に格納します。最大のリスクはどれですか？',
      options: [
        { label: 'Warehouse が大きくなりすぎてコストがかかる', correct: false, explanation: 'ストレージコストより「再実行できない」ことのほうが重大なリスクです。' },
        { label: '変換処理にバグがあっても生データが残っておらず、元のデータから再処理できない', correct: true, explanation: '✓ 正解！ETL はパイプライン失敗時に「元データがない」状態になります。ELT（Source に生データを保持）なら、変換ロジックを修正して再実行できます。' },
        { label: '分析クエリが遅くなる', correct: false, explanation: 'クエリ速度は Mart 層の設計で決まります。ETL の主なリスクは「原本データが残らないため再処理できないこと」です。' },
      ],
    },
  },
];

// ─── クエストシナリオ（ランダムで出題）─────────────────────────────────────────

interface QuestScenario {
  id: string;
  badge: string;
  client: string;
  situation: string;
  requirements: Array<{ icon: string; text: string }>;
  keyQuestion: string;
  keyOptions: Array<{ label: string; correct: boolean; feedback: string }>;
  correctPatternId: 'standard' | 'lightweight' | 'etl';
  patternReason: string;
}

const QUEST_SCENARIOS: QuestScenario[] = [
  {
    id: 'enterprise',
    badge: '🏢 エンタープライズ',
    client: '大手 EC プラットフォーム（月間受注 100 万件）',
    situation: 'データ基盤の整備が急務。コンプライアンス部門から「全データ変換の監査証跡が必要」と指示あり。将来的に ML チームが分析データを使う予定。',
    requirements: [
      { icon: '⚖️', text: '全変換の監査証跡が法的に必要（生データを加工前に保持すること）' },
      { icon: '🧹', text: '受注データに NULL・型の不整合が多くクレンジングが必須' },
      { icon: '🤖', text: '6 ヶ月後に ML チームがスタースキーマで学習データを取得する予定' },
      { icon: '👥', text: 'エンジニア 8 名・開発期間 6 ヶ月' },
    ],
    keyQuestion: '「全変換の監査証跡が法的に必要」という要件を満たすためには何が必要？',
    keyOptions: [
      { label: '変換前の生データを別のレイヤー（Source）に必ず保持する', correct: true, feedback: '✓ 正解！生データを Source Layer に残しておくことで、変換処理を後から再実行でき、「いつ・どのデータが・どう変換されたか」の証跡が取れます。これが ELT アーキテクチャの根拠です。' },
      { label: '変換と格納を同時に行うことで処理ステップを最小化する', correct: false, feedback: '✗ 変換と同時に格納すると「変換前の原本データ」が消えます。監査証跡が取れないため、このクライアントのコンプライアンス要件に違反します。' },
      { label: 'Mart Layer で全変換ログを記録する', correct: false, feedback: '✗ Mart はビジネス向けの集計テーブルです。変換ログを Mart に置くと責任が混在します。原本保持のためには Source Layer の分離が必要です。' },
    ],
    correctPatternId: 'standard',
    patternReason: '監査証跡要件・クレンジング必須・スタースキーマ需要がある → 4層 Standard が最適です。',
  },
  {
    id: 'startup',
    badge: '🚀 スタートアップ',
    client: '立ち上げ 3 ヶ月の EC スタートアップ',
    situation: 'エンジニア 2 名で MVP を構築中。とにかく 3 週間で KPI ダッシュボードを本番稼働させたい。データ量は月 1,000 件程度で、ML 活用は 1 年以上先の話。',
    requirements: [
      { icon: '⚡', text: '3 週間でダッシュボードを本番稼働させること' },
      { icon: '👤', text: 'エンジニア 2 名しかいない（複雑なアーキテクチャは維持できない）' },
      { icon: '📦', text: 'データ量は月 1,000 件程度（スケール問題は当面ない）' },
      { icon: '🔮', text: 'ML・高度な分析は 1 年以上先の話（今は不要）' },
    ],
    keyQuestion: 'この状況で「4層 Standard（全レイヤー構築）」を選ぶとどうなる？',
    keyOptions: [
      { label: '最初から完璧な基盤を作れるので長期的に正解だ', correct: false, feedback: '✗ YAGNI（You Aren\'t Gonna Need It）原則。2 名・3 週間で 4 層を実装するとリリースが遅れ、ビジネスチャンスを逃します。必要になった時点で拡張する方が現実的です。' },
      { label: 'オーバーエンジニアリングになり、3 週間では完成しない', correct: true, feedback: '✓ 正解！スモールスタートで価値を早く届けることが重要です。データが増えた時点で Warehouse を追加する段階的な設計が、このフェーズでは最適解です。' },
      { label: '4 層があれば人数が少なくても問題ない', correct: false, feedback: 'アーキテクチャの層が増えるほど実装・運用の工数は増えます。2 名では過剰な負荷になります。' },
    ],
    correctPatternId: 'lightweight',
    patternReason: 'スピード最優先・少人数・小規模データ → 3層 Lightweight が最適です。',
  },
  {
    id: 'fivetran',
    badge: '🔧 ETL ツール活用',
    client: '中規模 EC 企業（Fivetran 導入済み）',
    situation: 'Fivetran を使って受注・在庫・顧客データを自動同期中。Fivetran 側でデータクレンジング・型変換を担当し、DWH に届く時点ですでにクリーンな状態になっている。',
    requirements: [
      { icon: '🔄', text: 'Fivetran がデータのクレンジング・型変換を担当（クリーンなデータが届く）' },
      { icon: '🚫', text: 'DWH に届いた後で二重にクレンジングする必要はない' },
      { icon: '🏗️', text: 'ETL パイプラインはすでに安定稼働しており変更したくない' },
      { icon: '💾', text: 'データを DWH に格納してからモデリングしたい' },
    ],
    keyQuestion: 'Fivetran がすでに「クレンジング済みデータ」を DWH に送っている場合、Staging Layer の役割は？',
    keyOptions: [
      { label: 'Fivetran が担当しているため、別途 Staging Layer は不要', correct: true, feedback: '✓ 正解！ETL ツールがすでに変換・クレンジングを担当しているなら、パイプライン内で Staging を重複して作るのは無駄です。ツールに任せ、DWH にクリーンなデータを直接格納するのが合理的です。' },
      { label: '念のため Staging も作って二重チェックする', correct: false, feedback: '✗ 二重クレンジングはコストと複雑さを増すだけです。Fivetran が信頼できるなら省略が合理的です。「念のため」で増やした層は技術的負債になります。' },
      { label: 'Source と Warehouse の間には必ず Staging が必要', correct: false, feedback: '✗「常に Staging が必要」というルールはありません。変換の責任をどこが持つかによって設計は変わります。ETL ツールを使う場合は Staging は省略可能です。' },
    ],
    correctPatternId: 'etl',
    patternReason: 'ETL ツールが変換担当・Staging 不要・DWH 直格納 → 3層 ETL Style が最適です。',
  },
];

// ─── Layer Options ─────────────────────────────────────────────────────────────

interface LayerOption {
  id: string;
  label: string;
  sublabel: string;
  description: string;
  isDataLayer: boolean;
  color: string;
  wrongFeedback?: string;
  correctFeedback?: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    id: 'source', label: 'Source Layer', sublabel: '生データ保持層',
    description: '外部から受け取ったデータをそのまま保持する',
    isDataLayer: true, color: '#6366f1',
    correctFeedback: '✓ 正解！Source 層はパイプラインの起点。原本を加工せず保持することで、処理が失敗してもやり直せます。',
  },
  {
    id: 'staging', label: 'Staging Layer', sublabel: 'データ品質保証層',
    description: '型変換・表記揺れ修正・NULL 処理を行う',
    isDataLayer: true, color: '#f59e0b',
    correctFeedback: '✓ 正解！Staging 層は「汚いデータを下流に流さない」フィルター。ここでの品質保証が全分析の信頼性を決めます。',
  },
  {
    id: 'warehouse', label: 'Warehouse Layer', sublabel: 'データモデリング層',
    description: 'スタースキーマ等でデータを構造化し分析を高速化',
    isDataLayer: true, color: '#10b981',
    correctFeedback: '✓ 正解！Warehouse 層で Fact/Dim テーブルに整理することで、あらゆる分析クエリに対応できる構造を作ります。',
  },
  {
    id: 'mart', label: 'Mart Layer', sublabel: 'KPI 提供層',
    description: '特定ビジネス用途に特化した KPI 集計テーブルを提供',
    isDataLayer: true, color: '#f43f5e',
    correctFeedback: '✓ 正解！Mart 層は Warehouse から各チーム向けに絞ったデータを提供。Excel で集計する作業がなくなります。',
  },
  {
    id: 'cdc', label: 'CDC パイプライン', sublabel: 'Change Data Capture',
    description: 'DB の変更ログをリアルタイムで捕捉・転送する仕組み',
    isDataLayer: false, color: '#64748b',
    wrongFeedback: '✗ CDC（Change Data Capture）はデータの取り込み「手法」です。Layer ではなく、Source Layer に取り込む際に使うテクニック・ツールです。',
  },
  {
    id: 'catalog', label: 'データカタログ', sublabel: 'メタデータ管理',
    description: 'テーブル・カラムの定義・オーナー・品質を管理するメタデータシステム',
    isDataLayer: false, color: '#64748b',
    wrongFeedback: '✗ データカタログはメタデータ管理ツールであり、データが流れるパイプラインの「Layer」ではありません。Atlan・DataHub 等のツールがこれに該当します。',
  },
  {
    id: 'oltp', label: 'OLTP データベース', sublabel: 'トランザクション DB',
    description: 'アプリの書き込み処理に使う DB（MySQL・PostgreSQL 等）',
    isDataLayer: false, color: '#64748b',
    wrongFeedback: '✗ OLTP はパイプラインの「レイヤー」ではありません。データの「生成元（入力元）」です。Source 層への入力になりますが、パイプライン構成要素ではありません。',
  },
];

// ─── Connection Quizzes ────────────────────────────────────────────────────────

const CONNECTION_QUIZ: Record<string, {
  question: string;
  options: Array<{ label: string; correct: boolean; explanation: string }>;
}> = {
  'source-staging': {
    question: 'Source → Staging にデータを流す理由は？',
    options: [
      { label: 'Staging がないとデータベースへの書き込みが遅くなるから', correct: false, explanation: '不正解。速度は Warehouse/Mart の問題です。Source→Staging の分離は「データ品質の責任分離」のためです。' },
      { label: 'クラウドサービスの料金プランでそう決まっているから', correct: false, explanation: '不正解。これは特定ツールの制約ではなく、データエンジニアリングのベストプラクティスです。' },
      { label: 'Source の生データを汚さず、別レイヤーでクレンジングするため', correct: true, explanation: '✓ 正解！Source は「原本保護」が目的。変換・整形を Staging に任せることで、元データをいつでも参照できます。' },
    ],
  },
  'staging-warehouse': {
    question: 'Staging を経由してから Warehouse に流す理由は？',
    options: [
      { label: 'Warehouse は CSV ファイルしか読めないから', correct: false, explanation: '不正解。形式の問題ではありません。Staging を挟むのはデータ品質保証のためです。' },
      { label: '汚いデータのままモデリングすると、分析の信頼性が失われるから', correct: true, explanation: '✓ 正解！「Garbage in, Garbage out」。クレンジングなしのスタースキーマは集計結果が信用できません。' },
      { label: 'ストレージコストを削減するため', correct: false, explanation: '不正解。中間テーブルを持つのでストレージは増えます。品質と再現性のためのコストです。' },
    ],
  },
  'warehouse-mart': {
    question: 'Warehouse と Mart を別レイヤーに分ける理由は？',
    options: [
      { label: 'Warehouse に直接アクセスすると必ずクラッシュするから', correct: false, explanation: '不正解。Mart の主な目的は「ビジネス担当者が理解できる形にする」ことです。' },
      { label: '法律でデータを分離することが義務付けられているから', correct: false, explanation: '不正解。これは技術・組織的なベストプラクティスです。法的要件ではありません。' },
      { label: 'ビジネス用途ごとに最適化されたテーブルを各チームに提供するため', correct: true, explanation: '✓ 正解！Warehouse は汎用構造、Mart は特定用途向け。マーケ・財務・営業がそれぞれ使いやすい形で提供できます。' },
    ],
  },
  'staging-mart': {
    question: 'Staging から Warehouse をスキップして Mart に直接接続します。この設計の意図は？',
    options: [
      { label: 'Warehouse の設定が複雑すぎて使えないから', correct: false, explanation: '不正解。ツールの制約ではなく、設計の意図的な選択です。このパターンのトレードオフを理解した上で選ぶことが重要です。' },
      { label: 'シンプルな分析要件でディメンショナルモデリングが不要なため、開発コストを抑える', correct: true, explanation: '✓ 正解！Lightweight パターンではスタースキーマ設計を省略し、クレンジング済みデータを直接 Mart で集計します。小規模・スタートアップ向けの合理的な選択です。' },
      { label: 'Warehouse と Staging は同じ役割だから', correct: false, explanation: '不正解。Staging は品質保証、Warehouse はディメンショナルモデリングです。全く異なる責任を持っています。' },
    ],
  },
  'source-warehouse': {
    question: 'Source から Staging をスキップして Warehouse に直接接続します。この設計の意図は？',
    options: [
      { label: 'Staging Layer はコストがかかりすぎるから', correct: false, explanation: '不正解。コストより「ETL ツールによる変換分担」が理由です。生データが残らないリスクがあることを認識してください。' },
      { label: 'Source と Warehouse は同じシステムだから', correct: false, explanation: '不正解。別システムです。ETL ツールが変換担当するため、専用の Staging Layer を別途作らない設計です。' },
      { label: 'ETL ツールが変換・クレンジングを担当するため、ツールのアウトプットを直接 Warehouse に格納する', correct: true, explanation: '✓ 正解！ETL スタイルでは Talend・Fivetran 等のツールが変換処理を担当し、クリーンなデータを Warehouse に直接書き込みます。ただし生データが残らないため、パイプライン失敗時の再処理が困難です。' },
    ],
  },
};

// Canvas positions per pattern
const CANVAS_POSITIONS: Record<string, Record<string, { x: number; y: number }>> = {
  standard:    { source: { x: 380, y: 40 }, staging: { x: 60, y: 200 }, warehouse: { x: 530, y: 200 }, mart: { x: 240, y: 360 } },
  lightweight: { source: { x: 340, y: 40 }, staging: { x: 60, y: 230 }, mart: { x: 500, y: 360 } },
  etl:         { source: { x: 340, y: 40 }, warehouse: { x: 60, y: 230 }, mart: { x: 500, y: 360 } },
};

const LAYER_LABELS: Record<string, string> = {
  source: 'Source Layer', staging: 'Staging Layer', warehouse: 'Warehouse Layer', mart: 'Mart Layer',
};

function getWrongConnectionMsg(from: string, to: string, pattern: ArchPattern): string {
  const standard = ['source', 'staging', 'warehouse', 'mart'];
  const fi = standard.indexOf(from);
  const ti = standard.indexOf(to);
  if (fi !== -1 && ti !== -1 && fi > ti) {
    return '⚠️ データは上流から下流へ一方向に流れます。逆接続はできません。';
  }
  if (!pattern.layers.includes(from) || !pattern.layers.includes(to)) {
    return `⚠️ 「${pattern.name}」パターンにはこのレイヤーが含まれていません。`;
  }
  const fromLabel = LAYER_LABELS[from] ?? from;
  const toLabel   = LAYER_LABELS[to]   ?? to;
  return `⚠️ 「${pattern.name}」では ${fromLabel} → ${toLabel} の直接接続はありません。\nパターン: ${pattern.subtitle}`;
}

// ─── Phase -1: Scenario Brief ─────────────────────────────────────────────────

function ScenarioBriefPhase({ scenario, onComplete }: { scenario: QuestScenario; onComplete: () => void }) {
  const [answered, setAnswered] = useState<number | null>(null);
  const [canProceed, setCanProceed] = useState(false);

  function handleAnswer(idx: number) {
    if (answered !== null) return;
    setAnswered(idx);
    setTimeout(() => setCanProceed(true), 800);
  }

  const selected = answered !== null ? scenario.keyOptions[answered] : null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* クライアント情報 */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 font-bold">NEW QUEST</span>
            <span className="text-[10px] text-slate-500">パイプライン設計 — Step 0 / 3</span>
          </div>
          <p className="text-white font-bold text-base">📋 クライアントの要件を確認する</p>
          <p className="text-slate-400 text-xs">設計を始める前に、このプロジェクトの制約を理解してください。</p>
        </div>

        {/* クライアントカード */}
        <div className="rounded-xl border border-slate-700 bg-slate-900/60 overflow-hidden">
          <div className="px-4 py-2.5 bg-slate-800/60 border-b border-slate-700 flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-bold">{scenario.badge}</span>
            <span className="text-sm font-semibold text-white">{scenario.client}</span>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">{scenario.situation}</p>
            <div className="space-y-2">
              {scenario.requirements.map((req, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs">
                  <span className="flex-shrink-0 mt-0.5">{req.icon}</span>
                  <span className="text-slate-300 leading-relaxed">{req.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 思考質問 */}
        <div className="space-y-3">
          <p className="text-white text-sm font-semibold">💬 {scenario.keyQuestion}</p>
          <div className="space-y-2">
            {scenario.keyOptions.map((opt, i) => {
              const isSel = answered === i;
              const isCorrect = isSel && opt.correct;
              const isWrong   = isSel && !opt.correct;
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={answered !== null}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-xs leading-relaxed transition-all ${
                    isCorrect ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-200'
                    : isWrong  ? 'border-red-500/40 bg-red-500/10 text-red-200'
                    : answered !== null ? 'border-slate-800 bg-slate-900/30 text-slate-600 cursor-default'
                    : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-indigo-500/40 hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  <span className="font-medium mr-2">{['A', 'B', 'C'][i]}.</span>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {selected && (
            <div className={`px-4 py-3 rounded-xl text-xs leading-relaxed border ${
              selected.correct
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-300'
            }`}>
              {selected.feedback}
            </div>
          )}
        </div>

        {canProceed && (
          <button
            onClick={onComplete}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all hover:scale-[1.01]"
          >
            要件を理解した — パターンを選ぶ →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Phase 0: Pattern Selection ───────────────────────────────────────────────

function PatternSelectionPhase({ scenario, onComplete }: { scenario: QuestScenario; onComplete: (p: ArchPattern) => void }) {
  const [selected, setSelected] = useState<ArchPattern | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  function handleConfirm() {
    if (!selected) return;
    setConfirmed(true);
    setShowFeedback(true);
  }

  const isCorrectChoice = selected?.id === scenario.correctPatternId;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 font-mono">パイプライン設計 — Step 1 / 3</p>
          <p className="text-white font-semibold text-sm">このクライアントに最適なアーキテクチャパターンはどれ？</p>
          <div className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-xs text-slate-400">
            <span className="text-slate-300 font-medium">{scenario.badge} {scenario.client}</span>
            <span className="ml-2">— {scenario.situation.slice(0, 60)}…</span>
          </div>
        </div>

        {/* パターンカード（pros/cons は非表示） */}
        <div className="space-y-3">
          {ARCHITECTURE_PATTERNS.map(p => {
            const isSel = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { if (!confirmed) { setSelected(p); setShowFeedback(false); } }}
                disabled={confirmed}
                className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all ${
                  isSel && confirmed
                    ? isCorrectChoice
                      ? 'border-emerald-500/60 bg-emerald-500/8'
                      : 'border-red-500/50 bg-red-500/8'
                    : isSel
                    ? 'border-indigo-500/60 bg-indigo-500/8'
                    : confirmed
                    ? 'border-slate-800 bg-slate-900/40 opacity-40'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <div className="flex-1">
                    <span className="text-white text-sm font-semibold">{p.name}</span>
                    <span className="font-mono text-xs text-slate-500 ml-3">{p.subtitle}</span>
                  </div>
                  {confirmed && isSel && (
                    <span className={`text-xs font-bold ${isCorrectChoice ? 'text-emerald-400' : 'text-red-400'}`}>
                      {isCorrectChoice ? '✓ 最適' : '△ 要再考'}
                    </span>
                  )}
                  {!confirmed && (
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSel ? 'border-indigo-500 bg-indigo-500' : 'border-slate-600'
                    }`}>
                      {isSel && <span className="text-white text-xs">✓</span>}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* フィードバック（選択後に表示） */}
        {showFeedback && selected && (
          <div className={`px-4 py-4 rounded-xl border space-y-2 ${
            isCorrectChoice
              ? 'bg-emerald-500/8 border-emerald-500/25'
              : 'bg-amber-500/8 border-amber-500/25'
          }`}>
            <p className={`text-xs font-bold ${isCorrectChoice ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isCorrectChoice ? '✓ このシナリオに最適な選択です！' : `△ このシナリオでは ${ARCHITECTURE_PATTERNS.find(p => p.id === scenario.correctPatternId)?.name} が最適です`}
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">{scenario.patternReason}</p>
            <div className="pt-1">
              <p className="text-[10px] text-slate-500 mb-1">「{selected.name}」の特徴:</p>
              <div className="space-y-0.5">
                {selected.pros.map(pro => <p key={pro} className="text-[10px] text-emerald-400">✓ {pro}</p>)}
                {selected.cons.map(con => <p key={con} className="text-[10px] text-slate-500">△ {con}</p>)}
              </div>
            </div>
          </div>
        )}

        {!confirmed && selected && (
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            このパターンで進む →
          </button>
        )}

        {showFeedback && (
          <button
            onClick={() => onComplete(
              isCorrectChoice
                ? selected!
                : ARCHITECTURE_PATTERNS.find(p => p.id === scenario.correctPatternId)!
            )}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
          >
            {isCorrectChoice ? 'レイヤー選択へ →' : '推奨パターンで続ける →'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Phase 1: Layer Selection ──────────────────────────────────────────────────

function LayerSelectionPhase({ pattern, onComplete }: { pattern: ArchPattern; onComplete: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastFeedback, setLastFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  const correctLayerIds = pattern.layers;
  const correctCount = Array.from(selected).filter(id => correctLayerIds.includes(id)).length;
  const wrongSelected = Array.from(selected).filter(id => !correctLayerIds.includes(id));
  const canProceed = correctCount === correctLayerIds.length && wrongSelected.length === 0;

  function toggle(opt: LayerOption) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(opt.id)) {
        next.delete(opt.id);
        setLastFeedback(null);
        return next;
      }
      next.add(opt.id);
      const isCorrectForPattern = correctLayerIds.includes(opt.id);
      if (!opt.isDataLayer) {
        setLastFeedback({ text: opt.wrongFeedback ?? '✗ これはデータレイヤーではありません。', correct: false });
      } else if (isCorrectForPattern) {
        setLastFeedback({ text: opt.correctFeedback ?? '✓ 正解！', correct: true });
      } else {
        const exclusionMsg =
          opt.id === 'warehouse' && pattern.id === 'lightweight'
            ? `「${pattern.name}」は Staging から直接 Mart に接続します。Warehouse レイヤーは不要です。`
            : opt.id === 'staging' && pattern.id === 'etl'
            ? `「${pattern.name}」では変換は ETL ツールが担当するため、Staging Layer は使いません。`
            : `「${pattern.name}」パターンには含まれていません。`;
        setLastFeedback({ text: `✗ ${opt.label} はこのパターンでは不要です。${exclusionMsg}`, correct: false });
      }
      return next;
    });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        <div className="space-y-1">
          <p className="text-[10px] text-slate-500 font-mono">パイプライン設計 — Step 2 / 3</p>
          <p className="text-white font-semibold text-sm">どのレイヤーが必要？</p>
          <p className="text-slate-400 text-xs">
            「<span className="text-indigo-400 font-medium">{pattern.name}</span>」パターンに必要なレイヤーを選んでください。
            クリックするたびに理由が表示されます。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {LAYER_OPTIONS.map(opt => {
            const isSel = selected.has(opt.id);
            const isCorrectForPattern = correctLayerIds.includes(opt.id);
            const showGreen = isSel && isCorrectForPattern;
            const showRed   = isSel && !isCorrectForPattern;
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  showGreen ? 'border-emerald-500/60 bg-emerald-500/10'
                  : showRed  ? 'border-red-500/60 bg-red-500/10'
                  : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{
                    background: isSel ? (isCorrectForPattern ? '#10b981' : '#ef4444') : opt.color,
                  }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-sm font-medium">{opt.label}</span>
                      <span className="text-slate-500 text-[11px]">{opt.sublabel}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{opt.description}</p>
                  </div>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all" style={{
                    borderColor: isSel ? (isCorrectForPattern ? '#10b981' : '#ef4444') : '#334155',
                    background:  isSel ? (isCorrectForPattern ? '#10b981' : '#ef4444') : 'transparent',
                  }}>
                    {isSel && <span className="text-white text-xs font-bold">{isCorrectForPattern ? '✓' : '✗'}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {lastFeedback && (
          <div className={`px-4 py-3 rounded-xl border text-xs leading-relaxed ${
            lastFeedback.correct
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {lastFeedback.text}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            {correctCount}/{correctLayerIds.length} 正解を選択中
            {wrongSelected.length > 0 && <span className="text-red-400 ml-2">（不正解が {wrongSelected.length} つ含まれています）</span>}
          </div>
          <button
            onClick={onComplete}
            disabled={!canProceed}
            className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            接続フェーズへ →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Phase 2: Canvas + Quiz ────────────────────────────────────────────────────

interface LayerNodeData extends PipelineLayerConfig {
  connected: boolean;
}

function LayerNode({ data }: NodeProps<LayerNodeData>) {
  return (
    <div
      className="relative rounded-xl border-2 transition-all"
      style={{
        borderColor: data.connected ? data.color : '#334155',
        background: data.connected ? `${data.color}18` : '#0f172a',
        width: 160, minHeight: 90,
        boxShadow: data.connected ? `0 0 20px ${data.color}40` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: data.color, border: 'none', width: 12, height: 12 }} />
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: data.color }} />
          <p className="text-white text-xs font-bold">{data.label}</p>
          {data.connected && <span className="text-xs ml-auto" style={{ color: data.color }}>✓</span>}
        </div>
        <p className="text-slate-400 text-[10px] leading-relaxed mb-2">{data.description}</p>
        <div className="flex flex-wrap gap-1">
          {data.tables.map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-slate-500">{t}</span>
          ))}
        </div>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: data.color, border: 'none', width: 12, height: 12 }} />
    </div>
  );
}

const nodeTypes = { layerNode: LayerNode };

interface QuizState {
  connection: Connection;
  quiz: typeof CONNECTION_QUIZ[string];
  selectedAnswer: number | null;
  answered: boolean;
  correct: boolean | null;
}

function CanvasPhase({ layers, pattern, onComplete }: {
  layers: PipelineLayerConfig[];
  pattern: ArchPattern;
  onComplete: () => void;
}) {
  const positions = CANVAS_POSITIONS[pattern.id] ?? CANVAS_POSITIONS.standard;
  const initialNodes: Node<LayerNodeData>[] = layers.map(l => ({
    id: l.id, type: 'layerNode',
    position: positions[l.id] ?? { x: l.x, y: l.y },
    data: { ...l, connected: false },
  }));

  const [nodes, , onNodesChange]    = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [quiz, setQuiz]             = useState<QuizState | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [showFinalReflection, setShowFinalReflection] = useState(false);
  const [validated, setValidated]   = useState(false);

  const connectedNodeIds = new Set(edges.flatMap(e => [e.source, e.target]));
  const nodesWithStatus  = nodes.map(n => ({ ...n, data: { ...n.data, connected: connectedNodeIds.has(n.id) } }));

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    const key = `${params.source}-${params.target}`;
    const isPatternConnection = pattern.connections.some(c => c.from === params.source && c.to === params.target);
    const q = CONNECTION_QUIZ[key];

    if (isPatternConnection && q) {
      setQuiz({ connection: params, quiz: q, selectedAnswer: null, answered: false, correct: null });
      return;
    }
    const msg = getWrongConnectionMsg(params.source, params.target, pattern);
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 4000);
  }, [pattern]);

  function handleQuizAnswer(idx: number) {
    if (!quiz || quiz.answered) return;
    const opt = quiz.quiz.options[idx];
    setQuiz(prev => prev ? { ...prev, selectedAnswer: idx, answered: true, correct: opt.correct } : null);
  }

  function handleQuizConfirm() {
    if (!quiz || !quiz.answered) return;
    if (quiz.correct) {
      const color = layers.find(l => l.id === quiz.connection.source)?.color ?? '#3b82f6';
      setEdges(eds => addEdge({ ...quiz.connection, animated: true, style: { stroke: color, strokeWidth: 2.5 } }, eds));
    }
    setQuiz(null);
  }

  function handleValidate() {
    const missing = pattern.connections.filter(req =>
      !edges.some(e => e.source === req.from && e.target === req.to)
    );
    if (missing.length === 0) {
      setShowFinalReflection(true);
    } else {
      const fromLabel = LAYER_LABELS[missing[0].from] ?? missing[0].from;
      const toLabel   = LAYER_LABELS[missing[0].to]   ?? missing[0].to;
      setErrorMsg(`未接続: ${fromLabel} → ${toLabel} など ${missing.length} 箇所残っています`);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  }

  function handleFinalComplete() {
    // 設計内容をlocalStorageに保存（DAGラボ連携・ゲスト対応）
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('quest_pipeline_design_ec-site', JSON.stringify({
          patternId:   pattern.id,
          patternName: pattern.name,
          subtitle:    pattern.subtitle,
          layers:      pattern.layers,
          color:       pattern.color,
          pros:        pattern.pros,
        }));
      } catch { /* ignore */ }
    }
    setShowFinalReflection(false);
    setValidated(true);
    setTimeout(onComplete, 800);
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-5 py-2.5 border-b border-slate-800 flex-shrink-0 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <p className="text-white font-semibold text-sm">パイプライン設計 — Step 3 / 3: ノードを繋いでデータフローを定義する</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${pattern.color}20`, color: pattern.color }}>{pattern.name}</span>
        </div>
        <p className="text-slate-500 text-xs mt-0.5">右側の ● をドラッグして次のレイヤーに接続。接続するたびに「なぜ？」を確認します。</p>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithStatus} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          onConnect={onConnect} nodeTypes={nodeTypes}
          fitView fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>

        {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm">
            <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs leading-relaxed whitespace-pre-line shadow-xl">
              {errorMsg}
            </div>
          </div>
        )}

        {showFinalReflection && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <ReflectionQuestion
                question={pattern.finalReflection.question}
                options={pattern.finalReflection.options}
                onComplete={handleFinalComplete}
                completeLabel="理解しました！パイプライン設計を確定する →"
              />
            </div>
          </div>
        )}

        {quiz && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">接続を確認</p>
                <p className="text-white text-sm font-semibold leading-relaxed">{quiz.quiz.question}</p>
              </div>
              <div className="space-y-2">
                {quiz.quiz.options.map((opt, i) => {
                  const isSel    = quiz.selectedAnswer === i;
                  const isCorrect = isSel && opt.correct;
                  const isWrong  = isSel && !opt.correct;
                  return (
                    <button key={i} onClick={() => handleQuizAnswer(i)} disabled={quiz.answered}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
                        isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-200'
                        : isWrong ? 'bg-red-500/15 border-red-500/30 text-red-200'
                        : quiz.answered ? 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-default'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500 cursor-pointer'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {quiz.answered && (
                <div className={`px-3 py-2.5 rounded-xl text-xs leading-relaxed ${
                  quiz.correct
                    ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}>
                  {quiz.quiz.options[quiz.selectedAnswer!].explanation}
                </div>
              )}
              {quiz.answered && (
                <button onClick={handleQuizConfirm}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    quiz.correct
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                >
                  {quiz.correct ? '接続を確定する ✓' : 'もう一度考える →'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-950/80">
        <div>
          {validated
            ? <p className="text-green-400 text-xs font-medium">✓ パイプライン設計完了！次のステージへ…</p>
            : <p className="text-slate-500 text-xs">右のハンドル（●）をドラッグして次のレイヤーへ接続してください</p>}
        </div>
        <button onClick={handleValidate} disabled={validated}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          設計を確定する →
        </button>
      </div>
    </div>
  );
}

// ─── Root Component ────────────────────────────────────────────────────────────

interface Props {
  layers: PipelineLayerConfig[];
  requiredConnections: Array<{ from: string; to: string }>;
  onComplete: () => void;
}

function Inner({ layers, onComplete }: Props) {
  const [activeScenario] = useState<QuestScenario>(
    () => QUEST_SCENARIOS[Math.floor(Math.random() * QUEST_SCENARIOS.length)]
  );
  const [phase, setPhase] = useState<'brief' | 'pattern' | 'select' | 'connect'>('brief');
  const [chosenPattern, setChosenPattern] = useState<ArchPattern | null>(null);

  if (phase === 'brief') {
    return <ScenarioBriefPhase scenario={activeScenario} onComplete={() => setPhase('pattern')} />;
  }

  if (phase === 'pattern') {
    return (
      <PatternSelectionPhase
        scenario={activeScenario}
        onComplete={p => { setChosenPattern(p); setPhase('select'); }}
      />
    );
  }

  if (phase === 'select') {
    return <LayerSelectionPhase pattern={chosenPattern!} onComplete={() => setPhase('connect')} />;
  }

  const patternLayers = layers.filter(l => chosenPattern!.layers.includes(l.id));

  return (
    <CanvasPhase
      layers={patternLayers}
      pattern={chosenPattern!}
      onComplete={onComplete}
    />
  );
}

export function QuestPipelineDesigner(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
