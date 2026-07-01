import Link from 'next/link';
import { ALL_DEBUG_SCENARIOS, CATEGORY_LABELS, CATEGORY_COLORS } from '@/lib/debug';
import type { DebugScenario } from '@/types';

function DifficultyBadge({ difficulty }: { difficulty: DebugScenario['difficulty'] }) {
  const map = {
    beginner: { label: '初級', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' },
    intermediate: { label: '中級', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5' },
    advanced: { label: '上級', color: 'text-red-400 border-red-500/30 bg-red-500/5' },
  };
  const { label, color } = map[difficulty];
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${color}`}>
      {label}
    </span>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  data_quality: '🔴',
  pipeline_design: '🔵',
  schema_drift: '🟣',
  timezone: '🟢',
  environment: '🟡',
};

function ScenarioCard({ scenario, index }: { scenario: DebugScenario; index: number }) {
  const catColor = CATEGORY_COLORS[scenario.category] ?? '#94A3B8';
  const catLabel = CATEGORY_LABELS[scenario.category] ?? scenario.category;
  const catIcon = CATEGORY_ICONS[scenario.category] ?? '⚪';

  return (
    <Link
      href={`/debug/${scenario.id}`}
      className="group rounded-2xl border border-slate-800/60 bg-slate-900/40 hover:border-slate-600/60 hover:bg-slate-900/80 p-5 flex flex-col gap-4 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
              style={{ color: catColor, borderColor: `${catColor}40`, background: `${catColor}10` }}
            >
              {catLabel}
            </span>
            <DifficultyBadge difficulty={scenario.difficulty} />
          </div>
          <h3 className="text-white font-bold text-base leading-tight group-hover:text-blue-300 transition-colors">
            {scenario.title}
          </h3>
          <p className="text-slate-500 text-xs">{scenario.subtitle}</p>
        </div>
        <div className="text-2xl flex-shrink-0">{catIcon}</div>
      </div>

      {/* Alert preview */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-1">
        <p className="text-red-400/70 text-[10px] font-medium">アラート — {scenario.alert.from}</p>
        <p className="text-slate-400 text-xs leading-snug line-clamp-2">
          {scenario.alert.message}
        </p>
        <div className="flex items-center gap-3 pt-1">
          <div>
            <p className="text-[9px] text-slate-600">期待値</p>
            <p className="text-emerald-400 text-xs font-bold">{scenario.alert.expectedValue}</p>
          </div>
          <span className="text-slate-700 text-xs">→</span>
          <div>
            <p className="text-[9px] text-slate-600">実際値</p>
            <p className="text-red-400 text-xs font-bold">{scenario.alert.actualValue}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-slate-600 text-xs">{scenario.investigationHints.length} 調査ヒント</span>
        <div className="flex items-center gap-1.5">
          <span className="text-yellow-400 text-xs font-bold">+{scenario.xpReward}</span>
          <span className="text-slate-600 text-[10px]">XP</span>
          <span className="text-slate-700 ml-1 group-hover:text-slate-500 transition-colors">→</span>
        </div>
      </div>
    </Link>
  );
}

export default function DebugPage() {
  const categories = Array.from(new Set(ALL_DEBUG_SCENARIOS.map(s => s.category)));
  const totalXp = ALL_DEBUG_SCENARIOS.reduce((sum, s) => sum + s.xpReward, 0);
  const beginnerCount = ALL_DEBUG_SCENARIOS.filter(s => s.difficulty === 'beginner').length;
  const intermediateCount = ALL_DEBUG_SCENARIOS.filter(s => s.difficulty === 'intermediate').length;

  return (
    <div className="min-h-screen bg-[#070910] text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/60 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
            ← ダッシュボード
          </Link>
          <span className="text-slate-800">|</span>
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-lg">🚨</span>
            <span className="font-black text-sm">Debug Lab</span>
          </div>
        </div>
        <span className="text-slate-500 text-xs hidden sm:block">実際の現場で起きるエラーを体験して復旧スキルを身につけよう</span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <div className="space-y-5">
          <div className="flex items-start gap-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              🚨
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black">Pipeline Debug Lab</h1>
              <p className="text-slate-400 text-base leading-relaxed max-w-xl">
                実際の現場で起きるデータパイプラインの障害を体験し、調査→診断→修正の流れを習得しよう。
                本物のSQLを実行してインシデントを解決する。
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { value: ALL_DEBUG_SCENARIOS.length, label: 'シナリオ', icon: '📋' },
              { value: categories.length, label: 'カテゴリ', icon: '🏷️' },
              { value: `${beginnerCount}初 / ${intermediateCount}中`, label: '難易度', icon: '📊' },
              { value: `+${totalXp}`, label: '獲得可能XP', icon: '⭐' },
            ].map(stat => (
              <div key={stat.label} className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 text-center">
                <div className="text-lg mb-1">{stat.icon}</div>
                <p className="text-white font-black text-base">{stat.value}</p>
                <p className="text-slate-600 text-[10px]">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '🚨', step: '01', label: 'アラート受信', desc: 'クライアントから緊急連絡が届く' },
              { icon: '🔍', step: '02', label: 'SQLで調査', desc: 'DuckDBで実際にクエリして原因を特定' },
              { icon: '🛠️', step: '03', label: '修正・検証', desc: '正しい修正を選んでパイプラインを復旧' },
            ].map(item => (
              <div key={item.step} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-600 font-mono">{item.step}</span>
                  <span className="text-lg">{item.icon}</span>
                </div>
                <p className="text-white font-bold text-sm">{item.label}</p>
                <p className="text-slate-500 text-xs leading-snug">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Category groups */}
        {[
          {
            category: 'data_quality',
            title: 'データ品質の問題',
            desc: 'NULL・型不整合・表記揺れ',
          },
          {
            category: 'pipeline_design',
            title: 'パイプライン設計の問題',
            desc: '冪等性・増分処理・ファンアウト',
          },
          {
            category: 'schema_drift',
            title: 'スキーマドリフト',
            desc: '上流の仕様変更・カラム消失',
          },
          {
            category: 'timezone',
            title: '時間・タイミングの問題',
            desc: 'UTCとJSTの境界・日付集計のズレ',
          },
        ].map(group => {
          const scenarios = ALL_DEBUG_SCENARIOS.filter(s => s.category === group.category);
          if (scenarios.length === 0) return null;
          const color = CATEGORY_COLORS[group.category];
          const icon = CATEGORY_ICONS[group.category];

          return (
            <div key={group.category} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-base">{icon}</span>
                <div>
                  <h2
                    className="font-black text-base"
                    style={{ color }}
                  >
                    {group.title}
                  </h2>
                  <p className="text-slate-600 text-xs">{group.desc}</p>
                </div>
                <span className="ml-auto text-slate-700 text-xs">{scenarios.length}件</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenarios.map((s, i) => (
                  <ScenarioCard key={s.id} scenario={s} index={i} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
