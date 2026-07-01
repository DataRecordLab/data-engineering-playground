'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store/gameStore';
import { buildPlayerSprite } from '@/components/characters/sprites/playerCustom';
import { Sprite } from '@/components/characters/Sprite';
import { DEFAULT_CHARACTER_CONFIG } from '@/types';
import type { CharacterConfig } from '@/types';

// ── World theme config ───────────────────────────────────────────────

interface WorldConfig {
  id: string;
  stageId: string | null;
  label: string;
  theme: string;
  sky: [string, string];
  ground: string;
  groundLine: string;
  accent: string;
  locked?: boolean;
}

const WORLDS: WorldConfig[] = [
  {
    id: 'pipeline',
    stageId: 'pipeline',
    label: 'START',
    theme: '設計室',
    sky: ['#060618', '#0c0c28'],
    ground: '#16163a',
    groundLine: '#202058',
    accent: '#818CF8',
  },
  {
    id: 'source',
    stageId: 'source',
    label: 'WORLD 1',
    theme: '洞窟',
    sky: ['#060208', '#100818'],
    ground: '#221030',
    groundLine: '#3a1848',
    accent: '#A78BFA',
  },
  {
    id: 'staging',
    stageId: 'staging',
    label: 'WORLD 2',
    theme: '草原',
    sky: ['#040c1c', '#061828'],
    ground: '#145a14',
    groundLine: '#1e7a1e',
    accent: '#34D399',
  },
  {
    id: 'warehouse',
    stageId: 'warehouse',
    label: 'WORLD 3',
    theme: '火山',
    sky: ['#140400', '#220800'],
    ground: '#5a1200',
    groundLine: '#7a1c00',
    accent: '#F87171',
  },
  {
    id: 'intermediate',
    stageId: null,
    label: 'WORLD 4',
    theme: '雪山',
    sky: ['#08101c', '#0c1828'],
    ground: '#8aa8c8',
    groundLine: '#b0c8e0',
    accent: '#93C5FD',
    locked: true,
  },
  {
    id: 'mart',
    stageId: 'mart',
    label: 'WORLD 5',
    theme: '城',
    sky: ['#080418', '#120828'],
    ground: '#404050',
    groundLine: '#505060',
    accent: '#FCD34D',
  },
];

// ── Zone decoration SVGs ─────────────────────────────────────────────

function DecoDesignRoom() {
  return (
    <>
      <line x1="10" y1="30" x2="30" y2="30" stroke="#818CF8" strokeWidth="1" opacity={0.3} />
      <line x1="30" y1="30" x2="30" y2="50" stroke="#818CF8" strokeWidth="1" opacity={0.3} />
      <circle cx="30" cy="30" r="2" fill="#818CF8" opacity={0.5} />
      <line x1="60" y1="25" x2="85" y2="25" stroke="#818CF8" strokeWidth="1" opacity={0.3} />
      <line x1="60" y1="25" x2="60" y2="45" stroke="#818CF8" strokeWidth="1" opacity={0.3} />
      <circle cx="60" cy="25" r="2" fill="#A78BFA" opacity={0.5} />
      <circle cx="15" cy="15" r="1" fill="white" opacity={0.5} />
      <circle cx="45" cy="20" r="1" fill="white" opacity={0.4} />
      <circle cx="75" cy="12" r="1.5" fill="white" opacity={0.4} />
    </>
  );
}

function DecoCave() {
  return (
    <>
      <polygon points="8,0 13,20 3,20"   fill="#3a1848" opacity={0.85} />
      <polygon points="28,0 34,24 22,24" fill="#3a1848" opacity={0.85} />
      <polygon points="52,0 56,15 48,15" fill="#3a1848" opacity={0.8} />
      <polygon points="75,0 80,22 70,22" fill="#3a1848" opacity={0.85} />
      <polygon points="20,62 24,56 28,62 24,68" fill="#A78BFA" opacity={0.9} />
      <polygon points="62,64 65,59 68,64 65,69" fill="#7C3AED" opacity={0.7} />
      <rect x="44" y="52" width="4" height="6" fill="#7B4519" />
      <ellipse cx="46" cy="51" rx="3" ry="5" fill="#FF8C00" opacity={0.7} />
      <ellipse cx="46" cy="49" rx="1.5" ry="3" fill="#FFD700" opacity={0.6} />
    </>
  );
}

