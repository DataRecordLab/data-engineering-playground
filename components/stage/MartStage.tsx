'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';

// ─── Prerequisites ────────────────────────────────────────────────────────────

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResultRow { day_of_week: string; total_revenue: number; order_count: number }

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function MartStage({ dbReady, onComplete }: Props) {
  const [ready, setReady] = useState(false);
  const [factRowCount, setFactRowCount] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [measures, setMeasures] = useState<string[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<ResultRow[] | null>(null);
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
        const rows = res.rows.map(r => ({
          day_of_week: String(r.day_of_week ?? ''),
          total_revenue: Number(r.total_revenue ?? 0),
          order_count: Number(r.order_count ?? 0),
        }));
        setResults(rows);
      }
    } catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  }

  function handleAnswer() {
    if (!results || !answer) return;
    const lowestDay = results[0]?.day_of_week;
    if (answer === lowestDay) {
      setAnswered(true);
      setTimeout(onComplete, 1500);
    } else {
      setWrong(true);
    }
  }

  if (!ready) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2"><span className="animate-spin">⟳</span>準備中...</div>;
  }

  const lowestDay = results?.[0]?.day_of_week;
  const highestDay = results?.[results.length - 1]?.day_of_week;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {/* Lineage banner */}
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

        {/* Business question */}
        <div className="px-5 py-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wider mb-2">田村さん（CEO）からの質問</p>
          <p className="text-white text-lg font-bold leading-snug">
            「売上が最も落ちている曜日はいつですか？<br/>
            <span className="text-purple-300">来週の経営会議でその曜日向けの施策を発表したい。」</span>
          </p>
        </div>

        {/* KPI builder */}
        <div className="space-y-4">
          <p className="text-white text-sm font-semibold">KPI テーブルを設計してください</p>

          {/* GROUP BY */}
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

          {/* MEASURES */}
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

          {/* FILTER */}
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
              <p className="text-amber-400 text-xs mt-1.5">売上の集計にキャンセル分を含めると正確な数字になりません。</p>
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
            <p className="text-white text-sm font-semibold">分析結果</p>
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

            {/* Business decision */}
            {!answered && (
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
                {wrong && (
                  <p className="text-red-400 text-xs">データをよく見てください。どの曜日が最も売上が低いですか？</p>
                )}
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
                  {lowestDay} の売上が最も低く、{highestDay} が最も高いことがわかりました。<br/>
                  データパイプラインにより、ShopNow は初めて曜日別の売上を把握できました。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
