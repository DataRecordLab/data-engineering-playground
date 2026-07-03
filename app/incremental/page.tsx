'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IncrementalLab } from '@/components/incremental/IncrementalLab';
import { LabGuidePanel, type GuideStep } from '@/components/labs/LabGuidePanel';
import { ProGate } from '@/components/labs/ProGate';
import type { LoadStrategy } from '@/lib/incremental';

const QUEST_TABS = [
  { id: 'ec-site', label: 'ECサイト', emoji: '🛒' },
  { id: 'saas',    label: 'SaaS',    emoji: '📈' },
] as const;

const GUIDE_STEPS_BY_QUEST: Record<string, GuideStep[]> = {
  'ec-site': [
    {
      title: 'STEP 1 — まずやってみよう',
      message: 'まず「Full Load」を選んで▶ 実行 を押してみて！全件ロードがどんな感じか体験しよう。',
      hint: 'ストラテジーはすでにFull Loadが選ばれているよ',
      expression: 'excited',
    },
    {
      title: 'STEP 2 — 結果を見てみよう',
      message: '17件全部スキャンしたね…本番環境だと数百万行になることも😱 毎日これは辛い。',
      hint: 'スキャン削減率 0% — これが Full Load の現実',
      expression: 'cute',
    },
    {
      title: '🔒 Proプランでもっと学ぶ',
      message: 'Incremental・Upsert・CDCを使えば、スキャンを85%以上削減できるよ！続きはProプランで🚀',
      expression: 'thinking',
      isPro: true,
    },
  ],
  'saas': [
    {
      title: 'STEP 1 — SaaSデータをロードしてみよう',
      message: 'まず「Full Load」を選んで▶ 実行 を押してみよう！サブスクリプションデータの全件ロードを体験しよう。',
      hint: 'ストラテジーはすでにFull Loadが選ばれているよ',
      expression: 'excited',
    },
    {
      title: 'STEP 2 — 問題点に気づこう',
      message: '解約済みのsub_3も含めて全件スキャンしてるね…チャーン分析では削除済みデータの扱いが重要だよ！',
      hint: 'CDC変更ログを見ると -sub_3（解約）があるのに、Full Loadでは気づけない',
      expression: 'thinking',
    },
    {
      title: '🔒 Proプランでもっと学ぶ',
      message: 'CDCを使えばプラン変更・解約を正確に検知できる！MRR計算精度が格段に上がるよ🚀',
      expression: 'thinking',
      isPro: true,
    },
  ],
};

const PRO_FEATURES = [
  'Incremental / Upsert / CDC の全ストラテジーを体験',
  'EC物流・SaaS・金融の業界別クエスト3本',
  'スキャン削減率・正確性でスコア評価',
  'クライアントストーリー付きのRPG体験',
];

export default function IncrementalPage() {
  const searchParams = useSearchParams();
  const initialQuest = (searchParams.get('quest') === 'saas' ? 'saas' : 'ec-site') as 'ec-site' | 'saas';

  const [questId, setQuestId] = useState<'ec-site' | 'saas'>(initialQuest);
  const [guideStep, setGuideStep] = useState(0);
  const [showProGate, setShowProGate] = useState(false);
  const [fromQuest, setFromQuest] = useState(!!searchParams.get('quest'));

  const guideSteps = GUIDE_STEPS_BY_QUEST[questId];

  // URL パラメータからクエストが指定された場合のみトースト表示
  useEffect(() => {
    if (fromQuest) {
      const t = setTimeout(() => setFromQuest(false), 4000);
      return () => clearTimeout(t);
    }
  }, [fromQuest]);

  function handleQuestChange(id: 'ec-site' | 'saas') {
    setQuestId(id);
    setGuideStep(0);
  }

  function handleStrategyRun(strategy: LoadStrategy) {
    if (strategy === 'full' && guideStep === 0) {
      setGuideStep(1);
    }
  }

  return (
    <div className="relative">
      {/* クエスト完了からの誘導トースト */}
      {fromQuest && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-600 shadow-xl shadow-indigo-900/40 text-white text-xs font-medium animate-fade-in">
          <span className="text-base">⚗️</span>
          <span>クエストのデータを使って体験中</span>
          <button onClick={() => setFromQuest(false)} className="ml-1 text-indigo-300 hover:text-white">✕</button>
        </div>
      )}
      {/* クエスト選択タブ + バナー */}
      <div
        className="flex items-center justify-between px-6 py-2 border-b border-slate-800/60"
        style={{ background: 'rgba(10,12,24,0.9)' }}
      >
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-600 mr-2">パイプライン:</span>
          {QUEST_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleQuestChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                questId === tab.id
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent hover:border-slate-700'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <Link
          href="/incremental/quest"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
        >
          🗺️ クエストモードを見る →
        </Link>
      </div>

      <IncrementalLab
        onStrategyRun={handleStrategyRun}
        lockedStrategies={['incremental', 'upsert', 'cdc']}
        onLockedClick={() => setShowProGate(true)}
        questId={questId}
      />

      <LabGuidePanel
        steps={guideSteps}
        currentStep={guideStep}
        onNext={() => setGuideStep(prev => Math.min(prev + 1, guideSteps.length - 1))}
        onShowPro={() => setShowProGate(true)}
        isVisible={true}
      />

      {showProGate && (
        <ProGate
          labName="Incremental Load Lab"
          proFeatures={PRO_FEATURES}
          onClose={() => setShowProGate(false)}
        />
      )}
    </div>
  );
}
