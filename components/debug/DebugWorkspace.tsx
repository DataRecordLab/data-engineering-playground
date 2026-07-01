'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DebugScenario, DebugPhase, QueryResult } from '@/types';
import { querySQL, runSQL } from '@/lib/duckdb/engine';
import { saveDebugCompletion } from '@/lib/supabase/progress';

interface Props {
  scenario: DebugScenario;
}

function ResultTable({ result }: { result: QueryResult }) {
  if (result.error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
        <p className="text-red-400 text-xs font-mono whitespace-pre-wrap">{result.error}</p>
      </div>
    );
  }
  if (result.rows.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-center">
        <p className="text-slate-500 text-xs">結果なし（0行）</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/40">
      <table className="text-xs w-full">
        <thead>
          <tr className="border-b border-slate-700">
            {result.columns.map(col => (
              <th key={col} className="px-3 py-2 text-left text-slate-400 font-mono font-medium whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
              {result.columns.map(col => (
                <td key={col} className={`px-3 py-1.5 font-mono whitespace-nowrap ${
                  row[col] === null
                    ? 'text-red-400 font-bold'
                    : typeof row[col] === 'number'
                    ? 'text-emerald-400'
                    : 'text-slate-300'
                }`}>
                  {row[col] === null ? 'NULL' : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] text-slate-600">
        {result.rowCount} 行
      </div>
    </div>
  );
}

function PhaseStep({
  num,
  label,
  active,
  done,
}: {
  num: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-[10px] transition-all ${
      active ? 'text-white' : done ? 'text-slate-500' : 'text-slate-700'
    }`}>
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 transition-all ${
        done
          ? 'bg-emerald-500 text-white'
          : active
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-slate-800 text-slate-600'
      }`}>
        {done ? '✓' : num}
      </div>
      <span className="font-medium leading-tight">{label}</span>
    </div>
  );
}

const PHASE_STEPS: { phase: DebugPhase; label: string }[] = [
  { phase: 'alert', label: 'アラート確認' },
  { phase: 'investigate', label: 'データを調査' },
  { phase: 'diagnose', label: '原因を診断' },
  { phase: 'fix', label: '修正を適用' },
  { phase: 'verify', label: '結果を検証' },
  { phase: 'debrief', label: '振り返り' },
];

const PHASE_ORDER: DebugPhase[] = ['alert', 'investigate', 'diagnose', 'fix', 'verify', 'debrief'];

export function DebugWorkspace({ scenario }: Props) {
  const [phase, setPhase] = useState<DebugPhase>('alert');
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [sql, setSql] = useState('-- SQLを入力して実行してみよう\nSELECT * FROM ' + (scenario.availableTables[0] ?? 'raw_orders') + ' LIMIT 10;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [running, setRunning] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [diagnosisRevealed, setDiagnosisRevealed] = useState(false);
  const [selectedFix, setSelectedFix] = useState<string | null>(null);
  const [fixRevealed, setFixRevealed] = useState(false);
  const [verifyResult, setVerifyResult] = useState<QueryResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [completionSaved, setCompletionSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (phase === 'debrief' && !completionSaved) {
      setCompletionSaved(true);
      saveDebugCompletion(scenario.id).catch(() => {});
    }
  }, [phase, completionSaved, scenario.id]);

  useEffect(() => {
    async function initDB() {
      try {
        await runSQL(scenario.setupSQL);
        setDbReady(true);
      } catch (e) {
        setDbError(String(e));
      }
    }
    initDB();
  }, [scenario.setupSQL]);

  const runQuery = useCallback(async (sqlToRun?: string) => {
    const query = sqlToRun ?? sql;
    if (!query.trim() || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await querySQL(query);
      setResult(res);
      setQueryCount(c => c + 1);
    } finally {
      setRunning(false);
    }
  }, [sql, running]);

  const handleHint = (hintSql: string) => {
    setSql(hintSql);
    setResult(null);
  };

  const handleDiagnosis = () => {
    if (!selectedDiagnosis) return;
    setDiagnosisRevealed(true);
  };

  const handleFix = () => {
    if (!selectedFix) return;
    const option = scenario.fixOptions.find(f => f.id === selectedFix);
    if (option) {
      setSql(option.fixSQL);
      setResult(null);
    }
    setFixRevealed(true);
  };

  const handleVerify = async () => {
    setVerifying(true);
    // Re-run the correct fix first
    const correctFix = scenario.fixOptions.find(f => f.correct);
    if (correctFix) {
      await runSQL(correctFix.fixSQL).catch(() => {});
    }
    const res = await querySQL(scenario.verificationSQL);
    setVerifyResult(res);
    setVerifying(false);
    setXpAwarded(true);
  };

  const goNext = () => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < PHASE_ORDER.length - 1) {
      setPhase(PHASE_ORDER[idx + 1]);
    }
  };

  const isDone = (p: DebugPhase) => PHASE_ORDER.indexOf(p) < PHASE_ORDER.indexOf(phase);

  const selectedDiagnosisOption = scenario.diagnosisOptions.find(d => d.id === selectedDiagnosis);
  const selectedFixOption = scenario.fixOptions.find(f => f.id === selectedFix);

  // ── Alert phase ──────────────────────────────────────────────────────
  if (phase === 'alert') {
    return (
      <div className="min-h-screen bg-[#070910] text-white flex flex-col">
        <ProgressBar phase={phase} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full space-y-5">
            {/* Urgency banner */}
            <div className="flex items-center gap-3 justify-center">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-red-400 text-xs font-bold tracking-widest uppercase">
                緊急アラート受信
              </span>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            </div>

            {/* Alert card */}
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 overflow-hidden"
              style={{ boxShadow: '0 0 40px rgba(239,68,68,0.08)' }}>
              {/* Header */}
              <div className="px-5 py-3 border-b border-red-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-base">
                    🚨
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">{scenario.alert.from}</p>
                    <p className="text-red-400/70 text-[10px]">{scenario.alert.role}</p>
                  </div>
                </div>
                <span className="text-slate-600 text-[10px] font-mono">{scenario.alert.timestamp}</span>
              </div>

              {/* Message */}
              <div className="px-5 py-4">
                <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                  {scenario.alert.message}
                </p>
              </div>

              {/* Metric card */}
              <div className="mx-5 mb-4 rounded-xl border border-red-500/20 bg-slate-950/60 p-4">
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2 font-medium">
                  {scenario.alert.metric}
                </p>
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">期待値</p>
                    <p className="text-emerald-400 font-black text-xl">{scenario.alert.expectedValue}</p>
                  </div>
                  <div className="text-2xl text-slate-700">→</div>
                  <div>
                    <p className="text-[10px] text-slate-600 mb-0.5">実際値</p>
                    <p className="text-red-400 font-black text-xl">{scenario.alert.actualValue}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Task label */}
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-sm">あなたのミッション</p>
              <p className="text-white font-bold text-base">
                原因を特定して、パイプラインを修正せよ
              </p>
            </div>

            <button
              onClick={goNext}
              className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-sm transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-red-500/20 active:scale-100"
            >
              🔍 調査を開始する
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Investigate phase ─────────────────────────────────────────────────
  if (phase === 'investigate') {
    return (
      <div className="min-h-screen bg-[#070910] text-white flex flex-col">
        <ProgressBar phase={phase} />

        <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0, height: 'calc(100vh - 52px)' }}>
          {/* Left: Tables + Hints */}
          <aside className="w-64 border-r border-slate-800/60 bg-slate-950/80 flex flex-col flex-shrink-0 overflow-y-auto">
            {/* Alert summary */}
            <div className="p-3 border-b border-red-500/20 bg-red-500/5">
              <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest mb-1">調査中</p>
              <p className="text-slate-300 text-[11px] leading-snug">{scenario.alert.metric}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-emerald-400 text-[11px] font-bold">{scenario.alert.expectedValue}</span>
                <span className="text-slate-600 text-xs">→</span>
                <span className="text-red-400 text-[11px] font-bold">{scenario.alert.actualValue}</span>
              </div>
            </div>

            {/* Available tables */}
            <div className="p-3 border-b border-slate-800">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium mb-2">テーブル一覧</p>
              <div className="space-y-1">
                {scenario.availableTables.map(t => (
                  <button
                    key={t}
                    onClick={() => { setSql(`SELECT * FROM ${t} LIMIT 10;`); setResult(null); }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
                  >
                    <span className="text-blue-500 text-[10px]">▸</span>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Hints */}
            <div className="p-3 flex-1">
              <p className="text-slate-500 text-[10px] uppercase tracking-widest font-medium mb-2">
                調査のヒント
              </p>
              <div className="space-y-2">
                {scenario.investigationHints.map((hint, i) => (
                  <button
                    key={hint.id}
                    onClick={() => handleHint(hint.sql)}
                    className="w-full text-left rounded-lg border border-slate-700/50 bg-slate-900/40 hover:border-blue-500/40 hover:bg-blue-500/5 p-2.5 transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-blue-500 text-[10px] font-bold mt-0.5 flex-shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-slate-400 group-hover:text-slate-300 text-[11px] leading-snug transition-colors">
                        {hint.label}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress to next */}
            {queryCount > 0 && (
              <div className="p-3 border-t border-slate-800">
                <button
                  onClick={goNext}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all"
                >
                  原因を診断する →
                </button>
                <p className="text-slate-600 text-[10px] text-center mt-1">{queryCount}件のクエリを実行済み</p>
              </div>
            )}
          </aside>

          {/* Center: SQL Editor + Results */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* DB status */}
            <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${dbReady ? 'bg-emerald-400' : dbError ? 'bg-red-400' : 'bg-amber-400 animate-pulse'}`} />
                <span className="text-[10px] text-slate-500">
                  {dbReady ? 'DuckDB 接続中' : dbError ? 'エラー' : '初期化中...'}
                </span>
              </div>
              {queryCount > 0 && (
                <span className="text-[10px] text-slate-600">{queryCount} クエリ実行済み</span>
              )}
            </div>

            {dbError && (
              <div className="mx-4 mt-3 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                <p className="text-red-400 text-xs">DuckDB初期化エラー: {dbError}</p>
              </div>
            )}

            {/* SQL Editor */}
            <div className="p-4 border-b border-slate-800 space-y-2">
              <textarea
                ref={textareaRef}
                value={sql}
                onChange={e => setSql(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    e.preventDefault();
                    runQuery();
                  }
                }}
                className="w-full bg-[#0d1117] border border-slate-700 rounded-lg p-3 text-sm font-mono text-slate-200 resize-none focus:outline-none focus:border-blue-500/50 transition-colors leading-relaxed"
                rows={6}
                placeholder="-- SQLを入力して実行 (Cmd/Ctrl + Enter)"
                spellCheck={false}
              />
              <div className="flex items-center justify-between">
                <p className="text-slate-700 text-[10px]">Cmd / Ctrl + Enter で実行</p>
                <button
                  onClick={() => runQuery()}
                  disabled={!dbReady || running}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                    !dbReady || running
                      ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-105'
                  }`}
                >
                  {running ? (
                    <><span className="animate-spin">⟳</span> 実行中...</>
                  ) : (
                    <>▶ 実行</>
                  )}
                </button>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-auto p-4">
              {result ? (
                <ResultTable result={result} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-40">
                  <p className="text-4xl">🔍</p>
                  <p className="text-slate-500 text-sm">SQLを実行すると結果がここに表示されます</p>
                  <p className="text-slate-600 text-xs">ヒントのSQLを使うか、自由に調査してください</p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ── Diagnose phase ────────────────────────────────────────────────────
  if (phase === 'diagnose') {
    const correctDiag = scenario.diagnosisOptions.find(d => d.correct);
    const isCorrect = selectedDiagnosisOption?.correct === true;

    return (
      <div className="min-h-screen bg-[#070910] text-white flex flex-col">
        <ProgressBar phase={phase} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full space-y-5">
            <div className="text-center space-y-1">
              <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">診断フェーズ</p>
              <h2 className="text-white font-black text-xl">{scenario.diagnosisQuestion}</h2>
            </div>

            <div className="space-y-3">
              {scenario.diagnosisOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => !diagnosisRevealed && setSelectedDiagnosis(opt.id)}
                  disabled={diagnosisRevealed}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    diagnosisRevealed
                      ? opt.correct
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : opt.id === selectedDiagnosis
                        ? 'border-red-500/60 bg-red-500/10'
                        : 'border-slate-800 bg-slate-900/40 opacity-50'
                      : selectedDiagnosis === opt.id
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold transition-all ${
                      diagnosisRevealed
                        ? opt.correct
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : opt.id === selectedDiagnosis
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-slate-700 text-slate-700'
                        : selectedDiagnosis === opt.id
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-600 text-slate-600'
                    }`}>
                      {diagnosisRevealed
                        ? opt.correct ? '✓' : opt.id === selectedDiagnosis ? '✗' : ''
                        : selectedDiagnosis === opt.id ? '●' : ''}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm leading-snug ${
                        diagnosisRevealed && opt.correct
                          ? 'text-emerald-300 font-bold'
                          : diagnosisRevealed && opt.id === selectedDiagnosis && !opt.correct
                          ? 'text-red-300'
                          : 'text-slate-300'
                      }`}>
                        {opt.label}
                      </p>
                      {diagnosisRevealed && (opt.correct || opt.id === selectedDiagnosis) && (
                        <p className={`text-xs mt-2 leading-relaxed ${
                          opt.correct ? 'text-emerald-400/80' : 'text-slate-500'
                        }`}>
                          {opt.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!diagnosisRevealed ? (
              <button
                onClick={handleDiagnosis}
                disabled={!selectedDiagnosis}
                className={`w-full py-3.5 rounded-xl font-black text-sm transition-all ${
                  selectedDiagnosis
                    ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-[1.02]'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                診断する
              </button>
            ) : (
              <div className="space-y-3">
                <div className={`rounded-xl border p-4 text-center ${
                  isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                }`}>
                  <p className={`font-black text-lg ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isCorrect ? '✓ 正解！原因を特定しました' : '惜しい！正解はこちらです'}
                  </p>
                  {!isCorrect && correctDiag && (
                    <p className="text-slate-400 text-xs mt-1">{correctDiag.label}</p>
                  )}
                </div>
                <button
                  onClick={goNext}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all hover:scale-[1.02]"
                >
                  修正フェーズへ →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Fix phase ─────────────────────────────────────────────────────────
  if (phase === 'fix') {
    const isCorrect = selectedFixOption?.correct === true;

    return (
      <div className="min-h-screen bg-[#070910] text-white flex flex-col">
        <ProgressBar phase={phase} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full space-y-5">
            <div className="text-center space-y-1">
              <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">修正フェーズ</p>
              <h2 className="text-white font-black text-xl">{scenario.fixQuestion}</h2>
            </div>

            <div className="space-y-3">
              {scenario.fixOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => !fixRevealed && setSelectedFix(opt.id)}
                  disabled={fixRevealed}
                  className={`w-full text-left rounded-xl border p-4 transition-all ${
                    fixRevealed
                      ? opt.correct
                        ? 'border-emerald-500/60 bg-emerald-500/10'
                        : opt.id === selectedFix
                        ? 'border-red-500/60 bg-red-500/10'
                        : 'border-slate-800 bg-slate-900/40 opacity-50'
                      : selectedFix === opt.id
                      ? 'border-blue-500/60 bg-blue-500/10'
                      : 'border-slate-700/60 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center text-[10px] font-bold transition-all ${
                      fixRevealed
                        ? opt.correct
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : opt.id === selectedFix
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-slate-700 text-slate-700'
                        : selectedFix === opt.id
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : 'border-slate-600 text-slate-600'
                    }`}>
                      {fixRevealed
                        ? opt.correct ? '✓' : opt.id === selectedFix ? '✗' : ''
                        : selectedFix === opt.id ? '●' : ''}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${
                        fixRevealed && opt.correct
                          ? 'text-emerald-300 font-bold'
                          : fixRevealed && opt.id === selectedFix && !opt.correct
                          ? 'text-red-300'
                          : 'text-slate-300'
                      }`}>
                        {opt.label}
                      </p>
                      <code className="text-[11px] font-mono text-blue-400/70 mt-1 block truncate">
                        {opt.sqlPreview}
                      </code>
                      {fixRevealed && (opt.correct || opt.id === selectedFix) && (
                        <p className={`text-xs mt-2 leading-relaxed ${
                          opt.correct ? 'text-emerald-400/80' : 'text-slate-500'
                        }`}>
                          {opt.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {!fixRevealed ? (
              <button
                onClick={handleFix}
                disabled={!selectedFix}
                className={`w-full py-3.5 rounded-xl font-black text-sm transition-all ${
                  selectedFix
                    ? 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.02]'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                この修正を適用する
              </button>
            ) : (
              <div className="space-y-3">
                <div className={`rounded-xl border p-4 text-center ${
                  isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
                }`}>
                  <p className={`font-black text-base ${isCorrect ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {isCorrect ? '✓ 正しい修正を選択しました！' : '正解はベストプラクティスを見てください'}
                  </p>
                </div>
                <button
                  onClick={goNext}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all hover:scale-[1.02]"
                >
                  修正を検証する →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Verify phase ──────────────────────────────────────────────────────
  if (phase === 'verify') {
    return (
      <div className="min-h-screen bg-[#070910] text-white flex flex-col">
        <ProgressBar phase={phase} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full space-y-5">
            <div className="text-center space-y-1">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">検証フェーズ</p>
              <h2 className="text-white font-black text-xl">修正が正しく機能するか確認しよう</h2>
            </div>

            {/* Verification SQL */}
            <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-4 space-y-2">
              <p className="text-slate-400 text-xs font-medium">検証クエリ</p>
              <pre className="text-sm font-mono text-blue-300 whitespace-pre-wrap leading-relaxed">
                {scenario.verificationSQL}
              </pre>
            </div>

            {/* Expected result */}
            <div className="rounded-xl border border-slate-700/50 bg-slate-900/20 p-4">
              <p className="text-slate-500 text-xs mb-1">期待する結果</p>
              <p className="text-slate-300 text-sm font-medium">{scenario.verificationExpectedDescription}</p>
            </div>

            {/* Run verification */}
            {!verifyResult ? (
              <button
                onClick={handleVerify}
                disabled={verifying}
                className={`w-full py-4 rounded-xl font-black text-sm transition-all ${
                  verifying
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/20'
                }`}
              >
                {verifying ? '⟳ 検証中...' : '▶ 検証クエリを実行する'}
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-slate-400 text-xs mb-2 font-medium">実行結果</p>
                  <ResultTable result={verifyResult} />
                </div>

                {!verifyResult.error && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 text-center space-y-2">
                    <p className="text-3xl">🎉</p>
                    <p className="text-emerald-400 font-black text-lg">インシデント解決！</p>
                    <p className="text-slate-400 text-sm">パイプラインが正しく動作することを確認しました</p>
                    <div className="flex items-center justify-center gap-2 text-yellow-400 font-bold">
                      <span className="text-xl">+{scenario.xpReward}</span>
                      <span className="text-sm">XP</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={goNext}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all hover:scale-[1.02]"
                >
                  振り返りを見る →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Debrief phase ─────────────────────────────────────────────────────
  if (phase === 'debrief') {
    return (
      <div className="min-h-screen bg-[#070910] text-white flex flex-col">
        <ProgressBar phase={phase} />
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
              <p className="text-3xl">📖</p>
              <h2 className="text-white font-black text-2xl">{scenario.lesson.title}</h2>
              <div className="flex items-center justify-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                  +{scenario.xpReward} XP
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  インシデント解決
                </span>
              </div>
            </div>

            {/* Lesson body */}
            <div className="rounded-2xl border border-slate-700/50 bg-slate-900/40 p-6 space-y-4">
              <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                {scenario.lesson.body}
              </p>
            </div>

            {/* Prevention */}
            <div className="space-y-3">
              <p className="text-slate-400 text-sm font-bold flex items-center gap-2">
                <span>🛡️</span> 再発防止策
              </p>
              <div className="space-y-2">
                {scenario.lesson.prevention.map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-slate-800/60 bg-slate-900/30 p-3"
                  >
                    <span className="text-emerald-500 text-xs font-bold mt-0.5 flex-shrink-0">✓</span>
                    <p className="text-slate-300 text-sm leading-snug">{tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Real world example */}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-2">
              <p className="text-amber-400 text-xs font-bold uppercase tracking-widest">実世界での事例</p>
              <p className="text-slate-300 text-sm leading-relaxed">{scenario.lesson.realWorldExample}</p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/debug"
                className="py-3.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-sm font-bold text-center transition-colors"
              >
                ← 他のシナリオへ
              </a>
              <a
                href="/dashboard"
                className="py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm text-center transition-all hover:scale-[1.02]"
              >
                ダッシュボードへ →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ── ProgressBar ───────────────────────────────────────────────────────

function ProgressBar({ phase }: { phase: DebugPhase }) {
  const currentIdx = PHASE_ORDER.indexOf(phase);

  return (
    <div className="h-[52px] border-b border-slate-800/60 bg-slate-950/80 flex items-center px-4 gap-2 flex-shrink-0">
      <a href="/debug" className="text-slate-600 hover:text-slate-400 text-xs transition-colors flex-shrink-0 mr-2">
        ← 戻る
      </a>
      {PHASE_STEPS.map((step, i) => (
        <PhaseStep
          key={step.phase}
          num={i + 1}
          label={step.label}
          active={phase === step.phase}
          done={i < currentIdx}
        />
      ))}
    </div>
  );
}
