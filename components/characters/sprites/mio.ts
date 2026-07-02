// Mio（ミオ）— Modelion マスコットキャラクター
// 猫耳・ラベンダー・でかい瞳・ほっぺブラッシュ

const _ = null;
const b = '#312E81'; // deep indigo outline
const f = '#EDE9FE'; // lavender face
const p = '#7C3AED'; // violet body/ears
const P = '#6D28D9'; // violet dark (legs)
const L = '#A78BFA'; // violet light (arm highlight)
const e = '#312E81'; // eye pupil
const w = '#FFFFFF'; // eye shine
const r = '#FCA5A5'; // rose blush
const m = '#4C1D95'; // mouth
const c = '#4338CA'; // chest accent indigo
const d = '#C4B5FD'; // chest diamond shine

type PixelRow = (string | null)[];
type PixelGrid = PixelRow[];

// ── 頭部（猫耳付き）─────────────────────────────────────────────────────────

const BODY_TOP: PixelGrid = [
  [_,_,_,b,p,_,_,_,_,p,b,_,_,_,_,_], // row 0  ear tips
  [_,_,b,p,p,b,_,_,b,p,p,b,_,_,_,_], // row 1  ears
  [_,_,b,f,p,b,b,b,b,p,f,b,_,_,_,_], // row 2  head top / ear bases
];

// ── 胴体（◈ エンブレム付き）──────────────────────────────────────────────────

const BODY_BOTTOM: PixelGrid = [
  [_,_,_,b,f,f,f,f,f,f,f,b,_,_,_,_], // row 9  chin/neck
  [_,_,b,p,p,p,c,d,c,p,p,p,b,_,_,_], // row 10 chest ◈
  [_,b,L,p,p,p,p,p,p,p,p,p,L,b,_,_], // row 11 arms
  [_,b,L,p,p,p,p,p,p,p,p,p,L,b,_,_], // row 12 arms
  [_,_,b,p,p,p,p,p,p,p,p,p,b,_,_,_], // row 13 lower body
  [_,_,b,P,P,P,b,_,b,P,P,P,b,_,_,_], // row 14 legs
  [_,_,_,P,P,_,_,_,_,_,P,P,_,_,_,_], // row 15 feet
];

function buildSprite(faceRows: PixelGrid): PixelGrid {
  return [...BODY_TOP, ...faceRows, ...BODY_BOTTOM];
}

// ── 表情（顔 rows 3–8）────────────────────────────────────────────────────────

// cute — デフォルト: 大きな瞳・小さなスマイル
const CUTE_FACE: PixelGrid = [
  [_,_,b,f,f,f,f,f,f,f,f,b,_,_,_,_], // row 3  forehead
  [_,_,b,f,b,b,f,f,b,b,f,b,_,_,_,_], // row 4  eye tops
  [_,_,b,f,e,w,f,f,e,w,f,b,_,_,_,_], // row 5  pupils + shine
  [_,_,b,f,b,b,f,f,b,b,f,b,_,_,_,_], // row 6  eye bottoms
  [_,_,b,r,f,f,f,f,f,f,r,b,_,_,_,_], // row 7  blush
  [_,_,b,f,f,m,f,f,m,f,f,b,_,_,_,_], // row 8  smile corners
];

// excited — キラキラ目・大きなブラッシュ・広い笑顔
const EXCITED_FACE: PixelGrid = [
  [_,_,b,f,f,f,f,f,f,f,f,b,_,_,_,_],
  [_,_,b,f,b,b,f,f,b,b,f,b,_,_,_,_],
  [_,_,b,f,w,w,f,f,w,w,f,b,_,_,_,_], // OwO 目（全部輝き）
  [_,_,b,f,b,b,f,f,b,b,f,b,_,_,_,_],
  [_,_,b,r,r,f,f,f,f,r,r,b,_,_,_,_], // 大きなブラッシュ
  [_,_,b,f,m,f,m,m,f,m,f,b,_,_,_,_], // 広い笑顔
];

// happy — ><目・満面の笑み
const HAPPY_FACE: PixelGrid = [
  [_,_,b,f,f,f,f,f,f,f,f,b,_,_,_,_],
  [_,_,b,f,b,f,f,f,f,b,f,b,_,_,_,_], // > と < の外角
  [_,_,b,f,f,b,f,f,b,f,f,b,_,_,_,_], // > と < の内角
  [_,_,b,f,f,f,f,f,f,f,f,b,_,_,_,_],
  [_,_,b,r,r,f,f,f,f,r,r,b,_,_,_,_],
  [_,_,b,f,f,m,m,m,m,f,f,b,_,_,_,_], // 満面スマイル
];

// thinking — 片目が小さい・首かしげ表情
const THINKING_FACE: PixelGrid = [
  [_,_,b,f,f,f,f,f,f,f,f,b,_,_,_,_],
  [_,_,b,f,b,b,f,f,f,b,f,b,_,_,_,_], // 左: 普通、右: 細め
  [_,_,b,f,e,w,f,f,f,e,f,b,_,_,_,_], // 左: 瞳+光、右: 瞳のみ
  [_,_,b,f,b,b,f,f,f,b,f,b,_,_,_,_],
  [_,_,b,r,f,f,f,f,f,f,f,b,_,_,_,_], // 左側ブラッシュのみ
  [_,_,b,f,f,f,f,m,f,f,f,b,_,_,_,_], // 小さなドット口
];

export const MIO = {
  cute:     buildSprite(CUTE_FACE),
  excited:  buildSprite(EXCITED_FACE),
  happy:    buildSprite(HAPPY_FACE),
  thinking: buildSprite(THINKING_FACE),
} as Record<string, PixelGrid>;
