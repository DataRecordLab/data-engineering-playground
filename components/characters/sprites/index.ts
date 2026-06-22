export { TANAKA } from './tanaka';
export { TAMURA } from './tamura';
export { PLAYER } from './player';

export const SPRITES = {
  tanaka: () => import('./tanaka').then(m => m.TANAKA),
  tamura: () => import('./tamura').then(m => m.TAMURA),
  player: () => import('./player').then(m => m.PLAYER),
} as const;

export type CharacterId = keyof typeof SPRITES;
export type PixelGrid = (string | null)[][];
