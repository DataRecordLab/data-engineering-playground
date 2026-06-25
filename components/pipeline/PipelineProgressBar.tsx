'use client';

import Link from 'next/link';

const LAYER_META: Record<string, { short: string; color: string; tablePrefix: string }> = {
  source:    { short: 'Source',    color: '#6366f1', tablePrefix: 'src_' },
  staging:   { short: 'Staging',   color: '#f59e0b', tablePrefix: 'stg_' },
  warehouse: { short: 'Warehouse', color: '#10b981', tablePrefix: 'fact_/dim_' },
  mart:      { short: 'Mart',      color: '#f43f5e', tablePrefix: 'mart_' },
};

interface Props {
  questId: string;
  stages: Array<{ id: string; title: string }>;
  currentStageId: string;
  currentStageIndex: number;
}

export function PipelineProgressBar({ questId, stages, currentStageId, currentStageIndex }: Props) {
  const dataStages = stages.filter(s => s.id !== 'pipeline');

  return (
    <div className="flex items-center gap-0 px-5 py-2 bg-[#060d1a]/80 border-b border-slate-800/50 flex-shrink-0 overflow-x-auto">
      <span className="text-[10px] text-slate-600 uppercase tracking-wider font-medium mr-3 flex-shrink-0">Pipeline</span>

      {dataStages.map((stage, i) => {
        const meta = LAYER_META[stage.id];
        const globalIdx = stages.findIndex(s => s.id === stage.id);
        const isCurrent = stage.id === currentStageId;
        const isPast = globalIdx < currentStageIndex;
        const isLocked = globalIdx > currentStageIndex;

        return (
          <div key={stage.id} className="flex items-center flex-shrink-0">
            {i > 0 && (
              <div className="flex items-center mx-1">
                <div className={`w-6 h-px ${isPast ? 'bg-slate-500' : isCurrent ? 'bg-slate-600' : 'bg-slate-800'}`} />
                <svg width="6" height="8" viewBox="0 0 6 8" className={`flex-shrink-0 ${isPast ? 'text-slate-500' : 'text-slate-800'}`}>
                  <polyline points="0,0 6,4 0,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            )}

            <Link
              href={`/quest/${questId}/${stage.id}`}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border ${
                isCurrent
                  ? 'text-white border-opacity-60'
                  : isPast
                  ? 'text-slate-400 border-slate-700/40 hover:border-slate-600 hover:text-slate-300'
                  : 'text-slate-700 border-transparent cursor-default pointer-events-none'
              }`}
              style={isCurrent ? {
                backgroundColor: `${meta?.color}18`,
                borderColor: `${meta?.color}60`,
                color: meta?.color,
              } : {}}
            >
              <span className="font-mono text-[10px] w-4 text-center flex-shrink-0">
                {isPast ? '✓' : isCurrent ? '▷' : `${i + 1}`}
              </span>
              <span>{meta?.short ?? stage.id}</span>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
