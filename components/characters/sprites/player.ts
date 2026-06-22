// プレイヤーキャラクター — 新人データエンジニア
// Gender-neutral modern engineer design.

const _ = null;
const b = '#0F172A'; // outline
const s = '#FDDCB0'; // skin
const h = '#4A90D9'; // blue hoodie (player signature color)
const l = '#60A8EE'; // hoodie highlight
const p = '#374151'; // dark gray pants
const k = '#1F2937'; // hair dark
const m = '#7C2D12'; // mouth

type PixelRow = (string | null)[];
type PixelGrid = PixelRow[];

// Player: blue hoodie, dark hair, friendly face, no glasses
export const PLAYER_NEUTRAL: PixelGrid = [
  [_,_,_,k,k,k,k,k,k,k,k,_,_,_,_,_], // row 0 hair
  [_,_,k,k,k,k,k,k,k,k,k,k,_,_,_,_], // row 1 hair
  [_,b,b,s,s,s,s,s,s,s,s,s,b,b,_,_], // row 2 face
  [_,b,s,s,s,s,s,s,s,s,s,s,s,b,_,_], // row 3
  [_,b,s,s,b,s,s,s,b,s,s,s,s,b,_,_], // row 4 eyes
  [_,b,s,s,s,s,s,s,s,s,s,s,s,b,_,_], // row 5
  [_,b,s,s,s,s,s,s,s,s,s,s,s,b,_,_], // row 6
  [_,b,s,s,s,m,s,s,m,m,m,s,s,b,_,_], // row 7 smile
  [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_], // row 8 chin
  [_,_,_,b,h,h,h,h,h,h,h,b,_,_,_,_], // row 9 collar
  [_,_,b,h,h,h,l,l,h,h,h,h,b,_,_,_], // row 10 chest
  [_,b,s,h,h,h,h,h,h,h,h,h,s,b,_,_], // row 11 arms
  [_,b,s,h,h,h,h,h,h,h,h,h,s,b,_,_], // row 12 arms
  [_,_,b,h,h,h,h,h,h,h,h,h,b,_,_,_], // row 13 lower
  [_,_,b,p,p,p,b,_,b,p,p,p,b,_,_,_], // row 14 legs
  [_,_,_,p,p,_,_,_,_,_,p,p,_,_,_,_], // row 15 feet
];

// Walk frames: slight lean variations for animation
export const PLAYER_WALK_1: PixelGrid = PLAYER_NEUTRAL; // same, CSS handles bob

export const PLAYER = {
  neutral: PLAYER_NEUTRAL,
  walk:    PLAYER_WALK_1,
} as Record<string, PixelGrid>;
