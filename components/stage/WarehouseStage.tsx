'use client';

import { useState, useEffect } from 'react';
import { runSQL, querySQL } from '@/lib/duckdb/engine';
import { ReflectionQuestion } from './ReflectionQuestion';
import { useGameStore } from '@/lib/store/gameStore';

const WAREHOUSE_REFLECTION = {
  question: 'fact_orders は user_name を直接持たず、user_key（外部キー）で dim_users に紐付けました。なぜこの設計にしたのですか？',
  options: [
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
    {
      label: 'ユーザー名が変更されたとき、dim_users だけ更新すれば fact_orders 全レコードに自動で反映されるから',
      correct: true,
      explanation: '✓ 正解！これがスタースキーマの核心メリットです。もし fact_orders に user_name を直接持っていたら、名前変更のたびに何千・何万行を UPDATE する必要があります。外部キーで参照することで、dim_users の 1 行だけ更新すれば済みます。',
    },
  ],
};

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

// ─── Grain Question ───────────────────────────────────────────────────────────

const GRAIN_OPTIONS = [
  {
    id: 'line_item',
    label: '1注文明細（1 LINE ITEM）',
    desc: '商品ごとに 1 行 → より細かい粒度',
    correct: false,
    wrongMsg: '注文明細レベルはこのデータでは不要です。このデータセットは 1 注文 = 1 商品なので、注文単位（1 ORDER）が適切な粒度です。Mart で日次集計するにしても、粒度は「1 注文」を保持してください。',
  },
  {
    id: 'order',
    label: '1つの注文（1 ORDER）',
    desc: '各注文の合計金額・ステータスを 1 行で記録',
    correct: true,
    wrongMsg: '',
  },
  {
    id: 'daily',
    label: '日次集計（DAILY AGGREGATE）',
    desc: '1 日分の注文を 1 行に集約',
    correct: false,
    wrongMsg: '日次集計は Mart Layer で行うべきです。Warehouse の fact テーブルは生の粒度（1 注文）を保持し、集計は Mart に任せましょう。Warehouse で集計すると、後から「時間帯別」「ユーザー別」など切り口を変えた分析ができなくなります。',
  },
];

// ─── FACT/DIM Questions ───────────────────────────────────────────────────────

interface ColQuestion {
  id: string;
  column: string;
  example: string;
  description: string;
  correctType: 'fact' | 'dim';
  dimTable?: 'dim_users' | 'dim_products';
  factDisplay?: string;
  dimDisplay?: string;
  explanation: string;
}

const QUESTIONS: ColQuestion[] = [
  { id: 'amount', column: 'amount（注文金額）', example: '1500, 3200, NULL', description: '注文ごとの金額', correctType: 'fact', factDisplay: 'amount', explanation: '数値・集計対象になるものは FACT へ。これが「何が起きたか」の核心データです。' },
  { id: 'status', column: 'status（注文状態）', example: 'completed, cancelled', description: '注文ごとの状態', correctType: 'fact', factDisplay: 'status', explanation: '注文という「出来事」の状態も FACT に含めます。' },
  { id: 'user_id_fk', column: 'user_id（注文テーブル内）', example: 'U-1, U-2, U-3', description: 'orders テーブルにある外部キー', correctType: 'fact', factDisplay: 'user_key (FK)', explanation: 'FACT テーブルは外部キー（FK）を持ちます。名前・メールなどの属性は DIM テーブルに任せます。' },
  { id: 'user_name', column: 'name（ユーザー名）', example: '田中太郎, Sato Hanako', description: 'ユーザーの属性情報', correctType: 'dim', dimTable: 'dim_users', dimDisplay: 'name', explanation: 'ユーザーの属性（名前・メール）は dim_users へ。変化しにくい「文脈情報」です。' },
  { id: 'category', column: 'category（商品カテゴリ）', example: 'electronics', description: '商品の属性情報', correctType: 'dim', dimTable: 'dim_products', dimDisplay: 'category', explanation: '商品の属性は dim_products へ。注文の「文脈」を提供します。' },
  { id: 'price', column: 'price（商品の定価）', example: '1500, 800, 5600', description: '商品マスターの定価', correctType: 'dim', dimTable: 'dim_products', dimDisplay: 'price', explanation: '商品マスターの定価は DIM の属性です。注文時の実際の金額（amount）は FACT 側にあります。' },
];

