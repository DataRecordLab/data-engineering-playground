'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Node,
  NodeProps,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { loadCsv, runSQL, querySQL } from '@/lib/duckdb/engine';
import {
  getExecutionOrder,
  compileSql,
  parseRefs,
  parseSources,
  buildDagEdges,
  type DbtModel,
  type DbtProject,
  type ModelRunResult,
  type ModelStatus,
  type TestResult,
} from '@/lib/dbt';
import { EC_SITE_DBT_PROJECT } from '@/lib/dbt/project';

// ─── Constants ────────────────────────────────────────────────────────────────

const FOLDER_COLOR: Record<string, string> = {
  source:    '#64748b',
  staging:   '#f59e0b',
  warehouse: '#10b981',
  mart:      '#f43f5e',
};

const FOLDER_LABEL: Record<string, string> = {
  staging:   'Staging',
  warehouse: 'Warehouse',
  mart:      'Mart',
};

const STATUS_COLOR: Record<ModelStatus, string> = {
  pending: '#334155',
  running: '#3b82f6',
  success: '#10b981',
  error:   '#ef4444',
};

// ─── DAG Node ─────────────────────────────────────────────────────────────────

interface DagNodeData {
  label: string;
  folder: string;
  status: ModelStatus | null;
  isSource: boolean;
  onClick: () => void;
}

function DagNode({ data }: NodeProps<DagNodeData>) {
  const color = FOLDER_COLOR[data.folder] ?? '#6366f1';
  const statusColor = data.status ? STATUS_COLOR[data.status] : color;
  const isDone = data.status === 'success';
  const isRunning = data.status === 'running';
  const isError = data.status === 'error';

  return (
    <div
      onClick={data.onClick}
      className={`rounded-xl border-2 px-3 py-2 cursor-pointer select-none transition-all ${
        isRunning ? 'animate-pulse' : ''
      }`}
      style={{
        borderColor: statusColor,
        background: isDone
          ? `${statusColor}18`
          : isError
          ? '#1f0a0a'
          : data.isSource
          ? '#0f172a'
          : '#080e1a',
        minWidth: 130,
        boxShadow: isDone ? `0 0 14px ${statusColor}40` : isRunning ? `0 0 10px ${statusColor}60` : 'none',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, border: 'none', width: 8, height: 8 }} />
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
        <span className="text-white text-[11px] font-bold">{data.label}</span>
        {data.status === 'success' && <span className="ml-auto text-[9px] text-emerald-400">✓</span>}
        {data.status === 'running' && <span className="ml-auto text-[9px] text-blue-400 animate-spin">⟳</span>}
        {data.status === 'error' && <span className="ml-auto text-[9px] text-red-400">✗</span>}
      </div>
      <div className="mt-0.5">
        <span
          className="text-[9px] font-medium px-1 py-0.5 rounded"
          style={{ color, background: `${color}15` }}
        >
          {data.isSource ? 'source' : data.folder}
        </span>
      </div>
      <Handle type="source" position={Position.Right} style={{ background: color, border: 'none', width: 8, height: 8 }} />
    </div>
  );
}

const dagNodeTypes = { dbt: DagNode };

// ─── DAG Builder ─────────────────────────────────────────────────────────────

function buildDagNodes(
  project: DbtProject,
  modelStatuses: Record<string, ModelStatus>,
  onNodeClick: (name: string) => void
): Node<DagNodeData>[] {
  const nodes: Node<DagNodeData>[] = [];

  // Column x positions
  const COL_X: Record<string, number> = {
    source: 20, staging: 240, warehouse: 460, mart: 680,
  };

  // Group models by folder
  const byFolder: Record<string, string[]> = {
    source: [], staging: [], warehouse: [], mart: [],
  };
  project.sources.forEach(src => src.tables.forEach(t => byFolder.source.push(t.name)));
  project.models.forEach(m => byFolder[m.folder].push(m.name));

  // Place nodes
  for (const [folder, names] of Object.entries(byFolder)) {
    const x = COL_X[folder] ?? 0;
    const totalHeight = names.length * 80;
    const startY = (400 - totalHeight) / 2;
    names.forEach((name, i) => {
      nodes.push({
        id: name,
        type: 'dbt',
        position: { x, y: startY + i * 80 },
        data: {
          label: name,
          folder,
          isSource: folder === 'source',
          status: modelStatuses[name] ?? null,
          onClick: () => onNodeClick(name),
        },
      });
    });
  }

  return nodes;
}

