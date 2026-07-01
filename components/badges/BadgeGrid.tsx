import { BADGE_DEFS, RARITY_STYLES, getBadgeDef } from '@/lib/badges';

interface Props {
  earnedIds: string[];
  showAll?: boolean;
}

export function BadgeGrid({ earnedIds, showAll = true }: Props) {
  const badges = showAll ? BADGE_DEFS : BADGE_DEFS.filter(b => earnedIds.includes(b.id));

  if (badges.length === 0) {
    return (
      <p className="text-slate-600 text-xs text-center py-4">
        まだバッジがありません。クエストやスキルパスを進めよう！
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {badges.map(badge => {
        const earned = earnedIds.includes(badge.id);
        const styles = RARITY_STYLES[badge.rarity];

        return (
          <div
            key={badge.id}
            className={`relative rounded-xl border p-3 flex flex-col items-center gap-1.5 transition-all ${
              earned
                ? `${styles.border} ${styles.bg}`
                : 'border-slate-800/40 bg-slate-900/20 opacity-40 grayscale'
            }`}
            title={badge.desc}
          >
            <span className="text-2xl leading-none">{badge.icon}</span>
            <p className={`text-[10px] font-bold text-center leading-tight ${
              earned ? styles.text : 'text-slate-600'
            }`}>
              {badge.label}
            </p>
            {earned && (
              <div
                className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                  badge.rarity === 'epic' ? 'bg-purple-400' :
                  badge.rarity === 'rare' ? 'bg-blue-400' : 'bg-slate-500'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// コンパクト版（プロフィールカード用）
export function BadgeRow({ earnedIds }: { earnedIds: string[] }) {
  const earned = BADGE_DEFS.filter(b => earnedIds.includes(b.id));
  if (earned.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {earned.map(badge => {
        const styles = RARITY_STYLES[badge.rarity];
        return (
          <div
            key={badge.id}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${styles.border} ${styles.bg} ${styles.text}`}
            title={badge.desc}
          >
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </div>
        );
      })}
    </div>
  );
}
