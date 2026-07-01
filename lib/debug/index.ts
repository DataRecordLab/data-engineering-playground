import type { DebugScenario } from '@/types';
import { nullTrapScenario } from './scenarios/null-trap';
import { duplicateExplosionScenario } from './scenarios/duplicate-explosion';
import { caseChaosScenario } from './scenarios/case-chaos';
import { schemaDriftScenario } from './scenarios/schema-drift';
import { typeMismatchScenario } from './scenarios/type-mismatch';
import { timezoneTrapScenario } from './scenarios/timezone-trap';
import { incrementalBugScenario } from './scenarios/incremental-bug';
import { fanoutExplosionScenario } from './scenarios/fanout-explosion';

export const ALL_DEBUG_SCENARIOS: DebugScenario[] = [
  nullTrapScenario,
  duplicateExplosionScenario,
  caseChaosScenario,
  schemaDriftScenario,
  typeMismatchScenario,
  timezoneTrapScenario,
  incrementalBugScenario,
  fanoutExplosionScenario,
];

export function getDebugScenario(id: string): DebugScenario | undefined {
  return ALL_DEBUG_SCENARIOS.find(s => s.id === id);
}

export const CATEGORY_LABELS: Record<string, string> = {
  data_quality: 'データ品質',
  pipeline_design: 'パイプライン設計',
  schema_drift: 'スキーマドリフト',
  timezone: 'タイムゾーン',
  environment: '環境・権限',
};

export const CATEGORY_COLORS: Record<string, string> = {
  data_quality: '#F87171',
  pipeline_design: '#60A5FA',
  schema_drift: '#A78BFA',
  timezone: '#34D399',
  environment: '#FBBF24',
};
