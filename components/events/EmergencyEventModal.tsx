'use client';

import { useState } from 'react';
import type { EmergencyEvent, EventOption } from '@/lib/events/emergencyEvents';
import { completeDailyMission } from '@/lib/daily/missions';

interface Props {
  event: EmergencyEvent;
  accent: string;
  onClose: (xpEarned: number) => void;
}

type Phase = 'question' | 'loading' | 'feedback';

const OPTION_COLORS = {
  A: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#93C5FD', hover: 'rgba(59,130,246,0.22)' },
  B: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.35)', text: '#6EE7B7', hover: 'rgba(16,185,129,0.22)' },
  C: { bg: 'rgba(168,85,247,0.12)', border: 'rgba(168,85,247,0.35)', text: '#C4B5FD', hover: 'rgba(168,85,247,0.22)' },
} as const;

export function EmergencyEventModal({ event, accent, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('question');
  const [selected, setSelected] = useState<EventOption | null>(null);
  const [feedback, setFeedback] = useState('');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  async function handleSelect(option: EventOption) {
    setSelected(option);
    setPhase('loading');

    try {
      const res = await fetch('/api/events/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventTitle: event.title,
          scenario: event.scenario,
          selectedKey: option.key,
          selectedLabel: option.label,
          selectedDescription: option.description,
          stageContext: event.stageContext,
        }),
      });
      const data = await res.json() as { message: string };
      setFeedback(data.message);
    } catch {
      setFeedback('その選択は実務でも見られるアプローチだよ。それぞれのトレードオフを理解した上で判断できることが大事。');
    }
    completeDailyMission('emergency_event');
    setPhase('feedback');
  }

  return (
    <div
      className="fixed right-5 top-1/2 -translate-y-1/2 z-[55] w-[400px] max-h-[85vh] overflow-y-auto"
      style={{ animation: 'event-appear 0.55s cubic-bezier(0.22,1,0.36,1) forwards' }}
    >
      {/* Outer glow ring */}
      <div className="absolute -inset-px rounded-2xl" style={{ background: `linear-gradient(135deg, ${accent}50, transparent, ${accent}30)`, zIndex: -1 }} />

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,10,20,0.97)',
          border: `1px solid ${accent}40`,
          boxShadow: `0 0 0 1px ${accent}15, 0 24px 80px rgba(0,0,0,0.9), 0 0 40px ${accent}10`,
          animation: phase === 'question' ? `event-border-pulse 2s ease-in-out infinite` : undefined,
        }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4" style={{ borderBottom: `1px solid ${accent}20`, background: `linear-gradient(to bottom, ${accent}10, transparent)` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              {/* Urgent badge */}
              <div className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                <span style={{ animation: 'urgent-blink 0.8s step-end infinite' }}>●</span> EMERGENCY
              </div>
            </div>
            {/* Close (skip) button — always visible */}
            <button
              onClick={() => onClose(0)}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors text-xs"
              title="スキップ"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="text-3xl">{event.icon}</span>
            <div>
              <p className="text-white font-black text-base leading-tight">{event.title}</p>
              <p className="text-xs mt-0.5" style={{ color: `${accent}cc` }}>+{event.xpReward} XP for engaging</p>
            </div>
          </div>
        </div>

        {/* Scenario */}
        <div className="px-5 py-4" style={{ borderBottom: `1px solid rgba(255,255,255,0.05)` }}>
          <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{event.scenario}</p>
        </div>

        {/* Question phase */}
        {phase === 'question' && (
          <div className="px-5 py-4">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">{event.question}</p>
            <div className="space-y-2.5">
              {event.options.map(opt => {
                const colors = OPTION_COLORS[opt.key];
                const isHovered = hoveredKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setHoveredKey(opt.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    className="w-full text-left rounded-xl px-4 py-3 transition-all duration-150"
                    style={{
                      background: isHovered ? colors.hover : colors.bg,
                      border: `1px solid ${isHovered ? colors.text + '60' : colors.border}`,
                      transform: isHovered ? 'translateX(3px)' : 'none',
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black mt-0.5" style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
                        {opt.key}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white leading-snug">{opt.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{opt.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading phase */}
        {phase === 'loading' && (
          <div className="px-5 py-8 flex flex-col items-center gap-3">
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 rounded-full" style={{ background: accent, animation: `dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
            <p className="text-slate-500 text-xs">田中シニアEngが考え中...</p>
          </div>
        )}

        {/* Feedback phase */}
        {phase === 'feedback' && selected && (
          <div className="px-5 py-4">
            {/* Selection recap */}
            <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-slate-500 text-xs">選択:</span>
              <span className="text-slate-300 text-xs font-semibold">{selected.key}. {selected.label}</span>
            </div>

            {/* Tanaka feedback */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(30,30,50,0.6)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2 mb-3">
                {/* Tanaka avatar */}
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#A5B4FC' }}>
                  田
                </div>
                <div>
                  <p className="text-white text-xs font-bold">田中シニアエンジニア</p>
                  <p className="text-slate-600 text-[10px]">10年以上の経験</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">{feedback}</p>
            </div>

            {/* XP reward + close */}
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-black" style={{ background: `${accent}15`, border: `1px solid ${accent}30`, color: accent }}>
                ＋{event.xpReward} XP
              </div>
              <button
                onClick={() => onClose(event.xpReward)}
                className="px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${accent}cc, ${accent})`, boxShadow: `0 0 16px ${accent}30` }}
              >
                了解！続きを設計する →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
