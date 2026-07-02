'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getLesson, getLessonIndex, ALL_SECTIONS } from '@/lib/skills';
import { LessonPlayer } from '@/components/skills/LessonPlayer';
import { GameOverOverlay } from '@/components/stage/GameOverOverlay';
import { useGameStore } from '@/lib/store/gameStore';
import { saveSkillProgress } from '@/lib/supabase/progress';
import { completeDailyMission } from '@/lib/daily/missions';

type Phase = 'play' | 'complete';

function HpHearts({ hp, maxHp }: { hp: number; maxHp: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: maxHp }).map((_, i) => (
        <span key={i} className={`text-sm leading-none ${i < hp ? 'text-red-500' : 'text-slate-700'}`}>
          {i < hp ? '❤' : '♡'}
        </span>
      ))}
    </div>
  );
}

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.sectionId as string;
  const lessonId = params.lessonId as string;

  const result = getLesson(sectionId, lessonId);
  const { sectionIdx, lessonIdx } = getLessonIndex(sectionId, lessonId);

  const { hp, maxHp, damageFlash, recoverAll, resetFlash } = useGameStore();
  const [phase, setPhase] = useState<Phase>('play');
  const [gameOver, setGameOver] = useState(false);
  const [earnedXp, setEarnedXp] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // HP初期化
  useEffect(() => { recoverAll(); }, [recoverAll]);

  // ダメージフラッシュクリア
  useEffect(() => {
    if (!damageFlash) return;
    const t = setTimeout(resetFlash, 400);
    return () => clearTimeout(t);
  }, [damageFlash, resetFlash]);

  // HP=0 → ゲームオーバー
  useEffect(() => {
    if (hp === 0 && !damageFlash && !gameOver && phase === 'play') {
      setTimeout(() => setGameOver(true), 300);
    }
  }, [hp, damageFlash, gameOver, phase]);

  async function handleComplete(xp: number, correct: number) {
    setEarnedXp(xp);
    setCorrectCount(correct);
    const total = result?.lesson.questions.length ?? 1;
    const stars = correct >= total ? 3 : correct >= Math.ceil(total * 0.7) ? 2 : 1;
    await saveSkillProgress({ sectionId, lessonId, xpEarned: xp, stars });
    completeDailyMission('skill_lesson');
    setPhase('complete');
  }

  function handleRetry() {
    setGameOver(false);
    recoverAll();
    // ページをリロードしてレッスンをリセット
    router.refresh();
    setPhase('play');
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <p className="text-slate-400">レッスンが見つかりません</p>
          <Link href="/skills" className="text-indigo-400 hover:text-indigo-300 text-sm">← スキル一覧へ</Link>
        </div>
      </div>
    );
  }

  const { section, lesson } = result;
  const totalQuestions = lesson.questions.length;
  const starCount = correctCount >= totalQuestions ? 3 : correctCount >= Math.ceil(totalQuestions * 0.7) ? 2 : 1;

  // 次のレッスン
  const nextLesson = section.lessons[lessonIdx + 1];
  const nextSection = lessonIdx + 1 >= section.lessons.length ? ALL_SECTIONS[sectionIdx + 1] : null;

  return (
    <div className="flex flex-col h-screen bg-[#080918] text-white">

      {/* ヘッダー */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 flex-shrink-0 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <Link href="/skills" className="text-slate-600 hover:text-slate-400 transition-colors">
            <span className="text-lg">✕</span>
          </Link>
          <div className="flex-1 h-2 w-48 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: phase === 'complete' ? '100%' : '0%' }}
            />
          </div>
        </div>
        <HpHearts hp={hp} maxHp={maxHp} />
      </header>

      {/* レッスン情報バー */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-900 flex-shrink-0" style={{ background: section.bg }}>
        <span className="text-base">{lesson.icon}</span>
        <span className="text-xs font-medium text-slate-400">{section.title}</span>
        <span className="text-slate-700 text-xs">›</span>
        <span className="text-xs font-semibold text-white">{lesson.title}</span>
      </div>

      {/* メイン */}
      <div className="flex-1 overflow-hidden">
        {phase === 'play' && (
          <LessonPlayer lesson={lesson} onComplete={handleComplete} />
        )}

        {phase === 'complete' && (
          <div className="flex-1 overflow-y-auto h-full">
            <div className="max-w-md mx-auto px-5 py-10 space-y-7 text-center">

              {/* スター */}
              <div>
                <div className="flex justify-center gap-2 mb-3">
                  {[1, 2, 3].map(n => (
                    <span
                      key={n}
                      className="text-4xl transition-all"
                      style={{ color: n <= starCount ? '#FBBF24' : '#1e293b', filter: n <= starCount ? 'drop-shadow(0 0 8px rgba(251,191,36,0.5))' : 'none' }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <h2 className="text-2xl font-black text-white">レッスン完了！</h2>
                <p className="text-slate-400 text-sm mt-1">{lesson.title}</p>
              </div>

              {/* スコア */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <p className="text-indigo-400 text-2xl font-black">+{earnedXp}</p>
                  <p className="text-slate-500 text-xs mt-1">XP 獲得</p>
                </div>
                <div className="rounded-xl bg-slate-900 border border-slate-800 p-4">
                  <p className="text-green-400 text-2xl font-black">{correctCount}/{totalQuestions}</p>
                  <p className="text-slate-500 text-xs mt-1">正解数</p>
                </div>
              </div>

              {/* Quest アップセル */}
              {section.upsell && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-left space-y-2">
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-wider">🎯 実践してみよう</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{section.upsell.message}</p>
                  <Link
                    href={`/quest/${section.upsell.questId}`}
                    className="block w-full text-center py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 font-bold text-xs transition-colors mt-2"
                  >
                    {section.upsell.label}
                  </Link>
                </div>
              )}

              {/* ナビゲーション */}
              <div className="space-y-2.5">
                {nextLesson ? (
                  <Link
                    href={`/skills/${sectionId}/${nextLesson.id}`}
                    className="block w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-[1.02]"
                  >
                    次のレッスン: {nextLesson.title} →
                  </Link>
                ) : nextSection ? (
                  <Link
                    href={`/skills/${nextSection.id}/${nextSection.lessons[0].id}`}
                    className="block w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-[1.02]"
                  >
                    次のセクション: {nextSection.title} →
                  </Link>
                ) : (
                  <Link
                    href="/skills"
                    className="block w-full py-3.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-sm transition-all"
                  >
                    🎉 全レッスン完了！スキル一覧へ
                  </Link>
                )}
                <Link
                  href="/skills"
                  className="block w-full py-3 rounded-xl border border-slate-800 text-slate-500 hover:text-white text-sm transition-colors text-center"
                >
                  スキル一覧に戻る
                </Link>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* ゲームオーバー */}
      {gameOver && <GameOverOverlay onRetry={handleRetry} />}
    </div>
  );
}
