'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuest } from '@/lib/scenarios';
import { registerCsvFile } from '@/lib/duckdb/engine';
import { StageCompleteOverlay } from '@/components/stage/StageCompleteOverlay';
import { GameOverOverlay } from '@/components/stage/GameOverOverlay';
import { QuestPipelineDesigner } from '@/components/pipeline/QuestPipelineDesigner';
import { WorldProgressBar } from '@/components/pipeline/WorldProgressBar';
import { SourceStage } from '@/components/stage/SourceStage';
import { StagingStage } from '@/components/stage/StagingStage';
import { WarehouseStage } from '@/components/stage/WarehouseStage';
import { MartStage } from '@/components/stage/MartStage';
import { SaasSourceStage } from '@/components/stage/SaasSourceStage';
import { SaasStagingStage } from '@/components/stage/SaasStagingStage';
import { SaasWarehouseStage } from '@/components/stage/SaasWarehouseStage';
import { SaasMartStage } from '@/components/stage/SaasMartStage';
import { saveStageProgress, getUserProgress, getUserProfile } from '@/lib/supabase/progress';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { useGameStore } from '@/lib/store/gameStore';
import type { QuestId, StageId, CharacterConfig } from '@/types';
import { DEFAULT_CHARACTER_CONFIG } from '@/types';

const STAGE_THEMES: Record<string, { bg: string; border: string }> = {
  pipeline:  { bg: 'bg-slate-950',           border: 'border-blue-900/30' },
  source:    { bg: 'bg-[#080818]',            border: 'border-indigo-900/30' },
  staging:   { bg: 'bg-[#0f0900]',            border: 'border-amber-900/30' },
  warehouse: { bg: 'bg-[#001209]',            border: 'border-emerald-900/30' },
  mart:      { bg: 'bg-[#110008]',            border: 'border-rose-900/30' },
};

const XP_PER_LEVEL = 500;

