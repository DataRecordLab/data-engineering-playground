'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { loadCsv, querySQL, runSQL } from '@/lib/duckdb/engine';
import type {
  AggregateNodeData,
  CsvSourceNodeData,
  FilterNodeData,
  TableOutputNodeData,
} from '@/types';
import { AggregateNode } from './nodes/AggregateNode';
import { CsvSourceNode } from './nodes/CsvSourceNode';
import { FilterNode } from './nodes/FilterNode';
import { TableOutputNode } from './nodes/TableOutputNode';

// orders.csv content (embedded for browser-only DuckDB)
const ORDERS_CSV = `order_id,user_id,product_id,amount,status,created_at
ORD-001,U-1,P-1,1500,completed,2024-01-15 10:30:00
ORD-002,U-2,P-3,3200,completed,2024-01-15 14:20:00
ORD-003,U-1,P-2,800,cancelled,2024-01-15 09:15:00
ORD-004,U-3,P-4,5600,completed,2024-01-15 18:00:00
ORD-005,U-4,P-1,1500,completed,2024-01-16 11:00:00
ORD-006,U-2,P-3,3200,completed,2024-01-16 13:30:00
ORD-007,U-5,P-2,800,pending,2024-01-16 08:00:00
ORD-008,U-1,P-4,5600,completed,2024-01-16 16:45:00
ORD-009,U-3,P-1,1500,completed,2024-01-17 09:30:00
ORD-010,U-4,P-3,3200,cancelled,2024-01-17 10:00:00
ORD-011,U-2,P-4,5600,completed,2024-01-17 14:00:00
ORD-012,U-5,P-2,800,completed,2024-01-17 15:30:00
ORD-013,U-1,P-3,3200,completed,2024-01-17 17:00:00
ORD-014,U-2,P-1,1500,completed,2024-01-18 11:00:00
ORD-015,U-3,P-2,800,cancelled,2024-01-18 12:30:00
ORD-016,U-4,P-4,5600,pending,2024-01-18 14:00:00
ORD-017,U-5,P-3,3200,completed,2024-01-19 09:00:00
ORD-018,U-1,P-1,1500,completed,2024-01-19 11:30:00
ORD-019,U-2,P-4,5600,completed,2024-01-19 13:00:00
ORD-020,U-3,P-2,800,completed,2024-01-19 15:00:00
ORD-021,U-4,P-3,3200,completed,2024-01-19 16:30:00
ORD-022,U-5,P-1,1500,cancelled,2024-01-20 10:00:00
ORD-023,U-1,P-4,5600,completed,2024-01-20 12:00:00
ORD-024,U-2,P-3,3200,completed,2024-01-20 14:00:00
ORD-025,U-3,P-1,1500,completed,2024-01-21 09:30:00
ORD-026,U-4,P-2,800,completed,2024-01-21 11:00:00
ORD-027,U-5,P-4,5600,pending,2024-01-21 13:00:00
ORD-028,U-1,P-3,3200,completed,2024-01-22 10:00:00
ORD-029,U-2,P-1,1500,completed,2024-01-22 12:30:00
ORD-030,U-3,P-4,5600,completed,2024-01-22 14:00:00`;

const nodeTypes = {
  csvSource: CsvSourceNode,
  filter: FilterNode,
  aggregate: AggregateNode,
  tableOutput: TableOutputNode,
};

