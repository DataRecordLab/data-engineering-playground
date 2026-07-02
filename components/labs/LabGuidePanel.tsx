'use client';

import { MioBadge } from '@/components/characters/MioBadge';

type MioExpression = 'cute' | 'excited' | 'happy' | 'thinking';

export interface GuideStep {
  title: string;
  message: string;
  hint?: string;
  expression?: MioExpression;
  isPro?: boolean;
}

interface Props {
  steps: GuideStep[];
  currentStep: number;
  onNext: () => void;
  onShowPro: () => void;
  isVisible: boolean;
}

export function LabGuidePanel({ steps, currentStep, onNext, onShowPro, isVisible }: Props) {
  if (!isVisible) return null;

  const step = steps[currentStep];
  if (!step) return null;

  const expression: MioExpression = step.expression ?? (
    step.isPro ? 'thinking' : currentStep === 0 ? 'excited' : 'happy'
  );

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div
        className="rounded-2xl border border-indigo-900/60 p-4"
        style={{
          background: 'linear-gradient(135deg, #0d0d28 0%, #09071a 100%)',
          boxShadow: '0 0 40px rgba(99,102,241,0.18), 0 0 0 1px rgba(129,140,248,0.08)',
        }}
      >
        {/* ステップインジケーター */}
        <div className="flex items-center gap-1.5 mb-3">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-500"
              style={{ background: i <= currentStep ? '#818cf8' : '#1e293b' }}
            />
          ))}
          <span className="text-[9px] text-slate-600 font-mono ml-1 flex-shrink-0">
            {currentStep + 1}/{steps.length}
          </span>
        </div>

        {/* キャラクター + メッセージ */}
        <div className="flex items-end gap-3 mb-3">
          <div className="flex-shrink-0" style={{ animation: 'idle-bob 2s ease-in-out infinite' }}>
            <MioBadge expression={expression} scale={3} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono font-bold text-indigo-400 mb-1">{step.title}</p>
            <p className="text-xs text-slate-200 leading-relaxed">{step.message}</p>
            {step.hint && (
              <p className="text-[10px] text-slate-500 mt-1.5 border-t border-slate-800 pt-1.5">
                💡 {step.hint}
              </p>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        {step.isPro ? (
          <button
            onClick={onShowPro}
            className="w-full py-2.5 rounded-xl font-black text-xs text-white transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            🔓 Proプランで続きを解放する
          </button>
        ) : (
          <button
            onClick={onNext}
            className="w-full py-2 rounded-xl border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 hover:text-white text-xs font-bold transition-all hover:bg-indigo-500/10"
          >
            わかった！次へ →
          </button>
        )}
      </div>
    </div>
  );
}
