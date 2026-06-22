'use client';

import { useState } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { FilterNodeData } from '@/types';

export function FilterNode({ id, data }: NodeProps<FilterNodeData>) {
  const [condition, setCondition] = useState(data.condition);
  const { setNodes } = useReactFlow();

  const handleChange = (value: string) => {
    setCondition(value);
    setNodes(nds =>
      nds.map(n => n.id === id ? { ...n, data: { ...n.data, condition: value } } : n)
    );
  };

  return (
    <div className="rounded-xl border border-amber-500/40 bg-slate-800/90 shadow-lg shadow-amber-500/10 w-64">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-800"
      />
      <div className="flex items-center gap-2 rounded-t-xl bg-amber-500/20 px-3 py-2 border-b border-amber-500/30">
        <span className="text-amber-400 text-sm">⊘</span>
        <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Filter</span>
      </div>
      <div className="px-3 py-3 space-y-2">
        <label className="text-xs text-slate-400 font-mono">WHERE</label>
        <textarea
          value={condition}
          onChange={e => handleChange(e.target.value)}
          rows={2}
          className="w-full rounded bg-slate-900/80 border border-slate-600/50 px-2 py-1.5 text-xs font-mono text-slate-200 resize-none focus:outline-none focus:border-amber-500/60 nodrag"
          spellCheck={false}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-800"
      />
    </div>
  );
}
