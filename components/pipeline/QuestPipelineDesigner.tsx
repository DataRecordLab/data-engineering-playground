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

const PIPELINE_FINAL_REFLECTION = {
  question: 'このパイプラインでは Source に生データを置いて、変換は Staging 以降で行う「ELT」方式を採用しました。なぜ「先に変換してから格納する ETL」ではなく ELT を選んだのですか？',
  options: [
    {
      label: 'クラウド DWH の処理能力が上がり、ロード後に DWH 内で変換するほうが速く・柔軟になったから',
      correct: true,
      explanation: '✓ 正解！ETL は処理能力が低かった時代の手法です。現代のクラウド DWH（BigQuery・Snowflake・DuckDB 等）は大量データを高速に処理できるため、まず生データをロード（EL）し、DWH 内で変換（T）するほうが再利用性・柔軟性が高くなります。',
    },
    {
      label: 'ETL はエラーが多くて使い物にならないから',
      correct: false,
      explanation: 'ETL が「ダメ」なわけではありません。ETL は今も多くの場所で使われています。ELT が主流になった理由は「クラウド DWH の処理能力向上」と「変換ロジックを DWH 内で管理できる柔軟性」です。',
    },
    {
      label: 'ELT の方が設定ファイルが少なくて済むから',
      correct: false,
      explanation: '設定量は主な理由ではありません。ELT が選ばれる理由は「生データをまず保持して原本を守る」こと、そして「変換を後からやり直せる再現性」を確保できるからです。',
    },
  ],
};

// ─── Static Data ──────────────────────────────────────────────────────────────

interface LayerOption {
  id: string;
  label: string;
  sublabel: string;
  description: string;
  correct: boolean;
  color: string;
  feedback: string;
}

const LAYER_OPTIONS: LayerOption[] = [
  {
    id: 'source', label: 'Source Layer', sublabel: '生データ保持層',
    description: '外部から受け取ったデータをそのまま保持する',
    correct: true, color: '#6366f1',
    feedback: '✓ 正解！Source層はパイプラインの起点。原本を加工せず保持することで、処理が失敗してもやり直せます。',
  },
  {
    id: 'staging', label: 'Staging Layer', sublabel: 'データ品質保証層',
    description: '型変換・表記揺れ修正・NULL処理を行う',
    correct: true, color: '#f59e0b',
    feedback: '✓ 正解！Staging層は「汚いデータを下流に流さない」フィルター。ここでの品質保証が全ての分析の信頼性を決めます。',
  },
  {
    id: 'warehouse', label: 'Warehouse Layer', sublabel: 'データモデリング層',
    description: 'スタースキーマ等でデータを構造化し分析を高速化',
    correct: true, color: '#10b981',
    feedback: '✓ 正解！Warehouse層でFact/Dimテーブルに整理することで、あらゆる分析クエリに対応できる構造を作ります。',
  },
  {
    id: 'mart', label: 'Mart Layer', sublabel: 'KPI提供層',
    description: '特定ビジネス用途に特化したKPI集計テーブルを提供',
    correct: true, color: '#f43f5e',
    feedback: '✓ 正解！Mart層はWarehouseから各チーム向けに絞ったデータを提供。Excelで集計する作業がなくなります。',
  },
  {
    id: 'oltp', label: 'OLTPデータベース', sublabel: 'トランザクションDB',
    description: 'アプリの書き込み処理に使うDB（MySQL・PostgreSQL等）',
    correct: false, color: '#64748b',
    feedback: '✗ これはパイプラインの「レイヤー」ではありません。OLTPはデータの「生成元（入力元）」です。Source層への入力になりますが、パイプライン自体の構成要素ではありません。',
  },
  {
    id: 'api', label: 'APIゲートウェイ', sublabel: 'リクエスト処理',
    description: 'フロントエンドからのAPIリクエストを処理するミドルウェア',
    correct: false, color: '#64748b',
    feedback: '✗ APIゲートウェイはアプリケーション層の概念です。データパイプラインのレイヤーとは役割が異なります。',
  },
  {
    id: 'cache', label: 'アプリキャッシュ', sublabel: 'セッション一時保存',
    description: 'セッションや頻繁アクセスデータを一時保存（Redis等）',
    correct: false, color: '#64748b',
    feedback: '✗ キャッシュはアプリのパフォーマンス改善のため。分析データパイプラインには含まれません。',
  },
];

