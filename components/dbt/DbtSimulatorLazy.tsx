'use client';

import dynamic from 'next/dynamic';

const DbtSimulatorWithProvider = dynamic(
  () => import('./DbtSimulator').then(m => m.DbtSimulatorWithProvider),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center h-full bg-[#060918] text-slate-500 gap-3">
        <div className="w-8 h-8 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin" />
        <span className="text-sm font-mono">dbt simulator loading...</span>
      </div>
    ),
  }
);

export { DbtSimulatorWithProvider };
