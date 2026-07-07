import { describe, it, expect } from 'vitest';
import { ALL_DEBUG_SCENARIOS, getDebugScenario } from '@/lib/debug';

describe('Debug Lab シナリオ — データ整合性', () => {
  it('シナリオが 1 件以上存在する', () => {
    expect(ALL_DEBUG_SCENARIOS.length).toBeGreaterThan(0);
  });

  it('全シナリオが必須フィールドを持つ', () => {
    for (const s of ALL_DEBUG_SCENARIOS) {
      expect(s.id,       `${s.id} id`).toBeTruthy();
      expect(s.title,    `${s.id} title`).toBeTruthy();
      expect(s.setupSQL, `${s.id} setupSQL`).toBeTruthy();
      expect(s.xpReward, `${s.id} xpReward`).toBeGreaterThan(0);
    }
  });

  it('全シナリオにアラート情報がある', () => {
    for (const s of ALL_DEBUG_SCENARIOS) {
      expect(s.alert.from,           `${s.id} alert.from`).toBeTruthy();
      expect(s.alert.message,        `${s.id} alert.message`).toBeTruthy();
      expect(s.alert.expectedValue,  `${s.id} alert.expectedValue`).toBeTruthy();
      expect(s.alert.actualValue,    `${s.id} alert.actualValue`).toBeTruthy();
    }
  });

  it('全シナリオに調査ヒントが 1 件以上ある', () => {
    for (const s of ALL_DEBUG_SCENARIOS) {
      expect(
        s.investigationHints.length,
        `${s.id} investigationHints`
      ).toBeGreaterThan(0);
    }
  });

  it('全シナリオの診断選択肢に correct が 1 つある', () => {
    for (const s of ALL_DEBUG_SCENARIOS) {
      const correctCount = s.diagnosisOptions.filter(o => o.correct).length;
      expect(
        correctCount,
        `${s.id} diagnosisOptions correct 数`
      ).toBe(1);
    }
  });

  it('全シナリオの修正選択肢に correct が 1 つある', () => {
    for (const s of ALL_DEBUG_SCENARIOS) {
      const correctCount = s.fixOptions.filter(o => o.correct).length;
      expect(
        correctCount,
        `${s.id} fixOptions correct 数`
      ).toBe(1);
    }
  });

  it('全シナリオに verificationSQL がある', () => {
    for (const s of ALL_DEBUG_SCENARIOS) {
      expect(s.verificationSQL, `${s.id} verificationSQL`).toBeTruthy();
    }
  });

  it('getDebugScenario で ID 検索できる', () => {
    const first = ALL_DEBUG_SCENARIOS[0];
    const found = getDebugScenario(first.id);
    expect(found).toBeDefined();
    expect(found!.id).toBe(first.id);
  });

  it('存在しない ID は undefined を返す', () => {
    expect(getDebugScenario('non-existent-id')).toBeUndefined();
  });
});
