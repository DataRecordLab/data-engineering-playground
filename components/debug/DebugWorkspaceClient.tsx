'use client';

import dynamic from 'next/dynamic';
import type { DebugScenario } from '@/types';

const DebugWorkspace = dynamic(
  () => import('./DebugWorkspace').then(m => ({ default: m.DebugWorkspace })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-[#070910] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">シナリオを読み込み中...</p>
        </div>
      </div>
    ),
  }
);

export function DebugWorkspaceClient({ scenario }: { scenario: DebugScenario }) {
  return <DebugWorkspace scenario={scenario} />;
}
