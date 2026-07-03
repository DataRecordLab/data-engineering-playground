'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ALL_SECTIONS } from '@/lib/skills';
import { getSkillProgress, getUserProgress } from '@/lib/supabase/progress';
import type { SkillSection, SkillLesson } from '@/types';

// スキルセクション → 関連クエストステージのマッピング
const SECTION_STAGE_MAP: Record<string, { stageId: string; questId: string }> = {
  'pipeline-basics': { stageId: 'pipeline', questId: 'ec-site' },
  'data-modeling':   { stageId: 'warehouse', questId: 'ec-site' },
  'data-quality':    { stageId: 'staging', questId: 'ec-site' },
};

// ── 進捗マップ型 ──────────────────────────────────────────────────────

interface CompletedMap {
  [key: string]: { xp: number; stars: number };
}

// ── パスのジグザグ位置 ────────────────────────────────────────────────

const PATH_POSITIONS = [
  'mx-auto',
  'ml-[15%]',
  'mx-auto',
  'mr-[15%] ml-auto',
  'mx-auto',
];

// ── レッスンノード ────────────────────────────────────────────────────

function LessonNode({
  lesson,
  sectionId,
  accent,
  status,
  posClass,
  isFirst,
}: {
  lesson: SkillLesson;
  sectionId: string;
  accent: string;
  status: 'completed' | 'current' | 'locked';
  posClass: string;
  isFirst: boolean;
}) {
  const isLocked = status === 'locked';
  const isDone = status === 'completed';
  const isCurrent = status === 'current';

  return (
    <div className={`flex flex-col items-center ${posClass} relative`} style={{ width: 120 }}>
      {!isFirst && (
        <div
          className="w-0.5 h-6 mb-1"
          style={{ background: isDone ? accent : 'rgba(51,65,85,0.4)' }}
        />
      )}

      {isLocked ? (
        <div
          className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl"
          style={{ borderColor: 'rgba(51,65,85,0.3)', background: 'rgba(15,23,42,0.8)', color: '#1e3a5f' }}
        >
          🔒
        </div>
      ) : (
        <Link
          href={`/skills/${sectionId}/${lesson.id}`}
          className="w-16 h-16 rounded-full border-2 flex items-center justify-center text-2xl transition-all hover:scale-110 relative"
          style={{
            borderColor: isDone ? accent : isCurrent ? accent : 'rgba(51,65,85,0.5)',
            background: isDone ? `${accent}22` : isCurrent ? `${accent}15` : 'rgba(15,23,42,0.8)',
            boxShadow: isCurrent ? `0 0 16px ${accent}40` : 'none',
          }}
        >
          {isDone ? '✓' : lesson.icon}
          {isCurrent && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ background: accent }}
            />
          )}
        </Link>
      )}

      <div className="mt-2 text-center">
        <p
          className="text-[11px] font-semibold leading-tight"
          style={{ color: isDone ? '#94a3b8' : isCurrent ? 'white' : '#1e3a5f' }}
        >
          {lesson.title.length > 12 ? lesson.title.slice(0, 12) + '…' : lesson.title}
        </p>
        {isDone && (
          <p className="text-[9px] text-indigo-400 font-mono mt-0.5">✓ 完了</p>
        )}
      </div>
    </div>
  );
}

// ── セクションブロック ────────────────────────────────────────────────

