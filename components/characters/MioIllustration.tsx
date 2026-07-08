'use client';

export type MioExpression =
  | 'happy' | 'excited' | 'thinking' | 'surprised'
  | 'troubled' | 'cheer' | 'correct' | 'cute' | 'neutral';

interface Props {
  expression?: MioExpression;
  size?: number;
  className?: string;
}

// Radial fur strokes around the mane — short curved paths at various angles
const MANE_FUR: [string, string, number][] = [
  // top center
  ['M60,20 C59,14 60,9 59,5',   '#B45309', 0.55],
  ['M64,21 C64,15 65,10 65,6',  '#92400E', 0.45],
  ['M56,21 C56,15 55,10 55,6',  '#92400E', 0.45],
  // top right
  ['M72,24 C76,19 79,15 83,11', '#B45309', 0.50],
  ['M80,30 C85,26 88,23 93,19', '#78350F', 0.45],
  // right
  ['M90,44 C96,42 100,41 106,40','#92400E', 0.40],
  ['M92,56 C98,55 102,56 108,56','#78350F', 0.42],
  // lower right
  ['M88,68 C94,71 98,74 103,77', '#92400E', 0.38],
  ['M80,80 C85,84 88,87 91,91',  '#78350F', 0.40],
  // bottom
  ['M68,86 C69,92 69,95 68,99',  '#92400E', 0.35],
  ['M60,87 C60,93 60,96 60,100', '#78350F', 0.38],
  ['M52,86 C51,92 51,95 52,99',  '#92400E', 0.35],
  // lower left
  ['M40,80 C35,84 32,87 29,91',  '#78350F', 0.40],
  ['M32,68 C26,71 22,74 17,77',  '#92400E', 0.38],
  // left
  ['M28,56 C22,55 18,56 12,56',  '#78350F', 0.42],
  ['M30,44 C24,42 20,41 14,40',  '#92400E', 0.40],
  // upper left
  ['M40,30 C35,26 32,23 27,19',  '#78350F', 0.45],
  ['M48,24 C44,19 41,15 37,11',  '#B45309', 0.50],
];

