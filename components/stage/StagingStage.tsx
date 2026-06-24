'use client';

import { useState, useEffect } from 'react';
import { runSQL } from '@/lib/duckdb/engine';

// ─── Prerequisite SQL ─────────────────────────────────────────────────────────

const SOURCE_SQL = [
  `CREATE OR REPLACE TABLE src_orders AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('orders.csv')`,
  `CREATE OR REPLACE TABLE src_users AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('users.csv')`,
  `CREATE OR REPLACE TABLE src_products AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('products.csv')`,
];

const APPLY_SQL = [
  `CREATE OR REPLACE TABLE stg_orders AS SELECT order_id, user_id, product_id, TRY_CAST(amount AS NUMERIC) AS amount, LOWER(TRIM(status)) AS status, CAST(created_at AS TIMESTAMP) AS created_at, CURRENT_TIMESTAMP AS _loaded_at FROM src_orders`,
  `CREATE OR REPLACE TABLE stg_users AS SELECT user_id, name, LOWER(TRIM(email)) AS email, CAST(registered_at AS DATE) AS registered_at FROM src_users`,
  `CREATE OR REPLACE TABLE stg_products AS SELECT product_id, name, LOWER(TRIM(category)) AS category, CAST(price AS NUMERIC) AS price FROM src_products`,
];

// ─── Decision Data ────────────────────────────────────────────────────────────

interface Option { id: string; label: string; correct: boolean; wrongMessage?: string }
interface Decision {
  id: string;
  issueTitle: string;
  issueDetail: string;
  badExamples: string[];
  question: string;
  options: Option[];
  correctExplanation: string;
}

