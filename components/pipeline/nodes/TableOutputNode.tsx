'use client';

import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import type { TableOutputNodeData } from '@/types';

export function TableOutputNode({ data }: NodeProps<TableOutputNodeData>) {
  const { result, status } = data;

  return (
    <div className="rounded-xl border border-emerald-500/40 bg-slate-800/90 shadow-lg shadow-emerald-500/10 w-80">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-slate-800"
      />
      <div className="flex items-center justify-between rounded-t-xl bg-emerald-500/20 px-3 py-2 border-b border-emerald-500/30">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-sm">▦</span>
          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Table Output</span>
        </div>
        {status === 'done' && result && (
          <span className="text-xs text-emerald-400">{result.rowCount} rows</span>
        )}
      </div>

      <div className="px-3 py-3">
        {status === 'idle' && (
          <p className="text-xs text-slate-500 text-center py-4">
            Connect nodes and click Execute
          </p>
        )}
        {status === 'running' && (
          <p className="text-xs text-slate-400 text-center py-4 animate-pulse">
            Running pipeline...
          </p>
        )}
        {status === 'error' && result?.error && (
          <p className="text-xs text-red-400 py-2 font-mono">{result.error}</p>
        )}
        {status === 'done' && result && result.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  {result.columns.map(col => (
                    <th
                      key={col}
                      className="px-2 py-1 text-left font-mono text-slate-400 border-b border-slate-700"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-slate-900/30' : ''}>
                    {result.columns.map(col => (
                      <td key={col} className="px-2 py-1 font-mono text-slate-300 border-b border-slate-800/50">
                        {row[col] === null ? (
                          <span className="text-red-400/70">NULL</span>
                        ) : (
                          String(row[col])
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {result.rows.length > 10 && (
              <p className="text-xs text-slate-500 text-center pt-2">
                +{result.rows.length - 10} more rows
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
