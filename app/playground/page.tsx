'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { registerCsvFile } from '@/lib/duckdb/engine';
import { EC_SITE_QUEST } from '@/lib/scenarios/ec-site';
import { SourceStage } from '@/components/stage/SourceStage';
import { GameOverOverlay } from '@/components/stage/GameOverOverlay';
import { useGameStore } from '@/lib/store/gameStore';
import { DEFAULT_CHARACTER_CONFIG } from '@/types';
import { buildPlayerSprite } from '@/components/characters/sprites/playerCustom';
import { Sprite } from '@/components/characters/Sprite';

// ── 型 ──────────────────────────────────────────────────────────────

type Phase = 'dialog' | 'source' | 'complete';

// ── ロックされた次のステージ一覧 ─────────────────────────────────────

const LOCKED_STAGES = [
  { label: 'WORLD 2', theme: '草原', layer: 'Staging Layer',   sky: '#040c1c', ground: '#145a14', accent: '#34D399', emoji: '🌿', desc: 'データの型変換・表記揺れを修正する' },
  { label: 'WORLD 3', theme: '火山', layer: 'Warehouse Layer', sky: '#140400', ground: '#5a1200', accent: '#F87171', emoji: '🌋', desc: 'スタースキーマでデータモデリング' },
  { label: 'WORLD 5', theme: '城',   layer: 'Mart Layer',      sky: '#080418', ground: '#404050', accent: '#FCD34D', emoji: '🏰', desc: 'KPIを設計してビジネス判断を下す' },
] as const;

// ── サブコンポーネント ────────────────────────────────────────────────

function HpHearts({ hp, maxHp }: { hp: number; maxHp: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxHp }).map((_, i) => (
        <span key={i} className={`text-sm leading-none ${i < hp ? 'text-red-500' : 'text-slate-700'}`}>
          {i < hp ? '❤' : '♡'}
        </span>
      ))}
    </div>
  );
}

