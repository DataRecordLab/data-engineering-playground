import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/lib/store/gameStore';

// Zustand store を各テスト前にリセット
beforeEach(() => {
  useGameStore.setState({
    hp: 5,
    maxHp: 5,
    damageFlash: false,
    playerAnim: 'idle',
  });
});

describe('gameStore — loseHp', () => {
  it('HP が 1 減る', () => {
    useGameStore.getState().loseHp();
    expect(useGameStore.getState().hp).toBe(4);
  });

  it('damageFlash が true になる', () => {
    useGameStore.getState().loseHp();
    expect(useGameStore.getState().damageFlash).toBe(true);
  });

  it('playerAnim が damage になる', () => {
    useGameStore.getState().loseHp();
    expect(useGameStore.getState().playerAnim).toBe('damage');
  });

  it('HP は 0 未満にならない', () => {
    const store = useGameStore.getState();
    for (let i = 0; i < 10; i++) store.loseHp();
    expect(useGameStore.getState().hp).toBe(0);
  });
});

describe('gameStore — recoverAll', () => {
  it('HP が maxHp まで回復する', () => {
    useGameStore.getState().loseHp();
    useGameStore.getState().loseHp();
    useGameStore.getState().recoverAll();
    const { hp, maxHp } = useGameStore.getState();
    expect(hp).toBe(maxHp);
  });

  it('damageFlash がリセットされる', () => {
    useGameStore.getState().loseHp();
    useGameStore.getState().recoverAll();
    expect(useGameStore.getState().damageFlash).toBe(false);
  });
});

describe('gameStore — triggerJump', () => {
  it('playerAnim が jump になる', () => {
    useGameStore.getState().triggerJump();
    expect(useGameStore.getState().playerAnim).toBe('jump');
  });
});

describe('gameStore — setCharacterConfig', () => {
  it('config が保存され characterConfigLoaded が true になる', () => {
    const config = {
      hairColor: '#123456',
      outfitStyle: 'hoodie' as const,
      outfitColor: '#abcdef',
      hasGlasses: true,
      glassesColor: '#ffffff',
      jobTitle: 'Data Engineer' as const,
    };
    useGameStore.getState().setCharacterConfig(config);
    const state = useGameStore.getState();
    expect(state.characterConfig.hairColor).toBe('#123456');
    expect(state.characterConfigLoaded).toBe(true);
  });
});
