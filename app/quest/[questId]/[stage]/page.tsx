'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuest } from '@/lib/scenarios';
import { registerCsvFile } from '@/lib/duckdb/engine';
import { StageCompleteOverlay } from '@/components/stage/StageCompleteOverlay';
import { QuestPipelineDesigner } from '@/components/pipeline/QuestPipelineDesigner';
import { SourceStage } from '@/components/stage/SourceStage';
import { StagingStage } from '@/components/stage/StagingStage';
import { WarehouseStage } from '@/components/stage/WarehouseStage';
import { MartStage } from '@/components/stage/MartStage';
import { saveStageProgress } from '@/lib/supabase/progress';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { QuestId, StageId } from '@/types';

interface CompletionData {
  stars: number;
  xpEarned: number;
  badgeId?: string;
}

export default function StagePage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.questId as QuestId;
  const stageId = params.stage as StageId;

  const quest = getQuest(questId);
  const stageIndex = quest?.stages.findIndex(s => s.id === stageId) ?? -1;
  const stage = stageIndex >= 0 ? quest?.stages[stageIndex] : undefined;
  const nextStage = quest?.stages[stageIndex + 1];
  const isLastStage = stageIndex === (quest?.stages.length ?? 0) - 1;

  const [dbReady, setDbReady] = useState(false);
  const [completion, setCompletion] = useState<CompletionData | null>(null);

  useEffect(() => {
    setCompletion(null);
  }, [stageId]);

  useEffect(() => {
    if (!quest) return;
    Promise.all(quest.csvFiles.map(csv => registerCsvFile(csv.name, csv.content)))
      .then(() => setDbReady(true))
      .catch(e => console.error('DuckDB init failed:', e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quest?.id]);

  const handleCompletion = async (userSql: string, stars: number) => {
    if (!stage || !quest) return;
    const xpKey = `star${Math.max(1, Math.min(3, stars))}` as 'star1' | 'star2' | 'star3';
    const xpEarned = stage.xpReward[xpKey];

    if (isSupabaseConfigured()) {
      await saveStageProgress({
        questId: quest.id,
        stageId: stage.id,
        stars,
        xpEarned,
        sql: userSql,
        badgeId: stage.badgeId,
      });
    }

    setCompletion({ stars, xpEarned, badgeId: stage.badgeId });
  };

  const handleNext = () => {
    setCompletion(null);
    if (nextStage) {
      router.push(`/quest/${questId}/${nextStage.id}`);
    } else {
      router.push('/dashboard');
    }
  };

  if (!quest || !stage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white text-sm">
        ステージが見つかりません
      </div>
    );
  }

  // ── Pipeline design stage ──────────────────────────────────────────────────
  if (stage.type === 'pipeline' && stage.pipelineConfig) {
    const { layers, requiredConnections } = stage.pipelineConfig;
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
        {completion && (
          <StageCompleteOverlay
            stars={completion.stars}
            xpEarned={completion.xpEarned}
            badgeId={completion.badgeId}
            nextLabel={`次へ: ${nextStage?.title} →`}
            onNext={handleNext}
          />
        )}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 flex-shrink-0">
          <Link href={`/quest/${questId}`} className="text-slate-500 hover:text-white text-sm transition-colors">
            ← {quest.clientName}
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 text-sm font-medium">{stage.title}</span>
        </header>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-48 border-r border-slate-800 bg-slate-900/60 flex-shrink-0 overflow-y-auto">
            <div className="p-3">
              <p className="text-xs text-slate-600 uppercase tracking-wider mb-3 font-medium px-1">パイプライン</p>
              <nav className="space-y-1">
                {quest.stages.map((s, i) => {
                  const isCurrent = s.id === stageId;
                  const isPast = i < stageIndex;
                  return (
                    <Link
                      key={s.id}
                      href={`/quest/${questId}/${s.id}`}
                      className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                        isCurrent ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                        : isPast ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0 font-mono text-xs">{isPast ? '✓' : isCurrent ? '▷' : `${i + 1}`}</span>
                      <span className="leading-snug">{s.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
          {/* Center: mission */}
          <div className="w-72 border-r border-slate-800 overflow-y-auto flex-shrink-0">
            <div className="p-5 space-y-4">
              <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 uppercase tracking-wider mb-1 font-medium">今日学ぶ概念</p>
                <p className="text-white text-sm font-medium leading-relaxed">{stage.conceptTaught}</p>
              </div>
              {stage.storyMessage && (
                <div className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{stage.storyMessage}</p>
                </div>
              )}
              <div className="px-4 py-3 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">ミッション</p>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{stage.missionText}</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-500 mb-1 font-medium">ヒント</p>
                <p className="text-amber-300/90 text-xs leading-relaxed">{stage.hintText}</p>
              </div>
            </div>
          </div>
          {/* Right: pipeline canvas */}
          <div className="flex-1 overflow-hidden">
            <QuestPipelineDesigner
              layers={layers}
              requiredConnections={requiredConnections}
              onComplete={() => handleCompletion('', 2)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── GUI stage (source / staging / warehouse / mart) ───────────────────────
  const guiOnComplete = async () => { await handleCompletion('', 2); };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {completion && (
        <StageCompleteOverlay
          stars={completion.stars}
          xpEarned={completion.xpEarned}
          badgeId={completion.badgeId}
          nextLabel={isLastStage ? 'クエスト完了！ → ダッシュボードへ' : `次へ: ${nextStage?.title} →`}
          onNext={handleNext}
        />
      )}

      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 flex-shrink-0">
        <Link href={`/quest/${questId}`} className="text-slate-500 hover:text-white text-sm transition-colors">
          ← {quest.clientName}
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300 text-sm font-medium">{stage.title}</span>
        {!dbReady && (
          <span className="ml-auto text-xs text-slate-600 flex items-center gap-1">
            <span className="animate-spin inline-block">⟳</span>
            DuckDB 初期化中...
          </span>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Stage progress sidebar */}
        <aside className="w-48 border-r border-slate-800 bg-slate-900/60 flex-shrink-0 overflow-y-auto">
          <div className="p-3">
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-3 font-medium px-1">パイプライン</p>
            <nav className="space-y-1">
              {quest.stages.map((s, i) => {
                const isCurrent = s.id === stageId;
                const isPast = i < stageIndex;
                return (
                  <Link
                    key={s.id}
                    href={`/quest/${questId}/${s.id}`}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                      isCurrent ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                      : isPast ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      : 'text-slate-600 hover:bg-slate-800 hover:text-slate-400'
                    }`}
                  >
                    <span className="mt-0.5 flex-shrink-0 font-mono text-xs">{isPast ? '✓' : isCurrent ? '▷' : `${i + 1}`}</span>
                    <span className="leading-snug">{s.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Right: GUI stage content */}
        <div className="flex-1 overflow-hidden">
          {stageId === 'source' && <SourceStage quest={quest} dbReady={dbReady} onComplete={guiOnComplete} />}
          {stageId === 'staging' && <StagingStage dbReady={dbReady} onComplete={guiOnComplete} />}
          {stageId === 'warehouse' && <WarehouseStage dbReady={dbReady} onComplete={guiOnComplete} />}
          {stageId === 'mart' && <MartStage dbReady={dbReady} onComplete={guiOnComplete} />}
        </div>
      </div>
    </div>
  );
}
