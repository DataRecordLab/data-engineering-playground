'use client';

import { useState, useEffect, useRef } from 'react';
import { MioIllustration, type MioExpression } from './MioIllustration';

const IDLE_CYCLE: MioExpression[] = ['happy', 'cute', 'thinking', 'happy', 'neutral'];

const TIPS = [
  'データパイプラインは設計が命だよ！',
  '今日もクエストをクリアしよう！',
  'スキルパスで実力をつけよう！',
  'dbt Simulator を試してみて！',
  'DAGの依存関係を理解するのが近道！',
  'データ品質チェックを忘れずに！',
  'リネージを把握すると設計が変わる！',
  'インクリメンタル処理で効率UP！',
  'ストリーキングを続けよう！🔥',
  'スターを3つ集めてマスターになろう！',
];

export function FloatingLion() {
  const [expression, setExpression] = useState<MioExpression>('happy');
  const [message, setMessage] = useState<string | null>(null);
  const [isJumping, setIsJumping] = useState(false);
  const msgTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const idxRef   = useRef(0);

  // Idle expression cycle
  useEffect(() => {
    const id = setInterval(() => {
      if (!message) {
        idxRef.current = (idxRef.current + 1) % IDLE_CYCLE.length;
        setExpression(IDLE_CYCLE[idxRef.current]);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [message]);

  function handleClick() {
    clearTimeout(msgTimer.current);
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    setExpression('excited');
    setIsJumping(true);
    setMessage(tip);

    setTimeout(() => setIsJumping(false), 700);

    msgTimer.current = setTimeout(() => {
      setMessage(null);
      setExpression('happy');
    }, 5000);
  }

  return (
    <div
      className="fixed bottom-[72px] lg:bottom-5 right-4 lg:right-5 z-[9999] flex flex-col items-center pointer-events-none"
      aria-hidden
    >
      {/* Speech bubble */}
      {message && (
        <div className="mb-2 animate-slide-up pointer-events-auto" style={{ maxWidth: 200 }}>
          <div
            className="rounded-2xl px-3.5 py-2.5 text-[12px] text-white leading-snug font-medium shadow-2xl"
            style={{
              background: 'rgba(9,14,26,0.94)',
              border: '1px solid rgba(6,182,212,0.4)',
              boxShadow: '0 8px 32px rgba(6,182,212,0.15)',
            }}
          >
            {message}
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div
              style={{
                width: 0, height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '7px solid rgba(6,182,212,0.4)',
              }}
            />
          </div>
        </div>
      )}

      {/* Lion */}
      <div
        onClick={handleClick}
        className="cursor-pointer pointer-events-auto hover:scale-110 transition-transform duration-150 opacity-90 hover:opacity-100"
        style={{
          animation: isJumping
            ? 'lion-jump 0.65s ease-out both'
            : 'lion-float 3.5s ease-in-out infinite',
          filter: 'drop-shadow(0 6px 16px rgba(0,0,0,0.35))',
        }}
        title="クリックしてみて！"
      >
        <MioIllustration expression={expression} size={88} />
      </div>
    </div>
  );
}