function SectionBlock({
  section,
  completed,
  sectionIdx,
  prevSectionDone,
  questStars,
}: {
  section: SkillSection;
  completed: CompletedMap;
  sectionIdx: number;
  prevSectionDone: boolean;
  questStars: Record<string, number>;
}) {
  const totalInSection = section.lessons.length;
  const completedInSection = section.lessons.filter(l => completed[`${section.id}/${l.id}`]).length;
  const sectionDone = completedInSection >= totalInSection;
  const sectionUnlocked = sectionIdx === 0 || prevSectionDone;

  function getLessonStatus(lessonIdx: number): 'completed' | 'current' | 'locked' {
    if (!sectionUnlocked) return 'locked';
    const key = `${section.id}/${section.lessons[lessonIdx].id}`;
    if (completed[key]) return 'completed';
    const prevKey = lessonIdx === 0 ? null : `${section.id}/${section.lessons[lessonIdx - 1].id}`;
    if (lessonIdx === 0) return 'current';
    if (prevKey && completed[prevKey]) return 'current';
    return 'locked';
  }

  return (
    <div className="mb-4">
      {/* セクションヘッダー */}
      <div
        className="rounded-2xl border mx-4 mb-6 px-5 py-4 flex items-center justify-between"
        style={{
          background: section.bg,
          borderColor: `${section.accent}${sectionUnlocked ? '30' : '10'}`,
          opacity: sectionUnlocked ? 1 : 0.45,
        }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{section.icon}</span>
          <div>
            <p className="font-black text-white text-sm">{section.title}</p>
            <p className="text-slate-500 text-xs mt-0.5 max-w-[160px] truncate">{section.description}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {sectionUnlocked ? (
            <>
              <p className="text-[10px] font-mono" style={{ color: section.accent }}>
                {completedInSection}/{totalInSection}
              </p>
              <div className="w-12 h-1 rounded-full bg-slate-800 overflow-hidden mt-1">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedInSection / totalInSection) * 100}%`, background: section.accent }}
                />
              </div>
              {sectionDone && (
                <p className="text-[9px] mt-1" style={{ color: section.accent }}>✓ 完了</p>
              )}
            </>
          ) : (
            <p className="text-[10px] text-slate-700 font-mono">🔒 前のセクションを完了</p>
          )}
        </div>
      </div>

      {/* レッスンノード群 */}
      <div className="flex flex-col items-center gap-1 pb-4">
        {section.lessons.map((lesson, lessonIdx) => (
          <LessonNode
            key={lesson.id}
            lesson={lesson}
            sectionId={section.id}
            accent={section.accent}
            status={getLessonStatus(lessonIdx)}
            posClass={PATH_POSITIONS[lessonIdx % PATH_POSITIONS.length]}
            isFirst={lessonIdx === 0}
          />
        ))}
      </div>

      {/* セクション完了後のQuestアップセル */}
      {sectionDone && section.upsell && (() => {
        const mapped = SECTION_STAGE_MAP[section.id];
        const stars = mapped ? (questStars[mapped.stageId] ?? 0) : 0;
        const questDone = stars > 0;
        return (
          <div
            className="mx-4 mb-4 rounded-xl border px-4 py-3.5"
            style={questDone
              ? { background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }
              : { background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }
            }
          >
            {questDone ? (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-green-400 text-xs font-bold flex items-center gap-1.5">
                    <span>✓ クエスト実践済み</span>
                    <span className="flex">
                      {[1,2,3].map(n => (
                        <span key={n} className={`text-[10px] ${n <= stars ? 'text-yellow-400' : 'text-slate-700'}`}>★</span>
                      ))}
                    </span>
                  </p>
                  <p className="text-slate-500 text-xs mt-0.5">クエストでスキルを実践できました！さらに高得点を狙おう</p>
                </div>
                <Link
                  href={`/quest/${section.upsell.questId}/${mapped?.stageId ?? ''}`}
                  className="flex-shrink-0 px-3 py-2 rounded-lg bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 font-bold text-[10px] transition-colors whitespace-nowrap"
                >
                  再挑戦 →
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-amber-400 text-xs font-bold">🎯 実践クエストで試す</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{section.upsell.message}</p>
                </div>
                <Link
                  href={`/quest/${section.upsell.questId}`}
                  className="flex-shrink-0 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold text-[10px] transition-colors whitespace-nowrap"
                >
                  試す →
                </Link>
              </div>
            )}
          </div>
        );
      })()}

      {/* セクション区切り */}
      <div className="flex items-center gap-3 mx-8 mt-4">
        <div className="flex-1 h-px bg-slate-800" />
        <span className="text-slate-700 text-[10px] font-mono">NEXT</span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>
    </div>
  );
}

// ── ページ本体 ────────────────────────────────────────────────────────

export default function SkillsPage() {
  const [completed, setCompleted] = useState<CompletedMap>({});
  const [skillXp, setSkillXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [questStars, setQuestStars] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([
      getSkillProgress(),
      getUserProgress('ec-site'),
    ]).then(([skillRows, questRows]) => {
      const map: CompletedMap = {};
      let xp = 0;
      for (const row of skillRows) {
        map[`${row.section_id}/${row.lesson_id}`] = { xp: row.xp_earned, stars: row.stars };
        xp += row.xp_earned;
      }
      setCompleted(map);
      setSkillXp(xp);
      const stars: Record<string, number> = {};
      for (const row of questRows) {
        stars[row.stage] = row.stars;
      }
      setQuestStars(stars);
      setLoading(false);
    });
  }, []);

  const totalLessons = ALL_SECTIONS.reduce((acc, s) => acc + s.lessons.length, 0);
  const completedCount = Object.keys(completed).length;

  return (
    <div className="min-h-screen bg-[#060918] text-white">

      {/* ヘッダー */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">
            ← ダッシュボード
          </Link>
          <span className="text-slate-800">|</span>
          <span className="font-black text-sm">
            <span className="text-indigo-400">◈</span> スキルパス
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-slate-500">{completedCount}/{totalLessons} レッスン完了</p>
            <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden mt-0.5">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                style={{ width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-indigo-400 text-xs font-black">{skillXp}</span>
            <span className="text-slate-600 text-[10px]">Skill XP</span>
          </div>
        </div>
      </header>

      {/* イントロ */}
      <div className="px-4 py-6 text-center border-b border-slate-900">
        <h1 className="text-2xl font-black text-white mb-1">データエンジニアリング スキルパス</h1>
        <p className="text-slate-500 text-sm">ゲームしながら学ぶ。各レッスン5〜10分。進捗はクラウドに保存されます。</p>
      </div>

      {/* ローディング */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-600 text-sm animate-pulse">進捗を読み込み中...</div>
        </div>
      ) : (
        <div className="py-6 max-w-sm mx-auto">
          {ALL_SECTIONS.map((section, sectionIdx) => {
            const prevSection = sectionIdx > 0 ? ALL_SECTIONS[sectionIdx - 1] : null;
            const prevSectionDone = prevSection
              ? prevSection.lessons.every(l => completed[`${prevSection.id}/${l.id}`])
              : true;

            return (
              <SectionBlock
                key={section.id}
                section={section}
                completed={completed}
                sectionIdx={sectionIdx}
                prevSectionDone={prevSectionDone}
                questStars={questStars}
              />
            );
          })}

          <div className="text-center px-6 py-8 space-y-3">
            <p className="text-slate-700 text-sm">さらに多くのスキルが近日追加予定</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-white text-sm transition-colors"
            >
              クエストで実践する →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