const initialNodes = [
  {
    id: 'csv-source',
    type: 'csvSource',
    position: { x: 40, y: 180 },
    data: {
      label: 'CSV Source',
      csvContent: ORDERS_CSV,
      tableName: 'orders',
      rowCount: 30,
      columns: ['order_id', 'user_id', 'product_id', 'amount', 'status', 'created_at'],
    } satisfies CsvSourceNodeData,
  },
  {
    id: 'filter',
    type: 'filter',
    position: { x: 320, y: 160 },
    data: {
      label: 'Filter',
      condition: "LOWER(status) = 'completed'",
    } satisfies FilterNodeData,
  },
  {
    id: 'aggregate',
    type: 'aggregate',
    position: { x: 620, y: 120 },
    data: {
      label: 'Aggregate',
      groupBy: "strftime('%Y-%m-%d', created_at)",
      aggregateExpr: "SUM(CAST(amount AS NUMERIC)) AS total_sales,\nCOUNT(*) AS orders",
    } satisfies AggregateNodeData,
  },
  {
    id: 'output',
    type: 'tableOutput',
    position: { x: 940, y: 100 },
    data: {
      label: 'Table Output',
      result: null,
      status: 'idle',
    } satisfies TableOutputNodeData,
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'csv-source', target: 'filter', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
  { id: 'e2', source: 'filter', target: 'aggregate', animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
  { id: 'e3', source: 'aggregate', target: 'output', animated: true, style: { stroke: '#8b5cf6', strokeWidth: 2 } },
];

type ExecutionStatus = 'idle' | 'running' | 'done' | 'error';

function PipelineDesignerInner() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Record<string, unknown>>(
    initialNodes as Node<Record<string, unknown>>[]
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [log, setLog] = useState<string[]>([]);
  const { getNodes, getEdges } = useReactFlow();

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge({ ...connection, animated: true }, eds)),
    [setEdges]
  );

  const addLog = useCallback((msg: string) => {
    setLog(prev => [...prev, msg]);
  }, []);

  const execute = useCallback(async () => {
    setStatus('running');
    setLog([]);

    // Mark output as running
    setNodes(nds =>
      nds.map(n =>
        n.id === 'output'
          ? { ...n, data: { ...n.data, result: null, status: 'running' } }
          : n
      )
    );

    try {
      const currentNodes = getNodes();
      const currentEdges = getEdges();

      // Build adjacency: sourceId -> targetId[]
      const adj: Record<string, string[]> = {};
      for (const edge of currentEdges) {
        if (!adj[edge.source]) adj[edge.source] = [];
        adj[edge.source].push(edge.target);
      }

      // Find nodes by type
      const sourceNode = currentNodes.find(n => n.type === 'csvSource');
      const filterNode = currentNodes.find(n => n.type === 'filter');
      const aggNode = currentNodes.find(n => n.type === 'aggregate');

      if (!sourceNode) throw new Error('CSV Source ノードが見つかりません');

      // Step 1: Load CSV
      addLog('📂 CSVを読み込み中...');
      const srcData = sourceNode.data as CsvSourceNodeData;
      await loadCsv('pipeline_source', srcData.csvContent);
      addLog(`✓ ${srcData.rowCount}行 × ${srcData.columns.length}列 をDuckDBに読み込みました`);

      let currentTable = 'pipeline_source';

      // Step 2: Filter (if connected)
      const sourceConnectsToFilter =
        filterNode && adj['csv-source']?.includes('filter');

      if (filterNode && sourceConnectsToFilter) {
        const fd = filterNode.data as FilterNodeData;
        addLog(`⊘ フィルター適用中: WHERE ${fd.condition}`);
        await runSQL(
          `CREATE OR REPLACE TABLE pipeline_filtered AS SELECT * FROM ${currentTable} WHERE ${fd.condition}`
        );
        const countResult = await querySQL('SELECT COUNT(*) AS cnt FROM pipeline_filtered');
        const cnt = countResult.rows[0]?.cnt ?? '?';
        addLog(`✓ ${cnt}行 がフィルターを通過しました`);
        currentTable = 'pipeline_filtered';
      }

      // Step 3: Aggregate (if connected to upstream)
      const filterConnectsToAgg = aggNode && adj['filter']?.includes('aggregate');
      const sourceConnectsToAgg = aggNode && adj['csv-source']?.includes('aggregate');

      if (aggNode && (filterConnectsToAgg || sourceConnectsToAgg)) {
        const ad = aggNode.data as AggregateNodeData;
        addLog(`Σ 集計中: GROUP BY ${ad.groupBy}`);
        await runSQL(
          `CREATE OR REPLACE TABLE pipeline_result AS
           SELECT ${ad.groupBy} AS date, ${ad.aggregateExpr}
           FROM ${currentTable}
           GROUP BY ${ad.groupBy}
           ORDER BY date`
        );
        currentTable = 'pipeline_result';
        addLog('✓ 集計が完了しました');
      }

      // Step 4: Fetch results
      addLog('▦ 結果を取得中...');
      const result = await querySQL(`SELECT * FROM ${currentTable}`);

      if (result.error) throw new Error(result.error);

      addLog(`✓ 完了: ${result.rowCount}行`);
      setStatus('done');

      setNodes(nds =>
        nds.map(n =>
          n.id === 'output'
            ? { ...n, data: { ...n.data, result, status: 'done' } }
            : n
        )
      );
    } catch (e) {
      const msg = String(e);
      addLog(`✗ エラー: ${msg}`);
      setStatus('error');
      setNodes(nds =>
        nds.map(n =>
          n.id === 'output'
            ? { ...n, data: { ...n.data, result: { columns: [], rows: [], rowCount: 0, error: msg }, status: 'error' } }
            : n
        )
      );
    }
  }, [getNodes, getEdges, setNodes, addLog]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {nodes.length} nodes · {edges.length} edges
          </span>
          {status === 'done' && (
            <span className="text-xs text-emerald-400">Pipeline complete</span>
          )}
          {status === 'error' && (
            <span className="text-xs text-red-400">Error — see log below</span>
          )}
        </div>
        <button
          onClick={execute}
          disabled={status === 'running'}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors"
        >
          {status === 'running' ? (
            <>
              <span className="animate-spin inline-block">⟳</span>
              実行中...
            </>
          ) : (
            <>▶ Execute</>
          )}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.4}
          maxZoom={1.5}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#334155"
          />
          <Controls className="[&>button]:bg-slate-800 [&>button]:border-slate-600 [&>button]:text-slate-300" />
          <MiniMap
            nodeColor={n => {
              if (n.type === 'csvSource') return '#3b82f6';
              if (n.type === 'filter') return '#f59e0b';
              if (n.type === 'aggregate') return '#8b5cf6';
              return '#10b981';
            }}
            className="!bg-slate-900 !border-slate-700"
          />
        </ReactFlow>
      </div>

      {/* Execution Log */}
      {log.length > 0 && (
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-700/50 max-h-32 overflow-y-auto">
          {log.map((line, i) => (
            <div key={i} className="text-xs font-mono text-slate-400 leading-relaxed">
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PipelineDesigner() {
  return (
    <ReactFlowProvider>
      <PipelineDesignerInner />
    </ReactFlowProvider>
  );
}