interface CompletionData {
  stars: number;
  xpEarned: number;
  newTotalXp: number;
  badgeId?: string;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <span className="flex">
      {[1, 2, 3].map(n => (
        <span key={n} className={`text-[9px] ${stars >= n ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
      ))}
    </span>
  );
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

  const { hp, maxHp, damageFlash, recoverAll, resetFlash } = useGameStore();
  const [gameOver, setGameOver] = useState(false);

  const [dbReady, setDbReady] = useState(false);
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [userXp, setUserXp] = useState(0);
  const [stageStars, setStageStars] = useState<Record<string, number>>({});
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig>(DEFAULT_CHARACTER_CONFIG);

  // ユーザーXPとステージ進捗をロード
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    Promise.all([
      getUserProfile(),
      getUserProgress(questId),
    ]).then(([profile, progress]) => {
      if (profile) {
        setUserLevel(profile.level ?? 1);
        setUserXp(profile.total_xp ?? 0);
        if (profile.character_config) {
          setCharacterConfig(profile.character_config as CharacterConfig);
        }
      }
      const starsMap: Record<string, number> = {};
      progress.forEach(p => { starsMap[p.stage] = p.stars; });
      setStageStars(starsMap);
    });
  }, [questId]);

  useEffect(() => {
    setCompletion(null);
    recoverAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId]);

  // clear damage flash after 400ms
  useEffect(() => {
    if (!damageFlash) return;
    const t = setTimeout(resetFlash, 400);
    return () => clearTimeout(t);
  }, [damageFlash, resetFlash]);

  // HP=0でゲームオーバー（ダメージflashが終わってから表示）
  useEffect(() => {
    if (hp === 0 && !damageFlash && !gameOver && !completion) {
      const t = setTimeout(() => setGameOver(true), 300);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hp, damageFlash]);

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

    let newTotalXp = userXp + xpEarned;
    if (isSupabaseConfigured()) {
      try {
        const result = await saveStageProgress({
          questId: quest.id,
          stageId: stage.id,
          stars,
          xpEarned,
          sql: userSql,
          badgeId: stage.badgeId,
        });
        if (result.ok) {
          newTotalXp = result.newTotalXp;
          setUserXp(result.newTotalXp);
          setUserLevel(result.newLevel);
          setStageStars(prev => ({ ...prev, [stage.id]: stars }));
        } else {
          console.error('[handleCompletion] saveStageProgress returned ok:false');
        }
      } catch (e) {
        console.error('[handleCompletion] saveStageProgress threw:', e);
      }
    }

    setCompletion({ stars, xpEarned, newTotalXp, badgeId: stage.badgeId });
  };

  const handleNext = () => {
    setCompletion(null);
    if (nextStage) {
      router.push(`/quest/${questId}/${nextStage.id}`);
    } else {
      router.push('/dashboard');
    }
  };

  const handleRetry = () => {
    setGameOver(false);
    recoverAll();
    // ページをリロードしてステージの状態をリセット
    router.refresh();
  };

  if (!quest || !stage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white text-sm">
        ステージが見つかりません
      </div>
    );
  }

  const xpInLevel = userXp % XP_PER_LEVEL;
  const xpPercent = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));
  const theme = STAGE_THEMES[stageId] ?? STAGE_THEMES.pipeline;

  // HP hearts display helper
  const HpHearts = () => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxHp }).map((_, i) => (
        <span
          key={i}
          className={`text-sm leading-none transition-all duration-150 ${
            i < hp ? 'text-red-500' : 'text-slate-700'
          } ${damageFlash && i === hp ? 'scale-150' : ''}`}
        >
          {i < hp ? '❤' : '♡'}
        </span>
      ))}
    </div>
  );

  // ── Sidebar helper ─────────────────────────────────────────────────────────
  const StageSidebar = () => (
    <aside className="w-48 border-r border-slate-800 bg-slate-900/60 flex-shrink-0 overflow-y-auto flex flex-col">
      <div className="flex-1 p-3">
        <p className="text-xs text-slate-600 uppercase tracking-wider mb-3 font-medium px-1">パイプライン</p>
        <nav className="space-y-1">
          {quest.stages.map((s, i) => {
            const isCurrent = s.id === stageId;
            const isPast = i < stageIndex;
            const stars = stageStars[s.id] ?? 0;
            const done = stars > 0 || (isPast && stageStars[s.id] !== undefined);
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
                <span className="mt-0.5 flex-shrink-0 font-mono text-xs w-4">
                  {isCurrent ? '▷' : stageStars[s.id] ? '✓' : isPast ? '✓' : `${i + 1}`}
                </span>
                <span className="leading-snug flex-1 min-w-0">{s.title}</span>
                {stageStars[s.id] ? (
                  <StarRating stars={stageStars[s.id]} />
                ) : null}
              </Link>
            );
          })}
        </nav>
      </div>
      {/* XP mini bar */}
      {isSupabaseConfigured() && (
        <div className="p-3 border-t border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Lv.{userLevel}</span>
            <span className="text-[9px] text-slate-500">{xpInLevel}/{XP_PER_LEVEL} XP</span>
          </div>
          <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>
      )}
    </aside>
  );

  // ── Pipeline design stage ──────────────────────────────────────────────────
  if (stage.type === 'pipeline' && stage.pipelineConfig) {
    const { layers, requiredConnections } = stage.pipelineConfig;
    return (
      <div className={`flex flex-col h-screen ${theme.bg} text-white overflow-hidden transition-colors duration-700 relative`}>
        {/* Damage flash overlay */}
        {damageFlash && (
          <div className="absolute inset-0 z-50 pointer-events-none bg-red-500/20 animate-pulse" />
        )}
        {gameOver && <GameOverOverlay onRetry={handleRetry} />}
        {completion && (
          <StageCompleteOverlay
            stars={completion.stars}
            xpEarned={completion.xpEarned}
            newTotalXp={completion.newTotalXp}
            badgeId={completion.badgeId}
            nextLabel={`次へ: ${nextStage?.title} →`}
            onNext={handleNext}
          />
        )}
        <header className={`flex items-center gap-3 px-5 py-3 border-b ${theme.border} flex-shrink-0`}>
          <Link href={`/quest/${questId}`} className="text-slate-500 hover:text-white text-sm transition-colors">
            ← {quest.clientName}
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 text-sm font-medium">{stage.title}</span>
          <div className="ml-auto flex items-center gap-3">
            <HpHearts />
            {isSupabaseConfigured() && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${xpPercent}%` }} />
                </div>
                <span className="text-[10px] text-slate-500">{userXp} XP</span>
                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-600/20 border border-blue-600/30 text-blue-400 font-bold text-[10px]">
                  {userLevel}
                </div>
              </div>
            )}
          </div>
        </header>
        <WorldProgressBar currentStageId={stageId} stageStars={stageStars} characterConfig={characterConfig} />
        <div className="flex flex-1 overflow-hidden">
          <StageSidebar />
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
    <div className={`flex flex-col h-screen ${theme.bg} text-white overflow-hidden transition-colors duration-700 relative`}>
      {/* Damage flash overlay */}
      {damageFlash && (
        <div className="absolute inset-0 z-50 pointer-events-none bg-red-500/20 animate-pulse" />
      )}
      {gameOver && <GameOverOverlay onRetry={handleRetry} />}
      {completion && (
        <StageCompleteOverlay
          stars={completion.stars}
          xpEarned={completion.xpEarned}
          newTotalXp={completion.newTotalXp}
          badgeId={completion.badgeId}
          nextLabel={isLastStage ? 'クエスト完了！ → ダッシュボードへ' : `次へ: ${nextStage?.title} →`}
          onNext={handleNext}
        />
      )}

