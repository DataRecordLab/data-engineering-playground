'use client';

import { useState, useCallback, useRef } from 'react';
import type { SkillLesson, SkillQuestion, MultipleChoiceQuestion, TrueFalseQuestion, OrderingQuestion, FillBlankQuestion } from '@/types';
import { useGameStore } from '@/lib/store/gameStore';

// ── 問題コンポーネント ───────────────────────────────────────────────

function MultipleChoiceCard({ q, onAnswer }: { q: MultipleChoiceQuestion; onAnswer: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  function handle(i: number) {
    if (selected !== null) return;
    setSelected(i);
    setTimeout(() => onAnswer(q.options[i].correct), 900);
  }

  return (
    <div className="space-y-2.5">
      {q.options.map((opt, i) => {
        let cls = 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60';
        if (selected !== null) {
          if (opt.correct) cls = 'border-green-500/60 bg-green-500/10 text-green-300';
          else if (i === selected && !opt.correct) cls = 'border-red-500/60 bg-red-500/10 text-red-300';
          else cls = 'border-slate-800 bg-slate-900/30 text-slate-600';
        }
        return (
          <button
            key={i}
            onClick={() => handle(i)}
            disabled={selected !== null}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-medium ${cls} disabled:cursor-default`}
          >
            <span className="text-slate-500 mr-2 font-mono text-xs">
              {selected !== null
                ? opt.correct ? '✓' : i === selected ? '✗' : '○'
                : String.fromCharCode(65 + i)}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function TrueFalseCard({ q, onAnswer }: { q: TrueFalseQuestion; onAnswer: (correct: boolean) => void }) {
  const [selected, setSelected] = useState<boolean | null>(null);

  function handle(val: boolean) {
    if (selected !== null) return;
    setSelected(val);
    setTimeout(() => onAnswer(val === q.correct), 900);
  }

  const btnCls = (val: boolean) => {
    if (selected === null) return 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500';
    if (val === q.correct) return 'border-green-500/60 bg-green-500/10 text-green-300';
    if (val === selected) return 'border-red-500/60 bg-red-500/10 text-red-300';
    return 'border-slate-800 bg-slate-900/30 text-slate-600';
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {([true, false] as const).map(val => (
        <button
          key={String(val)}
          onClick={() => handle(val)}
          disabled={selected !== null}
          className={`py-5 rounded-xl border text-2xl font-black transition-all disabled:cursor-default ${btnCls(val)}`}
        >
          {val ? '⭕ 正しい' : '✗ 間違い'}
        </button>
      ))}
    </div>
  );
}

function OrderingCard({ q, onAnswer }: { q: OrderingQuestion; onAnswer: (correct: boolean) => void }) {
  const [order, setOrder] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  function selectItem(idx: number) {
    if (submitted) return;
    if (order.includes(idx)) {
      setOrder(order.filter(i => i !== idx));
    } else {
      const next = [...order, idx];
      setOrder(next);
      if (next.length === q.items.length) {
        const isCorrect = next.every((v, i) => v === q.correctOrder[i]);
        setCorrect(isCorrect);
        setSubmitted(true);
        setTimeout(() => onAnswer(isCorrect), 1000);
      }
    }
  }

  return (
    <div className="space-y-2">
      {q.items.map((item, idx) => {
        const pos = order.indexOf(idx);
        const isSelected = pos >= 0;
        let cls = 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-indigo-500/40';
        if (submitted) {
          cls = isSelected && correct
            ? 'border-green-500/60 bg-green-500/10 text-green-300'
            : isSelected
            ? 'border-red-500/60 bg-red-500/10 text-red-300'
            : 'border-slate-800 bg-slate-900/20 text-slate-600';
        } else if (isSelected) {
          cls = 'border-indigo-500/60 bg-indigo-500/10 text-indigo-300';
        }

        return (
          <button
            key={idx}
            onClick={() => selectItem(idx)}
            disabled={submitted}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm flex items-center gap-3 disabled:cursor-default ${cls}`}
          >
            <span
              className="w-6 h-6 rounded-full border flex-shrink-0 flex items-center justify-center text-xs font-bold"
              style={{
                borderColor: isSelected ? 'currentColor' : 'rgba(100,116,139,0.4)',
                background: isSelected ? 'rgba(99,102,241,0.2)' : 'transparent',
              }}
            >
              {isSelected ? pos + 1 : ''}
            </span>
            {item}
          </button>
        );
      })}
      <p className="text-slate-600 text-xs text-center mt-2">
        正しい順番にクリックしてください（{order.length}/{q.items.length}）
      </p>
    </div>
  );
}

