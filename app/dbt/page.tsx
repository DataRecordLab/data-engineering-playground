'use client';

import Link from 'next/link';
import { DbtSimulatorWithProvider } from '@/components/dbt/DbtSimulatorLazy';

export default function DbtPage() {
  return (
    <div className="flex flex-col h-screen bg-[#060918] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/80 flex-shrink-0 bg-slate-950/90 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
            ← ダッシュボード
          </Link>
          <span className="text-slate-800">|</span>
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-bold text-sm font-mono">dbt</span>
            <span className="text-slate-400 text-sm font-semibold">Simulator</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">BETA</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="text-amber-400">⚡</span> dbt compile — Jinjaマクロを解決
            </span>
            <span className="flex items-center gap-1">
              <span className="text-blue-400">▶</span> dbt run — モデルをDuckDBで実行
            </span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400">✓</span> dbt test — データ品質を検証
            </span>
          </div>
          <a
            href="https://docs.getdbt.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
          >
            dbt docs ↗
          </a>
        </div>
      </header>

      {/* Simulator — full remaining height */}
      <div className="flex-1 overflow-hidden">
        <DbtSimulatorWithProvider />
      </div>

      {/* Concept footer */}
      <footer className="flex-shrink-0 border-t border-slate-800/60 bg-slate-950/60 px-4 py-2">
        <div className="flex items-center gap-6 overflow-x-auto text-[10px] text-slate-600">
          <span className="flex-shrink-0 font-semibold text-slate-500">学べること:</span>
          {[
            '{{ ref() }} で上流依存を宣言',
            '{{ source() }} で生データを参照',
            'materialized = table / view の違い',
            'DAG による実行順序の自動解決',
            'not_null / unique / accepted_values テスト',
            'Staging → Warehouse → Mart のレイヤー設計',
          ].map(concept => (
            <span key={concept} className="flex-shrink-0 px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {concept}
            </span>
          ))}
        </div>
      </footer>
    </div>
  );
}
