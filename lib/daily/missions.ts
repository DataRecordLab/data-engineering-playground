export interface MissionDef {
  id: string;
  icon: string;
  title: string;
  desc: string;
  xp: number;
}

const MISSION_POOL: MissionDef[] = [
  { id: 'stage_clear',     icon: '⚔️', title: 'ステージクリア',   desc: 'クエストのステージを1つクリアする',        xp: 50  },
  { id: 'star3_any',       icon: '⭐', title: '完璧な設計',       desc: 'いずれかのステージで★3評価を獲得する',     xp: 100 },
  { id: 'emergency_event', icon: '🚨', title: '緊急対応',         desc: '緊急イベントでトレードオフを判断する',      xp: 75  },
  { id: 'pipeline_design', icon: '🔧', title: 'パイプライン設計', desc: 'ステージでパイプラインを設計・実行する',     xp: 50  },
  { id: 'skill_lesson',    icon: '📚', title: 'スキルアップ',     desc: 'スキルパスのレッスンを1つ完了する',         xp: 50  },
  { id: 'daily_login',     icon: '🔥', title: '今日もログイン',   desc: '本日ログインしてストリークを継続する',       xp: 25  },
];

export function getTodayKey(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

function dateToSeed(dateStr: string): number {
  return dateStr.split('').reduce((acc, c) => (Math.imul(acc, 31) + c.charCodeAt(0)) | 0, 7);
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  let s = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = (s >>> 0) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getTodayMissions(): MissionDef[] {
  const today = getTodayKey();
  const seed = dateToSeed(today);
  const shuffled = seededShuffle(MISSION_POOL, seed);
  const top3 = shuffled.slice(0, 3);
  const hasLogin = top3.some(m => m.id === 'daily_login');
  if (hasLogin) return top3;
  const loginMission = MISSION_POOL.find(m => m.id === 'daily_login')!;
  return [top3[0], top3[1], loginMission];
}

export interface DailyProgress {
  date: string;
  completed: string[];
}

export function getDailyProgress(): DailyProgress {
  if (typeof window === 'undefined') return { date: getTodayKey(), completed: [] };
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(`daily-${today}`);
    if (raw) return JSON.parse(raw) as DailyProgress;
  } catch {}
  return { date: today, completed: [] };
}

export function completeDailyMission(missionId: string): { wasNew: boolean } {
  if (typeof window === 'undefined') return { wasNew: false };
  const progress = getDailyProgress();
  if (progress.completed.includes(missionId)) return { wasNew: false };
  progress.completed.push(missionId);
  localStorage.setItem(`daily-${getTodayKey()}`, JSON.stringify(progress));
  window.dispatchEvent(
    new CustomEvent('daily-mission-update', {
      detail: { missionId, completed: progress.completed },
    })
  );
  return { wasNew: true };
}

export function isMissionCompleted(missionId: string): boolean {
  return getDailyProgress().completed.includes(missionId);
}
