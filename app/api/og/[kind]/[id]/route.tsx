import { renderOgCard } from '@/lib/og/card';
import { resolveShareCard } from '@/lib/share';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;
  const sp = new URL(request.url).searchParams;
  const card = resolveShareCard(kind, id, {
    stage: sp.get('stage') ?? undefined,
    lesson: sp.get('lesson') ?? undefined,
    stars: sp.get('stars') ?? undefined,
  });
  if (!card) return new Response('Not found', { status: 404 });

  return renderOgCard({
    ...card,
    headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800' },
  });
}
