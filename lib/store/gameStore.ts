'use client';

import { create } from 'zustand';
import { DEFAULT_CHARACTER_CONFIG } from '@/types';
import type { CharacterConfig } from '@/types';

type PlayerAnim = 'idle' | 'jump' | 'damage';

interface GameStore {
  hp: number;
  maxHp: number;
  damageFlash: boolean;
  playerAnim: PlayerAnim;
  characterConfig: CharacterConfig;
  characterConfigLoaded: boolean;
  loseHp: () => void;
  recoverAll: () => void;
  resetFlash: () => void;
  triggerJump: () => void;
  resetAnim: () => void;
  setCharacterConfig: (config: CharacterConfig) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  hp: 5,
  maxHp: 5,
  damageFlash: false,
  playerAnim: 'idle',
  characterConfig: DEFAULT_CHARACTER_CONFIG,
  characterConfigLoaded: false,

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

  setCharacterConfig: (config: CharacterConfig) =>
    set({ characterConfig: config, characterConfigLoaded: true }),
}));
