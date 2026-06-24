'use client';

import { useState } from 'react';
import { runSQL } from '@/lib/duckdb/engine';
import type { Quest } from '@/types';

function parseCsv(content: string) {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1).map(l => l.split(','));
  return { headers, rows };
}

function CsvTable({ content }: { content: string }) {
  const { headers, rows } = parseCsv(content);
  const preview = rows.slice(0, 5);
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 text-xs">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-800/80">
            {headers.map(h => (
              <th key={h} className="px-3 py-2 text-left text-slate-400 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/40">
          {preview.map((row, i) => (
            <tr key={i} className="bg-slate-950/40 hover:bg-slate-900/40">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-1.5 whitespace-nowrap font-mono ${
                  cell === 'NULL' ? 'text-red-400 font-semibold' : 'text-slate-300'
                }`}>
                  {cell || '—'}
                </td>
              ))}
            </tr>
          ))}
          {rows.length > 5 && (
            <tr>
              <td colSpan={headers.length} className="px-3 py-1.5 text-slate-600 text-center text-xs">
                … 他 {rows.length - 5} 行
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface Props {
  quest: Quest;
  dbReady: boolean;
  onComplete: () => void;
}

export function SourceStage({ quest, dbReady, onComplete }: Props) {
  const [activeFile, setActiveFile] = useState(0);
  const [loading, setLoading] = useState(false);
  const [createdTables, setCreatedTables] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  async function handleLoad() {
    if (!dbReady || loading) return;
    setLoading(true);
    const created: string[] = [];
    try {
      for (const csv of quest.csvFiles) {
        await runSQL(
          `CREATE OR REPLACE TABLE src_${csv.name} AS SELECT *, CURRENT_TIMESTAMP AS _loaded_at FROM read_csv_auto('${csv.name}.csv')`
        );
        created.push(`src_${csv.name}`);
        setCreatedTables([...created]);
      }
      setDone(true);
      setTimeout(onComplete, 1200);
    } catch (e) {
      console.error('Source load failed:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-5">

        {/* CSV tabs */}
        <div>
          <p className="text-slate-400 text-sm mb-3">ShopNow から受け取ったデータ：</p>
          <div className="flex gap-2 mb-3 flex-wrap">
            {quest.csvFiles.map((csv, i) => (
              <button
                key={csv.name}
                onClick={() => setActiveFile(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  activeFile === i
                    ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                📄 {csv.name}.csv — {csv.content.trim().split('\n').length - 1}行
              </button>
            ))}
          </div>
          <CsvTable content={quest.csvFiles[activeFile].content} />
        </div>

        {/* Rules */}
        <div className="px-4 py-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
          <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider mb-3">Source Layer のルール</p>
          <ul className="space-y-2">
            {[
              ['データを加工しない・型変換しない', '元の状態を「事実」として残す'],
              ['_loaded_at（取り込み日時）のみ追加', 'いつ取り込んだか記録する'],
              ['このテーブルが「唯一の真実の源」', '処理が失敗しても元に戻れる'],
            ].map(([title, desc]) => (
              <li key={title} className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 flex-shrink-0 text-sm">✓</span>
                <div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Progress */}
        {createdTables.length > 0 && (
          <div className="space-y-1.5">
            {createdTables.map(t => (
              <div key={t} className="flex items-center gap-2 text-sm text-green-400">
                <span>✓</span>
                <span className="font-mono text-xs bg-green-500/10 px-2 py-0.5 rounded">{t}</span>
                <span className="text-slate-500 text-xs">を格納しました</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleLoad}
          disabled={!dbReady || loading || done}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white"
        >
          {done
            ? '✓ Source Layer への格納完了！'
            : loading
            ? <><span className="animate-spin inline-block">⟳</span> 格納中...</>
            : '▶ Source Layer に格納する'}
        </button>
      </div>
    </div>
  );
}
