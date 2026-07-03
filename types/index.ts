// Phase 0 — Pipeline Node Data Types

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  error: string | null;
}

export interface CsvSourceNodeData {
  label: string;
  csvContent: string;
  tableName: string;
  rowCount: number;
  columns: string[];
}

export interface FilterNodeData {
  label: string;
  condition: string;
}

export interface AggregateNodeData {
  label: string;
  groupBy: string;
  aggregateExpr: string;
}

export interface TableOutputNodeData {
  label: string;
  result: QueryResult | null;
  status: 'idle' | 'running' | 'done' | 'error';
}

// Phase 1+ — Quest / Stage Types

export type QuestId = 'ec-site' | 'saas' | 'medical' | 'finance';
export type StageId = 'opening' | 'pipeline' | 'source' | 'staging' | 'warehouse' | 'mart';
export type StageType = 'pipeline' | 'transform';
export type StageStatus = 'locked' | 'in_progress' | 'completed';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type GameType = 'rpg' | 'stage_clear' | 'simulation' | 'boss' | 'decision';

export interface PipelineLayerConfig {
  id: string;
  label: string;
  description: string;
  color: string;
  tables: string[];
  x: number;
  y: number;
}

export interface Quest {
  id: QuestId;
  title: string;
  clientName: string;
  difficulty: Difficulty;
  description: string;
  storyText: string;
  estimatedMinutes: number;
  requiredLevel: number;
  tags: string[];
  deConceptsCovered: string[];
  stages: Stage[];
  csvFiles: CsvFile[];
}

export interface Stage {
  id: StageId;
  type?: StageType;
  title: string;
  gameType: GameType;
  conceptTaught: string;
  missionText: string;
  hintText: string;
  storyMessage?: string;
  initialTransform?: string;
  validation: ValidationRule[];
  xpReward: { star1: number; star2: number; star3: number };
  badgeId?: string;
  pipelineConfig?: {
    layers: PipelineLayerConfig[];
    requiredConnections: Array<{ from: string; to: string }>;
  };
}

export interface PipelineNode {
  id: string;
  layer: StageId;
  label: string;
  description: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  tables: string[];
}

export interface CsvFile {
  name: string;
  content: string;
}

export interface UserProgress {
  questId: QuestId;
  stageId: StageId;
  status: StageStatus;
  stars: number;
  pipelineDesign?: PipelineNode[];
  xpEarned: number;
  completedAt?: string;
}

export interface ValidationRule {
  type: 'table_exists' | 'row_count' | 'column_exists' | 'column_type' | 'no_nulls' | 'custom';
  table?: string;
  column?: string;
  expected?: unknown;
  sql?: string;
  message: string;
}

// Character Customization

export type HairStyle = 'short' | 'flat' | 'spiky' | 'long';
export type OutfitStyle = 'hoodie' | 'tee' | 'jacket' | 'suit';
export type GlassesStyle = 'round' | 'square' | 'none';
export type JobTitle = 'Data Engineer' | 'Analytics Engineer' | 'Data Scientist' | 'Data Architect';

export interface CharacterConfig {
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  outfitStyle: OutfitStyle;
  outfitColor: string;
  hasGlasses: boolean;
  glassesColor: string;
  jobTitle: JobTitle;
}

export const DEFAULT_CHARACTER_CONFIG: CharacterConfig = {
  skinTone: '#F5CBA7',
  hairStyle: 'short',
  hairColor: '#2C1A0E',
  outfitStyle: 'hoodie',
  outfitColor: '#4A90D9',
  hasGlasses: false,
  glassesColor: '#93C5FD',
  jobTitle: 'Data Engineer',
};

export const PRESET_CHARACTERS: { name: string; config: CharacterConfig }[] = [
  {
    name: 'Classic Engineer',
    config: {
      skinTone: '#F5CBA7', hairStyle: 'short', hairColor: '#2C1A0E',
      outfitStyle: 'hoodie', outfitColor: '#4A90D9',
      hasGlasses: false, glassesColor: '#93C5FD', jobTitle: 'Data Engineer',
    },
  },
  {
    name: 'Night Hacker',
    config: {
      skinTone: '#8D5524', hairStyle: 'spiky', hairColor: '#E5E7EB',
      outfitStyle: 'hoodie', outfitColor: '#1F2937',
      hasGlasses: true, glassesColor: '#6EE7B7', jobTitle: 'Data Engineer',
    },
  },
  {
    name: 'Data Scientist',
    config: {
      skinTone: '#FDDCB0', hairStyle: 'flat', hairColor: '#92400E',
      outfitStyle: 'jacket', outfitColor: '#065F46',
      hasGlasses: true, glassesColor: '#93C5FD', jobTitle: 'Data Scientist',
    },
  },
];

// ── Skills (Duolingo-style) ──────────────────────────────────────────

export type SkillQuestionType = 'multiple_choice' | 'true_false' | 'ordering' | 'fill_blank';

interface BaseQuestion {
  id: string;
  type: SkillQuestionType;
  question: string;
  explanation: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple_choice';
  options: { label: string; correct: boolean }[];
}

export interface TrueFalseQuestion extends BaseQuestion {
  type: 'true_false';
  correct: boolean;
}

export interface OrderingQuestion extends BaseQuestion {
  type: 'ordering';
  items: string[];
  correctOrder: number[];
}

export interface FillBlankQuestion extends BaseQuestion {
  type: 'fill_blank';
  answer: string;
  acceptedAnswers?: string[];
  placeholder?: string;
}

export type SkillQuestion = MultipleChoiceQuestion | TrueFalseQuestion | OrderingQuestion | FillBlankQuestion;

export interface SkillLesson {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  questions: SkillQuestion[];
}

export interface SkillSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  accent: string;
  bg: string;
  lessons: SkillLesson[];
  upsell?: {
    questId: QuestId;
    message: string;
    label: string;
  };
}

// ── Debug Game ───────────────────────────────────────────────────────

export type DebugCategory =
  | 'data_quality'
  | 'pipeline_design'
  | 'schema_drift'
  | 'timezone'
  | 'environment';

export type DebugDifficulty = 'beginner' | 'intermediate' | 'advanced';
export type DebugPhase = 'alert' | 'investigate' | 'diagnose' | 'fix' | 'verify' | 'debrief';

export interface DebugHint {
  id: string;
  label: string;
  sql: string;
}

export interface DebugDiagnosisOption {
  id: string;
  label: string;
  correct: boolean;
  explanation: string;
}

export interface DebugFixOption {
  id: string;
  label: string;
  sqlPreview: string;
  correct: boolean;
  explanation: string;
  fixSQL: string;
}

export interface DebugScenario {
  id: string;
  title: string;
  subtitle: string;
  category: DebugCategory;
  difficulty: DebugDifficulty;
  xpReward: number;
  alert: {
    from: string;
    role: string;
    message: string;
    metric: string;
    expectedValue: string;
    actualValue: string;
    timestamp: string;
  };
  setupSQL: string;
  availableTables: string[];
  investigationHints: DebugHint[];
  diagnosisQuestion: string;
  diagnosisOptions: DebugDiagnosisOption[];
  fixQuestion: string;
  fixOptions: DebugFixOption[];
  verificationSQL: string;
  verificationExpectedDescription: string;
  lesson: {
    title: string;
    body: string;
    prevention: string[];
    realWorldExample: string;
  };
}

// User / Auth

export type UserPlan = 'free' | 'pro' | 'team';

export interface UserProfile {
  id: string;
  displayName: string;
  plan: UserPlan;
  level: number;
  totalXp: number;
  characterConfig: CharacterConfig;
  onboardingDone: boolean;
}
