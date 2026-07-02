'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '¥0',
    unit: '',
    desc: 'まず試してみる',
    badge: null,
    accent: '#475569',
    features: [
      { icon: '🗺️', text: 'Quest 1（ECサイト）初級を体験' },
      { icon: '🔬', text: 'Incremental / Lineage / DAG Lab（一部）' },
      { icon: '🎮', text: 'Playgroundモード' },
    ],
    cta: 'Freeで始める',
    href: '/signup',
    outline: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '¥980',
    unit: '/月',
    desc: '本気で学ぶ個人向け',
    badge: '人気',
    accent: '#818CF8',
    features: [
      { icon: '🗺️', text: '全クエスト解放（EC / SaaS / 医療 / 金融）' },
      { icon: '🔬', text: 'Lab クエストモード全開放（9本）' },
      { icon: '🚨', text: 'Debug Lab 全シナリオ（中級・上級）' },
      { icon: '📚', text: 'スキルパス 全セクション解放' },
      { icon: '🎨', text: 'キャラクター全スタイル・カラー' },
      { icon: '🏅', text: '限定バッジ・称号' },
    ],
    cta: 'Proプランを始める',
    onClick: true,
    outline: false,
  },
  {
    id: 'team',
    name: 'Team',
    price: '¥4,800',
    unit: '/月〜',
    desc: '企業研修・新卒研修向け',
    badge: '法人',
    accent: '#34D399',
    features: [
      { icon: '✅', text: 'Proプランの全機能（受講者全員）' },
      { icon: '👥', text: '管理者ダッシュボード（進捗一覧）' },
      { icon: '📊', text: 'クエスト別完了率・活動ログ' },
      { icon: '↓', text: 'CSV出力（HR報告・修了証に対応）' },
      { icon: '🔗', text: '招待リンクでメンバー一括追加' },
      { icon: '💬', text: '専任サポート（Slack/メール）' },
    ],
    cta: 'Teamプランを問い合わせる',
    href: 'mailto:team@modelion.app?subject=Teamプランについて',
    outline: false,
    isTeam: true,
  },
] as const;

export default function UpgradePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleProUpgrade() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json() as { url?: string; error?: string };
      if (data.error) {
        if (data.error === 'Already Pro') { router.push('/dashboard'); return; }
        setError(data.error);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError('エラーが発生しました。しばらくしてからお試しください。');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050914] text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-blue-400 text-xl font-bold">◈</span>
          <span className="font-bold tracking-tight">Modelion</span>
        </Link>
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
          ← ダッシュボードへ戻る
        </Link>
      </header>

      <main className="flex-1 px-4 py-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-4">
            ✦ プランを選ぶ
          </div>
          <h1 className="text-4xl font-black mb-3">
            データエンジニアリングを、<br />
            <span style={{ color: '#818CF8' }}>本気で学ぶ。</span>
          </h1>
          <p className="text-slate-400 text-sm">個人の学習から、企業研修まで対応。</p>
        </div>

        {/* プランカード */}
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PLANS.map(plan => (
            <div
              key={plan.id}
              className="relative rounded-2xl border p-7 flex flex-col transition-all"
              style={{
                borderColor: plan.badge ? `${plan.accent}40` : '#1e293b',
                background: plan.badge ? `${plan.accent}08` : 'rgba(15,23,42,0.6)',
                boxShadow: plan.badge ? `0 0 40px ${plan.accent}15` : undefined,
              }}
            >
              {/* バッジ */}
              {plan.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-black"
                  style={{ background: plan.accent, color: '#fff' }}
                >
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <p className="text-[10px] font-mono font-bold mb-1" style={{ color: plan.accent }}>
                  {plan.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-400 text-sm">{plan.unit}</span>
                </div>
                <p className="text-slate-500 text-xs">{plan.desc}</p>
                {plan.id === 'team' && (
                  <p className="text-[10px] text-slate-600 mt-1">10名まで / 追加は¥480/名・月</p>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-7">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="flex-shrink-0 mt-0.5" style={{ color: plan.accent }}>{f.icon}</span>
                    <span className="text-slate-300 text-xs leading-relaxed">{f.text}</span>
                  </li>
                ))}
              </ul>

              {'onClick' in plan && plan.onClick ? (
                <>
                  {error && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleProUpgrade}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50"
                    style={{ background: `linear-gradient(135deg, #4f46e5 0%, #818cf8 100%)`, boxShadow: `0 0 20px ${plan.accent}30` }}
                  >
                    {loading ? '処理中...' : plan.cta}
                  </button>
                  <p className="text-center text-slate-600 text-[10px] mt-2">Stripeの安全な決済ページへ</p>
                </>
              ) : 'isTeam' in plan && plan.isTeam ? (
                <>
                  <a
                    href={plan.href as string}
                    className="block w-full py-3 rounded-xl font-black text-sm text-center text-white transition-all hover:scale-105 hover:shadow-xl"
                    style={{ background: `linear-gradient(135deg, #059669 0%, #34d399 100%)`, boxShadow: `0 0 20px ${plan.accent}30` }}
                  >
                    {plan.cta}
                  </a>
                  <p className="text-center text-slate-600 text-[10px] mt-2">
                    または <Link href="/admin" className="text-emerald-500 hover:text-emerald-400 transition-colors">管理画面を確認する</Link>
                  </p>
                </>
              ) : (
                <Link
                  href={'href' in plan ? (plan.href as string) : '/signup'}
                  className="block w-full py-3 rounded-xl font-black text-sm text-center transition-all"
                  style={{ border: `1px solid #334155`, color: '#94a3b8' }}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* 研修利用の訴求 */}
        <div className="max-w-2xl mx-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
          <p className="text-emerald-400 font-black text-lg mb-2">🏢 企業研修・新卒研修での利用</p>
          <p className="text-slate-400 text-sm leading-relaxed mb-4">
            Teamプランでは管理者ダッシュボードから全受講者の進捗をリアルタイムで追跡できます。
            CSVエクスポートでHR報告や修了証発行にも対応。
          </p>
          <div className="flex justify-center gap-6 text-xs text-slate-500">
            {['進捗の可視化', '招待リンクで簡単追加', 'CSV出力でHR連携', '専任サポート付き'].map(t => (
              <span key={t} className="flex items-center gap-1">
                <span className="text-emerald-500">✓</span> {t}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
