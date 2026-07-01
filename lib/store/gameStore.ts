'use client';

import { create } from 'zustand';

type PlayerAnim = 'idle' | 'jump' | 'damage';

interface GameStore {
  hp: number;
  maxHp: number;
  damageFlash: boolean;
  playerAnim: PlayerAnim;
  loseHp: () => void;
  recoverAll: () => void;
  resetFlash: () => void;
  triggerJump: () => void;
  resetAnim: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  hp: 5,
  maxHp: 5,
  damageFlash: false,
  playerAnim: 'idle',

  loseHp: () =>
    set((state) => ({
      hp: Math.max(0, state.hp - 1),
      damageFlash: true,
      playerAnim: 'damage',
    })),

  recoverAll: () =>
    set((state) => ({ hp: state.maxHp, damageFlash: false, playerAnim: 'idle' })),

  resetFlash: () => set({ damageFlash: false }),

  triggerJump: () => set({ playerAnim: 'jump' }),

  resetAnim: () => set({ playerAnim: 'idle' }),
}));
