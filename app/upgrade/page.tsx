'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PRO_FEATURES = [
  { icon: '🗺️', text: '全クエスト解放（EC / SaaS / 医療 / 金融）' },
  { icon: '🤖', text: 'AIレビュー無制限（Freeは1日3回）' },
  { icon: '🎨', text: 'キャラクター全スタイル・全カラー解放' },
  { icon: '🏅', text: '限定バッジ・称号' },
  { icon: '⚡', text: '優先サポート' },
];

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleUpgrade() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (data.error) {
        if (data.error === 'Already Pro') {
          router.push('/dashboard');
          return;
        }
        setError(data.error);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('エラーが発生しました。しばらくしてからお試しください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050914] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-blue-400 text-xl font-bold">◈</span>
          <span className="font-bold tracking-tight">Modelion</span>
        </Link>
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← ダッシュボードへ戻る
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {/* Badge */}
          <div className="flex justify-center mb-6">
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium">
              ✦ Modelion Pro
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-center text-3xl font-bold mb-2">
            すべての機能を解放する
          </h1>
          <p className="text-center text-slate-400 text-sm mb-10">
            データエンジニアリングを、本気で学ぶ。
          </p>

          {/* Card */}
          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-8">
            {/* Price */}
            <div className="text-center mb-8">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-slate-400 text-sm">¥</span>
                <span className="text-5xl font-bold text-white">980</span>
                <span className="text-slate-400 text-sm">/月</span>
              </div>
              <p className="text-slate-500 text-xs mt-1">いつでもキャンセル可能</p>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-8">
              {PRO_FEATURES.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-slate-300">{f.text}</span>
                </li>
              ))}
            </ul>

            {/* Error */}
            {error && (
              <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
            >
              {loading ? '処理中...' : 'Proプランを始める →'}
            </button>

            <p className="text-center text-slate-600 text-xs mt-4">
              Stripe の安全な決済ページへ移動します
            </p>
          </div>

          {/* Free plan note */}
          <div className="mt-6 text-center">
            <p className="text-slate-600 text-xs">
              Freeプランでも Quest 1 は無料で体験できます。
              <Link href="/dashboard" className="text-slate-500 hover:text-slate-400 ml-1 transition-colors">
                Freeで続ける →
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
