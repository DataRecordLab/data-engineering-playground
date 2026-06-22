// 田村 誠 — ShopNow CEO
// Business suit, worried expression by default.

const _ = null;
const b = '#0F172A'; // outline
const s = '#FDDCB0'; // skin (slightly warmer)
const S = '#2E4A7B'; // suit jacket dark blue
const L = '#3D6499'; // suit highlight
const T = '#DC2626'; // red tie
const t = '#991B1B'; // tie shadow
const p = '#1E293B'; // pants dark
const m = '#7C2D12'; // mouth

type PixelRow = (string | null)[];
type PixelGrid = PixelRow[];

// Tamura has no glasses, shorter hair, suit instead of hoodie
const BODY_TOP: PixelGrid = [
  [_,_,_,_,b,b,b,b,b,b,b,_,_,_,_,_], // row 0 hair (shorter)
  [_,_,_,b,b,b,b,b,b,b,b,b,_,_,_,_], // row 1 hair
  [_,_,b,b,s,s,s,s,s,s,s,b,b,_,_,_], // row 2 face top
];

const BODY_BOTTOM: PixelGrid = [
  [_,_,_,b,S,S,T,T,S,S,S,b,_,_,_,_], // row 9  collar + tie
  [_,_,b,S,S,S,t,T,t,S,S,S,b,_,_,_], // row 10 chest + tie
  [_,b,s,S,S,S,t,t,t,S,S,S,s,b,_,_], // row 11 arms
  [_,b,s,S,L,S,S,S,S,S,L,S,s,b,_,_], // row 12 arms
  [_,_,b,S,S,S,S,S,S,S,S,S,b,_,_,_], // row 13 lower body
  [_,_,b,p,p,p,b,_,b,p,p,p,b,_,_,_], // row 14 legs
  [_,_,_,p,p,_,_,_,_,_,p,p,_,_,_,_], // row 15 feet
];

function buildSprite(faceRows: PixelGrid): PixelGrid {
  return [...BODY_TOP, ...faceRows, ...BODY_BOTTOM];
}

// worried — default. Downturned mouth, furrowed brow
const WORRIED_FACE: PixelGrid = [
  [_,_,b,s,b,s,s,s,s,s,b,s,b,_,_,_], // row 3 furrowed brow
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_], // row 4
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_], // row 5 eyes
  [_,_,b,s,s,b,s,s,s,b,s,s,b,_,_,_], // row 6 eyes (small)
  [_,_,b,s,s,s,m,m,m,s,s,s,b,_,_,_], // row 7 frown
  [_,_,b,s,m,m,s,s,s,m,m,s,b,_,_,_], // row 8 chin droop
  [_,_,_,b,s,s,s,s,s,s,s,b,_,_,_,_], // row 9 -> shift to body
];

// Actually let me redo this - face is rows 3-8 (6 rows)
const WORRIED_FACE_CORRECT: PixelGrid = [
  [_,_,b,b,s,s,s,s,s,s,b,b,b,_,_,_], // row 3 concerned brow
  [_,_,b,s,b,s,s,s,s,b,s,s,b,_,_,_], // row 4 eyes (worried)
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_], // row 5
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_], // row 6
  [_,_,b,s,s,m,m,m,m,m,s,s,b,_,_,_], // row 7 frown
  [_,_,_,b,s,s,s,s,s,s,s,b,_,_,_,_], // row 8 chin
];

// relieved — eyes closed/squint, small smile
const RELIEVED_FACE: PixelGrid = [
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_],
  [_,_,b,s,b,b,s,s,b,b,s,s,b,_,_,_], // squint eyes
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_],
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_],
  [_,_,b,s,s,s,m,s,m,s,s,s,b,_,_,_], // small smile
  [_,_,_,b,s,s,s,s,s,s,s,b,_,_,_,_],
];

// happy — big smile, raised brows
const HAPPY_FACE: PixelGrid = [
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_],
  [_,_,b,s,b,s,s,s,s,b,s,s,b,_,_,_], // open eyes
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_],
  [_,_,b,s,m,m,s,s,m,m,s,s,b,_,_,_], // smile corners
  [_,_,b,m,s,s,m,m,s,s,m,s,b,_,_,_], // big teeth smile
  [_,_,_,b,s,s,s,s,s,s,s,b,_,_,_,_],
];

export const TAMURA = {
  worried:  buildSprite(WORRIED_FACE_CORRECT),
  relieved: buildSprite(RELIEVED_FACE),
  happy:    buildSprite(HAPPY_FACE),
} as Record<string, PixelGrid>;
