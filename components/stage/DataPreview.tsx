'use client';
import type { QueryResult } from '@/types';

interface Props {
  result: QueryResult | null;
  title?: string;
}

export function DataPreview({ result, title }: Props) {
  if (!result) {
    return (
      <div className="flex items-center justify-center h-32 text-slate-600 text-xs rounded-lg border border-slate-800 bg-slate-900/50">
        SQLを実行するとデータが表示されます
      </div>
    );
  }

  if (result.error) {
    return (
      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono break-all">
        {result.error}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-800 overflow-hidden">
      {title && (
        <div className="px-3 py-1.5 bg-slate-800 text-xs text-slate-400 border-b border-slate-700 flex items-center justify-between">
          <span>{title}</span>
          <span className="text-slate-600">{result.rowCount} 行</span>
        </div>
      )}
      <div className="overflow-auto max-h-52">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800 sticky top-0">
              {result.columns.map(col => (
                <th key={col} className="px-3 py-2 text-left text-slate-500 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-900 hover:bg-slate-800/40">
                {result.columns.map(col => (
                  <td key={col} className="px-3 py-1.5 text-slate-300 whitespace-nowrap font-mono">
                    {row[col] === null
                      ? <span className="text-slate-600 italic">NULL</span>
                      : String(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
