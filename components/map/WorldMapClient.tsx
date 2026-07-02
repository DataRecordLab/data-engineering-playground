'use client';

import dynamic from 'next/dynamic';

const WorldMap = dynamic(
  () => import('./WorldMap').then(m => ({ default: m.WorldMap })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center w-full h-full bg-[#050914]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-idle-bob inline-block">◈</div>
          <p className="text-slate-500 text-sm">Modelion City を読み込み中...</p>
        </div>
      </div>
    ),
  }
);

export function WorldMapClient() {
  return (
    <div className="w-full h-full">
      <WorldMap />
    </div>
  );
}
