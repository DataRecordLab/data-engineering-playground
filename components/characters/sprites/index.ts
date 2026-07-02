export { TANAKA } from './tanaka';
export { TAMURA } from './tamura';
export { PLAYER } from './player';
export { MIO } from './mio';

export const SPRITES = {
  tanaka: () => import('./tanaka').then(m => m.TANAKA),
  tamura: () => import('./tamura').then(m => m.TAMURA),
  player: () => import('./player').then(m => m.PLAYER),
  mio:    () => import('./mio').then(m => m.MIO),
} as const;

export type CharacterId = keyof typeof SPRITES;
export type PixelGrid = (string | null)[][];
