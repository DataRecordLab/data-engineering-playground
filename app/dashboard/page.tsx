import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { WorldMapClient } from '@/components/map/WorldMapClient';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { QUESTS } from '@/lib/scenarios';
import { StreakBadge } from '@/components/streak/StreakBadge';
import { DailyMissionPanel } from '@/components/daily/DailyMissionPanel';
import type { QuestId, StageId } from '@/types';

const XP_PER_LEVEL = 500;

// WorldMap の DISTRICTS と同じロック条件
const QUEST_LOCK: Record<string, { minLevel: number; reason: string }> = {
  'saas':    { minLevel: 3, reason: 'Lv.3 が必要' },
  'medical': { minLevel: 3, reason: 'Lv.3 が必要' },
  'finance': { minLevel: 5, reason: 'Lv.5 + 中級2本完了' },
};

interface StageProgressRow {
  quest_id: string;
  stage: string;
  status: string;
  stars: number;
  xp_earned: number;
}

function StarsDisplay({ stars }: { stars: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map(n => (
        <span key={n} className={`text-[10px] ${stars >= n ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
      ))}
    </span>
  );
}

function QuestProgressCard({
  questId,
  progress,
  userLevel,
}: {
  questId: QuestId;
  progress: StageProgressRow[];
  userLevel: number;
}) {
  const quest = QUESTS[questId];
  if (!quest) return null;

  const lock = QUEST_LOCK[questId];
  const isLocked = lock ? userLevel < lock.minLevel : false;

  // ── ロック状態 ──
  if (isLocked) {
    const diffColor = {
      beginner: 'text-green-600 border-green-900/40 bg-green-900/10',
      intermediate: 'text-amber-700 border-amber-900/30 bg-amber-900/10',
      advanced: 'text-red-700 border-red-900/30 bg-red-900/10',
    }[quest.difficulty];

    return (
      <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-3 opacity-60">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-slate-500 text-xs font-semibold leading-tight truncate">{quest.title}</p>
            <p className="text-slate-700 text-[10px] mt-0.5 truncate">{quest.clientName}</p>
          </div>
          <span className={`text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 font-medium ${diffColor}`}>
            {quest.difficulty === 'beginner' ? '初級' : quest.difficulty === 'intermediate' ? '中級' : '上級'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-slate-700">🔒 {lock.reason}</span>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-slate-700 border border-slate-800 cursor-not-allowed">
            ロック中
          </span>
        </div>
      </div>
    );
  }

  // ── 通常状態 ──
  const questProgress = progress.filter(p => p.quest_id === questId);
  const completedIds = new Set(questProgress.map(p => p.stage));

  const implStages = quest.stages.filter(s => s.type !== 'pipeline');
  const completedCount = implStages.filter(s => completedIds.has(s.id)).length;
  const totalCount = implStages.length;

  const firstIncomplete = quest.stages.find(s => !completedIds.has(s.id));
  const resumeUrl = firstIncomplete
    ? `/quest/${questId}/${firstIncomplete.id}`
    : `/quest/${questId}`;

  const isNew = completedCount === 0;
  const isDone = completedCount === totalCount && totalCount > 0;

  const diffColor = {
    beginner: 'text-green-400 border-green-500/30 bg-green-500/5',
    intermediate: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
    advanced: 'text-red-400 border-red-500/30 bg-red-500/5',
  }[quest.difficulty];

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isDone
        ? 'border-yellow-500/30 bg-yellow-500/5'
        : isNew
        ? 'border-slate-700 bg-slate-900/60 hover:border-slate-600'
        : 'border-blue-500/30 bg-blue-500/5'
    }`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold leading-tight truncate">{quest.title}</p>
          <p className="text-slate-500 text-[10px] mt-0.5 truncate">{quest.clientName}</p>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded border flex-shrink-0 font-medium ${diffColor}`}>
          {quest.difficulty === 'beginner' ? '初級' : quest.difficulty === 'intermediate' ? '中級' : '上級'}
        </span>
      </div>

      {/* Stage dots */}
      <div className="flex gap-1 mb-2.5">
        {quest.stages.map((stage) => {
          const prog = questProgress.find(p => p.stage === stage.id);
          const done = !!prog;
          const stars = prog?.stars ?? 0;
          return (
            <div key={stage.id} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
              <div className={`w-full h-1.5 rounded-full transition-all ${
                done
                  ? stars >= 3 ? 'bg-yellow-400' : stars >= 2 ? 'bg-blue-400' : 'bg-slate-500'
                  : 'bg-slate-800'
              }`} />
              {done && <StarsDisplay stars={stars} />}
            </div>
          );
        })}
      </div>

      {/* Progress text + button */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500">
          {isDone ? '✓ 完了' : isNew ? '未開始' : `${completedCount} / ${totalCount} ステージ`}
        </span>
        <Link
          href={resumeUrl}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors flex-shrink-0 ${
            isDone
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30'
              : isNew
              ? 'bg-blue-600 text-white hover:bg-blue-500'
              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
          }`}
        >
          {isDone ? '再プレイ' : isNew ? '開始 →' : '続きから →'}
        </Link>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let level = 1;
  let totalXp = 0;
  let displayName = '';
  let plan: 'free' | 'pro' = 'free';
  let streakCount = 0;
  let userRole = 'member';
  let progress: StageProgressRow[] = [];

  if (user) {
    const [profileRes, progressRes] = await Promise.all([
      supabase
        .from('users')
        .select('level, total_xp, display_name, plan, streak_count, role')
        .eq('id', user.id)
        .single(),
      supabase
        .from('user_progress')
        .select('quest_id, stage, status, stars, xp_earned')
        .eq('user_id', user.id),
    ]);

    level = profileRes.data?.level ?? 1;
    totalXp = profileRes.data?.total_xp ?? 0;
    displayName = profileRes.data?.display_name ?? '';
    plan = (profileRes.data?.plan as 'free' | 'pro') ?? 'free';
    streakCount = (profileRes.data?.streak_count as number) ?? 0;
    userRole = (profileRes.data?.role as string) ?? 'member';
    progress = (progressRes.data ?? []) as StageProgressRow[];
  }

  const xpInLevel = totalXp % XP_PER_LEVEL;
  const xpPercent = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));
  const totalCompletedStages = progress.filter(p => p.status === 'completed').length;

  const questIds = Object.keys(QUESTS) as QuestId[];

  return (
    <div className="flex flex-col h-screen bg-[#050914] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 flex-shrink-0 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-lg">◈</span>
          <span className="font-bold tracking-tight">Modelion</span>
          <span className="text-slate-600 text-sm">Agency</span>
        </div>

        <div className="flex items-center gap-3">
          {plan === 'pro' ? (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300">
              PRO
            </span>
          ) : (
            <Link
              href="/upgrade"
              className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-500 hover:border-purple-500/40 hover:text-purple-400 transition-colors"
            >
              FREE → Pro
            </Link>
          )}
          <div className="flex items-center gap-2">
            {streakCount >= 1 && <StreakBadge count={streakCount} size="sm" />}
            {displayName && <span className="text-slate-500 text-xs">{displayName}</span>}
            <Link
              href="/profile"
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/60 hover:border-indigo-500/40 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 text-xs transition-colors"
              title="スキルカードを見る"
            >
              <span>📊</span>
              <span>スキルカード</span>
            </Link>
            <Link
              href="/onboarding"
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800 text-slate-400 hover:text-slate-300 text-xs transition-colors"
              title="キャラクターを編集"
            >
              <span>✏️</span>
              <span>キャラ編集</span>
            </Link>
          </div>
          {/* XP bar */}
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-[10px] text-slate-500">
                Lv.{level} — {totalXp} XP total
              </p>
              <div className="flex items-center gap-1.5">
                <div className="w-28 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{xpInLevel}/{XP_PER_LEVEL}</span>
              </div>
            </div>
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-600/30 text-blue-400 font-bold text-base">
              {level}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Quest progress panel */}
        <aside className="w-56 border-r border-slate-800/60 bg-slate-950/80 flex-shrink-0 flex flex-col overflow-hidden">
          {/* Scrollable middle section */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          {/* Skills リンク */}
          <Link
            href="/skills"
            className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/60 hover:bg-slate-800/40 transition-colors group"
          >
            <span className="text-base">📚</span>
            <div>
              <p className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">スキルパス</p>
              <p className="text-[9px] text-slate-600">Duolingo風で学ぶ</p>
            </div>
            <span className="ml-auto text-slate-700 text-xs">→</span>
          </Link>

          {/* Debug Lab リンク */}
          <Link
            href="/debug"
            className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/60 hover:bg-red-950/30 transition-colors group"
          >
            <span className="text-base">🚨</span>
            <div>
              <p className="text-xs font-bold text-slate-300 group-hover:text-red-300 transition-colors">Debug Lab</p>
              <p className="text-[9px] text-slate-600">インシデントを解決</p>
            </div>
            <span className="ml-auto text-slate-700 text-xs">→</span>
          </Link>

          {/* dbt Simulator リンク */}
          <Link
            href="/dbt"
            className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-800/60 hover:bg-amber-950/20 transition-colors group"
          >
            <span className="text-base font-mono font-bold text-amber-500 text-sm">dbt</span>
            <div>
              <p className="text-xs font-bold text-slate-300 group-hover:text-amber-300 transition-colors">dbt Simulator</p>
              <p className="text-[9px] text-slate-600">ブラウザで dbt を体験</p>
            </div>
            <span className="ml-auto text-slate-700 text-xs">→</span>
          </Link>

          {/* Incremental Lab */}
          <div className="border-b border-slate-800/60">
            <Link
              href="/incremental"
              className="flex items-center gap-2 px-3 py-2 hover:bg-blue-950/20 transition-colors group"
            >
              <span className="text-base">⏱</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-300 group-hover:text-blue-300 transition-colors">Incremental Lab</p>
                  <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400 font-bold">無料</span>
                </div>
                <p className="text-[9px] text-slate-600">Full Load を体験する</p>
              </div>
            </Link>
            <Link
              href="/incremental/quest"
              className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-indigo-950/20 transition-colors group"
            >
              <span className="text-[10px]">🗺️</span>
              <p className="text-[10px] text-slate-500 group-hover:text-indigo-300 transition-colors">クエストモード</p>
              <span className="ml-auto text-[8px] px-1 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-bold">PRO</span>
            </Link>
          </div>

          {/* Lineage Lab */}
          <div className="border-b border-slate-800/60">
            <Link
              href="/lineage"
              className="flex items-center gap-2 px-3 py-2 hover:bg-purple-950/20 transition-colors group"
            >
              <span className="text-base">🔗</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-300 group-hover:text-purple-300 transition-colors">Lineage Visualizer</p>
                  <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400 font-bold">無料</span>
                </div>
                <p className="text-[9px] text-slate-600">データの流れをトレース</p>
              </div>
            </Link>
            <Link
              href="/lineage/quest"
              className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-indigo-950/20 transition-colors group"
            >
              <span className="text-[10px]">🗺️</span>
              <p className="text-[10px] text-slate-500 group-hover:text-indigo-300 transition-colors">クエストモード</p>
              <span className="ml-auto text-[8px] px-1 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-bold">PRO</span>
            </Link>
          </div>

          {/* DAG Lab */}
          <div className="border-b border-slate-800/60">
            <Link
              href="/dag"
              className="flex items-center gap-2 px-3 py-2 hover:bg-green-950/20 transition-colors group"
            >
              <span className="text-base">🔀</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-300 group-hover:text-green-300 transition-colors">DAG Lab</p>
                  <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400 font-bold">無料</span>
                </div>
                <p className="text-[9px] text-slate-600">オーケストレーションを体験</p>
              </div>
            </Link>
            <Link
              href="/dag/quest"
              className="flex items-center gap-2 pl-8 pr-3 py-1.5 hover:bg-indigo-950/20 transition-colors group"
            >
              <span className="text-[10px]">🗺️</span>
              <p className="text-[10px] text-slate-500 group-hover:text-indigo-300 transition-colors">クエストモード</p>
              <span className="ml-auto text-[8px] px-1 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-bold">PRO</span>
            </Link>
          </div>

          {/* Daily missions */}
          <DailyMissionPanel />

          <div className="p-3 border-b border-slate-800/60 flex-shrink-0">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">クエスト</p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-white font-semibold text-sm">{totalCompletedStages}</span>
              <span className="text-slate-600 text-[10px]">ステージクリア</span>
            </div>
          </div>
          <div className="p-2 space-y-2">
            {questIds.map(qid => (
              <QuestProgressCard key={qid} questId={qid} progress={progress} userLevel={level} />
            ))}
          </div>
          </div>{/* end scrollable */}

          {/* Bottom stats + leaderboard link */}
          <div className="p-3 border-t border-slate-800/60 space-y-2 flex-shrink-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <p className="text-blue-400 font-bold text-sm">{totalXp}</p>
                <p className="text-slate-600 text-[9px]">Total XP</p>
              </div>
              <div className="text-center">
                <p className="text-yellow-400 font-bold text-sm">
                  {progress.filter(p => p.stars === 3).length}
                </p>
                <p className="text-slate-600 text-[9px]">★★★ クリア</p>
              </div>
            </div>
            <Link
              href="/leaderboard"
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 hover:text-yellow-400 text-[10px] font-bold transition-colors"
            >
              🏆 リーダーボード
            </Link>
            {(userRole === 'admin' || userRole === 'owner') && (
              <Link
                href="/admin"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 hover:text-emerald-400 text-[10px] font-bold transition-colors"
              >
                👥 研修管理ダッシュボード
              </Link>
            )}
            <LogoutButton />
          </div>
        </aside>

        {/* Right: World Map */}
        <div className="flex-1 relative overflow-hidden">
          <WorldMapClient />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <p className="text-slate-600 text-xs bg-slate-950/60 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800">
              区画をクリックして依頼を受注
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
