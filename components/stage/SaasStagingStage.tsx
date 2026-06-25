'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';

const SOURCE_SQL = [
  `CREATE OR REPLACE TABLE src_subscriptions AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('subscriptions.csv')`,
  `CREATE OR REPLACE TABLE src_users AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('users.csv')`,
  `CREATE OR REPLACE TABLE src_events AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('events.csv')`,
];

const APPLY_SQL = [
  `CREATE OR REPLACE TABLE stg_subscriptions AS
   SELECT
     sub_id,
     user_id,
     LOWER(TRIM(plan)) AS plan,
     TRY_CAST(mrr AS NUMERIC) AS mrr,
     LOWER(TRIM(status)) AS status,
     CAST(started_at AS DATE) AS started_at,
     CASE WHEN NULLIF(TRIM(cancelled_at), '') IS NULL THEN NULL
          ELSE CAST(cancelled_at AS DATE) END AS cancelled_at,
     _loaded_at
   FROM src_subscriptions`,
  `CREATE OR REPLACE TABLE stg_users AS
   SELECT user_id, company_name, industry, TRY_CAST(team_size AS INTEGER) AS team_size, country,
   CAST(registered_at AS DATE) AS registered_at FROM src_users`,
  `CREATE OR REPLACE TABLE stg_events AS
   SELECT event_id, user_id, event_type, NULLIF(TRIM(feature), 'null') AS feature,
   CAST(occurred_at AS DATE) AS occurred_at FROM src_events`,
];

interface Decision {
  id: string;
  issueTitle: string;
  issueDetail: string;
  badExamples: string[];
  question: string;
  options: Array<{ id: string; label: string; correct: boolean; wrongMessage?: string }>;
  correctExplanation: string;
}