// ─── Star Schema Preview ──────────────────────────────────────────────────────

function StarSchemaPreview({ answers }: { answers: Record<string, 'fact' | 'dim' | null> }) {
  const factCols = QUESTIONS.filter(q => answers[q.id] === 'fact');
  const dimUserCols = QUESTIONS.filter(q => answers[q.id] === 'dim' && q.dimTable === 'dim_users');
  const dimProductCols = QUESTIONS.filter(q => answers[q.id] === 'dim' && q.dimTable === 'dim_products');

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* dim_users */}
      <div className="rounded-lg border p-2.5" style={{ borderColor: '#10b98140', background: '#10b98108' }}>
        <p className="font-mono text-[10px] font-semibold text-emerald-400 mb-1.5">dim_users</p>
        <p className="font-mono text-[10px] text-slate-500 leading-5">user_key (PK)</p>
        <p className="font-mono text-[10px] text-slate-500 leading-5">user_id</p>
        {dimUserCols.map(q => (
          <p key={q.id} className="font-mono text-[10px] text-emerald-300 leading-5 animate-pulse-once">{q.dimDisplay}</p>
        ))}
        {dimUserCols.length === 0 && <p className="text-[10px] text-slate-700 italic">待機中...</p>}
      </div>

      {/* fact_orders */}
      <div className="rounded-lg border p-2.5" style={{ borderColor: '#6366f140', background: '#6366f108' }}>
        <p className="font-mono text-[10px] font-semibold text-indigo-400 mb-1.5">fact_orders</p>
        <p className="font-mono text-[10px] text-slate-500 leading-5">order_id (PK)</p>
        {factCols.map(q => (
          <p key={q.id} className="font-mono text-[10px] text-indigo-300 leading-5">{q.factDisplay ?? q.id}</p>
        ))}
        {factCols.length === 0 && <p className="text-[10px] text-slate-700 italic">待機中...</p>}
      </div>

      {/* dim_products */}
      <div className="rounded-lg border p-2.5" style={{ borderColor: '#f59e0b40', background: '#f59e0b08' }}>
        <p className="font-mono text-[10px] font-semibold text-amber-400 mb-1.5">dim_products</p>
        <p className="font-mono text-[10px] text-slate-500 leading-5">product_key (PK)</p>
        <p className="font-mono text-[10px] text-slate-500 leading-5">product_id</p>
        {dimProductCols.map(q => (
          <p key={q.id} className="font-mono text-[10px] text-amber-300 leading-5">{q.dimDisplay}</p>
        ))}
        {dimProductCols.length === 0 && <p className="text-[10px] text-slate-700 italic">待機中...</p>}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  dbReady: boolean;
  onComplete: () => void;
}

