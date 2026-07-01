import { ALL_SECTIONS } from '@/lib/skills';

export type BadgeRarity = 'common' | 'rare' | 'epic';

// progress.ts からの循環依存を避けるため型をここで定義
export interface BadgeProgressItem {
  stars: number;
  xp_earned: number;
}
export interface BadgeSkillItem {
  section_id: string;
  lesson_id: string;
}
export interface BadgeCheckContext {
  questProgress: BadgeProgressItem[];
  skillProgress: BadgeSkillItem[];
  debugProgress: BadgeProgressItem[];
  totalXp: number;
  streakCount: number;
}

export interface BadgeDef {
  id: string;
  icon: string;
  label: string;
  desc: string;
  rarity: BadgeRarity;
  check: (ctx: BadgeCheckContext) => boolean;
}

export const BADGE_DEFS: BadgeDef[] = [
  // ── 参加 ─────────────────────────────────────────────────
  {
    id: 'welcome',
    icon: '🚀',
    label: 'DataCraftへようこそ',
    desc: 'DataCraftに参加した',
    rarity: 'common',
    check: () => true,
  },

  // ── クエスト ──────────────────────────────────────────────
  {
    id: 'first_stage',
    icon: '⚔️',
    label: '初陣',
    desc: 'クエストステージを初めてクリア',
    rarity: 'common',
    check: ({ questProgress }) => questProgress.length > 0,
  },
  {
    id: 'star3',
    icon: '★',
    label: '完璧な設計',
    desc: 'ステージを★3でクリア',
    rarity: 'rare',
    check: ({ questProgress }) => questProgress.some(p => p.stars === 3),
  },
  {
    id: 'all_stages',
    icon: '🏆',
    label: 'クエスト完遂',
    desc: '4ステージ以上クリア',
    rarity: 'epic',
    check: ({ questProgress }) => questProgress.length >= 4,
  },

  // ── スキルパス ────────────────────────────────────────────
  {
    id: 'first_lesson',
    icon: '📚',
    label: '学習開始',
    desc: 'スキルパスのレッスンを初めて完了',
    rarity: 'common',
    check: ({ skillProgress }) => skillProgress.length > 0,
  },
  {
    id: 'section_master',
    icon: '🎓',
    label: 'セクション制覇',
    desc: 'スキルパスのセクションを全レッスン完了',
    rarity: 'rare',
    check: ({ skillProgress }) => {
      const done = new Set(skillProgress.map(p => `${p.section_id}/${p.lesson_id}`));
      return ALL_SECTIONS.some(sec =>
        sec.lessons.every(l => done.has(`${sec.id}/${l.id}`))
      );
    },
  },

  // ── Debug Lab ─────────────────────────────────────────────
  {
    id: 'first_debug',
    icon: '🔍',
    label: 'デバッガー',
    desc: 'Debug Labシナリオを初めて完了',
    rarity: 'common',
    check: ({ debugProgress }) => debugProgress.length > 0,
  },
  {
    id: 'debug_master',
    icon: '🛠️',
    label: 'インシデントマスター',
    desc: 'Debug Labを5つ以上完了',
    rarity: 'epic',
    check: ({ debugProgress }) => debugProgress.length >= 5,
  },

  // ── ストリーク ─────────────────────────────────────────────
  {
    id: 'streak_3',
    icon: '🔥',
    label: '3日連続',
    desc: '3日間連続でアクティブ',
    rarity: 'common',
    check: ({ streakCount }) => streakCount >= 3,
  },
  {
    id: 'streak_7',
    icon: '🔥',
    label: '1週間連続',
    desc: '7日間連続でアクティブ',
    rarity: 'rare',
    check: ({ streakCount }) => streakCount >= 7,
  },

  // ── XP ───────────────────────────────────────────────────
  {
    id: 'xp_500',
    icon: '⭐',
    label: 'XP 500',
    desc: 'XPを500以上獲得',
    rarity: 'common',
    check: ({ totalXp }) => totalXp >= 500,
  },
  {
    id: 'xp_2000',
    icon: '💎',
    label: 'XP 2000',
    desc: 'XPを2000以上獲得',
    rarity: 'epic',
    check: ({ totalXp }) => totalXp >= 2000,
  },
];

export const RARITY_STYLES: Record<BadgeRarity, { border: string; bg: string; text: string }> = {
  common: { border: 'border-slate-600/60', bg: 'bg-slate-800/60',  text: 'text-slate-400' },
  rare:   { border: 'border-blue-500/50',  bg: 'bg-blue-500/10',   text: 'text-blue-400'  },
  epic:   { border: 'border-purple-500/50',bg: 'bg-purple-500/10', text: 'text-purple-400' },
};

export function getBadgeDef(id: string): BadgeDef | undefined {
  return BADGE_DEFS.find(b => b.id === id);
}
