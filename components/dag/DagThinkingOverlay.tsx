'use client';

import { useState } from 'react';
import type { DagTask } from '@/lib/dag';
import { getExecutionWaves } from '@/lib/dag';

// ── Pre-run: Wave 1 quiz ───────────────────────────────────────────────────────

interface PreRunQuizProps {
  tasks: DagTask[];
  onCorrect: () => void;
}

export function DagPreRunQuiz({ tasks, onCorrect }: PreRunQuizProps) {
  const wave1Ids = new Set(tasks.filter(t => t.upstreams.length === 0).map(t => t.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [tanaka, setTanaka] = useState('');

  function toggle(id: string) {
    if (result) return;
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function check() {
    const isCorrect =
      selected.size === wave1Ids.size &&
      [...selected].every(id => wave1Ids.has(id));

    if (isCorrect) {
      setResult('correct');
      setTanaka('正解！依存関係のないタスク（extract系）が最初にまとめて並列実行されるんだ。これが "Wave 1" だよ。上流がないから待つ必要がない。この概念がDAGの核心。');
    } else {
      setResult('wrong');
      const correct = [...wave1Ids].join(', ');
      setTanaka(`惜しい。Wave 1 は "upstreams が空" のタスクだけ。正解は [${correct}]。他のタスクは上流タスクの完了を待つ必要があるから Wave 1 には入れない。`);
    }
  }

  const waves = getExecutionWaves(tasks);

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-[520px] rounded-2xl overflow-hidden" style={{ background: '#0b0e1a', border: '1px solid rgba(99,102,241,0.35)', boxShadow: '0 0 60px rgba(99,102,241,0.15), 0 24px 80px rgba(0,0,0,0.9)' }}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/60" style={{ background: 'rgba(99,102,241,0.07)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black text-indigo-400 bg-indigo-500/10 border border-indigo-500/20">実行前チェック</span>
          </div>
          <p className="text-white font-black text-base">Wave 1 を特定してください</p>
          <p className="text-slate-400 text-xs mt-1">このDAGで <strong className="text-indigo-300">最初に並列実行されるタスクグループ</strong> を全て選んでください</p>
        </div>

        {/* Task list */}
        <div className="px-6 py-4 grid grid-cols-2 gap-2">
          {tasks.filter(t => t.id !== 'notify').map(t => {
            const isChecked = selected.has(t.id);
            const isCorrectTask = wave1Ids.has(t.id);
            const showCorrect = result !== null;
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all duration-150"
                style={{
                  background: showCorrect
                    ? isCorrectTask ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.02)'
                    : isChecked ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                  border: showCorrect
                    ? isCorrectTask ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,255,255,0.06)'
                    : isChecked ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 text-[10px]"
                  style={{
                    background: showCorrect
                      ? isCorrectTask ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.04)'
                      : isChecked ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.05)',
                    border: showCorrect
                      ? isCorrectTask ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)'
                      : isChecked ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {showCorrect ? (isCorrectTask ? '✓' : '') : (isChecked ? '✓' : '')}
                </div>
                <div>
                  <p className="text-[11px] font-mono font-bold text-white">{t.label}</p>
                  <p className="text-[9px] text-slate-600">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tanaka feedback */}
        {tanaka && (
          <div className="mx-6 mb-4 rounded-xl p-3 flex gap-2.5" style={{ background: 'rgba(30,30,50,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#A5B4FC' }}>田</div>
            <p className="text-slate-300 text-xs leading-relaxed">{tanaka}</p>
          </div>
        )}

        {/* Wave preview (after answer) */}
        {result && (
          <div className="mx-6 mb-4 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-2">実行順序（Wave）</p>
            <div className="space-y-1">
              {waves.map((wave, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-600 w-12 flex-shrink-0">Wave {i + 1}</span>
                  <div className="flex flex-wrap gap-1">
                    {wave.map(t => (
                      <span key={t.id} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: i === 0 ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#A5B4FC' : '#64748b' }}>
                        {t.label}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-5 flex justify-end gap-2">
          {!result ? (
            <button
              onClick={check}
              disabled={selected.size === 0}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-40 disabled:scale-100"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
            >
              確認する →
            </button>
          ) : (
            <button
              onClick={onCorrect}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: result === 'correct' ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 20px rgba(34,197,94,0.25)' }}
            >
              {result === 'correct' ? '▶ DAGを実行する！' : '▶ 理解した、実行する →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Post-run: Bottleneck quiz ─────────────────────────────────────────────────

interface BottleneckQuizProps {
  tasks: DagTask[];
  onDone: () => void;
}

export function DagBottleneckQuiz({ tasks, onDone }: BottleneckQuizProps) {
  const sorted = [...tasks].sort((a, b) => b.duration - a.duration);
  const top3 = sorted.slice(0, 3);
  const bottleneck = sorted[0];

  const [selected, setSelected] = useState<string | null>(null);
  const [improvement, setImprovement] = useState<string | null>(null);
  const [tanaka, setTanaka] = useState('');

  const IMPROVEMENT_OPTIONS = [
    { id: 'index', label: 'JOINキーにインデックスを貼る', correct: true, explanation: '✓ 正解！ファクトテーブルのJOINは最も重いクエリの1つ。結合キーにインデックスがあると劇的に速くなる。' },
    { id: 'parallel', label: 'このタスクを2つに分割して並列実行する', correct: false, explanation: '分割には依存関係の再設計が必要で難易度が高い。まずインデックスと最適なJOIN順序の見直しから始めるのが実務での定石だよ。' },
    { id: 'skip', label: '毎日実行しないで週次にする', correct: false, explanation: '実行頻度を下げると分析の鮮度が下がる。ボトルネックは速度の問題だから、根本的な最適化が先だよ。' },
  ];

  function selectTask(id: string) {
    if (selected) return;
    setSelected(id);
    if (id === bottleneck.id) {
      setTanaka(`正解！${bottleneck.label}（${bottleneck.duration}ms）が最も重い。${bottleneck.description}だからね。では、これを改善するには何をする？`);
    } else {
      setTanaka(`惜しい。実は ${bottleneck.label}（${bottleneck.duration}ms）が最も重いタスクだよ。${bottleneck.description}を行うので、複数テーブルの処理が必要でコストが高い。改善策を考えてみよう。`);
    }
  }

  function selectImprovement(opt: typeof IMPROVEMENT_OPTIONS[0]) {
    if (improvement) return;
    setImprovement(opt.id);
    setTanaka(opt.explanation);
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="w-[500px] rounded-2xl overflow-hidden" style={{ background: '#0b0e1a', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 60px rgba(34,197,94,0.1), 0 24px 80px rgba(0,0,0,0.9)' }}>
        <div className="px-6 py-4 border-b border-slate-800/60" style={{ background: 'rgba(34,197,94,0.05)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">🎉 実行完了</span>
          </div>
          <p className="text-white font-black text-base">ボトルネック分析</p>
          <p className="text-slate-400 text-xs mt-1">実行ログから <strong className="text-emerald-300">最も時間がかかったタスク</strong> を特定してください</p>
        </div>

        <div className="px-6 py-4 space-y-2">
          {!selected ? (
            top3.map(t => (
              <button
                key={t.id}
                onClick={() => selectTask(t.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all hover:scale-[1.01]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="font-mono text-[11px] text-white font-bold flex-1 text-left">{t.label}</span>
                <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: `${(t.duration / sorted[0].duration) * 100}%` }} />
                </div>
                <span className="text-[10px] text-slate-500 w-12 text-right">{t.duration}ms</span>
              </button>
            ))
          ) : (
            <>
              {/* Show correct answer */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}>
                <span className="font-mono text-[11px] text-white font-bold flex-1">{bottleneck.label}</span>
                <span className="text-[10px] text-emerald-400 font-bold">{bottleneck.duration}ms — 最重タスク</span>
              </div>

              {!improvement && (
                <>
                  <p className="text-slate-500 text-[10px] uppercase tracking-wider pt-2">改善策を選んでください</p>
                  {IMPROVEMENT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => selectImprovement(opt)}
                      className="w-full text-left px-4 py-2.5 rounded-xl text-xs text-slate-300 transition-all"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {tanaka && (
          <div className="mx-6 mb-4 rounded-xl p-3 flex gap-2.5" style={{ background: 'rgba(30,30,50,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#A5B4FC' }}>田</div>
            <p className="text-slate-300 text-xs leading-relaxed">{tanaka}</p>
          </div>
        )}

        {improvement && (
          <div className="px-6 pb-5 flex justify-end">
            <button
              onClick={onDone}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }}
            >
              ✓ 了解！次のDAGへ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Failure scenario: decision A/B/C ─────────────────────────────────────────

interface FailureDecisionProps {
  failedTaskLabel: string;
  onDone: () => void;
}

const FAILURE_OPTIONS = [
  {
    key: 'A',
    label: '3回リトライ後、下流タスクをスキップ',
    description: '一時的なエラーに有効。データの欠損は発生するが今日の他のパイプラインへの影響を最小化',
    feedback: 'リトライは一時的な障害（ネットワーク瞬断・DBロック等）への定石だよ。ただし恒常的な障害にはリトライが無駄になる。失敗の性質を見極めることが大事。',
  },
  {
    key: 'B',
    label: '即座にアラートを送りパイプライン全体を停止',
    description: 'データ品質を最優先。下流に不完全なデータが流れることを防ぐが、今日の全分析が止まる',
    feedback: '品質優先の判断だね。金融・医療など「間違ったデータが意思決定に使われる」リスクが高い業界では正解。ただしビジネスへの影響も大きいから、SLA（復旧目標時間）の設定が必要だよ。',
  },
  {
    key: 'C',
    label: 'バックフィルフラグを立てて翌日に再実行',
    description: '欠損を記録して翌日補填。今日のアラートを避けられるが、分析チームへの一時的なデータ欠損の説明が必要',
    feedback: 'バックフィルは実務でよく使われるアプローチだよ。特に日次バッチなら「翌日に前日分も処理する」設計が一般的。ただし欠損の記録とステークホルダーへの通知は必須。',
  },
] as const;

export function DagFailureDecision({ failedTaskLabel, onDone }: FailureDecisionProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  function choose(opt: typeof FAILURE_OPTIONS[number]) {
    if (selected) return;
    setSelected(opt.key);
    setFeedback(opt.feedback);
  }

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }}>
      <div className="w-[480px] rounded-2xl overflow-hidden" style={{ background: '#0b0e1a', border: '1px solid rgba(239,68,68,0.35)', boxShadow: '0 0 60px rgba(239,68,68,0.1), 0 24px 80px rgba(0,0,0,0.9)' }}>
        <div className="px-6 py-4 border-b border-red-900/30" style={{ background: 'rgba(239,68,68,0.06)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] px-2 py-0.5 rounded-full font-black text-red-400 bg-red-500/10 border border-red-500/20">⚠️ タスク失敗</span>
          </div>
          <p className="text-white font-black text-base"><code className="text-red-400">{failedTaskLabel}</code> が失敗しました</p>
          <p className="text-slate-400 text-xs mt-1">下流タスクは待機中です。あなたはどう対処しますか？</p>
        </div>

        <div className="px-6 py-4 space-y-2.5">
          {FAILURE_OPTIONS.map(opt => {
            const isSelected = selected === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => choose(opt)}
                className="w-full text-left rounded-xl px-4 py-3 transition-all duration-150"
                style={{
                  background: isSelected ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.02)',
                  border: isSelected ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(255,255,255,0.06)',
                  transform: !selected ? undefined : undefined,
                  opacity: selected && !isSelected ? 0.4 : 1,
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black mt-0.5"
                    style={{ background: isSelected ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${isSelected ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'}`, color: isSelected ? '#FCA5A5' : '#94a3b8' }}>
                    {opt.key}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white leading-snug">{opt.label}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{opt.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className="mx-6 mb-4 rounded-xl p-3 flex gap-2.5" style={{ background: 'rgba(30,30,50,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0" style={{ background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#A5B4FC' }}>田</div>
            <p className="text-slate-300 text-xs leading-relaxed">{feedback}</p>
          </div>
        )}

        {selected && (
          <div className="px-6 pb-5 flex justify-end">
            <button
              onClick={onDone}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
            >
              了解！実行結果を見る →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
