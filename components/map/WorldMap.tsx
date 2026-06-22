'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sprite } from '@/components/characters/Sprite';
import { PLAYER } from '@/components/characters/sprites/player';

// District definitions
interface District {
  id: string;
  questId: string;
  label: string;
  clientName: string;
  questTitle: string;
  difficulty: string;
  estimatedTime: string;
  cx: number;   // center x in SVG viewBox (0-900)
  cy: number;   // center y in SVG viewBox (0-560)
  color: string;
  status: 'available' | 'locked' | 'completed';
  lockReason?: string;
}

const DISTRICTS: District[] = [
  {
    id: 'ec',
    questId: 'ec-site',
    label: '商業区',
    clientName: 'ShopNow',
    questTitle: '売上が見えない',
    difficulty: '初級',
    estimatedTime: '60〜90分',
    cx: 195, cy: 190,
    color: '#F59E0B',
    status: 'available',
  },
  {
    id: 'tech',
    questId: 'saas',
    label: 'Tech Park',
    clientName: 'TaskFlow',
    questTitle: '解約率を下げろ',
    difficulty: '中級',
    estimatedTime: '90〜120分',
    cx: 195, cy: 390,
    color: '#8B5CF6',
    status: 'locked',
    lockReason: 'Lv.3 が必要',
  },
  {
    id: 'medical',
    questId: 'medical',
    label: '医療センター',
    clientName: 'CareHub',
    questTitle: '患者データを守れ',
    difficulty: '中級',
    estimatedTime: '120分',
    cx: 705, cy: 190,
    color: '#3B82F6',
    status: 'locked',
    lockReason: 'Lv.3 が必要',
  },
  {
    id: 'finance',
    questId: 'finance',
    label: '金融タワー',
    clientName: 'FinTrack',
    questTitle: '金融リスクを計算せよ',
    difficulty: '上級',
    estimatedTime: '180分',
    cx: 705, cy: 390,
    color: '#EAB308',
    status: 'locked',
    lockReason: 'Lv.5 + 中級2本完了',
  },
];

const HQ = { cx: 450, cy: 280 };

// Stars (pre-computed positions for SSR consistency)
const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: ((i * 137.5 + 50) % 900),
  y: ((i * 91.3 + 30) % 560),
  r: i % 3 === 0 ? 1.5 : 1,
  delay: (i * 0.3) % 4,
}));

interface TooltipState {
  district: District;
  x: number;
  y: number;
}

