import Link from 'next/link';
import { PipelineDesigner } from '@/components/pipeline/PipelineDesignerLazy';

export default function PlaygroundPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-900 text-white">
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-500 hover:text-white text-sm transition-colors">
            ← Home
          </Link>
          <span className="text-slate-700">/</span>
          <span className="font-semibold text-white">◈ DataCraft | Playground</span>
        </div>
        <div className="text-xs text-slate-500">ECサイト売上分析 · DuckDB WASM</div>
      </header>

      <div className="flex-1 relative overflow-hidden">
        <PipelineDesigner />
      </div>
    </div>
  );
}
