'use client';
import { useState, useEffect } from 'react';

const LAYERS = [
  { icon: '🗄️', label: 'Source Layer',    color: '#818CF8', detail: '42,891 rows 取得完了'  },
  { icon: '🧹', label: 'Staging Layer',   color: '#34D399', detail: 'NULL除去 · 型変換 完了'  },
  { icon: '🏗️', label: 'Warehouse Layer', color: '#F59E0B', detail: 'fact / dim 設計 完了'   },
  { icon: '📊', label: 'Mart Layer',      color: '#F87171', detail: 'KPI テーブル完成 ✓'      },
];

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function PipelineFlowAnimation() {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [done, setDone] = useState([false, false, false, false]);

  useEffect(() => {
    let alive = true;

    async function run() {
      while (alive) {
        setActiveIdx(-1);
        setDone([false, false, false, false]);
        await sleep(700);

        for (let i = 0; i < LAYERS.length; i++) {
          if (!alive) return;
          setActiveIdx(i);
          await sleep(1100);
          if (!alive) return;
          setDone(prev => { const n = [...prev]; n[i] = true; return n; });
          await sleep(250);
        }

        await sleep(2200);
      }
    }

    run();
    return () => { alive = false; };
  }, []);

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl w-full max-w-[380px] flex-shrink-0"
      style={{
        background: '#0d1117',
        border: '1px solid rgba(129,140,248,0.2)',
        boxShadow: '0 0 80px rgba(129,140,248,0.08), 0 25px 50px rgba(0,0,0,0.6)',
      }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-slate-600 text-[11px] mx-auto tracking-wide select-none">
          データパイプライン
        </span>
      </div>

      {/* Pipeline nodes */}
      <div className="px-5 py-5 space-y-0">
        {LAYERS.map((layer, i) => {
          const isActive = activeIdx === i;
          const isDone   = done[i];
          const flowOn   = activeIdx > i || done[i];
          const nextColor = LAYERS[i + 1]?.color ?? layer.color;

          return (
            <div key={layer.label}>
              {/* Node card */}
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500"
                style={{
                  background:  isActive || isDone ? `${layer.color}12` : 'rgba(15,23,42,0.4)',
                  border:      `1px solid ${isActive || isDone ? `${layer.color}40` : 'rgba(51,65,85,0.3)'}`,
                  boxShadow:   isActive ? `0 0 24px ${layer.color}25` : 'none',
                  transform:   isActive ? 'scale(1.01)' : 'scale(1)',
                }}
              >
                <span className="text-2xl leading-none">{layer.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white leading-tight">{layer.label}</p>
                  <p
                    className="text-[11px] mt-0.5 transition-colors duration-300"
                    style={{ color: isDone ? layer.color : isActive ? '#94A3B8' : '#334155' }}
                  >
                    {isDone ? layer.detail : isActive ? '処理中...' : '待機中'}
                  </p>
                </div>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black flex-shrink-0 transition-all duration-400"
                  style={{
                    background: isDone ? layer.color   : isActive ? `${layer.color}25` : 'rgba(51,65,85,0.3)',
                    color:      isDone ? '#000'        : isActive ? layer.color         : '#334155',
                  }}
                >
                  {isDone ? '✓' : i + 1}
                </div>
              </div>

              {/* Connector + flowing dots */}
              {i < LAYERS.length - 1 && (
                <div className="relative flex justify-center" style={{ height: 40 }}>
                  {/* Static line */}
                  <div
                    className="w-px transition-colors duration-500"
                    style={{ background: flowOn ? `${nextColor}45` : 'rgba(51,65,85,0.2)' }}
                  />
                  {/* Flowing dots */}
                  {flowOn && [0, 1, 2].map(j => (
                    <div
                      key={j}
                      className="absolute rounded-full"
                      style={{
                        width: 6,
                        height: 6,
                        background: nextColor,
                        left: 'calc(50% - 3px)',
                        top: 2,
                        boxShadow: `0 0 8px ${nextColor}`,
                        animation: 'flow-dot 0.95s ease-in-out infinite',
                        animationDelay: `${j * 0.32}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
