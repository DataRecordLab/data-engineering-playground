'use client';

interface MemberStat {
  id: string;
  display_name: string | null;
  level: number;
  total_xp: number;
  plan: string;
  role: string;
  created_at: string;
  completedStages: number;
  totalStars: number;
  lastActivity: string | null;
}

interface Props {
  members: MemberStat[];
  orgName: string;
}

export function CsvExportButton({ members, orgName }: Props) {
  function handleExport() {
    const headers = ['名前', 'レベル', '総XP', 'クリアステージ数', '獲得★数', '最終活動日', 'プラン', '参加日'];
    const rows = members.map(m => [
      m.display_name ?? '未設定',
      m.level,
      m.total_xp ?? 0,
      m.completedStages,
      m.totalStars,
      m.lastActivity ? new Date(m.lastActivity).toLocaleDateString('ja-JP') : '未活動',
      m.plan,
      new Date(m.created_at).toLocaleDateString('ja-JP'),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const bom = '﻿'; // Excel用BOM
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${orgName}_受講者進捗_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors"
    >
      ↓ CSV出力
    </button>
  );
}
