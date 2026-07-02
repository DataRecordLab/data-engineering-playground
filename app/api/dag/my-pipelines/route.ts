import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildDagFromQuest } from '@/lib/dag/fromPipeline';
import type { DagScenario } from '@/lib/dag';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ scenarios: [] });

  const { data: rows } = await supabase
    .from('user_progress')
    .select('quest_id, stage, status')
    .eq('user_id', user.id)
    .eq('status', 'completed');

  if (!rows || rows.length === 0) return NextResponse.json({ scenarios: [] });

  // Group completed stages by quest
  const byQuest = new Map<string, string[]>();
  for (const row of rows) {
    const stages = byQuest.get(row.quest_id) ?? [];
    if (!stages.includes(row.stage)) stages.push(row.stage);
    byQuest.set(row.quest_id, stages);
  }

  const scenarios: DagScenario[] = [];
  for (const [questId, stages] of byQuest) {
    const scenario = buildDagFromQuest(questId, stages);
    if (scenario) scenarios.push(scenario);
  }

  return NextResponse.json({ scenarios });
}
