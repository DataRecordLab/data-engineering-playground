import Link from 'next/link';
import { MioBadge } from '@/components/characters/MioBadge';
import { PipelineFlowAnimation } from '@/components/ui/PipelineFlowAnimation';

// ── 定数 ────────────────────────────────────────────────────────────

const STARS = [
  [8,6],[23,12],[45,4],[67,18],[89,8],[12,28],[34,35],
  [56,22],[78,31],[93,42],[5,55],[27,62],[48,58],[70,70],
  [85,60],[15,80],[38,88],[62,75],[82,90],[95,78],[18,47],
  [52,44],[74,50],[90,25],[3,38],[42,16],[60,42],[82,15],
];

const STATS = [
  { value: '4',   unit: '業界',    label: 'EC / SaaS / 医療 / 金融' },
  { value: '20+', unit: 'ステージ', label: 'ハンズオンクエスト' },
  { value: '3',   unit: '実践Lab',  label: 'ブラウザで即動く' },
  { value: '15',  unit: '分/日',    label: '推奨学習時間' },
];

const COURSES = [
  {
    icon: '⚙️',
    title: 'データパイプライン基礎',
    desc: 'データの流れ・4レイヤー構造・命名規則の設計思想を習得',
    lessons: 5,
    accent: '#818CF8',
    bg: '#0a0b1e',
    tags: ['Source Layer', 'Staging', '命名規則'],
  },
  {
    icon: '🔍',
    title: 'データ品質',
    desc: 'NULL処理・型変換・COALESCEでデータを信頼できる状態に整える',
    lessons: 4,
    accent: '#34D399',
    bg: '#021008',
    tags: ['NULL処理', '型キャスト', 'クレンジング'],
  },
  {
    icon: '⭐',
    title: 'データモデリング',
    desc: 'スタースキーマ・fact/dim・粒度定義でBIに最適化されたモデルを設計する',
    lessons: 4,
    accent: '#F87171',
    bg: '#120200',
    tags: ['スタースキーマ', 'fact/dim', 'SCD'],
  },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '🗺️',
    title: 'クエストで実践',
    desc: '業界別ストーリーに沿って、実際のデータパイプラインを設計する。読むのではなく「判断する」体験。',
    accent: '#818CF8',
    link: '/quest/ec-site',
  },
  {
    step: '02',
    icon: '📚',
    title: 'スキルで理解',
    desc: '記述問題・並び替え・選択問題でDE概念を定着させる。当て感ではなく本物の知識として身につける。',
    accent: '#34D399',
    link: '/skills',
  },
  {
    step: '03',
    icon: '🔬',
    title: 'Labで体感',
    desc: 'インクリメンタルロード・DAGオーケストレーション・データリネージをブラウザ上で実際に動かす。',
    accent: '#F59E0B',
    link: '/incremental',
  },
];

const QUESTS = [
  {
    id: 'ec-site',
    emoji: '🛒',
    title: 'ECサイト分析基盤',
    client: 'ShopFlow Inc.',
    desc: '売上KPI・ユーザー行動・商品分析を支えるデータパイプラインを0から設計する',
    difficulty: '初級',
    stages: 5,
    accent: '#818CF8',
    sky: '#06041a',
    available: true,
  },
  {
    id: 'saas',
    emoji: '📈',
    title: 'SaaS MRR分析基盤',
    client: 'Subscribe AI',
    desc: 'チャーンリスク・MRR推移・プランアップグレード検知のパイプラインを構築する',
    difficulty: '中級',
    stages: 5,
    accent: '#34D399',
    sky: '#02100a',
    available: true,
  },
  {
    id: 'medical',
    emoji: '🏥',
    title: '医療データ基盤',
    client: 'MediCore Ltd.',
    desc: '患者データの匿名化・品質チェック・治療効果分析のパイプラインを設計する',
    difficulty: '上級',
    stages: 5,
    accent: '#60A5FA',
    sky: '#020810',
    available: false,
  },
  {
    id: 'finance',
    emoji: '💰',
    title: '金融リスク分析基盤',
    client: 'FinTrust Bank',
    desc: '取引データのリアルタイム処理・不正検知・コンプライアンスレポートを設計する',
    difficulty: '上級',
    stages: 5,
    accent: '#FCD34D',
    sky: '#0e0c00',
    available: false,
  },
];

