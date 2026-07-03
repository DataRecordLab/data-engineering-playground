'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuest } from '@/lib/scenarios';
import { registerCsvFile } from '@/lib/duckdb/engine';
import { StageCompleteOverlay, type LabHint } from '@/components/stage/StageCompleteOverlay';
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
import { WorldAtmosphere, type WorldType } from '@/components/stage/WorldAtmosphere';
import { EmergencyEventModal } from '@/components/events/EmergencyEventModal';
import { useEmergencyEvent } from '@/hooks/useEmergencyEvent';
import type { EmergencyEvent } from '@/lib/events/emergencyEvents';
import { MissionToast } from '@/components/daily/MissionToast';
import { completeDailyMission } from '@/lib/daily/missions';

function getLabHints(questId: string, stageId: string): LabHint[] {
  const q = questId === 'saas' ? 'saas' : 'ec-site';
  const base: Record<string, LabHint[]> = {
    source: [
      {
        label: 'Incremental Load Lab',
        emoji: '⏱',
        href: `/incremental?quest=${q}`,
        description: q === 'saas'
          ? 'サブスクデータで Full Load vs CDC を体験'
          : '注文データで差分ロードの威力を体感',
      },
    ],
    staging: [],
    warehouse: [
      {
        label: 'Data Lineage Visualizer',
        emoji: '🔗',
        href: `/lineage?quest=${q}`,
        description: q === 'saas'
          ? 'fct_mrr がどのテーブルに依存しているか確認'
          : 'fact_orders の上流・下流の依存関係を確認',
      },
    ],
    mart: [
      {
        label: 'DAG Lab',
        emoji: '🗺️',
        href: '/dag',
        description: 'あなたが設計したパイプラインがDAGになる',
      },
      {
        label: 'Data Lineage Visualizer',
        emoji: '🔗',
        href: `/lineage?quest=${q}`,
        description: 'mart層まで繋がった全リネージを確認',
      },
    ],
    pipeline: [
      {
        label: 'DAG Lab',
        emoji: '🗺️',
        href: '/dag',
        description: 'この設計がオーケストレーションDAGになる',
      },
    ],
  };
  return base[stageId] ?? [];
}

type WorldTheme = {
  bgStyle: string;
  border: string;
  worldName: string;
  worldEmoji: string;
  layerDesc: string;
  accent: string;
  sidebarBorderColor: string;
  particleType: WorldType;
};