// Quiz shown when an edge is attempted
const CONNECTION_QUIZ: Record<string, {
  question: string;
  options: Array<{ label: string; correct: boolean; explanation: string }>;
}> = {
  'source-staging': {
    question: 'Source → Staging にデータを流す理由は？',
    options: [
      { label: 'Source の生データを汚さず、別レイヤーでクレンジングするため', correct: true, explanation: '✓ 正解！Source は「原本保護」が目的。変換・整形を Staging に任せることで、元データをいつでも参照できます。' },
      { label: 'Staging がないとデータベースへの書き込みが遅くなるから', correct: false, explanation: '不正解。速度は Warehouse/Mart の問題です。Source→Staging の分離は「データ品質の責任分離」のためです。' },
      { label: 'クラウドサービスの料金プランでそう決まっているから', correct: false, explanation: '不正解。これは特定ツールの制約ではなく、データエンジニアリングのベストプラクティスです。' },
    ],
  },
  'staging-warehouse': {
    question: 'Staging を経由してから Warehouse に流す理由は？',
    options: [
      { label: '汚いデータのままモデリングすると、分析の信頼性が失われるから', correct: true, explanation: '✓ 正解！「Garbage in, Garbage out」。クレンジングなしのスタースキーマは集計結果が信用できません。' },
      { label: 'Warehouse は CSV ファイルしか読めないから', correct: false, explanation: '不正解。形式の問題ではありません。Staging を挟むのはデータ品質保証のためです。' },
      { label: 'ストレージコストを削減するため', correct: false, explanation: '不正解。中間テーブルを持つのでストレージは増えます。品質と再現性のためのコストです。' },
    ],
  },
  'warehouse-mart': {
    question: 'Warehouse と Mart を別レイヤーに分ける理由は？',
    options: [
      { label: 'ビジネス用途ごとに最適化されたテーブルを各チームに提供するため', correct: true, explanation: '✓ 正解！Warehouse は汎用構造、Mart は特定用途向け。マーケ・財務・営業がそれぞれ使いやすい形で提供できます。' },
      { label: 'Warehouse に直接アクセスすると必ずクラッシュするから', correct: false, explanation: '不正解。Mart の主な目的は「ビジネス担当者が理解できる形にする」ことです。' },
      { label: '法律でデータを分離することが義務付けられているから', correct: false, explanation: '不正解。これは技術・組織的なベストプラクティスです。法的要件ではありません。' },
    ],
  },
};

// Messages for wrong-order connections
const WRONG_CONNECTION_MSG: Record<string, string> = {
  'source-warehouse': '⚠️ Source → Warehouse の直接接続はできません。\nStaging でデータ品質を確保してからでないと、汚いデータがモデリングに混入します。',
  'source-mart': '⚠️ Source → Mart の直接接続はできません。\n生データから直接 KPI を作ると、クレンジング漏れで数字が狂います。',
  'staging-mart': '⚠️ Staging → Mart の直接接続はできません。\nWarehouse でのデータモデリングを経ないと、Mart のクエリが非効率になります。',
  'mart-source': '⚠️ データは Source → Mart の一方向に流れます。逆接続はできません。',
  'mart-staging': '⚠️ データは Source → Mart の一方向に流れます。逆接続はできません。',
  'mart-warehouse': '⚠️ データは Source → Mart の一方向に流れます。逆接続はできません。',
  'warehouse-source': '⚠️ データは Source → Mart の一方向に流れます。逆接続はできません。',
  'warehouse-staging': '⚠️ データは Source → Mart の一方向に流れます。逆接続はできません。',
  'staging-source': '⚠️ データは Source → Mart の一方向に流れます。逆接続はできません。',
};

// Scattered (non-obvious) positions for canvas nodes
const CANVAS_POSITIONS: Record<string, { x: number; y: number }> = {
  source:    { x: 380, y: 40 },
  staging:   { x: 60,  y: 200 },
  warehouse: { x: 530, y: 200 },
  mart:      { x: 240, y: 360 },
};

// ─── Phase 1: Layer Selection ─────────────────────────────────────────────────

interface SelectionProps {
  onComplete: (selectedIds: string[]) => void;
}