const LEARNING_EFFECTS = [
  {
    icon: '🧠',
    title: '設計思想が身につく',
    desc: '「なぜそう設計するのか」を常に問われる。SQLの書き方ではなくデータエンジニアとしての判断力を鍛える。',
    accent: '#818CF8',
  },
  {
    icon: '🔁',
    title: '3ループで記憶に定着',
    desc: 'スキルで知識をインプット → クエストで使う → Labで体感。繰り返しの中で本物の理解が生まれる。',
    accent: '#34D399',
  },
  {
    icon: '⚡',
    title: 'AIが設計をレビュー',
    desc: '正誤だけでなく「なぜ★2なのか」まで言語化。シニアエンジニアのレビューをAIが再現する。',
    accent: '#F59E0B',
  },
  {
    icon: '📊',
    title: '成長が数字で見える',
    desc: 'XP・レベル・5次元スキルスコアで強みと弱みを可視化。次に学ぶべきことが常に明確。',
    accent: '#F87171',
  },
];

const DAILY_MISSIONS = [
  { icon: '⚔️', text: '1ステージクリア',           xp: '+100 XP', done: true  },
  { icon: '📚', text: 'スキルレッスン2本完了',       xp: '+80 XP',  done: true  },
  { icon: '🌟', text: '★3クリアを1回達成',           xp: '+150 XP', done: false },
];

const ROADMAP_ITEMS = [
  {
    quarter: '2025 Q2',
    label: 'リリース',
    done: true,
    accent: '#34D399',
    items: ['ECサイトクエスト', 'スキルパス（3セクション）', '実践Lab × 3', 'AIフィードバック'],
  },
  {
    quarter: '2025 Q3',
    label: '強化',
    done: true,
    accent: '#818CF8',
    items: ['SaaSクエスト', 'デイリーミッション・ストリーク', 'Skills ↔ Quest 進捗連携', 'キャラクターカスタマイズ'],
  },
  {
    quarter: '2025 Q4',
    label: '予定',
    done: false,
    accent: '#F59E0B',
    items: ['医療クエストβ', 'AIダイアログ型レビュー', '適応型スキルパス', 'スキルパス追加3セクション'],
  },
  {
    quarter: '2026 Q1',
    label: '計画',
    done: false,
    accent: '#F87171',
    items: ['金融クエスト', 'チーム学習機能', 'リーダーボード強化', 'モバイル対応強化'],
  },
];

const FAQS = [
  {
    q: 'プログラミング未経験でも大丈夫？',
    a: 'はい。SQLを「書く」よりも「設計の思想を考える」ことに重点を置いています。データエンジニアリングの概念を基礎から学べます。',
  },
  {
    q: '1日どのくらい学習すればいい？',
    a: '1日15〜30分を目安にしています。デイリーミッションをこなすだけでも十分です。ストリーク機能で継続習慣をサポートします。',
  },
  {
    q: 'Freeプランでどこまで学べる？',
    a: 'ECサイトクエスト（初級）全ステージ、スキルパス第1セクション、Lab体験版（各Freeゾーン）が無料で利用できます。',
  },
  {
    q: 'Proプランに変えると何が変わる？',
    a: '全クエスト（SaaS・医療・金融）、Labクエストモード全本、スキルパス全セクション、AIフィードバック無制限が解放されます。',
  },
  {
    q: 'これだけでデータエンジニアになれる？',
    a: '設計思想と概念理解を短期間で習得するには最適です。実務キャリアを目指す場合は、SQL・Python・クラウドの実践も並行することをおすすめします。',
  },
];

// ── CodeGridBackground ──────────────────────────────────────────────

