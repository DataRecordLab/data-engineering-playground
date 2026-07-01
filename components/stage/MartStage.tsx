'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';
import { ReflectionQuestion } from './ReflectionQuestion';
import { PipelineAlert, type PipelineAlertData } from './PipelineAlert';
import { useGameStore } from '@/lib/store/gameStore';

const MART_REFLECTION = {
  question: 'mart_sales_by_dow を作るとき、status = \'completed\' の注文だけを対象にしました。なぜキャンセルや保留中の注文を除外したのですか？',
  options: [
    {
      label: 'DuckDB が cancelled や pending の値を処理できないから',
      correct: false,
      explanation: 'DuckDB はすべての文字列値を処理できます。除外するのは技術的制約ではなく「正確なビジネスメトリクスを提供する」という設計判断です。',
    },
    {
      label: 'データ量を減らしてクエリを速くするため',
      correct: false,
      explanation: 'パフォーマンス改善は副次的効果にすぎません。主な理由は「ビジネスの定義に沿った正確な数字を出す」ことです。',
    },
    {
      label: 'キャンセルや保留中の金額を含めると実際より高い売上が算出され、誤った経営判断につながるから',
      correct: true,
      explanation: '✓ 正解！これが Mart 層における「ビジネスロジックの実装」です。CEO が「売上」と言うとき、それはキャンセル済み注文を含まない「確定した売上」を意味します。Mart 層でこの定義を一元化することで、全社で同じ「売上」の数字が使われるようになります。',
    },
  ],
};

const EC_MART_ALERT: PipelineAlertData = {
  level: 'warning',
  table: 'mart_sales_by_dow',
  title: 'データ更新が 3 日間停止',
  situation: '分析結果を経営会議に持っていく前に確認が必要です。mart_sales_by_dow の元データとなる src_orders への新規データ投入が 3 日間止まっています。このまま使うと古いデータで経営判断することになります。',
  metrics: [
    { label: '通常の更新頻度', value: '毎日 03:00', isAnomaly: false },
    { label: 'データ最終更新', value: '3日前', isAnomaly: true },
    { label: '欠損期間', value: '3日分（月〜水）', isAnomaly: true },
  ],
  cause: '上流の src_orders へのデータ投入バッチが停止していました。ShopNow のシステム連携チームに確認が必要です。',
  question: 'この状況、どう対応しますか？',
  options: [
    {
      label: '欠損していることを知りながら「最新データ」として会議でそのまま報告する',
      correct: false,
      wrongMessage: '古いデータを最新として使うと誤った意思決定につながります。データエンジニアの重要な責務は「このデータはいつのものか」を常に把握・報告することです。',
    },
    {
      label: '欠損 3 日分をスキップして、今日以降のデータのみで分析する',
      correct: false,
      wrongMessage: '3 日分が欠損したまま「今週の傾向」を分析すると、週次パターンの判断が歪みます。欠損データを「補完（バックフィル）」することが正解です。',
    },
    { label: 'データ連携チームに連絡し、欠損 3 日分をバックフィルしてもらった後に再集計する', correct: true },
  ],
  correctExplanation: '✓ 正解！データの「鮮度（Freshness）」は重要な品質指標です。欠損が発生したらソースから再投入（バックフィル）して穴を埋めます。会議では「データが 3 日古い」ことを明示し、バックフィル完了後に正しい数字で判断するのがデータエンジニアの正しい姿勢です。',
};

