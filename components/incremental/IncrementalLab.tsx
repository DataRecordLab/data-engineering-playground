'use client';

import { useState } from 'react';
import {
  simulateStrategy,
  simulateSaasStrategy,
  WAREHOUSE_ROWS,
  SOURCE_ROWS,
  CDC_EVENTS,
  SAAS_WAREHOUSE_ROWS,
  SAAS_SOURCE_ROWS,
  SAAS_CDC_EVENTS,
  type LoadStrategy,
  type OrderRow,
  type SubRow,
} from '@/lib/incremental';

const STRATEGIES: { id: LoadStrategy; label: string; emoji: string; tagline: string }[] = [
  { id: 'full',        label: 'Full Load',   emoji: '🔄', tagline: '全件洗替' },
  { id: 'incremental', label: 'Incremental', emoji: '⏱',  tagline: 'watermark差分' },
  { id: 'upsert',      label: 'Upsert',      emoji: '🔀',  tagline: '差分 + 更新対応' },
  { id: 'cdc',         label: 'CDC',          emoji: '📡',  tagline: '変更データキャプチャ' },
];

const STATUS_COLOR: Record<string, string> = {
  pending:   'text-yellow-400',
  shipped:   'text-blue-400',
  delivered: 'text-green-400',
  cancelled: 'text-red-400',
  active:    'text-green-400',
};

const PLAN_COLOR: Record<string, string> = {
  pro:     'text-purple-400',
  starter: 'text-blue-400',
  free:    'text-slate-400',
};

type AnyRow = (OrderRow | SubRow) & { _state?: string };

