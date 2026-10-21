import type { AnswerOutcome, LessonResult, SkillQuestion } from '@/types';

// ── 出題順・選択肢のシャッフル ──────────────────────────────────────────
// 定義ファイルでは正解が先頭付近に偏っているため、表示時に必ず並べ替える

function shuffledIndices(n: number): number[] {
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx;
}

export function shuffleQuestion(q: SkillQuestion): SkillQuestion {
  if (q.type === 'multiple_choice') {
    return { ...q, options: shuffledIndices(q.options.length).map(i => q.options[i]) };
  }
  if (q.type === 'ordering') {
    // 表示順が正解順と一致すると「上から押すだけ」で解けてしまうので避ける
    for (let attempt = 0; attempt < 10; attempt++) {
      const perm = shuffledIndices(q.items.length);
      const newPos = new Map(perm.map((oldIdx, newIdx) => [oldIdx, newIdx]));
      const correctOrder = q.correctOrder.map(oldIdx => newPos.get(oldIdx)!);
      if (q.items.length < 2 || correctOrder.some((v, i) => v !== i)) {
        return { ...q, items: perm.map(i => q.items[i]), correctOrder };
      }
    }
  }
  return q;
}

// ── 採点 ─────────────────────────────────────────────────────────────

export function classifyAnswer(correct: boolean, confident: boolean): AnswerOutcome {
  if (correct) return confident ? 'mastered' : 'lucky';
  return confident ? 'misconception' : 'unknown';
}

export function summarize(outcomes: AnswerOutcome[]): LessonResult {
  const count = (o: AnswerOutcome) => outcomes.filter(x => x === o).length;
  return {
    total: outcomes.length,
    mastered: count('mastered'),
    lucky: count('lucky'),
    misconception: count('misconception'),
    unknown: count('unknown'),
  };
}

// 理解度 0〜1：自信なしの正解は半分しか数えない
export function understandingRate(r: LessonResult): number {
  if (r.total === 0) return 0;
  return (r.mastered + r.lucky * 0.5) / r.total;
}

// ★3 は「全問を自信を持って正解」したときだけ。勘で全問当たっても ★3 にはならない
export function starsFor(r: LessonResult): number {
  if (r.total > 0 && r.mastered === r.total) return 3;
  return understandingRate(r) >= 0.7 ? 2 : 1;
}

export function xpFor(r: LessonResult, xpReward: number): number {
  return Math.max(Math.round(xpReward * understandingRate(r)), Math.round(xpReward * 0.3));
}
