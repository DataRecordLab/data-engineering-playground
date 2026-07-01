interface Props {
  count: number;
  size?: 'sm' | 'md' | 'lg';
}

export function StreakBadge({ count, size = 'md' }: Props) {
  if (count === 0) return null;

  const styles = {
    sm: { wrap: 'gap-0.5 px-1.5 py-0.5 rounded-lg text-[10px]', icon: 'text-xs' },
    md: { wrap: 'gap-1 px-2 py-1 rounded-xl text-xs',           icon: 'text-sm'  },
    lg: { wrap: 'gap-1.5 px-3 py-1.5 rounded-xl text-sm',       icon: 'text-lg'  },
  }[size];

  const isHot  = count >= 7;
  const isWarm = count >= 3;

  return (
    <div
      className={`inline-flex items-center font-bold border ${styles.wrap} ${
        isHot
          ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
          : isWarm
          ? 'border-amber-500/40 bg-amber-500/8 text-amber-400'
          : 'border-slate-600/40 bg-slate-800/40 text-slate-400'
      }`}
    >
      <span className={styles.icon}>🔥</span>
      <span>{count}日連続</span>
    </div>
  );
}
