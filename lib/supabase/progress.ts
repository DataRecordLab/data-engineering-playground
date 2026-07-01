'use client';

import { createClient } from '@/lib/supabase/client';
import type { QuestId, StageId } from '@/types';

export interface StageProgressRow {
  quest_id: string;
  stage: string;
  status: string;
  stars: number;
  xp_earned: number;
}

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
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('[saveStageProgress] auth error:', authError);
    return { ok: false, newTotalXp: 0, newLevel: 1 };
  }

  // users行が存在しない場合に作成（onboarding未完了でもXP保存できるように）
  await supabase.from('users').upsert(
    { id: user.id },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  const { error: upsertError } = await supabase.from('user_progress').upsert(
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

  if (upsertError) {
    console.error('[saveStageProgress] upsert error:', upsertError);
    return { ok: false, newTotalXp: 0, newLevel: 1 };
  }

  // Quest XP + Skill XP を合算（同じステージを複数回クリアしても二重計上しない）
  const [{ data: allQuestProgress, error: sumError }, { data: allSkillProgress }] = await Promise.all([
    supabase.from('user_progress').select('xp_earned').eq('user_id', user.id),
    supabase.from('skill_progress').select('xp_earned').eq('user_id', user.id),
  ]);

  if (sumError) console.error('[saveStageProgress] sum error:', sumError);

  const questXp = allQuestProgress?.reduce((acc, row) => acc + (row.xp_earned ?? 0), 0) ?? xpEarned;
  const skillXp = allSkillProgress?.reduce((acc, row) => acc + (row.xp_earned ?? 0), 0) ?? 0;
  const newTotalXp = questXp + skillXp;
  const newLevel = Math.floor(newTotalXp / 500) + 1;

  const { error: updateError } = await supabase
    .from('users')
    .update({ total_xp: newTotalXp, level: newLevel })
    .eq('id', user.id);

  if (updateError) console.error('[saveStageProgress] update error:', updateError);

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

  // ストリーク更新 + バッジチェック（非同期・失敗しても続行）
  Promise.all([updateStreak(), checkAndAwardBadges()]).catch(() => {});

  return { ok: true, newTotalXp, newLevel };
}

export async function getUserProgress(questId?: string): Promise<StageProgressRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from('user_progress')
    .select('quest_id, stage, status, stars, xp_earned')
    .eq('user_id', user.id);

  if (questId) query = query.eq('quest_id', questId);

  const { data } = await query;
  return (data ?? []) as StageProgressRow[];
}

export async function getUserProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('users')
    .select('level, total_xp, display_name, plan, character_config, streak_count')
    .eq('id', user.id)
    .single();
  return data;
}

export async function checkAiFeedbackLimit(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return true;

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

// ── Skills progress ──────────────────────────────────────────────────

export interface SkillProgressRow {
  section_id: string;
  lesson_id: string;
  xp_earned: number;
  stars: number;
  completed_at: string;
}

export async function getSkillProgress(): Promise<SkillProgressRow[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('skill_progress')
    .select('section_id, lesson_id, xp_earned, stars, completed_at')
    .eq('user_id', user.id);
  return (data ?? []) as SkillProgressRow[];
}

// ── Streak ───────────────────────────────────────────────────────────

export async function updateStreak(): Promise<number> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  const { data: profile } = await supabase
    .from('users')
    .select('streak_count, last_active_date')
    .eq('id', user.id)
    .single();

  if (!profile) return 0;

  const last = profile.last_active_date as string | null;
  if (last === today) return (profile.streak_count as number) ?? 0;

  const newStreak = last === yesterday ? ((profile.streak_count as number) ?? 0) + 1 : 1;

  await supabase
    .from('users')
    .update({ streak_count: newStreak, last_active_date: today })
    .eq('id', user.id);

  return newStreak;
}

// ── Badges ───────────────────────────────────────────────────────────

export async function getUserBadgeIds(): Promise<string[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', user.id);
  return (data ?? []).map(r => r.badge_id as string);
}

export async function awardBadges(badgeIds: string[]): Promise<void> {
  if (badgeIds.length === 0) return;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('user_badges').insert(
    badgeIds.map(badge_id => ({ user_id: user.id, badge_id }))
  );
}

