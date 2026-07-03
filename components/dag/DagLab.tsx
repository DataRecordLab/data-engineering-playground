'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  DAG_SCENARIOS,
  getExecutionWaves,
  TASK_TYPE_META,
  STATUS_META,
  type DagTask,
  type TaskStatus,
  type DagScenario,
} from '@/lib/dag';
import { DagPreRunQuiz, DagBottleneckQuiz, DagFailureDecision } from '@/components/dag/DagThinkingOverlay';

// ── ステージレイヤー判定 ──────────────────────────────────────────────────────

const LAYER_META: Record<string, { label: string; color: string; stage: string }> = {
  extract: { label: 'Source',    color: '#60a5fa', stage: 'source'    },
  stg:     { label: 'Staging',   color: '#34d399', stage: 'staging'   },
  fct:     { label: 'Warehouse', color: '#f87171', stage: 'warehouse' },
  mart:    { label: 'Mart',      color: '#a78bfa', stage: 'mart'      },
};

function getTaskLayer(taskId: string) {
  if (taskId.startsWith('extract_')) return LAYER_META.extract;
  if (taskId.startsWith('stg_'))     return LAYER_META.stg;
  if (taskId.startsWith('fct_'))     return LAYER_META.fct;
  if (taskId.startsWith('mart_'))    return LAYER_META.mart;
  return null;
}

// ── タスクノード ──────────────────────────────────────────────────────────────

function TaskNode({ data }: NodeProps) {
  const task = data as DagTask & { status: TaskStatus; isUserPipeline?: boolean };
  const typeMeta = TASK_TYPE_META[task.type];
  const statusMeta = STATUS_META[task.status];
  const layer = task.isUserPipeline ? getTaskLayer(task.id) : null;

  return (
    <div
      className="rounded-xl border transition-all duration-300"
      style={{
        minWidth: 148,
        border: `1.5px solid ${
          task.status === 'running' ? typeMeta.color :
          task.status === 'success' ? '#22c55e' :
          task.status === 'failed'  ? '#ef4444' :
          task.status === 'skipped' ? '#374151' : '#1e293b'
        }`,
        background: task.status !== 'pending'
          ? (task.status === 'running' ? typeMeta.bg : statusMeta.bg)
          : '#0b0f1a',
        boxShadow: task.status === 'running' ? `0 0 16px ${typeMeta.color}40` :
                   task.status === 'success' ? '0 0 12px rgba(34,197,94,0.2)' :
                   task.status === 'failed'  ? '0 0 12px rgba(239,68,68,0.2)' : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: statusMeta.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: statusMeta.color, width: 8, height: 8 }} />
      <div className="px-3 py-2.5">
        {/* レイヤーバッジ（ユーザーパイプライン時のみ） */}
        {layer && (
          <div
            className="text-[8px] font-black px-1.5 py-0.5 rounded mb-1.5 inline-block uppercase tracking-wider"
            style={{ color: layer.color, background: layer.color + '18', border: `1px solid ${layer.color}30` }}
          >
            {layer.label}ステージ
          </div>
        )}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-sm">{typeMeta.icon}</span>
          <span className="text-[9px] font-mono font-bold" style={{ color: typeMeta.color }}>
            {task.type.toUpperCase()}
          </span>
          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ color: statusMeta.color, background: statusMeta.bg + '80' }}>
            {statusMeta.label}
          </span>
        </div>
        <p className="text-[11px] font-bold text-white font-mono">{task.label}</p>
        {task.description && (
          <p className="text-[9px] text-slate-500 mt-1 leading-tight">{task.description}</p>
        )}
        {task.status === 'running' && (
          <div className="mt-2 h-0.5 rounded-full bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full animate-pulse" style={{ background: typeMeta.color, width: '60%' }} />
          </div>
        )}
        {task.duration > 0 && task.status === 'pending' && (
          <p className="text-[9px] text-slate-700 mt-1">{task.duration}ms</p>
        )}
      </div>
    </div>
  );
}

const NODE_TYPES = { task: TaskNode };

// ── フェーズ型 ────────────────────────────────────────────────────────────────

type RunPhase = 'precheck' | 'failure_decision' | 'running' | 'bottleneck' | 'done';

// ── メインコンポーネント ───────────────────────────────────────────────────────