export function WarehouseStage({ dbReady, onComplete }: Props) {
  const loseHp = useGameStore(s => s.loseHp);
  const triggerJump = useGameStore(s => s.triggerJump);
  const [ready, setReady] = useState(false);
  const [stagingRowCount, setStagingRowCount] = useState<number | null>(null);
  const [warehousePhase, setWarehousePhase] = useState<'grain' | 'classify' | 'confirm'>('grain');

  // Grain state
  const [grainSelected, setGrainSelected] = useState<string | null>(null);
  const [grainAnswered, setGrainAnswered] = useState(false);

  // Classify state
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, 'fact' | 'dim' | null>>({});
  const [selected, setSelected] = useState<'fact' | 'dim' | null>(null);
  const [wrongMsg, setWrongMsg] = useState<string | null>(null);

  // Confirm state
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

  const current = QUESTIONS[step];
  const isAnswered = current ? answers[current.id] != null : false;

  function handleGrainSelect(id: string) {
    if (grainAnswered) return;
    setGrainSelected(id);
    const opt = GRAIN_OPTIONS.find(o => o.id === id)!;
    if (opt.correct) { setGrainAnswered(true); triggerJump(); }
    else loseHp();
  }

  function handleClassify(type: 'fact' | 'dim') {
    if (isAnswered) return;
    setSelected(type);
    if (type === current.correctType) {
      setWrongMsg(null);
      triggerJump();
      setAnswers(prev => ({ ...prev, [current.id]: type }));
    } else {
      const correct = current.correctType === 'fact' ? 'FACT' : 'DIM';
      setWrongMsg(`不正解です。${current.column} は ${correct} に分類されます。`);
      loseHp();
    }
  }

  function goNextClassify() {
    setSelected(null);
    setWrongMsg(null);
    if (step + 1 >= QUESTIONS.length) {
      setWarehousePhase('confirm');
    } else {
      setStep(s => s + 1);
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

  // ── Phase: Grain ─────────────────────────────────────────────────────────
  if (warehousePhase === 'grain') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-5">

          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Step 1 / 3 — 粒度（Grain）を決める</p>
            <p className="text-white font-semibold text-sm leading-relaxed">fact_orders の 1 行は何を表しますか？</p>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              粒度（Grain）とは「fact テーブルの 1 行がビジネスのどの単位を表すか」です。<br />
              細かすぎると集計が重くなり、荒すぎると分析が不自由になります。
            </p>
          </div>

          <div className="space-y-2">
            {GRAIN_OPTIONS.map(opt => {
              const isSel = grainSelected === opt.id;
              const isCorrect = isSel && grainAnswered;
              const isWrong = isSel && !grainAnswered;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleGrainSelect(opt.id)}
                  disabled={grainAnswered}
                  className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-all ${
                    isCorrect ? 'bg-green-500/15 border-green-500/50 text-green-200'
                    : isWrong ? 'bg-red-500/15 border-red-500/30 text-red-200'
                    : grainAnswered ? 'bg-slate-800/30 border-slate-700/50 text-slate-500 cursor-default'
                    : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-800 cursor-pointer'
                  }`}
                >
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              );
            })}
          </div>

          {grainSelected && !grainAnswered && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm leading-relaxed">
              {GRAIN_OPTIONS.find(o => o.id === grainSelected)?.wrongMsg}
            </div>
          )}

          {grainAnswered && (
            <>
              <div className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-sm leading-relaxed">
                ✓ 正解！「1 注文 = 1 行」の粒度は、注文金額・ステータス・ユーザーを注文単位で分析するのに最適です。この粒度を決めることで fact テーブルの設計が始まります。Mart Layer での日次集計などは、この粒度から派生させます。
              </div>
              <button
                onClick={() => setWarehousePhase('classify')}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
              >
                FACT / DIM の分類を始める →
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Phase: Classify ───────────────────────────────────────────────────────
  if (warehousePhase === 'classify') {
    return (
      <div className="h-full overflow-y-auto">
        <div className="max-w-xl mx-auto p-6 space-y-4">

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

          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-2">Step 2 / 3 — FACT / DIM 分類（スキーマがリアルタイムで更新されます）</p>
            {/* Live star schema preview */}
            <StarSchemaPreview answers={answers} />
          </div>

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
              <p className="text-slate-400">出来事・数値・外部キー<br />例: 金額・注文 ID・FK</p>
            </div>
            <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-400 font-bold mb-1">DIM（ディメンション）</p>
              <p className="text-slate-400">属性・文脈情報<br />例: 名前・カテゴリ・住所</p>
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
                  onClick={() => handleClassify(type)}
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
              onClick={goNextClassify}
              className="w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition-colors"
            >
              {step < QUESTIONS.length - 1 ? '次の列へ →' : 'スキーマ設計を確認する →'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Phase: Confirm ────────────────────────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-5">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium mb-1">Step 3 / 3 — スタースキーマの確認</p>
          <p className="text-white font-semibold">設計したスタースキーマ</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { name: 'fact_orders', color: '#6366f1', type: 'FACT', cols: ['order_id (PK)', 'user_key (FK)', 'product_key (FK)', 'amount', 'status', 'created_at'] },
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

        {/* FK relationship explanation */}
        <div className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 text-xs leading-relaxed">
          <p className="text-slate-300 font-medium mb-1.5">スタースキーマの仕組み</p>
          <p>fact_orders は「出来事（注文）」の数値と外部キーのみを持ちます。ユーザー名やカテゴリが必要なときは dim テーブルを JOIN して取得します。これにより、ユーザー名が変わっても <span className="font-mono text-emerald-400">dim_users</span> だけ更新すれば全分析に反映されます。</p>
        </div>

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
