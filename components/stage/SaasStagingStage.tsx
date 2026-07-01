'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';
import { ReflectionQuestion } from './ReflectionQuestion';
import { PipelineAlert, type PipelineAlertData } from './PipelineAlert';
import { useGameStore } from '@/lib/store/gameStore';

const SAAS_STAGING_REFLECTION = {
  question: 'Staging Layer で cancelled_at の空文字を NULL に統一する最大の理由は何ですか？',
  options: [
    {
      label: 'DuckDB が空文字を正しく扱えないから',
      correct: false,
      explanation: 'DuckDB は空文字を扱えます。問題は技術制約ではなく、「ビジネスロジックの正確性」です。',
    },
    {
      label: 'NULL と空文字を混在させると「解約者かどうか」の判定ロジックが壊れ、下流の全チャーン分析が狂うから',
      correct: true,
      explanation: '✓ 正解！"cancelled_at IS NULL" というシンプルなフィルタが正しく動くのは NULL が統一されているから。空文字が混在すると解約者が「アクティブ」と誤判定されます。Staging での統一が全てを守ります。',
    },
    {
      label: 'NULL の方がストレージが少なくて済むから',
      correct: false,
      explanation: 'ストレージの最適化が目的ではありません。NULL/空文字の混在が「ビジネス判断を狂わせる」ことを防ぐためです。',
    },
  ],
};

