import Link from 'next/link';
import { MioBadge } from '@/components/characters/MioBadge';

// ── 定数 ────────────────────────────────────────────────────────────

interface World {
  theme: string;
  label: string;
  layer: string;
  sky: string;
  ground: string;
  accent: string;
  emoji: string;
  locked?: boolean;
}

const WORLDS: World[] = [
  { theme: '洞窟',  label: 'WORLD 1', layer: 'Source Layer',       sky: '#060208', ground: '#221030', accent: '#A78BFA', emoji: '⛏️' },
  { theme: '草原',  label: 'WORLD 2', layer: 'Staging Layer',      sky: '#040c1c', ground: '#145a14', accent: '#34D399', emoji: '🌿' },
  { theme: '火山',  label: 'WORLD 3', layer: 'Warehouse Layer',    sky: '#140400', ground: '#5a1200', accent: '#F87171', emoji: '🌋' },
  { theme: '雪山',  label: 'WORLD 4', layer: 'Intermediate Layer', sky: '#08101c', ground: '#8aa8c8', accent: '#93C5FD', emoji: '❄️', locked: true },
  { theme: '城',    label: 'WORLD 5', layer: 'Mart Layer',         sky: '#080418', ground: '#404050', accent: '#FCD34D', emoji: '🏰' },
];

const FEATURES = [
  {
    icon: '🗺️',
    title: 'クエストRPG',
    body: '業界別シナリオ（EC・SaaS・医療・金融）をデータエンジニアとして攻略。読むだけじゃない、設計する体験。',
    accent: '#818CF8',
  },
  {
    icon: '❤️',
    title: 'HPで緊張感',
    body: '不正解はダメージ。HP 0でゲームオーバー。正解するとキャラがジャンプする—失敗が学びになる。',
    accent: '#F87171',
  },
  {
    icon: '⭐',
    title: 'XP×レベルアップ',
    body: 'ステージクリアでXP獲得、★評価で差がつく。自分の成長がリアルタイムの数字として見える。',
    accent: '#FCD34D',
  },
  {
    icon: '🔬',
    title: '実践Lab',
    body: 'インクリメンタルロード・データリネージ・DAGオーケストレーションを動かして学べるインタラクティブLabを搭載。',
    accent: '#34D399',
  },
] as const;

const LABS = [
  {
    href: '/incremental',
    icon: '🔄',
    badge: 'NEW',
    title: 'Incremental Load Lab',
    desc: 'Full Load・Incremental・Upsert・CDCを実際に動かして比較。なぜCDCが最強なのかを体感する。',
    accent: '#34D399',
    tag: 'データ取り込み',
  },
  {
    href: '/lineage',
    icon: '🕸️',
    badge: 'NEW',
    title: 'Data Lineage Visualizer',
    desc: 'テーブルノードをクリックして上流・下流依存を可視化。カラムレベルのリネージまで追跡できる。',
    accent: '#818CF8',
    tag: 'データガバナンス',
  },
  {
    href: '/dag',
    icon: '⚡',
    badge: 'NEW',
    title: 'DAG Orchestration Lab',
    desc: 'パイプラインのDAGを実際に実行。タスクの依存関係・並列実行・失敗伝播をリアルタイムで観察。',
    accent: '#F59E0B',
    tag: 'オーケストレーション',
  },
] as const;

// 固定星座標（SSR対応）
const STARS = [
  [8,6],[23,12],[45,4],[67,18],[89,8],[12,28],[34,35],
  [56,22],[78,31],[93,42],[5,55],[27,62],[48,58],[70,70],
  [85,60],[15,80],[38,88],[62,75],[82,90],[95,78],[18,47],
  [52,44],[74,50],[90,25],[3,38],[42,16],[60,42],[82,15],
];

// ── ゲーム画面モックアップ ───────────────────────────────────────────