export async function checkAndAwardBadges(): Promise<string[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [
    { data: allProgress },
    { data: skillRows },
    { data: profileData },
    existingIds,
  ] = await Promise.all([
    supabase.from('user_progress').select('quest_id, stage, stars, xp_earned').eq('user_id', user.id),
    supabase.from('skill_progress').select('section_id, lesson_id').eq('user_id', user.id),
    supabase.from('users').select('total_xp, streak_count').eq('id', user.id).single(),
    getUserBadgeIds(),
  ]);

  // BADGE_DEFS をここでインポート（循環依存を避けるため動的 require ではなく top-level import に）
  const { BADGE_DEFS } = await import('@/lib/badges');

  const rows = (allProgress ?? []) as Array<{ quest_id: string; stars: number; xp_earned: number }>;
  const questProgress = rows.filter(p => p.quest_id !== 'debug');
  const debugProgress = rows.filter(p => p.quest_id === 'debug');
  const skillProgress = (skillRows ?? []) as Array<{ section_id: string; lesson_id: string }>;
  const profile = profileData as { total_xp: number; streak_count: number } | null;

  const newIds: string[] = [];
  for (const badge of BADGE_DEFS) {
    if (existingIds.includes(badge.id)) continue;
    if (badge.check({
      questProgress,
      skillProgress,
      debugProgress,
      totalXp: profile?.total_xp ?? 0,
      streakCount: profile?.streak_count ?? 0,
    })) {
      newIds.push(badge.id);
    }
  }

  await awardBadges(newIds);
  return newIds;
}

// ── Debug Lab progress ────────────────────────────────────────────────

export async function saveDebugCompletion(scenarioId: string): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('users').upsert(
    { id: user.id },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  await supabase.from('user_progress').upsert(
    {
      user_id: user.id,
      quest_id: 'debug',
      stage: scenarioId,
      status: 'completed',
      stars: 3,
      xp_earned: 0,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,quest_id,stage' }
  );

  await Promise.all([updateStreak(), checkAndAwardBadges()]);
}

export async function saveSkillProgress({
  sectionId,
  lessonId,
  xpEarned,
  stars,
}: {
  sectionId: string;
  lessonId: string;
  xpEarned: number;
  stars: number;
}): Promise<{ ok: boolean; newTotalXp: number; newLevel: number }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, newTotalXp: 0, newLevel: 1 };

  // users行が存在しない場合に作成
  await supabase.from('users').upsert(
    { id: user.id },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  // 既存レコードより高いスコアの場合のみ更新
  const { data: existing } = await supabase
    .from('skill_progress')
    .select('xp_earned')
    .eq('user_id', user.id)
    .eq('section_id', sectionId)
    .eq('lesson_id', lessonId)
    .single();

  const prevXp = existing?.xp_earned ?? 0;
  const xpDelta = Math.max(0, xpEarned - prevXp); // 追加分のみ

  const { error } = await supabase.from('skill_progress').upsert(
    {
      user_id: user.id,
      section_id: sectionId,
      lesson_id: lessonId,
      xp_earned: Math.max(xpEarned, prevXp), // 高い方を保持
      stars,
      completed_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,section_id,lesson_id' }
  );

  if (error) {
    console.error('[saveSkillProgress] error:', error);
    return { ok: false, newTotalXp: 0, newLevel: 1 };
  }

  // Quest XP + Skill XP を合算して users.total_xp を更新
  const [{ data: questXpData }, { data: skillXpData }] = await Promise.all([
    supabase.from('user_progress').select('xp_earned').eq('user_id', user.id),
    supabase.from('skill_progress').select('xp_earned').eq('user_id', user.id),
  ]);

  const questXp = (questXpData ?? []).reduce((acc, r) => acc + (r.xp_earned ?? 0), 0);
  const skillXp = (skillXpData ?? []).reduce((acc, r) => acc + (r.xp_earned ?? 0), 0);
  const newTotalXp = questXp + skillXp;
  const newLevel = Math.floor(newTotalXp / 500) + 1;

  await supabase
    .from('users')
    .update({ total_xp: newTotalXp, level: newLevel })
    .eq('id', user.id);

  Promise.all([updateStreak(), checkAndAwardBadges()]).catch(() => {});

  return { ok: true, newTotalXp, newLevel };
}
