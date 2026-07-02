'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-600 hover:text-slate-400 text-[10px] font-bold transition-colors"
    >
      ↩ ログアウト
    </button>
  );
}
