import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MILESTONE_XP: Record<number, number> = {
  3: 100,
  7: 300,
  30: 1000,
};

function getTodayJst(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const today = getTodayJst();
  const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: profile } = await supabase
    .from('users')
    .select('streak_count, last_active_date, total_xp, level')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const lastActive = profile.last_active_date as string | null;

  if (lastActive === today) {
    return NextResponse.json({
      streakCount: profile.streak_count ?? 0,
      milestone: null,
      alreadyCheckedIn: true,
    });
  }

  const prevStreak = profile.streak_count ?? 0;
  const newStreak = lastActive === yesterday ? prevStreak + 1 : 1;
  const milestoneXp = MILESTONE_XP[newStreak] ?? 0;
  const newTotalXp = (profile.total_xp ?? 0) + milestoneXp;
  const newLevel = Math.floor(newTotalXp / 500) + 1;

  await supabase
    .from('users')
    .update({
      streak_count: newStreak,
      last_active_date: today,
      ...(milestoneXp > 0 ? { total_xp: newTotalXp, level: newLevel } : {}),
    })
    .eq('id', user.id);

  return NextResponse.json({
    streakCount: newStreak,
    milestone: milestoneXp > 0 ? { days: newStreak, xp: milestoneXp } : null,
    alreadyCheckedIn: false,
  });
}
