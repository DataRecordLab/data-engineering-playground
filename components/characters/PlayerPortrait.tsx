'use client';

import type { CharacterConfig } from '@/types';

interface Props {
  config: CharacterConfig;
  size?: number;
  className?: string;
  animate?: boolean;
}

export function PlayerPortrait({ config, size = 120, className = '', animate = true }: Props) {
  const maneColor   = config.hairColor    ?? '#92400E';
  const accentColor = config.outfitColor  ?? '#2563EB';
  const outfitStyle = config.outfitStyle  ?? 'hoodie';
  const hasGlasses  = config.hasGlasses   ?? false;
  const glassesColor = config.glassesColor ?? '#93C5FD';

  // Hoodie body color per style
  const bodyColors: Record<string, string> = {
    hoodie: '#F8FAFF', tee: '#ECFDF5', jacket: '#EEF2FF', suit: '#F8FAFC',
  };
  const bodyColor = bodyColors[outfitStyle] ?? '#F8FAFF';

  // Derive mane dark/light variants
  const maneDark = darken(maneColor, 0.2);
  const maneLight = lighten(maneColor, 0.15);

  // Mane outer path (same organic shape as MioIllustration)
  const maneOuter = `M60,5 C74,2 91,8 102,21 C113,32 117,50 114,65
    C111,79 102,87 90,89 C80,91 70,88 60,88 C50,88 40,91 30,89
    C18,87 9,79 6,65 C3,50 7,32 18,21 C29,8 46,2 60,5Z`;

  const maneInner = `M60,13 C72,10 87,15 96,26 C106,36 109,52 106,65
    C103,76 96,83 86,85 C78,87 69,85 60,85 C51,85 42,87 34,85
    C24,83 17,76 14,65 C11,52 14,36 24,26 C33,15 48,10 60,13Z`;

  const h = size * (155 / 120);

  return (
    <div
      className={`${className} ${animate ? 'animate-idle-bob' : ''}`}
      style={{ display: 'inline-block', width: size, height: h }}
    >
      <svg viewBox="0 0 120 155" width={size} height={h} style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id={`pp-face-${accentColor}`} cx="36%" cy="28%" r="65%">
            <stop offset="0%"   stopColor="#FEF3C7"/>
            <stop offset="35%"  stopColor="#FBBF24"/>
            <stop offset="75%"  stopColor="#F59E0B"/>
            <stop offset="100%" stopColor="#D97706"/>
          </radialGradient>
          <radialGradient id="pp-mane-out" cx="40%" cy="30%" r="60%">
            <stop offset="0%"   stopColor={maneLight}/>
            <stop offset="100%" stopColor={maneDark}/>
          </radialGradient>
          <radialGradient id="pp-mane-in" cx="40%" cy="35%" r="58%">
            <stop offset="0%"   stopColor={lighten(maneColor, 0.1)}/>
            <stop offset="100%" stopColor={maneColor}/>
          </radialGradient>
          <radialGradient id="pp-muzzle" cx="35%" cy="25%" r="65%">
            <stop offset="0%"   stopColor="#FFFFFF"/>
            <stop offset="100%" stopColor="#FDE9C0"/>
          </radialGradient>
          <radialGradient id="pp-iris" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#FCD34D"/>
            <stop offset="50%"  stopColor="#D97706"/>
            <stop offset="100%" stopColor="#92400E"/>
          </radialGradient>
          <radialGradient id="pp-body" cx="30%" cy="12%" r="72%">
            <stop offset="0%"   stopColor="#FFFFFF"/>
            <stop offset="100%" stopColor={bodyColor}/>
          </radialGradient>
          <filter id="pp-drop" x="-25%" y="-15%" width="155%" height="155%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor={maneDark} floodOpacity="0.18"/>
          </filter>
          <filter id="pp-eye" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.25"/>
          </filter>
          <clipPath id="pp-cl">
            <path d="M31,49 C33,41 53,40 55,49 C53,58 33,57 31,49Z"/>
          </clipPath>
          <clipPath id="pp-cr">
            <path d="M65,49 C67,40 87,41 89,49 C87,58 67,57 65,49Z"/>
          </clipPath>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="60" cy="151" rx="30" ry="5" fill={`${maneDark}25`}/>

        {/* ── Body ── */}
        <path
          d="M22,96 L14,155 L106,155 L98,96 Q88,86 60,84 Q32,86 22,96Z"
          fill="url(#pp-body)" filter="url(#pp-drop)"
        />
        <path d="M22,96 Q20,90 20,83 L24,85 L25,97Z" fill={accentColor} opacity="0.6"/>
        <path d="M98,96 Q100,90 100,83 L96,85 L95,97Z" fill={accentColor} opacity="0.6"/>
        <path d="M45,95 Q60,108 75,95 L75,87 Q60,100 45,87Z" fill="rgba(0,0,0,0.05)"/>
        <rect x="44" y="86" width="5" height="38" rx="2.5" fill="#1E3A8A" opacity="0.7"/>
        <rect x="71" y="86" width="5" height="38" rx="2.5" fill="#1E3A8A" opacity="0.7"/>
        <rect x="49" y="107" width="22" height="5" rx="2.5" fill="#1E3A8A" opacity="0.5"/>
        <circle cx="60" cy="117" r="12" fill={accentColor}/>
        <text x="60" y="122.5" textAnchor="middle" fill="white"
          fontSize="14" fontWeight="900" fontFamily="Arial,Helvetica,sans-serif">M</text>
        <text x="60" y="137" textAnchor="middle" fill="#94A3B8"
          fontSize="4" fontFamily="monospace" letterSpacing="1.5">Modelion</text>

        {/* ── Mane outer ── */}
        <path d={maneOuter} fill="url(#pp-mane-out)" filter="url(#pp-drop)"/>

        {/* Fur texture strokes */}
        {([
          ['M60,20 C59,14 60,9 59,5',   0.5],
          ['M72,24 C76,19 79,15 83,11', 0.45],
          ['M82,32 C87,28 90,25 95,21', 0.4],
          ['M90,46 C96,44 100,43 106,42',0.38],
          ['M88,68 C94,71 98,74 103,78', 0.36],
          ['M68,86 C69,92 69,95 68,99',  0.32],
          ['M52,86 C51,92 51,95 52,99',  0.32],
          ['M32,68 C26,71 22,74 17,78',  0.36],
          ['M30,46 C24,44 20,43 14,42',  0.38],
          ['M38,32 C33,28 30,25 25,21',  0.4],
          ['M48,24 C44,19 41,15 37,11',  0.45],
        ] as [string, number][]).map(([d, op], i) => (
          <path key={i} d={d} stroke={maneColor} strokeWidth="1.8"
            fill="none" strokeLinecap="round" opacity={op}/>
        ))}

        {/* Mane inner */}
        <path d={maneInner} fill="url(#pp-mane-in)"/>
        <ellipse cx="40" cy="30" rx="17" ry="10" fill="rgba(253,211,77,0.07)"
          transform="rotate(-20,40,30)"/>

        {/* ── Ears (rounded) ── */}
        <path d="M22,36 C12,22 15,8 24,8 C33,8 38,22 30,36Z" fill="#F59E0B"/>
        <path d="M22,34 C14,22 17,11 24,11 C31,11 35,22 29,34Z" fill="#FBBF24"/>
        <path d="M22,32 C17,23 19,14 24,14 C29,14 31,22 27,32Z" fill="#FDA4AF" opacity="0.55"/>
        <path d="M98,36 C108,22 105,8 96,8 C87,8 82,22 90,36Z" fill="#F59E0B"/>
        <path d="M98,34 C106,22 103,11 96,11 C89,11 85,22 91,34Z" fill="#FBBF24"/>
        <path d="M98,32 C103,23 101,14 96,14 C91,14 89,22 93,32Z" fill="#FDA4AF" opacity="0.55"/>

        {/* ── Face ── */}
        <ellipse cx="60" cy="55" rx="37" ry="35" fill={`url(#pp-face-${accentColor})`} filter="url(#pp-drop)"/>
        <ellipse cx="60" cy="32" rx="20" ry="10" fill="rgba(180,83,9,0.1)"/>
        <ellipse cx="43" cy="49" rx="16" ry="10" fill="rgba(120,53,15,0.12)"/>
        <ellipse cx="77" cy="49" rx="16" ry="10" fill="rgba(120,53,15,0.12)"/>

        {/* ── Muzzle ── */}
        <ellipse cx="60" cy="70" rx="22" ry="16" fill="url(#pp-muzzle)"/>
        <ellipse cx="60" cy="70" rx="22" ry="16" fill="none"
          stroke="#F59E0B" strokeWidth="0.6" opacity="0.3"/>

        {/* ── Eyebrows ── */}
        <path d="M29,36 Q42,29 56,34" stroke="#5C1F08" strokeWidth="3.5"
          fill="none" strokeLinecap="round" opacity="0.8"/>
        <path d="M64,34 Q78,29 91,36" stroke="#5C1F08" strokeWidth="3.5"
          fill="none" strokeLinecap="round" opacity="0.8"/>

        {/* ── Eyes with glasses ── */}
        {hasGlasses ? (
          <>
            {/* Left eye */}
            <path d="M31,49 C33,41 53,40 55,49 C53,58 33,57 31,49Z"
              fill="white" filter="url(#pp-eye)"/>
            <g clipPath="url(#pp-cl)">
              <circle cx="43" cy="50" r="11" fill="url(#pp-iris)"/>
              <circle cx="43" cy="50" r="7"  fill="#1C1917"/>
              <circle cx="47" cy="45" r="4"  fill="white" opacity="0.95"/>
            </g>
            {/* Right eye */}
            <path d="M65,49 C67,40 87,41 89,49 C87,58 67,57 65,49Z"
              fill="white" filter="url(#pp-eye)"/>
            <g clipPath="url(#pp-cr)">
              <circle cx="77" cy="50" r="11" fill="url(#pp-iris)"/>
              <circle cx="77" cy="50" r="7"  fill="#1C1917"/>
              <circle cx="81" cy="45" r="4"  fill="white" opacity="0.95"/>
            </g>
            {/* Glasses — round frames */}
            <circle cx="43" cy="50" r="15" fill="none"
              stroke={glassesColor} strokeWidth="2.5"/>
            <circle cx="77" cy="50" r="15" fill="none"
              stroke={glassesColor} strokeWidth="2.5"/>
            <path d="M58,50 H62" stroke={glassesColor} strokeWidth="2"/>
            <path d="M28,45 L18,41" stroke={glassesColor} strokeWidth="2" strokeLinecap="round"/>
            <path d="M92,45 L102,41" stroke={glassesColor} strokeWidth="2" strokeLinecap="round"/>
          </>
        ) : (
          <>
            {/* Left eye */}
            <path d="M31,49 C33,41 53,40 55,49 C53,58 33,57 31,49Z"
              fill="white" filter="url(#pp-eye)"/>
            <g clipPath="url(#pp-cl)">
              <circle cx="43" cy="50" r="11" fill="url(#pp-iris)"/>
              <circle cx="43" cy="50" r="7"  fill="#1C1917"/>
              <circle cx="47" cy="45" r="4"  fill="white" opacity="0.95"/>
              <circle cx="41" cy="53" r="1.8" fill="rgba(255,255,255,0.6)"/>
            </g>
            <path d="M31,49 C33,41 53,40 55,49" stroke="#5C1F08" strokeWidth="2"
              fill="none" strokeLinecap="round"/>
            <path d="M31,49 C33,57 53,58 55,49" stroke="rgba(92,31,8,0.35)"
              strokeWidth="1" fill="none" strokeLinecap="round"/>
            {/* Right eye */}
            <path d="M65,49 C67,40 87,41 89,49 C87,58 67,57 65,49Z"
              fill="white" filter="url(#pp-eye)"/>
            <g clipPath="url(#pp-cr)">
              <circle cx="77" cy="50" r="11" fill="url(#pp-iris)"/>
              <circle cx="77" cy="50" r="7"  fill="#1C1917"/>
              <circle cx="81" cy="45" r="4"  fill="white" opacity="0.95"/>
              <circle cx="75" cy="53" r="1.8" fill="rgba(255,255,255,0.6)"/>
            </g>
            <path d="M65,49 C67,40 87,41 89,49" stroke="#5C1F08" strokeWidth="2"
              fill="none" strokeLinecap="round"/>
            <path d="M65,49 C67,58 87,57 89,49" stroke="rgba(92,31,8,0.35)"
              strokeWidth="1" fill="none" strokeLinecap="round"/>
          </>
        )}

        {/* ── Nose with nostrils ── */}
        <path d="M53,63 Q60,58 67,63 Q71,68 67,73 Q60,76 53,73 Q49,68 53,63Z"
          fill="#5C1F08"/>
        <path d="M57,62 Q60,59 63,62" stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <ellipse cx="55.5" cy="70" rx="3.5" ry="2.5"
          fill="none" stroke="#3B1408" strokeWidth="1" opacity="0.65"
          transform="rotate(-15,55.5,70)"/>
        <ellipse cx="64.5" cy="70" rx="3.5" ry="2.5"
          fill="none" stroke="#3B1408" strokeWidth="1" opacity="0.65"
          transform="rotate(15,64.5,70)"/>
        <path d="M60,73 L60,77" stroke="#5C1F08" strokeWidth="1.5" strokeLinecap="round"/>

        {/* ── Mouth ── */}
        <path d="M47,74 Q54,80 60,75 Q66,80 73,74"
          stroke="#5C1F08" strokeWidth="2.2" fill="none"
          strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M47,74 Q44,73 42,71" stroke="#5C1F08" strokeWidth="1.2"
          fill="none" strokeLinecap="round" opacity="0.55"/>
        <path d="M73,74 Q76,73 78,71" stroke="#5C1F08" strokeWidth="1.2"
          fill="none" strokeLinecap="round" opacity="0.55"/>

        {/* ── Whiskers ── */}
        <circle cx="43" cy="70" r="1.5" fill="#92400E" opacity="0.5"/>
        <circle cx="77" cy="70" r="1.5" fill="#92400E" opacity="0.5"/>
        <path d="M20,65 L42,69" stroke="#5C1F08" strokeWidth="0.9" strokeLinecap="round" opacity="0.42"/>
        <path d="M17,71 L42,71" stroke="#5C1F08" strokeWidth="0.9" strokeLinecap="round" opacity="0.48"/>
        <path d="M20,77 L42,73" stroke="#5C1F08" strokeWidth="0.9" strokeLinecap="round" opacity="0.38"/>
        <path d="M100,65 L78,69" stroke="#5C1F08" strokeWidth="0.9" strokeLinecap="round" opacity="0.42"/>
        <path d="M103,71 L78,71" stroke="#5C1F08" strokeWidth="0.9" strokeLinecap="round" opacity="0.48"/>
        <path d="M100,77 L78,73" stroke="#5C1F08" strokeWidth="0.9" strokeLinecap="round" opacity="0.38"/>
      </svg>
    </div>
  );
}

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * amt));
  const g = Math.min(255, Math.round(((n >> 8)  & 0xff) + (255 - ((n >> 8)  & 0xff)) * amt));
  const b = Math.min(255, Math.round(( n        & 0xff) + (255 - ( n        & 0xff)) * amt));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function darken(hex: string, amt: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amt)));
  const g = Math.max(0, Math.round(((n >> 8)  & 0xff) * (1 - amt)));
  const b = Math.max(0, Math.round(( n        & 0xff) * (1 - amt)));
  return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}