const PREREQ_SQL = [
  `CREATE OR REPLACE TABLE src_orders AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('orders.csv')`,
  `CREATE OR REPLACE TABLE src_users AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('users.csv')`,
  `CREATE OR REPLACE TABLE src_products AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('products.csv')`,
  `CREATE OR REPLACE TABLE stg_orders AS SELECT order_id, user_id, product_id, TRY_CAST(amount AS NUMERIC) AS amount, LOWER(TRIM(status)) AS status, CAST(created_at AS TIMESTAMP) AS created_at, CURRENT_TIMESTAMP AS _loaded_at FROM src_orders`,
  `CREATE OR REPLACE TABLE stg_users AS SELECT user_id, name, LOWER(TRIM(email)) AS email, CAST(registered_at AS DATE) AS registered_at FROM src_users`,
  `CREATE OR REPLACE TABLE stg_products AS SELECT product_id, name, LOWER(TRIM(category)) AS category, CAST(price AS NUMERIC) AS price FROM src_products`,
  `CREATE OR REPLACE TABLE dim_users AS SELECT ROW_NUMBER() OVER (ORDER BY user_id) AS user_key, user_id, name, email, registered_at FROM stg_users`,
  `CREATE OR REPLACE TABLE dim_products AS SELECT ROW_NUMBER() OVER (ORDER BY product_id) AS product_key, product_id, name, category, price FROM stg_products`,
  `CREATE OR REPLACE TABLE fact_orders AS SELECT o.order_id, u.user_key, p.product_key, o.amount, o.status, o.created_at FROM stg_orders o LEFT JOIN dim_users u ON o.user_id = u.user_id LEFT JOIN dim_products p ON o.product_id = p.product_id`,
];

type MartPhase = 'first_attempt' | 'ceo_shocked' | 'redesign';

