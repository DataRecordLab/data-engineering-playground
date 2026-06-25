'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';
import { ReflectionQuestion } from './ReflectionQuestion';

const WAREHOUSE_REFLECTION = {
  question: 'fact_orders は user_name を直接持たず、user_key（外部キー）で dim_users に紐付けました。なぜこの設計にしたのですか？',
  options: [
    {
      label: 'ユーザー名が変更されたとき、dim_users だけ更新すれば fact_orders 全レコードに自動で反映されるから',
      correct: true,
      explanation: '✓ 正解！これがスタースキーマの核心メリットです。もし fact_orders に user_name を直接持っていたら、名前変更のたびに何千・何万行を UPDATE する必要があります。外部キーで参照することで、dim_users の 1 行だけ更新すれば済みます。',
    },
    {
      label: 'fact テーブルに文字列カラムを入れると SQL がエラーになるから',
      correct: false,
      explanation: '技術的な制約ではありません。fact テーブルに文字列を入れることは可能です。スタースキーマで外部キーを使う理由は「データの一元管理と更新の効率化」という設計上の選択です。',
    },
    {
      label: 'データ量を減らしてクエリを速くするため',
      correct: false,
      explanation: '部分的には正しいですが、それだけではありません。正規化の主な目的は「データの一貫性（整合性）を保つこと」です。名前が変わっても 1 箇所だけ更新すれば全体に反映されます。',
    },
  ],
};

// ─── Prerequisites ────────────────────────────────────────────────────────────

const PREREQ_SQL = [
  `CREATE OR REPLACE TABLE src_orders AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('orders.csv')`,
  `CREATE OR REPLACE TABLE src_users AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('users.csv')`,
  `CREATE OR REPLACE TABLE src_products AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('products.csv')`,
  `CREATE OR REPLACE TABLE stg_orders AS SELECT order_id, user_id, product_id, TRY_CAST(amount AS NUMERIC) AS amount, LOWER(TRIM(status)) AS status, CAST(created_at AS TIMESTAMP) AS created_at, CURRENT_TIMESTAMP AS _loaded_at FROM src_orders`,
  `CREATE OR REPLACE TABLE stg_users AS SELECT user_id, name, LOWER(TRIM(email)) AS email, CAST(registered_at AS DATE) AS registered_at FROM src_users`,
  `CREATE OR REPLACE TABLE stg_products AS SELECT product_id, name, LOWER(TRIM(category)) AS category, CAST(price AS NUMERIC) AS price FROM src_products`,
];

const WAREHOUSE_SQL = [
  `CREATE OR REPLACE TABLE dim_users AS SELECT ROW_NUMBER() OVER (ORDER BY user_id) AS user_key, user_id, name, email, registered_at FROM stg_users`,
  `CREATE OR REPLACE TABLE dim_products AS SELECT ROW_NUMBER() OVER (ORDER BY product_id) AS product_key, product_id, name, category, price FROM stg_products`,
  `CREATE OR REPLACE TABLE fact_orders AS SELECT o.order_id, u.user_key, p.product_key, o.amount, o.status, o.created_at FROM stg_orders o LEFT JOIN dim_users u ON o.user_id = u.user_id LEFT JOIN dim_products p ON o.product_id = p.product_id`,
];

// ─── Quiz Data ────────────────────────────────────────────────────────────────

interface ColQuestion {
  id: string;
  column: string;
  example: string;
  description: string;
  correctType: 'fact' | 'dim';
  explanation: string;
}