function LayerSelectionPhase({ onComplete }: SelectionProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<{ text: string; correct: boolean } | null>(null);

  const correctCount = Array.from(selected).filter(id => LAYER_OPTIONS.find(l => l.id === id)?.correct).length;
  const wrongSelected = Array.from(selected).filter(id => !LAYER_OPTIONS.find(l => l.id === id)?.correct);
  const canProceed = correctCount === 4 && wrongSelected.length === 0;

  function toggle(opt: LayerOption) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(opt.id)) {
        next.delete(opt.id);
        setFeedback(null);
      } else {
        next.add(opt.id);
        setFeedback({ text: opt.feedback, correct: opt.correct });
      }
      return next;
    });
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        <div className="space-y-1">
          <p className="text-white font-semibold text-sm">Step 1 / 2 — どのレイヤーが必要？</p>
          <p className="text-slate-400 text-xs">
            データパイプラインを構成するレイヤーを選んでください。7つのうち4つが正解です。
          </p>
        </div>

        {/* Option grid */}
        <div className="grid grid-cols-1 gap-2">
          {LAYER_OPTIONS.map(opt => {
            const isSel = selected.has(opt.id);
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt)}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                  isSel && opt.correct
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : isSel && !opt.correct
                    ? 'border-red-500/60 bg-red-500/10'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: isSel ? (opt.correct ? '#10b981' : '#ef4444') : opt.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-white text-sm font-medium">{opt.label}</span>
                      <span className="text-slate-500 text-[11px]">{opt.sublabel}</span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">{opt.description}</p>
                  </div>
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all" style={{
                    borderColor: isSel ? (opt.correct ? '#10b981' : '#ef4444') : '#334155',
                    background: isSel ? (opt.correct ? '#10b981' : '#ef4444') : 'transparent',
                  }}>
                    {isSel && <span className="text-white text-xs font-bold">{opt.correct ? '✓' : '✗'}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`px-4 py-3 rounded-xl border text-sm leading-relaxed transition-all ${
            feedback.correct
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {feedback.text}
          </div>
        )}

        {/* Progress + CTA */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            {correctCount}/4 正解を選択中
            {wrongSelected.length > 0 && <span className="text-red-400 ml-2">（不正解が {wrongSelected.length} つ含まれています）</span>}
          </div>
          <button
            onClick={() => onComplete(Array.from(selected).filter(id => LAYER_OPTIONS.find(l => l.id === id)?.correct))}
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

// ─── Phase 2: Canvas + Quiz ───────────────────────────────────────────────────

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

interface CanvasProps {
  layers: PipelineLayerConfig[];
  requiredConnections: Array<{ from: string; to: string }>;
  onComplete: () => void;
}

interface QuizState {
  connection: Connection;
  quiz: typeof CONNECTION_QUIZ[string];
  selectedAnswer: number | null;
  answered: boolean;
  correct: boolean | null;
}

function CanvasPhase({ layers, requiredConnections, onComplete }: CanvasProps) {
  const initialNodes: Node<LayerNodeData>[] = layers.map(l => ({
    id: l.id,
    type: 'layerNode',
    position: CANVAS_POSITIONS[l.id] ?? { x: l.x, y: l.y },
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

    // Wrong order check
    if (WRONG_CONNECTION_MSG[key]) {
      setErrorMsg(WRONG_CONNECTION_MSG[key]);
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    // Quiz check
    const q = CONNECTION_QUIZ[key];
    if (q) {
      setQuiz({ connection: params, quiz: q, selectedAnswer: null, answered: false, correct: null });
      return;
    }

    // Unknown connection — reject
    setErrorMsg('この接続は想定されていません。');
    setTimeout(() => setErrorMsg(null), 3000);
  }, []);

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
    const missing = requiredConnections.filter(req =>
      !edges.some(e => e.source === req.from && e.target === req.to)
    );
    if (missing.length === 0) {
      // Show final reflection before completing
      setShowFinalReflection(true);
    } else {
      const fromLabel = layers.find(l => l.id === missing[0].from)?.label ?? missing[0].from;
      const toLabel = layers.find(l => l.id === missing[0].to)?.label ?? missing[0].to;
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
      {/* Header */}
      <div className="px-5 py-2.5 border-b border-slate-800 flex-shrink-0 bg-slate-950/60">
        <p className="text-white font-semibold text-sm">Step 2 / 2 — ノードを繋いでデータフローを定義する</p>
        <p className="text-slate-500 text-xs mt-0.5">右側の ● をドラッグして次のレイヤーに接続。接続するたびに「なぜ？」を確認します。</p>
      </div>

      {/* Canvas */}
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

        {/* Error toast */}
        {errorMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm">
            <div className="px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs leading-relaxed whitespace-pre-line shadow-xl">
              {errorMsg}
            </div>
          </div>
        )}

        {/* Final reflection overlay */}
        {showFinalReflection && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-6">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <ReflectionQuestion
                question={PIPELINE_FINAL_REFLECTION.question}
                options={PIPELINE_FINAL_REFLECTION.options}
                onComplete={handleFinalComplete}
                completeLabel="理解しました！パイプライン設計を確定する →"
              />
            </div>
          </div>
        )}

        {/* Quiz overlay */}
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
                  const isAnswered = quiz.answered;
                  const isCorrect = isSel && opt.correct;
                  const isWrong = isSel && !opt.correct;
                  return (
                    <button
                      key={i}
                      onClick={() => handleQuizAnswer(i)}
                      disabled={isAnswered}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs transition-all ${
                        isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-200'
                        : isWrong ? 'bg-red-500/15 border-red-500/30 text-red-200'
                        : isAnswered ? 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-default'
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

      {/* Bottom bar */}
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

// ─── Root Component ───────────────────────────────────────────────────────────

interface Props {
  layers: PipelineLayerConfig[];
  requiredConnections: Array<{ from: string; to: string }>;
  onComplete: () => void;
}

function Inner({ layers, requiredConnections, onComplete }: Props) {
  const [phase, setPhase] = useState<'select' | 'connect'>('select');

  if (phase === 'select') {
    return (
      <LayerSelectionPhase
        onComplete={() => setPhase('connect')}
      />
    );
  }

  return (
    <CanvasPhase
      layers={layers}
      requiredConnections={requiredConnections}
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
