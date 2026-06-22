'use client';

import { useEffect, useState } from 'react';

const BADGE_LABELS: Record<string, string> = {
  source_guardian: 'Source Guardian',
  data_cleaner: 'Data Cleaner',
  modeler: 'Star Schema Modeler',
  kpi_builder: 'KPI Builder',
};

interface StageCompleteOverlayProps {
  stars: number;
  xpEarned: number;
  badgeId?: string;
  nextLabel: string;
  onNext: () => void;
}

export function StageCompleteOverlay({
  stars,
  xpEarned,
  badgeId,
  nextLabel,
  onNext,
}: StageCompleteOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [starsShown, setStarsShown] = useState(0);
  const [xpShown, setXpShown] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), 50);
    const t2 = setTimeout(() => setStarsShown(1), 500);
    const t3 = setTimeout(() => setStarsShown(2), 700);
    const t4 = setTimeout(() => setStarsShown(stars >= 3 ? 3 : starsShown), 900);
    const t5 = setTimeout(() => setXpShown(true), 1100);
    return () => [t1, t2, t3, t4, t5].forEach(clearTimeout);
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
          className={`px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center transition-all duration-500 ${
            xpShown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <p className="text-blue-400 font-bold text-2xl">+{xpEarned} XP</p>
        </div>

        {/* Badge */}
        {badgeId && xpShown && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <span className="text-amber-400 text-lg">🏅</span>
            <div>
              <p className="text-amber-400 text-xs font-medium">バッジ取得！</p>
              <p className="text-amber-300/70 text-xs">{BADGE_LABELS[badgeId] ?? badgeId}</p>
            </div>
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
