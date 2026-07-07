'use client';
import { useState, useEffect, useRef } from 'react';

type LT = 'cmd' | 'log' | 'ok' | 'success' | 'blank';

const SCRIPT: Array<{ type: LT; text: string; pre: number }> = [
  { type: 'cmd',     text: '$ pipeline run --quest ec-site',      pre: 500 },
  { type: 'log',     text: 'Client: ShopFlow Inc.',               pre: 160 },
  { type: 'blank',   text: '',                                     pre: 50  },
  { type: 'log',     text: '── Source Layer ──────────────────',  pre: 200 },
  { type: 'ok',      text: '  orders.csv ....... loaded 42,891',  pre: 260 },
  { type: 'ok',      text: '  users.csv ......... loaded  8,204', pre: 380 },
  { type: 'ok',      text: '  products.csv ...... loaded  1,392', pre: 300 },
  { type: 'blank',   text: '',                                     pre: 50  },
  { type: 'log',     text: '── Staging Layer ─────────────────',  pre: 200 },
  { type: 'ok',      text: '  NULL 除去 ......... 312 rows',      pre: 320 },
  { type: 'ok',      text: '  型変換 ............. 8 columns',    pre: 280 },
  { type: 'ok',      text: '  表記揺れ修正 ....... status OK',    pre: 350 },
  { type: 'blank',   text: '',                                     pre: 50  },
  { type: 'log',     text: '── Warehouse Layer ───────────────',  pre: 200 },
  { type: 'ok',      text: '  fact_orders ....... modeled  ✓',    pre: 340 },
  { type: 'ok',      text: '  dim_users ......... modeled  ✓',    pre: 280 },
  { type: 'blank',   text: '',                                     pre: 50  },
  { type: 'log',     text: '── Mart Layer ────────────────────',  pre: 200 },
  { type: 'ok',      text: '  mart_revenue ...... ready    ✓',    pre: 300 },
  { type: 'blank',   text: '',                                     pre: 80  },
  { type: 'success', text: '✓ Pipeline complete — data is ready', pre: 120 },
];

const C: Record<LT, string> = {
  cmd:     '#22D3EE',
  log:     '#475569',
  ok:      '#4ADE80',
  success: '#34D399',
  blank:   'transparent',
};

export function TerminalTypewriter() {
  const [lines, setLines]   = useState<Array<{ type: LT; text: string }>>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [lines, cursor]);

  useEffect(() => {
    let alive = true;
    const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

    async function run() {
      while (alive) {
        setLines([]);
        setCursor(null);
        await sleep(300);

        for (const line of SCRIPT) {
          if (!alive) return;
          await sleep(line.pre);
          if (!alive) return;

          if (line.type === 'cmd') {
            setCursor('');
            for (let i = 1; i <= line.text.length; i++) {
              if (!alive) return;
              setCursor(line.text.slice(0, i));
              await sleep(38);
            }
            if (!alive) return;
            setCursor(null);
            setLines(p => [...p, { type: line.type, text: line.text }]);
          } else {
            setLines(p => [...p, { type: line.type, text: line.text }]);
          }
        }

        await sleep(2800);
      }
    }

    run();
    return () => { alive = false; };
  }, []);

  const showPrompt =
    cursor === null &&
    (lines.length === 0 || lines[lines.length - 1]?.type !== 'cmd');

  return (
    <div
      className="rounded-2xl overflow-hidden font-mono shadow-2xl w-full max-w-[440px] flex-shrink-0"
      style={{
        background: '#0d1117',
        border: '1px solid rgba(34,211,238,0.18)',
        boxShadow: '0 0 80px rgba(34,211,238,0.08), 0 25px 50px rgba(0,0,0,0.6)',
      }}
    >
      {/* macOS-style title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800/80 bg-slate-900/60">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <span className="text-slate-600 text-[11px] mx-auto tracking-wide select-none">
          modelion — pipeline
        </span>
      </div>

      {/* Terminal body */}
      <div
        ref={bodyRef}
        className="p-5 h-[268px] overflow-hidden text-[11.5px] leading-[1.75] space-y-px"
      >
        {lines.map((line, i) => (
          <div key={i}>
            {line.type === 'blank'
              ? <span className="select-none">&nbsp;</span>
              : <span style={{ color: C[line.type] }}>{line.text}</span>
            }
          </div>
        ))}

        {cursor !== null && (
          <div>
            <span style={{ color: C.cmd }}>{cursor}</span>
            <span style={{ color: C.cmd }} className="animate-pulse">▋</span>
          </div>
        )}

        {showPrompt && (
          <div>
            <span style={{ color: C.cmd }}>$ </span>
            <span style={{ color: C.cmd }} className="animate-pulse">▋</span>
          </div>
        )}
      </div>
    </div>
  );
}