function DecoGrassland() {
  return (
    <>
      <ellipse cx="20" cy="18" rx="9" ry="5"  fill="white" opacity={0.12} />
      <ellipse cx="27" cy="14" rx="7" ry="5"  fill="white" opacity={0.12} />
      <ellipse cx="35" cy="19" rx="8" ry="5"  fill="white" opacity={0.12} />
      <ellipse cx="15" cy="62" rx="16" ry="7" fill="#1e7a1e" opacity={0.35} />
      <ellipse cx="80" cy="64" rx="12" ry="6" fill="#1e7a1e" opacity={0.3} />
      <rect x="66" y="42" width="14" height="26" fill="#15601e" />
      <rect x="63" y="38" width="20" height="8"  fill="#1a8025" />
    </>
  );
}

function DecoVolcano() {
  return (
    <>
      <polygon points="50,8 20,60 80,60" fill="#5c1200" opacity={0.65} />
      <polygon points="50,8 40,30 60,30" fill="#8a1e00" opacity={0.6} />
      <ellipse cx="50" cy="9"   rx="5"   ry="8"  fill="#FF4500" opacity={0.85} />
      <ellipse cx="50" cy="7"   rx="2.5" ry="5"  fill="#FFD700" opacity={0.75} />
      <rect x="0" y="56" width="100" height="5" fill="#FF4500" opacity={0.25} />
      <rect x="12" y="38" width="9"  height="6" rx="1" fill="#4a1200" />
      <rect x="74" y="32" width="11" height="6" rx="1" fill="#4a1200" />
      <circle cx="36" cy="22" r="1.5" fill="#FF6600" opacity={0.6} />
      <circle cx="65" cy="18" r="1"   fill="#FF8C00" opacity={0.5} />
    </>
  );
}

function DecoSnow() {
  return (
    <>
      <polygon points="50,4 28,46 72,46"  fill="#c8daf0" opacity={0.3} />
      <polygon points="50,4 42,24 58,24"  fill="white"   opacity={0.45} />
      {([[18,22],[42,30],[70,18],[85,26]] as [number,number][]).map(([cx,cy],i) => (
        <g key={i} opacity={0.35}>
          <line x1={cx-5} y1={cy} x2={cx+5} y2={cy} stroke="white" strokeWidth="1.5" />
          <line x1={cx} y1={cy-5} x2={cx} y2={cy+5} stroke="white" strokeWidth="1.5" />
          <line x1={cx-3} y1={cy-3} x2={cx+3} y2={cy+3} stroke="white" strokeWidth="1" />
          <line x1={cx+3} y1={cy-3} x2={cx-3} y2={cy+3} stroke="white" strokeWidth="1" />
        </g>
      ))}
      <rect x="33" y="30" width="34" height="26" rx="5" fill="#08101c" opacity={0.9} />
      <rect x="42" y="37" width="16" height="13" rx="2" fill="#1e3a5f" />
      <path d="M46 37 Q50 29 54 37" stroke="#93C5FD" strokeWidth="2.5" fill="none" />
      <circle cx="50" cy="43" r="3" fill="#93C5FD" opacity={0.8} />
      <text x="50" y="60" fontSize="7" fill="#93C5FD" textAnchor="middle" fontFamily="monospace" fontWeight="bold">COMING</text>
    </>
  );
}

function DecoCastle() {
  return (
    <>
      <rect x="18" y="32" width="64" height="32" fill="#303040" opacity={0.75} />
      {[18,30,42,54,66].map(x => (
        <rect key={x} x={x} y="22" width="9" height="13" fill="#303040" opacity={0.75} />
      ))}
      <rect x="32" y="40" width="10" height="12" rx="2" fill="#080418" opacity={0.9} />
      <rect x="58" y="40" width="10" height="12" rx="2" fill="#080418" opacity={0.9} />
      <line x1="50" y1="0" x2="50" y2="24" stroke="#FCD34D" strokeWidth="1.5" />
      <polygon points="50,0 68,10 50,20" fill="#FCD34D" opacity={0.9} />
    </>
  );
}

// ── Player sprite using custom CharacterConfig ───────────────────────

