'use client';

import { Sprite } from './Sprite';
import { MIO } from './sprites/mio';

interface MioBadgeProps {
  expression?: 'cute' | 'excited' | 'happy' | 'thinking';
  message?: string;
  scale?: number;
  className?: string;
}

export function MioBadge({
  expression = 'cute',
  message,
  scale = 5,
  className = '',
}: MioBadgeProps) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <div
        className="flex-shrink-0"
        style={{ animation: 'idle-bob 2s ease-in-out infinite' }}
      >
        <Sprite grid={MIO[expression]} scale={scale} />
      </div>
      {message && (
        <div className="relative mb-2">
          {/* 吹き出し三角 */}
          <div
            className="absolute -left-2 bottom-3 w-0 h-0"
            style={{
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderRight: '8px solid rgba(99,102,241,0.3)',
            }}
          />
          <div className="rounded-xl px-4 py-2.5 text-xs text-slate-200 leading-relaxed max-w-48"
            style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}
          >
            {message}
          </div>
        </div>
      )}
    </div>
  );
}
