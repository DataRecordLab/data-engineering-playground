import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { calculateSkillScores } from '@/lib/skills/scoring';
import { ShareCard } from '@/components/profile/ShareCard';
import type { CharacterConfig } from '@/types';

interface Props {
  params: { userId: string };
}

export default async function PublicProfilePage({ params }: Props) {
  const supabase = await createClient();
  const { userId } = params;

  // 公開プロフィール取得（RLSで全ユーザー参照可）
  const [
    { data: profile },
    { data: skillRows },
    { data: questRows },
  ] = await Promise.all([
    supabase
      .from('users')
      .select('display_name, level, total_xp, character_config')
      .eq('id', userId)
      .single(),
    supabase
      .from('skill_progress')
      .select('section_id, lesson_id, xp_earned, stars, completed_at')
      .eq('user_id', userId),
    supabase
      .from('user_progress')
      .select('quest_id, stage, status, stars, xp_earned')
      .eq('user_id', userId),
  ]);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#060918] flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <p className="text-4xl">👤</p>
          <p className="text-slate-400">プロフィールが見つかりません</p>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm">
            DataCraft トップへ →
          </Link>
        </div>
      </div>
    );
  }

  const skillProgress = skillRows ?? [];
  const questProgress = questRows ?? [];

  const questsCompleted = new Set(
    questProgress.filter(p => p.status === 'completed').map(p => `${p.quest_id}/${p.stage}`)
  ).size;
  const lessonsCompleted = skillProgress.length;
  const skillDimensions = calculateSkillScores(skillProgress, questProgress);

  const displayName = profile.display_name ?? 'DataCraft Engineer';
  const characterConfig = profile.character_config as CharacterConfig | null;

  return (
    <div className="min-h-screen bg-[#060918] text-white">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 font-black text-lg">◈</span>
          <span className="font-black">DataCraft</span>
          <span className="text-slate-600 text-sm">Agency</span>
        </div>
        <Link
          href="/signup"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
        >
          無料で始める →
        </Link>
      </header>

      <div className="max-w-lg mx-auto px-5 py-10 space-y-8">

        {/* タイトル */}
        <div className="text-center space-y-2">
          <p className="text-slate-500 text-sm">DataCraft Agency のスキルカード</p>
          <h1 className="text-2xl font-black">{displayName} さんのプロフィール</h1>
        </div>

        {/* カード */}
        <div className="flex justify-center">
          <ShareCard
            displayName={displayName}
            level={profile.level ?? 1}
            totalXp={profile.total_xp ?? 0}
            questsCompleted={questsCompleted}
            lessonsCompleted={lessonsCompleted}
            skillDimensions={skillDimensions}
            characterConfig={characterConfig}
          />
        </div>

        {/* スキル内訳 */}
        <div className="space-y-3">
          <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">スキル内訳</p>
          {skillDimensions.map(dim => (
            <div key={dim.key} className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-28 flex-shrink-0">{dim.label}</span>
              <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${dim.score}%`, background: dim.color }}
                />
              </div>
              <span className="text-xs font-mono w-8 text-right" style={{ color: dim.color }}>
                {dim.score}%
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className="rounded-2xl border border-indigo-500/20 p-6 text-center space-y-4"
          style={{ background: 'linear-gradient(135deg, #0c0c2a 0%, #0a0618 100%)' }}
        >
          <p className="text-white font-black text-base">
            あなたもデータエンジニアリングを学ぼう
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            ゲームしながら、本物のデータエンジニアリングスキルが身につく。
            無料で始めて、自分のスキルカードを作ろう。
          </p>
          <Link
            href="/signup"
            className="block w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/25"
          >
            ▶ 無料で DataCraft を始める
          </Link>
        </div>
      </div>
    </div>
  );
}