const QUESTIONS: ColQuestion[] = [
  { id: 'amount', column: 'amount（注文金額）', example: '1500, 3200, NULL', description: '注文ごとの金額', correctType: 'fact', explanation: '数値・集計対象になるものは FACT へ。これが「何が起きたか」の核心データです。' },
  { id: 'status', column: 'status（注文状態）', example: 'completed, cancelled', description: '注文ごとの状態', correctType: 'fact', explanation: '注文という「出来事」の状態も FACT に含めます。' },
  { id: 'user_id_fk', column: 'user_id（注文テーブル内）', example: 'U-1, U-2, U-3', description: 'orders テーブルにある外部キー', correctType: 'fact', explanation: 'FACT テーブルは外部キー（FK）を持ちます。名前・メールなどの属性は DIM テーブルに任せます。' },
  { id: 'user_name', column: 'name（ユーザー名）', example: '田中太郎, Sato Hanako', description: 'ユーザーの属性情報', correctType: 'dim', explanation: 'ユーザーの属性（名前・メール）は dim_users へ。変化しにくい「文脈情報」です。' },
  { id: 'category', column: 'category（商品カテゴリ）', example: 'electronics', description: '商品の属性情報', correctType: 'dim', explanation: '商品の属性は dim_products へ。注文の「文脈」を提供します。' },
  { id: 'price', column: 'price（商品の定価）', example: '1500, 800, 5600', description: '商品マスターの定価', correctType: 'dim', explanation: '商品マスターの定価は DIM の属性です。注文時の実際の金額（amount）は FACT 側にあります。' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function WarehouseStage({ dbReady, onComplete }: Props) {
  const [ready, setReady] = useState(false);
  const [stagingRowCount, setStagingRowCount] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'fact' | 'dim' | null>>({});
  const [selected, setSelected] = useState<'fact' | 'dim' | null>(null);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [building, setBuilding] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!dbReady) return;
    (async () => {
      for (const sql of PREREQ_SQL) {
        try { await runSQL(sql); } catch { /* already exists */ }
      }
      const res = await querySQL('SELECT COUNT(*) AS cnt FROM stg_orders');
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
      const correct = current.correctType === 'fact' ? 'FACT' : 'DIM';
      setWrongMsg(`不正解です。${current.column} は ${correct} に分類されます。`);
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

  // ── All answered → schema confirm ────────────────────────────────────────
  if (allAnswered && step >= QUESTIONS.length) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-5">
          <p className="text-white font-semibold">設計したスタースキーマ</p>

          <div className="grid grid-cols-3 gap-4">
            {[
              { name: 'fact_orders', color: '#6366f1', type: 'FACT', cols: ['order_id', 'user_key (FK)', 'product_key (FK)', 'amount', 'status', 'created_at'] },
              { name: 'dim_users', color: '#10b981', type: 'DIM', cols: ['user_key (PK)', 'user_id', 'name', 'email', 'registered_at'] },
              { name: 'dim_products', color: '#f59e0b', type: 'DIM', cols: ['product_key (PK)', 'product_id', 'name', 'category', 'price'] },
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
            fact_orders は「出来事（注文）」の数値と外部キーのみを持ち、dim テーブルが属性情報（名前・カテゴリ）を提供します。このスタースキーマにより高速な分析クエリが実現できます。
          </div>

          {/* Reflection before building */}
          {!showReflection && !done && (
            <button
              onClick={() => setShowReflection(true)}
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
            >
              ▶ このスキーマで構築する
            </button>
          )}

          {showReflection && !done && (
            <ReflectionQuestion
              question={WAREHOUSE_REFLECTION.question}
              options={WAREHOUSE_REFLECTION.options}
              onComplete={handleBuild}
              completeLabel="理解しました！Warehouse Layer を構築する →"
            />
          )}

          {done && (
            <div className="w-full py-3.5 rounded-xl bg-emerald-600/50 text-white font-semibold text-sm text-center">
              ✓ Warehouse Layer 完成！
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Quiz step ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto p-6 space-y-5">

        {/* Lineage banner */}
        {stagingRowCount !== null && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/15 text-xs text-amber-400">
            <span className="font-mono bg-amber-500/15 px-1.5 py-0.5 rounded text-[11px]">stg_orders</span>
            <span className="text-slate-600">から</span>
            <span className="font-bold text-amber-300">{stagingRowCount}行</span>
            <span className="text-slate-600">を受け取り → FACT/DIM に分解して</span>
            <span className="font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded text-[11px] text-emerald-400">fact_orders</span>
            <span className="text-slate-600">へ</span>
          </div>
        )}

        {/* Progress */}
        <div className="flex items-center gap-2">
          {QUESTIONS.map((q, i) => (
            <div key={q.id} className={`h-1.5 flex-1 rounded-full transition-all ${
              answers[q.id] != null ? 'bg-emerald-500' : i === step ? 'bg-slate-500' : 'bg-slate-800'
            }`} />
          ))}
          <span className="text-xs text-slate-500 ml-1 flex-shrink-0">{step + 1}/{QUESTIONS.length}</span>
        </div>

        {/* Concept reminder */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="px-3 py-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-indigo-400 font-bold mb-1">FACT（ファクト）</p>
            <p className="text-slate-400">出来事・数値・外部キー<br/>例: 金額・注文ID・FK</p>
          </div>
          <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <p className="text-amber-400 font-bold mb-1">DIM（ディメンション）</p>
            <p className="text-slate-400">属性・文脈情報<br/>例: 名前・カテゴリ・住所</p>
          </div>
        </div>

        {/* Column card */}
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

        {/* FACT / DIM buttons */}
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

        {/* Feedback */}
        {wrongMsg && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">{wrongMsg}</div>
        )}
        {isAnswered && (
          <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm">
            ✓ 正解！{current.explanation}
          </div>
        )}

        {/* Next */}
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
