import { QUESTS } from '@/lib/scenarios';
import { ALL_SECTIONS } from '@/lib/skills';
import { SITE_HASHTAGS } from '@/lib/site';
import type { QuestId } from '@/types';

// ── シェアカード ──────────────────────────────────────────────────────
// URL パラメータはユーザーが自由に書き換えられるため、
// カードに載せる文字列は必ず既知のクエスト/レッスン定義から引く（任意文字列を描画しない）

export type ShareKind = 'quest' | 'skill';

export interface ShareCardData {
  eyebrow: string;
  title: string;
  subtitle: string;
  stars: number;
  accent: string;
  shareText: string;
}

export interface ShareQuery {
  stage?: string;
  lesson?: string;
  stars?: string;
}

const QUEST_ACCENT: Record<QuestId, string> = {
  'ec-site': '#F97316',
  saas: '#A855F7',
  medical: '#3B82F6',
  finance: '#EAB308',
};

function parseStars(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 3 ? n : 1;
}

function starText(stars: number): string {
  return '★'.repeat(stars) + '☆'.repeat(3 - stars);
}

export function resolveShareCard(kind: string, id: string, query: ShareQuery): ShareCardData | null {
  const stars = parseStars(query.stars);

  if (kind === 'quest') {
    const quest = QUESTS[id as QuestId];
    if (!quest) return null;
    const stage = quest.stages.find(s => s.id === query.stage);
    const lastStage = quest.stages[quest.stages.length - 1];
    if (!stage || stage.id === lastStage.id) {
      return {
        eyebrow: 'QUEST COMPLETE',
        title: quest.title,
        subtitle: `${quest.clientName} のデータ基盤を構築しました`,
        stars,
        accent: QUEST_ACCENT[quest.id],
        shareText: `Modelionのクエスト「${quest.title}」を${starText(stars)}でクリア！\nパイプラインを設計してデータ基盤を作りました。`,
      };
    }
    return {
      eyebrow: 'QUEST · STAGE CLEAR',
      title: quest.title,
      subtitle: `${stage.title} — ${stage.conceptTaught}`,
      stars,
      accent: QUEST_ACCENT[quest.id],
      shareText: `Modelionのクエスト「${quest.title}」で ${stage.title} を${starText(stars)}でクリア！`,
    };
  }

  if (kind === 'skill') {
    const section = ALL_SECTIONS.find(s => s.id === id);
    const lesson = section?.lessons.find(l => l.id === query.lesson);
    if (!section || !lesson) return null;
    return {
      eyebrow: `SKILL · ${section.title}`,
      title: lesson.title,
      subtitle: lesson.description,
      stars,
      accent: section.accent,
      shareText: `Modelionで「${lesson.title}」を${starText(stars)}でマスター！`,
    };
  }

  return null;
}

function toQueryString(query: ShareQuery): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v) params.set(k, v);
  return params.toString();
}

export function buildSharePath(kind: ShareKind, id: string, query: ShareQuery): string {
  return `/share/${kind}/${id}?${toQueryString(query)}`;
}

export function buildOgImagePath(kind: ShareKind, id: string, query: ShareQuery): string {
  return `/api/og/${kind}/${encodeURIComponent(id)}?${toQueryString(query)}`;
}

export function buildXIntentUrl(text: string, url: string): string {
  const params = new URLSearchParams({
    text,
    url,
    hashtags: SITE_HASHTAGS.join(','),
  });
  return `https://x.com/intent/post?${params.toString()}`;
}
