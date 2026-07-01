'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';
import { ReflectionQuestion } from './ReflectionQuestion';
import { PipelineAlert, type PipelineAlertData } from './PipelineAlert';
import { useGameStore } from '@/lib/store/gameStore';

const STAGING_REFLECTION = {
  question: 'Staging Layer でデータをクレンジングしてから下流に渡す最大の理由はどれですか？',
  options: [
    {
      label: 'SQL のクエリが速くなるから',
      correct: false,
      explanation: 'クエリ速度の最適化は Warehouse 層の役割です。Staging の目的はパフォーマンスではなくデータ品質の保証です。',
    },
    {
      label: '一箇所でクレンジングすることで、Warehouse・Mart など全ての下流テーブルが正確なデータを使えるようになるから',
      correct: true,
      explanation: '✓ 正解！もし Staging を飛ばして各 Mart ごとにクレンジングすると、同じロジックが何十箇所にも散らばります。Staging で一度だけ直せば「下流への汚染を防ぐ唯一のバリア」になります。',
    },
    {
      label: 'データ量を削減してストレージコストを下げるから',
      correct: false,
      explanation: 'Staging テーブルを作るとむしろデータは増えます。コスト削減が目的ではなく、「下流全体の品質保証」が目的です。',
    },
  ],
};

// Intentionally dirty source: amount forced to VARCHAR, status has mixed casing
const SOURCE_SQL = [
  `CREATE OR REPLACE TABLE src_orders AS
   SELECT order_id, user_id, product_id,
     CASE order_id
       WHEN 'ORD-003' THEN NULL
       WHEN 'ORD-007' THEN NULL
       WHEN 'ORD-015' THEN 'INVALID'
       ELSE CAST(amount AS VARCHAR)
     END AS amount,
     CASE order_id
       WHEN 'ORD-001' THEN 'Completed'
       WHEN 'ORD-002' THEN 'Completed'
       WHEN 'ORD-004' THEN 'COMPLETED'
       WHEN 'ORD-005' THEN 'COMPLETED'
       ELSE status
     END AS status,
     created_at,
     CURRENT_TIMESTAMP AS _loaded_at
   FROM read_csv_auto('orders.csv')`,
  `CREATE OR REPLACE TABLE src_users AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('users.csv')`,
  `CREATE OR REPLACE TABLE src_products AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('products.csv')`,
];

const APPLY_SQL = [
  `CREATE OR REPLACE TABLE stg_orders AS SELECT order_id, user_id, product_id, TRY_CAST(amount AS NUMERIC) AS amount, LOWER(TRIM(status)) AS status, CAST(created_at AS TIMESTAMP) AS created_at, CURRENT_TIMESTAMP AS _loaded_at FROM src_orders`,
  `CREATE OR REPLACE TABLE stg_users AS SELECT user_id, name, LOWER(TRIM(email)) AS email, CAST(registered_at AS DATE) AS registered_at FROM src_users`,
  `CREATE OR REPLACE TABLE stg_products AS SELECT product_id, name, LOWER(TRIM(category)) AS category, CAST(price AS NUMERIC) AS price FROM src_products`,
];

const EC_STAGING_ALERT: PipelineAlertData = {
  level: 'critical',
  table: 'stg_orders',
  title: 'amount 列の NULL 率が急増',
  situation: '昨夜のアプリデプロイ後、stg_orders の処理中に異常を検知しました。ShopNow の決済フローが改修された影響で、amount 列が正しく書き込まれないケースが発生しています。',
  metrics: [
    { label: 'amount NULL 率（通常）', value: '2%', isAnomaly: false },
    { label: 'amount NULL 率（現在）', value: '34%', isAnomaly: true },
    { label: '影響レコード数', value: '約 850 件', isAnomaly: true },
  ],
  cause: 'ShopNow の開発チームに確認したところ、決済フローのリファクタリング中に amount フィールドの書き込み処理が一時的にスキップされていたことが判明。',
  question: 'この状況、どう対応しますか？',
  options: [
    {
      label: 'NULL を 0 で埋めてパイプラインをそのまま続行する',
      correct: false,
      wrongMessage: 'NULL を 0 で埋めると「金額不明」と「金額 0 円」の区別ができなくなります。また根本原因（ソースの問題）が未解決のため、誤ったデータが下流の Mart まで到達します。',
    },
    { label: 'パイプラインを停止し、ソースの修正後に正しいデータで再実行する', correct: true },
    {
      label: 'NULL の行だけ除外して正常データだけ下流に流す',
      correct: false,
      wrongMessage: 'NULL 行を除外すると、その期間の注文 850 件が失われます。Mart での売上集計に欠損が生じ、CEO への報告数字が誤ります。',
    },
  ],
  correctExplanation: '✓ 正解！「疑わしいデータを下流に流さない」がデータパイプラインの鉄則です。ソースを修正してから再実行（バックフィル）すれば正確なデータが揃います。壊れたデータが Mart まで到達すると、ビジネス判断が狂います。',
};

