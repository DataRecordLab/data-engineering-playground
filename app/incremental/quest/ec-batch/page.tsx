'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IncrementalLab } from '@/components/incremental/IncrementalLab';
import type { LoadStrategy } from '@/lib/incremental';

type Phase = 'briefing' | 'playing' | 'complete';

interface Score {
  strategy: LoadStrategy;
  efficiency: number;
  correct: boolean;
}

export default function EcBatchQuestPage() {
  const [phase, setPhase] = useState<Phase>('briefing');
  const [score, setScore] = useState<Score | null>(null);

  function handleStrategyRun(strategy: LoadStrategy) {
    const efficiencyMap: Record<LoadStrategy, number> = {
      full: 0, incremental: 65, upsert: 75, cdc: 87,
    };
    const correctMap: Record<LoadStrategy, boolean> = {
      full: false, incremental: false, upsert: true, cdc: true,
    };
    setScore({
      strategy,
      efficiency: efficiencyMap[strategy],
      correct: correctMap[strategy],
    });
    if (strategy === 'upsert' || strategy === 'cdc') {
      setTimeout(() => setPhase('complete'), 2000);
    }
  }

  const starCount = score
    ? score.efficiency >= 80 && score.correct ? 3
    : score.efficiency >= 60 && score.correct ? 2
    : score.correct ? 1 : 0
    : 0;

  if (phase === 'briefing') {
    return (
      <div className="min-h-screen bg-[#070910] text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          {/* クライアントカード */}
          <div
            className="rounded-2xl border border-emerald-500/30 p-8 mb-6"
            style={{ background: 'linear-gradient(135deg, #0a1a12 0%, #080910 100%)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">
                🚚
              </div>
              <div>
                <p className="text-[10px] text-emerald-400 font-mono font-bold">クライアント</p>
                <p className="font-black text-white">ネクストロジ株式会社</p>
                <p className="text-xs text-slate-500">EC・物流業界</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 mb-5">
              <p className="text-[10px] text-slate-500 font-mono mb-2">📨 クライアントからのメッセージ</p>
              <p className="text-sm text-slate-200 leading-relaxed">
                「毎晩の在庫・注文データの同期バッチが遅すぎて、朝9時のKPIミーティングに間に合わないんです。
                現在は全件ロードしているのですが、データが17万件を超えてきて15分かかるようになりました。
                <span className="text-emerald-300 font-semibold">スキャン件数を80%以上削減</span>
                できる設計に変えてもらえますか？」
              </p>
            </div>

            {/* ミッション */}
            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">ミッション</p>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">▶</span>
                <p className="text-sm text-slate-300">Full LoadからUpsertまたはCDCへ移行する</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">▶</span>
                <p className="text-sm text-slate-300">スキャン削減率80%以上を達成する</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">▶</span>
                <p className="text-sm text-slate-300">更新データが正確に反映されることを確認する</p>
              </div>
            </div>
          </div>

          {/* 報酬 */}
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
              href="/incremental/quest"
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-bold text-center transition-colors"
            >
              ← 戻る
            </Link>
            <button
              onClick={() => setPhase('playing')}
              className="flex-2 flex-1 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' }}
            >
              ▶ クエスト開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete' && score) {
    const xpEarned = starCount === 3 ? 150 : starCount === 2 ? 100 : starCount === 1 ? 50 : 0;
    return (
      <div className="min-h-screen bg-[#070910] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">{starCount >= 3 ? '🎉' : starCount >= 2 ? '✨' : '👍'}</div>

          <div className="flex justify-center gap-1 mb-4 text-3xl">
            {[1,2,3].map(i => (
              <span key={i} className={i <= starCount ? 'text-yellow-400' : 'text-slate-700'}>★</span>
            ))}
          </div>

          <h2 className="text-2xl font-black text-white mb-2">
            {starCount >= 3 ? 'クエスト完了！' : starCount >= 1 ? 'クリア！' : '惜しい…'}
          </h2>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 mb-4 text-left space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">使用ストラテジー</span>
              <span className="font-bold text-white capitalize">{score.strategy}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">スキャン削減率</span>
              <span className={`font-bold ${score.efficiency >= 80 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {score.efficiency}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">結果の正確性</span>
              <span className={`font-bold ${score.correct ? 'text-emerald-400' : 'text-red-400'}`}>
                {score.correct ? '✓ 正確' : '✗ 問題あり'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
              <span className="text-slate-400">獲得 XP</span>
              <span className="font-black text-yellow-400">+{xpEarned} XP</span>
            </div>
          </div>

          {starCount < 3 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 mb-4 text-left">
              <p className="text-xs text-amber-300">
                💡 CDCを使えばスキャン削減率87%・削除も完璧に検知できる★★★評価だよ！
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setPhase('playing'); setScore(null); }}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-bold transition-colors"
            >
              もう一度
            </button>
            <Link
              href="/incremental/quest"
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

  // playing phase
  return (
    <div className="relative">
      {/* クエストHUD */}
      <div
        className="flex items-center justify-between px-6 py-2 border-b border-emerald-500/20 flex-shrink-0"
        style={{ background: 'rgba(16,185,129,0.05)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-emerald-400">🚚 ネクストロジ クエスト</span>
          <div className="w-px h-3 bg-slate-800" />
          <span className="text-[10px] text-slate-500">目標: スキャン削減率80%以上 + 正確な更新反映</span>
        </div>
        <div className="flex items-center gap-2">
          {score && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className={score.efficiency >= 80 ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                削減率: {score.efficiency}%
              </span>
              <span className={score.correct ? 'text-emerald-400 font-bold' : 'text-red-400'}>
                {score.correct ? '✓ 正確' : '✗ 問題あり'}
              </span>
            </div>
          )}
          <Link
            href="/incremental/quest/ec-batch"
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
            onClick={() => setPhase('briefing')}
          >
            ブリーフィングに戻る
          </Link>
        </div>
      </div>

      <IncrementalLab onStrategyRun={handleStrategyRun} />

      {/* 進行ヒント */}
      {!score && (
        <div className="fixed bottom-6 right-6 z-40 max-w-64 rounded-xl border border-emerald-500/30 bg-slate-950/90 p-3">
          <p className="text-[10px] text-emerald-400 font-bold mb-1">💡 ヒント</p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Upsert または CDC を選んで実行すると目標達成になるよ。まず Full Load と比べてみよう！
          </p>
        </div>
      )}
    </div>
  );
}