// Intentionally dirty source: mrr forced to VARCHAR, cancelled_at has empty strings mixed with NULLs
const SOURCE_SQL = [
  `CREATE OR REPLACE TABLE src_subscriptions AS
   SELECT sub_id, user_id,
     CASE sub_id WHEN 'S-001' THEN 'starter' WHEN 'S-002' THEN 'Starter' WHEN 'S-003' THEN 'PRO' ELSE plan END AS plan,
     CAST(mrr AS VARCHAR) AS mrr,
     status, started_at,
     CASE sub_id WHEN 'S-003' THEN '' WHEN 'S-005' THEN '' WHEN 'S-008' THEN '' ELSE cancelled_at END AS cancelled_at,
     CURRENT_TIMESTAMP AS _loaded_at
   FROM read_csv_auto('subscriptions.csv')`,
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

const SAAS_STAGING_ALERT: PipelineAlertData = {
  level: 'critical',
  table: 'src_subscriptions',
  title: 'sub_id に重複レコードを検知',
  situation: 'src_subscriptions テーブルに同一の sub_id を持つ重複レコードが複数件存在しています。このまま Staging に流すと、チャーン率の集計が二重カウントされます。',
  metrics: [
    { label: '影響 sub_id', value: 'S-005, S-008', isAnomaly: true },
    { label: '重複数', value: '各 3 件（合計 6 件の重複）', isAnomaly: true },
    { label: 'チャーン率への影響', value: '過大計上のリスク', isAnomaly: true },
  ],
  cause: 'CloudStack の Webhook 連携で、同一サブスクリプションイベントが再試行処理により複数回送信されていました（Webhook の冪等性問題）。',
  question: 'この重複をどう処理しますか？',
  options: [
    {
      label: 'そのままにして、分析クエリ側で毎回重複を除外する',
      correct: false,
      wrongMessage: 'クエリのたびに重複除外処理を書く必要が生じ、下流の全クエリが複雑になります。Staging で一度解決しておくのが「下流を守る」Staging の責任です。',
    },
    {
      label: '重複している行を全件削除する',
      correct: false,
      wrongMessage: '重複を全て削除すると正しいレコードまで消えます。同じ sub_id の中から「最新のもの」を 1 件だけ残す必要があります。',
    },
    {
      label: 'ROW_NUMBER() で重複排除し、最新レコード（_loaded_at が最新）のみ保持する',
      correct: true,
    },
  ],
  correctExplanation: '✓ 正解！ROW_NUMBER() OVER (PARTITION BY sub_id ORDER BY _loaded_at DESC) = 1 で、同一 sub_id の中で最新の 1 件だけを残せます。これが Webhook 重複の標準的な対処法です。パイプラインの冪等性（何度実行しても同じ結果）を保つ設計が重要です。',
};

interface DiagOpt { id: string; label: string; correct: boolean; wrongMessage?: string }
interface FixOpt  { id: string; label: string; correct: boolean; wrongMessage?: string }

interface Decision {
  id: string;
  column: string;
  table: string;
  detectedType: string;
  nullPct: number;
  emptyPct?: number;
  samples: Array<{ value: string; hot: boolean }>;
  diagnosisQuestion: string;
  diagnosisOptions: DiagOpt[];
  diagnosisExplanation: string;
  fixQuestion: string;
  fixOptions: FixOpt[];
  fixExplanation: string;
  fixLabel: string;
  beforeAfter: Array<{ before: string; after: string }>;
}

const DECISIONS: Decision[] = [
  {
    id: 'cancelled_at_null',
    column: 'cancelled_at',
    table: 'src_subscriptions',
    detectedType: 'VARCHAR',
    nullPct: 28,
    emptyPct: 18,
    samples: [
      { value: '""（空文字）', hot: true },
      { value: 'NULL', hot: true },
      { value: '"2024-03-15"', hot: false },
      { value: '""', hot: true },
      { value: '"2024-05-20"', hot: false },
    ],
    diagnosisQuestion: 'src_subscriptions.cancelled_at 列を見てください。どのような問題がありますか？',
    diagnosisOptions: [
      { id: 'format', label: '日付フォーマットが統一されていない（YYYY/MM/DD と YYYY-MM-DD が混在）', correct: false, wrongMessage: '日付フォーマットは統一されています。NULL と空文字の混在に注目してください。' },
      { id: 'type', label: '型が間違っている（NUMERICのはず）', correct: false, wrongMessage: '日付なので VARCHAR や DATE が正しい型です。値の内容に注目してください。' },
      { id: 'null_empty', label: 'NULL と空文字（""）が混在しており、意味が揃っていない', correct: true },
      { id: 'ok', label: '問題なし', correct: false, wrongMessage: 'NULL と "" は DuckDB では別の値です。IS NULL で絞り込むと空文字のユーザーが漏れます。' },
    ],
    diagnosisExplanation: '✓ 正解！NULL と空文字 "" は DuckDB では別の値として扱われます。"cancelled_at IS NULL" で解約者を判定すると、空文字のユーザーが「アクティブ」と誤判定されてしまいます。',
    fixQuestion: 'cancelled_at の空文字をどう扱いますか？',
    fixOptions: [
      { id: 'now', label: '現在日付（NOW()）で埋める', correct: false, wrongMessage: '解約していないユーザーに解約日を入れると、全員が解約者になってしまいます。' },
      { id: 'nullif', label: 'NULLIF で空文字を NULL に変換して統一する', correct: true },
      { id: 'keep', label: 'そのまま空文字で保持する', correct: false, wrongMessage: '空文字のまま残すと "IS NULL" での絞り込みが機能しません。必ず NULL に統一してください。' },
    ],
    fixExplanation: '✓ 正解！NULLIF(TRIM(cancelled_at), \'\') で空文字を NULL に変換。これでアクティブユーザーは cancelled_at = NULL で正確に識別できます。',
    fixLabel: 'NULLIF で空文字 → NULL に統一',
    beforeAfter: [
      { before: '""（空文字）', after: 'NULL' },
      { before: '"2024-03-15"', after: '"2024-03-15"（変化なし）' },
      { before: 'NULL', after: 'NULL（変化なし）' },
    ],
  },
  {
    id: 'mrr_type',
    column: 'mrr',
    table: 'src_subscriptions',
    detectedType: 'VARCHAR',
    nullPct: 0,
    samples: [
      { value: '"9800"', hot: true },
      { value: '"2980"', hot: true },
      { value: '"29800"', hot: true },
      { value: '"9800"', hot: true },
      { value: '"2980"', hot: true },
    ],
    diagnosisQuestion: 'src_subscriptions.mrr 列を見てください。どのような問題がありますか？',
    diagnosisOptions: [
      { id: 'null', label: 'NULL が混入している', correct: false, wrongMessage: 'NULL は 0% です。型に注目してください。' },
      { id: 'format', label: '通貨記号（¥）が付いていて表記が統一されていない', correct: false, wrongMessage: '通貨記号は付いていません。型（VARCHAR）に注目してください。' },
      { id: 'ok', label: '問題なし', correct: false, wrongMessage: '"9800" はクォートで囲まれた文字列です。SUM(mrr) を実行するとエラーになります。' },
      { id: 'type', label: '数値のはずが文字列（VARCHAR）型になっている', correct: true },
    ],
    diagnosisExplanation: '✓ 正解！mrr は月次定期収益（Monthly Recurring Revenue）なので数値型が必要です。VARCHAR のまま SUM・AVG を実行するとエラーになり、チャーン分析が不可能になります。',
    fixQuestion: 'mrr をどう処理しますか？',
    fixOptions: [
      { id: 'keep', label: 'そのままにする', correct: false, wrongMessage: '文字列のまま SUM(mrr) を実行するとエラーになります。Mart で MRR 集計をするために必ず数値型にしてください。' },
      { id: 'cast', label: 'TRY_CAST で数値型（NUMERIC）に変換する', correct: true },
      { id: 'format', label: '¥ 記号を付けてフォーマットする', correct: false, wrongMessage: 'フォーマット（表示用変換）は Mart 層の仕事です。Staging では型変換のみ行います。' },
    ],
    fixExplanation: '✓ 正解！TRY_CAST(mrr AS NUMERIC) で安全に数値変換。変換できない値は NULL になります。',
    fixLabel: 'TRY_CAST で NUMERIC 型に変換',
    beforeAfter: [
      { before: '"9800"（文字列）', after: '9800（数値）' },
      { before: '"2980"（文字列）', after: '2980（数値）' },
      { before: '"29800"（文字列）', after: '29800（数値）' },
    ],
  },
  {
    id: 'plan_normalize',
    column: 'plan',
    table: 'src_subscriptions',
    detectedType: 'VARCHAR',
    nullPct: 0,
    samples: [
      { value: '"starter"', hot: false },
      { value: '"Starter"', hot: true },
      { value: '"PRO"', hot: true },
      { value: '"pro"', hot: false },
      { value: '"enterprise"', hot: false },
    ],
    diagnosisQuestion: 'src_subscriptions.plan 列を見てください。どのような問題がありますか？',
    diagnosisOptions: [
      { id: 'null', label: 'NULL が混入している', correct: false, wrongMessage: 'NULL は 0% です。値の内容を比較してください。' },
      { id: 'type', label: '型が間違っている', correct: false, wrongMessage: 'VARCHAR は正しい型です。同じプランの値を見比べてください。' },
      { id: 'format', label: '同じプラン名なのに大文字小文字がバラバラ（表記ゆれ）', correct: true },
      { id: 'ok', label: '問題なし', correct: false, wrongMessage: '"starter" と "Starter" は GROUP BY で別プランとして扱われます。チャーン率の計算が壊れます。' },
    ],
    diagnosisExplanation: '✓ 正解！"starter" と "Starter" と "PRO" と "pro" は同じプランのはず。バラバラのまま GROUP BY すると「starter プランのチャーン率」が正確に出せません。',
    fixQuestion: 'plan 名をどう統一しますか？',
    fixOptions: [
      { id: 'upper', label: '大文字に統一する', correct: false, wrongMessage: '技術的には動作しますが、業界慣習として小文字統一が標準的です。また TRIM（空白除去）も合わせて行う必要があります。' },
      { id: 'none', label: 'そのままにする', correct: false, wrongMessage: '"starter" と "Starter" が異なるプランとして集計されてしまいます。チャーン率がプラン別に出なくなります。' },
      { id: 'lower', label: '小文字に統一する（LOWER + TRIM）', correct: true },
    ],
    fixExplanation: '✓ 正解！LOWER(TRIM(plan)) で統一。これで "starter" に絞ったチャーン分析が正確になります。',
    fixLabel: '小文字統一（LOWER + TRIM）',
    beforeAfter: [
      { before: '"Starter"', after: '"starter"' },
      { before: '"PRO"', after: '"pro"' },
      { before: '"enterprise"', after: '"enterprise"（変化なし）' },
    ],
  },
];

type StagingPhase = 'try_raw' | 'broken' | 'fix' | 'compare';

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function SaasStagingStage({ dbReady, onComplete }: Props) {
  const loseHp = useGameStore(s => s.loseHp);
  const triggerJump = useGameStore(s => s.triggerJump);
  const [ready, setReady] = useState(false);
  const [sourceRowCount, setSourceRowCount] = useState<number | null>(null);

  const [stagingPhase, setStagingPhase] = useState<StagingPhase>('try_raw');
  const [runningRaw, setRunningRaw] = useState(false);
  const [fixedMrr, setFixedMrr] = useState<number | null>(null);

  const [step, setStep] = useState(0);
  const [columnPhase, setColumnPhase] = useState<'diagnose' | 'fix'>('diagnose');

  const [diagSelected, setDiagSelected] = useState<string | null>(null);
  const [diagAnswered, setDiagAnswered] = useState(false);

  const [fixSelected, setFixSelected] = useState<string | null>(null);
  const [fixAnswered, setFixAnswered] = useState(false);
  const [fixWrongMsg, setFixWrongMsg] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [alertResolved, setAlertResolved] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [applying, setApplying] = useState(false);

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

  function handleDiagSelect(optId: string) {
    if (diagAnswered) return;
    setDiagSelected(optId);
    const opt = current.diagnosisOptions.find(o => o.id === optId)!;
    if (opt.correct) { setDiagAnswered(true); triggerJump(); }
    else loseHp();
  }

  function handleFixSelect(optId: string) {
    if (fixAnswered) return;
    const opt = current.fixOptions.find(o => o.id === optId)!;
    setFixSelected(optId);
    if (opt.correct) {
      setFixWrongMsg(null);
      setFixAnswered(true);
      triggerJump();
      setAnswers(prev => ({ ...prev, [current.id]: true }));
    } else {
      setFixWrongMsg(opt.wrongMessage ?? '不正解です。もう一度考えてみてください。');
      loseHp();
    }
  }

  async function handleRunRaw() {
    setRunningRaw(true);
    // This will fail: SUM(VARCHAR) is not supported in DuckDB
    await querySQL(`SELECT plan, SUM(mrr) AS total_mrr, COUNT(*) AS subscribers FROM src_subscriptions WHERE cancelled_at IS NULL GROUP BY plan`);
    setRunningRaw(false);
    setStagingPhase('broken');
  }

  function goNext() {
    setStep(s => s + 1);
    setColumnPhase('diagnose');
    setDiagSelected(null);
    setDiagAnswered(false);
    setFixSelected(null);
    setFixAnswered(false);
    setFixWrongMsg(null);
  }

  async function handleApply() {
    setApplying(true);
    try {
      for (const sql of APPLY_SQL) { await runSQL(sql); }
      const res = await querySQL(`SELECT SUM(mrr) AS total FROM stg_subscriptions WHERE cancelled_at IS NULL`);
      if (!res.error && res.rows[0]) setFixedMrr(Number(res.rows[0].total));
      setStagingPhase('compare');
    } catch (e) { console.error(e); }
    finally { setApplying(false); }
  }

  if (!ready) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2"><span className="animate-spin">⟳</span>準備中...</div>;
  }

  // ── Phase: try_raw ────────────────────────────────────────────────────────
  if (stagingPhase === 'try_raw') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-5">
          {sourceRowCount !== null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/8 border border-indigo-500/15 text-xs text-indigo-400">
              <span className="font-mono bg-indigo-500/15 px-1.5 py-0.5 rounded text-[11px]">src_subscriptions</span>
              <span className="text-slate-600">に</span>
              <span className="font-bold text-indigo-300">{sourceRowCount}件</span>
              <span className="text-slate-600">のデータがあります</span>
            </div>
          )}

          <div className="px-5 py-4 rounded-xl border border-slate-700 bg-slate-800/40 space-y-2">
            <p className="text-white font-semibold">まず、そのまま動かしてみよう</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Staging をスキップして、生データの <span className="font-mono text-indigo-400">src_subscriptions</span> で
              プラン別 MRR（月次定期収益）を集計してみます。
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-700 p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3 font-medium">実行するSQL</p>
            <pre className="font-mono text-xs text-blue-300 leading-relaxed whitespace-pre">{`SELECT plan,
       SUM(mrr) AS total_mrr,
       COUNT(*) AS subscribers
FROM src_subscriptions
WHERE cancelled_at IS NULL
GROUP BY plan`}</pre>
          </div>

          <button
            onClick={handleRunRaw}
            disabled={runningRaw}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {runningRaw
              ? <><span className="animate-spin inline-block">⟳</span> 実行中...</>
              : '▶ 動かしてみる（Staging なし）'
            }
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: broken ─────────────────────────────────────────────────────────
  if (stagingPhase === 'broken') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-5">
          <div className="rounded-2xl border-2 border-red-500/50 overflow-hidden">
            <div className="px-5 py-3 bg-red-500/15 flex items-center gap-3">
              <span className="text-2xl animate-pulse">⛔</span>
              <div>
                <p className="text-red-400 font-bold text-xs uppercase tracking-widest">Pipeline Error — FATAL</p>
                <p className="font-mono text-xs text-red-300/70 mt-0.5">src_subscriptions → MRR 集計</p>
              </div>
            </div>
            <div className="p-5 bg-slate-950/60 space-y-4">
              <div className="font-mono text-xs rounded-xl bg-slate-900 border border-red-500/20 p-4 text-red-300 leading-relaxed">
                <span className="text-slate-500">{'>'} </span>SELECT plan, SUM(mrr) ...<br/>
                <span className="text-slate-500 mt-2 block">{'>'} </span>
                <span className="text-red-400">Binder Error:</span> No function matches<br/>
                {'  '}given name and argument types<br/>
                {'  '}<span className="text-red-300 font-semibold">&apos;sum(VARCHAR)&apos;</span><br/><br/>
                {'  '}Column : <span className="text-amber-300">mrr</span><br/>
                {'  '}Type   : <span className="text-red-400">VARCHAR</span>  ← 数値のはずが文字列！
              </div>

              <div className="space-y-2">
                <p className="text-white text-sm font-semibold">何が起きた？</p>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="text-red-400 flex-shrink-0 mt-0.5 font-bold">①</span>
                    <span>
                      <span className="font-mono text-amber-300">mrr</span>（月次定期収益）が
                      <span className="text-red-400 font-semibold"> VARCHAR型（文字列）</span> で保存されており、
                      SUM による収益集計が実行不可能
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-red-400 flex-shrink-0 mt-0.5 font-bold">②</span>
                    <span>
                      <span className="font-mono text-amber-300">cancelled_at</span> に NULL と空文字 <span className="font-mono text-amber-300">&quot;&quot;</span> が混在しており、
                      <span className="text-red-400 font-semibold"> IS NULL 判定が壊れている</span>（空文字の解約者がアクティブと誤判定）
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-red-400 flex-shrink-0 mt-0.5 font-bold">③</span>
                    <span>
                      <span className="font-mono text-amber-300">plan</span> 列が "starter" / "Starter" / "PRO" と
                      <span className="text-red-400 font-semibold"> 表記ゆれ</span>があり、プラン別集計が分裂する
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm leading-relaxed">
                💡 3つの問題が重なっています。一列ずつ調査して修正しましょう。
              </div>

              <button
                onClick={() => setStagingPhase('fix')}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors"
              >
                🔍 原因を調査・修正する →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase: compare ────────────────────────────────────────────────────────
  if (stagingPhase === 'compare') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-5">
          <p className="text-white font-semibold text-base">修正前後を比較してみよう</p>

          <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 overflow-hidden">
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">修正前 — src_subscriptions（生データ）</p>
            </div>
            <div className="p-4 space-y-2">
              <div className="font-mono text-xs text-red-300 bg-slate-900/60 rounded-lg p-3">
                Error: No function matches &apos;sum(VARCHAR)&apos;<br/>
                → MRR集計 <span className="font-bold">不可能</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">cancelled_at IS NULL</span>
                <span>判定が破損（空文字の解約者がアクティブに誤カウント）</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 overflow-hidden">
            <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/20">
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">修正後 — stg_subscriptions（クレンジング済み）</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">アクティブ MRR（月次合計）</span>
                <span className="font-mono text-green-300 font-bold text-base">
                  ¥{fixedMrr?.toLocaleString() ?? '...'} / mo
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">plan</span>
                <span>の種類: 3種類に統一（starter / pro / enterprise）✓</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">cancelled_at</span>
                <span>空文字 → NULL に統一、IS NULL 判定が正確に動作 ✓</span>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm leading-relaxed">
            <p className="text-indigo-300 font-semibold mb-1">Staging の役割がわかりましたか？</p>
            <p className="text-slate-300">
              型変換・NULL統一・表記ゆれ修正をここで一度やっておくことで、
              チャーン分析・MRR集計など全ての下流分析が正確になります。
              Staging がなければ、数字の基盤そのものが崩れます。
            </p>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
          >
            ✓ Staging 完了！次のステージへ →
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: fix — alert gate then summary ──────────────────────────────────
  if (allAnswered && step >= DECISIONS.length) {
    if (!alertResolved) {
      return (
        <div className="h-full overflow-y-auto">
          <div className="max-w-xl mx-auto p-6">
            <PipelineAlert data={SAAS_STAGING_ALERT} onResolve={() => setAlertResolved(true)} />
          </div>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-5">
          <div className="px-4 py-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <p className="text-green-400 font-medium mb-3">✓ 全ての問題を診断・修正方法を決定しました</p>
            <div className="space-y-2">
              {DECISIONS.map(d => (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span className="font-mono text-xs text-slate-400 w-28 flex-shrink-0">{d.column}</span>
                  <span className="text-slate-300">{d.fixLabel}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">変換プレビュー</p>
            {DECISIONS.map(d => (
              <div key={d.id} className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <p className="text-xs font-mono text-amber-400 mb-2">{d.table}.{d.column}</p>
                <div className="space-y-1">
                  {d.beforeAfter.map((row, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex-1">{row.before}</span>
                      <span className="text-slate-600">→</span>
                      <span className="font-mono text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded flex-1">{row.after}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-200">
            これらの修正を適用して <span className="font-mono text-amber-300">stg_subscriptions / stg_users / stg_events</span> を作成します。
          </div>

          {!showReflection && (
            <button
              onClick={() => setShowReflection(true)}
              className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors"
            >
              ▶ 修正を適用する
            </button>
          )}

          {showReflection && (
            <ReflectionQuestion
              question={SAAS_STAGING_REFLECTION.question}
              options={SAAS_STAGING_REFLECTION.options}
              onComplete={handleApply}
              completeLabel={applying ? '⟳ 適用中...' : '理解しました！Staging Layer を構築する →'}
            />
          )}
        </div>
      </div>
    );
  }

  // ── Step-through (column diagnose/fix) ────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 space-y-5">

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15 text-xs text-red-400">
          <span>⛔</span>
          <span>エラーの原因を調査中 —</span>
          <span className="font-semibold">列ごとに問題を診断・修正してください</span>
        </div>

        <div className="flex items-center gap-2">
          {DECISIONS.map((d, i) => (
            <div key={d.id} className={`h-1.5 flex-1 rounded-full transition-all ${
              answers[d.id] ? 'bg-amber-500' : i === step ? 'bg-slate-500' : 'bg-slate-800'
            }`} />
          ))}
          <span className="text-xs text-slate-500 ml-1 flex-shrink-0">列 {step + 1}/{DECISIONS.length}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            columnPhase === 'diagnose' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            {columnPhase === 'diagnose' ? '① 問題を診断する' : '② 修正方法を設計する'}
          </span>
        </div>

        {/* ── DIAGNOSE PHASE ── */}
        {columnPhase === 'diagnose' && (
          <>
            <div className="px-4 py-4 rounded-xl bg-slate-800/60 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">{current.table}</span>
                <span className="text-slate-600 text-xs">.</span>
                <span className="font-mono text-sm font-semibold text-white">{current.column}</span>
              </div>
              <div className="flex items-center gap-5 mb-4 text-xs flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">検出された型:</span>
                  <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{current.detectedType}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">NULL率:</span>
                  <span className={current.nullPct > 0 ? 'text-red-400 font-semibold' : 'text-slate-400'}>{current.nullPct}%</span>
                  {current.nullPct > 0 && (
                    <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${current.nullPct}%` }} />
                    </div>
                  )}
                </div>
                {current.emptyPct !== undefined && current.emptyPct > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500">空文字率:</span>
                    <span className="text-orange-400 font-semibold">{current.emptyPct}%</span>
                    <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${current.emptyPct}%` }} />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-2">サンプル値（赤 = 要注意）:</p>
                <div className="flex flex-wrap gap-1.5">
                  {current.samples.map((s, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded font-mono text-xs border ${
                      s.hot
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : 'bg-slate-700/60 text-slate-400 border-slate-600/40'
                    }`}>{s.value}</span>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <p className="text-white text-sm font-semibold mb-3">💭 {current.diagnosisQuestion}</p>
              <div className="space-y-2">
                {current.diagnosisOptions.map(opt => {
                  const isSel = diagSelected === opt.id;
                  const isCorrect = isSel && diagAnswered;
                  const isWrong = isSel && !diagAnswered;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleDiagSelect(opt.id)}
                      disabled={diagAnswered}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-200'
                        : isWrong ? 'bg-red-500/15 border-red-500/30 text-red-200'
                        : diagAnswered ? 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-default'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800 cursor-pointer'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {diagSelected && !diagAnswered && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {current.diagnosisOptions.find(o => o.id === diagSelected)?.wrongMessage ?? '不正解です。もう一度考えてみてください。'}
              </div>
            )}

            {diagAnswered && (
              <>
                <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
                  {current.diagnosisExplanation}
                </div>
                <button
                  onClick={() => setColumnPhase('fix')}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-colors"
                >
                  修正方法を設計する →
                </button>
              </>
            )}
          </>
        )}

        {/* ── FIX PHASE ── */}
        {columnPhase === 'fix' && (
          <>
            <div className="px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs text-slate-400 flex items-center gap-2">
              <span className="font-mono text-amber-400">{current.table}.{current.column}</span>
              <span className="text-slate-600">—</span>
              <span>問題を特定しました。修正方法を選んでください。</span>
            </div>

            <div>
              <p className="text-white text-sm font-semibold mb-3">{current.fixQuestion}</p>
              <div className="space-y-2">
                {current.fixOptions.map(opt => {
                  const isSel = fixSelected === opt.id;
                  const isCorrect = isSel && fixAnswered;
                  const isWrong = isSel && !fixAnswered;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleFixSelect(opt.id)}
                      disabled={fixAnswered}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        isCorrect ? 'bg-green-500/15 border-green-500/40 text-green-200'
                        : isWrong ? 'bg-red-500/15 border-red-500/30 text-red-200'
                        : fixAnswered ? 'bg-slate-800/40 border-slate-700/50 text-slate-500 cursor-default'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800 cursor-pointer'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {fixWrongMsg && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{fixWrongMsg}</div>
            )}
            {fixAnswered && (
              <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
                {current.fixExplanation}
              </div>
            )}

            {fixAnswered && (
              <button
                onClick={goNext}
                className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
              >
                {step < DECISIONS.length - 1 ? '次の列へ →' : '修正内容を確認する →'}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