function PlayerSprite({ config, anim }: { config: CharacterConfig; anim: 'idle' | 'jump' | 'damage' }) {
  const grid = buildPlayerSprite(config);
  const cls =
    anim === 'jump'
      ? 'animate-[player-jump_0.5s_ease-out_forwards]'
      : anim === 'damage'
      ? 'animate-[player-damage_0.45s_ease-in-out_forwards]'
      : 'animate-[idle-bob_2s_ease-in-out_infinite]';
  return <Sprite grid={grid} scale={3} className={cls} />;
}

// ── Main component ───────────────────────────────────────────────────

const STRIP_H = 96;
const GROUND_H = 22;
const N = WORLDS.length;
const ZONE_PCT = 100 / N;

interface Props {
  currentStageId: string;
  stageStars: Record<string, number>;
  characterConfig?: CharacterConfig | null;
}

export function WorldProgressBar({ currentStageId, stageStars, characterConfig }: Props) {
  const { playerAnim, resetAnim } = useGameStore();

  useEffect(() => {
    if (playerAnim === 'idle') return;
    const ms = playerAnim === 'jump' ? 550 : 520;
    const t = setTimeout(resetAnim, ms);
    return () => clearTimeout(t);
  }, [playerAnim, resetAnim]);

  const charWorldIdx = WORLDS.findIndex(w => w.stageId === currentStageId);
  const charIdx = charWorldIdx >= 0 ? charWorldIdx : 0;
  const charCenterPct = (charIdx + 0.5) * ZONE_PCT;

  const config = characterConfig ?? DEFAULT_CHARACTER_CONFIG;

  return (
    <div
      className="relative w-full flex-shrink-0 overflow-hidden border-b border-slate-900"
      style={{ height: STRIP_H }}
    >
      {WORLDS.map((w, i) => {
        const stars = w.stageId ? (stageStars[w.stageId] ?? 0) : 0;
        const isCurrent = w.stageId === currentStageId;
        const left = i * ZONE_PCT;

        return (
          <div
            key={w.id}
            className="absolute top-0 bottom-0"
            style={{
              left: `${left}%`,
              width: `${ZONE_PCT}%`,
              background: `linear-gradient(180deg, ${w.sky[0]} 0%, ${w.sky[1]} 65%, ${w.ground} 100%)`,
              filter: w.locked ? 'brightness(0.45) saturate(0.25)' : undefined,
            }}
          >
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 80"
              preserveAspectRatio="xMidYMid meet"
            >
              {w.id === 'pipeline'     && <DecoDesignRoom />}
              {w.id === 'source'       && <DecoCave />}
              {w.id === 'staging'      && <DecoGrassland />}
              {w.id === 'warehouse'    && <DecoVolcano />}
              {w.id === 'intermediate' && <DecoSnow />}
              {w.id === 'mart'         && <DecoCastle />}
            </svg>

            {/* Ground */}
            <div
              className="absolute left-0 right-0 bottom-0"
              style={{ height: GROUND_H, background: w.ground }}
            >
              <div style={{ height: 3, background: w.groundLine }} />
            </div>

            {/* Stars + label above ground */}
            <div
              className="absolute left-0 right-0 flex flex-col items-center"
              style={{ bottom: GROUND_H + 3 }}
            >
              <div className="flex gap-px mb-px">
                {[1,2,3].map(n => (
                  <span key={n} style={{ fontSize: 7, lineHeight: 1, color: stars >= n ? '#FBBF24' : '#1e293b' }}>★</span>
                ))}
              </div>
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 7,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  lineHeight: 1.2,
                  color: isCurrent ? w.accent : w.locked ? '#1e3a5f' : '#334155',
                }}
              >
                {w.theme}
              </span>
            </div>

            {/* Current zone highlight */}
            {isCurrent && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `linear-gradient(180deg, ${w.accent}1a 0%, transparent 55%)`,
                  borderBottom: `2px solid ${w.accent}50`,
                }}
              />
            )}

            {i > 0 && (
              <div
                className="absolute top-0 bottom-0 left-0 w-px"
                style={{ background: `${w.accent}30` }}
              />
            )}
          </div>
        );
      })}

      {/* Custom character sprite */}
      <div
        className="absolute"
        style={{
          left: `${charCenterPct}%`,
          bottom: GROUND_H,
          transform: 'translateX(-50%)',
          zIndex: 20,
        }}
      >
        <PlayerSprite config={config} anim={playerAnim} />
      </div>
    </div>
  );
}
