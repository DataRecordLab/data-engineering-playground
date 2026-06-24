'use client';

import { useCallback, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  BackgroundVariant,
  Connection,
  Controls,
  Edge,
  Handle,
  Node,
  NodeProps,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { PipelineLayerConfig } from '@/types';

// ─── Layer Node ───────────────────────────────────────────────────────────────

interface LayerNodeData extends PipelineLayerConfig {
  connected: boolean;
}

function LayerNode({ data }: NodeProps<LayerNodeData>) {
  return (
    <div
      className="relative rounded-xl border-2 transition-all"
      style={{
        borderColor: data.connected ? data.color : '#334155',
        background: data.connected ? `${data.color}18` : '#0f172a',
        width: 180,
        minHeight: 120,
        boxShadow: data.connected ? `0 0 16px ${data.color}40` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: data.color, border: 'none', width: 12, height: 12 }} />

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full" style={{ background: data.color }} />
          <p className="text-white text-xs font-bold">{data.label}</p>
          {data.connected && <span className="text-xs ml-auto" style={{ color: data.color }}>✓</span>}
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed mb-3">{data.description}</p>
        <div className="flex flex-wrap gap-1">
          {data.tables.map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-500">
              {t}
            </span>
          ))}
        </div>
      </div>

      <Handle type="source" position={Position.Right} style={{ background: data.color, border: 'none', width: 12, height: 12 }} />
    </div>
  );
}

const nodeTypes = { layerNode: LayerNode };

// ─── Inner (needs ReactFlowProvider) ─────────────────────────────────────────

interface Props {
  layers: PipelineLayerConfig[];
  requiredConnections: Array<{ from: string; to: string }>;
  onComplete: () => void;
}

function Inner({ layers, requiredConnections, onComplete }: Props) {
  const initialNodes: Node<LayerNodeData>[] = layers.map(l => ({
    id: l.id,
    type: 'layerNode',
    position: { x: l.x, y: l.y },
    data: { ...l, connected: false },
  }));

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [validated, setValidated] = useState<boolean | null>(null);
  const [missing, setMissing] = useState<string[]>([]);

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges(eds => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds));
      setValidated(null);
    },
    [setEdges],
  );

  const connectedNodeIds = new Set(edges.flatMap(e => [e.source, e.target]));
  const nodesWithStatus = nodes.map(n => ({
    ...n,
    data: { ...n.data, connected: connectedNodeIds.has(n.id) },
  }));

  function handleValidate() {
    const missingEdges = requiredConnections.filter(req =>
      !edges.some(e => e.source === req.from && e.target === req.to)
    );
    setMissing(missingEdges.map(req => {
      const fromLabel = layers.find(l => l.id === req.from)?.label ?? req.from;
      const toLabel = layers.find(l => l.id === req.to)?.label ?? req.to;
      return `${fromLabel} → ${toLabel}`;
    }));

    if (missingEdges.length === 0) {
      setValidated(true);
      setTimeout(onComplete, 800);
    } else {
      setValidated(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodesWithStatus}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 border-t border-slate-800 px-5 py-3 flex items-center justify-between bg-slate-950/80">
        <div className="space-y-1">
          {validated === false && missing.length > 0 && (
            <p className="text-red-400 text-xs">未接続: {missing.join(' / ')}</p>
          )}
          {validated === true && (
            <p className="text-green-400 text-xs font-medium">✓ パイプライン設計完了！次のステージへ…</p>
          )}
          {validated === null && (
            <p className="text-slate-500 text-xs">右側のハンドル（●）をドラッグして次のレイヤーに繋いでください</p>
          )}
        </div>
        <button
          onClick={handleValidate}
          disabled={validated === true}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          設計を確定する →
        </button>
      </div>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function QuestPipelineDesigner(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
