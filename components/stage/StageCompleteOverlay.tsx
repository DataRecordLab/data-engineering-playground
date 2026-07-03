'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const XP_PER_LEVEL = 500;

const BADGE_LABELS: Record<string, string> = {
  source_guardian: 'Source Guardian',
  data_cleaner: 'Data Cleaner',
  modeler: 'Star Schema Modeler',
  kpi_builder: 'KPI Builder',
};

export interface LabHint {
  label: string;
  emoji: string;
  href: string;
  description: string;
}

interface StageCompleteOverlayProps {
  stars: number;
  xpEarned: number;
  newTotalXp?: number;
  badgeId?: string;
  nextLabel: string;
  onNext: () => void;
  labHints?: LabHint[];
}

export function StageCompleteOverlay({
  stars,
  xpEarned,
  newTotalXp,
  badgeId,
  nextLabel,
  onNext,
  labHints,
}: StageCompleteOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [starsShown, setStarsShown] = useState(0);
  const [xpShown, setXpShown] = useState(false);
  const [barWidth, setBarWidth] = useState(0);
  const [levelUp, setLevelUp] = useState(false);

  const prevXp = newTotalXp != null ? newTotalXp - xpEarned : 0;
  const prevLevel = Math.floor(prevXp / XP_PER_LEVEL) + 1;
  const newLevel = newTotalXp != null ? Math.floor(newTotalXp / XP_PER_LEVEL) + 1 : prevLevel;
  const didLevelUp = newLevel > prevLevel;

  const prevInLevel = prevXp % XP_PER_LEVEL;
  const newInLevel = newTotalXp != null ? newTotalXp % XP_PER_LEVEL : prevInLevel;
  const targetPercent = Math.min(100, Math.round((newInLevel / XP_PER_LEVEL) * 100));
  const startPercent = Math.min(100, Math.round((prevInLevel / XP_PER_LEVEL) * 100));

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => setStarsShown(1), 500);
    const t3 = setTimeout(() => setStarsShown(2), 700);
    const t4 = setTimeout(() => setStarsShown(stars >= 3 ? 3 : 2), 900);
    const t5 = setTimeout(() => setXpShown(true), 1100);
    const t6 = setTimeout(() => setBarWidth(startPercent), 1200);
    const t7 = setTimeout(() => setBarWidth(didLevelUp ? 100 : targetPercent), 1400);
    const t8 = didLevelUp ? setTimeout(() => { setLevelUp(true); setBarWidth(targetPercent); }, 2000) : null;
    return () => [t1, t2, t3, t4, t5, t6, t7, t8].forEach(t => t && clearTimeout(t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stars]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col items-center gap-5 px-10 py-8 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl w-full max-w-sm mx-4">
        {/* Level up flash */}
        {levelUp && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce">
            <div className="px-3 py-1 rounded-full bg-yellow-400 text-slate-950 font-bold text-sm whitespace-nowrap shadow-lg">
              ⬆ LEVEL UP! → Lv.{newLevel}
            </div>
          </div>
        )}

        {/* Title */}
        <div className="text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-1 font-medium">Stage Clear</p>
          <p className="text-2xl font-bold text-white">クリア！</p>
        </div>

        {/* Stars */}
        <div className="flex gap-3">
          {[1, 2, 3].map(n => (
            <span
              key={n}
              className={`text-4xl transition-all duration-300 ${
                n <= starsShown
                  ? 'text-yellow-400 scale-110 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]'
                  : 'text-slate-700 scale-90'
              }`}
            >
              ★
            </span>
          ))}
        </div>

        {/* XP */}
        <div
          className={`w-full transition-all duration-500 ${
            xpShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <div className="px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center mb-3">
            <p className="text-blue-400 font-bold text-2xl">+{xpEarned} XP</p>
          </div>

          {/* XP progress bar */}
          {newTotalXp != null && (
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Lv.{didLevelUp ? newLevel : prevLevel}</span>
                <span>{newInLevel} / {XP_PER_LEVEL} XP</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Badge */}
        {badgeId && xpShown && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 w-full">
            <span className="text-amber-400 text-lg">🏅</span>
            <div>
              <p className="text-amber-400 text-xs font-medium">バッジ取得！</p>
              <p className="text-amber-300/70 text-xs">{BADGE_LABELS[badgeId] ?? badgeId}</p>
            </div>
          </div>
        )}

        {/* Lab hints */}
        {labHints && labHints.length > 0 && xpShown && (
          <div className="w-full space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider text-center font-mono">
              ⚗️ Labで深く体験する
            </p>
            {labHints.map(hint => (
              <Link
                key={hint.href}
                href={hint.href}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 hover:border-indigo-500/40 transition-all"
              >
                <span className="text-xl flex-shrink-0">{hint.emoji}</span>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-xs font-bold text-indigo-300">{hint.label}</p>
                  <p className="text-[10px] text-slate-500 truncate">{hint.description}</p>
                </div>
                <span className="text-slate-600 text-xs flex-shrink-0">→</span>
              </Link>
            ))}
          </div>
        )}

        {/* Next button */}
        <button
          onClick={onNext}
          className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