interface DiagOpt { id: string; label: string; correct: boolean; wrongMessage?: string }
interface FixOpt  { id: string; label: string; correct: boolean; wrongMessage?: string }

interface Decision {
  id: string;
  column: string;
  table: string;
  detectedType: string;
  nullPct: number;
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
    id: 'amount_type',
    column: 'amount',
    table: 'src_orders',
    detectedType: 'VARCHAR',
    nullPct: 12,
    samples: [
      { value: '"1500"', hot: false },
      { value: '"3200"', hot: false },
      { value: 'NULL', hot: true },
      { value: '"INVALID"', hot: true },
      { value: '"980"', hot: false },
    ],
    diagnosisQuestion: 'src_orders.amount 列を見てください。エラーが出た原因は何ですか？',
    diagnosisOptions: [
      { id: 'format', label: '大文字小文字の表記が統一されていない', correct: false, wrongMessage: 'amount の問題は表記ゆれではありません。型と NULL に注目してください。' },
      { id: 'ref', label: '外部キーが参照先に存在しない', correct: false, wrongMessage: 'amount は参照キーではありません。型と NULL に注目してください。' },
      { id: 'type_null', label: '型が文字列（VARCHAR）で、NULLや誤入力が含まれている', correct: true },
      { id: 'ok', label: '問題なし', correct: false, wrongMessage: 'NULL や "INVALID" のような誤入力が含まれています。さっきエラーが出た原因はこれです。' },
    ],
    diagnosisExplanation: '✓ 正解！amount は数値のはずですが VARCHAR 型で保存されており、NULL・変換不能な誤入力も混在しています。これが SUM(amount) でエラーが出た原因です。',
    fixQuestion: 'amount をどう処理しますか？',
    fixOptions: [
      { id: 'zero', label: 'NULL を 0 に置き換えてから変換する', correct: false, wrongMessage: 'NULL を 0 に変えると「データなし」と「金額 0 円」が区別できなくなります。NULL は保持してください。' },
      { id: 'cast_null', label: 'NUMERIC 型に変換し、NULL はそのまま保持する', correct: true },
      { id: 'drop', label: 'NULL の行を削除する', correct: false, wrongMessage: 'Staging 層では行を削除しません。NULL も記録として残します。削除は Mart 層で必要な場合のみ。' },
    ],
    fixExplanation: '✓ 正解！TRY_CAST で変換できない値を安全に NULL として保持します。',
    fixLabel: 'NUMERIC型変換 + NULL保持（TRY_CAST）',
    beforeAfter: [
      { before: '"1500"', after: '1500' },
      { before: 'NULL', after: 'NULL' },
      { before: '"INVALID"', after: 'NULL（変換不能→NULL）' },
    ],
  },
  {
    id: 'status_casing',
    column: 'status',
    table: 'src_orders',
    detectedType: 'VARCHAR',
    nullPct: 0,
    samples: [
      { value: '"Completed"', hot: true },
      { value: '"completed"', hot: true },
      { value: '"COMPLETED"', hot: true },
      { value: '"Pending"', hot: false },
      { value: '"cancelled"', hot: false },
    ],
    diagnosisQuestion: 'src_orders.status 列を見てください。どのような問題がありますか？',
    diagnosisOptions: [
      { id: 'null', label: 'NULL が混入している', correct: false, wrongMessage: 'NULL は 0% です。サンプル値の内容を見てください。' },
      { id: 'type', label: '型が間違っている', correct: false, wrongMessage: 'VARCHAR は正しい型です。値の内容に注目してください。' },
      { id: 'ok', label: '問題なし', correct: false, wrongMessage: '"Completed" と "completed" と "COMPLETED" は GROUP BY で 3 つの別値になります。' },
      { id: 'format', label: '同じ値なのに大文字小文字がバラバラで表記が統一されていない', correct: true },
    ],
    diagnosisExplanation: '✓ 正解！"Completed"/"completed"/"COMPLETED" は同じ意味なのに 3 種類として集計されてしまいます。下流の Mart でフィルタが壊れます。',
    fixQuestion: 'status の表記をどう統一しますか？',
    fixOptions: [
      { id: 'upper', label: '大文字に統一する（UPPER）', correct: false, wrongMessage: '技術的には動作しますが、業界慣習として小文字統一が標準です。また TRIM（空白除去）も必要です。' },
      { id: 'lower', label: '小文字に統一する（LOWER + TRIM）', correct: true },
      { id: 'none', label: 'そのままにする', correct: false, wrongMessage: 'バラバラのまま下流に流すと、Warehouse や Mart でのフィルタが全て壊れます。' },
    ],
    fixExplanation: '✓ 正解！LOWER(TRIM(status)) で空白除去と小文字統一を同時に行います。',
    fixLabel: '小文字統一（LOWER + TRIM）',
    beforeAfter: [
      { before: '"Completed"', after: '"completed"' },
      { before: '"COMPLETED"', after: '"completed"' },
      { before: '"Pending"', after: '"pending"' },
    ],
  },
  {
    id: 'email_casing',
    column: 'email',
    table: 'src_users',
    detectedType: 'VARCHAR',
    nullPct: 0,
    samples: [
      { value: 'tanaka@example.com', hot: false },
      { value: 'SATO@EXAMPLE.COM', hot: true },
      { value: 'YAMAMOTO@EXAMPLE.COM', hot: true },
      { value: 'ito@example.com', hot: false },
    ],
    diagnosisQuestion: 'src_users.email 列を見てください。どのような問題がありますか？',
    diagnosisOptions: [
      { id: 'null', label: 'NULL が混入している', correct: false, wrongMessage: 'NULL は 0% です。値の文字を見てください。' },
      { id: 'ref', label: '外部キーが存在しない', correct: false, wrongMessage: 'email は外部キーではありません。値の内容に注目してください。' },
      { id: 'format', label: '大文字のメールアドレスが混在している（表記ゆれ）', correct: true },
      { id: 'ok', label: '問題なし', correct: false, wrongMessage: '"SATO@EXAMPLE.COM" は JOIN のキーとして "sato@example.com" と別人として扱われます。' },
    ],
    diagnosisExplanation: '✓ 正解！メールは JOIN のキーです。大文字が混在すると同一ユーザーを別人として扱い、分析結果が壊れます。',
    fixQuestion: 'email をどう処理しますか？',
    fixOptions: [
      { id: 'none', label: 'そのままにする', correct: false, wrongMessage: '大文字小文字の違いで JOIN が失敗し、同一人物が別人になります。' },
      { id: 'mask', label: '個人情報なのでマスキングする', correct: false, wrongMessage: 'マスキングは別の設計ポリシーです。Staging 層では正規化（統一）が優先タスクです。' },
      { id: 'lower', label: '小文字に統一する（LOWER + TRIM）', correct: true },
    ],
    fixExplanation: '✓ 正解！メールは必ず小文字統一します。LOWER(TRIM(email))。',
    fixLabel: '小文字統一（LOWER + TRIM）',
    beforeAfter: [
      { before: 'SATO@EXAMPLE.COM', after: 'sato@example.com' },
      { before: 'YAMAMOTO@EXAMPLE.COM', after: 'yamamoto@example.com' },
      { before: 'tanaka@example.com', after: 'tanaka@example.com（変化なし）' },
    ],
  },
  {
    id: 'category_casing',
    column: 'category',
    table: 'src_products',
    detectedType: 'VARCHAR',
    nullPct: 0,
    samples: [
      { value: '"Electronics"', hot: true },
      { value: '"electronics"', hot: true },
      { value: '"ELECTRONICS"', hot: true },
      { value: '"Fashion"', hot: false },
    ],
    diagnosisQuestion: 'src_products.category 列を見てください。どのような問題がありますか？',
    diagnosisOptions: [
      { id: 'null', label: 'NULL が混入している', correct: false, wrongMessage: 'NULL は 0% です。値の内容を比べてください。' },
      { id: 'format', label: '同じカテゴリなのに大文字小文字がバラバラ', correct: true },
      { id: 'type', label: '型が間違っている', correct: false, wrongMessage: 'VARCHAR は正しい型です。同じ行の値同士を見比べてください。' },
      { id: 'ok', label: '問題なし', correct: false, wrongMessage: '"Electronics" と "electronics" は同じカテゴリですが GROUP BY で 2 つに分かれます。' },
    ],
    diagnosisExplanation: '✓ 正解！3 つの表記は全て同じカテゴリのはず。統一しないとカテゴリ別売上が正確に集計できません。',
    fixQuestion: 'category をどう統一しますか？',
    fixOptions: [
      { id: 'none', label: 'そのままにする', correct: false, wrongMessage: '3 つの別カテゴリとして GROUP BY されてしまいます。' },
      { id: 'lower', label: '小文字に統一する', correct: true },
      { id: 'proper', label: '先頭だけ大文字にする（INITCAP）', correct: false, wrongMessage: '動作しますが、小文字統一の方が業界標準です。' },
    ],
    fixExplanation: '✓ 正解！これで全カテゴリが正しく集計されます。',
    fixLabel: '小文字統一（LOWER）',
    beforeAfter: [
      { before: '"Electronics"', after: '"electronics"' },
      { before: '"ELECTRONICS"', after: '"electronics"' },
      { before: '"Fashion"', after: '"fashion"' },
    ],
  },
];

