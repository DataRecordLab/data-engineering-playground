'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ALL_SECTIONS } from '@/lib/skills';
import { QUESTS } from '@/lib/scenarios';
import { getSkillProgress, getUserProgress } from '@/lib/supabase/progress';
import {
  ROADMAP,
  buildRoadmapProgress,
  itemProgress,
  levelProgress,
  debugTitle,
  type RoadmapItem,
  type RoadmapProgress,
} from '@/lib/roadmap';

const EMPTY_PROGRESS: RoadmapProgress = {
  skillDone: new Set(),
  questStagesDone: new Set(),
  debugDone: new Set(),
};

const KIND_LABEL: Record<RoadmapItem['kind'], string> = {
  skill: 'SKILL',
  quest: 'QUEST',
  debug: 'DEBUG',
  lab: 'LAB',
  coming_soon: 'SOON',
};

function itemLink(item: RoadmapItem, p: RoadmapProgress): { href: string; title: string; description: string } | null {
  switch (item.kind) {
    case 'skill': {
      const section = ALL_SECTIONS.find(s => s.id === item.sectionId);
      if (!section) return null;
      const lessons = section.lessons.filter(l => item.lessonIds.includes(l.id));
      const next = lessons.find(l => !p.skillDone.has(`${section.id}/${l.id}`)) ?? lessons[0];
      return {
        href: `/skills/${section.id}/${next.id}`,
        title: `${section.title}`,
        description: lessons.map(l => l.title).join(' / '),
      };
    }
    case 'quest': {
      const quest = QUESTS[item.questId];
      return { href: `/quest/${quest.id}`, title: `${quest.clientName}「${quest.title}」`, description: quest.deConceptsCovered.join(' / ') };
    }
    case 'debug': {
      const next = item.scenarioIds.find(id => !p.debugDone.has(id)) ?? item.scenarioIds[0];
      return { href: `/debug/${next}`, title: 'Debug Lab：壊れたパイプラインを直す', description: item.scenarioIds.map(debugTitle).join(' / ') };
    }
    case 'lab':
      return { href: item.href, title: item.label, description: item.description };
    case 'coming_soon':
      return null;
  }
}

export function RoadmapView() {
  const [progress, setProgress] = useState<RoadmapProgress>(EMPTY_PROGRESS);

  useEffect(() => {
    Promise.all([getSkillProgress(), getUserProgress()])
      .then(([skills, stages]) => setProgress(buildRoadmapProgress(skills, stages)))
      .catch(() => {}); // 未ログイン・Supabase 未設定時は進捗なしで表示
  }, []);

  const levelStats = ROADMAP.map(level => levelProgress(level, progress));
  const overall = levelStats.reduce((acc, s) => ({ done: acc.done + s.done, total: acc.total + s.total }), { done: 0, total: 0 });
  const overallPct = overall.total > 0 ? Math.round((overall.done / overall.total) * 100) : 0;
  const currentLevelIdx = Math.max(0, levelStats.findIndex(s => s.done < s.total));

  return (
    <main className="min-h-screen bg-[#080918] text-white pb-24">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">

        {/* ヘッダー */}
        <header className="space-y-4">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">← ダッシュボード</Link>
          <div>
            <p className="text-indigo-400 text-xs font-mono tracking-widest">MODELION CURRICULUM</p>
            <h1 className="text-3xl font-black mt-1">学習ロードマップ</h1>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              データエンジニアリングを 5 つのレベルで体系的に学びます。各レベルは
              <span className="text-slate-200 font-bold">「知識（Skill）→ 実践（Quest）→ 障害対応（Debug）」</span>
              の順に進み、終えると各レベルの「できるようになること」が身につく設計です。
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">全体の進捗</span>
              <span className="font-mono text-slate-300">{overall.done} / {overall.total}（{overallPct}%）</span>
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full rounded-full bg-indigo-500 transition-all duration-700" style={{ width: `${overallPct}%` }} />
            </div>
          </div>
        </header>

        {/* レベル一覧 */}
        <ol className="relative space-y-6 border-l border-slate-800 ml-3">
          {ROADMAP.map((level, i) => {
            const stat = levelStats[i];
            const complete = stat.total > 0 && stat.done === stat.total;
            const isCurrent = i === currentLevelIdx && !complete;
            return (
              <li key={level.level} className="pl-6 relative">
                <span
                  className="absolute -left-[13px] top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black"
                  style={{
                    borderColor: level.accent,
                    background: complete ? level.accent : '#080918',
                    color: complete ? '#080918' : level.accent,
                    boxShadow: isCurrent ? `0 0 14px ${level.accent}` : 'none',
                  }}
                >
                  {complete ? '✓' : level.level}
                </span>

                <section
                  className="rounded-2xl border p-5 space-y-4"
                  style={{ borderColor: isCurrent ? `${level.accent}80` : 'rgba(30,41,59,1)', background: 'rgba(15,23,42,0.55)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-mono" style={{ color: level.accent }}>
                        Lv.{level.level}{isCurrent && ' · いまここ'}
                      </p>
                      <h2 className="text-xl font-black">{level.title}</h2>
                    </div>
                    <span className="text-xs font-mono text-slate-500">{stat.done} / {stat.total}</span>
                  </div>

                  <div className="rounded-xl px-4 py-3 text-sm leading-relaxed" style={{ background: `${level.accent}12`, border: `1px solid ${level.accent}30` }}>
                    <span className="font-bold" style={{ color: level.accent }}>できるようになること：</span>
                    <span className="text-slate-200">{level.goal}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {level.concepts.map(c => (
                      <span key={c} className="text-[11px] px-2 py-0.5 rounded-md border border-slate-700 text-slate-400">{c}</span>
                    ))}
                  </div>

                  <ul className="space-y-2">
                    {level.items.map((item, j) => {
                      const ip = itemProgress(item, progress);
                      const link = itemLink(item, progress);
                      const itemDone = ip !== null && ip.total > 0 && ip.done === ip.total;
                      const body = (
                        <div className="flex items-center gap-3">
                          <span
                            className="text-[10px] font-mono font-bold w-12 flex-shrink-0 text-center py-0.5 rounded"
                            style={{
                              color: item.kind === 'coming_soon' ? '#64748B' : level.accent,
                              background: item.kind === 'coming_soon' ? 'rgba(51,65,85,0.3)' : `${level.accent}18`,
                            }}
                          >
                            {KIND_LABEL[item.kind]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm font-bold truncate ${item.kind === 'coming_soon' ? 'text-slate-500' : 'text-slate-100'}`}>
                              {link?.title ?? (item.kind === 'coming_soon' ? item.label : '')}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {link?.description ?? (item.kind === 'coming_soon' ? item.description : '')}
                            </p>
                          </div>
                          <span className="text-xs font-mono flex-shrink-0 text-slate-500">
                            {itemDone ? <span className="text-green-400">✓</span> : ip ? `${ip.done}/${ip.total}` : item.kind === 'coming_soon' ? '準備中' : '→'}
                          </span>
                        </div>
                      );
                      return (
                        <li key={j}>
                          {link ? (
                            <Link href={link.href} className="block rounded-xl border border-slate-800 hover:border-slate-600 bg-slate-950/40 px-3 py-2.5 transition-colors">
                              {body}
                            </Link>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-800 px-3 py-2.5">{body}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </li>
            );
          })}
        </ol>
      </div>
    </main>
  );
}
