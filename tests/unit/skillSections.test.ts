import { describe, it, expect } from 'vitest';
import { SECTION_PIPELINE } from '@/lib/skills/section1';
import { SECTION_QUALITY }  from '@/lib/skills/section2';
import { SECTION_MODELING } from '@/lib/skills/section3';
import { SECTION_TOOLS }    from '@/lib/skills/section4';
import { SECTION_ARCH }     from '@/lib/skills/section5';
import type { SkillSection } from '@/types';

const ALL_SECTIONS: SkillSection[] = [
  SECTION_PIPELINE,
  SECTION_QUALITY,
  SECTION_MODELING,
  SECTION_TOOLS,
  SECTION_ARCH,
];

describe('スキルセクション — データ整合性', () => {
  it('全セクションが id / title / lessons を持つ', () => {
    for (const s of ALL_SECTIONS) {
      expect(s.id, `section ${s.id}`).toBeTruthy();
      expect(s.title).toBeTruthy();
      expect(s.lessons.length).toBeGreaterThan(0);
    }
  });

  it('全レッスンが concept フィールドを持つ（22本）', () => {
    const missing: string[] = [];
    for (const s of ALL_SECTIONS) {
      for (const l of s.lessons) {
        if (!l.concept) missing.push(`${s.id}/${l.id}`);
      }
    }
    expect(missing, `concept なしのレッスン: ${missing.join(', ')}`).toHaveLength(0);
  });

  it('全レッスンの concept が title と body を持つ', () => {
    for (const s of ALL_SECTIONS) {
      for (const l of s.lessons) {
        expect(l.concept!.title, `${s.id}/${l.id} title`).toBeTruthy();
        expect(l.concept!.body,  `${s.id}/${l.id} body`).toBeTruthy();
      }
    }
  });

  it('全レッスンが 1 問以上の questions を持つ', () => {
    for (const s of ALL_SECTIONS) {
      for (const l of s.lessons) {
        expect(
          l.questions.length,
          `${s.id}/${l.id} の questions が空`
        ).toBeGreaterThan(0);
      }
    }
  });

  it('全問題が id / type / question / explanation を持つ', () => {
    for (const s of ALL_SECTIONS) {
      for (const l of s.lessons) {
        for (const q of l.questions) {
          expect(q.id,          `${l.id} q.id`).toBeTruthy();
          expect(q.type,        `${l.id} q.type`).toBeTruthy();
          expect(q.question,    `${l.id} q.question`).toBeTruthy();
          expect(q.explanation, `${l.id} q.explanation`).toBeTruthy();
        }
      }
    }
  });

  it('multiple_choice の各選択肢に correct が 1 つある', () => {
    for (const s of ALL_SECTIONS) {
      for (const l of s.lessons) {
        for (const q of l.questions) {
          if (q.type !== 'multiple_choice') continue;
          const correctCount = q.options.filter(o => o.correct).length;
          expect(
            correctCount,
            `${l.id}/${q.id} の correct 選択肢数`
          ).toBe(1);
        }
      }
    }
  });

  it('xpReward が正の数である', () => {
    for (const s of ALL_SECTIONS) {
      for (const l of s.lessons) {
        expect(l.xpReward, `${s.id}/${l.id} xpReward`).toBeGreaterThan(0);
      }
    }
  });

  it('合計レッスン数が 22 本', () => {
    const total = ALL_SECTIONS.reduce((sum, s) => sum + s.lessons.length, 0);
    expect(total).toBe(22);
  });
});
