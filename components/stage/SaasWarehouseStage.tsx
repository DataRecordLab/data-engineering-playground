'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';

const PREREQ_SQL = [
  `CREATE OR REPLACE TABLE src_subscriptions AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('subscriptions.csv')`,
  `CREATE OR REPLACE TABLE src_users AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('users.csv')`,
  `CREATE OR REPLACE TABLE src_events AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('events.csv')`,
  `CREATE OR REPLACE TABLE stg_subscriptions AS SELECT sub_id, user_id, LOWER(TRIM(plan)) AS plan, TRY_CAST(mrr AS NUMERIC) AS mrr, LOWER(TRIM(status)) AS status, CAST(started_at AS DATE) AS started_at, CASE WHEN NULLIF(TRIM(cancelled_at), '') IS NULL THEN NULL ELSE CAST(cancelled_at AS DATE) END AS cancelled_at, _loaded_at FROM src_subscriptions`,
  `CREATE OR REPLACE TABLE stg_users AS SELECT user_id, company_name, industry, TRY_CAST(team_size AS INTEGER) AS team_size, country, CAST(registered_at AS DATE) AS registered_at FROM src_users`,
  `CREATE OR REPLACE TABLE stg_events AS SELECT event_id, user_id, event_type, NULLIF(TRIM(feature), 'null') AS feature, CAST(occurred_at AS DATE) AS occurred_at FROM src_events`,
];

const WAREHOUSE_SQL = [
  `CREATE OR REPLACE TABLE dim_users AS SELECT ROW_NUMBER() OVER (ORDER BY user_id) AS user_key, user_id, company_name, industry, team_size, country, registered_at FROM stg_users`,
  `CREATE OR REPLACE TABLE fact_subscriptions AS SELECT s.sub_id, u.user_key, s.plan, s.mrr, s.status, s.started_at, s.cancelled_at, CASE WHEN s.cancelled_at IS NOT NULL THEN 'churned' ELSE 'active' END AS churn_status FROM stg_subscriptions s LEFT JOIN dim_users u ON s.user_id = u.user_id`,
];

interface ColQuestion {
  id: string;
  column: string;
  example: string;
  description: string;
  correctType: 'fact' | 'dim';
  explanation: string;
}

