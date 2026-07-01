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

// ─── Architecture Patterns ─────────────────────────────────────────────────────

interface ArchPattern {
  id: 'standard' | 'lightweight' | 'etl';
  name: string;
  subtitle: string;
  layers: string[];
  connections: Array<{ from: string; to: string }>;
  pros: string[];
  cons: string[];
  isRecommended: boolean;
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
    isRecommended: true,
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
    isRecommended: false,
    color: '#f59e0b',
    finalReflection: {
      question: 'Lightweight パターンで Warehouse Layer をスキップしました。このトレードオフとして最も重要なリスクはどれですか？',
      options: [
        { label: 'Staging Layer のコストが増える', correct: false, explanation: 'Staging は 4 層でも 3 層でも存在します。Lightweight のリスクはコストではなくスケーラビリティです。' },
        { label: 'Source Layer にデータが届かなくなる', correct: false, explanation: 'Source Layer は独立しており、パターンに関係なく正常に動作します。問題はディメンショナルモデリングの欠如によるスケーラビリティです。' },
        { label: 'データ量が増えると Mart 直接集計のクエリが重くなり、スタースキーマによる最適化ができない', correct: true, explanation: '✓ 正解！Staging → Mart 直結は素早く始められますが、データが増えるとクエリが重くなります。ディメンショナルモデリングなしでは JOIN の最適化ができず、分析速度が犠牲になります。成長したらリファクタリングが必要です。' },
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
    isRecommended: false,
    color: '#10b981',
    finalReflection: {
      question: 'ETL パターンでは Staging Layer がなく、変換しながら Warehouse に格納します。最大のリスクはどれですか？',
      options: [
        { label: 'Warehouse が大きくなりすぎてコストがかかる', correct: false, explanation: 'ストレージコストより「再実行できない」ことのほうが重大なリスクです。ETL の問題は「原本がない」こと。' },
        { label: '変換処理にバグがあっても生データが残っておらず、元のデータから再処理できない', correct: true, explanation: '✓ 正解！ETL はパイプライン失敗時に「元データがない」状態になります。ELT（Source に生データを保持）なら、変換ロジックを修正して再実行できます。これが現代で ELT が好まれる最大の理由です。' },
        { label: '分析クエリが遅くなる', correct: false, explanation: 'クエリ速度は Mart 層の設計で決まります。ETL の主なリスクは「原本データが残らないため再処理できないこと」です。' },
      ],
    },
  },
];

// ─── Layer Options (for selection phase) ──────────────────────────────────────

interface LayerOption {
  id: string;
  label: string;
  sublabel: string;
  description: string;
  isDataLayer: boolean;
  color: string;
  baseCorrectFeedback: string;
  baseWrongFeedback: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    id: 'source', label: 'Source Layer', sublabel: '生データ保持層',
    description: '外部から受け取ったデータをそのまま保持する',
    isDataLayer: true, color: '#6366f1',
    baseCorrectFeedback: '✓ 正解！Source 層はパイプラインの起点。原本を加工せず保持することで、処理が失敗してもやり直せます。',
    baseWrongFeedback: '',
  },
  {
    id: 'staging', label: 'Staging Layer', sublabel: 'データ品質保証層',
    description: '型変換・表記揺れ修正・NULL 処理を行う',
    isDataLayer: true, color: '#f59e0b',
    baseCorrectFeedback: '✓ 正解！Staging 層は「汚いデータを下流に流さない」フィルター。ここでの品質保証が全分析の信頼性を決めます。',
    baseWrongFeedback: '',
  },
  {
    id: 'warehouse', label: 'Warehouse Layer', sublabel: 'データモデリング層',
    description: 'スタースキーマ等でデータを構造化し分析を高速化',
    isDataLayer: true, color: '#10b981',
    baseCorrectFeedback: '✓ 正解！Warehouse 層で Fact/Dim テーブルに整理することで、あらゆる分析クエリに対応できる構造を作ります。',
    baseWrongFeedback: '',
  },
  {
    id: 'mart', label: 'Mart Layer', sublabel: 'KPI 提供層',
    description: '特定ビジネス用途に特化した KPI 集計テーブルを提供',
    isDataLayer: true, color: '#f43f5e',
    baseCorrectFeedback: '✓ 正解！Mart 層は Warehouse から各チーム向けに絞ったデータを提供。Excel で集計する作業がなくなります。',
    baseWrongFeedback: '',
  },
  {
    id: 'oltp', label: 'OLTP データベース', sublabel: 'トランザクション DB',
    description: 'アプリの書き込み処理に使う DB（MySQL・PostgreSQL 等）',
    isDataLayer: false, color: '#64748b',
    baseCorrectFeedback: '',
    baseWrongFeedback: '✗ OLTP はパイプラインの「レイヤー」ではありません。データの「生成元（入力元）」です。Source 層への入力になりますが、パイプライン構成要素ではありません。',
  },
  {
    id: 'api', label: 'API ゲートウェイ', sublabel: 'リクエスト処理',
    description: 'フロントエンドからの API リクエストを処理するミドルウェア',
    isDataLayer: false, color: '#64748b',
    baseCorrectFeedback: '',
    baseWrongFeedback: '✗ API ゲートウェイはアプリケーション層の概念です。データパイプラインのレイヤーとは役割が異なります。',
  },
  {
    id: 'cache', label: 'アプリキャッシュ', sublabel: 'セッション一時保存',
    description: 'セッションや頻繁アクセスデータを一時保存（Redis 等）',
    isDataLayer: false, color: '#64748b',
    baseCorrectFeedback: '',
    baseWrongFeedback: '✗ キャッシュはアプリのパフォーマンス改善のため。分析データパイプラインには含まれません。',
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
      { label: 'シンプルな分析要件でディメンショナルモデリングが不要なため、開発コストを抑える', correct: true, explanation: '✓ 正解！Lightweight パターンではスタースキーマ設計を省略し、クレンジング済みデータを直接 Mart で集計します。小規模・スタートアップ向けの合理的な選択です。ただしデータが増えるとリファクタリングが必要になります。' },
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
  standard: {
    source:    { x: 380, y: 40 },
    staging:   { x: 60,  y: 200 },
    warehouse: { x: 530, y: 200 },
    mart:      { x: 240, y: 360 },
  },
  lightweight: {
    source:  { x: 340, y: 40 },
    staging: { x: 60,  y: 230 },
    mart:    { x: 500, y: 360 },
  },
  etl: {
    source:    { x: 340, y: 40 },
    warehouse: { x: 60,  y: 230 },
    mart:      { x: 500, y: 360 },
  },
};

const LAYER_LABELS: Record<string, string> = {
  source: 'Source Layer',
  staging: 'Staging Layer',
  warehouse: 'Warehouse Layer',
  mart: 'Mart Layer',
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
  const toLabel = LAYER_LABELS[to] ?? to;
  return `⚠️ 「${pattern.name}」では ${fromLabel} → ${toLabel} の直接接続はありません。\nパターン: ${pattern.subtitle}`;
}

// ─── Phase 0: Pattern Selection ───────────────────────────────────────────────

function PatternSelectionPhase({ onComplete }: { onComplete: (p: ArchPattern) => void }) {
  const [selected, setSelected] = useState<ArchPattern | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        <div className="space-y-1">
          <p className="text-white font-semibold text-sm">Step 0 / 3 — アーキテクチャパターンを選ぶ</p>
          <p className="text-slate-400 text-xs">
            データパイプラインには複数の設計パターンがあります。このクエストに最適なものを選んでください。
          </p>
        </div>

        <div className="space-y-3">
          {ARCHITECTURE_PATTERNS.map(p => {
            const isSel = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => { setSelected(p); setConfirmed(false); }}
                disabled={confirmed}
                className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-all ${
                  isSel
                    ? 'border-blue-500/60 bg-blue-500/8'
                    : confirmed
                    ? 'border-slate-800 bg-slate-900/40 opacity-40'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="text-white text-sm font-semibold">{p.name}</span>
                      {p.isRecommended && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">推奨</span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-slate-500 mb-2">{p.subtitle}</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                      {p.pros.map(pro => (
                        <span key={pro} className="text-green-400">✓ {pro}</span>
                      ))}
                      {p.cons.map(con => (
                        <span key={con} className="text-slate-500">✗ {con}</span>
                      ))}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-all ${
                    isSel ? 'border-blue-500 bg-blue-500' : 'border-slate-600'
                  }`}>
                    {isSel && <span className="text-white text-xs">✓</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {selected && !confirmed && (
          <div className={`px-4 py-3 rounded-xl border text-sm leading-relaxed ${
            selected.isRecommended
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}>
            {selected.isRecommended
              ? `✓ 「${selected.name}」はこのクエスト（EC サイトの複雑なデータ）に最適な選択です。ディメンショナルモデリングで高品質な分析基盤を構築できます。`
              : `⚠️ 「${selected.name}」は有効なパターンですが、このクエストでは ${selected.id === 'lightweight' ? 'ディメンショナルモデリングが省略されます' : '生データが残らないリスクがあります'}。このパターンを選ぶとそのトレードオフを体験できます。`
            }
          </div>
        )}

        <button
          onClick={() => { setConfirmed(true); setTimeout(() => onComplete(selected!), 300); }}
          disabled={!selected || confirmed}
          className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          このパターンで進む →
        </button>
      </div>
    </div>
  );
}

// ─── Phase 1: Layer Selection ──────────────────────────────────────────────────

function LayerSelectionPhase({ pattern, onComplete }: { pattern: ArchPattern; onComplete: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  const correctLayerIds = pattern.layers;
  const correctCount = Array.from(selected).filter(id => correctLayerIds.includes(id)).length;
  const wrongSelected = Array.from(selected).filter(id => !correctLayerIds.includes(id));
  const canProceed = correctCount === correctLayerIds.length && wrongSelected.length === 0;

  function toggle(opt: LayerOption) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(opt.id)) {
        next.delete(opt.id);
        setFeedback(null);
      } else {
        next.add(opt.id);
        const isCorrectForPattern = correctLayerIds.includes(opt.id);
        let text: string;
        if (!opt.isDataLayer) {
          text = opt.baseWrongFeedback;
        } else if (isCorrectForPattern) {
          text = opt.baseCorrectFeedback;
        } else {
          const patternExclusion =
            opt.id === 'warehouse' && pattern.id === 'lightweight'
              ? 'Lightweight パターンは Staging から直接 Mart に接続します。Warehouse は不要です。'
              : opt.id === 'staging' && pattern.id === 'etl'
              ? 'ETL パターンでは変換は外部ツールが担当するため、Staging Layer は使いません。'
              : `「${pattern.name}」パターンには含まれていません。`;
          text = `✗ ${opt.label} は選択したパターンでは不要です。${patternExclusion}`;
        }
        setFeedback({ text, correct: isCorrectForPattern });
      }
      return next;
    });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        <div className="space-y-1">
          <p className="text-white font-semibold text-sm">Step 1 / 3 — どのレイヤーが必要？</p>
          <p className="text-slate-400 text-xs">
            「<span className="text-blue-400 font-medium">{pattern.name}</span>」パターンに必要なレイヤーを選んでください。
            7 つのうち {correctLayerIds.length} つが正解です。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2">
          {LAYER_OPTIONS.map(opt => {
            const isSel = selected.has(opt.id);
            const isCorrectForPattern = correctLayerIds.includes(opt.id);
            const isSelected = isSel;
            const showGreen = isSelected && isCorrectForPattern;
            const showRed = isSelected && !isCorrectForPattern;
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  showGreen ? 'border-emerald-500/60 bg-emerald-500/10'
                  : showRed ? 'border-red-500/60 bg-red-500/10'
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
                    background: isSel ? (isCorrectForPattern ? '#10b981' : '#ef4444') : 'transparent',
                  }}>
                    {isSel && <span className="text-white text-xs font-bold">{isCorrectForPattern ? '✓' : '✗'}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className={`px-4 py-3 rounded-xl border text-sm leading-relaxed ${
            feedback.correct
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {feedback.text}
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
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
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
        width: 160,
        minHeight: 90,
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
    id: l.id,
    type: 'layerNode',
    position: positions[l.id] ?? { x: l.x, y: l.y },
    data: { ...l, connected: false },
  }));

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showFinalReflection, setShowFinalReflection] = useState(false);
  const [validated, setValidated] = useState(false);

  const connectedNodeIds = new Set(edges.flatMap(e => [e.source, e.target]));
  const nodesWithStatus = nodes.map(n => ({
    ...n,
    data: { ...n.data, connected: connectedNodeIds.has(n.id) },
  }));

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
      setEdges(eds => addEdge({
        ...quiz.connection,
        animated: true,
        style: { stroke: color, strokeWidth: 2.5 },
      }, eds));
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
      const toLabel = LAYER_LABELS[missing[0].to] ?? missing[0].to;
      setErrorMsg(`未接続: ${fromLabel} → ${toLabel} など ${missing.length} 箇所残っています`);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  }

  function handleFinalComplete() {
    setShowFinalReflection(false);
    setValidated(true);
    setTimeout(onComplete, 800);
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="px-5 py-2.5 border-b border-slate-800 flex-shrink-0 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <p className="text-white font-semibold text-sm">Step 2 / 3 — ノードを繋いでデータフローを定義する</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono" style={{ background: `${pattern.color}20`, color: pattern.color }}>{pattern.name}</span>
        </div>
        <p className="text-slate-500 text-xs mt-0.5">右側の ● をドラッグして次のレイヤーに接続。接続するたびに「なぜ？」を確認します。</p>
      </div>

      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithStatus}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.25 }}
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
                  const isSel = quiz.selectedAnswer === i;
                  const isCorrect = isSel && opt.correct;
                  const isWrong = isSel && !opt.correct;
                  return (
                    <button
                      key={i}
                      onClick={() => handleQuizAnswer(i)}
                      disabled={quiz.answered}
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
                <button
                  onClick={handleQuizConfirm}
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
        <button
          onClick={handleValidate}
          disabled={validated}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
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
  const [phase, setPhase] = useState<'pattern' | 'select' | 'connect'>('pattern');
  const [chosenPattern, setChosenPattern] = useState<ArchPattern | null>(null);

  if (phase === 'pattern') {
    return (
      <PatternSelectionPhase
        onComplete={p => { setChosenPattern(p); setPhase('select'); }}
      />
    );
  }

  if (phase === 'select') {
    return (
      <LayerSelectionPhase
        pattern={chosenPattern!}
        onComplete={() => setPhase('connect')}
      />
    );
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
