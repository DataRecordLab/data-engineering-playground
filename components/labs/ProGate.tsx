'use client';

import Link from 'next/link';
import { MioBadge } from '@/components/characters/MioBadge';

interface Props {
  labName: string;
  proFeatures: string[];
  onClose: () => void;
}

export function ProGate({ labName, proFeatures, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-sm w-full mx-4 rounded-2xl border border-indigo-900/60 p-8 text-center"
        style={{
          background: 'linear-gradient(135deg, #0c0c2a 0%, #080618 100%)',
          boxShadow: '0 0 80px rgba(99,102,241,0.2), 0 0 0 1px rgba(129,140,248,0.1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Mio */}
        <div className="flex justify-center mb-4">
          <MioBadge expression="thinking" scale={4} />
        </div>

        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
          style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8' }}
        >
          🔒 Proプラン限定
        </div>

        <h2 className="text-lg font-black text-white mb-1">
          {labName} の全機能を解放しよう！
        </h2>
        <p className="text-slate-400 text-xs mb-6 leading-relaxed">
          無料版はここまで。Proプランでは業界別クエストと
          深いシナリオで実践力が身につくよ。
        </p>

        {/* 特典リスト */}
        <div className="space-y-2 mb-6 text-left">
          {proFeatures.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <span className="text-indigo-400 flex-shrink-0 mt-0.5">✦</span>
              <span className="text-slate-300">{f}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/upgrade"
            className="block py-3 rounded-xl font-black text-sm text-white transition-all hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/30"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            ▶ Proプランにアップグレード
          </Link>
          <button
            onClick={onClose}
            className="py-2 text-slate-600 hover:text-slate-400 text-xs transition-colors"
          >
            あとで考える
          </button>
        </div>
      </div>
    </div>
  );
}
