import { ALL_SECTIONS } from '@/lib/skills';
import { QUESTS } from '@/lib/scenarios';
import { ALL_DEBUG_SCENARIOS } from '@/lib/debug';
import type { QuestId } from '@/types';
import type { SkillProgressRow, StageProgressRow } from '@/lib/supabase/progress';

// ── 学習ロードマップ ─────────────────────────────────────────────────
// Quest / Skill / Lab を「Lv1〜5 の一本道のカリキュラム」として束ねる。
// 各レベルは「終えると何ができるようになるか（goal）」を必ず持つ

export type RoadmapItem =
  | { kind: 'skill'; sectionId: string; lessonIds: string[] }
  | { kind: 'quest'; questId: QuestId }
  | { kind: 'debug'; scenarioIds: string[] }
  | { kind: 'lab'; href: string; label: string; description: string }
  | { kind: 'coming_soon'; label: string; description: string };

export interface RoadmapLevel {
  level: number;
  title: string;
  goal: string;
  concepts: string[];
  accent: string;
  items: RoadmapItem[];
}

function lessonsOf(sectionId: string, only?: string[]): RoadmapItem {
  const section = ALL_SECTIONS.find(s => s.id === sectionId);
  const ids = section?.lessons.map(l => l.id) ?? [];
  return { kind: 'skill', sectionId, lessonIds: only ? ids.filter(id => only.includes(id)) : ids };
}

export const ROADMAP: RoadmapLevel[] = [
  {
    level: 1,
    title: 'パイプラインの全体像',
    goal: 'Source → Staging → Warehouse → Mart の役割を説明し、シンプルなパイプラインを設計できる',
    concepts: ['4層構造', 'ELT vs ETL', '命名規則', '依存関係'],
    accent: '#818CF8',
    items: [
      lessonsOf('pipeline-basics'),
      { kind: 'quest', questId: 'ec-site' },
      { kind: 'lab', href: '/dag', label: 'DAG Lab', description: '依存関係と実行順序を動かして確かめる' },
    ],
  },
  {
    level: 2,
    title: 'データ品質',
    goal: '汚れたデータを見て、どの層で・何を・なぜ直すのかを判断できる',
    concepts: ['品質の6次元', 'NULL', '型変換', '表記揺れ', 'タイムゾーン'],
    accent: '#34D399',
    items: [
      lessonsOf('data-quality'),
      { kind: 'debug', scenarioIds: ['null-trap', 'case-chaos', 'type-mismatch', 'timezone-trap'] },
      { kind: 'coming_soon', label: 'データテスト', description: 'not_null / unique / relationships をパイプラインに組み込む' },
    ],
  },
  {
    level: 3,
    title: 'データモデリング',
    goal: '要件から粒度を決め、fact / dim のスタースキーマを設計できる',
    concepts: ['スタースキーマ', 'fact / dim', '粒度', 'ファンアウト'],
    accent: '#F87171',
    items: [
      lessonsOf('data-modeling'),
      { kind: 'quest', questId: 'saas' },
      { kind: 'debug', scenarioIds: ['fanout-explosion'] },
      { kind: 'lab', href: '/dbt', label: 'dbt Simulator', description: 'モデルの ref 依存を組み立てる' },
      { kind: 'lab', href: '/lineage', label: 'Lineage', description: 'カラムがどこから来たかを辿る' },
      { kind: 'coming_soon', label: 'SCD Type 2 とサロゲートキー', description: '変化するディメンションの履歴を持つ' },
    ],
  },
  {
    level: 4,
    title: '運用と信頼性',
    goal: '再実行しても壊れない・止まっても復旧できるパイプラインを設計できる',
    concepts: ['冪等性', '増分処理', 'スキーマ変更', 'ウォーターマーク'],
    accent: '#06B6D4',
    items: [
      lessonsOf('arch-decisions', ['reliability', 'schema-evolution']),
      { kind: 'quest', questId: 'medical' },
      { kind: 'debug', scenarioIds: ['duplicate-explosion', 'incremental-bug', 'schema-drift'] },
      { kind: 'lab', href: '/incremental', label: 'Incremental Lab', description: 'フル更新と増分更新の違いを体験する' },
      { kind: 'coming_soon', label: 'バックフィルと監視', description: '欠損期間の再処理・データ鮮度 SLA・アラート設計' },
    ],
  },
  {
    level: 5,
    title: 'アーキテクチャ判断',
    goal: '要件に応じて技術とアーキテクチャを選び、トレードオフを言葉で説明できる',
    concepts: ['バッチ vs ストリーミング', 'パーティション', 'ツール選定', 'コスト'],
    accent: '#F59E0B',
    items: [
      lessonsOf('tool-selection'),
      lessonsOf('arch-decisions', ['batch-vs-streaming', 'partition-design', 'cost-optimization']),
      { kind: 'quest', questId: 'finance' },
      { kind: 'coming_soon', label: 'CDC・レイクハウス・ガバナンス', description: '変更データ取得 / Iceberg / PII と権限設計' },
    ],
  },
];

// ── 進捗計算 ─────────────────────────────────────────────────────────

export interface ItemProgress {
  done: number;
  total: number;
}

export interface RoadmapProgress {
  skillDone: Set<string>;     // `${sectionId}/${lessonId}`
  questStagesDone: Set<string>; // `${questId}/${stageId}`
  debugDone: Set<string>;
}

export function buildRoadmapProgress(skills: SkillProgressRow[], stages: StageProgressRow[]): RoadmapProgress {
  const completed = stages.filter(r => r.status === 'completed');
  return {
    skillDone: new Set(skills.map(r => `${r.section_id}/${r.lesson_id}`)),
    questStagesDone: new Set(completed.filter(r => r.quest_id !== 'debug').map(r => `${r.quest_id}/${r.stage}`)),
    debugDone: new Set(completed.filter(r => r.quest_id === 'debug').map(r => r.stage)),
  };
}

// Lab と準備中の項目は進捗を記録していないので null（達成率の分母に含めない）
export function itemProgress(item: RoadmapItem, p: RoadmapProgress): ItemProgress | null {
  switch (item.kind) {
    case 'skill':
      return {
        done: item.lessonIds.filter(id => p.skillDone.has(`${item.sectionId}/${id}`)).length,
        total: item.lessonIds.length,
      };
    case 'quest': {
      const stages = QUESTS[item.questId].stages;
      return { done: stages.filter(s => p.questStagesDone.has(`${item.questId}/${s.id}`)).length, total: stages.length };
    }
    case 'debug':
      return { done: item.scenarioIds.filter(id => p.debugDone.has(id)).length, total: item.scenarioIds.length };
    default:
      return null;
  }
}

export function levelProgress(level: RoadmapLevel, p: RoadmapProgress): ItemProgress {
  return level.items.reduce<ItemProgress>(
    (acc, item) => {
      const ip = itemProgress(item, p);
      return ip ? { done: acc.done + ip.done, total: acc.total + ip.total } : acc;
    },
    { done: 0, total: 0 }
  );
}

export function debugTitle(id: string): string {
  return ALL_DEBUG_SCENARIOS.find(s => s.id === id)?.title ?? id;
}