      {/* Header */}
      <header className={`flex items-center gap-3 px-5 py-3 border-b ${theme.border} flex-shrink-0`}>
        <Link href={`/quest/${questId}`} className="text-slate-500 hover:text-white text-sm transition-colors">
          ← {quest.clientName}
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300 text-sm font-medium">{stage.title}</span>
        {!dbReady && (
          <span className="text-xs text-slate-600 flex items-center gap-1">
            <span className="animate-spin inline-block">⟳</span>
            DuckDB 初期化中...
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <HpHearts />
          {isSupabaseConfigured() && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${xpPercent}%` }} />
              </div>
              <span className="text-[10px] text-slate-500">{userXp} XP</span>
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-600/20 border border-blue-600/30 text-blue-400 font-bold text-[10px]">
                {userLevel}
              </div>
            </div>
          )}
        </div>
      </header>
      <WorldProgressBar currentStageId={stageId} stageStars={stageStars} />

      <div className="flex flex-1 overflow-hidden">
        <StageSidebar />

        {/* Right: GUI stage content */}
        <div className="flex-1 overflow-hidden">
          {questId === 'saas' ? (
            <>
              {stageId === 'source' && <SaasSourceStage quest={quest} dbReady={dbReady} onComplete={guiOnComplete} />}
              {stageId === 'staging' && <SaasStagingStage dbReady={dbReady} onComplete={guiOnComplete} />}
              {stageId === 'warehouse' && <SaasWarehouseStage dbReady={dbReady} onComplete={guiOnComplete} />}
              {stageId === 'mart' && <SaasMartStage dbReady={dbReady} onComplete={guiOnComplete} />}
            </>
          ) : (
            <>
              {stageId === 'source' && <SourceStage quest={quest} dbReady={dbReady} onComplete={guiOnComplete} />}
              {stageId === 'staging' && <StagingStage dbReady={dbReady} onComplete={guiOnComplete} />}
              {stageId === 'warehouse' && <WarehouseStage dbReady={dbReady} onComplete={guiOnComplete} />}
              {stageId === 'mart' && <MartStage dbReady={dbReady} onComplete={guiOnComplete} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