const GRID_WORDS = [
  'SELECT','FROM','WHERE','JOIN','GROUP BY','ORDER BY','PARTITION BY',
  'CREATE TABLE','stg_orders','fact_orders','dim_users','mart_revenue',
  'NOT NULL','COALESCE','CAST','COUNT(*)','dbt run','dbt test',
  'WITH','AS','HAVING','DISTINCT','UNION ALL','LEFT JOIN','ON',
  'pipeline','source','staging','warehouse','mart','ELT','ETL',
];

const GRID_ITEMS = Array.from({ length: 36 }, (_, i) => ({
  word:    GRID_WORDS[i % GRID_WORDS.length],
  left:    `${((i * 73 + 17) % 92) + 2}%`,
  top:     `${((i * 47 + 11) % 92) + 2}%`,
  opacity: 0.028 + (i % 4) * 0.008,
  size:    `${10 + (i % 3) * 2}px`,
}));

function CodeGridBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none" aria-hidden="true">
      {GRID_ITEMS.map((item, i) => (
        <span
          key={i}
          className="absolute font-mono text-cyan-300 whitespace-nowrap"
          style={{ left: item.left, top: item.top, opacity: item.opacity, fontSize: item.size }}
        >
          {item.word}
        </span>
      ))}
    </div>
  );
}

// ── GamePreview ─────────────────────────────────────────────────────