const QUESTIONS: ColQuestion[] = [
  { id: 'mrr', column: 'mrr（月次定期収益）', example: '9800, 2980, 29800', description: 'プランごとの月額料金', correctType: 'fact', explanation: 'MRRは数値・集計対象なので FACT へ。「いくら払っているか」という出来事の核心。' },
  { id: 'status', column: 'status（契約状態）', example: 'active, cancelled', description: '現在の契約状態', correctType: 'fact', explanation: 'サブスクリプションという「出来事」の状態は FACT に含めます。' },
  { id: 'cancelled_at', column: 'cancelled_at（解約日）', example: '2024-03-15, NULL', description: '解約した日付（NULLはアクティブ）', correctType: 'fact', explanation: 'サブスクリプションの出来事（解約）の日時なので FACT へ。' },
  { id: 'company_name', column: 'company_name（会社名）', example: 'TechFlow Inc, DataMind', description: '顧客企業の名前', correctType: 'dim', explanation: '顧客の属性（名前・業界）は dim_users へ。変化しにくい文脈情報。' },
  { id: 'industry', column: 'industry（業界）', example: 'SaaS, Analytics, Media', description: '顧客企業の業界', correctType: 'dim', explanation: 'チャーン分析の切り口（「SaaS企業は解約しやすい？」）= 属性 = DIM。' },
  { id: 'team_size', column: 'team_size（チーム規模）', example: '12, 50, 500', description: '顧客企業の従業員数', correctType: 'dim', explanation: 'ユーザーの属性情報（大企業か小企業か）は DIM へ。分析の切り口になります。' },
];

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function SaasWarehouseStage({ dbReady, onComplete }: Props) {
  const [ready, setReady] = useState(false);
  const [stagingRowCount, setStagingRowCount] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'fact' | 'dim' | null>>({});
  const [selected, setSelected] = useState<'fact' | 'dim' | null>(null);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      for (const sql of PREREQ_SQL) {
        try { await runSQL(sql); } catch { /* already exists */ }
      }
      const res = await querySQL('SELECT COUNT(*) AS cnt FROM stg_subscriptions');
      if (!res.error && res.rows[0]) setStagingRowCount(Number(res.rows[0].cnt));
      setReady(true);
    })();
  }, [dbReady]);

  const allAnswered = QUESTIONS.every(q => answers[q.id] != null);
  const current = QUESTIONS[step];
  const isAnswered = current ? answers[current.id] != null : false;

  function handleSelect(type: 'fact' | 'dim') {
    if (isAnswered) return;
    setSelected(type);
    if (type === current.correctType) {
      setWrongMsg(null);
      setAnswers(prev => ({ ...prev, [current.id]: type }));
    } else {
      setWrongMsg(`不正解です。${current.column} は ${current.correctType.toUpperCase()} に分類されます。`);
    }
  }

  async function handleBuild() {
    setBuilding(true);
    try {
      for (const sql of WAREHOUSE_SQL) { await runSQL(sql); }
      setDone(true);
      setTimeout(onComplete, 1200);
    } catch (e) { console.error(e); }
    finally { setBuilding(false); }
  }

  if (!ready) {
    return <div className="flex items-center justify-center h-full text-slate-500 text-sm gap-2"><span className="animate-spin">⟳</span>準備中...</div>;
  }

  if (allAnswered && step >= QUESTIONS.length) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          <p className="text-white font-semibold">設計したサブスクリプション スキーマ</p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'fact_subscriptions', color: '#6366f1', type: 'FACT', cols: ['sub_id', 'user_key (FK)', 'plan', 'mrr', 'status', 'started_at', 'cancelled_at', 'churn_status'] },
              { name: 'dim_users', color: '#10b981', type: 'DIM', cols: ['user_key (PK)', 'user_id', 'company_name', 'industry', 'team_size', 'country'] },
            ].map(table => (
              <div key={table.name} className="rounded-xl border p-4" style={{ borderColor: `${table.color}40`, background: `${table.color}08` }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${table.color}30`, color: table.color }}>{table.type}</span>
                  <p className="font-mono text-xs text-white font-semibold">{table.name}</p>
                </div>
                <div className="space-y-1">
                  {table.cols.map(col => (
                    <p key={col} className="font-mono text-[11px] text-slate-400">{col}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 text-xs leading-relaxed">
            churn_status 列（cancelled_at が NULL かどうかで自動判定）をファクトテーブルに持つことで、チャーン分析が簡単になります。
          </div>
          <button
            onClick={handleBuild}
            disabled={building || done}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            {done ? '✓ Warehouse Layer 完成！' : building ? <><span className="animate-spin inline-block">⟳</span>スキーマ構築中...</> : '▶ このスキーマで構築する'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 space-y-5">

        {stagingRowCount !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/15 text-xs text-amber-400">
            <span className="font-mono bg-amber-500/15 px-1.5 py-0.5 rounded text-[11px]">stg_subscriptions</span>
            <span className="text-slate-600">から</span>
            <span className="font-bold text-amber-300">{stagingRowCount}件</span>
            <span className="text-slate-600">を受け取り → FACT/DIM に分解します</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className={`h-1.5 flex-1 rounded-full transition-all ${
              answers[q.id] != null ? 'bg-emerald-500' : i === step ? 'bg-slate-500' : 'bg-slate-800'
            }`} />
          ))}
          <span className="text-xs text-slate-500 ml-1 flex-shrink-0">{step + 1}/{QUESTIONS.length}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-400 font-bold mb-1">FACT（ファクト）</p>
            <p className="text-slate-400">出来事・数値・外部キー<br/>例: MRR・解約日・ステータス</p>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 font-bold mb-1">DIM（ディメンション）</p>
            <p className="text-slate-400">属性・切り口情報<br/>例: 業界・会社規模・国</p>
          </div>
        </div>

        <div className="px-4 py-4 rounded-xl border border-slate-700 bg-slate-900/60">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">この列を分類してください</p>
          <p className="text-white font-bold text-lg mb-1 font-mono">{current.column}</p>
          <p className="text-slate-400 text-sm mb-2">{current.description}</p>
          <div className="flex gap-1.5 flex-wrap">
            {current.example.split(', ').map(ex => (
              <span key={ex} className="px-2 py-0.5 rounded font-mono text-xs bg-slate-800 text-slate-400 border border-slate-700">{ex}</span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(['fact', 'dim'] as const).map(type => {
            const isSel = selected === type;
            const isCorrect = isSel && type === current.correctType;
            const isWrong = isSel && type !== current.correctType;
            return (
              <button
                key={type}
                onClick={() => handleSelect(type)}
                disabled={isAnswered}
                className={`py-5 rounded-xl border-2 font-bold text-lg transition-all ${
                  isCorrect ? 'bg-green-500/20 border-green-500 text-green-300'
                  : isWrong ? 'bg-red-500/20 border-red-500 text-red-300'
                  : isAnswered ? 'bg-slate-800/30 border-slate-700/50 text-slate-600 cursor-default'
                  : type === 'fact'
                  ? 'bg-indigo-600/10 border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/20 hover:border-indigo-400 cursor-pointer'
                  : 'bg-amber-600/10 border-amber-500/40 text-amber-300 hover:bg-amber-600/20 hover:border-amber-400 cursor-pointer'
                }`}
              >
                {type.toUpperCase()}
              </button>
            );
          })}
        </div>

        {wrongMsg && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{wrongMsg}</div>
        )}
        {isAnswered && (
          <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
            ✓ 正解！{current.explanation}
          </div>
        )}

        {isAnswered && (
          <button
            onClick={() => { setSelected(null); setWrongMsg(null); setStep(s => s + 1); }}
            className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
          >
            {step < QUESTIONS.length - 1 ? '次の列へ →' : 'スキーマ設計を確認する →'}
          </button>
        )}
      </div>
    </div>
  );
}