function FillBlankCard({ q, onAnswer }: { q: FillBlankQuestion; onAnswer: (correct: boolean) => void }) {
  const [value, setValue] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function normalize(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  function check() {
    if (!value.trim() || submitted) return;
    const v = normalize(value);
    const ok =
      v === normalize(q.answer) ||
      (q.acceptedAnswers ?? []).some(a => v === normalize(a));
    setCorrect(ok);
    setSubmitted(true);
    setTimeout(() => onAnswer(ok), 900);
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && check()}
          disabled={submitted}
          placeholder={q.placeholder ?? '答えを入力...'}
          autoFocus
          className={`w-full px-4 py-3.5 rounded-xl border text-sm font-mono transition-all outline-none disabled:cursor-default ${
            !submitted
              ? 'border-slate-700 bg-slate-900 text-white placeholder:text-slate-600 focus:border-indigo-500/60 focus:bg-slate-900/80'
              : correct
              ? 'border-green-500/60 bg-green-500/10 text-green-300'
              : 'border-red-500/60 bg-red-500/10 text-red-300'
          }`}
        />
        {submitted && !correct && (
          <p className="mt-2 text-xs text-slate-500 font-mono">
            正解: <span className="text-green-400 font-bold">{q.answer}</span>
          </p>
        )}
      </div>
      {!submitted && (
        <button
          onClick={check}
          disabled={!value.trim()}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
        >
          確認する
        </button>
      )}
    </div>
  );
}

// ── メインプレイヤー ──────────────────────────────────────────────────

type Phase = 'question' | 'feedback' | 'complete';

interface Props {
  lesson: SkillLesson;
  onComplete: (xpEarned: number, correctCount: number) => void;
}

export function LessonPlayer({ lesson, onComplete }: Props) {
  const [qIdx, setQIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [lastCorrect, setLastCorrect] = useState(false);

  const { loseHp, triggerJump } = useGameStore();

  const q = lesson.questions[qIdx];
  const total = lesson.questions.length;
  const progress = qIdx / total;

  const handleAnswer = useCallback((correct: boolean) => {
    setLastCorrect(correct);
    setPhase('feedback');
    if (correct) {
      triggerJump();
      setCorrectCount(c => c + 1);
    } else {
      loseHp();
    }
  }, [loseHp, triggerJump]);

  function next() {
    if (qIdx + 1 >= total) {
      const earned = Math.round(lesson.xpReward * ((correctCount + (lastCorrect ? 1 : 0)) / total));
      onComplete(Math.max(earned, Math.round(lesson.xpReward * 0.3)), correctCount + (lastCorrect ? 1 : 0));
    } else {
      setQIdx(i => i + 1);
      setPhase('question');
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 進捗バー */}
      <div className="h-2 bg-slate-900 flex-shrink-0">
        <div
          className="h-full bg-indigo-500 transition-all duration-500 rounded-r-full"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-5 py-8 space-y-6">

          {/* 問題番号 */}
          <div className="flex items-center justify-between">
            <span className="text-slate-600 text-xs font-mono">{qIdx + 1} / {total}</span>
            <span className="text-slate-600 text-xs">{QUESTION_TYPE_LABEL[q.type]}</span>
          </div>

          {/* 問題文 */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 px-5 py-5">
            <p className="text-white font-semibold text-base leading-relaxed">{q.question}</p>
          </div>

          {/* 選択肢 */}
          {phase === 'question' && (
            <>
              {q.type === 'multiple_choice' && <MultipleChoiceCard q={q as MultipleChoiceQuestion} onAnswer={handleAnswer} />}
              {q.type === 'true_false' && <TrueFalseCard q={q as TrueFalseQuestion} onAnswer={handleAnswer} />}
              {q.type === 'ordering' && <OrderingCard q={q as OrderingQuestion} onAnswer={handleAnswer} />}
              {q.type === 'fill_blank' && <FillBlankCard key={qIdx} q={q as FillBlankQuestion} onAnswer={handleAnswer} />}
            </>
          )}

          {/* フィードバック */}
          {phase === 'feedback' && (
            <div className="space-y-4">
              <div
                className={`rounded-xl border px-5 py-4 ${
                  lastCorrect
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <p className={`font-bold text-sm mb-1 ${lastCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {lastCorrect ? '✓ 正解！' : '✗ 不正解'}
                </p>
                <p className="text-slate-300 text-sm leading-relaxed">{q.explanation}</p>
              </div>

              <button
                onClick={next}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors"
              >
                {qIdx + 1 >= total ? '結果を見る →' : '次の問題 →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const QUESTION_TYPE_LABEL: Record<string, string> = {
  multiple_choice: '選択問題',
  true_false: '正誤問題',
  ordering: '並び替え',
  fill_blank: '記述問題',
};
