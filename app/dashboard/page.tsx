import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { WorldMapClient } from '@/components/map/WorldMapClient';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { QUESTS } from '@/lib/scenarios';
import { DailyMissionPanel } from '@/components/daily/DailyMissionPanel';
import { DuoNavItem } from '@/components/dashboard/DuoNavItem';
import type { QuestId, StageId } from '@/types';

const XP_PER_LEVEL = 500;

const LEVEL_TITLES: [number, string][] = [
  [1,  'Apprentice'],
  [5,  'Junior DE'],
  [10, 'Data Engineer'],
  [20, 'Analytics Eng'],
  [30, 'Senior DE'],
  [40, 'Data Architect'],
  [50, 'Modelion Master'],
];

function getLevelTitle(level: number): string {
  let title = LEVEL_TITLES[0][1];
  for (const [minLv, t] of LEVEL_TITLES) {
    if (level >= minLv) title = t;
  }
  return title;
}

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
        <span key={n} className={`text-[10px] ${stars >= n ? 'text-amber-400' : 'text-slate-700'}`}>★</span>
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

  if (isLocked) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3 opacity-50">
        <p className="text-slate-500 text-xs font-bold truncate mb-1">{quest.title}</p>
        <span className="text-[10px] text-slate-700">🔒 {lock.reason}</span>
      </div>
    );
  }

  const questProgress = progress.filter(p => p.quest_id === questId);
  const completedIds = new Set(questProgress.map(p => p.stage));
  const implStages = quest.stages.filter(s => s.type !== 'pipeline');
  const completedCount = implStages.filter(s => completedIds.has(s.id)).length;
  const totalCount = implStages.length;
  const firstIncomplete = quest.stages.find(s => !completedIds.has(s.id));
  const resumeUrl = firstIncomplete ? `/quest/${questId}/${firstIncomplete.id}` : `/quest/${questId}`;
  const isNew = completedCount === 0;
  const isDone = completedCount === totalCount && totalCount > 0;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const diffBadge = {
    beginner:     { label: '初級', color: '#10B981' },
    intermediate: { label: '中級', color: '#F59E0B' },
    advanced:     { label: '上級', color: '#EF4444' },
  }[quest.difficulty as 'beginner' | 'intermediate' | 'advanced'] ?? { label: '初級', color: '#10B981' };

  return (
    <div className={`rounded-xl border p-3 transition-all ${
      isDone ? 'border-amber-500/30 bg-amber-500/5'
      : isNew ? 'border-slate-700/60 bg-slate-900/60 hover:border-slate-600'
      : 'border-cyan-500/25 bg-cyan-500/5'
    }`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-white text-xs font-bold leading-tight truncate flex-1">{quest.title}</p>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0"
          style={{ background: `${diffBadge.color}15`, color: diffBadge.color }}
        >
          {diffBadge.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: isDone ? '#F59E0B' : '#06B6D4',
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-500">
          {isDone ? '✓ クリア！' : isNew ? '未開始' : `${completedCount}/${totalCount} ステージ`}
        </span>
        <Link
          href={resumeUrl}
          className="px-2.5 py-1 rounded-lg text-[10px] font-black transition-all flex-shrink-0 hover:scale-105 active:scale-95"
          style={isDone
            ? { background: '#F59E0B20', color: '#F59E0B', border: '1px solid #F59E0B40' }
            : isNew
            ? { background: '#06B6D4', color: 'white', boxShadow: '0 3px 0 #0891B2' }
            : { background: '#06B6D420', color: '#06B6D4', border: '1px solid #06B6D440' }
          }
        >
          {isDone ? '再プレイ' : isNew ? '開始 →' : '続き →'}
        </Link>
      </div>
    </div>
  );
}

// NavItem → DuoNavItem (client component, imported above)

// ── Main page ─────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

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

    level        = profileRes.data?.level ?? 1;
    totalXp      = profileRes.data?.total_xp ?? 0;
    displayName  = profileRes.data?.display_name ?? '';
    plan         = (profileRes.data?.plan as 'free' | 'pro') ?? 'free';
    streakCount  = (profileRes.data?.streak_count as number) ?? 0;
    userRole     = (profileRes.data?.role as string) ?? 'member';
    progress     = (progressRes.data ?? []) as StageProgressRow[];
  }

  const xpInLevel  = totalXp % XP_PER_LEVEL;
  const xpPercent  = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));
  const xpToNext   = XP_PER_LEVEL - xpInLevel;
  const totalDone  = progress.filter(p => p.status === 'completed').length;
  const RANK_THRESHOLD = 5;
  const stagesLeft = Math.max(0, RANK_THRESHOLD - totalDone);

  const questIds = Object.keys(QUESTS) as QuestId[];

  return (
    <div className="flex flex-col h-screen bg-[#0F172A] text-white overflow-hidden pb-[env(safe-area-inset-bottom)]">

      {/* ── Header (Duolingo-style) ── */}
      <header className="flex items-center justify-between px-5 py-2.5 border-b border-slate-800 flex-shrink-0 bg-[#090E1A]/95 backdrop-blur">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="font-black text-xl" style={{ color: '#06B6D4', textShadow: '0 0 14px rgba(6,182,212,0.7)' }}>◈</span>
          <span className="font-black tracking-tight">Modelion</span>
          <span className="text-slate-600 text-sm hidden sm:block">データワールド</span>
        </div>

        {/* Status chips + utilities */}
        <div className="flex items-center gap-2">
          {/* Plan badge — desktopのみ */}
          {plan === 'pro' ? (
            <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-black bg-violet-500/15 border border-violet-500/30 text-violet-300">PRO</span>
          ) : (
            <Link href="/upgrade" className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-black bg-slate-800 border border-slate-700 text-slate-500 hover:border-violet-500/40 hover:text-violet-400 transition-colors">
              FREE → Pro
            </Link>
          )}

          {/* 🔥 Streak chip */}
          {streakCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/25 select-none">
              <span className="text-lg leading-none" style={{ animation: 'streak-flame 1.5s ease-in-out infinite' }}>🔥</span>
              <span className="font-black text-base text-orange-400 leading-none">{streakCount}</span>
            </div>
          )}

          {/* ⚡ XP chip */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 select-none">
            <span className="text-sm leading-none">⚡</span>
            <span className="font-black text-sm text-amber-400 leading-none">{totalXp.toLocaleString()}</span>
            <span className="text-[10px] text-amber-700 hidden sm:block">XP</span>
          </div>

          {/* Level + XP progress */}
          <div className="flex items-center gap-2">
            <div className="flex-col items-end gap-0.5 hidden md:flex">
              <span className="text-[10px] text-slate-500 font-medium">{getLevelTitle(level)}</span>
              <div className="flex items-center gap-1">
                <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${xpPercent}%`, background: '#06B6D4' }}
                  />
                </div>
                <span className="text-[9px] text-slate-600">{xpInLevel}/{XP_PER_LEVEL}</span>
              </div>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base select-none"
              style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#06B6D4' }}
            >
              {level}
            </div>
          </div>

          {/* Utility icons */}
          <div className="flex items-center gap-1 pl-2 border-l border-slate-800 ml-1">
            {displayName && <span className="text-slate-600 text-xs hidden lg:block mr-1">{displayName}</span>}
            <Link
              href="/profile"
              title="スキルカード"
              className="p-2 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/8 border border-transparent hover:border-cyan-500/20 transition-all text-sm"
            >
              📊
            </Link>
            <Link
              href="/onboarding"
              title="キャラ編集"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all text-sm"
            >
              ✏️
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar (desktop only) ── */}
        <aside className="hidden lg:flex w-56 border-r border-slate-800/60 bg-[#090E1A] flex-shrink-0 flex-col overflow-hidden">

          {/* Scrollable nav */}
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0 py-2">

            {/* ── Main nav items ── */}
            <DuoNavItem href="/roadmap"     icon="🗺️" label="ロードマップ" />
            <DuoNavItem href="/skills"      icon="📚" label="スキルパス" />
            <DuoNavItem href="/debug"       icon="🚨" label="Debug Lab" />
            <DuoNavItem href="/leaderboard" icon="🏆" label="ランキング" />
            <DuoNavItem href="/quest"       icon="🎯" label="クエスト" />
            <DuoNavItem href="/shop"        icon="🛒" label="ショップ" badge={{ text: 'NEW', color: '#F59E0B' }} />
            <DuoNavItem href="/profile"     icon="👤" label="プロフィール" />

            {/* Separator */}
            <div className="mx-4 my-2 border-t border-slate-800/60" />

            {/* ── Labs ── */}
            <div className="px-5 pb-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ラボ</p>
            </div>
            <DuoNavItem href="/pipeline/ec-site" icon="🏗️" label="パイプライン設計" />
            <DuoNavItem href="/dbt"         icon="🔧" label="dbt Simulator" />
            <DuoNavItem href="/incremental" icon="⏱" label="Incremental" />
            <DuoNavItem href="/lineage"     icon="🔗" label="Lineage" />
            <DuoNavItem href="/dag"         icon="🔀" label="DAG Lab" />

            {/* Daily missions */}
            <div className="mx-4 my-2 border-t border-slate-800/60" />
            <DailyMissionPanel />

            {/* ── Quest progress ── */}
            <div className="mx-4 my-2 border-t border-slate-800/60" />
            <div className="px-5 pb-1 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">クエスト進捗</p>
              <span className="text-[10px] text-slate-600">{totalDone} クリア</span>
            </div>
            <div className="px-3 pb-3 space-y-2">
              {questIds.map(qid => (
                <QuestProgressCard key={qid} questId={qid} progress={progress} userLevel={level} />
              ))}
            </div>
          </div>

          {/* ── Bottom panel ── */}
          <div className="border-t border-slate-800 p-3 space-y-2.5 flex-shrink-0 bg-[#060A14]/80">

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center rounded-lg py-1.5 bg-slate-800/50">
                <p className="text-cyan-400 font-black text-sm">{totalXp.toLocaleString()}</p>
                <p className="text-slate-600 text-[9px]">Total XP</p>
              </div>
              <div className="text-center rounded-lg py-1.5 bg-slate-800/50">
                <p className="text-amber-400 font-black text-sm">{progress.filter(p => p.stars === 3).length}</p>
                <p className="text-slate-600 text-[9px]">★★★ クリア</p>
              </div>
            </div>

            {/* Progress nudge — Duolingo style */}
            {stagesLeft > 0 ? (
              <div className="rounded-xl px-3 py-2.5 border border-amber-500/20 bg-amber-500/5">
                <p className="text-[10px] text-amber-200/80 leading-snug mb-1.5">
                  🏆 あと<span className="font-black text-amber-300 text-xs">{stagesLeft}回</span>クリアすると<br />
                  <span className="text-amber-400 font-bold">リーダーボード</span>に参加できるよ！
                </p>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-700"
                    style={{ width: `${Math.round((totalDone / RANK_THRESHOLD) * 100)}%` }}
                  />
                </div>
                <p className="text-[8px] text-slate-600 mt-0.5 text-right">{totalDone}/{RANK_THRESHOLD}</p>
              </div>
            ) : (
              <div className="rounded-xl px-3 py-2.5 border border-cyan-500/20 bg-cyan-500/5">
                <p className="text-[10px] text-cyan-200/80 leading-snug mb-1.5">
                  ⚡ あと<span className="font-black text-cyan-300 text-xs">{xpToNext} XP</span>で<br />
                  <span className="text-cyan-400 font-bold">レベルアップ！</span>
                </p>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all duration-700"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <p className="text-[8px] text-slate-600 mt-0.5 text-right">{xpInLevel}/{XP_PER_LEVEL}</p>
              </div>
            )}

            {/* Admin only */}
            {(userRole === 'admin' || userRole === 'owner') && (
              <Link
                href="/admin"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl font-bold text-xs transition-all hover:scale-[1.02]"
                style={{ background: '#10B98115', border: '1px solid #10B98130', color: '#10B981' }}
              >
                👥 研修管理
              </Link>
            )}
            <LogoutButton />
          </div>
        </aside>

        {/* ── World Map ── */}
        <div className="flex-1 relative overflow-hidden">
          <WorldMapClient />
          <div className="absolute bottom-[72px] lg:bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <p
              className="text-slate-400 text-xs px-4 py-2 rounded-full border backdrop-blur"
              style={{ background: 'rgba(9,14,26,0.85)', borderColor: 'rgba(6,182,212,0.2)' }}
            >
              区画をクリックして依頼を受注
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
