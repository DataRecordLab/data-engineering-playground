import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { data } = await supabase
    .from('users')
    .select('total_xp, character_config, display_name, level')
    .eq('id', user.id)
    .single();

  const config = (data?.character_config as Record<string, unknown>) ?? {};
  const purchasedItems = Array.isArray(config.purchased_items)
    ? (config.purchased_items as string[])
    : [];

  return NextResponse.json({
    xp:             data?.total_xp ?? 0,
    purchasedItems,
    displayName:    data?.display_name ?? '',
    level:          data?.level ?? 1,
  });
}
