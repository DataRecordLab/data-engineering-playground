'use client';

import { useState, useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  LINEAGE_GRAPHS,
  LAYER_META,
  getLineagePath,
  type LineageNode,
  type LineageColumn,
} from '@/lib/lineage/graph';

// ── テーブルノード ─────────────────────────────────────────────────────────────

function TableNode({ data }: NodeProps) {
  const node = data as LineageNode & {
    selected: boolean;
    highlighted: boolean;
    dimmed: boolean;
    onSelect: (id: string) => void;
    selectedColumn: string | null;
    onSelectColumn: (col: string | null) => void;
  };
  const meta = LAYER_META[node.layer];

  return (
    <div
      onClick={() => node.onSelect(node.id)}
      className="cursor-pointer transition-all duration-200"
      style={{
        minWidth: 160,
        borderRadius: 10,
        border: `1.5px solid ${node.selected ? meta.color : node.highlighted ? meta.color + '80' : '#1e293b'}`,
        background: node.dimmed ? '#0a0a12' : meta.bg,
        opacity: node.dimmed ? 0.35 : 1,
        boxShadow: node.selected ? `0 0 20px ${meta.color}40` : undefined,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ background: meta.color, width: 8, height: 8 }} />
      <Handle type="source" position={Position.Right} style={{ background: meta.color, width: 8, height: 8 }} />

      {/* ヘッダー */}
      <div
        className="px-3 py-2 rounded-t-[8px] border-b"
        style={{ borderColor: meta.color + '30', background: meta.color + '18' }}
      >
        <p className="text-[9px] font-mono font-bold" style={{ color: meta.color }}>
          {meta.label}
        </p>
        <p className="text-[11px] font-bold text-white leading-tight mt-0.5">{node.label}</p>
      </div>

      {/* カラムリスト */}
      <div className="py-1">
        {node.columns.map(col => {
          const isSelected = node.selectedColumn === col.name;
          return (
            <div
              key={col.name}
              onClick={e => { e.stopPropagation(); node.onSelectColumn(isSelected ? null : col.name); }}
              className="flex items-center justify-between px-3 py-0.5 hover:bg-white/5 cursor-pointer transition-colors"
              style={{
                background: isSelected ? meta.color + '20' : undefined,
                borderLeft: isSelected ? `2px solid ${meta.color}` : '2px solid transparent',
              }}
            >
              <span className="text-[10px] text-slate-300 font-mono">{col.name}</span>
              <span className="text-[9px] text-slate-600 font-mono">{col.type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const NODE_TYPES = { table: TableNode };

// ── メインコンポーネント ───────────────────────────────────────────────────────

interface LineageGraphProps {
  onNodeSelect?: (id: string) => void;
  questId?: string;
}

export function LineageGraph({ onNodeSelect, questId = 'ec-site' }: LineageGraphProps = {}) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);

  // questId が変わったら選択状態をリセット
  useEffect(() => {
    setSelectedNodeId(null);
    setSelectedColumn(null);
  }, [questId]);

  const graphData = LINEAGE_GRAPHS[questId] ?? LINEAGE_GRAPHS['ec-site'];
  const graphNodes = graphData.nodes;
  const graphEdges = graphData.edges;

  const { upstream, downstream } = selectedNodeId
    ? getLineagePath(selectedNodeId, graphEdges)
    : { upstream: new Set<string>(), downstream: new Set<string>() };

  const handleSelectNode = useCallback((id: string) => {
    setSelectedNodeId(prev => {
      const next = prev === id ? null : id;
      if (next) onNodeSelect?.(next);
      return next;
    });
    setSelectedColumn(null);
  }, [onNodeSelect]);

  const handleSelectColumn = useCallback((col: string | null) => {
    setSelectedColumn(col);
  }, []);

  const nodes = graphNodes.map(n => ({
    id: n.id,
    type: 'table',
    position: { x: n.x, y: n.y },
    data: {
      ...n,
      selected: n.id === selectedNodeId,
      highlighted: upstream.has(n.id) || downstream.has(n.id),
      dimmed: selectedNodeId !== null && n.id !== selectedNodeId && !upstream.has(n.id) && !downstream.has(n.id),
      onSelect: handleSelectNode,
      selectedColumn,
      onSelectColumn: handleSelectColumn,
    },
    draggable: false,
  }));

  const edges = graphEdges.map(e => {
    const isActive = selectedNodeId && (
      (e.source === selectedNodeId || e.target === selectedNodeId) ||
      (upstream.has(e.source) && (upstream.has(e.target) || e.target === selectedNodeId)) ||
      (downstream.has(e.target) && (downstream.has(e.source) || e.source === selectedNodeId))
    );
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      animated: !!isActive,
      style: {
        stroke: isActive ? '#818cf8' : '#1e293b',
        strokeWidth: isActive ? 2 : 1,
        opacity: selectedNodeId && !isActive ? 0.2 : 1,
      },
    };
  });

  // 選択ノードのカラムリネージュ表示
  const selectedNode = graphNodes.find(n => n.id === selectedNodeId);
  const selectedCol: LineageColumn | undefined = selectedNode?.columns.find(c => c.name === selectedColumn);

  return (
    <div className="min-h-screen bg-[#070910] text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex-shrink-0">
        <span className="text-blue-400 font-black text-lg">◈</span>
        <div>
          <h1 className="font-black text-sm">Data Lineage Visualizer</h1>
          <p className="text-slate-500 text-xs">テーブルをクリックして上流・下流の依存関係を確認する</p>
        </div>
        <div className="ml-auto flex gap-3">
          {Object.entries(LAYER_META).map(([key, meta]) => (
            <span key={key} className="flex items-center gap-1.5 text-[10px]">
              <span className="w-2 h-2 rounded-sm" style={{ background: meta.color }} />
              <span className="text-slate-400">{meta.label}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Graph */}
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
        </div>

        {/* 右パネル */}
        {selectedNode && (
          <aside className="w-72 border-l border-slate-800 bg-slate-950/80 overflow-y-auto flex-shrink-0 p-4 space-y-4">
            <div>
              <p className="text-[9px] text-slate-500 font-mono uppercase tracking-wider mb-1">
                {LAYER_META[selectedNode.layer].label}
              </p>
              <p className="font-bold text-white">{selectedNode.label}</p>
            </div>

            {/* 依存関係サマリ */}
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                <p className="text-[10px] text-slate-500 mb-1">上流（データの源泉）</p>
                {upstream.size === 0
                  ? <p className="text-[10px] text-slate-600">なし（ソーステーブル）</p>
                  : Array.from(upstream).map(id => (
                    <p key={id} className="text-[10px] text-indigo-300 font-mono">← {id}</p>
                  ))}
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                <p className="text-[10px] text-slate-500 mb-1">下流（このデータを使うもの）</p>
                {downstream.size === 0
                  ? <p className="text-[10px] text-slate-600">なし（最終出力）</p>
                  : Array.from(downstream).map(id => (
                    <p key={id} className="text-[10px] text-purple-300 font-mono">→ {id}</p>
                  ))}
              </div>
            </div>

            {/* カラムリネージュ */}
            {selectedCol ? (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                  カラムリネージュ: {selectedCol.name}
                </p>
                <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-3 py-2">
                  <p className="text-[10px] font-mono text-indigo-300 font-bold">{selectedNode.id}.{selectedCol.name}</p>
                  <p className="text-[9px] text-slate-500">{selectedCol.type}</p>
                </div>
                {selectedCol.sourceColumns && selectedCol.sourceColumns.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[9px] text-slate-600">↑ ソース</p>
                    {selectedCol.sourceColumns.map((src, i) => (
                      <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
                        <p className="text-[10px] font-mono text-slate-300">{src.nodeId}.{src.columnName}</p>
                        {src.transform && (
                          <p className="text-[9px] text-amber-500 mt-0.5">変換: {src.transform}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[10px] text-slate-600">
                カラム名をクリックするとカラムレベルのリネージュを確認できます
              </p>
            )}

            {/* カラム一覧 */}
            <div>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-2">カラム一覧</p>
              <div className="space-y-0.5">
                {selectedNode.columns.map(col => (
                  <button
                    key={col.name}
                    onClick={() => setSelectedColumn(c => c === col.name ? null : col.name)}
                    className={`w-full text-left px-2 py-1 rounded transition-colors ${
                      selectedColumn === col.name ? 'bg-indigo-500/20 text-indigo-300' : 'hover:bg-slate-800/60 text-slate-400'
                    }`}
                  >
                    <span className="text-[10px] font-mono">{col.name}</span>
                    <span className="text-[9px] text-slate-600 ml-2">{col.type}</span>
                    {col.sourceColumns && <span className="text-[9px] text-indigo-600 ml-1">↑</span>}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => { setSelectedNodeId(null); setSelectedColumn(null); }}
              className="w-full py-2 rounded-lg border border-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              選択解除
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}
