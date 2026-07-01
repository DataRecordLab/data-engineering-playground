'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { UnifiedPipelineCanvas } from '@/components/pipeline/UnifiedPipelineCanvasLazy';
import { getQuest } from '@/lib/scenarios';
import { registerCsvFile } from '@/lib/duckdb/engine';
import { saveStageProgress, getUserProgress } from '@/lib/supabase/progress';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { PIPELINE_STAGES } from '@/components/pipeline/UnifiedPipelineCanvas';
import type { QuestId } from '@/types';

export default function PipelineCanvasPage() {
  const params = useParams();
  const questId = params.questId as QuestId;
  const quest = getQuest(questId);

  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [xpLog, setXpLog] = useState<{ stageId: string; xp: number }[]>([]);
  const [totalXp, setTotalXp] = useState(0);
  const [allDone, setAllDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // 既存の進捗をロード
  useEffect(() => {
    if (!quest || !isSupabaseConfigured()) { setLoaded(true); return; }
    getUserProgress(quest.id).then(rows => {
      const done = rows
        .filter(r => r.status === 'completed' && PIPELINE_STAGES.some(s => s.id === r.stage))
        .map(r => r.stage);
      setCompletedIds(done);
      setLoaded(true);
    });
  }, [quest]);

  const csvSetup = useCallback(async () => {
    if (!quest) return;
    await Promise.all(quest.csvFiles.map(csv => registerCsvFile(csv.name, csv.content)));
  }, [quest]);

  async function handleStageComplete(stageId: string, xp: number) {
    setXpLog(prev => [...prev, { stageId, xp }]);
    setTotalXp(prev => prev + xp);

    if (isSupabaseConfigured() && quest) {
      try {
        await saveStageProgress({
          questId: quest.id,
          stageId: stageId as 'source' | 'staging' | 'warehouse' | 'mart',
          stars: 3,
          xpEarned: xp,
          sql: '',
        });
      } catch (e) {
        console.error('[PipelineCanvas] saveStageProgress error:', e);
      }
    }
  }

  function handleAllComplete() {
    setAllDone(true);
  }

  if (!quest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        <p className="text-slate-500">クエストが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#060918] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/60 bg-slate-950/90 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/quest/${questId}`}
            className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            ← {quest.clientName}
          </Link>
          <span className="text-slate-800">|</span>
          <div className="flex items-center gap-2">
            <span className="text-blue-400 font-bold text-sm">◈</span>
            <span className="text-white font-bold text-sm">パイプライン設計 & 実装</span>
            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-400 font-medium border border-blue-500/20">
              Canvas Mode
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* XP log */}
          {xpLog.length > 0 && (
            <div className="flex items-center gap-1.5">
              {xpLog.slice(-3).map(({ stageId, xp }) => {
                const stage = PIPELINE_STAGES.find(s => s.id === stageId);
                return (
                  <span
                    key={stageId}
                    className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                    style={{
                      color: stage?.color,
                      borderColor: `${stage?.color}40`,
                      background: `${stage?.color}12`,
                    }}
                  >
                    +{xp} XP
                  </span>
                );
              })}
            </div>
          )}
          {totalXp > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-yellow-500/30 bg-yellow-500/8">
              <span className="text-yellow-400 font-black text-sm">{totalXp}</span>
              <span className="text-yellow-600 text-[10px]">XP</span>
            </div>
          )}

          {/* Quest info */}
          <div className="text-right">
            <p className="text-slate-400 text-[10px] font-medium">{quest.title}</p>
            <p className="text-slate-600 text-[9px]">{quest.difficulty === 'beginner' ? '初級' : quest.difficulty === 'intermediate' ? '中級' : '上級'}</p>
          </div>
        </div>
      </header>

      {/* All done banner */}
      {allDone && (
        <div
          className="flex items-center justify-between px-5 py-3 border-b border-emerald-500/20 flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #10b98108 0%, #10b98114 50%, #10b98108 100%)' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎉</span>
            <div>
              <p className="text-emerald-400 font-black text-sm">パイプライン完成！ShopNow CTOへの報告準備ができました</p>
              <p className="text-slate-500 text-xs">生データ → Source → Staging → Warehouse → Mart まで全レイヤー実装完了</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
          >
            ダッシュボードへ →
          </Link>
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        {!loaded ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            <div className="text-center space-y-3">
              <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
              <p>進捗を読み込み中...</p>
            </div>
          </div>
        ) : (
          <UnifiedPipelineCanvas
            csvSetup={csvSetup}
            onStageComplete={handleStageComplete}
            onAllComplete={handleAllComplete}
            initialCompleted={completedIds}
          />
        )}
      </div>

      {/* Bottom concept strip */}
      <div className="flex-shrink-0 border-t border-slate-800/40 bg-slate-950/60 px-4 py-2">
        <div className="flex items-center gap-6">
          {PIPELINE_STAGES.map((stage, i) => (
            <div key={stage.id} className="flex items-center gap-2">
              {i > 0 && <div className="w-4 h-px bg-slate-800" />}
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ background: completedIds.includes(stage.id) ? stage.color : '#1e293b' }}
                />
                <span
                  className="text-[10px] font-medium"
                  style={{ color: completedIds.includes(stage.id) ? stage.color : '#475569' }}
                >
                  {stage.label}
                </span>
              </div>
            </div>
          ))}
          <div className="ml-auto text-[10px] text-slate-700">
            ELT パイプライン · DuckDB WASM
          </div>
        </div>
      </div>
    </div>
  );
}
