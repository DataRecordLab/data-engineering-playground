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
  strategy: string;
  locked: boolean;
  accent: string;
}

const QUESTS: Quest[] = [
  {
    id: 'ec-batch',
    title: 'EC物流基盤 — バッチ効率化',
    client: 'ネクストロジ株式会社',
    clientIcon: '🚚',
    industry: 'EC・物流',
    difficulty: 'EASY',
    xp: 150,
    desc: '「毎晩のバッチが遅くて朝のKPIダッシュボードが更新されない」。物流会社からの緊急依頼。Full Loadから脱却してUpsertへ移行せよ。',
    objective: 'スキャン削減率80%以上 + 更新データの正確な反映',
    strategy: 'Full Load → Upsert',
    locked: false,
    accent: '#34D399',
  },
  {
    id: 'saas-cdc',
    title: 'SaaS KPI基盤 — リアルタイム同期',
    client: 'アナリティクスLAB',
    clientIcon: '📊',
    industry: 'SaaS',
    difficulty: 'MED',
    xp: 250,
    desc: '「CEOが見るKPIダッシュボードを5分以内に更新したい」。スタートアップCTOからの要望。CDC方式でリアルタイム同期基盤を設計せよ。',
    objective: 'DELETE含む全変更を正確に反映 + 削除漏れゼロ',
    strategy: 'CDC（Change Data Capture）',
    locked: true,
    accent: '#818CF8',
  },
  {
    id: 'finance-audit',
    title: '金融コンプライアンス — 監査証跡設計',
    client: 'トラストバンク',
    clientIcon: '🏦',
    industry: '金融',
    difficulty: 'HARD',
    xp: 400,
    desc: '「全データ変更の監査ログが規制要件。過去の状態もいつでも再現できるようにしてほしい」。金融機関からの厳格な要件に応えよ。',
    objective: 'CDC + SCD Type 2で変更履歴を永久保持',
    strategy: 'CDC + 履歴保持（SCD Type 2）',
    locked: true,
    accent: '#F59E0B',
  },
];

const DIFFICULTY_META = {
  EASY: { label: '初級', color: '#34D399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.3)' },
  MED:  { label: '中級', color: '#818CF8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.3)' },
  HARD: { label: '上級', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)' },
};

const PRO_FEATURES = [
  'SaaS KPI基盤 — CDCでリアルタイム同期を体験',
  '金融コンプライアンス — 監査証跡設計クエスト',
  '全ストラテジー（Incremental/Upsert/CDC）を解放',
  '業界別クライアントストーリーでRPG体験',
];

export default function IncrementalQuestPage() {
  const [showProGate, setShowProGate] = useState(false);

  return (
    <div className="min-h-screen bg-[#070910] text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80">
        <Link href="/incremental" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
          ← Lab に戻る
        </Link>
        <div className="w-px h-4 bg-slate-800" />
        <span className="text-blue-400 font-black">◈</span>
        <div>
          <h1 className="font-black text-sm">Incremental Load — クエスト一覧</h1>
          <p className="text-slate-500 text-xs">業界別シナリオで実践的なロード戦略を習得する</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-5">

        {/* 説明バナー */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">🔄</span>
            <div>
              <h2 className="font-black text-white mb-1">クライアントからクエストが届いている</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                実際の業界課題をもとにしたシナリオ。Full Load・Incremental・Upsert・CDCのどれを選ぶか、
                設計判断が問われる。
              </p>
            </div>
          </div>
        </div>

        {/* クエストカード */}
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
              {/* ロックオーバーレイ */}
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
                    <span className="text-[10px] font-mono font-bold text-yellow-400">
                      +{quest.xp} XP
                    </span>
                  </div>
                </div>

                {/* ストーリー */}
                <div
                  className="rounded-xl p-3 mb-4 border-l-2"
                  style={{ background: 'rgba(30,41,59,0.5)', borderLeftColor: quest.accent }}
                >
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    「{quest.desc}」
                  </p>
                </div>

                {/* ミッション */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">目標</p>
                    <p className="text-xs text-slate-300">{quest.objective}</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
                    <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">使用戦略</p>
                    <p className="text-xs font-bold" style={{ color: quest.accent }}>{quest.strategy}</p>
                  </div>
                </div>

                {/* CTA */}
                {!quest.locked && (
                  <Link
                    href={`/incremental/quest/${quest.id}`}
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
          labName="Incremental Load クエスト"
          proFeatures={PRO_FEATURES}
          onClose={() => setShowProGate(false)}
        />
      )}
    </div>
  );
}
