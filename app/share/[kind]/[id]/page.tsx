import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { buildOgImagePath, resolveShareCard, type ShareKind, type ShareQuery } from '@/lib/share';
import { SITE_TAGLINE } from '@/lib/site';

interface Props {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<ShareQuery>;
}

function pickQuery(sp: ShareQuery): ShareQuery {
  // 配列で渡された場合などは無視して、既知のキーだけを文字列として拾う
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  return { stage: str(sp.stage), lesson: str(sp.lesson), stars: str(sp.stars) };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { kind, id } = await params;
  const query = pickQuery(await searchParams);
  const card = resolveShareCard(kind, id, query);
  if (!card) return {};

  const title = `${card.title}（${card.eyebrow}）`;
  const image = buildOgImagePath(kind as ShareKind, id, query);
  return {
    title,
    description: card.subtitle,
    openGraph: { title, description: card.subtitle, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description: card.subtitle, images: [image] },
  };
}

export default async function SharePage({ params, searchParams }: Props) {
  const { kind, id } = await params;
  const query = pickQuery(await searchParams);
  const card = resolveShareCard(kind, id, query);
  if (!card) notFound();

  return (
    <main className="min-h-screen bg-[#080918] text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-8 text-center">
        <div
          className="rounded-2xl border px-6 py-8 space-y-3"
          style={{ borderColor: `${card.accent}55`, background: 'linear-gradient(135deg, #0c0c28, #140a2a)' }}
        >
          <p className="text-xs font-mono tracking-widest" style={{ color: card.accent }}>{card.eyebrow}</p>
          <h1 className="text-2xl sm:text-3xl font-black leading-snug">{card.title}</h1>
          <p className="text-slate-400 text-sm leading-relaxed">{card.subtitle}</p>
          <p className="text-4xl tracking-widest text-yellow-400">
            {'★'.repeat(card.stars)}
            <span className="text-slate-700">{'★'.repeat(3 - card.stars)}</span>
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-slate-300 font-bold">{SITE_TAGLINE}</p>
          <p className="text-slate-500 text-sm leading-relaxed">
            SQL を暗記するのではなく、Source → Staging → Warehouse → Mart のパイプラインを
            自分で設計しながらデータエンジニアリングを学べます。
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/start"
            className="px-6 py-3.5 rounded-xl font-black text-sm bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            無料で挑戦してみる →
          </Link>
          <Link
            href="/roadmap"
            className="px-6 py-3.5 rounded-xl font-bold text-sm border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            学習ロードマップを見る
          </Link>
        </div>
      </div>
    </main>
  );
}