const DECISIONS: Decision[] = [
  {
    id: 'amount_type',
    issueTitle: '💥 amount 列が文字列型で NULL が混入',
    issueDetail: 'amount は数値のはずですが VARCHAR として保存されており、NULL の行が存在します。このままでは SUM や AVG などの集計ができません。',
    badExamples: ['"1500"', '"3200"', 'NULL', '"COMPLETED"（誤入力）'],
    question: 'amount をどう扱いますか？',
    options: [
      { id: 'cast_null', label: 'NUMERIC 型に変換し、NULL はそのまま保持する', correct: true },
      { id: 'zero', label: 'NULL を 0 に置き換えてから変換する', correct: false, wrongMessage: 'NULL を 0 に変えると「データなし」と「金額 0 円」が区別できなくなります。NULL は保持してください。' },
      { id: 'drop', label: 'NULL の行を削除する', correct: false, wrongMessage: 'Staging 層では行を削除しません。NULL も記録として残します。削除は下流（Mart）で必要な場合のみ。' },
    ],
    correctExplanation: '✓ 正解！TRY_CAST を使うと変換できない値を安全に NULL として保持できます。',
  },
  {
    id: 'status_casing',
    issueTitle: '💥 status の表記がバラバラ',
    issueDetail: '同じ「完了」を意味するのに "Completed" / "completed" / "COMPLETED" が混在。このまま GROUP BY すると 3 種類の別データとして扱われ、集計が壊れます。',
    badExamples: ['Completed', 'completed', 'COMPLETED', 'Cancelled', 'Pending'],
    question: 'status の表記をどう統一しますか？',
    options: [
      { id: 'lower', label: '小文字に統一する（LOWER + TRIM）', correct: true },
      { id: 'upper', label: '大文字に統一する（UPPER）', correct: false, wrongMessage: '大文字統一も技術的には動作しますが、業界慣習として小文字統一が一般的です。また TRIM（空白除去）も忘れずに。' },
      { id: 'none', label: 'そのままにする', correct: false, wrongMessage: '表記がバラバラのまま下流に流すと、Warehouse や Mart でのフィルタリングが全て壊れます。' },
    ],
    correctExplanation: '✓ 正解！LOWER(TRIM(status)) で空白除去＋小文字統一を同時に行います。',
  },
  {
    id: 'email_casing',
    issueTitle: '💥 email に大文字混入',
    issueDetail: '"SATO@EXAMPLE.COM" のような大文字メールが存在します。メールアドレスを JOIN のキーに使う場合、大文字小文字の違いで同一ユーザーを認識できなくなります。',
    badExamples: ['tanaka@example.com', 'SATO@EXAMPLE.COM', 'YAMAMOTO@EXAMPLE.COM'],
    question: 'email をどう処理しますか？',
    options: [
      { id: 'lower', label: '小文字に統一する（LOWER + TRIM）', correct: true },
      { id: 'none', label: 'そのままにする', correct: false, wrongMessage: 'メールアドレスはユーザー照合のキーです。大文字小文字の違いで JOIN が失敗し、同一人物が別人になります。' },
      { id: 'mask', label: '個人情報なのでマスキングする', correct: false, wrongMessage: 'マスキングは別の設計ポリシーです。Staging 層では正規化（統一）が優先タスクです。' },
    ],
    correctExplanation: '✓ 正解！メールは必ず小文字統一します。',
  },
  {
    id: 'category_casing',
    issueTitle: '💥 category の表記がバラバラ',
    issueDetail: '"Electronics" / "electronics" / "ELECTRONICS" が混在。カテゴリ別の売上集計をすると、同じカテゴリが 3 つに分かれてしまいます。',
    badExamples: ['Electronics', 'electronics', 'ELECTRONICS'],
    question: 'category をどう統一しますか？',
    options: [
      { id: 'lower', label: '小文字に統一する', correct: true },
      { id: 'none', label: 'そのままにする', correct: false, wrongMessage: '3 つの別カテゴリとして GROUP BY されてしまいます。' },
      { id: 'proper', label: '先頭だけ大文字にする（INITCAP）', correct: false, wrongMessage: '動作しますが、小文字統一の方が業界標準です。' },
    ],
    correctExplanation: '✓ 正解！これで全カテゴリが正しく集計されます。',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function StagingStage({ dbReady, onComplete }: Props) {
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      for (const sql of SOURCE_SQL) {
        try { await runSQL(sql); } catch { /* already exists */ }
      }
      setReady(true);
    })();
  }, [dbReady]);

  const allAnswered = DECISIONS.every(d => answers[d.id]);
  const current = DECISIONS[step];
  const isAnswered = current ? !!answers[current.id] : false;

  function handleSelect(optId: string) {
    if (isAnswered) return;
    const opt = current.options.find(o => o.id === optId)!;
    setSelected(optId);
    if (opt.correct) {
      setWrongMsg(null);
      setAnswers(prev => ({ ...prev, [current.id]: true }));
    } else {
      setWrongMsg(opt.wrongMessage ?? '不正解です。もう一度考えてみてください。');
    }
  }

  async function handleApply() {
    setApplying(true);
    try {
      for (const sql of APPLY_SQL) { await runSQL(sql); }
      setDone(true);
      setTimeout(onComplete, 1200);
    } catch (e) { console.error(e); }
    finally { setApplying(false); }
  }

  if (!ready) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2"><span className="animate-spin">⟳</span>準備中...</div>;
  }

  // ── All answered → apply screen ──────────────────────────────────────────
  if (allAnswered && step >= DECISIONS.length) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-5">
          <div className="px-4 py-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-400 font-medium mb-3">✓ 全ての問題を特定・解決方法を決定しました</p>
            <div className="space-y-2">
              {[
                ['amount', 'NUMERIC型変換 + NULL保持'],
                ['status', '小文字統一（LOWER + TRIM）'],
                ['email', '小文字統一（LOWER + TRIM）'],
                ['category', '小文字統一（LOWER）'],
              ].map(([col, fix]) => (
                <div key={col} className="flex items-center gap-3 text-sm">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span className="font-mono text-xs text-slate-400 w-20 flex-shrink-0">{col}</span>
                  <span className="text-slate-300">{fix}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
            これらの修正を適用して <span className="font-mono text-amber-300">stg_orders / stg_users / stg_products</span> を作成します。
          </div>

          <button
            onClick={handleApply}
            disabled={applying || done}
            className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {done ? '✓ Staging Layer 完成！' : applying ? <><span className="animate-spin inline-block">⟳</span>適用中...</> : '▶ 修正を適用する'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step-through decisions ────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 space-y-5">

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          {DECISIONS.map((d, i) => (
            <div key={d.id} className={`h-1.5 flex-1 rounded-full transition-all ${
              answers[d.id] ? 'bg-amber-500' : i === step ? 'bg-slate-500' : 'bg-slate-800'
            }`} />
          ))}
          <span className="text-xs text-slate-500 ml-1 flex-shrink-0">問題 {step + 1}/{DECISIONS.length}</span>
        </div>

        {/* Issue */}
        <div className="px-4 py-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm font-bold mb-2">{current.issueTitle}</p>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">{current.issueDetail}</p>
          <div className="flex flex-wrap gap-1.5">
            {current.badExamples.map(ex => (
              <span key={ex} className="px-2 py-0.5 rounded font-mono text-xs bg-red-500/20 text-red-300 border border-red-500/20">{ex}</span>
            ))}
          </div>
        </div>

        {/* Question */}
        <div>
          <p className="text-white text-sm font-semibold mb-3">{current.question}</p>
          <div className="space-y-2">
            {current.options.map(opt => {
              const isSel = selected === opt.id;
              const isCorrect = isSel && opt.correct;
              const isWrong = isSel && !opt.correct;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(opt.id)}
                  disabled={isAnswered}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-200'
                    : isWrong ? 'bg-red-500/15 border-red-500/30 text-red-200'
                    : isAnswered ? 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-default'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feedback */}
        {wrongMsg && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {wrongMsg}
          </div>
        )}
        {isAnswered && (
          <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
            {current.correctExplanation}
          </div>
        )}

        {/* Navigation */}
        {isAnswered && (
          <button
            onClick={() => { setSelected(null); setWrongMsg(null); setStep(s => s + 1); }}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
          >
            {step < DECISIONS.length - 1 ? '次の問題へ →' : '修正内容を確認する →'}
          </button>
        )}
      </div>
    </div>
  );
}
