'use client';

import { buildSharePath, buildXIntentUrl, resolveShareCard, type ShareKind, type ShareQuery } from '@/lib/share';

interface Props {
  kind: ShareKind;
  id: string;
  query: ShareQuery;
  className?: string;
}

export function ShareOnXButton({ kind, id, query, className = '' }: Props) {
  const card = resolveShareCard(kind, id, query);
  if (!card) return null;

  function open() {
    if (!card) return;
    const url = `${window.location.origin}${buildSharePath(kind, id, query)}`;
    window.open(buildXIntentUrl(card.shareText, url), '_blank', 'noopener,noreferrer');
  }

  return (
    <button
      type="button"
      onClick={open}
      className={`w-full py-3 rounded-xl font-bold text-sm bg-black border border-slate-700 hover:border-slate-500 text-white transition-colors flex items-center justify-center gap-2 ${className}`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      X でシェア
    </button>
  );
}
