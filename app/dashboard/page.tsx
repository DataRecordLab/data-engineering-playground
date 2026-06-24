import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { WorldMapClient } from '@/components/map/WorldMapClient';

const XP_PER_LEVEL = 500;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let level = 1;
  let totalXp = 0;
  let displayName = '';
  let plan: 'free' | 'pro' = 'free';

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('level, total_xp, display_name, plan')
      .eq('id', user.id)
      .single();

    level = profile?.level ?? 1;
    totalXp = profile?.total_xp ?? 0;
    displayName = profile?.display_name ?? '';
    plan = (profile?.plan as 'free' | 'pro') ?? 'free';
  }

  const xpInLevel = totalXp % XP_PER_LEVEL;
  const xpPercent = Math.min(100, Math.round((xpInLevel / XP_PER_LEVEL) * 100));

  return (
    <div className="flex flex-col h-screen bg-[#050914] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 flex-shrink-0 bg-slate-950/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-lg">◈</span>
          <span className="font-bold tracking-tight">DataCraft</span>
          <span className="text-slate-600 text-sm">Agency</span>
        </div>

        {/* Player status */}
        <div className="flex items-center gap-3">
          {/* Plan badge */}
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
            <div className="flex items-center gap-2">
              {displayName && (
                <span className="text-slate-500 text-xs">{displayName}</span>
              )}
              <Link
                href="/onboarding"
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800 text-slate-400 hover:text-slate-300 text-xs transition-colors"
                title="キャラクターを編集"
              >
                <span>✏️</span>
                <span>キャラ編集</span>
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-xs text-slate-500">XP</p>
              <div className="flex items-center gap-1.5">
                <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400">{xpInLevel} / {XP_PER_LEVEL}</span>
              </div>
            </div>
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-600/30 text-blue-400 font-bold text-sm">
              {level}
            </div>
          </div>
        </div>
      </header>

      {/* World Map — fills remaining height */}
      <div className="flex-1 relative overflow-hidden">
        <WorldMapClient />

        {/* Overlay hint */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <p className="text-slate-600 text-xs bg-slate-950/60 backdrop-blur px-3 py-1.5 rounded-full border border-slate-800">
            区画をクリックして依頼を受注
          </p>
        </div>
      </div>
    </div>
  );
}
