import Link from 'next/link';

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 text-xl font-bold">◈</span>
          <span className="font-bold text-lg tracking-tight">DataCraft</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-slate-400">
          <Link href="/login" className="text-slate-400 hover:text-white text-sm transition-colors">
            ログイン
          </Link>
          <Link href="/signup" className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            入社する
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-8 py-24 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-8">
          DataCraft Agency — データエンジニアリング専門エージェンシー
        </div>

        <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
          データパイプラインを<br />
          <span className="text-blue-400">設計して体験する</span>
        </h1>

        <p className="text-slate-400 text-lg leading-relaxed mb-4">
          読む学習でも、コードを書く学習でもない。
        </p>
        <p className="text-slate-400 text-lg leading-relaxed mb-12">
          データを <span className="text-white">組み立て</span>、
          <span className="text-white">流し</span>、
          <span className="text-white">壊して</span>、
          理解する — 第4世代の学習体験。
        </p>

        <div className="flex items-center gap-4">
          <Link
            href="/signup"
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-base transition-colors"
          >
            DataCraft Agencyに入社する →
          </Link>
          <Link
            href="/playground"
            className="px-8 py-3 rounded-xl border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white text-base transition-colors"
          >
            Playground を試す
          </Link>
        </div>
      </main>

      {/* Pipeline visual */}
      <div className="flex items-center justify-center gap-3 pb-20 text-sm text-slate-600">
        {['CSV Source', 'Source', 'Staging', 'Warehouse', 'Mart', 'Dashboard'].map((label, i, arr) => (
          <span key={label} className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-md bg-slate-800 text-slate-400">{label}</span>
            {i < arr.length - 1 && <span className="text-slate-700">→</span>}
          </span>
        ))}
      </div>

      <footer className="text-center py-6 text-slate-700 text-xs border-t border-slate-900">
        DataCraft — データを流して、壊して、理解する。
      </footer>
    </div>
  );
}