export function MioIllustration({ expression = 'happy', size = 120, className = '' }: Props) {
  const isExcited   = expression === 'excited' || expression === 'cheer';
  const isCorrect   = expression === 'correct';
  const isThinking  = expression === 'thinking';
  const isSurprised = expression === 'surprised';
  const isTroubled  = expression === 'troubled';
  const isCute      = expression === 'cute';
  const showBlush   = isCute || isCorrect || isExcited;

  // ── Eye paths (almond shape) ─────────────────────────────────────
  // Real lion eyes: pronounced upper arch, flatter lower lid
  const lEyePath = isSurprised
    ? 'M30,49 C32,40 54,38 56,49 C54,59 32,58 30,49Z'
    : isThinking
    ? 'M32,51 C34,45 52,44 54,51 C52,57 34,57 32,51Z'
    : 'M31,49 C33,41 53,40 55,49 C53,58 33,57 31,49Z';

  const rEyePath = isSurprised
    ? 'M64,49 C66,38 88,40 90,49 C88,59 66,58 64,49Z'
    : isThinking
    ? 'M66,51 C68,44 86,45 88,51 C86,57 66,57 66,51Z'
    : 'M65,49 C67,40 87,41 89,49 C87,58 67,57 65,49Z';

  // Iris center position
  const lIX = isThinking ? 46 : 43;
  const rIX = isThinking ? 77 : 77;
  const irisR = isSurprised ? 10 : isThinking ? 8 : 9;

  // ── Eyebrow paths ────────────────────────────────────────────────
  const lBrow = isExcited || isCorrect
    ? 'M29,36 Q42,27 56,32'
    : isThinking
    ? 'M29,39 Q42,32 56,39'
    : isTroubled
    ? 'M29,33 Q42,42 56,35'
    : isSurprised
    ? 'M29,32 Q42,23 56,28'
    : 'M29,36 Q42,29 56,34';

  const rBrow = isExcited || isCorrect
    ? 'M64,32 Q78,27 91,36'
    : isThinking
    ? 'M64,39 Q78,32 91,39'
    : isTroubled
    ? 'M64,35 Q78,42 91,33'
    : isSurprised
    ? 'M64,28 Q78,23 91,32'
    : 'M64,34 Q78,29 91,36';

  // ── Mouth ────────────────────────────────────────────────────────
  const mouthOpen = isExcited || isCorrect || isSurprised;

  // Cat "W" mouth paths
  const mouthPath = isExcited || isCorrect
    ? 'M44,74 Q52,82 60,76 Q68,82 76,74'   // big W smile
    : isTroubled
    ? 'M48,78 Q54,74 60,78 Q66,74 72,78'   // inverted small W (frown)
    : isThinking
    ? 'M50,76 Q56,78 60,76 Q64,78 70,76'   // flat neutral
    : isSurprised
    ? 'M54,73 Q60,80 66,73'                 // small O open
    : isCute
    ? 'M48,74 Q54,80 60,75 Q66,80 72,74'   // cute W
    : 'M47,74 Q54,80 60,75 Q66,80 73,74';  // normal happy W

  const h = size * (155 / 120);

  return (
    <div className={className} style={{ display: 'inline-block', width: size, height: h }}>
      <svg viewBox="0 0 120 155" width={size} height={h} style={{ overflow: 'visible' }}>
        <defs>
          {/* Face gradient — warm amber with light upper-left, shadow lower-right */}
          <radialGradient id="li-face" cx="36%" cy="28%" r="65%">
            <stop offset="0%"   stopColor="#FEF3C7"/>
            <stop offset="35%"  stopColor="#FBBF24"/>
            <stop offset="75%"  stopColor="#F59E0B"/>
            <stop offset="100%" stopColor="#D97706"/>
          </radialGradient>

          {/* Mane gradient — darker outer, lighter inner */}
          <radialGradient id="li-mane-inner" cx="40%" cy="35%" r="58%">
            <stop offset="0%"   stopColor="#A16207"/>
            <stop offset="50%"  stopColor="#92400E"/>
            <stop offset="100%" stopColor="#5C1F08"/>
          </radialGradient>
          <radialGradient id="li-mane-outer" cx="40%" cy="30%" r="60%">
            <stop offset="0%"   stopColor="#78350F"/>
            <stop offset="100%" stopColor="#3B1408"/>
          </radialGradient>

          {/* Muzzle gradient — creamy off-white */}
          <radialGradient id="li-muzzle" cx="35%" cy="25%" r="65%">
            <stop offset="0%"   stopColor="#FFFFFF"/>
            <stop offset="60%"  stopColor="#FEF9EC"/>
            <stop offset="100%" stopColor="#FDE9C0"/>
          </radialGradient>

          {/* Eye amber iris */}
          <radialGradient id="li-iris" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#FCD34D"/>
            <stop offset="45%"  stopColor="#D97706"/>
            <stop offset="80%"  stopColor="#B45309"/>
            <stop offset="100%" stopColor="#92400E"/>
          </radialGradient>

          {/* Body hoodie */}
          <radialGradient id="li-hoodie" cx="30%" cy="12%" r="72%">
            <stop offset="0%"   stopColor="#FFFFFF"/>
            <stop offset="100%" stopColor="#EFF6FF"/>
          </radialGradient>

          {/* Shadows */}
          <filter id="li-soft" x="-30%" y="-20%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#3B1408" floodOpacity="0.16"/>
          </filter>
          <filter id="li-eyes" x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.28"/>
          </filter>

          {/* Clip paths for eyes */}
          <clipPath id="li-cl"><path d={lEyePath}/></clipPath>
          <clipPath id="li-cr"><path d={rEyePath}/></clipPath>
        </defs>

        {/* ── Ground shadow ── */}
        <ellipse cx="60" cy="151" rx="30" ry="5" fill="rgba(59,20,8,0.12)"/>

        {/* ── Body / Hoodie ── */}
        <path
          d="M22,96 L14,155 L106,155 L98,96 Q88,86 60,84 Q32,86 22,96Z"
          fill="url(#li-hoodie)" filter="url(#li-soft)"
        />
        {/* Blue side accents */}
        <path d="M22,96 Q20,90 20,83 L24,85 L25,97Z" fill="#2563EB" opacity="0.6"/>
        <path d="M98,96 Q100,90 100,83 L96,85 L95,97Z" fill="#2563EB" opacity="0.6"/>
        {/* Collar shadow */}
        <path d="M45,95 Q60,108 75,95 L75,87 Q60,100 45,87Z" fill="rgba(0,0,0,0.05)"/>
        {/* Backpack straps */}
        <rect x="44" y="86" width="5" height="38" rx="2.5" fill="#1E3A8A" opacity="0.7"/>
        <rect x="71" y="86" width="5" height="38" rx="2.5" fill="#1E3A8A" opacity="0.7"/>
        <rect x="49" y="107" width="22" height="5" rx="2.5" fill="#1E3A8A" opacity="0.5"/>
        {/* M logo */}
        <circle cx="60" cy="117" r="12" fill="#2563EB"/>
        <circle cx="60" cy="117" r="12" fill="none" stroke="#1D4ED8" strokeWidth="0.8"/>
        <text x="60" y="122.5" textAnchor="middle" fill="white"
          fontSize="14" fontWeight="900" fontFamily="Arial,Helvetica,sans-serif">M</text>
        <text x="60" y="137" textAnchor="middle" fill="#94A3B8"
          fontSize="4" fontFamily="monospace" letterSpacing="1.5">Modelion</text>

        {/* ── Mane outer dark ring ── */}
        <path
          d="M60,5
            C74,2 91,8 102,21
            C113,32 117,50 114,65
            C111,79 102,87 90,89
            C80,91 70,88 60,88
            C50,88 40,91 30,89
            C18,87 9,79 6,65
            C3,50 7,32 18,21
            C29,8 46,2 60,5Z"
          fill="url(#li-mane-outer)" filter="url(#li-soft)"
        />

        {/* ── Mane fur texture strokes ── */}
        {MANE_FUR.map(([d, stroke, opacity], i) => (
          <path key={i} d={d} stroke={stroke} strokeWidth="1.8"
            fill="none" strokeLinecap="round" opacity={opacity}/>
        ))}

        {/* ── Mane inner body (lighter) ── */}
        <path
          d="M60,13
            C72,10 87,15 96,26
            C106,36 109,52 106,65
            C103,76 96,83 86,85
            C78,87 69,85 60,85
            C51,85 42,87 34,85
            C24,83 17,76 14,65
            C11,52 14,36 24,26
            C33,15 48,10 60,13Z"
          fill="url(#li-mane-inner)"
        />
        {/* Inner mane highlight — light catches the top-left of the mane */}
        <ellipse cx="40" cy="30" rx="18" ry="11" fill="rgba(253,211,77,0.08)"
          transform="rotate(-20,40,30)"/>

        {/* ── Ears (rounded, small, realistic) ── */}
        {/* Left ear outer */}
        <path d="M22,36 C12,22 15,8 24,8 C33,8 38,22 30,36Z"
          fill="#F59E0B"/>
        {/* Left ear mid */}
        <path d="M22,34 C14,22 17,11 24,11 C31,11 35,22 29,34Z"
          fill="#FBBF24"/>
        {/* Left ear inner pink */}
        <path d="M22,32 C17,23 19,14 24,14 C29,14 31,22 27,32Z"
          fill="#FDA4AF" opacity="0.6"/>
        {/* Right ear outer */}
        <path d="M98,36 C108,22 105,8 96,8 C87,8 82,22 90,36Z"
          fill="#F59E0B"/>
        {/* Right ear mid */}
        <path d="M98,34 C106,22 103,11 96,11 C89,11 85,22 91,34Z"
          fill="#FBBF24"/>
        {/* Right ear inner pink */}
        <path d="M98,32 C103,23 101,14 96,14 C91,14 89,22 93,32Z"
          fill="#FDA4AF" opacity="0.6"/>

        {/* ── Face ── */}
        <ellipse cx="60" cy="55" rx="37" ry="35" fill="url(#li-face)" filter="url(#li-soft)"/>

        {/* Face depth — darker areas for realism */}
        {/* Forehead shadow */}
        <ellipse cx="60" cy="32" rx="20" ry="10" fill="rgba(180,83,9,0.12)"/>
        {/* Eye socket darkenings — lions have darker fur around eyes */}
        <ellipse cx="43" cy="49" rx="17" ry="11" fill="rgba(120,53,15,0.14)"/>
        <ellipse cx="77" cy="49" rx="17" ry="11" fill="rgba(120,53,15,0.14)"/>

        {/* ── Muzzle — cream, prominent ── */}
        <ellipse cx="60" cy="70" rx="22" ry="16" fill="url(#li-muzzle)"/>
        {/* Muzzle boundary — subtle warm outline */}
        <ellipse cx="60" cy="70" rx="22" ry="16" fill="none"
          stroke="#F59E0B" strokeWidth="0.6" opacity="0.35"/>
        {/* Muzzle cheek split (center vertical line suggestion) */}
        <path d="M60,59 L60,63" stroke="rgba(180,83,9,0.2)" strokeWidth="1"
          strokeLinecap="round"/>

        {/* ── Eyebrows ── */}
        <path d={lBrow} stroke="#5C1F08" strokeWidth="3.5" fill="none"
          strokeLinecap="round" opacity="0.8"/>
        <path d={rBrow} stroke="#5C1F08" strokeWidth="3.5" fill="none"
          strokeLinecap="round" opacity="0.8"/>

        {/* ── Left eye ── */}
        {/* Eye white (sclera) */}
        <path d={lEyePath} fill="white" filter="url(#li-eyes)"/>
        {/* Clipped iris and pupil */}
        <g clipPath="url(#li-cl)">
          <circle cx={lIX} cy="50" r={irisR + 2} fill="url(#li-iris)"/>
          <circle cx={lIX} cy="50" r={Math.max(3, irisR - 3)} fill="#1C1917"/>
          {/* Main shine */}
          <circle cx={lIX + 3} cy={50 - irisR + 3} r={Math.round(irisR * 0.38)} fill="white" opacity="0.95"/>
          {/* Secondary shine */}
          <circle cx={lIX - 2} cy={50 + 3} r={Math.round(irisR * 0.18)} fill="rgba(255,255,255,0.6)"/>
        </g>
        {/* Upper eyelid line */}
        <path d={lEyePath.split('C').slice(0, 2).join('C').replace('Z', '')}
          stroke="#5C1F08" strokeWidth="2" fill="none" strokeLinecap="round"/>
        {/* Lower eyelid (thinner) */}
        <path d={`M31,49 C33,57 53,58 55,49`}
          stroke="rgba(92,31,8,0.4)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        {/* Lash hint at outer corner */}
        <path d="M55,48 L59,44" stroke="#5C1F08" strokeWidth="1.2"
          strokeLinecap="round" opacity="0.6"/>
        <path d="M55,50 L60,48" stroke="#5C1F08" strokeWidth="1"
          strokeLinecap="round" opacity="0.5"/>

        {/* ── Right eye ── */}
        <path d={rEyePath} fill="white" filter="url(#li-eyes)"/>
        <g clipPath="url(#li-cr)">
          <circle cx={rIX} cy="50" r={irisR + 2} fill="url(#li-iris)"/>
          <circle cx={rIX} cy="50" r={Math.max(3, irisR - 3)} fill="#1C1917"/>
          <circle cx={rIX + 3} cy={50 - irisR + 3} r={Math.round(irisR * 0.38)} fill="white" opacity="0.95"/>
          <circle cx={rIX - 2} cy={50 + 3} r={Math.round(irisR * 0.18)} fill="rgba(255,255,255,0.6)"/>
        </g>
        <path d={rEyePath.split('C').slice(0, 2).join('C').replace('Z', '')}
          stroke="#5C1F08" strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d={`M65,49 C67,58 87,57 89,49`}
          stroke="rgba(92,31,8,0.4)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <path d="M65,48 L61,44" stroke="#5C1F08" strokeWidth="1.2"
          strokeLinecap="round" opacity="0.6"/>
        <path d="M65,50 L60,48" stroke="#5C1F08" strokeWidth="1"
          strokeLinecap="round" opacity="0.5"/>

        {/* ── Blush ── */}
        {showBlush && (
          <>
            <ellipse cx="22" cy="62" rx="10" ry="6.5" fill="#FCA5A5" opacity="0.42"/>
            <ellipse cx="98" cy="62" rx="10" ry="6.5" fill="#FCA5A5" opacity="0.42"/>
          </>
        )}

        {/* ── Nose — wide, with nostrils ── */}
        {/* Nose pad */}
        <path d="M53,63 Q60,58 67,63 Q71,68 67,73 Q60,76 53,73 Q49,68 53,63Z"
          fill="#5C1F08"/>
        {/* Nose ridge highlight */}
        <path d="M57,62 Q60,59 63,62" stroke="rgba(255,255,255,0.2)"
          strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* Left nostril */}
        <ellipse cx="55.5" cy="70" rx="3.5" ry="2.5"
          fill="rgba(0,0,0,0)" stroke="#3B1408" strokeWidth="1" opacity="0.7"
          transform="rotate(-15,55.5,70)"/>
        {/* Right nostril */}
        <ellipse cx="64.5" cy="70" rx="3.5" ry="2.5"
          fill="rgba(0,0,0,0)" stroke="#3B1408" strokeWidth="1" opacity="0.7"
          transform="rotate(15,64.5,70)"/>
        {/* Philtrum */}
        <path d="M60,73 L60,77" stroke="#5C1F08" strokeWidth="1.5" strokeLinecap="round"/>

        {/* ── Mouth — cat W shape ── */}
        {mouthOpen ? (
          <>
            <path d={mouthPath} fill="#5C1F08" opacity="0.85"/>
            <ellipse cx="60" cy={isSurprised ? 79 : 83}
              rx={isSurprised ? 6 : 9} ry={isSurprised ? 5 : 6}
              fill="#3B1408" opacity="0.9"/>
            {!isSurprised && (
              <>
                <rect x="52" y="76" width="7" height="5" rx="2" fill="white" opacity="0.95"/>
                <rect x="61" y="76" width="7" height="5" rx="2" fill="white" opacity="0.95"/>
              </>
            )}
            <path d={mouthPath} stroke="#5C1F08" strokeWidth="1.8" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>
          </>
        ) : (
          <>
            <path d={mouthPath} stroke="#5C1F08" strokeWidth="2.2" fill="none"
              strokeLinecap="round" strokeLinejoin="round"/>
            {/* Corner mouth lines */}
            <path d="M47,74 Q44,73 42,71" stroke="#5C1F08" strokeWidth="1.2"
              fill="none" strokeLinecap="round" opacity="0.6"/>
            <path d="M73,74 Q76,73 78,71" stroke="#5C1F08" strokeWidth="1.2"
              fill="none" strokeLinecap="round" opacity="0.6"/>
          </>
        )}

        {/* ── Whiskers — long and prominent ── */}
        {/* Whisker pad dots */}
        <circle cx="43" cy="70" r="1.5" fill="#92400E" opacity="0.55"/>
        <circle cx="77" cy="70" r="1.5" fill="#92400E" opacity="0.55"/>
        {/* Left whiskers (3 per side) */}
        <path d="M20,65 L42,69" stroke="#5C1F08" strokeWidth="0.9"
          strokeLinecap="round" opacity="0.45"/>
        <path d="M17,71 L42,71" stroke="#5C1F08" strokeWidth="0.9"
          strokeLinecap="round" opacity="0.5"/>
        <path d="M20,77 L42,73" stroke="#5C1F08" strokeWidth="0.9"
          strokeLinecap="round" opacity="0.4"/>
        {/* Right whiskers */}
        <path d="M100,65 L78,69" stroke="#5C1F08" strokeWidth="0.9"
          strokeLinecap="round" opacity="0.45"/>
        <path d="M103,71 L78,71" stroke="#5C1F08" strokeWidth="0.9"
          strokeLinecap="round" opacity="0.5"/>
        <path d="M100,77 L78,73" stroke="#5C1F08" strokeWidth="0.9"
          strokeLinecap="round" opacity="0.4"/>

        {/* ── Expression extras ── */}
        {(isCorrect || expression === 'cheer') && (
          <>
            <text x="3"   y="28" fontSize="14" fill="#FCD34D" opacity="0.9">✦</text>
            <text x="106" y="22" fontSize="11" fill="#FCD34D" opacity="0.85">✦</text>
            <text x="2"   y="50" fontSize="9"  fill="#2563EB" opacity="0.8">✦</text>
            <text x="109" y="46" fontSize="11" fill="#58CC02" opacity="0.8">✦</text>
          </>
        )}
        {isThinking && (
          <>
            <circle cx="97" cy="22" r="4.5" fill="#E0E7FF" opacity="0.7"/>
            <circle cx="107" cy="13" r="6"  fill="#E0E7FF" opacity="0.55"/>
            <circle cx="114" cy="4"  r="4.5" fill="#E0E7FF" opacity="0.4"/>
          </>
        )}
        {isTroubled && (
          <path d="M96,20 Q99,13 102,20 Q102,28 99,28 Q96,28 96,20Z"
            fill="#93C5FD" opacity="0.85"/>
        )}
        {isSurprised && (
          <>
            <path d="M7,22 L20,27"   stroke="#FCD34D" strokeWidth="2.2" strokeLinecap="round" opacity="0.7"/>
            <path d="M4,34 L18,34"   stroke="#FCD34D" strokeWidth="2.2" strokeLinecap="round" opacity="0.6"/>
            <path d="M113,22 L100,27" stroke="#FCD34D" strokeWidth="2.2" strokeLinecap="round" opacity="0.7"/>
            <path d="M116,34 L102,34" stroke="#FCD34D" strokeWidth="2.2" strokeLinecap="round" opacity="0.6"/>
          </>
        )}
      </svg>
    </div>
  );
}
