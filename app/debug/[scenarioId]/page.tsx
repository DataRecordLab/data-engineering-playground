'use client';

import { useParams } from 'next/navigation';
import { getDebugScenario } from '@/lib/debug';
import { DebugWorkspaceClient } from '@/components/debug/DebugWorkspaceClient';
import Link from 'next/link';

export default function DebugScenarioPage() {
  const params = useParams();
  const scenarioId = params.scenarioId as string;
  const scenario = getDebugScenario(scenarioId);

  if (!scenario) {
    return (
      <div className="min-h-screen bg-[#070910] flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <p className="text-slate-400 text-sm">シナリオが見つかりません: {scenarioId}</p>
          <Link href="/debug" className="text-red-400 hover:text-red-300 text-sm">
            ← Debug Lab に戻る
          </Link>
        </div>
      </div>
    );
  }

  return <DebugWorkspaceClient scenario={scenario} />;
}
