import { EC_SITE_QUEST } from './ec-site';
import type { Quest, QuestId } from '@/types';

export const QUESTS: Record<QuestId, Quest> = {
  'ec-site': EC_SITE_QUEST,
  'saas': { ...EC_SITE_QUEST, id: 'saas', title: '解約率を下げろ' }, // placeholder
  'medical': { ...EC_SITE_QUEST, id: 'medical', title: '患者データを守れ' }, // placeholder
  'finance': { ...EC_SITE_QUEST, id: 'finance', title: '金融リスクを計算せよ' }, // placeholder
};

export function getQuest(id: QuestId): Quest | null {
  return QUESTS[id] ?? null;
}