function GamePreview() {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl w-72 flex-shrink-0 border border-indigo-900/40"
      style={{ background: '#0d0f1a', boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}
    >
      {/* HUD */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#272b42] bg-slate-900/80">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="text-xs leading-none text-red-500">❤</span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 text-[9px] font-bold font-mono">Lv.3</span>
          <div className="w-14 h-1 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
          </div>
          <span className="text-slate-500 text-[9px]">750 XP</span>
        </div>
      </div>

      {/* ミニワールドバー */}
      <div className="flex border-b border-slate-900">
        {[
          { theme: '洞窟', sky: '#060208', accent: '#A78BFA', stars: 2 },
          { theme: '草原', sky: '#040c1c', accent: '#34D399', current: true },
          { theme: '火山', sky: '#140400', accent: '#F87171' },
          { theme: '城',   sky: '#080418', accent: '#FCD34D' },
        ].map((w, i) => (
          <div
            key={i}
            className="flex-1 pt-1.5 pb-1 text-center"
            style={{
              background: w.sky,
              borderBottom: (w as { current?: boolean }).current ? `2px solid ${w.accent}` : '2px solid transparent',
            }}
          >
            <div className="text-[7px] font-mono font-bold" style={{ color: (w as { current?: boolean }).current ? w.accent : '#334155' }}>
              {w.theme}
            </div>
            {(w as { stars?: number }).stars && (
              <div className="text-[6px] text-yellow-400 leading-none mt-0.5">
                {'★'.repeat((w as { stars?: number }).stars ?? 0)}{'☆'.repeat(3 - ((w as { stars?: number }).stars ?? 0))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* クエスト内容 */}
      <div className="p-3">
        <div className="text-[9px] text-slate-600 mb-2 font-mono tracking-wider">
          ECサイト分析基盤 ／ STAGING
        </div>
        <div className="rounded-lg bg-slate-900 border border-[#272b42] p-2.5 mb-2.5">
          <div className="text-[9px] text-blue-400 font-bold mb-1">田中シニアエンジニア</div>
          <div className="text-[10px] text-slate-300 leading-relaxed">
            このカラムの型が揃っていないな。<br />原因を診断してみよう！
          </div>
        </div>
        <div className="space-y-1">
          {[
            { label: 'データが少ない',       correct: false },
            { label: '型が一致していない',   correct: true  },
            { label: 'カラムが欠損している',  correct: false },
          ].map((opt, i) => (
            <div
              key={i}
              className="rounded-lg px-2.5 py-1.5 text-[10px] border"
              style={{
                background: opt.correct ? 'rgba(34,197,94,0.1)' : 'rgba(30,41,59,0.6)',
                borderColor: opt.correct ? 'rgba(34,197,94,0.4)' : 'rgba(51,65,85,0.5)',
                color: opt.correct ? '#86efac' : '#64748b',
              }}
            >
              {opt.correct ? '✓ ' : '○ '}{opt.label}
            </div>
          ))}
        </div>
        <div className="mt-2.5 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <span className="text-cyan-400 text-[10px] font-bold">正解！</span>
          <span className="text-indigo-300 text-[10px]">+50 XP 獲得</span>
          <span className="ml-auto text-yellow-400 text-[10px] font-bold animate-bounce">⬆ Lv.UP!</span>
        </div>
      </div>
    </div>
  );
}

// ── ページ本体 ────────────────────────────────────────────────────────

export default function Page() {
  return (
    <div className="min-h-screen bg-[#131525] text-white overflow-x-hidden relative">

      <CodeGridBackground />

      {/* 星フィールド */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {STARS.map(([x, y], i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width:  i % 4 === 0 ? 2 : 1,
              height: i % 4 === 0 ? 2 : 1,
              opacity: 0.12 + (i % 5) * 0.07,
              animation: `twinkle ${2 + (i % 3)}s ease-in-out infinite`,
              animationDelay: `${(i * 0.25) % 2.5}s`,
            }}
          />
        ))}
      </div>

      {/* ── ヘッダー ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 text-xl font-black" style={{ textShadow: '0 0 16px rgba(6,182,212,0.8)' }}>◈</span>
          <span className="font-black text-lg tracking-tight">Modelion</span>
          <span className="text-slate-600 text-xs font-medium ml-1">データワールド</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/upgrade" className="text-slate-500 hover:text-white text-xs transition-colors hidden sm:block">
            料金プラン
          </Link>
          <Link href="/login" className="text-slate-500 hover:text-white text-xs transition-colors">
            ログイン
          </Link>
          <Link
            href="/start"
            className="px-4 py-2 rounded-xl text-white font-black text-xs transition-all hover:scale-105 active:scale-95"
            style={{ background: '#06B6D4', boxShadow: '0 4px 0 #0891B2' }}
          >
            無料で始める →
          </Link>
        </nav>
      </header>

      {/* ── ① ヒーロー ── */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center gap-12 px-6 py-20 max-w-7xl mx-auto">
        <div className="flex-1 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            SaaSクエスト 公開中
          </div>

          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-5 tracking-tight">
            データパイプラインを<br />
            <span style={{ color: '#22D3EE', textShadow: '0 0 40px rgba(6,182,212,0.4)' }}>
              設計して体験する
            </span>
          </h1>

          <p className="text-slate-400 leading-relaxed mb-8 text-base">
            読む学習でも、コードを写す学習でもない。<br />
            業界別クエストRPGで<span className="text-white font-semibold">データエンジニアリングの思考</span>を体験する、<br />
            第4世代の学習プラットフォーム。
          </p>

          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/start"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-white font-black text-sm transition-all hover:scale-105 active:scale-95"
              style={{ background: '#06B6D4', boxShadow: '0 5px 0 #0891B2' }}
            >
              ▶ 無料で始める
            </Link>
            <Link
              href="/playground"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-[#343856] hover:border-[#6366F1]/50 text-[#8890b0] hover:text-white text-sm transition-colors"
            >
              デモを見る
            </Link>
          </div>

          <MioBadge
            expression="excited"
            message="一緒にデータエンジニアリングを学ぼう！無料で始められるよ ✦"
            size={80}
          />
        </div>

        <div className="flex-1 flex justify-center lg:justify-end">
          <PipelineFlowAnimation />
        </div>
      </section>

      {/* ── ② 数字で見る実績 ── */}
      <section className="relative z-10 border-y border-[#272b42]" style={{ background: 'rgba(13,15,26,0.85)' }}>
        <div className="max-w-4xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-3xl font-black text-white mb-0.5">
                {s.value}<span className="text-cyan-400 text-lg ml-1">{s.unit}</span>
              </p>
              <p className="text-slate-500 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ③ コース一覧 ── */}
      <section className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-cyan-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">COURSES</p>
          <h2 className="text-3xl font-black mb-3">何を学べるか</h2>
          <p className="text-slate-500 text-sm">データエンジニアリングの核心概念を3つのコースで体系的に習得</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {COURSES.map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border p-6 flex flex-col gap-4 hover:-translate-y-1 transition-transform"
              style={{ background: c.bg, borderColor: `${c.accent}30` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl">{c.icon}</span>
                <span
                  className="text-[9px] font-mono font-bold px-2 py-1 rounded-full border"
                  style={{ color: c.accent, borderColor: `${c.accent}40`, background: `${c.accent}10` }}
                >
                  {c.lessons} レッスン
                </span>
              </div>
              <div>
                <h3 className="font-black text-white text-base mb-1">{c.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{c.desc}</p>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-auto">
                {c.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-[9px] px-2 py-0.5 rounded-full"
                    style={{ background: `${c.accent}15`, color: c.accent }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-cyan-500/30 hover:bg-cyan-500/10 text-cyan-400 font-bold text-sm transition-colors"
          >
            スキルパスを見る →
          </Link>
        </div>
      </section>

      {/* ── ④ 学習の流れ ── */}
      <section className="relative z-10 px-6 py-20" style={{ background: 'rgba(13,15,26,0.90)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-emerald-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">HOW IT WORKS</p>
            <h2 className="text-3xl font-black mb-3">3つのループで、本物の理解へ</h2>
            <p className="text-slate-500 text-sm">読むだけ・解くだけの学習ではなく、設計→理解→体感を繰り返す</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* 接続線 */}
            <div className="hidden md:block absolute top-10 left-[calc(33%-20px)] right-[calc(33%-20px)] h-px bg-gradient-to-r from-indigo-500/30 via-emerald-500/30 to-amber-500/30" />

            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="relative flex flex-col items-center text-center gap-4 p-6">
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl relative z-10"
                  style={{ background: `${step.accent}18`, border: `1px solid ${step.accent}35` }}
                >
                  {step.icon}
                  <span
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
                    style={{ background: step.accent, color: '#000' }}
                  >
                    {i + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-black text-white text-base mb-2">{step.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
                </div>
                <Link
                  href={step.link}
                  className="text-xs font-bold transition-colors"
                  style={{ color: step.accent }}
                >
                  試してみる →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ⑤ クエスト一覧 ── */}
      <section className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-amber-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">QUESTS</p>
          <h2 className="text-3xl font-black mb-3">業界別クエストで実践する</h2>
          <p className="text-slate-500 text-sm">クライアントの課題を受注し、データパイプラインを設計して解決する</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {QUESTS.map((q) => (
            <div
              key={q.id}
              className={`rounded-2xl border overflow-hidden transition-all ${q.available ? 'hover:-translate-y-1 hover:shadow-xl' : 'opacity-50'}`}
              style={{ borderColor: `${q.accent}25`, background: q.sky, boxShadow: q.available ? `0 0 0 0 ${q.accent}00` : undefined }}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{q.emoji}</span>
                    <div>
                      <p className="text-[9px] text-slate-600 font-mono">{q.client}</p>
                      <h3 className="font-black text-white text-sm">{q.title}</h3>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full border"
                      style={{ color: q.accent, borderColor: `${q.accent}40`, background: `${q.accent}10` }}
                    >
                      {q.difficulty}
                    </span>
                    {!q.available && (
                      <span className="text-[9px] text-slate-600 font-mono">🔒 近日公開</span>
                    )}
                  </div>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed mb-4">{q.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-600">{q.stages} ステージ</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: q.stages }).map((_, i) => (
                        <div
                          key={i}
                          className="w-5 h-1 rounded-full"
                          style={{ background: i === 0 ? q.accent : `${q.accent}25` }}
                        />
                      ))}
                    </div>
                  </div>
                  {q.available ? (
                    <Link
                      href={`/quest/${q.id}`}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: `${q.accent}20`, color: q.accent, border: `1px solid ${q.accent}30` }}
                    >
                      受注する →
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-700 font-mono">Coming Soon</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ⑥ ミッション & ストリーク ── */}
      <section className="relative z-10 px-6 py-20" style={{ background: 'rgba(13,15,26,0.90)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-orange-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">DAILY HABIT</p>
            <h2 className="text-3xl font-black mb-3">毎日続けるための仕組み</h2>
            <p className="text-slate-500 text-sm">デイリーミッションとストリークで、学習を習慣に変える</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* ミッションカード */}
            <div className="rounded-2xl border border-[#272b42] bg-slate-900/60 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-slate-500 font-mono mb-0.5">TODAY&apos;S MISSIONS</p>
                  <p className="font-black text-white">デイリーミッション</p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-xl text-sm font-black"
                  style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' }}
                >
                  2 / 3 完了
                </div>
              </div>
              <div className="space-y-3">
                {DAILY_MISSIONS.map((m) => (
                  <div
                    key={m.text}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
                    style={{
                      background: m.done ? 'rgba(34,197,94,0.05)' : 'rgba(15,23,42,0.5)',
                      borderColor: m.done ? 'rgba(34,197,94,0.2)' : 'rgba(51,65,85,0.4)',
                    }}
                  >
                    <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${m.done ? 'bg-green-500 text-white' : 'bg-slate-800 text-slate-600'}`}>
                      {m.done ? '✓' : m.icon}
                    </span>
                    <span className={`text-sm flex-1 ${m.done ? 'text-slate-400 line-through' : 'text-white'}`}>
                      {m.text}
                    </span>
                    <span className="text-xs font-bold" style={{ color: m.done ? '#34D399' : '#475569' }}>
                      {m.xp}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ストリーク説明 */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-[#272b42] bg-slate-900/60 p-6">
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-5xl">🔥</span>
                  <div>
                    <p className="text-4xl font-black text-white">7 <span className="text-lg text-slate-500">日連続</span></p>
                    <p className="text-xs text-slate-500">継続するほど特別バッジが解放される</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {['月','火','水','木','金','土','日'].map((d, i) => (
                    <div key={d} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-colors"
                        style={i < 7 ? { background: 'rgba(251,146,60,0.2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' } : { background: 'rgba(51,65,85,0.3)', color: '#475569' }}
                      >
                        🔥
                      </div>
                      <span className="text-[9px] text-slate-600">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { streak: '7日',  badge: '🔥 Week Warrior',    color: '#fb923c' },
                  { streak: '30日', badge: '💎 Month Master',     color: '#818CF8' },
                ].map((b) => (
                  <div
                    key={b.streak}
                    className="rounded-xl border p-3 text-center"
                    style={{ borderColor: `${b.color}30`, background: `${b.color}08` }}
                  >
                    <p className="text-xs font-black" style={{ color: b.color }}>{b.streak}連続</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{b.badge}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ⑦ 学習効果 ── */}
      <section className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-purple-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">WHY IT WORKS</p>
          <h2 className="text-3xl font-black mb-3">なぜ身につくのか</h2>
          <p className="text-slate-500 text-sm">「読む」から「設計する」へ。記憶ではなく思考を鍛える学習設計</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {LEARNING_EFFECTS.map((e) => (
            <div
              key={e.title}
              className="rounded-xl border border-[#272b42] bg-slate-900/50 p-5 hover:border-[#343856] hover:-translate-y-1 transition-all group"
            >
              <div className="text-3xl mb-3">{e.icon}</div>
              <div
                className="w-8 h-0.5 rounded-full mb-3 transition-all group-hover:w-16"
                style={{ background: e.accent }}
              />
              <h3 className="font-black text-white text-sm mb-2">{e.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{e.desc}</p>
            </div>
          ))}
        </div>

        {/* 比較表 */}
        <div className="max-w-3xl mx-auto rounded-2xl border border-[#272b42] overflow-hidden">
          <div className="grid grid-cols-3 text-xs font-bold border-b border-[#272b42]">
            <div className="px-5 py-3 text-slate-600">学習方法</div>
            <div className="px-5 py-3 text-center text-slate-500 border-x border-slate-800">従来の教材</div>
            <div className="px-5 py-3 text-center text-cyan-400">Modelion</div>
          </div>
          {[
            ['設計を考える体験',     false, true  ],
            ['業界シナリオで実践',    false, true  ],
            ['AIが思想をレビュー',   false, true  ],
            ['インタラクティブLab',  false, true  ],
            ['ゲーミフィケーション', true,  true  ],
            ['動画・テキスト',       true,  false ],
          ].map(([label, old, neo]) => (
            <div
              key={label as string}
              className="grid grid-cols-3 text-xs border-b border-[#272b42]/80 last:border-0"
            >
              <div className="px-5 py-3 text-slate-400">{label as string}</div>
              <div className="px-5 py-3 text-center text-lg border-x border-slate-800">
                {old ? '✓' : <span className="text-slate-800">—</span>}
              </div>
              <div className="px-5 py-3 text-center text-lg">
                {neo ? <span className="text-cyan-400">✓</span> : <span className="text-slate-800">—</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ⑧ ロードマップ ── */}
      <section className="relative z-10 px-6 py-20" style={{ background: 'rgba(13,15,26,0.90)' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">ROADMAP</p>
            <h2 className="text-3xl font-black mb-3">これからのModelion</h2>
            <p className="text-slate-500 text-sm">継続的にアップデートされ続けるプラットフォーム</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {ROADMAP_ITEMS.map((r) => (
              <div
                key={r.quarter}
                className="rounded-xl border p-5"
                style={{
                  borderColor: r.done ? `${r.accent}40` : 'rgba(51,65,85,0.4)',
                  background: r.done ? `${r.accent}06` : 'rgba(15,23,42,0.4)',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-mono font-bold text-slate-500">{r.quarter}</p>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={r.done
                      ? { background: `${r.accent}20`, color: r.accent }
                      : { background: 'rgba(51,65,85,0.4)', color: '#64748b' }
                    }
                  >
                    {r.done ? '✓ ' : ''}{r.label}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {r.items.map((item) => (
                    <li key={item} className="flex items-start gap-1.5">
                      <span style={{ color: r.done ? r.accent : '#334155', flexShrink: 0 }} className="text-xs mt-0.5">
                        {r.done ? '✓' : '◦'}
                      </span>
                      <span className={`text-xs ${r.done ? 'text-slate-400' : 'text-slate-600'}`}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ⑨ FAQ ── */}
      <section className="relative z-10 px-6 py-20 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-slate-500 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">FAQ</p>
          <h2 className="text-3xl font-black">よくある質問</h2>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-[#272b42] bg-slate-900/40 px-6 py-5"
            >
              <p className="font-bold text-white text-sm mb-2">Q. {faq.q}</p>
              <p className="text-slate-400 text-xs leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ⑩ 最終CTA ── */}
      <section className="relative z-10 px-6 py-28 text-center">
        <div
          className="max-w-xl mx-auto rounded-2xl p-12 border border-indigo-900/50 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #0c0c2a 0%, #0a0618 100%)' }}
        >
          {/* glow */}
          <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(129,140,248,0.3) 0%, transparent 70%)' }} />

          <div className="relative z-10">
            <div className="text-5xl mb-5">🚀</div>
            <h2 className="text-3xl font-black mb-3">
              データエンジニアとしての<br />
              <span style={{ color: '#818CF8' }}>旅を始めよう</span>
            </h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
              Modelion データワールドに飛び込んで、<br />
              最初のクエストを受注しよう。今日から始められる。
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/start"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-white font-black text-base transition-all hover:scale-105 active:scale-95"
                style={{ background: '#06B6D4', boxShadow: '0 5px 0 #0891B2' }}
              >
                ▶ 無料で始める
              </Link>
              <Link
                href="/upgrade"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-[#343856] hover:border-indigo-500/50 text-slate-300 hover:text-white text-sm transition-colors"
              >
                料金プランを見る
              </Link>
            </div>
            <p className="text-slate-700 text-xs mt-5">クレジットカード不要 • いつでもキャンセル可能</p>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-900 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-cyan-500 font-black">◈</span>
            <span className="font-bold">Modelion</span>
            <span>— データを設計して、体験する。</span>
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/upgrade" className="hover:text-slate-400 transition-colors">料金プラン</Link>
            <Link href="/login"   className="hover:text-slate-400 transition-colors">ログイン</Link>
            <Link href="/signup"  className="hover:text-slate-400 transition-colors">新規登録</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
