'use client';

import { RadarChart } from './RadarChart';
import { Sprite } from '@/components/characters/Sprite';
import { buildPlayerSprite } from '@/components/characters/sprites/playerCustom';
import { DEFAULT_CHARACTER_CONFIG } from '@/types';
import type { SkillDimension } from '@/lib/skills/scoring';
import type { CharacterConfig } from '@/types';

interface Props {
  displayName: string;
  level: number;
  totalXp: number;
  questsCompleted: number;
  lessonsCompleted: number;
  skillDimensions: SkillDimension[];
  characterConfig?: CharacterConfig | null;
  jobTitle?: string;
}

export function ShareCard({
  displayName,
  level,
  totalXp,
  questsCompleted,
  lessonsCompleted,
  skillDimensions,
  characterConfig,
  jobTitle,
}: Props) {
  const config = characterConfig ?? DEFAULT_CHARACTER_CONFIG;
  const grid = buildPlayerSprite(config);
  const xpInLevel = totalXp % 500;
  const xpPercent = (xpInLevel / 500) * 100;

  const topSkill = [...skillDimensions].sort((a, b) => b.score - a.score)[0];

  return (
    <div
      id="share-card"
      className="relative rounded-2xl overflow-hidden select-none"
      style={{
        width: 360,
        background: 'linear-gradient(145deg, #0a0a1f 0%, #060914 60%, #0c0820 100%)',
        border: '1px solid rgba(99,102,241,0.25)',
        boxShadow: '0 0 60px rgba(99,102,241,0.12), 0 0 120px rgba(99,102,241,0.05)',
      }}
    >
      {/* 背景の星 */}
      {[
        [8,8],[25,14],[42,6],[65,11],[80,5],[92,15],[12,35],[88,40],
        [5,60],[20,72],[38,80],[55,68],[75,78],[90,65],[30,90],[72,92],
      ].map(([x, y], i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${x}%`, top: `${y}%`, width: 1, height: 1, opacity: 0.08 + (i % 4) * 0.06 }}
        />
      ))}

      {/* ヘッダー */}
      <div className="relative px-5 pt-5 pb-4 flex items-center gap-4 border-b border-indigo-900/30">
        {/* キャラクター */}
        <div className="flex-shrink-0">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <Sprite grid={grid} scale={3} />
          </div>
        </div>

        {/* ユーザー情報 */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-base leading-tight truncate">
            {displayName || 'Modelion Engineer'}
          </p>
          <p className="text-indigo-400 text-[10px] font-medium mt-0.5">
            {jobTitle || config.jobTitle}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <div
              className="flex items-center justify-center w-6 h-6 rounded-lg text-xs font-black text-white"
              style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.4)' }}
            >
              {level}
            </div>
            <div className="flex-1 h-1 rounded-full bg-slate-800/80 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="text-slate-500 text-[9px] font-mono">{totalXp} XP</span>
          </div>
        </div>
      </div>

      {/* レーダーチャート */}
      <div className="flex justify-center py-3">
        <RadarChart dimensions={skillDimensions} size={210} />
      </div>

      {/* スタッツ行 */}
      <div className="flex border-t border-indigo-900/20 divide-x divide-indigo-900/20">
        {[
          { value: questsCompleted, label: 'クエスト', icon: '⚔️' },
          { value: lessonsCompleted, label: 'レッスン', icon: '📚' },
          { value: topSkill ? `${topSkill.score}%` : '—', label: topSkill?.label ?? '—', icon: '⭐' },
        ].map((stat, i) => (
          <div key={i} className="flex-1 py-3 text-center">
            <div className="text-base leading-none mb-1">{stat.icon}</div>
            <p className="text-white font-black text-sm leading-none">{stat.value}</p>
            <p className="text-slate-600 text-[9px] mt-1 leading-tight truncate px-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* フッター */}
      <div
        className="flex items-center justify-between px-5 py-2.5 border-t border-indigo-900/20"
        style={{ background: 'rgba(6,9,24,0.6)' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-indigo-400 text-xs font-black">◈</span>
          <span className="text-slate-500 text-[10px] font-medium">Modelion Agency</span>
        </div>
        <span className="text-slate-700 text-[9px] font-mono">datacraft.app</span>
      </div>
    </div>
  );
}
