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
  targetTable: string;
  locked: boolean;
  accent: string;
}

const QUESTS: Quest[] = [
  {
    id: 'impact-analysis',
    title: 'インパクト分析 — カラム削除の影響調査',
    client: 'ネクストコマース株式会社',
    clientIcon: '🔍',
    industry: 'EC',
    difficulty: 'EASY',
    xp: 150,
    desc: '「raw_ordersの"amount"カラムを削除したい。でも下流テーブルへの影響が怖くて踏み切れない」。インパクト分析を実施して影響テーブルをすべて特定せよ。',
    objective: 'raw_orders.amountの下流影響テーブルを全て特定する',
    targetTable: 'raw_orders',
    locked: false,
    accent: '#818CF8',
  },
  {
    id: 'incident-trace',
    title: '障害調査 — mart_daily_revenueが壊れた',
    client: 'データインサイト株式会社',
    clientIcon: '🚨',
    industry: 'SaaS',
    difficulty: 'MED',
    xp: 280,
    desc: '「KPIの売上数字がおかしい。先週から10%ずれてる」。mart_daily_revenueから上流を辿り、どのテーブルのどの変換で問題が起きているか根本原因を特定せよ。',
    objective: 'mart_daily_revenueの上流リネージを辿り問題箇所を特定',
    targetTable: 'mart_daily_revenue',
    locked: true,
    accent: '#F87171',
  },
  {
    id: 'refactor-eval',
    title: 'リファクタリング評価 — stg層の再設計',
    client: 'フィンテックデータ株式会社',
    clientIcon: '⚗️',
    industry: '金融',
    difficulty: 'HARD',
    xp: 380,
    desc: '「stagingレイヤーを大幅にリファクタリングしたい。stg_ordersのスキーマを変えると下流の何が壊れるか事前に全て把握して、安全にリリースしたい」。',
    objective: '変更するstg_ordersの下流影響を全て洗い出し、リリース計画を提案する',
    targetTable: 'stg_orders',
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
  '障害調査クエスト — mart_daily_revenueの根本原因特定',
  'リファクタリング評価 — stg層変更の影響範囲洗い出し',
  'カラムレベルの詳細なリネージトレース',
  '金融業界データを使った複雑なリネージ演習',
];

export default function LineageQuestPage() {
  const [showProGate, setShowProGate] = useState(false);

  return (
    <div className="min-h-screen bg-[#070910] text-white">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80">
        <Link href="/lineage" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
          ← Lab に戻る
        </Link>
        <div className="w-px h-4 bg-slate-800" />
        <span className="text-blue-400 font-black">◈</span>
        <div>
          <h1 className="font-black text-sm">Data Lineage — クエスト一覧</h1>
          <p className="text-slate-500 text-xs">インパクト分析・障害調査・リファクタリング評価を体験する</p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">🕸️</span>
            <div>
              <h2 className="font-black text-white mb-1">リネージを武器に問題を解決せよ</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                データリネージは「どこから来てどこに行くか」を追跡する技術。
                変更の影響・障害の原因・安全なリリース判断に不可欠なスキルだ。
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
                    <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">調査起点テーブル</p>
                    <p className="text-xs font-bold font-mono" style={{ color: quest.accent }}>{quest.targetTable}</p>
                  </div>
                </div>

                {!quest.locked && (
                  <Link
                    href={`/lineage/quest/${quest.id}`}
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
          labName="Data Lineage クエスト"
          proFeatures={PRO_FEATURES}
          onClose={() => setShowProGate(false)}
        />
      )}
    </div>
  );
}
