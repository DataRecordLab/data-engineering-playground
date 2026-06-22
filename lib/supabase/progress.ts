'use client';

import { createClient } from '@/lib/supabase/client';
import type { QuestId, StageId } from '@/types';

export async function saveStageProgress({
  questId,
  stageId,
  stars,
  xpEarned,
  sql,
  badgeId,
}: {
  questId: QuestId;
  stageId: StageId;
  stars: number;
  xpEarned: number;
  sql: string;
  badgeId?: string;
}): Promise<{ ok: boolean; newTotalXp: number; newLevel: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, newTotalXp: 0, newLevel: 1 };

  await supabase.from('user_progress').upsert(
    {
      user_id: user.id,
      quest_id: questId,
      stage: stageId,
      status: 'completed',
      stars,
      xp_earned: xpEarned,
      pipeline_design: { sql },
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,quest_id,stage' }
  );

  const { data: profile } = await supabase
    .from('users')
    .select('total_xp')
    .eq('id', user.id)
    .single();

  const newTotalXp = (profile?.total_xp ?? 0) + xpEarned;
  const newLevel = Math.floor(newTotalXp / 500) + 1;

  await supabase
    .from('users')
    .update({ total_xp: newTotalXp, level: newLevel })
    .eq('id', user.id);

  if (badgeId) {
    const { count } = await supabase
      .from('user_badges')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('badge_id', badgeId);
    if ((count ?? 0) === 0) {
      await supabase.from('user_badges').insert({ user_id: user.id, badge_id: badgeId });
    }
  }

  return { ok: true, newTotalXp, newLevel };
}

export async function getUserProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('level, total_xp, display_name, plan')
    .eq('id', user.id)
    .single();
  return data;
}

export async function checkAiFeedbackLimit(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return true; // dev mode: allow

  const { data: profile } = await supabase
    .from('users')
    .select('plan')
    .eq('id', user.id)
    .single();

  if (profile?.plan === 'pro') return true;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('ai_feedback_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('used_at', since);

  return (count ?? 0) < 3;
}

export async function recordAiFeedbackUsage(questId: string, stageId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('ai_feedback_usage').insert({
    user_id: user.id,
    quest_id: questId,
    stage: stageId,
  });
}