interface DowRow { day_of_week: string; total_revenue: number; order_count: number }

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function MartStage({ dbReady, onComplete }: Props) {
  const loseHp = useGameStore(s => s.loseHp);
  const triggerJump = useGameStore(s => s.triggerJump);
  const [ready, setReady] = useState(false);
  const [factRowCount, setFactRowCount] = useState<number | null>(null);

  const [martPhase, setMartPhase] = useState<MartPhase>('first_attempt');
  const [runningFirst, setRunningFirst] = useState(false);
  const [wrongRevenue, setWrongRevenue] = useState<number | null>(null);

  // Redesign (correct) phase state
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [measures, setMeasures] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<DowRow[] | null>(null);
  const [alertResolved, setAlertResolved] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [answer, setAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      for (const sql of PREREQ_SQL) {
        try { await runSQL(sql); } catch { /* already exists */ }
      }
      const res = await querySQL('SELECT COUNT(*) AS cnt FROM fact_orders');
      if (!res.error && res.rows[0]) setFactRowCount(Number(res.rows[0].cnt));
      setReady(true);
    })();
  }, [dbReady]);

  async function handleFirstAttempt() {
    setRunningFirst(true);
    try {
      // Run all orders with no status filter — this gives an inflated number
      const res = await querySQL(`
        SELECT SUM(amount) AS total FROM fact_orders WHERE amount IS NOT NULL
      `);
      if (!res.error && res.rows[0]) {
        setWrongRevenue(Number(res.rows[0].total));
      }
      setMartPhase('ceo_shocked');
    } catch (e) { console.error(e); }
    finally { setRunningFirst(false); }
  }

  const canAnalyze = groupBy !== null && measures.length > 0 && filter !== null;

  function toggleMeasure(m: string) {
    setMeasures(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
    setResults(null);
  }

  async function handleAnalyze() {
    if (!canAnalyze) return;
    setAnalyzing(true);
    setResults(null);
    setAnswered(false);
    setWrong(false);

    const measureSql = [
      measures.includes('revenue') ? 'SUM(amount) AS total_revenue' : null,
      measures.includes('count') ? 'COUNT(*) AS order_count' : null,
    ].filter(Boolean).join(', ');

    const filterSql = filter === 'completed'
      ? "WHERE status = 'completed' AND amount IS NOT NULL"
      : 'WHERE amount IS NOT NULL';

    const sql = `
      CREATE OR REPLACE TABLE mart_sales_by_dow AS
      SELECT strftime('%A', created_at) AS day_of_week, ${measureSql}
      FROM fact_orders ${filterSql}
      GROUP BY day_of_week ORDER BY total_revenue ASC
    `;

    try {
      await runSQL(sql);
      const res = await querySQL('SELECT * FROM mart_sales_by_dow');
      if (!res.error) {
        setResults(res.rows.map(r => ({
          day_of_week: String(r.day_of_week ?? ''),
          total_revenue: Number(r.total_revenue ?? 0),
          order_count: Number(r.order_count ?? 0),
        })));
      }
    } catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  }

  function handleAnswer() {
    if (!results || !answer) return;
    if (answer === results[0]?.day_of_week) {
      setAnswered(true);
      triggerJump();
      setTimeout(onComplete, 1500);
    } else {
      setWrong(true);
      loseHp();
    }
  }

  if (!ready) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2"><span className="animate-spin">⟳</span>準備中...</div>;
  }

  const lowestDay = results?.[0]?.day_of_week;
  const highestDay = results?.[results.length - 1]?.day_of_week;

  // ── Phase: first_attempt ──────────────────────────────────────────────────
  if (martPhase === 'first_attempt') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {factRowCount !== null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-xs text-emerald-400">
              <span className="font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded text-[11px]">fact_orders</span>
              <span className="text-slate-600">に</span>
              <span className="font-bold text-emerald-300">{factRowCount}行</span>
              <span className="text-slate-600">のデータがあります</span>
            </div>
          )}

          {/* CEO pressure */}
          <div className="px-5 py-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
            <p className="text-xs text-purple-400 font-medium uppercase tracking-wider mb-2">田村さん（CEO）からのメッセージ</p>
            <p className="text-white text-lg font-bold leading-snug">
              「来週の経営会議まで時間がない！<br/>
              <span className="text-purple-300">まず売上の全体感を出してもらえますか？」</span>
            </p>
          </div>

          <div className="px-5 py-4 rounded-xl border border-slate-700 bg-slate-800/40 space-y-2">
            <p className="text-white font-semibold">急いで全注文を集計してみよう</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              まずは全ての注文データで売上を集計してみましょう。
              どんな数字が出るでしょうか？
            </p>
          </div>

          <div className="rounded-xl bg-slate-900 border border-slate-700 p-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-3 font-medium">実行するSQL（フィルターなし）</p>
            <pre className="font-mono text-xs text-blue-300 leading-relaxed whitespace-pre">{`SELECT SUM(amount) AS total_revenue
FROM fact_orders
WHERE amount IS NOT NULL
-- ← status フィルターなし（全注文対象）`}</pre>
          </div>

          <button
            onClick={handleFirstAttempt}
            disabled={runningFirst}
            className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {runningFirst
              ? <><span className="animate-spin inline-block">⟳</span> 集計中...</>
              : '▶ まず集計してみる'
            }
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: ceo_shocked ────────────────────────────────────────────────────
  if (martPhase === 'ceo_shocked') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          {/* Result that "looks fine" but is wrong */}
          <div className="px-5 py-4 rounded-xl border border-slate-700 bg-slate-800/40">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">集計結果（全注文対象）</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-mono font-bold text-white">
                ¥{wrongRevenue?.toLocaleString() ?? '...'}
              </span>
              <span className="text-xs px-2 py-1 rounded-lg bg-slate-700 text-slate-400">total_revenue</span>
            </div>
            <p className="text-slate-500 text-xs mt-2">全注文合計（completed + cancelled + pending）</p>
          </div>

          {/* CEO reaction */}
          <div className="rounded-2xl border-2 border-amber-500/40 overflow-hidden">
            <div className="px-5 py-3 bg-amber-500/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">田</div>
              <div>
                <p className="text-amber-400 text-xs font-semibold">田村さん（CEO）— 反応</p>
              </div>
            </div>
            <div className="p-5 bg-slate-950/60 space-y-3">
              <p className="text-white text-sm leading-relaxed">
                「ちょっと待って、この数字... 先月の売上より<span className="text-amber-400 font-bold">かなり高い</span>ですね。
                キャンセルされた注文も含まれていませんか？
                うちの経理とこの数字は<span className="text-red-400 font-bold">合わない</span>んですが。」
              </p>
              <p className="text-slate-400 text-sm">
                「確定した売上だけで集計し直してもらえますか？
                キャンセルや保留中の注文は<span className="text-amber-300">売上にカウントできません。</span>」
              </p>
            </div>
          </div>

          {/* What went wrong */}
          <div className="px-4 py-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2">
            <p className="text-red-400 text-sm font-semibold">何が問題だったか</p>
            <div className="space-y-1.5 text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-red-400 flex-shrink-0">→</span>
                <span><span className="font-mono text-amber-300">cancelled</span> と <span className="font-mono text-amber-300">pending</span> の注文も合計に含まれており、「確定売上」より高い数字になっている</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 flex-shrink-0">→</span>
                <span>ビジネス上の「売上」定義は <span className="font-mono text-amber-300">status = 'completed'</span> の注文のみ</span>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
            💡 集計フィルターの設計がビジネス判断の正確さを左右します。正しいKPIテーブルを設計し直しましょう。
          </div>

          <button
            onClick={() => setMartPhase('redesign')}
            className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors"
          >
            🔧 正しいKPIテーブルを設計し直す →
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: redesign ───────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {factRowCount !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-xs text-emerald-400">
            <span className="font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded text-[11px]">fact_orders</span>
            <span className="text-slate-600">から</span>
            <span className="font-bold text-emerald-300">{factRowCount}行</span>
            <span className="text-slate-600">を受け取り → KPI集計して</span>
            <span className="font-mono bg-rose-500/15 px-1.5 py-0.5 rounded text-[11px] text-rose-400">mart_sales_by_dow</span>
            <span className="text-slate-600">へ</span>
          </div>
        )}

        {/* Context from failure */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/15 text-xs text-amber-400">
          <span>⚠</span>
          <span>前回の集計はキャンセル分を含んでいた — 今度は</span>
          <span className="font-semibold">確定注文のみ</span>
          <span>で正しく設計する</span>
        </div>

        {/* Business question */}
        <div className="px-5 py-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wider mb-2">田村さん（CEO）からの質問</p>
          <p className="text-white text-lg font-bold leading-snug">
            「確定売上が最も落ちている曜日はいつですか？<br/>
            <span className="text-purple-300">来週の経営会議でその曜日向けの施策を発表したい。」</span>
          </p>
        </div>

        {/* KPI builder */}
        <div className="space-y-4">
          <p className="text-white text-sm font-semibold">KPI テーブルを正しく設計してください</p>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">集計軸（GROUP BY）</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'dow', label: '曜日' },
                { id: 'month', label: '月' },
                { id: 'category', label: '商品カテゴリ' },
                { id: 'user', label: 'ユーザー' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setGroupBy(opt.id); setResults(null); }}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    groupBy === opt.id
                      ? 'bg-rose-600/20 border-rose-500/40 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {groupBy && groupBy !== 'dow' && (
              <p className="text-amber-400 text-xs mt-1.5">「最も落ちている曜日」を知るには曜日で集計する必要があります。</p>
            )}
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">測定する値（複数選択可）</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'revenue', label: '売上合計（SUM）' },
                { id: 'count', label: '注文数（COUNT）' },
                { id: 'avg', label: '平均注文額（AVG）' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleMeasure(opt.id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    measures.includes(opt.id)
                      ? 'bg-blue-600/20 border-blue-500/40 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {measures.includes(opt.id) ? '✓ ' : ''}{opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">集計対象</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'completed', label: '完了した注文のみ' },
                { id: 'all', label: '全ての注文（キャンセル含む）' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setFilter(opt.id); setResults(null); }}
                  className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                    filter === opt.id
                      ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {filter === 'all' && (
              <p className="text-red-400 text-xs mt-1.5">⚠ 田村さんが「それじゃない」と言っていました。確定注文だけにしてください。</p>
            )}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {analyzing ? <><span className="animate-spin inline-block">⟳</span>分析中...</> : '▶ 分析する'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            {/* Comparison with wrong attempt */}
            {filter === 'completed' && wrongRevenue !== null && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
                <div className="px-4 py-2 border-b border-slate-700">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">修正前後の比較</p>
                </div>
                <div className="divide-y divide-slate-800">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-red-400 text-xs">⛔ 修正前</span>
                      <span className="text-xs text-slate-500">全注文（cancelled含む）</span>
                    </div>
                    <span className="font-mono text-sm text-red-400 line-through">¥{wrongRevenue?.toLocaleString()}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-xs">✓ 修正後</span>
                      <span className="text-xs text-slate-500">確定注文のみ（completed）</span>
                    </div>
                    <span className="font-mono text-sm text-green-400 font-semibold">
                      ¥{results.reduce((s, r) => s + r.total_revenue, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <p className="text-white text-sm font-semibold">曜日別売上（確定注文のみ）</p>
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700">
                    <th className="px-4 py-2.5 text-left text-slate-400 font-medium text-xs">曜日</th>
                    {measures.includes('revenue') && <th className="px-4 py-2.5 text-right text-slate-400 font-medium text-xs">売上合計</th>}
                    {measures.includes('count') && <th className="px-4 py-2.5 text-right text-slate-400 font-medium text-xs">注文数</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {results.map((row, i) => (
                    <tr key={row.day_of_week} className={`${i === 0 ? 'bg-red-500/10' : i === results.length - 1 ? 'bg-green-500/5' : 'bg-slate-950/40'}`}>
                      <td className="px-4 py-2.5 text-white flex items-center gap-2">
                        {row.day_of_week}
                        {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 font-medium">最低</span>}
                        {i === results.length - 1 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 font-medium">最高</span>}
                      </td>
                      {measures.includes('revenue') && (
                        <td className="px-4 py-2.5 text-right font-mono text-slate-200">¥{row.total_revenue?.toLocaleString()}</td>
                      )}
                      {measures.includes('count') && (
                        <td className="px-4 py-2.5 text-right font-mono text-slate-400">{row.order_count}件</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pipeline alert before reflection */}
            {!alertResolved && (
              <PipelineAlert data={EC_MART_ALERT} onResolve={() => setAlertResolved(true)} />
            )}

            {alertResolved && (
              <>
                {!showReflection && !answered && (
                  <button
                    onClick={() => setShowReflection(true)}
                    className="w-full py-3 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold transition-colors"
                  >
                    💭 この設計の「なぜ」を考える →
                  </button>
                )}

                {showReflection && !answered && (
                  <ReflectionQuestion
                    question={MART_REFLECTION.question}
                    options={MART_REFLECTION.options}
                    onComplete={() => setShowReflection(false)}
                    completeLabel="理解しました！田村さんに報告する →"
                  />
                )}

                {!showReflection && !answered && (
                  <div className="px-4 py-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
                    <p className="text-white text-sm font-medium">田村さんへの報告：最も売上が低い曜日は？</p>
                    <div className="flex gap-2 flex-wrap">
                      {results.map(r => (
                        <button
                          key={r.day_of_week}
                          onClick={() => { setAnswer(r.day_of_week); setWrong(false); }}
                          className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                            answer === r.day_of_week
                              ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          {r.day_of_week}
                        </button>
                      ))}
                    </div>
                    {wrong && <p className="text-red-400 text-xs">データをよく見てください。どの曜日が最も売上が低いですか？</p>}
                    <button
                      onClick={handleAnswer}
                      disabled={!answer}
                      className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                    >
                      田村さんに報告する →
                    </button>
                  </div>
                )}

                {answered && (
                  <div className="px-4 py-4 rounded-xl border border-green-500/30 bg-green-500/10">
                    <p className="text-green-300 font-semibold mb-1">✓ 正解！クエスト完了！</p>
                    <p className="text-slate-300 text-sm">
                      {lowestDay} の確定売上が最も低く、{highestDay} が最も高いことがわかりました。<br/>
                      データパイプラインにより、ShopNow は初めて正確な曜日別売上を把握できました。
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
