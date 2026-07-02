'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ProGate } from '@/components/labs/ProGate';

interface Quest {
  id: string;
  title: string;
  client: string;
  clientIcon: string;
  industry: string;
  difficulty: 'EASY' | 'MED' | 'HARD';
  xp: number;
  desc: string;
  objective: string;
  scenario: string;
  locked: boolean;
  accent: string;
}

const QUESTS: Quest[] = [
  {
    id: 'ec-normal',
    title: 'ECパイプライン — 日次バッチを完走せよ',
    client: 'ネクストコマース株式会社',
    clientIcon: '🛒',
    industry: 'EC',
    difficulty: 'EASY',
    xp: 120,
    desc: '「毎朝6時に日次バッチが完走しないといけない。全タスクを正しい順序で実行できるか確認してほしい」。ECサイトの日次データパイプラインを正常実行せよ。',
    objective: '全8タスクを依存関係の順序通りに成功させる',
    scenario: '正常シナリオ（全タスク成功）',
    locked: false,
    accent: '#34D399',
  },
  {
    id: 'ec-incident',
    title: '障害対応 — stg_orders失敗の影響範囲',
    client: 'ネクストコマース株式会社',
    clientIcon: '🚨',
    industry: 'EC',
    difficulty: 'MED',
    xp: 220,
    desc: '「今朝バッチが途中で止まった。stg_ordersタスクが失敗したらしいが、どのKPIが壊れているか把握できていない」。失敗の影響範囲をDAGから特定し報告せよ。',
    objective: '失敗タスクとスキップされたタスクを特定し、ビジネス影響を判断する',
    scenario: '障害シナリオ（stg_orders失敗）',
    locked: true,
    accent: '#F87171',
  },
  {
    id: 'medical-dag',
    title: '医療データ基盤 — 複雑な依存関係の設計',
    client: 'メドケアデータ株式会社',
    clientIcon: '🏥',
    industry: '医療',
    difficulty: 'HARD',
    xp: 420,
    desc: '「患者データ・診療記録・投薬情報が絡み合う複雑なパイプラインを設計してほしい。コンプライアンス要件でステージングを必ず通す必要がある」。複雑な依存関係のDAGを理解して実行せよ。',
    objective: '15タスク・4 Waveの複雑なDAGを障害なく完走させる',
    scenario: '医療基盤シナリオ（コンプライアンス対応）',
    locked: true,
    accent: '#93C5FD',
  },
];

const DIFFICULTY_META = {
  EASY: { label: '初級', color: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
  MED:  { label: '中級', color: '#F87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.3)' },
  HARD: { label: '上級', color: '#93C5FD', bg: 'rgba(147,197,253,0.1)', border: 'rgba(147,197,253,0.3)' },
};

const PRO_FEATURES = [
  '障害シナリオ — stg_ordersの失敗伝播を体験',
  '医療データ基盤の15タスク複雑DAGクエスト',
  '失敗タスクの影響範囲レポート機能',
  'Wave最適化・並列実行チューニング演習',
];

export default function DagQuestPage() {
  const [showProGate, setShowProGate] = useState(false);

  return (
    <div className="min-h-screen bg-[#070910] text-white">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80">
        <Link href="/dag" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
          ← Lab に戻る
        </Link>
        <div className="w-px h-4 bg-slate-800" />
        <span className="text-blue-400 font-black">◈</span>
        <div>
          <h1 className="font-black text-sm">DAG Orchestration — クエスト一覧</h1>
          <p className="text-slate-500 text-xs">正常実行・障害対応・複雑な依存関係を体験する</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">⚡</span>
            <div>
              <h2 className="font-black text-white mb-1">DAGを制する者がデータを制す</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                DAG（有向非巡回グラフ）はデータパイプラインの設計図。
                タスクの依存関係・並列実行・障害伝播を理解することが、
                本番運用の核心スキルだ。
              </p>
            </div>
          </div>
        </div>

        {QUESTS.map((quest) => {
          const diff = DIFFICULTY_META[quest.difficulty];
          return (
            <div
              key={quest.id}
              className="relative rounded-2xl border bg-slate-900/50 overflow-hidden transition-all"
              style={{
                borderColor: quest.locked ? '#1e293b' : `${quest.accent}40`,
                filter: quest.locked ? 'saturate(0.4)' : undefined,
              }}
            >
              {quest.locked && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
                  <span className="text-3xl mb-2">🔒</span>
                  <p className="text-slate-400 text-sm font-bold mb-1">Proプラン限定</p>
                  <button
                    onClick={() => setShowProGate(true)}
                    className="mt-2 px-5 py-2 rounded-xl text-xs font-black text-white transition-all hover:scale-105"
                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
                  >
                    Proプランで解放する
                  </button>
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: `${quest.accent}15`, border: `1px solid ${quest.accent}30` }}
                    >
                      {quest.clientIcon}
                    </div>
                    <div>
                      <p className="text-[10px] font-mono font-bold" style={{ color: quest.accent }}>
                        {quest.industry}
                      </p>
                      <h3 className="font-black text-white text-sm">{quest.title}</h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">クライアント: {quest.client}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-black"
                      style={{ color: diff.color, background: diff.bg, border: `1px solid ${diff.border}` }}
                    >
                      {diff.label}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-yellow-400">+{quest.xp} XP</span>
                  </div>
                </div>

                <div
                  className="rounded-xl p-3 mb-4 border-l-2"
                  style={{ background: 'rgba(30,41,59,0.5)', borderLeftColor: quest.accent }}
                >
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    「{quest.desc}」
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">ミッション</p>
                    <p className="text-xs text-slate-300">{quest.objective}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">シナリオ</p>
                    <p className="text-xs font-bold" style={{ color: quest.accent }}>{quest.scenario}</p>
                  </div>
                </div>

                {!quest.locked && (
                  <Link
                    href={`/dag/quest/${quest.id}`}
                    className="mt-4 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 hover:shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${quest.accent}90 0%, ${quest.accent}60 100%)` }}
                  >
                    ▶ クエストを受注する
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showProGate && (
        <ProGate
          labName="DAG Orchestration クエスト"
          proFeatures={PRO_FEATURES}
          onClose={() => setShowProGate(false)}
        />
      )}
    </div>
  );
}