function GamePreview() {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl w-72 flex-shrink-0 border border-indigo-900/40"
      style={{ background: '#08091a', boxShadow: '0 0 60px rgba(99,102,241,0.15)' }}
    >
      {/* HUD */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/80">
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

        {/* キャラクターダイアログ */}
        <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5 mb-2.5">
          <div className="text-[9px] text-blue-400 font-bold mb-1">田中シニアエンジニア</div>
          <div className="text-[10px] text-slate-300 leading-relaxed">
            このカラムの型が揃っていないな。<br />
            原因を診断してみよう！
          </div>
        </div>

        {/* 選択肢 */}
        <div className="space-y-1">
          {[
            { label: 'データが少ない',      correct: false },
            { label: '型が一致していない',  correct: true  },
            { label: 'カラムが欠損している', correct: false },
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

        {/* 結果 */}
        <div className="mt-2.5 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
          <span className="text-indigo-400 text-[10px] font-bold">正解！</span>
          <span className="text-indigo-300 text-[10px]">+50 XP 獲得</span>
          <span className="ml-auto text-yellow-400 text-[10px] font-bold animate-bounce">⬆ Lv.UP!</span>
        </div>
      </div>
    </div>
  );
}

// ── ページ本体 ───────────────────────────────────────────────────────

export default function Page() {
  return (
    <div className="min-h-screen bg-[#060918] text-white overflow-x-hidden relative">

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
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-indigo-950/60">
        <div className="flex items-center gap-2">
          <span
            className="text-indigo-400 text-xl font-black"
            style={{ textShadow: '0 0 16px rgba(129,140,248,0.8)' }}
          >
            ◈
          </span>
          <span className="font-black text-lg tracking-tight">Modelion</span>
          <span className="text-slate-600 text-xs font-medium ml-1">Agency</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/login" className="text-slate-400 hover:text-white text-xs transition-colors">
            ログイン
          </Link>
          <Link
            href="/signup"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all hover:shadow-lg hover:shadow-indigo-500/30"
          >
            入社する →
          </Link>
        </nav>
      </header>

      {/* ── ヒーロー ── */}
      <section className="relative z-10 flex flex-col lg:flex-row items-center gap-12 px-6 py-20 max-w-7xl mx-auto">

        {/* 左：テキスト */}
        <div className="flex-1 max-w-lg">
          {/* バッジ */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            NEW QUEST AVAILABLE
          </div>

          <h1 className="text-4xl lg:text-5xl font-black leading-tight mb-5 tracking-tight">
            データパイプラインを<br />
            <span style={{ color: '#818CF8', textShadow: '0 0 40px rgba(129,140,248,0.35)' }}>
              設計して体験する
            </span>
          </h1>

          <p className="text-slate-400 leading-relaxed mb-6 text-sm">
            読む学習でも、コードを写す学習でもない。<br />
            <span className="text-white font-semibold">ゲームとして</span>データエンジニアリングを実践する、
            第4世代の学習体験。
          </p>

          {/* HUDデモ */}
          <div className="flex items-center gap-4 mb-7 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800/80 w-fit">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="text-sm leading-none text-red-500">❤</span>
              ))}
            </div>
            <div className="w-px h-4 bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <span className="text-yellow-400 text-[10px] font-bold font-mono">Lv.3</span>
              <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
              </div>
              <span className="text-slate-500 text-[10px]">750 XP</span>
            </div>
          </div>

          {/* 特徴リスト */}
          <div className="space-y-2 mb-8">
            {[
              { icon: '⚔️', text: 'クエストRPG — 業界別ストーリーで実践' },
              { icon: '❤️', text: 'HPシステム — 失敗は痛い、正解でジャンプ！' },
              { icon: '⭐', text: 'XP×レベルアップ — 成長が数字で見える' },
              { icon: '🔬', text: '実践Lab — インクリメンタル・リネージ・DAGを動かす' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="text-base leading-none">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Link
              href="/signup"
              className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              ▶ Modelion Agencyに入社する
            </Link>
            <Link
              href="/playground"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-slate-700 hover:border-indigo-500/50 text-slate-300 hover:text-white text-sm transition-colors"
            >
              まず試してみる
            </Link>
          </div>

          {/* マスコット */}
          <MioBadge
            expression="excited"
            message="一緒にデータエンジニアリングを学ぼう！無料で始められるよ ✦"
            scale={5}
          />
        </div>

        {/* 右：ゲーム画面プレビュー */}
        <div className="flex-1 flex justify-center lg:justify-end">
          <GamePreview />
        </div>
      </section>

      {/* ── ワールド一覧 ── */}
      <section className="relative z-10 px-6 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">
            WORLD MAP
          </p>
          <h2 className="text-3xl font-black">5つのワールドをクリアせよ</h2>
          <p className="text-slate-500 text-sm mt-2">各データレイヤーが、ゲームの世界になった</p>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 justify-center">
          {WORLDS.map((w) => (
            <div
              key={w.theme}
              className="flex-shrink-0 w-40 rounded-xl overflow-hidden border transition-transform hover:scale-105"
              style={{
                background: `linear-gradient(180deg, ${w.sky} 0%, ${w.ground} 100%)`,
                borderColor: `${w.accent}40`,
                filter: w.locked ? 'saturate(0.3) brightness(0.5)' : undefined,
              }}
            >
              <div className="px-3 pt-3 pb-1">
                <span
                  className="text-[9px] font-black tracking-widest font-mono"
                  style={{ color: w.accent }}
                >
                  {w.label}
                </span>
              </div>
              <div className="h-20 flex items-center justify-center text-3xl">
                {w.emoji}
              </div>
              <div className="px-3 py-2.5" style={{ background: 'rgba(0,0,0,0.4)' }}>
                <p className="text-white font-black text-sm">{w.theme}</p>
                <p className="text-[10px] mt-0.5" style={{ color: w.accent, opacity: 0.7 }}>
                  {w.layer}
                </p>
                {w.locked && (
                  <p className="text-[9px] text-slate-600 mt-1 font-mono">🔒 COMING SOON</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 実践Lab ── */}
      <section className="relative z-10 px-6 py-16 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-emerald-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">
            INTERACTIVE LABS
          </p>
          <h2 className="text-3xl font-black">手を動かして学ぶ、実践Lab</h2>
          <p className="text-slate-500 text-sm mt-2">
            現場で使われる設計パターンをブラウザ上でシミュレーション
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {LABS.map((lab) => (
            <Link
              key={lab.href}
              href={lab.href}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/50 p-6 hover:border-slate-600 transition-all hover:-translate-y-1 overflow-hidden"
            >
              {/* glow accent */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity rounded-2xl"
                style={{ background: lab.accent }}
              />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <span className="text-3xl">{lab.icon}</span>
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider border"
                    style={{ color: lab.accent, borderColor: `${lab.accent}40`, background: `${lab.accent}10` }}
                  >
                    {lab.badge}
                  </span>
                </div>

                <div
                  className="w-8 h-0.5 rounded-full mb-3 transition-all group-hover:w-14"
                  style={{ background: lab.accent }}
                />

                <p
                  className="text-[10px] font-bold mb-1 font-mono tracking-wide"
                  style={{ color: lab.accent }}
                >
                  {lab.tag}
                </p>
                <h3 className="font-black text-white text-base mb-2">{lab.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{lab.desc}</p>

                <div
                  className="mt-4 flex items-center gap-1 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: lab.accent }}
                >
                  Labを開く →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 特徴グリッド ── */}
      <section className="relative z-10 px-6 py-16 max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">
            FEATURES
          </p>
          <h2 className="text-3xl font-black">ゲームとして設計された学習体験</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 hover:border-indigo-500/30 transition-all hover:-translate-y-1 group"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <div
                className="w-8 h-0.5 rounded-full mb-3 transition-all group-hover:w-16"
                style={{ background: f.accent }}
              />
              <h3 className="font-black text-white mb-2 text-sm">{f.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 学習パス ── */}
      <section className="relative z-10 px-6 py-16 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-indigo-400 text-[10px] font-black tracking-widest uppercase mb-2 font-mono">
            LEARNING PATH
          </p>
          <h2 className="text-3xl font-black">データエンジニアになる6ステップ</h2>
        </div>

        <div className="relative">
          {/* 縦線 */}
          <div className="absolute left-5 top-2 bottom-2 w-px bg-slate-800 hidden md:block" />

          <div className="space-y-4">
            {[
              { step: '01', title: 'Source Layer',    desc: '生データの取り込み・保持の概念を掴む',        accent: '#A78BFA', icon: '⛏️' },
              { step: '02', title: 'Staging Layer',   desc: '型変換・正規化・クレンジングで品質を担保する', accent: '#34D399', icon: '🌿' },
              { step: '03', title: 'Warehouse Layer', desc: 'スタースキーマ・fact/dim設計でモデリング',    accent: '#F87171', icon: '🌋' },
              { step: '04', title: 'Mart Layer',      desc: 'KPI・分析用テーブルで意思決定を支える',       accent: '#FCD34D', icon: '🏰' },
              { step: '05', title: 'パイプライン設計', desc: 'DAG・依存関係・スケジューリングを設計する',   accent: '#F59E0B', icon: '⚡' },
              { step: '06', title: 'データ品質',      desc: 'リネージ・ガバナンス・モニタリングで守る',    accent: '#818CF8', icon: '🔬' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-5 group">
                <div
                  className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm transition-all group-hover:scale-110"
                  style={{ borderColor: `${item.accent}60`, background: `${item.accent}10` }}
                >
                  {item.icon}
                </div>
                <div className="flex-1 pt-1.5 pb-4 border-b border-slate-900">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold" style={{ color: item.accent }}>
                      STEP {item.step}
                    </span>
                  </div>
                  <p className="font-black text-white text-sm">{item.title}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="relative z-10 px-6 py-28 text-center">
        <div
          className="max-w-lg mx-auto rounded-2xl p-10 border border-indigo-900/50"
          style={{ background: 'linear-gradient(135deg, #0c0c2a 0%, #0a0618 100%)' }}
        >
          <div className="text-5xl mb-4">🎮</div>
          <h2 className="text-3xl font-black mb-3">
            準備はできましたか？
          </h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Modelion Agencyで、<br />
            データエンジニアリングのクエストを受注しよう。
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-base transition-all hover:scale-105 hover:shadow-2xl hover:shadow-indigo-500/30"
          >
            ▶ Modelion Agencyに入社する
          </Link>
          <p className="text-slate-700 text-xs mt-4">無料で始められます</p>
        </div>
      </section>

      <footer className="relative z-10 text-center py-6 text-slate-700 text-xs border-t border-slate-900">
        Modelion — データを設計して、体験する。
      </footer>
    </div>
  );
}
