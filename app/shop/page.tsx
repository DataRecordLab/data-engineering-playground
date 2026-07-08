'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { MioIllustration } from '@/components/characters/MioIllustration';
import { SHOP_ITEMS, SHOP_CATEGORIES, type ShopCategory } from '@/lib/shop/items';

// ── Types ─────────────────────────────────────────────────────────────

interface UserState {
  xp:         number;
  ownedItems: string[];
  isLoggedIn: boolean;
}

// ── XP Display ───────────────────────────────────────────────────────

function XpCounter({ xp }: { xp: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#272b42] bg-[#1a1d2e]">
      <span className="text-lg">⚡</span>
      <div>
        <p className="text-[10px] text-[#555b7a] font-mono">所持 XP</p>
        <p className="text-base font-black" style={{ color: '#FFC800' }}>{xp.toLocaleString()}</p>
      </div>
    </div>
  );
}

// ── Shop Item Card ────────────────────────────────────────────────────

function ItemCard({
  item,
  owned,
  canAfford,
  isLoggedIn,
  onPurchase,
  purchasing,
}: {
  item: (typeof SHOP_ITEMS)[number];
  owned: boolean;
  canAfford: boolean;
  isLoggedIn: boolean;
  onPurchase: (id: string) => void;
  purchasing: string | null;
}) {
  const isLoading = purchasing === item.id;

  return (
    <div
      className={`
        relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all duration-200
        ${owned
          ? 'border-[#272b42] bg-[#1a1d2e]/60 opacity-70'
          : canAfford
          ? 'border-[#272b42] bg-[#1a1d2e] hover:border-[#343856] hover:-translate-y-0.5 cursor-pointer'
          : 'border-[#1e2130] bg-[#141625]/70 opacity-60'
        }
      `}
    >
      {/* Price tag */}
      {!owned && (
        <div
          className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black"
          style={{
            background: `${item.color}18`,
            border: `1px solid ${item.color}40`,
            color: item.color,
          }}
        >
          ⚡ {item.price.toLocaleString()}
        </div>
      )}

      {/* Icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
        style={{ background: `${item.color}18` }}
      >
        {item.icon}
      </div>

      {/* Info */}
      <div className="flex-1">
        <p className="font-black text-sm text-white leading-snug mb-1">{item.name}</p>
        <p className="text-xs text-[#8890b0] leading-relaxed">{item.desc}</p>
      </div>

      {/* Action */}
      {owned ? (
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#555b7a]">
          <span>✓</span>
          <span>所持済み</span>
        </div>
      ) : !isLoggedIn ? (
        <Link
          href="/signup"
          className="w-full py-2.5 rounded-xl text-center text-xs font-black text-white transition-all"
          style={{ background: item.color, opacity: 0.9 }}
        >
          ログインして購入
        </Link>
      ) : (
        <button
          onClick={() => onPurchase(item.id)}
          disabled={!canAfford || isLoading}
          className={`
            w-full py-2.5 rounded-xl text-xs font-black transition-all duration-150
            ${canAfford
              ? 'text-white hover:scale-[1.02] active:scale-[0.98]'
              : 'text-[#555b7a] cursor-not-allowed'
            }
          `}
          style={canAfford
            ? { background: item.color, boxShadow: `0 4px 0 ${item.color}80` }
            : { background: '#1e2130', boxShadow: '0 4px 0 #0f1220' }
          }
        >
          {isLoading ? '購入中...' : canAfford ? '購入する' : 'XPが足りない'}
        </button>
      )}
    </div>
  );
}

// ── Purchase Confirm Modal ────────────────────────────────────────────

