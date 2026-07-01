'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuest } from '@/lib/scenarios';
import { CharacterDialog } from '@/components/characters/CharacterDialog';
import type { DialogLine } from '@/components/characters/CharacterDialog';
import type { QuestId } from '@/types';

function parseCsvPreview(csv: string, maxRows = 3) {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  const rows = lines.slice(1, maxRows + 1).map(line => line.split(','));
  const totalRows = lines.length - 1;
  return { headers, rows, totalRows };
}

// Dialog lines for ec-site quest
function buildDialogLines(questId: string): DialogLine[] {
  if (questId === 'ec-site') {
    return [
      {
        character: 'tamura',
        expression: 'worried',
        name: '田村 誠',
        role: 'ShopNow CEO',
        text: 'DataCraft Agencyさん、緊急のお願いがあります。先月から売上の集計が全くできていない状態です。',
        side: 'left',
      },
      {
        character: 'tamura',
        expression: 'worried',
        name: '田村 誠',
        role: 'ShopNow CEO',
        text: 'Shopifyのデータ、CRMのデータ、在庫システムのデータ——バラバラなシステムにデータが散在していて、集計すると毎回数字が合わない。',
        side: 'left',
      },
      {
        character: 'tamura',
        expression: 'worried',
        name: '田村 誠',
        role: 'ShopNow CEO',
        text: '先週の経営会議では「売上が出せない」と言わざるを得ませんでした。来月の経営会議まであと2週間。なんとかしてほしいのです。',
        side: 'left',
      },
      {
        character: 'tanaka',
        expression: 'neutral',
        name: '田中 貢',
        role: 'Senior Data Engineer',
        text: '3つのCSVを受け取った。まずデータを見て、何が問題かを理解しろ。',
        side: 'right',
      },
      {
        character: 'tanaka',
        expression: 'stern',
        name: '田中 貢',
        role: 'Senior Data Engineer',
        text: 'Source → Staging → Warehouse → Mart。パイプラインを一層ずつ確実に設計する。急ぐな。',
        side: 'right',
      },
    ];
  }
  return [];
}

export default function QuestOpeningPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.questId as QuestId;
  const quest = getQuest(questId);

  const [dialogDone, setDialogDone] = useState(false);
  const [showDialog, setShowDialog] = useState(true);

  if (!quest) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
        クエストが見つかりません
      </div>
    );
  }

  const dialogLines = buildDialogLines(questId);
  const firstStage = quest.stages[0];

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Background scene: night district */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to bottom, #050914 0%, #0A1628 60%, #0F172A 100%)',
        }}
      />
      {/* Ambient glow at center */}
      <div
        className="absolute inset-x-0 top-0 h-1/2 pointer-events-none opacity-20"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, #F59E0B 0%, transparent 60%)',
        }}
      />

      <div className="relative">
        {/* Header */}
        <header className="flex items-center gap-3 px-8 py-4 border-b border-slate-800/60">
          <Link href="/dashboard" className="text-slate-500 hover:text-white text-sm transition-colors">
            ← ダッシュボード
          </Link>
          <span className="text-slate-700">/</span>
          <span className="text-slate-400 text-sm">{quest.clientName}</span>
        </header>

        <main className={`max-w-4xl mx-auto px-8 py-10 space-y-8 transition-opacity duration-500 ${showDialog && !dialogDone ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          {/* Quest intro badge */}
          <div>
            <span className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
              🛒 {quest.clientName} — {quest.title}
            </span>
          </div>

          {/* CSV data received */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              受け取ったデータ（{quest.csvFiles.length} ファイル）
            </h2>
            <div className="space-y-3">
              {quest.csvFiles.map(csv => {
                const preview = parseCsvPreview(csv.content, 3);
                return (
                  <div key={csv.name} className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-800/60 flex items-center gap-2 border-b border-slate-800">
                      <span className="text-green-400 text-xs">📄</span>
                      <span className="text-slate-200 text-sm font-mono">{csv.name}.csv</span>
                      <span className="ml-auto text-slate-600 text-xs">{preview.totalRows} 行</span>
                    </div>
                    <div className="overflow-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800">
                            {preview.headers.map(h => (
                              <th key={h} className="px-3 py-2 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.rows.map((row, i) => (
                            <tr key={i} className="border-b border-slate-900/80">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-1.5 text-slate-400 font-mono whitespace-nowrap">{cell}</td>
                              ))}
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={preview.headers.length} className="px-3 py-2 text-slate-700 text-center">···</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Concepts */}
          <div>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              このクエストで体験すること
            </h2>
            <div className="flex flex-wrap gap-2">
              {quest.deConceptsCovered.map(concept => (
                <span key={concept} className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs">
                  {concept}
                </span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="pt-6 border-t border-slate-800 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Canvas Mode — new unified experience */}
              <Link
                href={`/pipeline/${questId}`}
                className="group relative flex flex-col gap-2 rounded-2xl border-2 border-blue-500/40 bg-blue-500/8 hover:bg-blue-500/14 hover:border-blue-500/60 px-5 py-4 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">🗺️</span>
                  <span className="text-white font-black text-sm">キャンバスモード</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/30 text-blue-300 border border-blue-500/30">NEW</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  全4レイヤーを1つのキャンバスで設計・実装。<br/>ノードをクリックしてパイプラインを構築。
                </p>
                <div className="flex items-center gap-1 text-blue-400 text-xs font-bold group-hover:translate-x-0.5 transition-transform">
                  キャンバスで始める →
                </div>
              </Link>

              {/* Classic Mode */}
              <Link
                href={`/quest/${questId}/${firstStage.id}`}
                className="flex flex-col gap-2 rounded-2xl border border-slate-700 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-600 px-5 py-4 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚔️</span>
                  <span className="text-white font-semibold text-sm">クラシックモード</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  ステージを一つずつ攻略。<br/>設計クイズ → SQL実装を順番に進める。
                </p>
                <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                  ステップで始める →
                </div>
              </Link>
            </div>
            <p className="text-center text-slate-700 text-[10px]">どちらのモードでも XP・バッジは同じく獲得できます</p>
          </div>
        </main>
      </div>

      {/* Character Dialog — shown first, then dismissed */}
      {showDialog && !dialogDone && dialogLines.length > 0 && (
        <CharacterDialog
          lines={dialogLines}
          onComplete={() => {
            setDialogDone(true);
            setShowDialog(false);
          }}
        />
      )}

      {/* Re-show dialog button */}
      {dialogDone && (
        <button
          onClick={() => { setDialogDone(false); setShowDialog(true); }}
          className="fixed bottom-4 right-4 text-xs text-slate-600 hover:text-slate-400 transition-colors border border-slate-800 px-3 py-1.5 rounded-lg"
        >
          ↩ ストーリーを再生
        </button>
      )}
    </div>
  );
}
