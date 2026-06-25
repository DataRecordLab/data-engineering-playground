'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';

const PREREQ_SQL = [
  `CREATE OR REPLACE TABLE src_subscriptions AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('subscriptions.csv')`,
  `CREATE OR REPLACE TABLE src_users AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('users.csv')`,
  `CREATE OR REPLACE TABLE src_events AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('events.csv')`,
  `CREATE OR REPLACE TABLE stg_subscriptions AS SELECT sub_id, user_id, LOWER(TRIM(plan)) AS plan, TRY_CAST(mrr AS NUMERIC) AS mrr, LOWER(TRIM(status)) AS status, CAST(started_at AS DATE) AS started_at, CASE WHEN NULLIF(TRIM(cancelled_at), '') IS NULL THEN NULL ELSE CAST(cancelled_at AS DATE) END AS cancelled_at, _loaded_at FROM src_subscriptions`,
  `CREATE OR REPLACE TABLE stg_users AS SELECT user_id, company_name, industry, TRY_CAST(team_size AS INTEGER) AS team_size, country, CAST(registered_at AS DATE) AS registered_at FROM src_users`,
  `CREATE OR REPLACE TABLE dim_users AS SELECT ROW_NUMBER() OVER (ORDER BY user_id) AS user_key, user_id, company_name, industry, team_size, country, registered_at FROM stg_users`,
  `CREATE OR REPLACE TABLE fact_subscriptions AS SELECT s.sub_id, u.user_key, s.plan, s.mrr, s.status, s.started_at, s.cancelled_at, CASE WHEN s.cancelled_at IS NOT NULL THEN 'churned' ELSE 'active' END AS churn_status FROM stg_subscriptions s LEFT JOIN dim_users u ON s.user_id = u.user_id`,
];

