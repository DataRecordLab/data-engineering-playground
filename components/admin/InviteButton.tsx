'use client';

import { useState } from 'react';

interface Props {
  orgId: string;
  orgName: string;
  variant?: 'default' | 'outlined';
}

export function InviteButton({ orgId, orgName, variant = 'default' }: Props) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const url = `${window.location.origin}/signup?team=${orgId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  if (variant === 'outlined') {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-xs text-slate-400 max-w-md w-full">
          <span className="text-slate-600 flex-shrink-0">🔗</span>
          <span className="truncate">
            {typeof window !== 'undefined' ? window.location.origin : ''}/signup?team={orgId}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
            copied
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'
          }`}
        >
          {copied ? '✓ コピーしました！' : '招待リンクをコピー'}
        </button>
        <p className="text-[10px] text-slate-600">
          このリンクから登録すると「{orgName}」に自動で参加されます
        </p>
      </div>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
        copied
          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
          : 'border border-indigo-500/40 hover:border-indigo-500 text-indigo-400 hover:text-indigo-300'
      }`}
    >
      {copied ? '✓ コピー済み' : '🔗 招待リンクをコピー'}
    </button>
  );
}
