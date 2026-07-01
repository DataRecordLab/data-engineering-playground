'use client';

import { useEffect, useState } from 'react';

interface Props {
  onRetry: () => void;
}

export function GameOverOverlay({ onRetry }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 暗転背景 */}
      <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-10 py-10 rounded-2xl bg-slate-900 border border-red-900/50 shadow-2xl shadow-red-950/50 w-full max-w-xs mx-4">
        {/* ハート0 */}
        <div className="flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="text-2xl text-slate-700 leading-none">♡</span>
          ))}
        </div>

        {/* タイトル */}
        <div className="text-center space-y-1">
          <p
            className="text-4xl font-black tracking-widest text-red-500"
            style={{ fontFamily: 'monospace', textShadow: '0 0 20px rgba(239,68,68,0.6)' }}
          >
            GAME OVER
          </p>
          <p className="text-slate-500 text-xs">HPがなくなりました</p>
        </div>

        {/* メッセージ */}
        <div className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
          <p className="text-slate-300 text-sm leading-relaxed">
            間違えても大丈夫！<br />
            もう一度考えて挑戦しよう。
          </p>
        </div>

        {/* リトライボタン */}
        <button
          onClick={onRetry}
          className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-red-900/40"
        >
          ▶ もう一度挑戦！
        </button>
      </div>
    </div>
  );
}
