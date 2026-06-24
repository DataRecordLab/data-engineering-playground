'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuest } from '@/lib/scenarios';
import { registerCsvFile, runSQL, querySQL } from '@/lib/duckdb/engine';
import { runValidation } from '@/lib/duckdb/validate';
import { TransformEditor } from '@/components/stage/TransformEditor';
import { DataPreview } from '@/components/stage/DataPreview';
import { StageCompleteOverlay } from '@/components/stage/StageCompleteOverlay';
import { QuestPipelineDesigner } from '@/components/pipeline/QuestPipelineDesigner';
import { saveStageProgress } from '@/lib/supabase/progress';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import type { QuestId, StageId, QueryResult } from '@/types';
import type { ValidationResult } from '@/lib/duckdb/validate';

function isSelectStatement(sql: string): boolean {
  const firstCode = sql.split('\n').find(l => l.trim() && !l.trim().startsWith('--'));
  return firstCode?.trim().toUpperCase().startsWith('SELECT') ?? false;
}

function splitStatements(sql: string): string[] {
  return sql
    .split(/;[ \t]*(?:\n|$)/)
    .map(s => s.trim())
    .filter(s => {
      const nonComment = s.replace(/--.*$/gm, '').trim();
      return nonComment.length > 0;
    });
}

function renderMission(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/`(.*?)`/g, '<code class="text-green-400 bg-slate-800 px-1 rounded text-xs font-mono">$1</code>');
}

interface CompletionData {
  stars: number;
  xpEarned: number;
  badgeId?: string;
}

