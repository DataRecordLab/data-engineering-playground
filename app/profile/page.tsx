'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getSkillProgress, getUserProgress, getUserProfile, getUserBadgeIds } from '@/lib/supabase/progress';
import { calculateSkillScores } from '@/lib/skills/scoring';
import { ShareCard } from '@/components/profile/ShareCard';
import { BadgeGrid } from '@/components/badges/BadgeGrid';
import { StreakBadge } from '@/components/streak/StreakBadge';
import type { CharacterConfig } from '@/types';

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [level, setLevel] = useState(1);
  const [totalXp, setTotalXp] = useState(0);
  const [questsCompleted, setQuestsCompleted] = useState(0);
  const [lessonsCompleted, setLessonsCompleted] = useState(0);
  const [characterConfig, setCharacterConfig] = useState<CharacterConfig | null>(null);
  const [skillDimensions, setSkillDimensions] = useState(
    calculateSkillScores([], [])
  );
  const [streakCount, setStreakCount] = useState(0);
  const [badgeIds, setBadgeIds] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [profile, skillProgress, questProgress, earnedBadgeIds] = await Promise.all([
        getUserProfile(),
        getSkillProgress(),
        getUserProgress(),
        getUserBadgeIds(),
      ]);

      if (profile) {
        setDisplayName(profile.display_name ?? '');
        setLevel(profile.level ?? 1);
        setTotalXp(profile.total_xp ?? 0);
        setStreakCount((profile.streak_count as number | null) ?? 0);
        if (profile.character_config) {
          setCharacterConfig(profile.character_config as CharacterConfig);
        }
      }
      setBadgeIds(earnedBadgeIds);

      const completedStages = new Set(
        questProgress.filter(p => p.status === 'completed').map(p => `${p.quest_id}/${p.stage}`)
      );
      setQuestsCompleted(completedStages.size);
      setLessonsCompleted(skillProgress.length);
      setSkillDimensions(calculateSkillScores(skillProgress, questProgress));
      setLoading(false);
    }
    load();
  }, []);

  async function copyProfileUrl() {
    if (!userId) return;
    const url = `${window.location.origin}/profile/${userId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#060918] text-white">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
            ← ダッシュボード
          </Link>
          <span className="text-slate-800">|</span>
          <span className="font-black text-sm">
            <span className="text-indigo-400">◈</span> スキルカード
          </span>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-10 space-y-8">

        {/* タイトル */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-black">あなたのスキルカード</h1>
          <p className="text-slate-500 text-sm">URLをシェアして、データエンジニアリングスキルを証明しよう</p>
        </div>

        {/* カード */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="text-slate-600 text-sm animate-pulse">読み込み中...</div>
          </div>
        ) : (
          <div className="flex justify-center">
            <ShareCard
              displayName={displayName}
              level={level}
              totalXp={totalXp}
              questsCompleted={questsCompleted}
              lessonsCompleted={lessonsCompleted}
              skillDimensions={skillDimensions}
              characterConfig={characterConfig}
            />
          </div>
        )}

        {/* シェアボタン群 */}
        {!loading && userId && (
          <div className="space-y-3">
            <button
              onClick={copyProfileUrl}
              className={`w-full py-3.5 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/25'
              }`}
            >
              {copied ? '✓ URLをコピーしました！' : '🔗 プロフィールURLをコピー'}
            </button>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`DataCraftでデータエンジニアリングを学んでいます！\n\n#DataCraft #データエンジニアリング\n${window.location.origin}/profile/${userId}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 rounded-xl border border-slate-700 hover:border-sky-500/50 text-slate-400 hover:text-sky-400 text-sm text-center font-bold transition-colors"
              >
                𝕏 でシェア
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/profile/${userId}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 rounded-xl border border-slate-700 hover:border-blue-500/50 text-slate-400 hover:text-blue-400 text-sm text-center font-bold transition-colors"
              >
                LinkedIn
              </a>
            </div>

            <p className="text-center text-slate-700 text-xs">
              URLを知っている人なら誰でも閲覧できます
            </p>
          </div>
        )}

        {/* ストリーク + バッジ */}
        {!loading && (
          <div className="space-y-6">
            {/* ストリーク */}
            {streakCount >= 1 && (
              <div className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 px-4 py-3">
                <div>
                  <p className="text-xs text-slate-400 font-medium">連続学習</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">継続はデータエンジニアの力</p>
                </div>
                <StreakBadge count={streakCount} size="lg" />
              </div>
            )}

            {/* バッジ */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">バッジ・実績</p>
                <p className="text-slate-600 text-[10px]">{badgeIds.length} / 12 獲得</p>
              </div>
              <BadgeGrid earnedIds={badgeIds} showAll={true} />
            </div>
          </div>
        )}

        {/* スキル詳細 */}
        {!loading && (
          <div className="space-y-3">
            <p className="text-slate-500 text-xs font-mono uppercase tracking-wider">スキル内訳</p>
            {skillDimensions.map(dim => (
              <div key={dim.key} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-28 flex-shrink-0">{dim.label}</span>
                <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${dim.score}%`, background: dim.color }}
                  />
                </div>
                <span className="text-xs font-mono w-8 text-right" style={{ color: dim.color }}>
                  {dim.score}%
                </span>
              </div>
            ))}
            <p className="text-slate-700 text-xs pt-1">
              スキルを上げるには → <Link href="/skills" className="text-indigo-500 hover:text-indigo-400">スキルパス</Link> や <Link href="/dashboard" className="text-indigo-500 hover:text-indigo-400">クエスト</Link> を進めよう
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
