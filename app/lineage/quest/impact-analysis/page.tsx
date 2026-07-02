'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LineageGraph } from '@/components/lineage/LineageGraph';

type Phase = 'briefing' | 'playing' | 'complete';

const EXPECTED_IMPACT_TABLES = ['stg_orders', 'fct_orders', 'mart_daily_revenue', 'mart_user_cohort'];

export default function ImpactAnalysisQuestPage() {
  const [phase, setPhase] = useState<Phase>('briefing');
  const [foundTables, setFoundTables] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  function handleNodeSelect(id: string) {
    setSelectedNodeId(id);
    if (id === 'raw_orders') {
      // raw_ordersを選択したら、影響範囲を「発見」していく
      setFoundTables(prev => {
        const next = new Set(prev);
        EXPECTED_IMPACT_TABLES.forEach(t => next.add(t));
        return next;
      });
    }
  }

  const allFound = EXPECTED_IMPACT_TABLES.every(t => foundTables.has(t));
  const progress = Math.round((foundTables.size / EXPECTED_IMPACT_TABLES.length) * 100);

  if (phase === 'briefing') {
    return (
      <div className="min-h-screen bg-[#070910] text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div
            className="rounded-2xl border border-indigo-500/30 p-8 mb-6"
            style={{ background: 'linear-gradient(135deg, #0a0a20 0%, #080910 100%)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">
                🔍
              </div>
              <div>
                <p className="text-[10px] text-indigo-400 font-mono font-bold">クライアント</p>
                <p className="font-black text-white">ネクストコマース株式会社</p>
                <p className="text-xs text-slate-500">EC業界</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 mb-5">
              <p className="text-[10px] text-slate-500 font-mono mb-2">📨 クライアントからのメッセージ</p>
              <p className="text-sm text-slate-200 leading-relaxed">
                「raw_ordersテーブルの"amount"カラムを削除して"total_amount"にリネームしたいんですが、
                下流のどのテーブルやBIダッシュボードが壊れるか心配で踏み切れません。
                <span className="text-indigo-300 font-semibold">影響を受ける全テーブルを洗い出して</span>
                リストにしてもらえますか？」
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">ミッション</p>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 flex-shrink-0">▶</span>
                <p className="text-sm text-slate-300">raw_ordersをクリックして下流への影響を確認する</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 flex-shrink-0">▶</span>
                <p className="text-sm text-slate-300">影響を受けるテーブルを全て特定する（{EXPECTED_IMPACT_TABLES.length}テーブル）</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 flex-shrink-0">▶</span>
                <p className="text-sm text-slate-300">KPIダッシュボードへの影響範囲を把握する</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6 px-4 py-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-yellow-400">⭐</span>
              <span className="text-slate-300">最大 <span className="font-bold text-yellow-400">★★★</span> 評価</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-indigo-400">✦</span>
              <span className="text-slate-300">獲得 XP: <span className="font-bold text-indigo-400">最大 150 XP</span></span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/lineage/quest"
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-bold text-center transition-colors"
            >
              ← 戻る
            </Link>
            <button
              onClick={() => setPhase('playing')}
              className="flex-1 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/20"
              style={{ background: 'linear-gradient(135deg, #4338ca 0%, #818cf8 100%)' }}
            >
              ▶ クエスト開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    const starCount = allFound ? 3 : foundTables.size >= 2 ? 2 : 1;
    const xpEarned = starCount === 3 ? 150 : starCount === 2 ? 90 : 40;
    return (
      <div className="min-h-screen bg-[#070910] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🕸️</div>
          <div className="flex justify-center gap-1 mb-4 text-3xl">
            {[1,2,3].map(i => (
              <span key={i} className={i <= starCount ? 'text-yellow-400' : 'text-slate-700'}>★</span>
            ))}
          </div>
          <h2 className="text-2xl font-black text-white mb-2">インパクト分析完了！</h2>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 mb-4 text-left">
            <p className="text-[10px] text-slate-500 font-mono mb-3">特定した影響テーブル</p>
            {EXPECTED_IMPACT_TABLES.map(t => (
              <div key={t} className="flex items-center gap-2 py-1 text-sm">
                <span className={foundTables.has(t) ? 'text-emerald-400' : 'text-slate-700'}>
                  {foundTables.has(t) ? '✓' : '○'}
                </span>
                <span className={`font-mono ${foundTables.has(t) ? 'text-slate-300' : 'text-slate-700'}`}>{t}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-800 flex justify-between text-sm">
              <span className="text-slate-400">獲得 XP</span>
              <span className="font-black text-yellow-400">+{xpEarned} XP</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setPhase('playing'); setFoundTables(new Set()); }}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-bold transition-colors"
            >
              もう一度
            </button>
            <Link
              href="/lineage/quest"
              className="flex-1 py-3 rounded-xl font-black text-sm text-white text-center transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
            >
              クエスト一覧へ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* クエストHUD */}
      <div
        className="flex items-center justify-between px-6 py-2 border-b border-indigo-500/20 flex-shrink-0"
        style={{ background: 'rgba(99,102,241,0.05)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-indigo-400">🔍 インパクト分析クエスト</span>
          <div className="w-px h-3 bg-slate-800" />
          <span className="text-[10px] text-slate-500">raw_ordersをクリックして下流影響を確認せよ</span>
        </div>
        <div className="flex items-center gap-3">
          {/* 進捗 */}
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500">{foundTables.size}/{EXPECTED_IMPACT_TABLES.length}テーブル特定</span>
          </div>
          {allFound && (
            <button
              onClick={() => setPhase('complete')}
              className="px-3 py-1 rounded-lg text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-colors animate-pulse"
            >
              ✓ 完了報告
            </button>
          )}
        </div>
      </div>

      <LineageGraph onNodeSelect={handleNodeSelect} />

      {/* 特定テーブルリスト */}
      {foundTables.size > 0 && (
        <div className="fixed bottom-6 right-6 z-40 w-64 rounded-xl border border-indigo-500/30 bg-slate-950/90 p-3">
          <p className="text-[10px] text-indigo-400 font-bold mb-2">🎯 影響テーブル（特定済み）</p>
          <div className="space-y-1">
            {EXPECTED_IMPACT_TABLES.map(t => (
              <div key={t} className="flex items-center gap-1.5 text-[10px]">
                <span className={foundTables.has(t) ? 'text-emerald-400' : 'text-slate-700'}>
                  {foundTables.has(t) ? '✓' : '○'}
                </span>
                <span className={`font-mono ${foundTables.has(t) ? 'text-slate-300' : 'text-slate-700'}`}>{t}</span>
              </div>
            ))}
          </div>
          {allFound && (
            <button
              onClick={() => setPhase('complete')}
              className="mt-3 w-full py-1.5 rounded-lg text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
            >
              完了報告する →
            </button>
          )}
        </div>
      )}

      {!selectedNodeId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 rounded-xl border border-slate-700 bg-slate-950/90 px-4 py-2">
          <p className="text-[10px] text-slate-400">
            💡 <span className="text-indigo-300 font-bold">raw_orders</span> テーブルをクリックして調査を開始しよう
          </p>
        </div>
      )}
    </div>
  );
}
