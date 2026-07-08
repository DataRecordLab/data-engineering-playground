'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function DuoNavItem({
  href,
  icon,
  label,
  badge,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: { text: string; color: string };
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-[11px] mx-2 my-[2px] rounded-xl font-bold text-[15px] transition-all ${
        isActive
          ? 'bg-slate-700/70 text-white'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
      }`}
    >
      <span className="text-[22px] w-8 h-8 flex items-center justify-center flex-shrink-0 leading-none">
        {icon}
      </span>
      <span className="flex-1 leading-none">{label}</span>
      {badge && (
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full font-black flex-shrink-0"
          style={{ background: `${badge.color}25`, color: badge.color }}
        >
          {badge.text}
        </span>
      )}
    </Link>
  );
}
