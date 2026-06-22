'use client';
import type { FeedbackResponse } from '@/lib/ai/feedback';

interface Props {
  feedback: FeedbackResponse | null;
  isLoading: boolean;
}

export function AiFeedback({ feedback, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="p-4 rounded-xl border border-slate-700 bg-slate-900/80">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <span className="inline-block animate-spin">⟳</span>
          田中シニアエンジニアがレビュー中...
        </div>
      </div>
    );
  }

  if (!feedback) return null;

  const filledStars = feedback.stars;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/80 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-medium">田中シニアエンジニア</span>
        <span className="text-base tracking-widest">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className={i < filledStars ? 'text-yellow-400' : 'text-slate-700'}>★</span>
          ))}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-200 text-xs leading-relaxed">
          {feedback.conceptExplanation}
        </div>

        <p className="text-slate-300 text-sm leading-relaxed">{feedback.message}</p>

        {feedback.improvements.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 mb-1.5 font-medium">改善提案</p>
            <ul className="space-y-1.5">
              {feedback.improvements.map((imp, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-amber-300">
                  <span className="flex-shrink-0 mt-0.5 text-amber-500">→</span>
                  <span className="leading-relaxed">{imp}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-slate-500 italic pt-1 border-t border-slate-800">
          {feedback.encouragement}
        </p>
      </div>
    </div>
  );
}