interface ChurnRow { plan: string; total: number; churned: number; churn_rate: number; total_mrr: number; lost_mrr: number }

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function SaasMartStage({ dbReady, onComplete }: Props) {
  const [ready, setReady] = useState(false);
  const [factRowCount, setFactRowCount] = useState<number | null>(null);
  const [groupBy, setGroupBy] = useState<string | null>(null);
  const [measures, setMeasures] = useState<string[]>(['churn_rate']);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<ChurnRow[] | null>(null);
  const [answer, setAnswer] = useState('');
  const [answered, setAnswered] = useState(false);
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      for (const sql of PREREQ_SQL) {
        try { await runSQL(sql); } catch { /* already exists */ }
      }
      const res = await querySQL('SELECT COUNT(*) AS cnt FROM fact_subscriptions');
      if (!res.error && res.rows[0]) setFactRowCount(Number(res.rows[0].cnt));
      setReady(true);
    })();
  }, [dbReady]);

  const canAnalyze = groupBy !== null && measures.length > 0;

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

    const groupCol = groupBy === 'plan' ? 'plan'
      : groupBy === 'industry' ? 'u2.industry'
      : 'CASE WHEN team_size <= 10 THEN "small (1-10)" WHEN team_size <= 100 THEN "mid (11-100)" ELSE "large (100+)" END';

    const sql = `
      CREATE OR REPLACE TABLE mart_churn_by_plan AS
      SELECT
        ${groupCol} AS plan,
        COUNT(*) AS total,
        SUM(CASE WHEN churn_status = 'churned' THEN 1 ELSE 0 END) AS churned,
        ROUND(SUM(CASE WHEN churn_status = 'churned' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS churn_rate,
        SUM(mrr) AS total_mrr,
        SUM(CASE WHEN churn_status = 'churned' THEN mrr ELSE 0 END) AS lost_mrr
      FROM fact_subscriptions f
      LEFT JOIN dim_users u2 ON f.user_key = u2.user_key
      GROUP BY 1
      ORDER BY churn_rate DESC
    `;

    try {
      await runSQL(sql);
      const res = await querySQL('SELECT * FROM mart_churn_by_plan');
      if (!res.error) {
        setResults(res.rows.map(r => ({
          plan: String(r.plan ?? ''),
          total: Number(r.total ?? 0),
          churned: Number(r.churned ?? 0),
          churn_rate: Number(r.churn_rate ?? 0),
          total_mrr: Number(r.total_mrr ?? 0),
          lost_mrr: Number(r.lost_mrr ?? 0),
        })));
      }
    } catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  }

  function handleAnswer() {
    if (!results || !answer) return;
    const highestChurnPlan = results[0]?.plan;
    if (answer === highestChurnPlan) {
      setAnswered(true);
      setTimeout(onComplete, 1500);
    } else {
      setWrong(true);
    }
  }

  if (!ready) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2"><span className="animate-spin">⟳</span>準備中...</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-6">

        {factRowCount !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 text-xs text-emerald-400">
            <span className="font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded text-[11px]">fact_subscriptions</span>
            <span className="text-slate-600">から</span>
            <span className="font-bold text-emerald-300">{factRowCount}件</span>
            <span className="text-slate-600">を受け取り → チャーン率KPIを算出します</span>
          </div>
        )}

        <div className="px-5 py-4 rounded-xl border border-purple-500/30 bg-purple-500/10">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wider mb-2">佐藤さん（CPO）からの質問</p>
          <p className="text-white text-lg font-bold leading-snug">
            「どのプランで最も解約が発生していますか？<br/>
            <span className="text-purple-300">取締役会でチャーン対策を発表したい。」</span>
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-white text-sm font-semibold">チャーン分析テーブルを設計してください</p>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">集計軸（GROUP BY）</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'plan', label: 'プラン別' },
                { id: 'industry', label: '業界別' },
                { id: 'size', label: '会社規模別' },
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
            {groupBy && groupBy !== 'plan' && (
              <p className="text-amber-400 text-xs mt-1.5">「プランごとのチャーン率」を把握するにはプラン別集計が有効です。ただし業界・規模でも確認してみましょう。</p>
            )}
          </div>

          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">表示する指標（複数選択可）</p>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'churn_rate', label: 'チャーン率（%）' },
                { id: 'lost_mrr', label: '失ったMRR（¥）' },
                { id: 'total', label: '総件数' },
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

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze || analyzing}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {analyzing ? <><span className="animate-spin inline-block">⟳</span>分析中...</> : '▶ チャーン分析する'}
          </button>
        </div>

        {results && (
          <div className="space-y-4">
            <p className="text-white text-sm font-semibold">チャーン分析結果</p>
            <div className="overflow-x-auto rounded-xl border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700">
                    <th className="px-4 py-2.5 text-left text-slate-400 font-medium text-xs">プラン/軸</th>
                    <th className="px-4 py-2.5 text-right text-slate-400 font-medium text-xs">チャーン率</th>
                    {measures.includes('lost_mrr') && <th className="px-4 py-2.5 text-right text-slate-400 font-medium text-xs">失ったMRR</th>}
                    {measures.includes('total') && <th className="px-4 py-2.5 text-right text-slate-400 font-medium text-xs">件数</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {results.map((row, i) => (
                    <tr key={row.plan} className={i === 0 ? 'bg-red-500/10' : i === results.length - 1 ? 'bg-green-500/5' : 'bg-slate-950/40'}>
                      <td className="px-4 py-2.5 text-white flex items-center gap-2">
                        {row.plan}
                        {i === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 font-medium">最高チャーン</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-rose-300">{row.churn_rate}%</td>
                      {measures.includes('lost_mrr') && <td className="px-4 py-2.5 text-right font-mono text-slate-300">¥{row.lost_mrr.toLocaleString()}</td>}
                      {measures.includes('total') && <td className="px-4 py-2.5 text-right font-mono text-slate-400">{row.total}件</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!answered && (
              <div className="px-4 py-4 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
                <p className="text-white text-sm font-medium">佐藤さんへの報告：最もチャーン率が高いプランは？</p>
                <div className="flex gap-2 flex-wrap">
                  {results.map(r => (
                    <button
                      key={r.plan}
                      onClick={() => { setAnswer(r.plan); setWrong(false); }}
                      className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                        answer === r.plan
                          ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {r.plan}
                    </button>
                  ))}
                </div>
                {wrong && <p className="text-red-400 text-xs">データをよく見てください。どのプランのチャーン率が最も高いですか？</p>}
                <button
                  onClick={handleAnswer}
                  disabled={!answer}
                  className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  佐藤さんに報告する →
                </button>
              </div>
            )}

            {answered && (
              <div className="px-4 py-4 rounded-xl border border-green-500/30 bg-green-500/10">
                <p className="text-green-300 font-semibold mb-1">✓ 正解！クエスト完了！</p>
                <p className="text-slate-300 text-sm">
                  {results[0]?.plan} プランのチャーン率が最も高く ({results[0]?.churn_rate}%)、
                  失ったMRRは ¥{results[0]?.lost_mrr.toLocaleString()} でした。<br/>
                  データパイプラインにより、CloudStack は初めてプラン別チャーンを定量的に把握できました。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
