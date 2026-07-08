'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// これらのルートでは非表示（LP・認証・オンボーディング）
const HIDDEN_ON = ['/', '/login', '/signup', '/start', '/onboarding', '/playground', '/upgrade'];

const ITEMS = [
  { href: '/dashboard',    icon: '🏠', label: 'ホーム' },
  { href: '/skills',       icon: '📚', label: 'スキル' },
  { href: '/leaderboard',  icon: '🏆', label: 'ランキング' },
  { href: '/shop',         icon: '🛒', label: 'ショップ' },
  { href: '/profile',      icon: '👤', label: 'マイページ' },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  if (HIDDEN_ON.includes(pathname)) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[1000] lg:hidden"
      style={{
        background: 'rgba(9,14,26,0.97)',
        borderTop: '1px solid rgba(51,65,85,0.6)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-stretch">
        {ITEMS.map(({ href, icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-all active:scale-95"
              style={{ minHeight: 56 }}
            >
              <span
                className="text-[22px] leading-none"
                style={{ filter: isActive ? 'none' : 'grayscale(0.3) opacity(0.55)' }}
              >
                {icon}
              </span>
              <span
                className="text-[10px] font-bold leading-none"
                style={{ color: isActive ? '#06B6D4' : '#475569' }}
              >
                {label}
              </span>
              {isActive && (
                <span
                  className="absolute top-0 w-8 h-0.5 rounded-full"
                  style={{ background: '#06B6D4' }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
