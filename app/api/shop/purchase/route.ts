import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SHOP_ITEMS } from '@/lib/shop/items';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
  }

  const { itemId } = (await req.json()) as { itemId: string };
  const item = SHOP_ITEMS.find(i => i.id === itemId);
  if (!item) {
    return NextResponse.json({ error: 'アイテムが見つかりません' }, { status: 404 });
  }

  // Load user XP and owned items
  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('total_xp, character_config')
    .eq('id', user.id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: 'プロフィール取得に失敗しました' }, { status: 500 });
  }

  const currentXp = profile.total_xp ?? 0;
  const config = (profile.character_config ?? {}) as Record<string, unknown>;
  const ownedItems: string[] = Array.isArray(config.purchased_items)
    ? (config.purchased_items as string[])
    : [];

  if (ownedItems.includes(itemId)) {
    return NextResponse.json({ error: 'すでに所持しています' }, { status: 400 });
  }

  if (currentXp < item.price) {
    return NextResponse.json(
      { error: `XPが足りません（必要: ${item.price} / 所持: ${currentXp}）` },
      { status: 400 },
    );
  }

  // コスメアイテムはキャラ設定に即時反映
  const cosmeticPatch: Record<string, unknown> = {};
  if (itemId === 'outfit_hacker') {
    cosmeticPatch.outfitStyle = 'jacket';
    cosmeticPatch.outfitColor = '#312E81';
  } else if (itemId === 'outfit_matrix') {
    cosmeticPatch.outfitStyle = 'tee';
    cosmeticPatch.outfitColor = '#14532D';
  } else if (itemId === 'glasses_cyber') {
    cosmeticPatch.hasGlasses = true;
    cosmeticPatch.glassesColor = '#22D3EE';
  } else if (itemId === 'mio_gold') {
    cosmeticPatch.mio_skin = 'gold';
  }

  // Deduct XP and add item
  const { error: updateErr } = await supabase
    .from('users')
    .update({
      total_xp: currentXp - item.price,
      character_config: {
        ...config,
        ...cosmeticPatch,
        purchased_items: [...ownedItems, itemId],
      },
    })
    .eq('id', user.id);

  if (updateErr) {
    return NextResponse.json({ error: '購入に失敗しました' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    newXp: currentXp - item.price,
    item,
  });
}