function MiniWorldBar({ phase }: { phase: Phase }) {
  const zones = [
    { id: 'source', label: '洞窟', sky: '#060208', accent: '#A78BFA', current: phase === 'source' || phase === 'complete' },
    { id: 'staging', label: '草原', sky: '#040c1c', accent: '#34D399', locked: true },
    { id: 'warehouse', label: '火山', sky: '#140400', accent: '#F87171', locked: true },
    { id: 'mart', label: '城', sky: '#080418', accent: '#FCD34D', locked: true },
  ];
  const charGrid = buildPlayerSprite(DEFAULT_CHARACTER_CONFIG);
  return (
    <div className="flex border-b border-slate-900 relative" style={{ height: 64 }}>
      {zones.map((z, i) => (
        <div
          key={z.id}
          className="flex-1 flex flex-col items-center justify-end pb-1.5 relative"
          style={{
            background: z.sky,
            borderBottom: z.current ? `2px solid ${z.accent}` : '2px solid transparent',
            filter: z.locked ? 'brightness(0.35) saturate(0)' : undefined,
          }}
        >
          {z.current && !z.locked && (
            <div className="absolute bottom-5" style={{ transform: 'translateX(-50%)', left: '50%' }}>
              <Sprite grid={charGrid} scale={2} className="animate-[idle-bob_2s_ease-in-out_infinite]" />
            </div>
          )}
          <span className="text-[7px] font-mono font-bold relative z-10" style={{ color: z.current ? z.accent : '#1e3a5f' }}>
            {z.label}
          </span>
          {z.locked && <span className="text-[6px] text-slate-700">🔒</span>}
          {i > 0 && (
            <div className="absolute top-0 bottom-0 left-0 w-px" style={{ background: `${z.accent}20` }} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── クリア後画面 ──────────────────────────────────────────────────────

function TrialCompleteScreen() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-6 py-10 space-y-8">

        {/* 成功メッセージ */}
        <div className="text-center space-y-3">
          <div className="text-5xl">⭐</div>
          <h2 className="text-2xl font-black text-white">Source Layer クリア！</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            おめでとうございます！データエンジニアリングの第一歩、<br />
            <span className="text-indigo-300 font-semibold">Source Layer</span> を体験しました。
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-xs">
            +50 XP 獲得 ／ バッジ「Source Guardian」解放
          </div>
        </div>

        {/* 次のステージ（ロック） */}
        <div>
          <p className="text-slate-500 text-xs font-mono tracking-wider uppercase mb-3">次のステージ — サインアップで解放</p>
          <div className="space-y-2.5">
            {LOCKED_STAGES.map((s) => (
              <div
                key={s.label}
                className="relative flex items-center gap-3 rounded-xl overflow-hidden border border-slate-800/60"
                style={{ background: `linear-gradient(90deg, ${s.sky} 0%, #0a0a1a 100%)` }}
              >
                {/* ロックオーバーレイ */}
                <div className="absolute inset-0 backdrop-blur-[1px] bg-slate-950/60 flex items-center justify-center z-10">
                  <span className="text-slate-500 text-xs font-mono font-bold tracking-wider">🔒 LOCKED</span>
                </div>
                <div
                  className="w-16 h-14 flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: s.sky }}
                >
                  {s.emoji}
                </div>
                <div className="flex-1 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[9px] font-mono font-bold" style={{ color: s.accent }}>{s.label}</span>
                    <span className="text-[9px] text-slate-600">{s.layer}</span>
                  </div>
                  <p className="text-slate-400 text-xs">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 text-center space-y-4">
          <p className="text-white font-bold text-base">続きをプレイするには無料登録</p>
          <p className="text-slate-400 text-sm">草原・火山・城の全ステージ + AIレビュー + XPシステムが開放されます。</p>
          <Link
            href="/signup"
            className="block w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/25"
          >
            ▶ 無料で全ステージを解放する
          </Link>
          <Link href="/login" className="block text-slate-500 hover:text-slate-300 text-xs transition-colors">
            すでにアカウントをお持ちの方はこちら
          </Link>
        </div>

      </div>
    </div>
  );
}

// ── メインページ ──────────────────────────────────────────────────────

export default function PlaygroundPage() {
  const [phase, setPhase] = useState<Phase>('dialog');
  const [dbReady, setDbReady] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  const { hp, maxHp, damageFlash, recoverAll, resetFlash } = useGameStore();

  // DuckDB 初期化
  useEffect(() => {
    async function init() {
      try {
        for (const csv of EC_SITE_QUEST.csvFiles) {
          await registerCsvFile(csv.name, csv.content);
        }
        setDbReady(true);
      } catch (e) {
        console.error('DuckDB init failed:', e);
      }
    }
    init();
  }, []);

  // HP=0 → ゲームオーバー
  useEffect(() => {
    if (hp === 0 && !damageFlash && !gameOver && phase === 'source') {
      setTimeout(() => setGameOver(true), 300);
    }
  }, [hp, damageFlash, gameOver, phase]);

  // ダメージフラッシュクリア
  useEffect(() => {
    if (!damageFlash) return;
    const t = setTimeout(resetFlash, 400);
    return () => clearTimeout(t);
  }, [damageFlash, resetFlash]);

  function handleRetry() {
    setGameOver(false);
    recoverAll();
    setPhase('source');
  }

  function startSource() {
    recoverAll();
    setPhase('source');
  }

  return (
    <div
      className="flex flex-col h-screen text-white overflow-hidden"
      style={{ background: phase === 'source' ? '#080818' : '#060918' }}
    >
      {/* ── ヘッダー ── */}
      <header
        className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 flex-shrink-0"
        style={{ background: 'rgba(6,9,24,0.95)', backdropFilter: 'blur(8px)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
            ← ホーム
          </Link>
          <span className="text-slate-800">/</span>
          <span className="font-black text-sm text-white">
            <span className="text-indigo-400">◈</span> DataCraft | 無料体験
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
            TRIAL
          </span>
        </div>

        <div className="flex items-center gap-4">
          {phase === 'source' && <HpHearts hp={hp} maxHp={maxHp} />}
          <Link
            href="/signup"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
          >
            無料登録 →
          </Link>
        </div>
      </header>

      {/* ── ワールドバー ── */}
      {phase !== 'dialog' && <MiniWorldBar phase={phase} />}

      {/* ── メインコンテンツ ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* ダイアログ */}
        {phase === 'dialog' && (
          <div className="h-full flex flex-col items-center justify-center p-6 gap-8">
            {/* 簡易ブリーフィング */}
            <div className="max-w-lg text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                QUEST — ECサイト売上分析基盤
              </div>
              <h1 className="text-2xl font-black text-white">Source Layer を体験する</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                ShopNowのデータが3つのCSVに散らばっています。<br />
                まず <span className="text-indigo-300 font-semibold">Source Layer</span> に格納する体験からスタートしましょう。
              </p>
            </div>

            {/* クライアント情報カード */}
            <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-1">クライアント情報</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-lg font-black">S</div>
                <div>
                  <p className="font-bold text-white text-sm">ShopNow Inc.</p>
                  <p className="text-slate-500 text-xs">ECプラットフォーム</p>
                </div>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                「売上集計ができない。orders・users・productsのCSVがバラバラで数字が合わない。2週間で解決してほしい。」
              </p>
              <div className="flex gap-1.5 pt-1">
                {['orders.csv', 'users.csv', 'products.csv'].map(f => (
                  <span key={f} className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-slate-400 font-mono">📄 {f}</span>
                ))}
              </div>
            </div>

            <button
              onClick={startSource}
              className="flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              ▶ Source Layer の体験を開始する
            </button>
            <p className="text-slate-600 text-xs">所要時間: 約5分 ／ ログイン不要</p>
          </div>
        )}

        {/* Source ステージ（本物のゲームプレイ） */}
        {phase === 'source' && (
          <SourceStage
            quest={EC_SITE_QUEST}
            dbReady={dbReady}
            onComplete={() => setPhase('complete')}
          />
        )}

        {/* クリア後 */}
        {phase === 'complete' && <TrialCompleteScreen />}

      </div>

      {/* ゲームオーバー */}
      {gameOver && <GameOverOverlay onRetry={handleRetry} />}

    </div>
  );
}
