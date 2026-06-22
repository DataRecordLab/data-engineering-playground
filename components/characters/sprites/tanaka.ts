// 田中 貢 — シニアデータエンジニア
// 16×16 pixel grid. null = transparent.

const _ = null;
const b = '#0F172A'; // dark outline
const s = '#F5CBA7'; // skin
const g = '#93C5FD'; // glasses lens (blue)
const e = '#0F172A'; // eye pupil (same as outline)
const h = '#1E3A5F'; // dark navy hoodie
const l = '#2D5A8E'; // hoodie highlight
const p = '#1E293B'; // pants/dark
const m = '#7C2D12'; // mouth dark

// ── Expressions: only face rows (3-8) differ ──

const BODY_TOP: PixelGrid = [
  [_,_,_,b,b,b,b,b,b,b,b,b,_,_,_,_], // row 0 hair
  [_,_,b,b,b,b,b,b,b,b,b,b,b,_,_,_], // row 1 hair
  [_,b,b,s,s,s,s,s,s,s,s,s,b,b,_,_], // row 2 face top
];

const BODY_BOTTOM: PixelGrid = [
  [_,_,_,b,h,h,h,h,h,h,h,b,_,_,_,_], // row 9  collar
  [_,_,b,h,h,h,l,l,h,h,h,h,b,_,_,_], // row 10 chest
  [_,b,s,h,h,h,h,h,h,h,h,h,s,b,_,_], // row 11 arms
  [_,b,s,h,h,h,h,h,h,h,h,h,s,b,_,_], // row 12 arms
  [_,_,b,h,h,h,h,h,h,h,h,h,b,_,_,_], // row 13 lower
  [_,_,b,p,p,p,b,_,b,p,p,p,b,_,_,_], // row 14 legs
  [_,_,_,p,p,_,_,_,_,_,p,p,_,_,_,_], // row 15 feet
];

type PixelRow = (string | null)[];
type PixelGrid = PixelRow[];

function buildSprite(faceRows: PixelGrid): PixelGrid {
  return [...BODY_TOP, ...faceRows, ...BODY_BOTTOM];
}

// neutral — glasses, flat mouth
const NEUTRAL_FACE: PixelGrid = [
  [_,b,s,g,g,e,g,s,g,e,g,s,b,b,_,_], // row 3 glasses+eyes
  [_,b,s,g,g,g,g,s,g,g,g,s,b,b,_,_], // row 4 glasses bottom
  [_,b,s,s,s,s,s,s,s,s,s,s,b,b,_,_], // row 5 nose area
  [_,b,s,s,m,s,s,s,s,m,s,s,b,b,_,_], // row 6 mouth corners
  [_,b,s,s,m,m,m,m,m,s,s,s,b,b,_,_], // row 7 straight mouth
  [_,_,b,s,s,s,s,s,s,s,s,b,_,_,_,_], // row 8 chin
];

// smile — teeth showing
const SMILE_FACE: PixelGrid = [
  [_,b,s,g,g,e,g,s,g,e,g,s,b,b,_,_],
  [_,b,s,g,g,g,g,s,g,g,g,s,b,b,_,_],
  [_,b,s,s,s,s,s,s,s,s,s,s,b,b,_,_],
  [_,b,s,s,m,m,s,s,m,m,s,s,b,b,_,_], // raised corners
  [_,b,s,m,_,_,m,m,_,_,m,s,b,b,_,_], // teeth gap
  [_,b,s,m,m,m,m,m,m,m,m,s,b,b,_,_], // chin of smile
  [_,_,b,s,s,s,s,s,s,s,s,b,_,_,_,_],
];

// stern — furrowed brow, downturned mouth
const STERN_FACE: PixelGrid = [
  [_,b,s,b,g,e,g,s,g,e,g,b,b,b,_,_], // row 3 furrowed brow
  [_,b,s,g,g,g,g,s,g,g,g,s,b,b,_,_],
  [_,b,s,s,s,s,s,s,s,s,s,s,b,b,_,_],
  [_,b,s,s,s,s,m,m,s,s,s,s,b,b,_,_], // tight downturned
  [_,b,s,s,m,m,s,s,s,m,m,s,b,b,_,_], // corners down
  [_,b,s,s,s,s,s,s,s,s,s,s,b,b,_,_],
  [_,_,b,s,s,s,s,s,s,s,s,b,_,_,_,_],
];

// thinking — looking up slightly, "..." implied
const THINKING_FACE: PixelGrid = [
  [_,b,s,g,g,g,e,s,g,g,e,s,b,b,_,_], // looking right
  [_,b,s,g,g,g,g,s,g,g,g,s,b,b,_,_],
  [_,b,s,s,s,s,s,s,s,s,s,s,b,b,_,_],
  [_,b,s,s,s,s,s,s,s,s,s,s,b,b,_,_],
  [_,b,s,s,s,m,s,s,s,m,s,s,b,b,_,_], // slight smile
  [_,b,s,s,s,s,s,s,s,s,s,s,b,b,_,_],
  [_,_,b,s,s,s,s,s,s,s,s,b,_,_,_,_],
];

export const TANAKA = {
  neutral:  buildSprite(NEUTRAL_FACE),
  smile:    buildSprite(SMILE_FACE),
  stern:    buildSprite(STERN_FACE),
  thinking: buildSprite(THINKING_FACE),
} as Record<string, PixelGrid>;
