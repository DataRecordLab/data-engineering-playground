import { EC_SITE_QUEST } from './ec-site';
import { SAAS_QUEST } from './saas';
import { MEDICAL_QUEST } from './medical';
import { FINANCE_QUEST } from './finance';
import type { Quest, QuestId } from '@/types';

export const QUESTS: Record<QuestId, Quest> = {
  'ec-site': EC_SITE_QUEST,
  'saas': SAAS_QUEST,
  'medical': MEDICAL_QUEST,
  'finance': FINANCE_QUEST,
};

export function getQuest(id: QuestId): Quest | null {
  return QUESTS[id] ?? null;
}