interface DagLabProps {
  onDagRun?: (scenarioId: string) => void;
  lockedScenarioIdx?: number[];
  onLockedClick?: () => void;
  extraScenarios?: DagScenario[];
}

export function DagLab({ onDagRun, lockedScenarioIdx = [], onLockedClick, extraScenarios = [] }: DagLabProps = {}) {
  const allScenarios = [...DAG_SCENARIOS, ...extraScenarios];

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [statuses, setStatuses] = useState<Record<string, TaskStatus>>({});
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<{ time: string; msg: string; color: string }[]>([]);
  const [phase, setPhase] = useState<RunPhase>('precheck');
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoSelectedRef = useRef(false);

  // ユーザーパイプラインがロードされたら自動選択
  useEffect(() => {
    if (autoSelectedRef.current || extraScenarios.length === 0) return;
    const combined = [...DAG_SCENARIOS, ...extraScenarios];
    const userIdx = combined.findIndex(s => s.isUserPipeline);
    if (userIdx >= 0) {
      autoSelectedRef.current = true;
      setScenarioIdx(userIdx);
    }
  }, [extraScenarios]);

  const scenario: DagScenario = allScenarios[scenarioIdx] ?? allScenarios[0];

  const addLog = (msg: string, color = '#94a3b8') => {
    const time = new Date().toLocaleTimeString('ja', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog(prev => [...prev, { time, msg, color }]);
  };

  const reset = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    setStatuses({});
    setRunning(false);
    setLog([]);
    setPhase('precheck');
  }, []);

  const startRun = useCallback(() => {
    setRunning(true);
    setPhase('running');
    setLog([]);

    const waves = getExecutionWaves(scenario.tasks);
    const failId = scenario.failureTaskId;
    const failed = new Set<string>();

    addLog(`🚀 DAG「${scenario.title}」を開始`, '#818cf8');

    let totalDelay = 200;

    waves.forEach((wave, waveIdx) => {
      const parallelLabel = wave.map(t => t.label).join(', ');

      const t1 = setTimeout(() => {
        addLog(`⚡ Wave ${waveIdx + 1}: [${parallelLabel}] を並列実行`, '#60a5fa');
        wave.forEach(task => {
          const hasFailedUpstream = task.upstreams.some(u => failed.has(u));

          if (hasFailedUpstream) {
            failed.add(task.id);
            setStatuses(prev => ({ ...prev, [task.id]: 'skipped' }));
            addLog(`⏭ ${task.label}: 上流タスクの失敗によりスキップ`, '#6b7280');
            return;
          }

          setStatuses(prev => ({ ...prev, [task.id]: 'running' }));

          const t2 = setTimeout(() => {
            if (task.id === failId) {
              failed.add(task.id);
              setStatuses(prev => ({ ...prev, [task.id]: 'failed' }));
              addLog(`❌ ${task.label}: 失敗（${task.description}）`, '#ef4444');
            } else {
              setStatuses(prev => ({ ...prev, [task.id]: 'success' }));
              addLog(`✓ ${task.label}: 成功`, '#22c55e');
            }
          }, task.duration);

          timerRef.current.push(t2);
        });
      }, totalDelay);

      timerRef.current.push(t1);
      totalDelay += Math.max(...wave.map(t => t.duration)) + 300;
    });

    const tEnd = setTimeout(() => {
      setRunning(false);
      const hasFail = failed.size > 0;
      addLog(hasFail
        ? `⚠️ DAG完了（${failed.size}タスク失敗・スキップあり）`
        : '🎉 DAG 全タスク成功', hasFail ? '#f59e0b' : '#22c55e');
      onDagRun?.(scenario.id);
      setPhase(hasFail ? 'done' : 'bottleneck');
    }, totalDelay + 200);

    timerRef.current.push(tEnd);
  }, [scenario, onDagRun]);

  function handlePreRunDone() {
    // If scenario has failure and it's a failure scenario, show decision first
    if (scenario.failureTaskId) {
      const failedTask = scenario.tasks.find(t => t.id === scenario.failureTaskId);
      if (failedTask) {
        setPhase('failure_decision');
        return;
      }
    }
    startRun();
  }

  function handleFailureDecisionDone() {
    startRun();
  }

  const nodes = scenario.tasks.map(task => ({
    id: task.id,
    type: 'task',
    position: { x: task.x, y: task.y },
    data: { ...task, status: statuses[task.id] ?? 'pending', isUserPipeline: scenario.isUserPipeline },
    draggable: false,
  }));

  const edges = scenario.tasks.flatMap(task =>
    task.upstreams.map(u => {
      const srcStatus = statuses[u] ?? 'pending';
      const tgtStatus = statuses[task.id] ?? 'pending';
      const isActive = srcStatus === 'success' || tgtStatus === 'running';
      const isFailed = srcStatus === 'failed' || tgtStatus === 'skipped';
      return {
        id: `${u}->${task.id}`,
        source: u,
        target: task.id,
        type: 'smoothstep',
        animated: isActive,
        style: {
          stroke: isFailed ? '#374151' : isActive ? '#22c55e' : '#1e293b',
          strokeWidth: isActive ? 2 : 1,
          opacity: isFailed ? 0.3 : 1,
        },
      };
    })
  );

  const successCount = Object.values(statuses).filter(s => s === 'success').length;
  const failedCount  = Object.values(statuses).filter(s => s === 'failed').length;
  const skippedCount = Object.values(statuses).filter(s => s === 'skipped').length;

  const userScenarios = allScenarios.filter(s => s.isUserPipeline);
  const builtinScenarios = allScenarios.filter(s => !s.isUserPipeline);

  return (
    <div className="min-h-screen bg-[#070910] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex-shrink-0">
        <span className="text-blue-400 font-black text-lg">◈</span>
        <div>
          <h1 className="font-black text-sm">DAG Orchestration Lab</h1>
          <p className="text-slate-500 text-xs">パイプラインの依存関係・実行順序・障害対応を体験する</p>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-wrap justify-end">
          {/* User pipelines */}
          {userScenarios.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">あなたの設計</span>
              {userScenarios.map((s, _i) => {
                const idx = allScenarios.indexOf(s);
                return (
                  <button
                    key={s.id}
                    onClick={() => { setScenarioIdx(idx); reset(); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border"
                    style={{
                      background: scenarioIdx === idx ? 'rgba(16,185,129,0.15)' : undefined,
                      borderColor: scenarioIdx === idx ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.08)',
                      color: scenarioIdx === idx ? '#34d399' : '#64748b',
                    }}
                  >
                    🌿 {s.id.replace('user_', '').replace('ec-site', 'EC').replace('saas', 'SaaS')}
                  </button>
                );
              })}
            </div>
          )}

          {/* Built-in scenarios */}
          <div className="flex gap-1">
            {builtinScenarios.map((s, i) => {
              const idx = allScenarios.indexOf(s);
              const isLocked = lockedScenarioIdx.includes(i);
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    if (isLocked) { onLockedClick?.(); return; }
                    setScenarioIdx(idx); reset();
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors relative ${
                    isLocked
                      ? 'border border-slate-800 text-slate-600 cursor-pointer'
                      : scenarioIdx === idx
                        ? 'bg-indigo-600 text-white'
                        : 'border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {isLocked ? `🔒 ${i === 0 ? '正常' : '障害'}` : i === 0 ? '✅ 正常シナリオ' : '⚠️ 障害シナリオ'}
                </button>
              );
            })}
          </div>

          <button onClick={reset} disabled={running} className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs transition-colors disabled:opacity-40">
            リセット
          </button>

          {/* Run button — only shown when precheck is done */}
          {phase === 'running' && (
            <button disabled className="px-4 py-1.5 rounded-lg bg-indigo-600/60 text-white text-xs font-bold opacity-60 cursor-not-allowed">
              実行中...
            </button>
          )}
          {phase === 'precheck' && (
            <div className="text-[10px] text-slate-600 px-3 py-1.5 rounded-lg border border-slate-800">
              ↓ まず依存関係を確認
            </div>
          )}
        </div>
      </header>

      {/* シナリオ説明 */}
      <div className="px-6 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-4">
        {scenario.isUserPipeline && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
            ✦ あなたの設計
          </span>
        )}
        <p className="text-xs text-slate-300 font-semibold">{scenario.title}</p>
        <p className="text-xs text-slate-500">{scenario.description}</p>
        {Object.keys(statuses).length > 0 && (
          <div className="ml-auto flex gap-3 text-[10px]">
            <span className="text-green-400">✓ {successCount} 成功</span>
            {failedCount  > 0 && <span className="text-red-400">✗ {failedCount} 失敗</span>}
            {skippedCount > 0 && <span className="text-slate-500">⏭ {skippedCount} スキップ</span>}
          </div>
        )}
      </div>

      {/* ユーザーパイプライン — 設計内容の説明パネル */}
      {scenario.isUserPipeline && phase === 'precheck' && (
        <div className="px-6 py-3 border-b border-emerald-500/15 bg-emerald-950/20 flex items-center gap-6 flex-shrink-0">
          <div className="flex-shrink-0">
            <p className="text-[10px] text-emerald-400 font-bold mb-1.5 uppercase tracking-wider">あなたが設計したレイヤー</p>
            <div className="flex items-center gap-1.5">
              {[
                { prefix: 'extract_', ...LAYER_META.extract },
                { prefix: 'stg_',     ...LAYER_META.stg },
                { prefix: 'fct_',     ...LAYER_META.fct },
                { prefix: 'mart_',    ...LAYER_META.mart },
              ].map((layer, i, arr) => {
                const present = scenario.tasks.some(t => t.id.startsWith(layer.prefix));
                return (
                  <div key={layer.stage} className="flex items-center gap-1.5">
                    <div
                      className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold"
                      style={{
                        color: present ? layer.color : '#374151',
                        background: present ? layer.color + '18' : '#0f172a',
                        border: `1px solid ${present ? layer.color + '40' : '#1e293b'}`,
                        opacity: present ? 1 : 0.4,
                      }}
                    >
                      {present ? '✓' : '○'} {layer.label}
                    </div>
                    {i < arr.length - 1 && (
                      <span className="text-slate-700 text-[10px]">→</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="text-[10px] text-slate-500 leading-relaxed border-l border-slate-800 pl-6">
            <p className="text-slate-400 font-medium mb-0.5">各ノードの色バッジ = クエストで設計したステージです</p>
            <p>ノードを辿って <span className="text-blue-400">Source</span> → <span className="text-emerald-400">Staging</span> → <span className="text-red-400">Warehouse</span> → <span className="text-purple-400">Mart</span> の流れを確認してみよう</p>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* DAG Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.4}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} size={1} />
          </ReactFlow>

          {/* Thinking overlays */}
          {phase === 'precheck' && (
            <DagPreRunQuiz tasks={scenario.tasks} onCorrect={handlePreRunDone} />
          )}
          {phase === 'failure_decision' && scenario.failureTaskId && (
            <DagFailureDecision
              failedTaskLabel={scenario.tasks.find(t => t.id === scenario.failureTaskId)?.label ?? scenario.failureTaskId}
              onDone={handleFailureDecisionDone}
            />
          )}
          {phase === 'bottleneck' && (
            <DagBottleneckQuiz tasks={scenario.tasks} onDone={() => setPhase('done')} />
          )}
        </div>

        {/* 実行ログ */}
        <aside className="w-64 border-l border-slate-800 bg-slate-950/80 flex flex-col flex-shrink-0">
          <div className="px-4 py-2.5 border-b border-slate-800">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">実行ログ</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[10px]">
            {log.length === 0
              ? <p className="text-slate-700">実行前チェックを完了すると開始</p>
              : log.map((entry, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-700 flex-shrink-0">{entry.time}</span>
                  <span style={{ color: entry.color }}>{entry.msg}</span>
                </div>
              ))
            }
          </div>

          {/* Wave preview (static) */}
          {phase === 'done' && (
            <div className="p-3 border-t border-slate-800 space-y-1.5">
              <p className="text-[9px] text-slate-600 uppercase tracking-wider">Wave 実行順序</p>
              {getExecutionWaves(scenario.tasks).map((wave, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <span className="text-[9px] text-slate-700 w-12">Wave {i + 1}</span>
                  <div className="flex flex-wrap gap-0.5">
                    {wave.map(t => (
                      <span key={t.id} className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: '#1e293b', color: '#64748b' }}>{t.label}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 凡例 */}
          <div className="p-3 border-t border-slate-800 space-y-1.5">
            {Object.entries(TASK_TYPE_META).map(([type, meta]) => (
              <div key={type} className="flex items-center gap-2 text-[9px]">
                <span style={{ color: meta.color }}>{meta.icon}</span>
                <span className="text-slate-500">{type}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
