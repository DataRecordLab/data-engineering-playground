'use client';

import dynamic from 'next/dynamic';

const UnifiedPipelineCanvas = dynamic(
  () => import('./UnifiedPipelineCanvas').then(m => m.UnifiedPipelineCanvas),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full text-slate-600 text-sm">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" />
        <p>パイプラインキャンバスを読み込み中...</p>
      </div>
    </div>
  )}
);

export { UnifiedPipelineCanvas };
