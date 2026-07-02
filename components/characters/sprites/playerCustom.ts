// Parameterized player sprite — generates PixelGrid from CharacterConfig.
// All NPCs (Tanaka, Tamura) use hardcoded color constants.
// Only the player sprite uses this dynamic generator.

import type { CharacterConfig, HairStyle, OutfitStyle } from '@/types';

type PixelRow = (string | null)[];
type PixelGrid = PixelRow[];

const _ = null;
const b = '#0F172A'; // universal outline

// ─── Hair rows (rows 0-1) by style ───────────────────────────────────────────

function hairRows(color: string, style: HairStyle): PixelGrid {
  const c = color;
  switch (style) {
    case 'short':
      return [
        [_,_,_,c,c,c,c,c,c,c,c,_,_,_,_,_],
        [_,_,c,c,c,c,c,c,c,c,c,c,_,_,_,_],
      ];
    case 'flat':
      return [
        [_,_,c,c,c,c,c,c,c,c,c,c,c,_,_,_],
        [_,_,c,c,c,c,c,c,c,c,c,c,c,_,_,_],
      ];
    case 'spiky':
      return [
        [_,c,_,c,_,c,c,c,c,c,_,c,_,c,_,_],
        [_,c,c,c,c,c,c,c,c,c,c,c,c,_,_,_],
      ];
    case 'long':
      return [
        [_,_,c,c,c,c,c,c,c,c,c,c,c,_,_,_],
        [_,c,c,c,c,c,c,c,c,c,c,c,c,c,_,_],
      ];
  }
}

// ─── Face rows (rows 2-8): skin + optional glasses ───────────────────────────

function faceRows(skin: string, hasGlasses: boolean, glassesColor: string): PixelGrid {
  const s = skin;
  const g = glassesColor;
  const m = '#7C2D12';

  if (hasGlasses) {
    return [
      [_,b,b,s,s,s,s,s,s,s,s,s,b,b,_,_],   // row 2 face top
      [_,b,s,g,g,b,g,s,g,b,g,s,s,b,_,_],   // row 3 glasses + eyes
      [_,b,s,g,g,g,g,s,g,g,g,s,s,b,_,_],   // row 4 glasses bottom
      [_,b,s,s,s,s,s,s,s,s,s,s,s,b,_,_],   // row 5 nose
      [_,b,s,s,s,s,s,s,s,s,s,s,s,b,_,_],   // row 6
      [_,b,s,s,s,m,s,s,m,m,m,s,s,b,_,_],   // row 7 smile
      [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_],   // row 8 chin
    ];
  }

  return [
    [_,b,b,s,s,s,s,s,s,s,s,s,b,b,_,_],
    [_,b,s,s,s,s,s,s,s,s,s,s,s,b,_,_],
    [_,b,s,s,b,s,s,s,b,s,s,s,s,b,_,_],   // eyes
    [_,b,s,s,s,s,s,s,s,s,s,s,s,b,_,_],
    [_,b,s,s,s,s,s,s,s,s,s,s,s,b,_,_],
    [_,b,s,s,s,m,s,s,m,m,m,s,s,b,_,_],   // smile
    [_,_,b,s,s,s,s,s,s,s,s,s,b,_,_,_],
  ];
}

// ─── Body rows (rows 9-15) by outfit style ───────────────────────────────────

function bodyRows(outfit: string, style: OutfitStyle, skin: string): PixelGrid {
  const o = outfit;
  const lo = lighten(outfit);  // highlight color
  const p = '#1E293B';         // pants
  const sk = skin;

  switch (style) {
    case 'hoodie':
      return [
        [_,_,_,b,o,o,o,o,o,o,o,b,_,_,_,_],
        [_,_,b,o,o,o,lo,lo,o,o,o,o,b,_,_,_],
        [_,b,sk,o,o,o,o,o,o,o,o,o,sk,b,_,_],
        [_,b,sk,o,o,o,o,o,o,o,o,o,sk,b,_,_],
        [_,_,b,o,o,o,o,o,o,o,o,o,b,_,_,_],
        [_,_,b,p,p,p,b,_,b,p,p,p,b,_,_,_],
        [_,_,_,p,p,_,_,_,_,_,p,p,_,_,_,_],
      ];
    case 'tee':
      return [
        [_,_,_,b,o,o,b,b,b,o,o,b,_,_,_,_],
        [_,_,b,o,o,o,o,o,o,o,o,o,b,_,_,_],
        [_,b,sk,o,o,o,o,o,o,o,o,o,sk,b,_,_],
        [_,b,sk,o,o,o,o,o,o,o,o,o,sk,b,_,_],
        [_,_,b,o,o,o,o,o,o,o,o,o,b,_,_,_],
        [_,_,b,p,p,p,b,_,b,p,p,p,b,_,_,_],
        [_,_,_,p,p,_,_,_,_,_,p,p,_,_,_,_],
      ];
    case 'jacket':
      return [
        [_,_,_,b,o,o,b,b,b,o,o,b,_,_,_,_],
        [_,_,b,o,o,b,'#E5E7EB','#E5E7EB',b,o,o,o,b,_,_,_],
        [_,b,sk,o,b,'#E5E7EB','#E5E7EB','#E5E7EB','#E5E7EB',b,o,o,sk,b,_,_],
        [_,b,sk,o,b,'#E5E7EB','#E5E7EB','#E5E7EB','#E5E7EB',b,o,o,sk,b,_,_],
        [_,_,b,o,o,o,o,o,o,o,o,o,b,_,_,_],
        [_,_,b,p,p,p,b,_,b,p,p,p,b,_,_,_],
        [_,_,_,p,p,_,_,_,_,_,p,p,_,_,_,_],
      ];
    case 'suit': {
      const T = '#DC2626'; // red tie
      return [
        [_,_,_,b,o,o,T,T,o,o,o,b,_,_,_,_],
        [_,_,b,o,o,o,T,T,T,o,o,o,b,_,_,_],
        [_,b,sk,o,o,o,T,T,T,o,o,o,sk,b,_,_],
        [_,b,sk,o,lo,o,o,o,o,o,lo,o,sk,b,_,_],
        [_,_,b,o,o,o,o,o,o,o,o,o,b,_,_,_],
        [_,_,b,p,p,p,b,_,b,p,p,p,b,_,_,_],
        [_,_,_,p,p,_,_,_,_,_,p,p,_,_,_,_],
      ];
    }
  }
}

// Simple hex lightener: parse RGB, increase by 20%
function lighten(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((n >> 16) & 0xff) + 40);
  const g = Math.min(255, ((n >> 8) & 0xff) + 40);
  const bv = Math.min(255, (n & 0xff) + 40);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bv.toString(16).padStart(2, '0')}`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function buildPlayerSprite(config: CharacterConfig): PixelGrid {
  return [
    ...hairRows(config.hairColor, config.hairStyle),
    ...faceRows(config.skinTone, config.hasGlasses, config.glassesColor),
    ...bodyRows(config.outfitColor, config.outfitStyle, config.skinTone),
  ];
}