const STAGE_THEMES: Record<string, WorldTheme> = {
  pipeline: {
    bgStyle: 'linear-gradient(180deg, #0a0e1a 0%, #06091a 100%)',
    border: 'border-blue-900/30',
    worldName: 'パイプライン設計',
    worldEmoji: '⚙️',
    layerDesc: 'Pipeline Design — データの流れを設計する',
    accent: '#3B82F6',
    sidebarBorderColor: 'rgba(59,130,246,0.15)',
    particleType: null,
  },
  source: {
    bgStyle: 'linear-gradient(180deg, #04000e 0%, #0a0020 60%, #060018 100%)',
    border: 'border-violet-900/40',
    worldName: '洞窟エリア',
    worldEmoji: '🪨',
    layerDesc: 'Source Layer — 生データの原点',
    accent: '#7C3AED',
    sidebarBorderColor: 'rgba(124,58,237,0.2)',
    particleType: 'cave',
  },
  staging: {
    bgStyle: 'linear-gradient(180deg, #020c02 0%, #031506 60%, #020e04 100%)',
    border: 'border-emerald-900/40',
    worldName: '草原エリア',
    worldEmoji: '🌿',
    layerDesc: 'Staging Layer — クレンジングと整形',
    accent: '#059669',
    sidebarBorderColor: 'rgba(5,150,105,0.2)',
    particleType: 'grassland',
  },
  warehouse: {
    bgStyle: 'linear-gradient(180deg, #0e0100 0%, #160200 60%, #100100 100%)',
    border: 'border-red-900/40',
    worldName: '火山エリア',
    worldEmoji: '🌋',
    layerDesc: 'Warehouse Layer — データモデリング',
    accent: '#DC2626',
    sidebarBorderColor: 'rgba(220,38,38,0.2)',
    particleType: 'volcano',
  },
  mart: {
    bgStyle: 'linear-gradient(180deg, #0a0700 0%, #120e00 60%, #0e0b00 100%)',
    border: 'border-yellow-900/40',
    worldName: '城エリア',
    worldEmoji: '🏰',
    layerDesc: 'Mart Layer — ビジネス意思決定',
    accent: '#D97706',
    sidebarBorderColor: 'rgba(217,119,6,0.2)',
    particleType: 'castle',
  },
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

  const {
    hp, maxHp, damageFlash, recoverAll, resetFlash,
    characterConfig, characterConfigLoaded, setCharacterConfig,
  } = useGameStore();
  const [gameOver, setGameOver] = useState(false);
  const [worldEntering, setWorldEntering] = useState(true);
  const [activeEvent, setActiveEvent] = useState<EmergencyEvent | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [completion, setCompletion] = useState<CompletionData | null>(null);
  const [userLevel, setUserLevel] = useState(1);
  const [userXp, setUserXp] = useState(0);
  const [stageStars, setStageStars] = useState<Record<string, number>>({});

  // Random emergency event (25-90s after entering stage, not during completion/gameover/intro)
  useEmergencyEvent({
    stageId,
    enabled: !completion && !gameOver && !worldEntering,
    onTrigger: setActiveEvent,
  });

  // ユーザーXPとステージ進捗をロード（characterConfigはstoreから取得・未ロード時のみ fetch）
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    Promise.all([
      getUserProfile(),
      getUserProgress(questId),
    ]).then(([profile, progress]) => {
      if (profile) {
        setUserLevel(profile.level ?? 1);
        setUserXp(profile.total_xp ?? 0);
        if (profile.character_config && !characterConfigLoaded) {
          setCharacterConfig(profile.character_config as CharacterConfig);
        }
      }
      const starsMap: Record<string, number> = {};
      progress.forEach(p => { starsMap[p.stage] = p.stars; });
      setStageStars(starsMap);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  useEffect(() => {
    setCompletion(null);
    setWorldEntering(true);
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

    // Daily mission triggers
    completeDailyMission('stage_clear');
    if (stars === 3) completeDailyMission('star3_any');
    if (stageId === 'source' || stageId === 'staging' || stageId === 'warehouse' || stageId === 'mart') {
      completeDailyMission('pipeline_design');
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
    <aside
      className="w-48 flex-shrink-0 overflow-y-auto flex flex-col border-r"
      style={{ borderColor: theme.sidebarBorderColor, background: 'rgba(0,0,0,0.55)' }}
    >
      <div className="flex-1 p-3">
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
                  isPast && !isCurrent ? 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  : isCurrent ? '' : 'text-slate-600 hover:bg-slate-800/50 hover:text-slate-400'
                }`}
                style={isCurrent ? {
                  background: `${theme.accent}18`,
                  color: theme.accent,
                  border: `1px solid ${theme.accent}35`,
                  borderRadius: '8px',
                } : undefined}
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
        <div className="p-3 border-t" style={{ borderColor: theme.sidebarBorderColor }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] text-slate-600 uppercase tracking-wider">Lv.{userLevel}</span>
            <span className="text-[9px] text-slate-500">{xpInLevel}/{XP_PER_LEVEL} XP</span>
          </div>
          <div className="w-full h-1 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${xpPercent}%`, background: `linear-gradient(to right, ${theme.accent}cc, ${theme.accent})` }}
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
      <div className="flex flex-col h-screen text-white overflow-hidden relative" style={{ background: theme.bgStyle }}>
        {/* World atmosphere layer */}
        <WorldAtmosphere worldType={theme.particleType} />
        {/* Daily mission completion toast */}
        <MissionToast />
        {/* Emergency event modal */}
        {activeEvent && (
          <EmergencyEventModal
            event={activeEvent}
            accent={theme.accent}
            onClose={(xp) => {
              setActiveEvent(null);
              if (xp > 0) setUserXp(prev => prev + xp);
            }}
          />
        )}
        {/* World entry animation */}
        {worldEntering && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${theme.accent}18 0%, #000 65%)`, animation: 'world-enter-bg 2.0s ease-out forwards' }} onAnimationEnd={() => setWorldEntering(false)}>
            <div style={{ textAlign: 'center', animation: 'world-enter-content 2.0s ease-out forwards' }}>
              <div className="text-[80px] leading-none mb-5" style={{ filter: `drop-shadow(0 0 24px ${theme.accent}) drop-shadow(0 0 48px ${theme.accent}60)` }}>
                {theme.worldEmoji}
              </div>
              <div className="text-5xl font-black mb-3 tracking-tight" style={{ color: theme.accent, textShadow: `0 0 32px ${theme.accent}90, 0 0 64px ${theme.accent}40` }}>
                {theme.worldName}
              </div>
              <div className="text-slate-400 text-sm tracking-[0.2em] uppercase">{theme.layerDesc}</div>
            </div>
          </div>
        )}
        {/* High-z overlays */}
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
            labHints={getLabHints(questId, stageId)}
          />
        )}
        {/* Content: z-10 to sit above atmosphere */}
        <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
          <header className={`flex items-center gap-3 px-5 py-3 border-b ${theme.border} flex-shrink-0`} style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}>
            <Link href={`/quest/${questId}`} className="text-slate-500 hover:text-white text-sm transition-colors">
              ← {quest.clientName}
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-slate-300 text-sm font-medium">{stage.title}</span>
            {/* World badge */}
            <span className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1" style={{ background: `${theme.accent}18`, color: theme.accent, border: `1px solid ${theme.accent}35` }}>
              {theme.worldEmoji} {theme.worldName}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <HpHearts />
              {isSupabaseConfigured() && (
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1 rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xpPercent}%`, background: theme.accent }} />
                  </div>
                  <span className="text-[10px] text-slate-500">{userXp} XP</span>
                  <div className="flex items-center justify-center w-6 h-6 rounded-md font-bold text-[10px]" style={{ background: `${theme.accent}20`, border: `1px solid ${theme.accent}40`, color: theme.accent }}>
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
            <div className="w-72 overflow-y-auto flex-shrink-0 border-r" style={{ borderColor: theme.sidebarBorderColor, background: 'rgba(0,0,0,0.3)' }}>
              <div className="p-5 space-y-4">
                <div className="px-4 py-3 rounded-xl border" style={{ background: `${theme.accent}10`, borderColor: `${theme.accent}25` }}>
                  <p className="text-xs uppercase tracking-wider mb-1 font-medium" style={{ color: theme.accent }}>今日学ぶ概念</p>
                  <p className="text-white text-sm font-medium leading-relaxed">{stage.conceptTaught}</p>
                </div>
                {stage.storyMessage && (
                  <div className="px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700/60">
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{stage.storyMessage}</p>
                  </div>
                )}
                <div className="px-4 py-3 rounded-xl border border-slate-700/60 bg-slate-900/40">
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
      </div>
    );
  }

  // ── GUI stage (source / staging / warehouse / mart) ───────────────────────
  const guiOnComplete = async () => { await handleCompletion('', 2); };

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden relative" style={{ background: theme.bgStyle }}>
      {/* World atmosphere layer */}
      <WorldAtmosphere worldType={theme.particleType} />
      {/* Daily mission completion toast */}
      <MissionToast />
      {/* Emergency event modal */}
      {activeEvent && (
        <EmergencyEventModal
          event={activeEvent}
          accent={theme.accent}
          onClose={(xp) => {
            setActiveEvent(null);
            if (xp > 0) setUserXp(prev => prev + xp);
          }}
        />
      )}
      {/* World entry animation */}
      {worldEntering && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${theme.accent}18 0%, #000 65%)`, animation: 'world-enter-bg 2.0s ease-out forwards' }} onAnimationEnd={() => setWorldEntering(false)}>
          <div style={{ textAlign: 'center', animation: 'world-enter-content 2.0s ease-out forwards' }}>
            <div className="text-[80px] leading-none mb-5" style={{ filter: `drop-shadow(0 0 24px ${theme.accent}) drop-shadow(0 0 48px ${theme.accent}60)` }}>
              {theme.worldEmoji}
            </div>
            <div className="text-5xl font-black mb-3 tracking-tight" style={{ color: theme.accent, textShadow: `0 0 32px ${theme.accent}90, 0 0 64px ${theme.accent}40` }}>
              {theme.worldName}
            </div>
            <div className="text-slate-400 text-sm tracking-[0.2em] uppercase">{theme.layerDesc}</div>
          </div>
        </div>
      )}
      {/* High-z overlays */}
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
          labHints={getLabHints(questId, stageId)}
        />
      )}

      {/* Content: z-10 to sit above atmosphere */}
      <div className="relative z-10 flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <header className={`flex items-center gap-3 px-5 py-3 border-b ${theme.border} flex-shrink-0`} style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}>
          <Link href={`/quest/${questId}`} className="text-slate-500 hover:text-white text-sm transition-colors">
            ← {quest.clientName}
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 text-sm font-medium">{stage.title}</span>
          {/* World badge */}
          <span className="px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1" style={{ background: `${theme.accent}18`, color: theme.accent, border: `1px solid ${theme.accent}35` }}>
            {theme.worldEmoji} {theme.worldName}
          </span>
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
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xpPercent}%`, background: theme.accent }} />
                </div>
                <span className="text-[10px] text-slate-500">{userXp} XP</span>
                <div className="flex items-center justify-center w-6 h-6 rounded-md font-bold text-[10px]" style={{ background: `${theme.accent}20`, border: `1px solid ${theme.accent}40`, color: theme.accent }}>
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
    </div>
  );
}