function buildDagEdgesForFlow(project: DbtProject, modelStatuses: Record<string, ModelStatus>) {
  const rawEdges = buildDagEdges(project.models);
  return rawEdges.map((e, i) => {
    const fromDone = modelStatuses[e.from] === 'success';
    const fromColor = FOLDER_COLOR[
      project.models.find(m => m.name === e.from)?.folder ?? 'source'
    ] ?? FOLDER_COLOR.source;
    return {
      id: `e${i}`,
      source: e.from,
      target: e.to,
      animated: fromDone,
      style: { stroke: fromDone ? fromColor : '#1e293b', strokeWidth: fromDone ? 2 : 1.5 },
    };
  });
}

// ─── Log Line ────────────────────────────────────────────────────────────────

interface LogLine {
  ts: string;
  text: string;
  type: 'info' | 'ok' | 'error' | 'warn' | 'run' | 'done';
}

function timestamp() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

// ─── Main Simulator ───────────────────────────────────────────────────────────

type MainTab = 'editor' | 'compiled' | 'dag' | 'log' | 'tests';

export function DbtSimulator() {
  const [project, setProject] = useState<DbtProject>(EC_SITE_DBT_PROJECT);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>(project.models[0].name);
  const [tab, setTab] = useState<MainTab>('editor');
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [modelResults, setModelResults] = useState<ModelRunResult[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState<'browser' | 'server'>('browser');
  const logRef = useRef<HTMLDivElement>(null);

  // ── DAG state (rebuilt on modelStatuses change) ──────────────────────────
  const [rfNodes, , onNodesChange] = useNodesState([]);
  const [rfEdges, , onEdgesChange] = useEdgesState([]);

  const currentDagNodes = buildDagNodes(project, modelStatuses, name => {
    const model = project.models.find(m => m.name === name);
    if (model) { setSelectedFile(name); setTab('editor'); }
  });
  const currentDagEdges = buildDagEdgesForFlow(project, modelStatuses);

  // ── Init DuckDB ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        for (const [name, csv] of Object.entries(project.seeds)) {
          await loadCsv(name, csv);
        }
        setDbReady(true);
      } catch (e) {
        setDbError(String(e));
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto scroll logs ────────────────────────────────────────────────────
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  function addLog(text: string, type: LogLine['type'] = 'info') {
    setLogs(prev => [...prev, { ts: timestamp(), text, type }]);
  }

  // ── Edit model SQL ───────────────────────────────────────────────────────
  function updateModelSql(name: string, sql: string) {
    setProject(prev => ({
      ...prev,
      models: prev.models.map(m => m.name === name ? { ...m, sql } : m),
    }));
  }

  // ── dbt run ─────────────────────────────────────────────────────────────
  async function handleRun(selectModels?: string[]) {
    if (running || !dbReady) return;
    setRunning(true);
    setTab('log');
    setLogs([]);
    setModelStatuses({});
    setModelResults([]);

    const modelsToRun = selectModels
      ? project.models.filter(m => selectModels.includes(m.name))
      : project.models;
    const ordered = getExecutionOrder(modelsToRun);
    const totalCount = ordered.length;
    const sourceCount = project.sources.reduce((s, src) => s + src.tables.length, 0);
    const testCount = project.tests.length;

    addLog(`Running with dbt-duckdb=1.8.0 (Modelion Simulator)`, 'info');
    addLog(`Found ${totalCount} models, ${testCount} tests, ${sourceCount} sources`, 'info');
    addLog('', 'info');
    addLog(`Concurrency: 1 threads (target='dev')`, 'info');
    addLog('', 'info');

    const results: ModelRunResult[] = [];

    for (let i = 0; i < ordered.length; i++) {
      const model = ordered[i];
      const num = `${i + 1} of ${totalCount}`;
      const dotPad = '.'.repeat(Math.max(3, 48 - `${num} START sql ${model.materialization} model ${model.folder}.${model.name}`.length));

      addLog(`${num} START sql ${model.materialization} model ${model.folder}.${model.name} ${dotPad} [RUN]`, 'run');
      setModelStatuses(prev => ({ ...prev, [model.name]: 'running' }));

      const compiled = compileSql(model.sql);
      const startMs = performance.now();
      let status: ModelStatus = 'success';
      let rowCount = 0;
      let error: string | undefined;

      try {
        if (model.materialization === 'view') {
          await runSQL(`CREATE OR REPLACE VIEW ${model.name} AS ${compiled}`);
        } else {
          await runSQL(`CREATE OR REPLACE TABLE ${model.name} AS ${compiled}`);
        }
        const countRes = await querySQL(`SELECT COUNT(*) as n FROM ${model.name}`);
        rowCount = (countRes.rows[0]?.n as number) ?? 0;
      } catch (e) {
        status = 'error';
        error = String(e);
      }

      const durationMs = Math.round(performance.now() - startMs);
      const okPad = '.'.repeat(Math.max(3, 48 - `${num} OK created sql ${model.materialization} model ${model.folder}.${model.name}`.length));

      if (status === 'success') {
        addLog(`${num} OK created sql ${model.materialization} model ${model.folder}.${model.name} ${okPad} [OK in ${(durationMs / 1000).toFixed(2)}s]`, 'ok');
      } else {
        addLog(`${num} ERROR in model ${model.folder}.${model.name}`, 'error');
        if (error) addLog(`  ${error}`, 'error');
      }

      setModelStatuses(prev => ({ ...prev, [model.name]: status }));
      results.push({ name: model.name, folder: model.folder, status, rowCount, durationMs, compiledSql: compiled, error });
    }

    setModelResults(results);

    const passCount = results.filter(r => r.status === 'success').length;
    const errCount = results.filter(r => r.status === 'error').length;
    const totalMs = results.reduce((s, r) => s + r.durationMs, 0);

    addLog('', 'info');
    addLog(`Finished running ${totalCount} table models in ${(totalMs / 1000).toFixed(2)}s.`, 'info');
    addLog('', 'info');
    if (errCount === 0) {
      addLog('Completed successfully', 'done');
    } else {
      addLog(`Completed with ${errCount} error(s)`, 'error');
    }
    addLog('', 'info');
    addLog(`Done. PASS=${passCount} WARN=0 ERROR=${errCount} SKIP=0 TOTAL=${totalCount}`, 'done');

    setRunning(false);
  }

  // ── dbt test ─────────────────────────────────────────────────────────────
  async function handleTest() {
    if (running || !dbReady) return;

    // Check all models are run first
    const unrun = project.models.filter(m => !modelStatuses[m.name] || modelStatuses[m.name] === 'error');
    if (unrun.length > 0) {
      setTab('log');
      addLog('⚠ モデルが未実行です。先に dbt run を実行してください。', 'warn');
      return;
    }

    setRunning(true);
    setTab('tests');
    setTestResults([]);

    const results: TestResult[] = [];
    for (const test of project.tests) {
      let status: 'pass' | 'fail' = 'pass';
      let failCount = 0;

      try {
        if (test.type === 'not_null') {
          const res = await querySQL(`SELECT COUNT(*) as n FROM ${test.model} WHERE ${test.column} IS NULL`);
          failCount = (res.rows[0]?.n as number) ?? 0;
          status = failCount === 0 ? 'pass' : 'fail';
        } else if (test.type === 'unique') {
          const res = await querySQL(
            `SELECT COUNT(*) as n FROM (SELECT ${test.column} FROM ${test.model} GROUP BY ${test.column} HAVING COUNT(*) > 1)`
          );
          failCount = (res.rows[0]?.n as number) ?? 0;
          status = failCount === 0 ? 'pass' : 'fail';
        } else if (test.type === 'accepted_values' && test.values) {
          const vals = test.values.map(v => `'${v}'`).join(', ');
          const res = await querySQL(`SELECT COUNT(*) as n FROM ${test.model} WHERE ${test.column} NOT IN (${vals})`);
          failCount = (res.rows[0]?.n as number) ?? 0;
          status = failCount === 0 ? 'pass' : 'fail';
        }
      } catch {
        status = 'fail';
        failCount = -1;
      }

      results.push({ model: test.model, column: test.column, testType: test.type, status, failCount });
    }

    setTestResults(results);
    setRunning(false);
  }

  // ── dbt run (server) ─────────────────────────────────────────────────────
  async function handleServerRun(selectModels?: string[]) {
    if (running) return;
    setRunning(true);
    setTab('log');
    setLogs([]);
    setModelStatuses({});
    setModelResults([]);

    addLog('▶ dbt run  (Server mode — real dbt-duckdb)', 'info');
    addLog('', 'info');

    try {
      const payload = {
        command: 'run',
        models: selectModels
          ? project.models.filter(m => selectModels.includes(m.name))
          : project.models,
        seeds: project.seeds,
        tests: project.tests,
        select: selectModels?.join(' '),
      };

      const res = await fetch('/api/dbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        addLog(`Error ${res.status}: ${err.error ?? res.statusText}`, 'error');
        setRunning(false);
        return;
      }

      const data = await res.json() as { output: string; returncode: number };
      _appendServerLogs(data.output);
      _parseServerModelStatuses(data.output);
    } catch (e) {
      addLog(`Network error: ${e}`, 'error');
      addLog('Browser モードに切り替えてください', 'warn');
    }

    setRunning(false);
  }

  // ── dbt test (server) ─────────────────────────────────────────────────────
  async function handleServerTest() {
    if (running) return;
    setRunning(true);
    setTab('log');
    setLogs([]);

    addLog('✓ dbt test  (Server mode — real dbt-duckdb)', 'info');
    addLog('', 'info');

    try {
      const payload = {
        command: 'test',
        models: project.models,
        seeds: project.seeds,
        tests: project.tests,
      };

      const res = await fetch('/api/dbt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        addLog(`Error ${res.status}: ${err.error ?? res.statusText}`, 'error');
        setRunning(false);
        return;
      }

      const data = await res.json() as { output: string; returncode: number };
      _appendServerLogs(data.output);
      _parseServerTestResults(data.output);
      setTab('tests');
    } catch (e) {
      addLog(`Network error: ${e}`, 'error');
    }

    setRunning(false);
  }

  // ── Server output helpers ─────────────────────────────────────────────────
  function _appendServerLogs(output: string) {
    const lines = output.split('\n');
    const parsed: LogLine[] = [];
    for (const raw of lines) {
      // dbt lines look like: "18:42:01  message text"
      const m = raw.match(/^(\d{2}:\d{2}:\d{2})\s+(.*)/);
      const ts = m ? m[1] : timestamp();
      const text = m ? m[2] : raw;
      if (!text.trim() && !raw.trim()) { parsed.push({ ts: '', text: '', type: 'info' }); continue; }
      let type: LogLine['type'] = 'info';
      if (/\bOK\b/.test(text) || /PASS=\d+/.test(text)) type = 'ok';
      else if (/ERROR|FAIL=\d+/.test(text)) type = 'error';
      else if (/WARN=\d+/.test(text)) type = 'warn';
      else if (/\bSTART\b|\[RUN\]/.test(text)) type = 'run';
      else if (/^Done\.|^Completed|PASS=\d/.test(text)) type = 'done';
      parsed.push({ ts, text, type });
    }
    setLogs(parsed);
  }

  function _parseServerModelStatuses(output: string) {
    const statuses: Record<string, ModelStatus> = {};
    for (const line of output.split('\n')) {
      const ok = line.match(/OK created sql \w+ model \w+\.(\w+)/);
      if (ok) { statuses[ok[1]] = 'success'; continue; }
      const err = line.match(/ERROR (?:in model|creating model) \w+\.(\w+)/);
      if (err) statuses[err[1]] = 'error';
    }
    if (Object.keys(statuses).length) setModelStatuses(statuses);
  }

  function _parseServerTestResults(output: string) {
    const results: TestResult[] = [];
    for (const line of output.split('\n')) {
      // e.g. "PASS not_null_stg_orders_order_id"  or "FAIL unique_fct_orders_order_id"
      const m = line.match(/\b(PASS|FAIL)\s+(not_null|unique|accepted_values)_(\w+)_(\w+)/);
      if (!m) continue;
      const [, verdict, testType, model, column] = m;
      results.push({
        model,
        column,
        testType,
        status: verdict === 'PASS' ? 'pass' : 'fail',
        failCount: verdict === 'PASS' ? 0 : 1,
      });
    }
    if (results.length) setTestResults(results);
  }

  // ── dbt compile ──────────────────────────────────────────────────────────
  function handleCompile() {
    setTab('compiled');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const selectedModel = project.models.find(m => m.name === selectedFile);
  const compiledSql = selectedModel ? compileSql(selectedModel.sql) : '';

  const runCount = modelResults.length;
  const passCount = modelResults.filter(r => r.status === 'success').length;
  const errCount = modelResults.filter(r => r.status === 'error').length;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#060918] text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 flex-shrink-0 bg-slate-950/90">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              mode === 'server'
                ? 'bg-amber-400'
                : dbReady ? 'bg-emerald-400' : dbError ? 'bg-red-400' : 'bg-amber-400 animate-pulse'
            }`} />
            <span className="text-slate-500 text-[10px] font-mono">
              {mode === 'server' ? 'dbt-duckdb (server)' : dbReady ? 'duckdb-wasm (browser)' : dbError ? 'error' : 'initializing...'}
            </span>
          </div>
          <span className="text-slate-700 font-mono text-[10px]">project: {project.name}</span>

          {/* Mode toggle */}
          <div className="flex items-center gap-0.5 bg-slate-900 rounded-lg border border-slate-800 p-0.5">
            <button
              onClick={() => setMode('browser')}
              title="DuckDB WASM をブラウザ内で実行（サーバー不要）"
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                mode === 'browser'
                  ? 'bg-blue-700 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Browser
            </button>
            <button
              onClick={() => setMode('server')}
              title="本物の dbt-duckdb をサーバーで実行"
              className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                mode === 'server'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Server (dbt)
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {runCount > 0 && mode === 'browser' && (
            <span className="text-[10px] text-slate-500 font-mono">
              PASS={passCount} ERROR={errCount}
            </span>
          )}
          <button
            onClick={handleCompile}
            disabled={!selectedModel}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors disabled:opacity-40"
          >
            ⚡ dbt compile
          </button>
          <button
            onClick={mode === 'server' ? handleServerTest : handleTest}
            disabled={running || (mode === 'browser' && !dbReady)}
            className="px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors disabled:opacity-40"
          >
            ✓ dbt test
          </button>
          <button
            onClick={() => mode === 'server' ? handleServerRun() : handleRun()}
            disabled={running || (mode === 'browser' && !dbReady)}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
              running || (mode === 'browser' && !dbReady)
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : mode === 'server'
                ? 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-[1.02]'
                : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.02]'
            }`}
          >
            {running ? '⟳ Running...' : '▶ dbt run'}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: File explorer */}
        <aside className="w-52 border-r border-slate-800 bg-slate-950/70 flex-shrink-0 overflow-y-auto">
          {/* Sources */}
          <div className="p-2">
            <p className="text-slate-600 text-[9px] uppercase tracking-widest font-medium px-2 py-1">Sources</p>
            {project.sources.map(src =>
              src.tables.map(t => (
                <div
                  key={t.name}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                  <span className="text-slate-500 text-[11px] font-mono">{t.name}</span>
                  <span className="ml-auto text-[9px] text-slate-700 font-medium">{src.name}</span>
                </div>
              ))
            )}
          </div>

          {/* Models by folder */}
          {(['staging', 'warehouse', 'mart'] as const).map(folder => {
            const folderModels = project.models.filter(m => m.folder === folder);
            const color = FOLDER_COLOR[folder];
            return (
              <div key={folder} className="p-2 pt-0">
                <p
                  className="text-[9px] uppercase tracking-widest font-medium px-2 py-1"
                  style={{ color }}
                >
                  {FOLDER_LABEL[folder]}
                </p>
                {folderModels.map(m => {
                  const status = modelStatuses[m.name];
                  const isSelected = selectedFile === m.name;
                  return (
                    <button
                      key={m.name}
                      onClick={() => { setSelectedFile(m.name); setTab('editor'); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                        isSelected
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors"
                        style={{ background: status ? STATUS_COLOR[status] : color }}
                      />
                      <span className="text-[11px] font-mono truncate flex-1">{m.name}.sql</span>
                      {status === 'success' && <span className="text-[9px] text-emerald-500">✓</span>}
                      {status === 'error'   && <span className="text-[9px] text-red-500">✗</span>}
                      {status === 'running' && <span className="text-[9px] text-blue-400 animate-spin">⟳</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Run subset button */}
          {selectedModel && modelStatuses[selectedModel.name] !== 'success' && (
            <div className="p-2 pt-0 border-t border-slate-800/60 mt-1">
              <button
                onClick={() =>
                  mode === 'server'
                    ? handleServerRun([selectedModel.name])
                    : handleRun([selectedModel.name])
                }
                disabled={running || (mode === 'browser' && !dbReady)}
                className="w-full py-1.5 rounded-lg border border-slate-700 text-[10px] text-slate-400 hover:text-white hover:border-slate-600 transition-colors disabled:opacity-40"
              >
                ▶ run {selectedModel.name}
              </button>
            </div>
          )}
        </aside>

        {/* Right: Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-slate-800 flex-shrink-0 bg-slate-950/50 px-3">
            {([
              { id: 'editor',   label: '📝 エディタ' },
              { id: 'compiled', label: '⚡ コンパイル済み' },
              { id: 'dag',      label: '🗺️ DAG' },
              { id: 'log',      label: `📋 ログ${logs.length > 0 ? ` (${logs.filter(l => l.type !== 'info').length})` : ''}` },
              { id: 'tests',    label: `✓ テスト${testResults.length > 0 ? ` (${testResults.filter(r => r.status === 'pass').length}/${testResults.length})` : ''}` },
            ] as { id: MainTab; label: string }[]).map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-[11px] font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">

            {/* Editor */}
            {tab === 'editor' && (
              <div className="h-full flex flex-col">
                {selectedModel ? (
                  <>
                    {/* File header */}
                    <div className="px-4 py-2 border-b border-slate-800/60 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-medium"
                          style={{ color: FOLDER_COLOR[selectedModel.folder], background: `${FOLDER_COLOR[selectedModel.folder]}15` }}
                        >
                          models/{selectedModel.folder}/
                        </span>
                        <span className="text-slate-300 text-xs font-mono">{selectedModel.name}.sql</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-600">
                        <span>refs: {parseRefs(selectedModel.sql).join(', ') || '—'}</span>
                        <span>·</span>
                        <span>sources: {parseSources(selectedModel.sql).map(s => s.table).join(', ') || '—'}</span>
                        <span>·</span>
                        <span>materialized: {selectedModel.materialization}</span>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedModel.description && (
                      <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/40 flex-shrink-0">
                        <p className="text-slate-400 text-[11px]">💡 {selectedModel.description}</p>
                      </div>
                    )}

                    {/* SQL Editor */}
                    <textarea
                      value={selectedModel.sql}
                      onChange={e => updateModelSql(selectedModel.name, e.target.value)}
                      className="flex-1 bg-[#0d1117] text-slate-200 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed"
                      spellCheck={false}
                    />

                    {/* Dependencies hint */}
                    <div className="px-4 py-2 border-t border-slate-800/60 flex-shrink-0 bg-slate-950/60 flex items-center gap-4">
                      {parseRefs(selectedModel.sql).length > 0 && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-slate-600">依存:</span>
                          {parseRefs(selectedModel.sql).map(r => (
                            <button
                              key={r}
                              onClick={() => setSelectedFile(r)}
                              className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2 font-mono"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                      {parseSources(selectedModel.sql).length > 0 && (
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="text-slate-600">source:</span>
                          {parseSources(selectedModel.sql).map(s => (
                            <span key={s.table} className="text-slate-500 font-mono">{s.source}.{s.table}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                    左のファイルを選択してください
                  </div>
                )}
              </div>
            )}

            {/* Compiled SQL */}
            {tab === 'compiled' && (
              <div className="h-full flex flex-col">
                {selectedModel ? (
                  <>
                    <div className="px-4 py-2 border-b border-slate-800/60 flex-shrink-0">
                      <p className="text-slate-500 text-[10px]">
                        <span className="text-amber-400 font-mono">{'{{ ref() }}'}</span> と{' '}
                        <span className="text-amber-400 font-mono">{'{{ source() }}'}</span> を実際のテーブル名に解決した SQL です
                      </p>
                    </div>
                    <div className="flex-1 overflow-auto p-4">
                      <pre className="text-slate-200 text-xs font-mono leading-relaxed whitespace-pre-wrap">{compiledSql}</pre>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                    モデルを選択して ⚡ dbt compile を押してください
                  </div>
                )}
              </div>
            )}

            {/* DAG */}
            {tab === 'dag' && (
              <div className="h-full relative">
                <ReactFlow
                  nodes={currentDagNodes}
                  edges={currentDagEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={dagNodeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  proOptions={{ hideAttribution: true }}
                  panOnDrag={false}
                  zoomOnScroll={false}
                >
                  <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} size={1} />
                </ReactFlow>

                {/* Layer legend */}
                <div className="absolute bottom-4 left-4 flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800">
                  {(['source', 'staging', 'warehouse', 'mart'] as const).map(f => (
                    <div key={f} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: FOLDER_COLOR[f] }} />
                      <span className="text-[10px] text-slate-400 capitalize">{f}</span>
                    </div>
                  ))}
                </div>

                {/* Click hint */}
                <div className="absolute top-4 right-4 text-[10px] text-slate-600 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
                  ノードをクリックでエディタへ
                </div>
              </div>
            )}

            {/* Log */}
            {tab === 'log' && (
              <div
                ref={logRef}
                className="h-full overflow-y-auto p-4 font-mono text-[11px] space-y-0.5 bg-[#0a0d14]"
              >
                {logs.length === 0 ? (
                  <p className="text-slate-700">ログなし — ▶ dbt run で実行してください</p>
                ) : (
                  logs.map((l, i) => (
                    <div key={i} className="flex gap-3 leading-5">
                      {l.text !== '' && (
                        <span className="text-slate-700 flex-shrink-0">{l.ts}</span>
                      )}
                      <span className={
                        l.type === 'ok'    ? 'text-emerald-400' :
                        l.type === 'error' ? 'text-red-400' :
                        l.type === 'warn'  ? 'text-amber-400' :
                        l.type === 'run'   ? 'text-blue-400' :
                        l.type === 'done'  ? 'text-white font-bold' :
                        'text-slate-400'
                      }>
                        {l.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tests */}
            {tab === 'tests' && (
              <div className="h-full overflow-y-auto p-4 space-y-2">
                {testResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                    <p className="text-slate-600 text-sm">テストが未実行です</p>
                    <p className="text-slate-700 text-xs">先に ▶ dbt run を実行してから ✓ dbt test を押してください</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{ width: `${(testResults.filter(r => r.status === 'pass').length / testResults.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-emerald-400 font-bold text-sm">
                        {testResults.filter(r => r.status === 'pass').length} / {testResults.length} passed
                      </span>
                    </div>

                    {/* Test rows */}
                    {testResults.map((t, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
                          t.status === 'pass'
                            ? 'border-emerald-500/20 bg-emerald-500/5'
                            : 'border-red-500/20 bg-red-500/5'
                        }`}
                      >
                        <span className={t.status === 'pass' ? 'text-emerald-400' : 'text-red-400'}>
                          {t.status === 'pass' ? '✓' : '✗'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-xs font-mono">{t.model}</span>
                            <span className="text-slate-600 text-[10px]">·</span>
                            <span className="text-slate-400 text-xs font-mono">{t.column}</span>
                          </div>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block"
                            style={{
                              color: t.testType === 'not_null' ? '#6366f1' : t.testType === 'unique' ? '#f59e0b' : '#10b981',
                              background: t.testType === 'not_null' ? '#6366f115' : t.testType === 'unique' ? '#f59e0b15' : '#10b98115',
                            }}
                          >
                            {t.testType}
                          </span>
                        </div>
                        {t.status === 'fail' && (
                          <span className="text-red-400 text-[10px] font-mono">{t.failCount} failures</span>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Model results footer (when run) */}
      {modelResults.length > 0 && (
        <div className="flex-shrink-0 border-t border-slate-800 bg-slate-950/80 px-4 py-2">
          <div className="flex items-center gap-4 overflow-x-auto">
            {modelResults.map(r => (
              <div
                key={r.name}
                className="flex items-center gap-1.5 flex-shrink-0 cursor-pointer hover:opacity-80"
                onClick={() => { setSelectedFile(r.name); setTab('editor'); }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: STATUS_COLOR[r.status] }}
                />
                <span className="text-[10px] font-mono" style={{ color: FOLDER_COLOR[r.folder] }}>
                  {r.name}
                </span>
                {r.status === 'success' && (
                  <span className="text-[9px] text-slate-600">{r.rowCount}r</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DbtSimulatorWithProvider() {
  return (
    <ReactFlowProvider>
      <DbtSimulator />
    </ReactFlowProvider>
  );
}
