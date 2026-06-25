import { EC_SITE_QUEST } from './ec-site';
import { SAAS_QUEST } from './saas';
import type { Quest, QuestId } from '@/types';

export const QUESTS: Record<QuestId, Quest> = {
  'ec-site': EC_SITE_QUEST,
  'saas': SAAS_QUEST,
  'medical': { ...EC_SITE_QUEST, id: 'medical', title: '患者データを守れ' }, // placeholder
  'finance': { ...EC_SITE_QUEST, id: 'finance', title: '金融リスクを計算せよ' }, // placeholder
};

export function getQuest(id: QuestId): Quest | null {
  return QUESTS[id] ?? null;
}
