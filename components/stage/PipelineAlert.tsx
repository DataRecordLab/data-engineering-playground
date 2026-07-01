'use client';

import { useState } from 'react';

export interface AlertMetric {
  label: string;
  value: string;
  isAnomaly: boolean;
  detail?: string;
}

export interface AlertOption {
  label: string;
  correct: boolean;
  wrongMessage?: string;
}

export interface PipelineAlertData {
  level: 'critical' | 'warning';
  table: string;
  title: string;
  situation: string;
  metrics: AlertMetric[];
  cause: string;
  question: string;
  options: AlertOption[];
  correctExplanation: string;
}

interface Props {
  data: PipelineAlertData;
  onResolve: () => void;
}

export function PipelineAlert({ data, onResolve }: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  const isCritical = data.level === 'critical';

  function handleSelect(idx: number) {
    if (answered) return;
    setSelected(idx);
    if (data.options[idx].correct) setAnswered(true);
  }

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${
      isCritical ? 'border-red-500/50' : 'border-amber-500/50'
    }`}>
      {/* Header */}
      <div className={`px-5 py-3 flex items-center gap-3 ${
        isCritical ? 'bg-red-500/15' : 'bg-amber-500/15'
      }`}>
        <div className={`text-2xl ${isCritical ? 'animate-pulse' : ''}`}>
          {isCritical ? '🔴' : '🟡'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>
              Pipeline Alert — {isCritical ? 'CRITICAL' : 'WARNING'}
            </span>
          </div>
          <p className="text-xs mt-0.5">
            <span className={`font-mono ${isCritical ? 'text-red-300' : 'text-amber-300'}`}>{data.table}</span>
            <span className="text-slate-500 ml-2">— {data.title}</span>
          </p>
        </div>
        <span className={`text-xl flex-shrink-0 ${isCritical ? 'text-red-400' : 'text-amber-400'}`}>⚠</span>
      </div>

      <div className="p-5 space-y-4 bg-slate-950/60">

        {/* Situation */}
        <p className="text-slate-300 text-sm leading-relaxed">{data.situation}</p>

        {/* Metrics */}
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-4 py-2 bg-slate-800/60 border-b border-slate-700">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">検知データ</p>
          </div>
          <div className="divide-y divide-slate-800/60">
            {data.metrics.map((m, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start justify-between gap-4">
                <p className="text-xs text-slate-400 flex-shrink-0">{m.label}</p>
                <div className="text-right">
                  <span className={`font-mono text-xs font-semibold ${
                    m.isAnomaly
                      ? isCritical ? 'text-red-400' : 'text-amber-400'
                      : 'text-slate-400'
                  }`}>
                    {m.value}
                    {m.isAnomaly && (
                      <span className={`ml-2 text-[9px] px-1 py-0.5 rounded border ${
                        isCritical
                          ? 'bg-red-500/20 border-red-500/30 text-red-300'
                          : 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                      }`}>異常</span>
                    )}
                  </span>
                  {m.detail && <p className="text-[10px] text-slate-600 mt-0.5">{m.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cause */}
        <div className={`px-4 py-3 rounded-xl text-xs leading-relaxed border ${
          isCritical
            ? 'bg-red-500/5 border-red-500/20 text-red-200'
            : 'bg-amber-500/5 border-amber-500/20 text-amber-200'
        }`}>
          <span className="font-semibold">根本原因: </span>{data.cause}
        </div>

        {/* Quiz */}
        <div>
          <p className="text-white text-sm font-semibold mb-3">💭 {data.question}</p>
          <div className="space-y-2">
            {data.options.map((opt, i) => {
              const isSel = selected === i;
              const isCorrect = isSel && answered;
              const isWrong = isSel && !answered;
              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={answered}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-200'
                    : isWrong ? 'bg-red-500/15 border-red-500/30 text-red-200'
                    : answered ? 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-default'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Wrong feedback */}
        {selected !== null && !answered && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm leading-relaxed">
            {data.options[selected]?.wrongMessage ?? '不正解です。もう一度考えてみてください。'}
          </div>
        )}

        {/* Correct + resolve */}
        {answered && (
          <>
            <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm leading-relaxed">
              {data.correctExplanation}
            </div>
            <button
              onClick={onResolve}
              className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
            >
              ✓ アラートを解決して続ける →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
