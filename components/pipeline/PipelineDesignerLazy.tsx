'use client';

import dynamic from 'next/dynamic';

const PipelineDesigner = dynamic(
  () => import('@/components/pipeline/PipelineDesigner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 h-full items-center justify-center bg-slate-950">
        <div className="text-center space-y-3">
          <div className="text-2xl text-slate-400 animate-spin">⟳</div>
          <p className="text-slate-400 text-sm">DuckDB を初期化中...</p>
        </div>
      </div>
    ),
  }
);

export { PipelineDesigner };
