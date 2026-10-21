'use client';

import { useState, useCallback, useRef } from 'react';
import type { SkillLesson, SkillQuestion, MultipleChoiceQuestion, TrueFalseQuestion, OrderingQuestion, FillBlankQuestion, AnswerOutcome, LessonResult } from '@/types';
import { useGameStore } from '@/lib/store/gameStore';
import { shuffleQuestion, classifyAnswer, summarize, xpFor } from '@/lib/skills/grading';

type AnswerHandler = (correct: boolean, confident: boolean) => void;

// ── 自信度の申告 ─────────────────────────────────────────────────────
// 選択肢を選んだあとに「自信あり / 勘」を申告させる。
// 勘で当たった問題は理解済みと見なさず、レッスンの最後にもう一度出題する

function ConfidenceSubmit({ onSubmit }: { onSubmit: (confident: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 pt-1 animate-slide-up">
      <button
        onClick={() => onSubmit(false)}
        className="py-3 rounded-xl border border-slate-700 bg-slate-900 hover:border-slate-500 text-slate-300 font-bold text-sm transition-colors"
      >
        🤔 自信なし（勘）
      </button>
      <button
        onClick={() => onSubmit(true)}
        className="py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-colors"
      >
        💡 理由まで説明できる
      </button>
    </div>
  );
}

// ── 問題コンポーネント ───────────────────────────────────────────────

function MultipleChoiceCard({ q, onAnswer }: { q: MultipleChoiceQuestion; onAnswer: AnswerHandler }) {
  const [picked, setPicked] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const selected = submitted ? picked : null;

  function submit(confident: boolean) {
    if (picked === null || submitted) return;
    setSubmitted(true);
    setTimeout(() => onAnswer(q.options[picked].correct, confident), 900);
  }

  return (
    <div className="space-y-2.5">
      {q.options.map((opt, i) => {
        let cls = i === picked
          ? 'border-indigo-500/70 bg-indigo-500/10 text-indigo-200'
          : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60';
        if (selected !== null) {
          if (opt.correct) cls = 'border-green-500/60 bg-green-500/10 text-green-300';
          else if (i === selected && !opt.correct) cls = 'border-red-500/60 bg-red-500/10 text-red-300';
          else cls = 'border-slate-800 bg-slate-900/30 text-slate-600';
        }
        return (
          <button
            key={i}
            onClick={() => !submitted && setPicked(i)}
            disabled={submitted}
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
      {picked !== null && !submitted && <ConfidenceSubmit onSubmit={submit} />}
    </div>
  );
}

function TrueFalseCard({ q, onAnswer }: { q: TrueFalseQuestion; onAnswer: AnswerHandler }) {
  const [picked, setPicked] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const selected = submitted ? picked : null;

  function submit(confident: boolean) {
    if (picked === null || submitted) return;
    setSubmitted(true);
    setTimeout(() => onAnswer(picked === q.correct, confident), 900);
  }

  const btnCls = (val: boolean) => {
    if (selected === null) {
      return val === picked
        ? 'border-indigo-500/70 bg-indigo-500/10 text-indigo-200'
        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500';
    }
    if (val === q.correct) return 'border-green-500/60 bg-green-500/10 text-green-300';
    if (val === selected) return 'border-red-500/60 bg-red-500/10 text-red-300';
    return 'border-slate-800 bg-slate-900/30 text-slate-600';
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {([true, false] as const).map(val => (
          <button
            key={String(val)}
            onClick={() => !submitted && setPicked(val)}
            disabled={submitted}
            className={`py-5 rounded-xl border text-2xl font-black transition-all disabled:cursor-default ${btnCls(val)}`}
          >
            {val ? '⭕ 正しい' : '✗ 間違い'}
          </button>
        ))}
      </div>
      {picked !== null && !submitted && <ConfidenceSubmit onSubmit={submit} />}
    </div>
  );
}

function OrderingCard({ q, onAnswer }: { q: OrderingQuestion; onAnswer: AnswerHandler }) {
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
        setTimeout(() => onAnswer(isCorrect, true), 1000);
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

function FillBlankCard({ q, onAnswer }: { q: FillBlankQuestion; onAnswer: AnswerHandler }) {
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
    setTimeout(() => onAnswer(ok, true), 900);
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

type Phase = 'intro' | 'question' | 'feedback';

// review: 初回で理解できていなかった問題の再出題（採点には含めない）
interface DeckItem {
  source: SkillQuestion;
  shown: SkillQuestion;
  review: boolean;
}

interface Props {
  lesson: SkillLesson;
  onComplete: (xpEarned: number, result: LessonResult) => void;
  hintUnlocked?: boolean;
}

const FEEDBACK_COPY: Record<AnswerOutcome, { title: string; note?: string; tone: 'good' | 'warn' | 'bad' }> = {
  mastered:      { title: '✓ 正解！', tone: 'good' },
  lucky:         { title: '✓ 正解（勘）', note: '当たりましたが、勘の正解は「理解済み」に数えません。レッスンの最後にもう一度出題します。', tone: 'warn' },
  misconception: { title: '✗ 不正解 — 思い込みポイント', note: '自信があったのに外れた問題は、実務で事故につながりやすい誤解です。解説をよく読んでください。最後にもう一度出題します。', tone: 'bad' },
  unknown:       { title: '✗ 不正解', note: '正直な申告なので HP は減りません。解説を読んだら、最後にもう一度挑戦しましょう。', tone: 'bad' },
};

export function LessonPlayer({ lesson, onComplete, hintUnlocked = false }: Props) {
  const [deck, setDeck] = useState<DeckItem[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [outcomes, setOutcomes] = useState<AnswerOutcome[]>([]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [lastOutcome, setLastOutcome] = useState<AnswerOutcome>('mastered');
  const [showHint, setShowHint] = useState(false);

  const { loseHp, triggerJump } = useGameStore();

  const item = deck[qIdx];
  const q = item?.shown;
  const total = lesson.questions.length;
  const progress = deck.length > 0 ? qIdx / deck.length : 0;
  const lastCorrect = lastOutcome === 'mastered' || lastOutcome === 'lucky';

  // 選択肢のシャッフルはクライアントのイベント内で行う（SSR とのズレを避ける）
  function start() {
    setDeck(lesson.questions.map(src => ({ source: src, shown: shuffleQuestion(src), review: false })));
    setQIdx(0);
    setOutcomes([]);
    setPhase('question');
  }

  const handleAnswer = useCallback((correct: boolean, confident: boolean) => {
    const outcome = classifyAnswer(correct, confident);
    setLastOutcome(outcome);
    setPhase('feedback');
    if (correct) triggerJump();
    // 自信なしと正直に申告した不正解では HP を減らさない
    if (outcome === 'misconception') loseHp();

    // 復習の回答は採点に含めず、再出題もしない（無限ループ防止）
    if (!item.review) {
      setOutcomes(o => [...o, outcome]);
      if (outcome !== 'mastered') {
        setDeck(d => [...d, { source: item.source, shown: shuffleQuestion(item.source), review: true }]);
      }
    }
  }, [item, loseHp, triggerJump]);

  function next() {
    if (qIdx + 1 >= deck.length) {
      const result = summarize(outcomes);
      onComplete(xpFor(result, lesson.xpReward), result);
    } else {
      setQIdx(i => i + 1);
      setShowHint(false);
      setPhase('question');
    }
  }

  const copy = FEEDBACK_COPY[lastOutcome];

  return (
    <div className="flex flex-col h-full">
      {/* 進捗バー */}
      <div className="h-2 bg-slate-900 flex-shrink-0">
        <div
          className="h-full bg-indigo-500 transition-all duration-500 rounded-r-full"
          style={{ width: `${phase === 'intro' ? 0 : progress * 100}%` }}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-5 py-8">

          {/* ── コンセプトカード（Progate風） ── */}
          {phase === 'intro' && (
            <div className="flex flex-col gap-6 animate-slide-up">
              <div className="text-center">
                <span className="text-5xl">{lesson.icon}</span>
                <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-3 mb-1">このレッスンで学ぶこと</p>
                <h2 className="text-white font-black text-xl">{lesson.concept?.title ?? lesson.title}</h2>
              </div>

              {lesson.concept && (
                <div
                  className="rounded-2xl border px-6 py-5 space-y-3"
                  style={{ background: 'rgba(15,23,42,0.8)', borderColor: 'rgba(99,102,241,0.25)' }}
                >
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                    {lesson.concept.body}
                  </p>
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3 text-left">
                <p className="text-slate-400 text-xs leading-relaxed">
                  回答するときは<span className="text-indigo-300 font-bold">「理由まで説明できる」</span>か
                  <span className="text-slate-200 font-bold">「自信なし（勘）」</span>かを選びます。
                  勘で当たった問題は理解済みに数えず、最後にもう一度出題されます。★3 は全問を自信を持って正解したときだけです。
                </p>
              </div>

              <button
                onClick={start}
                className="w-full py-4 rounded-2xl font-black text-white text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: '#4F46E5', boxShadow: '0 5px 0 #3730A3' }}
              >
                わかった！問題を解く →
              </button>
            </div>
          )}

          {/* ── 問題 ── */}
          {(phase === 'question' || phase === 'feedback') && q && (
            <div className="space-y-6">
              {/* 問題番号 */}
              <div className="flex items-center justify-between">
                <span className="text-slate-600 text-xs font-mono">
                  {item.review ? `🔁 復習 ${qIdx + 1 - total} / ${deck.length - total}` : `${qIdx + 1} / ${total}`}
                </span>
                <span className="text-slate-600 text-xs">{QUESTION_TYPE_LABEL[q.type]}</span>
              </div>

              {/* 問題文 */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 px-5 py-5">
                <p className="text-white font-semibold text-base leading-relaxed">{q.question}</p>
              </div>

              {/* ヒントアンロック */}
              {phase === 'question' && hintUnlocked && lesson.concept && (
                <div>
                  {!showHint ? (
                    <button
                      onClick={() => setShowHint(true)}
                      className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      💡 ヒントを見る
                    </button>
                  ) : (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-3">
                      <p className="text-emerald-400 text-[10px] font-mono uppercase tracking-wider mb-1.5">💡 ヒント</p>
                      <p className="text-slate-300 text-xs leading-relaxed">{lesson.concept.body}</p>
                    </div>
                  )}
                </div>
              )}

              {/* 選択肢 */}
              {phase === 'question' && (
                <>
                  {q.type === 'multiple_choice' && <MultipleChoiceCard key={qIdx} q={q as MultipleChoiceQuestion} onAnswer={handleAnswer} />}
                  {q.type === 'true_false' && <TrueFalseCard key={qIdx} q={q as TrueFalseQuestion} onAnswer={handleAnswer} />}
                  {q.type === 'ordering' && <OrderingCard key={qIdx} q={q as OrderingQuestion} onAnswer={handleAnswer} />}
                  {q.type === 'fill_blank' && <FillBlankCard key={qIdx} q={q as FillBlankQuestion} onAnswer={handleAnswer} />}
                </>
              )}

              {/* フィードバック + 解説 */}
              {phase === 'feedback' && (
                <div className="space-y-4 animate-slide-up">
                  <div
                    className={`rounded-2xl border px-5 py-4 ${
                      copy.tone === 'good'
                        ? 'bg-green-500/10 border-green-500/30'
                        : copy.tone === 'warn'
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <p className={`font-black text-sm mb-2 ${
                      copy.tone === 'good' ? 'text-green-400' : copy.tone === 'warn' ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {item.review ? (lastCorrect ? '✓ 正解！' : '✗ 不正解') : copy.title}
                    </p>
                    {!item.review && copy.note && (
                      <p className="text-slate-400 text-xs leading-relaxed mb-2">{copy.note}</p>
                    )}
                    <p className="text-slate-300 text-sm leading-relaxed">{q.explanation}</p>
                  </div>

                  <button
                    onClick={next}
                    className="w-full py-3.5 rounded-2xl font-black text-white text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                    style={lastCorrect
                      ? { background: '#059669', boxShadow: '0 4px 0 #047857' }
                      : { background: '#4F46E5', boxShadow: '0 4px 0 #3730A3' }
                    }
                  >
                    {qIdx + 1 >= deck.length ? '結果を見る →' : '次の問題 →'}
                  </button>
                </div>
              )}
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
