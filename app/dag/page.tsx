'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DagLab } from '@/components/dag/DagLab';
import { LabGuidePanel, type GuideStep } from '@/components/labs/LabGuidePanel';
import { ProGate } from '@/components/labs/ProGate';
import type { DagScenario } from '@/lib/dag';

const GUIDE_STEPS: GuideStep[] = [
  {
    title: 'STEP 1 — 依存関係を確認しよう',
    message: 'まず「Wave 1」を特定してみよう！依存関係のないタスクが最初に並列実行されるよ。',
    hint: 'upstreams が空のタスク = 最初に動けるタスクだよ',
    expression: 'excited',
  },
  {
    title: 'STEP 2 — DAGを実行してみよう',
    message: 'Waveごとに並列で実行されたね！実行ログを見て、どのタスクが最も時間がかかったか確認しよう。',
    expression: 'happy',
  },
  {
    title: 'STEP 3 — ボトルネックを特定しよう',
    message: '実行後にボトルネック分析が始まるよ。最も遅かったタスクとその改善策を考えてみよう。',
    expression: 'thinking',
  },
  {
    title: '🔒 Proプランでもっと学ぶ',
    message: '障害シナリオ（失敗伝播・スキップ挙動）や医療データ基盤クエストはProで体験できるよ！',
    expression: 'thinking',
    isPro: true,
  },
];

const PRO_FEATURES = [
  '障害シナリオ — 失敗伝播とスキップの挙動を体験',
  '医療データ基盤の複雑なDAGクエスト',
  '依存関係の影響範囲レポート機能',
  '業界別シナリオ3本（EC・SaaS・医療）',
];

export default function DagPage() {
  const [guideStep, setGuideStep] = useState(0);
  const [showProGate, setShowProGate] = useState(false);
  const [userScenarios, setUserScenarios] = useState<DagScenario[]>([]);

  useEffect(() => {
    fetch('/api/dag/my-pipelines')
      .then(r => r.json())
      .then((data: { scenarios: DagScenario[] }) => {
        if (data.scenarios?.length) setUserScenarios(data.scenarios);
      })
      .catch(() => {});
  }, []);

  function handleDagRun(_scenarioId: string) {
    if (guideStep < 1) setGuideStep(1);
  }

  return (
    <div className="relative flex flex-col">
      {/* ユーザーパイプライン連携バナー */}
      {userScenarios.length > 0 ? (
        <div
          className="flex items-center gap-2 px-6 py-2 border-b border-emerald-500/20 flex-shrink-0"
          style={{ background: 'rgba(16,185,129,0.05)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400 font-bold">あなたが設計したパイプラインがDAGに連携されました</span>
          <span className="text-xs text-emerald-600">— クエストで設計したパイプラインをそのままオーケストレーション体験</span>
          <Link href="/dag/quest" className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors">
            🗺️ クエストモードを見る →
          </Link>
        </div>
      ) : (
        <div
          className="flex items-center justify-between px-6 py-2 border-b border-amber-500/20 flex-shrink-0"
          style={{ background: 'rgba(245,158,11,0.05)' }}
        >
          <div className="flex items-center gap-2 text-xs text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-bold">ヒント</span>
            <span className="text-amber-600">— クエストのパイプラインを設計するとここに連携されます</span>
          </div>
          <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-colors">
            🗺️ クエストを始める →
          </Link>
        </div>
      )}

      <DagLab
        onDagRun={handleDagRun}
        lockedScenarioIdx={[1]}
        onLockedClick={() => setShowProGate(true)}
        extraScenarios={userScenarios}
      />

      <LabGuidePanel
        steps={GUIDE_STEPS}
        currentStep={guideStep}
        onNext={() => setGuideStep(prev => Math.min(prev + 1, GUIDE_STEPS.length - 1))}
        onShowPro={() => setShowProGate(true)}
        isVisible={true}
      />

      {showProGate && (
        <ProGate
          labName="DAG Orchestration Lab"
          proFeatures={PRO_FEATURES}
          onClose={() => setShowProGate(false)}
        />
      )}
    </div>
  );
}
