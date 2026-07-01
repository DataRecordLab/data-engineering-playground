'use client';

import { useState } from 'react';
import { useGameStore } from '@/lib/store/gameStore';

export interface ReflectionOption {
  label: string;
  correct: boolean;
  explanation: string;
}

interface Props {
  question: string;
  options: ReflectionOption[];
  onComplete: () => void;
  completeLabel?: string;
}

export function ReflectionQuestion({ question, options, onComplete, completeLabel }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const loseHp = useGameStore(s => s.loseHp);
  const triggerJump = useGameStore(s => s.triggerJump);

  function handleSelect(i: number) {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (options[i].correct) triggerJump();
    else loseHp();
  }

  const selectedOpt = selected !== null ? options[selected] : null;

  return (
    <div className="px-5 py-5 rounded-2xl border border-violet-500/25 bg-violet-500/5 space-y-4">
      <div className="flex items-start gap-2.5">
        <span className="text-violet-400 text-lg flex-shrink-0 leading-none mt-0.5">💭</span>
        <div>
          <p className="text-[11px] text-violet-400 font-semibold uppercase tracking-wider mb-1.5">考えてみましょう</p>
          <p className="text-white text-sm font-medium leading-relaxed">{question}</p>
        </div>
      </div>

      <div className="space-y-2">
        {options.map((opt, i) => {
          const isSel = selected === i;
          const isCorrect = isSel && opt.correct;
          const isWrong = isSel && !opt.correct;
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs leading-relaxed transition-all ${
                isCorrect
                  ? 'bg-green-500/15 border-green-500/40 text-green-200'
                  : isWrong
                  ? 'bg-red-500/15 border-red-500/30 text-red-200'
                  : answered
                  ? 'bg-slate-800/30 border-slate-700/40 text-slate-600 cursor-default'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-violet-500/40 hover:bg-slate-800 cursor-pointer'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {answered && selectedOpt && (
        <div className={`px-3.5 py-3 rounded-xl text-xs leading-relaxed ${
          selectedOpt.correct
            ? 'bg-green-500/10 border border-green-500/20 text-green-300'
            : 'bg-slate-800/60 border border-slate-700 text-slate-400'
        }`}>
          {selectedOpt.explanation}
        </div>
      )}

      {answered && (
        <button
          onClick={onComplete}
          className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors bg-violet-600 hover:bg-violet-500 text-white"
        >
          {completeLabel ?? (selectedOpt?.correct ? '理解しました！続ける →' : '次へ進む →')}
        </button>
      )}
    </div>
  );
}
