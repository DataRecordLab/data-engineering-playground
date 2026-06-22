'use client';

import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { CsvSourceNodeData } from '@/types';

export function CsvSourceNode({ data }: NodeProps<CsvSourceNodeData>) {
  return (
    <div className="rounded-xl border border-blue-500/40 bg-slate-800/90 shadow-lg shadow-blue-500/10 w-52">
      <div className="flex items-center gap-2 rounded-t-xl bg-blue-500/20 px-3 py-2 border-b border-blue-500/30">
        <span className="text-blue-400 text-sm">▤</span>
        <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">CSV Source</span>
      </div>
      <div className="px-3 py-3 space-y-2">
        <div className="text-xs font-mono text-slate-300">{data.tableName}.csv</div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
            {data.rowCount} rows
          </span>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
            {data.columns.length} cols
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {data.columns.slice(0, 4).map(col => (
            <span key={col} className="text-xs px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 font-mono">
              {col}
            </span>
          ))}
          {data.columns.length > 4 && (
            <span className="text-xs px-1.5 py-0.5 text-slate-500">
              +{data.columns.length - 4}
            </span>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-slate-800"
      />
    </div>
  );
}
