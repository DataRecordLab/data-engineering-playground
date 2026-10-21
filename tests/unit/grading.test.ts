import { describe, it, expect } from 'vitest';
import { shuffleQuestion, classifyAnswer, summarize, starsFor, xpFor } from '@/lib/skills/grading';
import { resolveShareCard } from '@/lib/share';
import { ROADMAP, buildRoadmapProgress, levelProgress } from '@/lib/roadmap';
import { ALL_SECTIONS } from '@/lib/skills';
import type { MultipleChoiceQuestion, OrderingQuestion } from '@/types';

describe('スキル採点 — 当てずっぽう対策', () => {
  it('選択肢をシャッフルしても正解は 1 つだけ残る', () => {
    const q: MultipleChoiceQuestion = {
      id: 'q', type: 'multiple_choice', question: '', explanation: '',
      options: [{ label: 'A', correct: true }, { label: 'B', correct: false }, { label: 'C', correct: false }],
    };
    for (let i = 0; i < 50; i++) {
      const s = shuffleQuestion(q) as MultipleChoiceQuestion;
      expect(s.options.filter(o => o.correct).map(o => o.label)).toEqual(['A']);
    }
  });

  it('正解位置が先頭に偏らない', () => {
    const q: MultipleChoiceQuestion = {
      id: 'q', type: 'multiple_choice', question: '', explanation: '',
      options: ['A', 'B', 'C', 'D'].map((label, i) => ({ label, correct: i === 0 })),
    };
    const positions = new Set<number>();
    for (let i = 0; i < 200; i++) {
      positions.add((shuffleQuestion(q) as MultipleChoiceQuestion).options.findIndex(o => o.correct));
    }
    expect(positions.size).toBe(4);
  });

  it('並び替え問題はシャッフル後も同じ正解順を指し、表示順＝正解順にはならない', () => {
    const q: OrderingQuestion = {
      id: 'q', type: 'ordering', question: '', explanation: '',
      items: ['Source', 'Staging', 'Warehouse', 'Mart'], correctOrder: [0, 1, 2, 3],
    };
    for (let i = 0; i < 50; i++) {
      const s = shuffleQuestion(q) as OrderingQuestion;
      expect(s.correctOrder.map(idx => s.items[idx])).toEqual(['Source', 'Staging', 'Warehouse', 'Mart']);
      expect(s.correctOrder).not.toEqual([0, 1, 2, 3]);
    }
  });

  it('勘で全問正解しても ★3 にならない', () => {
    const allLucky = summarize(Array(5).fill(classifyAnswer(true, false)));
    expect(starsFor(allLucky)).toBe(1);
    const allMastered = summarize(Array(5).fill(classifyAnswer(true, true)));
    expect(starsFor(allMastered)).toBe(3);
  });

  it('XP は理解度に比例し、最低 30% は保証される', () => {
    expect(xpFor(summarize(['mastered', 'mastered']), 100)).toBe(100);
    expect(xpFor(summarize(['lucky', 'lucky']), 100)).toBe(50);
    expect(xpFor(summarize(['unknown', 'misconception']), 100)).toBe(30);
  });
});

describe('シェアカード', () => {
  it('既知のクエスト・レッスンだけを解決する', () => {
    expect(resolveShareCard('quest', 'ec-site', { stage: 'mart', stars: '3' })?.eyebrow).toBe('QUEST COMPLETE');
    expect(resolveShareCard('quest', 'unknown', {})).toBeNull();
    expect(resolveShareCard('skill', 'pipeline-basics', { lesson: 'nope' })).toBeNull();
    expect(resolveShareCard('evil', 'x', {})).toBeNull();
  });

  it('星の数は 1〜3 に丸める', () => {
    expect(resolveShareCard('quest', 'saas', { stars: '99' })?.stars).toBe(1);
    expect(resolveShareCard('quest', 'saas', { stars: '2' })?.stars).toBe(2);
  });
});

describe('学習ロードマップ', () => {
  it('参照しているレッスンがすべて存在する', () => {
    for (const level of ROADMAP) {
      for (const item of level.items) {
        if (item.kind !== 'skill') continue;
        const section = ALL_SECTIONS.find(s => s.id === item.sectionId);
        expect(section, item.sectionId).toBeDefined();
        expect(item.lessonIds.length, `${level.level} ${item.sectionId}`).toBeGreaterThan(0);
      }
    }
  });

  it('全スキルレッスンがどこかのレベルに含まれる', () => {
    const covered = new Set(
      ROADMAP.flatMap(l => l.items.flatMap(i => (i.kind === 'skill' ? i.lessonIds.map(id => `${i.sectionId}/${id}`) : [])))
    );
    for (const s of ALL_SECTIONS) for (const l of s.lessons) expect(covered.has(`${s.id}/${l.id}`), `${s.id}/${l.id}`).toBe(true);
  });

  it('進捗が反映される', () => {
    const p = buildRoadmapProgress(
      [{ section_id: 'pipeline-basics', lesson_id: 'what-is-pipeline', xp_earned: 10, stars: 3, completed_at: '' }],
      [{ quest_id: 'ec-site', stage: 'pipeline', status: 'completed', stars: 3, xp_earned: 10 }]
    );
    expect(levelProgress(ROADMAP[0], p).done).toBe(2);
  });
});
