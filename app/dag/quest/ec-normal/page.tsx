'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DagLab } from '@/components/dag/DagLab';

type Phase = 'briefing' | 'playing' | 'complete';

export default function EcNormalDagQuestPage() {
  const [phase, setPhase] = useState<Phase>('briefing');
  const [runCount, setRunCount] = useState(0);
  const [lastScenarioId, setLastScenarioId] = useState<string | null>(null);

  function handleDagRun(scenarioId: string) {
    setLastScenarioId(scenarioId);
    setRunCount(prev => prev + 1);
    if (scenarioId === 'ec_pipeline') {
      setTimeout(() => setPhase('complete'), 3500);
    }
  }

  const starCount = runCount === 1 ? 3 : runCount <= 3 ? 2 : 1;
  const xpEarned = starCount === 3 ? 120 : starCount === 2 ? 80 : 40;

  if (phase === 'briefing') {
    return (
      <div className="min-h-screen bg-[#070910] text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full">
          <div
            className="rounded-2xl border border-emerald-500/30 p-8 mb-6"
            style={{ background: 'linear-gradient(135deg, #0a1a12 0%, #080910 100%)' }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">
                🛒
              </div>
              <div>
                <p className="text-[10px] text-emerald-400 font-mono font-bold">クライアント</p>
                <p className="font-black text-white">ネクストコマース株式会社</p>
                <p className="text-xs text-slate-500">EC業界</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-4 mb-5">
              <p className="text-[10px] text-slate-500 font-mono mb-2">📨 クライアントからのメッセージ</p>
              <p className="text-sm text-slate-200 leading-relaxed">
                「日次データパイプラインを本番に持っていく前に、
                DAGが正しく依存関係の順序で実行されるか確認したいんです。
                <span className="text-emerald-300 font-semibold">全タスクが正常に完走する</span>
                ことを確認してもらえますか？」
              </p>
            </div>

            {/* DAG説明 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 mb-4">
              <p className="text-[10px] text-slate-500 font-mono mb-2">パイプライン構成</p>
              <div className="space-y-1 text-[10px] font-mono">
                <div className="text-slate-400">Wave 1: <span className="text-blue-300">raw_orders</span>, <span className="text-blue-300">raw_users</span>, <span className="text-blue-300">raw_products</span></div>
                <div className="text-slate-400">Wave 2: <span className="text-purple-300">stg_orders</span>, <span className="text-purple-300">stg_users</span></div>
                <div className="text-slate-400">Wave 3: <span className="text-orange-300">fct_orders</span></div>
                <div className="text-slate-400">Wave 4: <span className="text-yellow-300">mart_revenue</span>, <span className="text-yellow-300">mart_cohort</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">ミッション</p>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">▶</span>
                <p className="text-sm text-slate-300">「▶ DAG 実行」を押して全タスクを正常完走させる</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5 flex-shrink-0">▶</span>
                <p className="text-sm text-slate-300">Wave単位で並列実行されることを実行ログで確認する</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5 flex-shrink-0">⭐</span>
                <p className="text-sm text-slate-300">1回のDAG実行で成功すると★★★獲得！</p>
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
              <span className="text-slate-300">獲得 XP: <span className="font-bold text-indigo-400">最大 120 XP</span></span>
            </div>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dag/quest"
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-sm font-bold text-center transition-colors"
            >
              ← 戻る
            </Link>
            <button
              onClick={() => setPhase('playing')}
              className="flex-1 py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/20"
              style={{ background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)' }}
            >
              ▶ クエスト開始
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-[#070910] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">⚡</div>
          <div className="flex justify-center gap-1 mb-4 text-3xl">
            {[1,2,3].map(i => (
              <span key={i} className={i <= starCount ? 'text-yellow-400' : 'text-slate-700'}>★</span>
            ))}
          </div>
          <h2 className="text-2xl font-black text-white mb-2">DAG完走！</h2>
          <p className="text-slate-400 text-sm mb-5">全タスクが正しい依存順序で実行されました</p>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 mb-4 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">実行回数</span>
                <span className="font-bold text-white">{runCount}回</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">星評価</span>
                <span className="font-bold text-yellow-400">{'★'.repeat(starCount)}{'☆'.repeat(3-starCount)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between">
                <span className="text-slate-400">獲得 XP</span>
                <span className="font-black text-yellow-400">+{xpEarned} XP</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 mb-4 text-left">
            <p className="text-xs text-blue-300">
              🎓 次のステップ: 障害シナリオ（stg_ordersが失敗したら？）を体験しよう。Proプランで解放できるよ！
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setPhase('playing'); setRunCount(0); }}
              className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-sm font-bold transition-colors"
            >
              もう一度
            </button>
            <Link
              href="/dag/quest"
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
    <div className="relative flex flex-col">
      {/* クエストHUD */}
      <div
        className="flex items-center justify-between px-6 py-2 border-b border-emerald-500/20 flex-shrink-0"
        style={{ background: 'rgba(16,185,129,0.05)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-emerald-400">🛒 ネクストコマース クエスト</span>
          <div className="w-px h-3 bg-slate-800" />
          <span className="text-[10px] text-slate-500">「▶ DAG 実行」を押して全タスクを正常完走させよ</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          実行回数: {runCount}回
          {runCount === 0 && <span className="text-yellow-400 animate-pulse ml-1">← 1回で完走すると★★★！</span>}
        </div>
      </div>

      <DagLab onDagRun={handleDagRun} />
    </div>
  );
}

// DAGの正常シナリオIDは 'ec_pipeline'
const DAG_SCENARIOS = [{ id: 'ec_pipeline' }];
