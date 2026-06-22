'use client';

import { useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { AggregateNodeData } from '@/types';

export function AggregateNode({ id, data }: NodeProps<AggregateNodeData>) {
  const [groupBy, setGroupBy] = useState(data.groupBy);
  const [aggregateExpr, setAggregateExpr] = useState(data.aggregateExpr);
  const { setNodes } = useReactFlow();

  const update = (patch: Partial<AggregateNodeData>) => {
    setNodes(nds =>
      nds.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)
    );
  };

  return (
    <div className="rounded-xl border border-violet-500/40 bg-slate-800/90 shadow-lg shadow-violet-500/10 w-64">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-slate-800"
      />
      <div className="flex items-center gap-2 rounded-t-xl bg-violet-500/20 px-3 py-2 border-b border-violet-500/30">
        <span className="text-violet-400 text-sm">Σ</span>
        <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">Aggregate</span>
      </div>
      <div className="px-3 py-3 space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-mono">GROUP BY</label>
          <input
            value={groupBy}
            onChange={e => {
              setGroupBy(e.target.value);
              update({ groupBy: e.target.value });
            }}
            className="w-full rounded bg-slate-900/80 border border-slate-600/50 px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-violet-500/60 nodrag"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-slate-400 font-mono">SELECT</label>
          <textarea
            value={aggregateExpr}
            onChange={e => {
              setAggregateExpr(e.target.value);
              update({ aggregateExpr: e.target.value });
            }}
            rows={3}
            className="w-full rounded bg-slate-900/80 border border-slate-600/50 px-2 py-1.5 text-xs font-mono text-slate-200 resize-none focus:outline-none focus:border-violet-500/60 nodrag"
            spellCheck={false}
          />
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-violet-500 !border-2 !border-slate-800"
      />
    </div>
  );
}
