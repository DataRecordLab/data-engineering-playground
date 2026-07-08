'use client';

import { MioIllustration, type MioExpression } from './MioIllustration';

interface MioBadgeProps {
  expression?: MioExpression;
  message?: string;
  size?: number;
  className?: string;
}

export function MioBadge({
  expression = 'happy',
  message,
  size = 80,
  className = '',
}: MioBadgeProps) {
  return (
    <div className={`flex items-end gap-3 ${className}`}>
      <div className="flex-shrink-0 animate-idle-bob">
        <MioIllustration expression={expression} size={size} />
      </div>
      {message && (
        <div className="relative mb-3">
          <div
            className="absolute -left-2 bottom-4 w-0 h-0"
            style={{
              borderTop: '7px solid transparent',
              borderBottom: '7px solid transparent',
              borderRight: '9px solid rgba(99,102,241,0.28)',
            }}
          />
          <div
            className="rounded-xl px-4 py-3 text-sm text-[#e8eaf6] leading-relaxed max-w-52"
            style={{ background: 'rgba(99,102,241,0.13)', border: '1px solid rgba(99,102,241,0.28)' }}
          >
            {message}
          </div>
        </div>
      )}
    </div>
  );
}