function PurchaseModal({
  item,
  onConfirm,
  onCancel,
  loading,
}: {
  item: (typeof SHOP_ITEMS)[number];
  onConfirm: () => void;
  onCancel:  () => void;
  loading:   boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-xs rounded-3xl border border-[#343856] bg-[#1a1d2e] p-6 flex flex-col items-center gap-5">
        <div className="text-5xl">{item.icon}</div>
        <div className="text-center">
          <p className="font-black text-lg text-white mb-1">{item.name}</p>
          <p className="text-xs text-[#8890b0] leading-relaxed">{item.desc}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111627] border border-[#272b42]">
          <span className="text-sm">⚡</span>
          <span className="font-black text-base" style={{ color: '#FFC800' }}>
            {item.price.toLocaleString()} XP
          </span>
          <span className="text-xs text-[#555b7a]">を消費</span>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl border border-[#343856] text-sm font-bold text-[#8890b0] hover:text-white transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: item.color, boxShadow: `0 4px 0 ${item.color}70` }}
          >
            {loading ? '処理中...' : '購入確定'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────

export default function ShopPage() {
  const [category, setCategory]   = useState<ShopCategory>('powerup');
  const [userState, setUserState] = useState<UserState>({ xp: 0, ownedItems: [], isLoggedIn: false });
  const [confirmItem, setConfirmItem] = useState<string | null>(null);
  const [purchasing, setPurchasing]   = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [mioMsg, setMioMsg] = useState('XPを使って\nパワーアップしよう！');

  // Load user XP from API
  useEffect(() => {
    fetch('/api/user/me')
      .then(r => r.json())
      .then((d: { xp?: number; purchasedItems?: string[] }) => {
        if (typeof d.xp === 'number') {
          setUserState({
            xp: d.xp,
            ownedItems: d.purchasedItems ?? [],
            isLoggedIn: true,
          });
        }
      })
      .catch(() => {/* guest */});
  }, []);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  async function handlePurchase(itemId: string) {
    if (!userState.isLoggedIn) { setConfirmItem(null); return; }
    setPurchasing(itemId);
    try {
      const res = await fetch('/api/shop/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = (await res.json()) as { success?: boolean; newXp?: number; error?: string };
      if (data.success) {
        setUserState(prev => ({
          ...prev,
          xp: data.newXp ?? prev.xp,
          ownedItems: [...prev.ownedItems, itemId],
        }));
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        showToast(`${item?.icon ?? ''} ${item?.name ?? ''} を購入しました！`, true);
        setMioMsg('購入完了！\n楽しんでね！');
        setTimeout(() => setMioMsg('XPを使って\nパワーアップしよう！'), 4000);
      } else {
        showToast(data.error ?? '購入に失敗しました', false);
      }
    } catch {
      showToast('通信エラーが発生しました', false);
    } finally {
      setPurchasing(null);
      setConfirmItem(null);
    }
  }

  const filteredItems = SHOP_ITEMS.filter(i => i.category === category);
  const confirmItemObj = SHOP_ITEMS.find(i => i.id === confirmItem) ?? null;

  return (
    <div className="min-h-screen bg-[#131525] text-white">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#272b42] bg-[#0f1220]/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-[#555b7a] hover:text-white transition-colors p-1">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4l-5 5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">🛒</span>
            <span className="font-black text-base">XP ショップ</span>
          </div>
        </div>
        <XpCounter xp={userState.xp} />
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8">

        {/* ── Mio banner ── */}
        <div className="flex items-center gap-5 mb-8 p-5 rounded-2xl border border-[#272b42] bg-[#1a1d2e]">
          <div className="flex-shrink-0 animate-idle-bob">
            <MioIllustration
              expression={purchasing ? 'thinking' : userState.ownedItems.length > 0 ? 'excited' : 'happy'}
              size={80}
            />
          </div>
          <div>
            <p className="font-black text-white text-sm leading-relaxed whitespace-pre-line">{mioMsg}</p>
            {!userState.isLoggedIn && (
              <Link href="/signup"
                className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-[#1CB0F6] hover:text-[#60CDFA] transition-colors">
                ログインしてXPを貯めよう →
              </Link>
            )}
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div className="flex gap-2 mb-6">
          {SHOP_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-150
                ${category === cat.id
                  ? 'text-white border-2 border-[#1CB0F6] bg-[#1CB0F6]/10'
                  : 'text-[#8890b0] border-2 border-[#272b42] hover:border-[#343856] hover:text-white'
                }
              `}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* ── Items grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredItems.map(item => (
            <ItemCard
              key={item.id}
              item={item}
              owned={userState.ownedItems.includes(item.id)}
              canAfford={userState.xp >= item.price}
              isLoggedIn={userState.isLoggedIn}
              purchasing={purchasing}
              onPurchase={id => setConfirmItem(id)}
            />
          ))}
        </div>

        {/* ── XP earn tips ── */}
        <div className="mt-10 p-5 rounded-2xl border border-[#272b42] bg-[#1a1d2e]/60">
          <p className="text-xs font-black text-[#8890b0] uppercase tracking-widest mb-3">XPの稼ぎ方</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { icon: '⚔️', label: 'ステージクリア',    xp: '+100 XP' },
              { icon: '⭐', label: '★3クリア達成',       xp: '+150 XP' },
              { icon: '📚', label: 'スキルレッスン完了', xp: '+50 XP'  },
              { icon: '🔥', label: 'ストリーク継続',      xp: '+20 XP/日' },
            ].map(tip => (
              <div key={tip.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#111627] border border-[#1e2130]">
                <span className="text-base">{tip.icon}</span>
                <div>
                  <p className="text-[#e8eaf6] font-semibold">{tip.label}</p>
                  <p className="font-black" style={{ color: '#FFC800' }}>{tip.xp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Purchase modal ── */}
      {confirmItemObj && (
        <PurchaseModal
          item={confirmItemObj}
          onConfirm={() => handlePurchase(confirmItemObj.id)}
          onCancel={() => setConfirmItem(null)}
          loading={purchasing === confirmItemObj.id}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          className={`
            fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-bold
            shadow-xl animate-slide-up border
            ${toast.ok
              ? 'border-[#58CC02]/40 bg-[#58CC02]/15 text-[#58CC02]'
              : 'border-red-500/40 bg-red-500/15 text-red-400'
            }
          `}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
