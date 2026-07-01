import { ALL_SECTIONS } from '@/lib/skills';
import type { SkillProgressRow, StageProgressRow } from '@/lib/supabase/progress';

export interface SkillDimension {
  key: string;
  label: string;
  score: number; // 0-100
  color: string;
}

// スキルセクションIDとステージIDのマッピング
const DIMENSION_CONFIG = [
  {
    key: 'pipeline',
    label: 'パイプライン設計',
    color: '#818CF8',
    skillSectionIds: ['pipeline-basics'],
    questStageIds: ['pipeline'],
    skillWeight: 0.6,
    questWeight: 0.4,
  },
  {
    key: 'modeling',
    label: 'データモデリング',
    color: '#F87171',
    skillSectionIds: ['data-modeling'],
    questStageIds: ['warehouse'],
    skillWeight: 0.6,
    questWeight: 0.4,
  },
  {
    key: 'quality',
    label: 'データ品質',
    color: '#34D399',
    skillSectionIds: ['data-quality'],
    questStageIds: ['staging'],
    skillWeight: 0.6,
    questWeight: 0.4,
  },
  {
    key: 'sql',
    label: 'SQL',
    color: '#FBBF24',
    skillSectionIds: [],
    questStageIds: ['source', 'staging', 'warehouse'],
    skillWeight: 0,
    questWeight: 1.0,
  },
  {
    key: 'business',
    label: 'ビジネス理解',
    color: '#C084FC',
    skillSectionIds: [],
    questStageIds: ['mart'],
    skillWeight: 0,
    questWeight: 1.0,
  },
] as const;

function totalLessonsInSections(sectionIds: readonly string[]): number {
  return sectionIds.reduce((acc, sid) => {
    const sec = ALL_SECTIONS.find(s => s.id === sid);
    return acc + (sec?.lessons.length ?? 0);
  }, 0);
}

export function calculateSkillScores(
  skillProgress: SkillProgressRow[],
  questProgress: StageProgressRow[]
): SkillDimension[] {
  return DIMENSION_CONFIG.map(dim => {
    // スキルレッスン達成率
    let skillScore = 0;
    if (dim.skillSectionIds.length > 0 && dim.skillWeight > 0) {
      const total = totalLessonsInSections(dim.skillSectionIds);
      const done = skillProgress.filter(r =>
        dim.skillSectionIds.includes(r.section_id as never)
      ).length;
      skillScore = total > 0 ? done / total : 0;
    }

    // クエストステージ達成率（スター加重）
    let questScore = 0;
    if (dim.questStageIds.length > 0 && dim.questWeight > 0) {
      const relevant = questProgress.filter(r =>
        dim.questStageIds.includes(r.stage as never)
      );
      if (relevant.length > 0) {
        const avgStars = relevant.reduce((acc, r) => acc + (r.stars ?? 0), 0) / relevant.length;
        questScore = avgStars / 3;
      }
    }

    const raw = skillScore * dim.skillWeight + questScore * dim.questWeight;
    const score = Math.round(raw * 100);

    return {
      key: dim.key,
      label: dim.label,
      color: dim.color,
      score,
    };
  });
}