type StagingPhase = 'try_raw' | 'broken' | 'fix' | 'compare';

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function StagingStage({ dbReady, onComplete }: Props) {
  const loseHp = useGameStore(s => s.loseHp);
  const triggerJump = useGameStore(s => s.triggerJump);
  const [ready, setReady] = useState(false);
  const [sourceRowCount, setSourceRowCount] = useState<number | null>(null);

  const [stagingPhase, setStagingPhase] = useState<StagingPhase>('try_raw');
  const [runningRaw, setRunningRaw] = useState(false);
  const [fixedRevenue, setFixedRevenue] = useState<number | null>(null);

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
      const res = await querySQL('SELECT COUNT(*) AS cnt FROM src_orders');
      if (!res.error && res.rows[0]) setSourceRowCount(Number(res.rows[0].cnt));
      setReady(true);
    })();
  }, [dbReady]);

  const allAnswered = DECISIONS.every(d => answers[d.id]);
  const current = DECISIONS[step];

  async function handleRunRaw() {
    setRunningRaw(true);
    // This will fail: SUM(VARCHAR) is not supported in DuckDB
    await querySQL(`SELECT status, SUM(amount) AS revenue, COUNT(*) AS cnt FROM src_orders GROUP BY status`);
    setRunningRaw(false);
    setStagingPhase('broken');
  }

  function handleDiagSelect(optId: string) {
    if (diagAnswered) return;
    setDiagSelected(optId);
    const correct = current.diagnosisOptions.find(o => o.id === optId)?.correct;
    if (correct) { setDiagAnswered(true); triggerJump(); }
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

  function goNext() {
    setStep(s => s + 1);
    setColumnPhase('diagnose');
    setDiagSelected(null); setDiagAnswered(false);
    setFixSelected(null); setFixAnswered(false); setFixWrongMsg(null);
  }

  async function handleApply() {
    setApplying(true);
    try {
      for (const sql of APPLY_SQL) { await runSQL(sql); }
      const res = await querySQL(`SELECT SUM(amount) AS revenue FROM stg_orders WHERE status = 'completed'`);
      if (!res.error && res.rows[0]) setFixedRevenue(Number(res.rows[0].revenue));
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
              <span className="font-mono bg-indigo-500/15 px-1.5 py-0.5 rounded text-[11px]">src_orders</span>
              <span className="text-slate-600">に</span>
              <span className="font-bold text-indigo-300">{sourceRowCount}件</span>
              <span className="text-slate-600">のデータがあります</span>
            </div>
          )}

          <div className="px-5 py-4 rounded-xl border border-slate-700 bg-slate-800/40 space-y-2">
            <p className="text-white font-semibold">まず、そのまま動かしてみよう</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              Staging をスキップして、生データ <span className="font-mono text-indigo-400">src_orders</span> を
              直接集計します。クレンジングなしで何が起きるか確かめてみましょう。
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-700 p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3 font-medium">実行するSQL</p>
            <pre className="font-mono text-xs text-blue-300 leading-relaxed whitespace-pre">{`SELECT status,
       SUM(amount) AS total_revenue,
       COUNT(*) AS cnt
FROM src_orders
GROUP BY status`}</pre>
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
                <p className="font-mono text-xs text-red-300/70 mt-0.5">src_orders → 集計処理</p>
              </div>
            </div>
            <div className="p-5 bg-slate-950/60 space-y-4">
              <div className="font-mono text-xs rounded-xl bg-slate-900 border border-red-500/20 p-4 text-red-300 leading-relaxed">
                <span className="text-slate-500">{'>'} </span>SELECT status, SUM(amount) ...<br/>
                <span className="text-slate-500 mt-2 block">{'>'} </span>
                <span className="text-red-400">Binder Error:</span> No function matches<br/>
                {'  '}given name and argument types<br/>
                {'  '}<span className="text-red-300 font-semibold">&apos;sum(VARCHAR)&apos;</span><br/><br/>
                {'  '}Column : <span className="text-amber-300">amount</span><br/>
                {'  '}Type   : <span className="text-red-400">VARCHAR</span>  ← 数値のはずが文字列！
              </div>

              <div className="space-y-2">
                <p className="text-white text-sm font-semibold">何が起きた？</p>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <span className="text-red-400 flex-shrink-0 mt-0.5 font-bold">①</span>
                    <span>
                      <span className="font-mono text-amber-300">amount</span> 列が
                      <span className="text-red-400 font-semibold"> VARCHAR型（文字列）</span> で保存されており、
                      SUM・AVG などの数値演算が実行できない
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-red-400 flex-shrink-0 mt-0.5 font-bold">②</span>
                    <span>
                      <span className="font-mono text-amber-300">status</span> 列は
                      <span className="text-red-400 font-semibold"> "completed" / "Completed" / "COMPLETED"</span> が混在しており、
                      GROUP BY すると同じ意味のデータが別の値として集計される
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm leading-relaxed">
                💡 これが本物のデータパイプラインで起きる失敗です。
                原因を一列ずつ調査して、修正方法を設計しましょう。
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

          {/* Before */}
          <div className="rounded-xl border-2 border-red-500/30 bg-red-500/5 overflow-hidden">
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20">
              <p className="text-red-400 text-xs font-semibold uppercase tracking-wider">修正前 — src_orders（生データ）</p>
            </div>
            <div className="p-4 space-y-2">
              <div className="font-mono text-xs text-red-300 bg-slate-900/60 rounded-lg p-3">
                Error: No function matches &apos;sum(VARCHAR)&apos;<br/>
                → 売上集計 <span className="font-bold">不可能</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">status</span>
                <span>の種類: 5種類以上（大文字小文字バラバラ）</span>
              </div>
            </div>
          </div>

          {/* After */}
          <div className="rounded-xl border-2 border-green-500/30 bg-green-500/5 overflow-hidden">
            <div className="px-4 py-2 bg-green-500/10 border-b border-green-500/20">
              <p className="text-green-400 text-xs font-semibold uppercase tracking-wider">修正後 — stg_orders（クレンジング済み）</p>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">確定売上（completed のみ）</span>
                <span className="font-mono text-green-300 font-bold text-base">
                  ¥{fixedRevenue?.toLocaleString() ?? '...'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">status</span>
                <span>の種類: 3種類（completed / pending / cancelled）✓</span>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-sm leading-relaxed">
            <p className="text-indigo-300 font-semibold mb-1">Staging の役割がわかりましたか？</p>
            <p className="text-slate-300">
              型変換・表記ゆれの統一をここで一度やっておくことで、
              Warehouse・Mart など全ての下流が正確なデータを使えるようになります。
              もし Staging を飛ばしたら——さっきのエラーのように——何も集計できません。
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

  // ── Phase: fix ────────────────────────────────────────────────────────────
  // Alert gate before summary
  if (allAnswered && step >= DECISIONS.length) {
    if (!alertResolved) {
      return (
        <div className="h-full overflow-y-auto">
          <div className="max-w-xl mx-auto p-6">
            <PipelineAlert data={EC_STAGING_ALERT} onResolve={() => setAlertResolved(true)} />
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
                  <span className="font-mono text-xs text-slate-400 w-24 flex-shrink-0">{d.column}</span>
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
            これらの修正を適用して <span className="font-mono text-amber-300">stg_orders / stg_users / stg_products</span> を作成します。
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
              question={STAGING_REFLECTION.question}
              options={STAGING_REFLECTION.options}
              onComplete={handleApply}
              completeLabel={applying ? '⟳ 適用中...' : '理解しました！Staging Layer を構築する →'}
            />
          )}
        </div>
      </div>
    );
  }

  // Column step-through
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 space-y-5">

        {/* Context: came from the broken screen */}
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
              <div className="flex items-center gap-5 mb-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">検出された型:</span>
                  <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">{current.detectedType}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">NULL率:</span>
                  <span className={current.nullPct > 0 ? 'text-red-400 font-semibold' : 'text-slate-400'}>
                    {current.nullPct}%
                  </span>
                  {current.nullPct > 0 && (
                    <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${current.nullPct}%` }} />
                    </div>
                  )}
                </div>
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