export default function StagePage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.questId as QuestId;
  const stageId = params.stage as StageId;

  const quest = getQuest(questId);
  const stageIndex = quest?.stages.findIndex(s => s.id === stageId) ?? -1;
  const stage = stageIndex >= 0 ? quest?.stages[stageIndex] : undefined;
  const nextStage = quest?.stages[stageIndex + 1];
  const isLastStage = stageIndex === (quest?.stages.length ?? 0) - 1;

  const [sql, setSql] = useState(stage?.initialTransform ?? '');
  const [isRunning, setIsRunning] = useState(false);
  const [execLog, setExecLog] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [previewResult, setPreviewResult] = useState<QueryResult | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [completion, setCompletion] = useState<CompletionData | null>(null);

  useEffect(() => {
    setSql(stage?.initialTransform ?? '');
    setExecLog([]);
    setValidationResults([]);
    setPreviewResult(null);
    setCompletion(null);
  }, [stageId, stage?.initialTransform]);

  useEffect(() => {
    if (!quest) return;
    Promise.all(quest.csvFiles.map(csv => registerCsvFile(csv.name, csv.content)))
      .then(() => setDbReady(true))
      .catch(e => console.error('DuckDB init failed:', e));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quest?.id]);

  const allPassed = validationResults.length > 0 && validationResults.every(r => r.passed);

  const handleCompletion = async (userSql: string, stars: number) => {
    if (!stage || !quest) return;
    const xpKey = `star${Math.max(1, Math.min(3, stars))}` as 'star1' | 'star2' | 'star3';
    const xpEarned = stage.xpReward[xpKey];

    if (isSupabaseConfigured()) {
      await saveStageProgress({
        questId: quest.id,
        stageId: stage.id,
        stars,
        xpEarned,
        sql: userSql,
        badgeId: stage.badgeId,
      });
    }

    setCompletion({ stars, xpEarned, badgeId: stage.badgeId });
  };

  const handleRun = async () => {
    if (!stage || !quest || isRunning) return;
    setIsRunning(true);
    setValidationResults([]);
    setPreviewResult(null);
    setCompletion(null);

    const statements = splitStatements(sql);
    const log: string[] = [`▶ ${statements.length} 文を実行します`];
    setExecLog([...log]);

    let hasError = false;
    let lastSelectResult: QueryResult | null = null;

    for (const stmt of statements) {
      const firstLine = stmt.split('\n')[0];
      const preview = firstLine.length > 72 ? firstLine.slice(0, 69) + '...' : firstLine;
      log.push(`  ▷ ${preview}`);
      setExecLog([...log]);

      try {
        if (isSelectStatement(stmt)) {
          const r = await querySQL(stmt);
          if (r.error) {
            log.push(`  ✗ ${r.error}`);
            hasError = true;
            break;
          }
          lastSelectResult = r;
          log.push(`    ✓ ${r.rowCount} 行取得`);
        } else {
          await runSQL(stmt);
          log.push('    ✓ 完了');
        }
      } catch (e) {
        log.push(`  ✗ ${String(e).slice(0, 120)}`);
        hasError = true;
        break;
      }
      setExecLog([...log]);
    }

    if (!hasError) {
      log.push('');
      log.push('  バリデーション実行中...');
      setExecLog([...log]);

      const results = await runValidation(stage.validation);
      setValidationResults(results);

      const passed = results.every(r => r.passed);

      if (passed) {
        log.push('  ✓ 全項目クリア！');
        const mainTable = stage.validation.find(r => r.type === 'table_exists')?.table;
        if (mainTable) {
          const preview = await querySQL(`SELECT * FROM ${mainTable} LIMIT 10`);
          setPreviewResult(preview);
        } else if (lastSelectResult) {
          setPreviewResult(lastSelectResult);
        }
        await handleCompletion(sql, 2);
      } else {
        const failCount = results.filter(r => !r.passed).length;
        log.push(`  ✗ ${failCount} 件のチェックに失敗`);
        if (lastSelectResult) setPreviewResult(lastSelectResult);
      }
    }

    setExecLog([...log]);
    setIsRunning(false);
  };

  const handleNext = () => {
    setCompletion(null);
    if (nextStage) {
      router.push(`/quest/${questId}/${nextStage.id}`);
    } else {
      router.push('/dashboard');
    }
  };

  if (!quest || !stage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white text-sm">
        ステージが見つかりません
      </div>
    );
  }

  // ── Pipeline design stage ──────────────────────────────────────────────────
  if (stage.type === 'pipeline' && stage.pipelineConfig) {
    const { layers, requiredConnections } = stage.pipelineConfig;
    return (
      <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
        {completion && (
          <StageCompleteOverlay
            stars={completion.stars}
            xpEarned={completion.xpEarned}
            badgeId={completion.badgeId}
            nextLabel={`次へ: ${nextStage?.title} →`}
            onNext={handleNext}
          />
        )}
        <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 flex-shrink-0">
          <Link href={`/quest/${questId}`} className="text-slate-500 hover:text-white text-sm transition-colors">
            ← {quest.clientName}
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-300 text-sm font-medium">{stage.title}</span>
        </header>
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-48 border-r border-slate-800 bg-slate-900/60 flex-shrink-0 overflow-y-auto">
            <div className="p-3">
              <p className="text-xs text-slate-600 uppercase tracking-wider mb-3 font-medium px-1">パイプライン</p>
              <nav className="space-y-1">
                {quest.stages.map((s, i) => {
                  const isCurrent = s.id === stageId;
                  const isPast = i < stageIndex;
                  return (
                    <Link
                      key={s.id}
                      href={`/quest/${questId}/${s.id}`}
                      className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                        isCurrent ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                        : isPast ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:bg-slate-800'
                      }`}
                    >
                      <span className="mt-0.5 flex-shrink-0 font-mono text-xs">{isPast ? '✓' : isCurrent ? '▷' : `${i + 1}`}</span>
                      <span className="leading-snug">{s.title}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
          {/* Center: mission */}
          <div className="w-72 border-r border-slate-800 overflow-y-auto flex-shrink-0">
            <div className="p-5 space-y-4">
              <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 uppercase tracking-wider mb-1 font-medium">今日学ぶ概念</p>
                <p className="text-white text-sm font-medium leading-relaxed">{stage.conceptTaught}</p>
              </div>
              {stage.storyMessage && (
                <div className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700">
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{stage.storyMessage}</p>
                </div>
              )}
              <div className="px-4 py-3 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">ミッション</p>
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{stage.missionText}</p>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-500 mb-1 font-medium">ヒント</p>
                <p className="text-amber-300/90 text-xs leading-relaxed">{stage.hintText}</p>
              </div>
            </div>
          </div>
          {/* Right: pipeline canvas */}
          <div className="flex-1 overflow-hidden">
            <QuestPipelineDesigner
              layers={layers}
              requiredConnections={requiredConnections}
              onComplete={() => handleCompletion('', 2)}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Transform (SQL) stage ───────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-white overflow-hidden">
      {completion && (
        <StageCompleteOverlay
          stars={completion.stars}
          xpEarned={completion.xpEarned}
          badgeId={completion.badgeId}
          nextLabel={isLastStage ? 'クエスト完了！ → ダッシュボードへ' : `次へ: ${nextStage?.title} →`}
          onNext={handleNext}
        />
      )}

      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-slate-800 flex-shrink-0">
        <Link
          href={`/quest/${questId}`}
          className="text-slate-500 hover:text-white text-sm transition-colors"
        >
          ← {quest.clientName}
        </Link>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300 text-sm font-medium">{stage.title}</span>
        {!dbReady && (
          <span className="ml-auto text-xs text-slate-600 flex items-center gap-1">
            <span className="animate-spin inline-block">⟳</span>
            DuckDB 初期化中...
          </span>
        )}
      </header>

      {/* 3-panel layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left: Stage progress sidebar */}
        <aside className="w-48 border-r border-slate-800 bg-slate-900/60 flex-shrink-0 overflow-y-auto">
          <div className="p-3">
            <p className="text-xs text-slate-600 uppercase tracking-wider mb-3 font-medium px-1">
              パイプライン
            </p>
            <nav className="space-y-1">
              {quest.stages.map((s, i) => {
                const isCurrent = s.id === stageId;
                const isPast = i < stageIndex;
                return (
                  <Link
                    key={s.id}
                    href={`/quest/${questId}/${s.id}`}
                    className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                      isCurrent
                        ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                        : isPast
                        ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        : 'text-slate-600 hover:bg-slate-800 hover:text-slate-400'
                    }`}
                  >
                    <span className="mt-0.5 flex-shrink-0 font-mono text-xs">
                      {isPast ? '✓' : isCurrent ? '▷' : `${i + 1}`}
                    </span>
                    <span className="leading-snug">{s.title}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Center: Main stage content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4 max-w-2xl">
            {/* Concept card */}
            <div className="px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400 uppercase tracking-wider mb-1 font-medium">
                今日学ぶ概念
              </p>
              <p className="text-white text-sm font-medium leading-relaxed">
                {stage.conceptTaught}
              </p>
            </div>

            {/* Story message */}
            {stage.storyMessage && (
              <div className="px-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700">
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {stage.storyMessage}
                </p>
              </div>
            )}

            {/* Mission */}
            <div className="px-4 py-3 rounded-xl border border-slate-700">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                ミッション
              </p>
              <div
                className="text-slate-300 text-sm leading-relaxed whitespace-pre-line"
                dangerouslySetInnerHTML={{ __html: renderMission(stage.missionText) }}
              />
            </div>

            {/* SQL Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  SQL エディタ
                </p>
                <button
                  onClick={() => setSql(stage.initialTransform ?? '')}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  リセット
                </button>
              </div>
              <TransformEditor value={sql} onChange={setSql} height={280} />
            </div>

            {/* Run button */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRun}
                disabled={isRunning || !dbReady}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium transition-colors"
              >
                {isRunning ? (
                  <>
                    <span className="animate-spin">⟳</span>
                    実行中...
                  </>
                ) : (
                  '▶ 実行'
                )}
              </button>
              {allPassed && (
                <span className="text-green-400 text-sm font-medium">✓ バリデーション通過！</span>
              )}
            </div>

            {/* Exec log */}
            {execLog.length > 0 && (
              <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 font-mono text-xs max-h-36 overflow-y-auto">
                {execLog.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.includes('✗') ? 'text-red-400' :
                      line.includes('✓') ? 'text-green-400' :
                      line.startsWith('▶') ? 'text-slate-300 font-medium' :
                      'text-slate-500'
                    }
                  >
                    {line || ' '}
                  </div>
                ))}
              </div>
            )}

            {/* Validation results */}
            {validationResults.length > 0 && (
              <div className="rounded-xl border border-slate-700 overflow-hidden">
                <div className="px-4 py-2 bg-slate-800/80 flex items-center justify-between border-b border-slate-700">
                  <p className="text-xs font-medium text-slate-400">バリデーション</p>
                  <span
                    className={`text-xs font-medium ${allPassed ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {allPassed
                      ? '✓ 全項目クリア'
                      : `${validationResults.filter(r => !r.passed).length} 件失敗`}
                  </span>
                </div>
                <div className="divide-y divide-slate-900">
                  {validationResults.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 px-4 py-2.5 bg-slate-950/40">
                      <span
                        className={`mt-0.5 flex-shrink-0 text-sm ${
                          r.passed ? 'text-green-400' : 'text-red-400'
                        }`}
                      >
                        {r.passed ? '✓' : '✗'}
                      </span>
                      <span
                        className={`text-xs leading-relaxed ${
                          r.passed ? 'text-slate-400' : 'text-red-300'
                        }`}
                      >
                        {r.detail}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right: Data preview + hint */}
        <aside className="w-80 border-l border-slate-800 flex flex-col flex-shrink-0 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Hint */}
            {!allPassed && stage.hintText && (
              <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-500 mb-1 font-medium">ヒント</p>
                <p className="text-amber-300/90 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                  {stage.hintText}
                </p>
              </div>
            )}

            {/* Data preview */}
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 font-medium">
                データプレビュー
              </p>
              <DataPreview result={previewResult} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
