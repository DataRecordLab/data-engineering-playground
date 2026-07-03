'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LineageGraph } from '@/components/lineage/LineageGraph';
import { LabGuidePanel, type GuideStep } from '@/components/labs/LabGuidePanel';
import { ProGate } from '@/components/labs/ProGate';

const QUEST_TABS = [
  { id: 'ec-site', label: 'ECサイト', emoji: '🛒', hint: 'まず「raw_orders」をクリックしてみよう' },
  { id: 'saas',    label: 'SaaS',    emoji: '📈', hint: 'まず「raw_events」をクリックしてみよう' },
] as const;

const GUIDE_STEPS_BY_QUEST: Record<string, GuideStep[]> = {
  'ec-site': [
    {
      title: 'STEP 1 — テーブルをクリック',
      message: 'グラフ上の好きなテーブルをクリックしてみて！上流・下流の依存関係がハイライトされるよ。',
      hint: 'まず「raw_orders」をクリックしてみよう',
      expression: 'excited',
    },
    {
      title: 'STEP 2 — 依存を辿ってみよう',
      message: 'raw_ordersを変更したら、どのテーブルが影響を受けるか見えたね！これが「インパクト分析」だよ。',
      hint: '右パネルのカラム名をクリックするとカラムレベルのリネージも見れるよ',
      expression: 'happy',
    },
    {
      title: '🔒 Proプランでもっと学ぶ',
      message: 'カラム削除の影響調査・障害根本原因特定・リファクタリング評価など、実践的なクエストが待ってるよ！',
      expression: 'thinking',
      isPro: true,
    },
  ],
  'saas': [
    {
      title: 'STEP 1 — SaaSパイプラインを探索',
      message: 'raw_eventsをクリックしてみよう！イベントデータがどうMRRやチャーン分析に繋がるか見えるよ。',
      hint: 'まず「raw_events」をクリックしてみよう',
      expression: 'excited',
    },
    {
      title: 'STEP 2 — チャーンリスクの上流を追う',
      message: 'mart_churn_riskは fct_mrr と fct_user_events の2テーブルに依存してるね。イベントが無いと分析できないのがわかった？',
      hint: 'mart_churn_risk をクリックして上流を確認しよう',
      expression: 'thinking',
    },
    {
      title: '🔒 Proプランでもっと学ぶ',
      message: '実際の障害シナリオ（カラム削除で何が壊れる？）や医療・金融リネージクエストはProで体験できるよ！',
      expression: 'thinking',
      isPro: true,
    },
  ],
};

const PRO_FEATURES = [
  'カラム削除インパクト分析クエスト',
  'データ品質障害の根本原因特定シナリオ',
  'リファクタリング影響評価クエスト',
  '実際の業界データを使った複雑なリネージ演習',
];

export default function LineagePage() {
  const searchParams = useSearchParams();
  const initialQuest = (searchParams.get('quest') === 'saas' ? 'saas' : 'ec-site') as 'ec-site' | 'saas';

  const [questId, setQuestId] = useState<'ec-site' | 'saas'>(initialQuest);
  const [guideStep, setGuideStep] = useState(0);
  const [showProGate, setShowProGate] = useState(false);
  const [nodeSelected, setNodeSelected] = useState(false);
  const [fromQuest, setFromQuest] = useState(!!searchParams.get('quest'));

  const guideSteps = GUIDE_STEPS_BY_QUEST[questId];

  useEffect(() => {
    if (fromQuest) {
      const t = setTimeout(() => setFromQuest(false), 4000);
      return () => clearTimeout(t);
    }
  }, [fromQuest]);

  function handleQuestChange(id: 'ec-site' | 'saas') {
    setQuestId(id);
    setGuideStep(0);
    setNodeSelected(false);
  }

  function handleNodeSelect(_id: string) {
    if (!nodeSelected) {
      setNodeSelected(true);
      if (guideStep === 0) setGuideStep(1);
    }
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* クエスト完了からの誘導トースト */}
      {fromQuest && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-600 shadow-xl shadow-indigo-900/40 text-white text-xs font-medium">
          <span className="text-base">🔗</span>
          <span>クエストのパイプラインをリネージで確認中</span>
          <button onClick={() => setFromQuest(false)} className="ml-1 text-indigo-300 hover:text-white">✕</button>
        </div>
      )}
      {/* クエスト選択タブ + バナー */}
      <div
        className="flex items-center justify-between px-6 py-2 border-b border-slate-800/60 flex-shrink-0"
        style={{ background: 'rgba(10,12,24,0.9)' }}
      >
        {/* クエスト切り替えタブ */}
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
          href="/lineage/quest"
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
        >
          🗺️ クエストモードを見る →
        </Link>
      </div>

      <LineageGraph onNodeSelect={handleNodeSelect} questId={questId} />

      <LabGuidePanel
        steps={guideSteps}
        currentStep={guideStep}
        onNext={() => setGuideStep(prev => Math.min(prev + 1, guideSteps.length - 1))}
        onShowPro={() => setShowProGate(true)}
        isVisible={true}
      />

      {showProGate && (
        <ProGate
          labName="Data Lineage Visualizer"
          proFeatures={PRO_FEATURES}
          onClose={() => setShowProGate(false)}
        />
      )}
    </div>
  );
}
