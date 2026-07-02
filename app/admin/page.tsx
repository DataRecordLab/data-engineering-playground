import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CsvExportButton } from '@/components/admin/CsvExportButton';
import { InviteButton } from '@/components/admin/InviteButton';

// ── 型 ────────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  display_name: string | null;
  level: number;
  total_xp: number;
  plan: string;
  role: string;
  created_at: string;
}

interface ProgressRow {
  user_id: string;
  quest_id: string;
  stage: string;
  status: string;
  stars: number;
  xp_earned: number;
  updated_at: string | null;
}

// ── ユーティリティ ──────────────────────────────────────────────────────────────

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '未活動';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  if (days < 30) return `${Math.floor(days / 7)}週間前`;
  return `${Math.floor(days / 30)}ヶ月前`;
}

function activityColor(iso: string | null | undefined): string {
  if (!iso) return 'text-slate-700';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 3) return 'text-emerald-400';
  if (days <= 7) return 'text-yellow-400';
  return 'text-slate-500';
}

// ── ページ ────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  // ── 認証チェック ──
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ── adminクライアントで権限チェック ──
  const adminClient = createAdminClient();
  const { data: currentUser } = await adminClient
    .from('users')
    .select('role, organization_id, display_name')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['admin', 'owner'].includes(currentUser.role ?? '')) {
    redirect('/dashboard');
  }

  const orgId = currentUser.organization_id as string;

  // ── 組織名取得 ──
  const { data: org } = await adminClient
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single();

  // ── 組織メンバー取得 ──
  const { data: members } = await adminClient
    .from('users')
    .select('id, display_name, level, total_xp, plan, role, created_at')
    .eq('organization_id', orgId)
    .order('total_xp', { ascending: false });

  const memberList = (members ?? []) as UserRow[];
  const memberIds = memberList.map(m => m.id);

  // ── 進捗取得 ──
  const { data: progress } = memberIds.length > 0
    ? await adminClient
        .from('user_progress')
        .select('user_id, quest_id, stage, status, stars, xp_earned, updated_at')
        .in('user_id', memberIds)
    : { data: [] };

  const progressList = (progress ?? []) as ProgressRow[];

  // ── メンバー別統計 ──
  const memberStats = memberList.map(m => {
    const up = progressList.filter(p => p.user_id === m.id);
    const completed = up.filter(p => p.status === 'completed');
    const lastActivity = up
      .map(p => p.updated_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? null;
    return {
      ...m,
      completedStages: completed.length,
      totalStars: completed.reduce((s, p) => s + (p.stars ?? 0), 0),
      lastActivity,
    };
  });

  // ── サマリー統計 ──
  const totalMembers = memberStats.length;
  const avgXp = totalMembers
    ? Math.round(memberStats.reduce((s, m) => s + (m.total_xp ?? 0), 0) / totalMembers)
    : 0;
  const activeMembers = memberStats.filter(m => {
    if (!m.lastActivity) return false;
    return (Date.now() - new Date(m.lastActivity).getTime()) < 7 * 86400000;
  }).length;
  const totalCompletions = memberStats.reduce((s, m) => s + m.completedStages, 0);

  // ── クエスト別完了率 ──
  const QUEST_META: { id: string; label: string; icon: string; stages: number }[] = [
    { id: 'ec-site', label: 'ECサイト基盤（初級）', icon: '🛒', stages: 4 },
    { id: 'saas',    label: 'SaaS分析基盤（中級）', icon: '📊', stages: 4 },
  ];
  const questStats = QUEST_META.map(q => {
    const done = progressList.filter(p => p.quest_id === q.id && p.status === 'completed').length;
    const total = totalMembers * q.stages;
    return { ...q, done, total, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  const orgName = (org as { name?: string } | null)?.name ?? '組織';

  return (
    <div className="min-h-screen bg-[#070910] text-white">

      {/* ── ヘッダー ── */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
            ← ダッシュボード
          </Link>
          <div className="w-px h-4 bg-slate-800" />
          <span className="text-indigo-400 font-black text-lg">◈</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm">{orgName}</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                研修管理
              </span>
            </div>
            <p className="text-slate-500 text-xs">管理者: {currentUser.display_name ?? user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <InviteButton orgId={orgId} orgName={orgName} />
          <CsvExportButton members={memberStats} orgName={orgName} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">

        {/* ── サマリーカード ── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: '受講者数',       value: totalMembers,    unit: '名',  color: '#818CF8', icon: '👥' },
            { label: '平均 XP',        value: avgXp,           unit: 'XP',  color: '#FCD34D', icon: '⭐' },
            { label: '直近7日 活動者', value: activeMembers,   unit: '名',  color: '#34D399', icon: '🔥' },
            { label: 'ステージ完了数', value: totalCompletions, unit: '回', color: '#F87171', icon: '✓'  },
          ].map(s => (
            <div key={s.label} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{s.icon}</span>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
              <p className="text-3xl font-black" style={{ color: s.color }}>
                {s.value.toLocaleString()}
                <span className="text-xs text-slate-500 ml-1 font-normal">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* ── クエスト完了率 ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
          <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-4">クエスト別 完了率</p>
          <div className="space-y-4">
            {questStats.map(q => (
              <div key={q.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{q.icon}</span>
                    <span className="text-xs text-slate-300 font-semibold">{q.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500">{q.done}/{q.total} ステージ</span>
                    <span className="text-xs font-black" style={{ color: q.rate >= 70 ? '#34D399' : q.rate >= 40 ? '#FCD34D' : '#F87171' }}>
                      {q.rate}%
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${q.rate}%`,
                      background: q.rate >= 70 ? '#34D399' : q.rate >= 40 ? '#FCD34D' : '#F87171',
                    }}
                  />
                </div>
              </div>
            ))}
            {questStats.length === 0 && (
              <p className="text-slate-600 text-sm text-center py-4">進捗データがありません</p>
            )}
          </div>
        </div>

        {/* ── メンバーテーブル ── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">受講者一覧</p>
            <p className="text-[10px] text-slate-600">{totalMembers}名</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60">
                  {['#', '名前', 'Lv', 'XP', 'クリア数', '★合計', '最終活動', 'プラン'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] text-slate-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {memberStats.map((m, i) => (
                  <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 text-[10px] text-slate-600 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[9px] font-black text-indigo-300">
                          {(m.display_name ?? 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-200">{m.display_name ?? '未設定'}</p>
                          {m.role === 'admin' || m.role === 'owner' ? (
                            <span className="text-[8px] text-indigo-400 font-mono">管理者</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-black text-yellow-400">{m.level}</td>
                    <td className="px-4 py-3 text-xs text-slate-300 font-mono">{(m.total_xp ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, (m.completedStages / 8) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">{m.completedStages}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-yellow-400 font-mono">
                      {'★'.repeat(Math.min(3, m.totalStars))}
                      {m.totalStars > 3 ? ` +${m.totalStars - 3}` : ''}
                      {m.totalStars === 0 ? <span className="text-slate-700">—</span> : null}
                    </td>
                    <td className={`px-4 py-3 text-[10px] font-mono ${activityColor(m.lastActivity)}`}>
                      {relativeTime(m.lastActivity)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        m.plan === 'team' ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400' :
                        m.plan === 'pro'  ? 'bg-purple-500/15 border border-purple-500/30 text-purple-400' :
                        'bg-slate-800 text-slate-600'
                      }`}>
                        {m.plan === 'team' ? 'Team' : m.plan === 'pro' ? 'Pro' : 'Free'}
                      </span>
                    </td>
                  </tr>
                ))}
                {memberStats.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-slate-600 text-sm">
                      メンバーがいません。招待リンクを共有してメンバーを追加しましょう。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 招待セクション ── */}
        <div className="rounded-xl border border-slate-800 border-dashed bg-slate-900/20 p-6 text-center">
          <p className="text-slate-400 text-sm font-semibold mb-1">メンバーを招待する</p>
          <p className="text-slate-600 text-xs mb-4">
            招待リンクを研修参加者に共有すると、このorganizationに自動で参加されます
          </p>
          <InviteButton orgId={orgId} orgName={orgName} variant="outlined" />
        </div>

      </div>
    </div>
  );
}