export function WorldMap() {
  const router = useRouter();
  const [hovered, setHovered] = useState<string | null>(null);
  const [playerPos, setPlayerPos] = useState(HQ);
  const [isMoving, setIsMoving] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const handleDistrictClick = useCallback(async (d: District) => {
    if (d.status === 'locked' || isMoving) return;
    setIsMoving(true);
    setPlayerPos({ cx: d.cx, cy: d.cy });
    await new Promise(r => setTimeout(r, 700));
    router.push(`/quest/${d.questId}`);
  }, [isMoving, router]);

  const hoveredDistrict = DISTRICTS.find(d => d.id === hovered);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#050914]">
      <svg
        viewBox="0 0 900 560"
        className="w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      >
        <defs>
          {/* Fog filter for locked districts */}
          <filter id="fog" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feColorMatrix in="blur" type="saturate" values="0" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="normal" result="blend" />
            <feComposite in="blend" in2="SourceGraphic" operator="in" />
          </filter>

          {/* Neon glow filter */}
          {DISTRICTS.map(d => (
            <filter key={d.id} id={`glow-${d.id}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation={hovered === d.id ? '4' : '2'} result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {/* HQ glow */}
          <filter id="glow-hq" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Night sky gradient */}
        <rect width="900" height="560" fill="url(#sky)" />
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050914" />
            <stop offset="100%" stopColor="#0A0E1A" />
          </linearGradient>
        </defs>

        {/* Stars */}
        {STARS.map((star, i) => (
          <circle
            key={i}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill="white"
            style={{
              animation: `twinkle ${2 + star.delay}s ease-in-out ${star.delay}s infinite`,
            }}
          />
        ))}

        {/* Roads from HQ to each district */}
        {DISTRICTS.map(d => (
          <line
            key={d.id}
            x1={HQ.cx} y1={HQ.cy}
            x2={d.cx} y2={d.cy}
            stroke="#1E293B"
            strokeWidth="2"
            strokeDasharray="8 4"
          />
        ))}

        {/* Districts */}
        {DISTRICTS.map(d => (
          <DistrictGroup
            key={d.id}
            district={d}
            isHovered={hovered === d.id}
            onHover={id => setHovered(id)}
            onClick={() => handleDistrictClick(d)}
            onTooltip={(t) => setTooltip(t)}
          />
        ))}

        {/* DataCraft HQ */}
        <HQBuilding cx={HQ.cx} cy={HQ.cy} />

        {/* Player character */}
        <g
          transform={`translate(${playerPos.cx - 32}, ${playerPos.cy - 70})`}
          style={{
            transition: 'transform 0.65s cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          <PlayerSprite isWalking={isMoving} />
        </g>
      </svg>

      {/* Tooltip overlay (HTML, outside SVG for better styling) */}
      {tooltip && hoveredDistrict && (
        <DistrictTooltip district={hoveredDistrict} />
      )}
    </div>
  );
}

// ── Sub-components ──

interface DistrictGroupProps {
  district: District;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  onTooltip: (t: TooltipState | null) => void;
}

function DistrictGroup({ district: d, isHovered, onHover, onClick, onTooltip }: DistrictGroupProps) {
  const scale = isHovered && d.status !== 'locked' ? 1.06 : 1;

  return (
    <g
      transform={`translate(${d.cx},${d.cy})`}
      style={{
        transition: 'transform 0.2s ease',
        transform: `translate(${d.cx}px, ${d.cy}px) scale(${scale})`,
        transformOrigin: `${d.cx}px ${d.cy}px`,
        cursor: d.status === 'locked' ? 'not-allowed' : 'pointer',
        filter: d.status === 'locked' ? 'url(#fog) grayscale(0.8) brightness(0.5)' : 'none',
      }}
      onMouseEnter={() => { onHover(d.id); onTooltip({ district: d, x: d.cx, y: d.cy }); }}
      onMouseLeave={() => { onHover(null); onTooltip(null); }}
      onClick={onClick}
    >
      {/* Building cluster */}
      <BuildingCluster district={d} isHovered={isHovered} />

      {/* District label */}
      <text
        y={70}
        textAnchor="middle"
        fill={d.status === 'locked' ? '#475569' : d.color}
        fontSize="9"
        fontFamily="monospace"
        fontWeight="bold"
        filter={d.status !== 'locked' ? `url(#glow-${d.id})` : undefined}
        className={d.status !== 'locked' ? 'animate-neon' : ''}
        style={{ color: d.color }}
      >
        {d.label}
      </text>

      {/* Lock icon */}
      {d.status === 'locked' && (
        <text y={85} textAnchor="middle" fill="#475569" fontSize="8" fontFamily="monospace">
          🔒 {d.lockReason}
        </text>
      )}

      {/* Available marker */}
      {d.status === 'available' && (
        <circle
          cy={-55}
          r={4}
          fill={d.color}
          className="animate-neon"
          style={{ color: d.color }}
        />
      )}
    </g>
  );
}

function BuildingCluster({ district: d, isHovered }: { district: District; isHovered: boolean }) {
  const c = d.color;
  const dark = '#0F172A';

  switch (d.id) {
    case 'ec':
      // Storefronts — varied height rectangular buildings
      return (
        <g>
          <rect x={-55} y={-60} width={22} height={60} fill={dark} stroke={c} strokeWidth="0.5" />
          <rect x={-55} y={-40} width={22} height={10} fill={c} opacity="0.3" /> {/* window row */}
          <rect x={-30} y={-50} width={28} height={50} fill={dark} stroke={c} strokeWidth="0.5" />
          <rect x={-30} y={-35} width={28} height={8} fill={c} opacity="0.4" />
          <rect x={2}  y={-45} width={20} height={45} fill={dark} stroke={c} strokeWidth="0.5" />
          <rect x={2}  y={-30} width={20} height={8} fill={c} opacity="0.3" />
          <rect x={26} y={-55} width={26} height={55} fill={dark} stroke={c} strokeWidth="0.5" />
          <rect x={26} y={-40} width={26} height={10} fill={c} opacity="0.4" />
          {/* Neon sign */}
          <rect x={-55} y={-65} width={107} height={8} fill={c} opacity={isHovered ? 0.9 : 0.6} rx="1" />
          <text x={0} y={-58} textAnchor="middle" fill="#0F172A" fontSize="5" fontWeight="bold" fontFamily="monospace">
            SHOP NOW
          </text>
        </g>
      );

    case 'tech':
      // Sleek glass towers
      return (
        <g>
          <rect x={-50} y={-70} width={18} height={70} fill={dark} stroke={c} strokeWidth="0.5" />
          {[0,1,2,3,4].map(i => (
            <rect key={i} x={-48} y={-65 + i * 14} width={14} height={10} fill={c} opacity="0.2" rx="0.5" />
          ))}
          <rect x={-28} y={-55} width={24} height={55} fill={dark} stroke={c} strokeWidth="0.5" />
          {[0,1,2].map(i => (
            <rect key={i} x={-26} y={-50 + i * 17} width={20} height={12} fill={c} opacity="0.25" rx="0.5" />
          ))}
          <rect x={0}  y={-75} width={16} height={75} fill={dark} stroke={c} strokeWidth="0.5" />
          {[0,1,2,3,4].map(i => (
            <rect key={i} x={2} y={-70 + i * 14} width={12} height={10} fill={c} opacity="0.2" rx="0.5" />
          ))}
          <rect x={20} y={-60} width={30} height={60} fill={dark} stroke={c} strokeWidth="0.5" />
          {/* Antenna */}
          <line x1={8} y1={-75} x2={8} y2={-85} stroke={c} strokeWidth="1.5" />
          <circle cx={8} cy={-86} r={2} fill={c} opacity="0.8" />
        </g>
      );

    case 'medical':
      // Hospital with cross
      return (
        <g>
          <rect x={-45} y={-65} width={90} height={65} fill={dark} stroke={c} strokeWidth="0.5" />
          {/* Cross symbol */}
          <rect x={-8} y={-55} width={16} height={44} fill={c} opacity="0.7" />
          <rect x={-25} y={-42} width={50} height={16} fill={c} opacity="0.7" />
          {/* Windows */}
          <rect x={-42} y={-60} width={12} height={10} fill={c} opacity="0.3" />
          <rect x={28} y={-60} width={12} height={10} fill={c} opacity="0.3" />
        </g>
      );

    case 'finance':
      // Tall skyscraper
      return (
        <g>
          <rect x={-22} y={-95} width={44} height={95} fill={dark} stroke={c} strokeWidth="0.5" />
          {/* Window grid */}
          {[0,1,2,3,4,5,6].map(row =>
            [0,1,2].map(col => (
              <rect
                key={`${row}-${col}`}
                x={-18 + col * 14}
                y={-88 + row * 13}
                width={10} height={9}
                fill={c}
                opacity={Math.random() > 0.3 ? 0.35 : 0.05}
                rx="0.5"
              />
            ))
          )}
          {/* Gold spire */}
          <polygon points="0,-110 -8,-95 8,-95" fill={c} opacity="0.8" />
          <line x1={0} y1={-95} x2={0} y2={-110} stroke={c} strokeWidth="1" />
          {/* Flanking buildings */}
          <rect x={-50} y={-55} width={24} height={55} fill={dark} stroke={c} strokeWidth="0.3" />
          <rect x={26}  y={-55} width={24} height={55} fill={dark} stroke={c} strokeWidth="0.3" />
        </g>
      );

    default:
      return null;
  }
}

function HQBuilding({ cx, cy }: { cx: number; cy: number }) {
  const c = '#38BDF8'; // cyan
  return (
    <g transform={`translate(${cx},${cy})`}>
      {/* Main building */}
      <rect x={-30} y={-80} width={60} height={80} fill="#0A1628" stroke={c} strokeWidth="1" />
      {/* Windows */}
      {[0,1,2,3,4].map(row =>
        [0,1].map(col => (
          <rect
            key={`${row}-${col}`}
            x={-22 + col * 24}
            y={-72 + row * 14}
            width={16} height={10}
            fill={c}
            opacity="0.3"
            rx="0.5"
          />
        ))
      )}
      {/* HQ sign */}
      <rect x={-30} y={-90} width={60} height={12} fill={c} opacity="0.85" rx="1" />
      <text
        x={0} y={-81}
        textAnchor="middle"
        fill="#0F172A"
        fontSize="6"
        fontWeight="bold"
        fontFamily="monospace"
      >
        ◈ DataCraft HQ
      </text>
      {/* Entrance */}
      <rect x={-10} y={-12} width={20} height={12} fill={c} opacity="0.2" />

      {/* Glow beneath */}
      <ellipse cx={0} cy={2} rx={40} ry={6} fill={c} opacity="0.1" />
    </g>
  );
}

function PlayerSprite({ isWalking }: { isWalking: boolean }) {
  return (
    <g className={isWalking ? 'animate-player-walk' : 'animate-idle-bob'}>
      <Sprite grid={PLAYER.neutral} scale={4} />
    </g>
  );
}

function DistrictTooltip({ district: d }: { district: District }) {
  const isLeft = d.cx < 450;
  const isTop = d.cy < 280;

  return (
    <div
      className="absolute pointer-events-none z-10"
      style={{
        left: isLeft ? '28%' : '52%',
        top: isTop ? '8%' : '54%',
      }}
    >
      <div className="bg-slate-900/98 backdrop-blur border border-slate-700 rounded-xl p-4 min-w-52 shadow-2xl shadow-black/80"
        style={{ borderColor: d.color + '40' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="w-2 h-2 rounded-full animate-neon"
            style={{ background: d.color, color: d.color }}
          />
          <span className="text-white font-bold text-sm">{d.clientName}</span>
          <span
            className="ml-auto text-xs px-2 py-0.5 rounded"
            style={{ background: d.color + '20', color: d.color }}
          >
            {d.difficulty}
          </span>
        </div>
        <p className="text-slate-200 text-sm font-medium mb-1">{d.questTitle}</p>
        <p className="text-slate-500 text-xs">{d.estimatedTime}</p>
        {d.status === 'locked' ? (
          <p className="mt-2 text-xs text-red-400 flex items-center gap-1">
            🔒 {d.lockReason}
          </p>
        ) : (
          <p className="mt-2 text-xs text-green-400">▶ クリックして受注</p>
        )}
      </div>
    </div>
  );
}