function RowTable({ rows, title, questId }: { rows: AnyRow[]; title: string; questId: string }) {
  const isSaas = questId === 'saas';
  const headers = isSaas
    ? ['sub_id', 'plan', 'status', 'mrr', 'updated_at']
    : ['order_id', 'product', 'status', 'amount', 'updated_at'];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs text-slate-400 font-mono uppercase tracking-wider">{title}</p>
        <span className="text-xs text-slate-600">{rows.length} 件</span>
      </div>
      <div className="overflow-auto max-h-64 rounded-lg border border-slate-800">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              {headers.map(h => (
                <th key={h} className="px-2 py-1.5 text-left text-slate-500 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const state = r._state;
              const rowClass =
                state === 'new'       ? 'bg-green-500/5 border-l-2 border-green-500/40' :
                state === 'updated'   ? 'bg-yellow-500/5 border-l-2 border-yellow-500/40' :
                state === 'duplicate' ? 'bg-orange-500/5 border-l-2 border-orange-500/40' :
                state === 'stale'     ? 'bg-red-500/5 border-l-2 border-red-500/40 opacity-60' : '';
              const key = isSaas ? (r as SubRow).sub_id : (r as OrderRow).order_id;
              return (
                <tr key={`${key}-${i}`} className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${rowClass}`}>
                  {isSaas ? (
                    <>
                      <td className="px-2 py-1 text-slate-300">{(r as SubRow).sub_id}</td>
                      <td className={`px-2 py-1 font-bold ${PLAN_COLOR[(r as SubRow).plan] ?? 'text-slate-400'}`}>{(r as SubRow).plan}</td>
                      <td className={`px-2 py-1 ${STATUS_COLOR[r.status] ?? 'text-slate-400'}`}>{r.status}</td>
                      <td className="px-2 py-1 text-slate-300">¥{(r as SubRow).mrr.toLocaleString()}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1 text-slate-300">{(r as OrderRow).order_id}</td>
                      <td className="px-2 py-1 text-slate-300">{(r as OrderRow).product}</td>
                      <td className={`px-2 py-1 ${STATUS_COLOR[r.status] ?? 'text-slate-400'}`}>{r.status}</td>
                      <td className="px-2 py-1 text-slate-300">¥{(r as OrderRow).amount.toLocaleString()}</td>
                    </>
                  )}
                  <td className={`px-2 py-1 ${r.updated_at > '2024-01-14' ? 'text-blue-300' : 'text-slate-500'}`}>{r.updated_at}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface IncrementalLabProps {
  onStrategyRun?: (strategy: LoadStrategy) => void;
  lockedStrategies?: LoadStrategy[];
  onLockedClick?: () => void;
  questId?: string;
}

export function IncrementalLab({ onStrategyRun, lockedStrategies = [], onLockedClick, questId = 'ec-site' }: IncrementalLabProps = {}) {
  const isSaas = questId === 'saas';
  const warehouseRows = isSaas ? SAAS_WAREHOUSE_ROWS : WAREHOUSE_ROWS;
  const sourceRows    = isSaas ? SAAS_SOURCE_ROWS    : SOURCE_ROWS;
  const cdcEvents     = isSaas ? SAAS_CDC_EVENTS      : CDC_EVENTS;
  const simulate      = isSaas ? simulateSaasStrategy : simulateStrategy;
  const entityLabel   = isSaas ? 'サブスクリプション' : '注文';
  const tableName     = isSaas ? 'subscriptions'      : 'orders';
  const idKey         = isSaas ? 'sub_id'             : 'order_id';

  const [strategy, setStrategy] = useState<LoadStrategy>('full');
  const [result, setResult] = useState<ReturnType<typeof simulate> | null>(null);
  const [running, setRunning] = useState(false);

  function handleRun() {
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      setResult(simulate(strategy));
      setRunning(false);
      onStrategyRun?.(strategy);
    }, 600);
  }

  const efficiency = result
    ? Math.round((1 - result.rowsScanned / sourceRows.length) * 100)
    : null;

  return (
    <div className="min-h-screen bg-[#070910] text-white">
      {/* Header */}
      <header className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/80">
        <span className="text-blue-400 font-black text-lg">◈</span>
        <div>
          <h1 className="font-black text-sm">Incremental Load Lab</h1>
          <p className="text-slate-500 text-xs">Full Load / Incremental / Upsert / CDC の違いを体験する — <span className="text-indigo-400">{entityLabel}データで学習中</span></p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* データ状況バナー */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[10px] text-slate-500 mb-1">前回実行（2024-01-14）</p>
            <p className="text-2xl font-black text-slate-300">{warehouseRows.length}<span className="text-xs text-slate-500 ml-1">件</span></p>
            <p className="text-[10px] text-slate-600">warehouse_{tableName} の現在の状態</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3">
            <p className="text-[10px] text-blue-400 mb-1">今日のソースDB（2024-01-15）</p>
            <p className="text-2xl font-black text-blue-300">{sourceRows.length}<span className="text-xs text-blue-500 ml-1">件</span></p>
            <p className="text-[10px] text-blue-600">
              {isSaas ? '+2新規 / ~2変更 / -1解約' : '+3新規 / ~2更新 / -1削除'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
            <p className="text-[10px] text-slate-500 mb-1">CDC 変更ログ</p>
            <div className="flex justify-center gap-3 text-xs font-mono">
              <span className="text-green-400">+{cdcEvents.filter(e => e.op === '+').length}</span>
              <span className="text-yellow-400">~{cdcEvents.filter(e => e.op === '~').length}</span>
              <span className="text-red-400">-{cdcEvents.filter(e => e.op === '-').length}</span>
            </div>
            <p className="text-[10px] text-slate-600">INSERT / UPDATE / DELETE</p>
          </div>
        </div>

        {/* CDC変更ログ */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-3">変更ログ（今日の差分）</p>
          <div className="flex flex-wrap gap-2">
            {cdcEvents.map((ev, idx) => {
              const rowId = isSaas ? (ev as typeof SAAS_CDC_EVENTS[0]).sub_id : (ev as typeof CDC_EVENTS[0]).order_id;
              return (
                <div key={`${rowId}-${idx}`} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border ${
                  ev.op === '+' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                  ev.op === '~' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                  'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  <span className="font-bold">{ev.op}</span>
                  <span>{idKey}#{rowId}</span>
                  <span className="text-slate-500">{ev.reason}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ストラテジー選択 */}
        <div className="grid grid-cols-4 gap-3">
          {STRATEGIES.map(s => {
            const isLocked = lockedStrategies.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => {
                  if (isLocked) { onLockedClick?.(); return; }
                  setStrategy(s.id); setResult(null);
                }}
                className={`rounded-xl border px-4 py-3 text-left transition-all relative ${
                  isLocked
                    ? 'border-slate-800/50 bg-slate-900/20 opacity-60 cursor-pointer'
                    : strategy === s.id
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                }`}
              >
                {isLocked && (
                  <span className="absolute top-2 right-2 text-[10px] text-slate-600">🔒</span>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{s.emoji}</span>
                  <span className="font-bold text-xs text-white">{s.label}</span>
                </div>
                <p className="text-[10px] text-slate-500">{s.tagline}</p>
              </button>
            );
          })}
        </div>

        {/* SQL + Run */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">実行SQL</p>
            <button
              onClick={handleRun}
              disabled={running}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-xs font-bold transition-colors"
            >
              {running ? '実行中...' : '▶ 実行'}
            </button>
          </div>
          <pre className="text-[11px] font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
            {STRATEGIES.find(s => s.id === strategy) && simulate(strategy).sql}
          </pre>
        </div>

        {/* 結果 */}
        {result && (
          <div className="space-y-4">
            {/* メトリクス */}
            <div className="grid grid-cols-4 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">スキャン件数</p>
                <p className="text-xl font-black text-white">{result.rowsScanned}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-center">
                <p className="text-[10px] text-slate-500 mb-1">書き込み件数</p>
                <p className="text-xl font-black text-white">{result.rowsWritten}</p>
              </div>
              <div className={`rounded-xl border px-4 py-3 text-center ${
                efficiency! > 50 ? 'border-green-500/20 bg-green-500/5' : 'border-slate-800 bg-slate-900/60'
              }`}>
                <p className="text-[10px] text-slate-500 mb-1">スキャン削減率</p>
                <p className={`text-xl font-black ${efficiency! > 50 ? 'text-green-400' : 'text-slate-300'}`}>
                  {efficiency}%
                </p>
              </div>
              <div className={`rounded-xl border px-4 py-3 text-center ${
                result.ok ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'
              }`}>
                <p className="text-[10px] text-slate-500 mb-1">結果の正確性</p>
                <p className={`text-xl font-black ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {result.ok ? '✓ 正確' : '✗ 問題あり'}
                </p>
              </div>
            </div>

            {/* 問題・警告 */}
            {result.issues.length > 0 && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-1">
                {result.issues.map((issue, i) => (
                  <p key={i} className="text-xs text-red-300">{issue}</p>
                ))}
              </div>
            )}

            {/* 凡例 */}
            <div className="flex gap-4 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-green-500/40 border-l-2 border-green-500" />新規</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-yellow-500/40 border-l-2 border-yellow-500" />更新</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-orange-500/40 border-l-2 border-orange-500" />重複</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500/40 border-l-2 border-red-500 opacity-60" />削除漏れ</span>
            </div>

            {/* ビフォーアフター */}
            <div className="grid grid-cols-2 gap-4">
              <RowTable rows={warehouseRows as AnyRow[]} title={`Before — warehouse_${tableName}`} questId={questId} />
              <RowTable rows={result.warehouseAfter as AnyRow[]} title={`After — warehouse_${tableName}`} questId={questId} />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