const DECISIONS: Decision[] = [
  {
    id: 'cancelled_at_null',
    issueTitle: '💥 cancelled_at が空文字と NULL が混在',
    issueDetail: 'CSVから読み込むと、解約日がないユーザーは空文字（""）になっています。これをそのまま使うと、解約者かどうかの判定が壊れます。',
    badExamples: ['""（空文字）', 'NULL', '2024-03-15'],
    question: 'cancelled_at の空文字をどう扱いますか？',
    options: [
      { id: 'nullif', label: 'NULLIF で空文字を NULL に変換する', correct: true },
      { id: 'zero', label: "現在日付（NOW()）で埋める", correct: false, wrongMessage: '解約していないユーザーに解約日を入れると、全員が解約者になってしまいます。' },
      { id: 'keep', label: 'そのまま空文字で保持する', correct: false, wrongMessage: '空文字のまま残すと "cancelled_at IS NULL" での絞り込みが機能しません。必ず NULL に統一してください。' },
    ],
    correctExplanation: '✓ 正解！NULLIF(TRIM(cancelled_at), \'\') で空文字を NULL に変換します。これでアクティブユーザーは cancelled_at = NULL で識別できます。',
  },
  {
    id: 'mrr_type',
    issueTitle: '💥 mrr 列が文字列型',
    issueDetail: 'mrr（月次定期収益）はCSVでは文字列型として読み込まれます。SUM や AVG などのMRR集計計算ができません。',
    badExamples: ['"9800"', '"2980"', '"29800"'],
    question: 'mrr をどう処理しますか？',
    options: [
      { id: 'cast', label: 'TRY_CAST で数値型（NUMERIC）に変換する', correct: true },
      { id: 'keep', label: 'そのままにする', correct: false, wrongMessage: '文字列のまま SUM(mrr) を実行するとエラーになります。Mart で MRR を集計するために必ず数値型にしてください。' },
      { id: 'format', label: '¥記号を付けてフォーマットする', correct: false, wrongMessage: 'フォーマット（表示用変換）は Mart 層の仕事です。Staging では型変換のみ行います。' },
    ],
    correctExplanation: '✓ 正解！TRY_CAST(mrr AS NUMERIC) で安全に数値変換。変換できない値は NULL になります。',
  },
  {
    id: 'plan_normalize',
    issueTitle: '💥 plan の表記が大文字小文字混在の可能性',
    issueDetail: 'プラン名は "starter" / "pro" / "enterprise" の3種類のはずが、大文字小文字の揺れで意図せず別の値として扱われる可能性があります。',
    badExamples: ['starter', 'Starter', 'PRO', 'pro'],
    question: 'plan 名をどう統一しますか？',
    options: [
      { id: 'lower', label: '小文字に統一する（LOWER + TRIM）', correct: true },
      { id: 'upper', label: '大文字に統一する', correct: false, wrongMessage: '技術的には動作しますが、業界慣習として小文字統一が標準的です。また TRIM（空白除去）も合わせて行う必要があります。' },
      { id: 'none', label: 'そのままにする', correct: false, wrongMessage: '"starter" と "Starter" が異なるプランとして集計されてしまいます。チャーン率がプラン別に出なくなります。' },
    ],
    correctExplanation: '✓ 正解！LOWER(TRIM(plan)) で統一。これで "starter" に絞ったチャーン分析が正確になります。',
  },
];

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function SaasStagingStage({ dbReady, onComplete }: Props) {
  const [ready, setReady] = useState(false);
  const [sourceRowCount, setSourceRowCount] = useState<number | null>(null);
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
      const res = await querySQL('SELECT COUNT(*) AS cnt FROM src_subscriptions');
      if (!res.error && res.rows[0]) setSourceRowCount(Number(res.rows[0].cnt));
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

  if (allAnswered && step >= DECISIONS.length) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-5">
          <div className="px-4 py-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-400 font-medium mb-3">✓ 全ての問題を特定・解決方法を決定しました</p>
            <div className="space-y-2">
              {[
                ['cancelled_at', 'NULLIF で空文字→NULL変換'],
                ['mrr', 'TRY_CAST で NUMERIC型に変換'],
                ['plan', '小文字統一（LOWER + TRIM）'],
              ].map(([col, fix]) => (
                <div key={col} className="flex items-center gap-3 text-sm">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span className="font-mono text-xs text-slate-400 w-28 flex-shrink-0">{col}</span>
                  <span className="text-slate-300">{fix}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
            これらの修正を適用して <span className="font-mono text-amber-300">stg_subscriptions / stg_users / stg_events</span> を作成します。
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 space-y-5">

        {sourceRowCount !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/8 border border-indigo-500/15 text-xs text-indigo-400">
            <span className="font-mono bg-indigo-500/15 px-1.5 py-0.5 rounded text-[11px]">src_subscriptions</span>
            <span className="text-slate-600">から</span>
            <span className="font-bold text-indigo-300">{sourceRowCount}件</span>
            <span className="text-slate-600">のサブスクリプションを受け取りました</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {DECISIONS.map((d, i) => (
            <div key={d.id} className={`h-1.5 flex-1 rounded-full transition-all ${
              answers[d.id] ? 'bg-amber-500' : i === step ? 'bg-slate-500' : 'bg-slate-800'
            }`} />
          ))}
          <span className="text-xs text-slate-500 ml-1 flex-shrink-0">問題 {step + 1}/{DECISIONS.length}</span>
        </div>

        <div className="px-4 py-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-400 text-sm font-bold mb-2">{current.issueTitle}</p>
          <p className="text-slate-300 text-sm leading-relaxed mb-3">{current.issueDetail}</p>
          <div className="flex flex-wrap gap-1.5">
            {current.badExamples.map(ex => (
              <span key={ex} className="px-2 py-0.5 rounded font-mono text-xs bg-red-500/20 text-red-300 border border-red-500/20">{ex}</span>
            ))}
          </div>
        </div>

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

        {wrongMsg && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{wrongMsg}</div>
        )}
        {isAnswered && (
          <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
            {current.correctExplanation}
          </div>
        )}

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
