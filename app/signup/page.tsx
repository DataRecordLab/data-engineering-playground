'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamOrgId = searchParams.get('team'); // 招待リンク経由の場合
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('パスワードが一致しません');
      return;
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上にしてください');
      return;
    }
    setLoading(true);

    if (!isSupabaseConfigured()) {
      router.push('/onboarding');
      return;
    }

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/onboarding`,
        // 招待リンク経由の場合、org_idをメタデータに含める
        data: teamOrgId ? { invited_org_id: teamOrgId } : undefined,
      },
    });
    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }
    router.push('/onboarding');
  }

  return (
    <div className="min-h-screen bg-[#050914] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-blue-400 text-2xl font-bold">◈</span>
            <span className="text-white font-bold text-xl tracking-tight">Modelion</span>
          </Link>
          <p className="text-slate-500 text-sm mt-3">Modelion Agencyに入社する</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8">
          <h1 className="text-white font-semibold text-lg mb-1">新規登録</h1>
          <p className="text-slate-500 text-xs mb-6">無料で始められます。クレジットカード不要。</p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-slate-400 text-xs mb-1.5">メールアドレス</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5">パスワード（8文字以上）</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-xs mb-1.5">パスワード（確認）</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
            >
              {loading ? '登録中...' : '入社する →'}
            </button>
          </form>

            {/* 招待経由バナー or 通常バナー */}
          {teamOrgId ? (
            <div className="mt-5 px-4 py-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
              <p className="text-indigo-400 text-xs font-bold mb-1">🔗 チーム研修に招待されています</p>
              <p className="text-slate-400 text-xs">登録完了後、チームのorganizationに自動で参加されます。</p>
            </div>
          ) : (
            <div className="mt-5 px-4 py-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
              <p className="text-blue-400 text-xs font-medium mb-1">Freeプランで開始</p>
              <p className="text-slate-500 text-xs">Quest 1を無料体験。Proプラン（¥980/月）で全クエスト＋キャラクター全カスタマイズ解放。</p>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-slate-800 text-center">
            <p className="text-slate-500 text-xs">
              すでにアカウントをお持ちの方は{' '}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
                ログイン
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
